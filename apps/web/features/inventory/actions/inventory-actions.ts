'use server'

import { db } from '@/lib/db'
import { drugs, inventory, reorderCalculations } from '@workspace/database'
import { eq, desc, and, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { generateAlerts } from '@/features/alerts/actions/alert-actions'
import { logStockAddition, logStockUsage, logStatusChange } from '@/lib/drug-activity-logger'

// Schema validators
const updateStockSchema = z.object({
  drugId: z.number(),
  quantity: z.number().min(0),
  notes: z.string().optional(),
})

const recordUsageSchema = z.object({
  drugId: z.number(),
  quantity: z.number().min(1),
  notes: z.string().optional(),
})

// Get current inventory status for all drugs
export async function getInventoryStatus() {
  try {
    const result = await db
      .select({
        drugId: drugs.id,
        drugName: drugs.name,
        unit: drugs.unit,
        category: drugs.category,
        currentStock: inventory.closingStock,
        reorderLevel: drugs.reorderLevel,
        calculatedReorderLevel: drugs.calculatedReorderLevel,
        lastReorderCalculation: drugs.lastReorderCalculation,
        reorderCalculationConfidence: drugs.reorderCalculationConfidence,
        lastUpdated: inventory.updatedAt,
        supplier: drugs.supplier,
        // Enhanced intelligent reorder fields
        reorderDate: reorderCalculations.reorderDate,
        daysUntilReorder: reorderCalculations.daysUntilReorder,
        stockSufficiencyDays: reorderCalculations.stockSufficiencyDays,
        reorderRecommendation: reorderCalculations.reorderRecommendation,
        intelligentReorderLevel: reorderCalculations.intelligentReorderLevel,
        preventOverstockingNote: reorderCalculations.preventOverstockingNote,
      })
      .from(drugs)
      .leftJoin(
        inventory,
        and(
          eq(drugs.id, inventory.drugId),
          eq(
            inventory.date,
            sql`(SELECT MAX(date) FROM inventory WHERE drug_id = ${drugs.id})`
          )
        )
      )
      .leftJoin(
        reorderCalculations,
        and(
          eq(drugs.id, reorderCalculations.drugId),
          eq(
            reorderCalculations.calculationDate,
            sql`(SELECT MAX(calculation_date) FROM reorder_calculations WHERE drug_id = ${drugs.id})`
          )
        )
      )
      .orderBy(drugs.name)

    console.log('Raw inventory query results:', result.slice(0, 2))

    return result.map(item => {
      // Use intelligent reorder level if available, otherwise use calculated or fallback to manual
      const effectiveReorderLevel = item.intelligentReorderLevel || item.calculatedReorderLevel || item.reorderLevel || 100
      const usingMLLevel = !!(item.intelligentReorderLevel || item.calculatedReorderLevel)
      
      return {
        ...item,
        currentStock: item.currentStock || 0,
        effectiveReorderLevel,
        stockStatus: getStockStatus(item.currentStock || 0, effectiveReorderLevel),
        hasCalculatedReorderLevel: usingMLLevel,
        usingMLLevel,
        reorderLevelVariance: item.calculatedReorderLevel 
          ? item.calculatedReorderLevel - item.reorderLevel 
          : null,
        // Ensure all enhanced fields are included (they come from the database join)
        reorderDate: item.reorderDate || null,
        daysUntilReorder: item.daysUntilReorder || null,
        stockSufficiencyDays: item.stockSufficiencyDays || null,
        reorderRecommendation: item.reorderRecommendation || null,
        intelligentReorderLevel: item.intelligentReorderLevel || null,
        preventOverstockingNote: item.preventOverstockingNote || null,
      }
    })
  } catch (error) {
    console.error('Failed to get inventory status:', error)
    throw new Error(`Failed to fetch inventory status: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Update stock level (e.g., after receiving supplies)
export async function updateStock(data: z.infer<typeof updateStockSchema>) {
  try {
    const validated = updateStockSchema.parse(data)
    const today = new Date().toISOString().split('T')[0]!

    // Get drug info for logging
    const [drugInfo] = await db
      .select({ name: drugs.name, unit: drugs.unit, reorderLevel: drugs.reorderLevel })
      .from(drugs)
      .where(eq(drugs.id, validated.drugId))
      .limit(1)

    if (!drugInfo) {
      throw new Error(`Drug with ID ${validated.drugId} not found`)
    }

    // Get current stock
    const [currentInventory] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.drugId, validated.drugId),
          eq(inventory.date, today)
        )
      )
      .limit(1)

    let previousStock: number
    let newStock: number

    if (currentInventory) {
      // Update existing record
      previousStock = currentInventory.closingStock
      newStock = currentInventory.closingStock + validated.quantity

      await db
        .update(inventory)
        .set({
          quantityReceived: currentInventory.quantityReceived + validated.quantity,
          closingStock: newStock,
          notes: validated.notes,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, currentInventory.id))
    } else {
      // Get previous day's closing stock
      const [previousInventory] = await db
        .select()
        .from(inventory)
        .where(eq(inventory.drugId, validated.drugId))
        .orderBy(desc(inventory.date))
        .limit(1)

      const openingStock = previousInventory?.closingStock || 0
      previousStock = openingStock
      newStock = openingStock + validated.quantity

      // Create new record
      await db.insert(inventory).values({
        drugId: validated.drugId,
        date: today,
        openingStock,
        quantityReceived: validated.quantity,
        quantityUsed: 0,
        quantityExpired: 0,
        closingStock: newStock,
        stockoutFlag: false,
        notes: validated.notes,
      })
    }

    // Log the stock addition activity
    try {
      await logStockAddition(
        validated.drugId,
        drugInfo.name,
        validated.quantity,
        previousStock,
        newStock,
        drugInfo.unit,
        validated.notes
      )

      // Check if stock status changed and log it
      const previousStatus = getStockStatus(previousStock, drugInfo.reorderLevel)
      const newStatus = getStockStatus(newStock, drugInfo.reorderLevel)
      
      if (previousStatus !== newStatus) {
        await logStatusChange(
          validated.drugId,
          drugInfo.name,
          previousStatus,
          newStatus,
          newStock
        )
      }
    } catch (logError) {
      console.error('Failed to log stock addition activity:', logError)
      // Don't fail the stock update if logging fails
    }

    // Auto-generate alerts for real-time reorder level calculations
    try {
      await generateAlerts()
    } catch (error) {
      console.error('Failed to generate alerts after stock update:', error)
      // Don't fail the stock update if alert generation fails
    }

    revalidatePath('/dashboard')
    revalidatePath('/inventory')
    revalidatePath('/alerts')

    return { success: true }
  } catch (error) {
    console.error('Failed to update stock:', error)
    throw new Error(`Failed to update stock: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Record usage (daily consumption)
export async function recordUsage(data: z.infer<typeof recordUsageSchema>) {
  try {
    const validated = recordUsageSchema.parse(data)
    const today = new Date().toISOString().split('T')[0]!

    // Get drug info for logging
    const [drugInfo] = await db
      .select({ name: drugs.name, unit: drugs.unit, reorderLevel: drugs.reorderLevel })
      .from(drugs)
      .where(eq(drugs.id, validated.drugId))
      .limit(1)

    if (!drugInfo) {
      throw new Error(`Drug with ID ${validated.drugId} not found`)
    }

    // Get current inventory
    const [currentInventory] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.drugId, validated.drugId),
          eq(inventory.date, today)
        )
      )
      .limit(1)

    let previousStock: number
    let newStock: number

    if (currentInventory) {
      previousStock = currentInventory.closingStock
      newStock = Math.max(0, currentInventory.closingStock - validated.quantity)
      const stockoutFlag = newStock <= 0

      await db
        .update(inventory)
        .set({
          quantityUsed: currentInventory.quantityUsed + validated.quantity,
          closingStock: newStock,
          stockoutFlag,
          notes: validated.notes,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, currentInventory.id))
    } else {
      // Get previous day's closing stock
      const [previousInventory] = await db
        .select()
        .from(inventory)
        .where(eq(inventory.drugId, validated.drugId))
        .orderBy(desc(inventory.date))
        .limit(1)

      const openingStock = previousInventory?.closingStock || 0
      previousStock = openingStock
      newStock = Math.max(0, openingStock - validated.quantity)
      const stockoutFlag = newStock <= 0

      await db.insert(inventory).values({
        drugId: validated.drugId,
        date: today,
        openingStock,
        quantityReceived: 0,
        quantityUsed: validated.quantity,
        quantityExpired: 0,
        closingStock: newStock,
        stockoutFlag,
        notes: validated.notes,
      })
    }

    // Log the stock usage activity
    try {
      await logStockUsage(
        validated.drugId,
        drugInfo.name,
        validated.quantity,
        previousStock,
        newStock,
        drugInfo.unit,
        validated.notes
      )

      // Check if stock status changed and log it
      const previousStatus = getStockStatus(previousStock, drugInfo.reorderLevel)
      const newStatus = getStockStatus(newStock, drugInfo.reorderLevel)
      
      if (previousStatus !== newStatus) {
        await logStatusChange(
          validated.drugId,
          drugInfo.name,
          previousStatus,
          newStatus,
          newStock
        )
      }
    } catch (logError) {
      console.error('Failed to log stock usage activity:', logError)
      // Don't fail the usage recording if logging fails
    }

    // Auto-generate alerts for real-time reorder level calculations
    try {
      await generateAlerts()
    } catch (error) {
      console.error('Failed to generate alerts after usage recording:', error)
      // Don't fail the usage recording if alert generation fails
    }

    // Note: Reorder levels are updated by scheduled cron job (daily at 2 AM)
    // This avoids constant fluctuations and provides stable planning targets
    console.log(`📋 Usage recorded for drug ${validated.drugId}. Reorder levels updated by daily cron job.`)

    revalidatePath('/dashboard')
    revalidatePath('/inventory')
    revalidatePath('/alerts')

    return { success: true }
  } catch (error) {
    console.error('Failed to record usage:', error)
    throw new Error(`Failed to record usage: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Helper function to determine stock status
function getStockStatus(currentStock: number, reorderLevel: number): 'critical' | 'low' | 'normal' | 'good' {
  if (currentStock === 0) return 'critical'
  if (currentStock <= reorderLevel * 0.5) return 'critical'
  if (currentStock <= reorderLevel) return 'low'
  if (currentStock <= reorderLevel * 2) return 'normal'
  return 'good'
}