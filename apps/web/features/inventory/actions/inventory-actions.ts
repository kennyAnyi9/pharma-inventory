'use server'

import { db } from '@/lib/db'
import { drugs, inventory } from '@workspace/database'
import { eq, desc, and, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { generateAlerts } from '@/features/alerts/actions/alert-actions'

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
      .orderBy(drugs.name)

    return result.map(item => {
      // Use calculated reorder level if available, otherwise fall back to manual
      const effectiveReorderLevel = item.calculatedReorderLevel || item.reorderLevel
      
      return {
        ...item,
        currentStock: item.currentStock || 0,
        effectiveReorderLevel,
        stockStatus: getStockStatus(item.currentStock || 0, effectiveReorderLevel),
        hasCalculatedReorderLevel: !!item.calculatedReorderLevel,
        reorderLevelVariance: item.calculatedReorderLevel 
          ? item.calculatedReorderLevel - item.reorderLevel 
          : null,
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

    if (currentInventory) {
      // Update existing record
      await db
        .update(inventory)
        .set({
          quantityReceived: currentInventory.quantityReceived + validated.quantity,
          closingStock: currentInventory.closingStock + validated.quantity,
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

      // Create new record
      await db.insert(inventory).values({
        drugId: validated.drugId,
        date: today,
        openingStock,
        quantityReceived: validated.quantity,
        quantityUsed: 0,
        quantityExpired: 0,
        closingStock: openingStock + validated.quantity,
        stockoutFlag: false,
        notes: validated.notes,
      })
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
    revalidatePath('/forecasts')
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

    if (currentInventory) {
      const newClosingStock = currentInventory.closingStock - validated.quantity
      const stockoutFlag = newClosingStock <= 0

      await db
        .update(inventory)
        .set({
          quantityUsed: currentInventory.quantityUsed + validated.quantity,
          closingStock: Math.max(0, newClosingStock),
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
      const newClosingStock = openingStock - validated.quantity
      const stockoutFlag = newClosingStock <= 0

      await db.insert(inventory).values({
        drugId: validated.drugId,
        date: today,
        openingStock,
        quantityReceived: 0,
        quantityUsed: validated.quantity,
        quantityExpired: 0,
        closingStock: Math.max(0, newClosingStock),
        stockoutFlag,
        notes: validated.notes,
      })
    }

    // Auto-generate alerts for real-time reorder level calculations
    try {
      await generateAlerts()
    } catch (error) {
      console.error('Failed to generate alerts after usage recording:', error)
      // Don't fail the usage recording if alert generation fails
    }

    revalidatePath('/dashboard')
    revalidatePath('/inventory')
    revalidatePath('/forecasts')
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