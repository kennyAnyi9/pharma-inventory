'use server'

import { db } from '@/lib/db'
import { drugs, inventory, reorderCalculations, suppliers } from '@workspace/database'
import { eq, desc, and, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logReorderLevelUpdate, logMLCalculation, logSystemUpdate } from '@/lib/drug-activity-logger'

// Zod schemas for ML API response validation
const MLForecastSchema = z.object({
  drug_id: z.number(),
  drug_name: z.string(),
  unit: z.string(),
  current_stock: z.number(),
  forecasts: z.array(z.object({
    date: z.string(),
    predicted_demand: z.number(),
    day_of_week: z.string()
  })),
  total_predicted_7_days: z.number()
})

const MLServiceResponseSchema = z.object({
  forecasts: z.array(MLForecastSchema)
})

// Input validation schema
const DrugIdSchema = z.number().positive().int()

// Types
interface ReorderCalculationData {
  drugId: number
  calculatedLevel: number
  safetyStock: number
  avgDailyDemand: number
  demandStdDev: number
  leadTimeDays: number
  confidenceLevel: number
}

// Enhanced reorder data with intelligent timing
interface EnhancedReorderData extends ReorderCalculationData {
  reorderDate: string | null
  daysUntilReorder: number | null
  stockSufficiencyDays: number
  reorderRecommendation: 'immediate' | 'upcoming' | 'sufficient' | 'overstocked'
  intelligentReorderLevel: number
  preventOverstockingNote: string
}

interface MLForecastData {
  drug_id: number
  drug_name: string
  unit: string
  current_stock: number
  forecasts: Array<{
    date: string
    predicted_demand: number
    day_of_week: string
  }>
  total_predicted_7_days: number
}

// Get ML predictions for all drugs
async function getMLPredictions(): Promise<MLForecastData[] | null> {
  try {
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL
    const ML_API_KEY = process.env.ML_API_KEY

    if (!ML_SERVICE_URL) {
      console.error('ML_SERVICE_URL environment variable is not set')
      throw new Error('ML service configuration missing: ML_SERVICE_URL must be set')
    }

    if (!ML_API_KEY) {
      console.error('ML_API_KEY environment variable is not set')
      throw new Error('ML service configuration missing: ML_API_KEY must be set')
    }

    console.log('Fetching ML predictions from:', ML_SERVICE_URL)
    
    const response = await fetch(`${ML_SERVICE_URL}/forecast/all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ML_API_KEY,
      },
      body: JSON.stringify({ days: 7 }),
      cache: 'no-store',
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('ML service error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        url: ML_SERVICE_URL
      })
      
      // More specific error handling based on status codes
      if (response.status === 401) {
        throw new Error('ML service authentication failed: Invalid API key')
      } else if (response.status === 404) {
        throw new Error('ML service endpoint not found: Check ML_SERVICE_URL')
      } else if (response.status >= 500) {
        throw new Error('ML service internal error: Service may be down')
      } else {
        throw new Error(`ML service error: ${response.status} ${response.statusText}`)
      }
    }

    const data = await response.json()
    console.log('ML service response received:', { 
      forecastCount: data.forecasts?.length || 0,
      dataKeys: Object.keys(data) 
    })
    
    // Log sample data for debugging
    if (data.forecasts?.length > 0) {
      console.log('📡 Bulk ML Sample Data (first 2 drugs):', 
        data.forecasts.slice(0, 2).map((f: any) => ({
          drug_id: f.drug_id,
          total_predicted_7_days: f.total_predicted_7_days,
          avgDaily: (f.total_predicted_7_days / 7).toFixed(1)
        }))
      )
    }
    
    // Validate the response structure
    try {
      const validatedData = MLServiceResponseSchema.parse(data)
      console.log('ML service response validation successful')
      return validatedData.forecasts
    } catch (validationError) {
      console.error('ML service response validation failed:', validationError)
      console.error('Invalid response data:', data)
      throw new Error('ML service returned invalid data format')
    }
  } catch (error) {
    console.error('Failed to fetch ML predictions:', error)
    
    // Re-throw with more context if it's a known error
    if (error instanceof Error) {
      throw error
    }
    
    // Generic error for unknown issues
    throw new Error('Unknown error occurred while fetching ML predictions')
  }
}

// Enhanced reorder calculation with intelligent timing and overstocking prevention
function calculateOptimalReorderLevel(
  forecast: MLForecastData,
  leadTimeDays: number,
  databaseDrugId: number,
  realCurrentStock: number,
  targetServiceLevel: number = 0.95
): EnhancedReorderData {
  // Calculate average daily demand from 7-day forecast
  const rawAvgDailyDemand = forecast.total_predicted_7_days / 7
  
  // Ensure avgDailyDemand is never zero or negative to prevent Infinity values
  const avgDailyDemand = Math.max(0.1, rawAvgDailyDemand) // Minimum 0.1 units per day

  // Calculate demand standard deviation from daily forecasts
  const dailyDemands = forecast.forecasts.map(f => f.predicted_demand)
  const variance = dailyDemands.reduce((sum, demand) => {
    return sum + Math.pow(demand - avgDailyDemand, 2)
  }, 0) / dailyDemands.length
  const demandStdDev = Math.max(0.1, Math.sqrt(variance)) // Minimum std dev to prevent zero

  // Z-score for target service level (95% = 1.96, 99% = 2.58)
  const zScore = targetServiceLevel === 0.99 ? 2.58 : 1.96

  // Safety stock calculation: Z * sqrt(lead_time) * demand_std_dev
  const safetyStock = Math.ceil(zScore * Math.sqrt(leadTimeDays) * demandStdDev)

  // Traditional reorder level: (avg_daily_demand * lead_time) + safety_stock
  const traditionalReorderLevel = Math.ceil((avgDailyDemand * leadTimeDays) + safetyStock)

  // INTELLIGENT CALCULATIONS - Prevent overstocking and provide date-based recommendations
  // Use REAL current stock from database, not outdated ML service data
  const currentStock = realCurrentStock
  const rawStockSufficiencyDays = currentStock / avgDailyDemand
  
  // Ensure stockSufficiencyDays is finite and reasonable (max 9999 days to prevent database issues)
  const stockSufficiencyDays = Math.floor(Math.min(9999, Math.max(0, rawStockSufficiencyDays)))

  // Calculate when to actually reorder based on current stock and lead time
  let reorderDate: string | null = null
  let daysUntilReorder: number | null = null
  let reorderRecommendation: 'immediate' | 'upcoming' | 'sufficient' | 'overstocked'
  let intelligentReorderLevel: number
  let preventOverstockingNote: string

  if (stockSufficiencyDays <= leadTimeDays) {
    // Stock will run out before or during lead time - IMMEDIATE
    reorderRecommendation = 'immediate'
    reorderDate = new Date().toISOString().split('T')[0] || null
    daysUntilReorder = 0
    intelligentReorderLevel = traditionalReorderLevel
    preventOverstockingNote = 'Immediate action required - stock will run out within lead time'

  } else if (stockSufficiencyDays <= (leadTimeDays + 7)) {
    // Stock sufficient but should reorder within a week
    reorderRecommendation = 'upcoming'
    const daysBeforeStockOut = stockSufficiencyDays - leadTimeDays - 2 // 2 days buffer
    daysUntilReorder = Math.max(1, daysBeforeStockOut)
    
    // Ensure reasonable date bounds
    daysUntilReorder = Math.min(30, Math.max(1, daysUntilReorder))

    const reorderDateObj = new Date()
    reorderDateObj.setDate(reorderDateObj.getDate() + daysUntilReorder)
    reorderDate = reorderDateObj.toISOString().split('T')[0] || null

    intelligentReorderLevel = traditionalReorderLevel
    preventOverstockingNote = `Reorder in ${daysUntilReorder} days to avoid stockout`

  } else if (stockSufficiencyDays <= (leadTimeDays + 21)) {
    // Stock sufficient for 2-3 weeks beyond lead time
    reorderRecommendation = 'sufficient'
    const daysBeforeStockOut = stockSufficiencyDays - leadTimeDays - 3 // 3 days buffer
    daysUntilReorder = Math.max(7, daysBeforeStockOut)
    
    // Ensure reasonable date bounds
    daysUntilReorder = Math.min(60, Math.max(7, daysUntilReorder))

    const reorderDateObj = new Date()
    reorderDateObj.setDate(reorderDateObj.getDate() + daysUntilReorder)
    reorderDate = reorderDateObj.toISOString().split('T')[0] || null

    // Reduce reorder level to prevent overstocking
    intelligentReorderLevel = Math.ceil(traditionalReorderLevel * 0.8)
    preventOverstockingNote = `Stock sufficient for ${stockSufficiencyDays} days. Reduced reorder level to prevent overstocking`

  } else {
    // Stock sufficient for more than 3 weeks beyond lead time - OVERSTOCKED
    reorderRecommendation = 'overstocked'
    daysUntilReorder = stockSufficiencyDays - leadTimeDays - 7 // Wait until much closer to need
    
    // Ensure daysUntilReorder is reasonable (max 365 days in the future)
    daysUntilReorder = Math.min(365, Math.max(21, daysUntilReorder))

    const reorderDateObj = new Date()
    reorderDateObj.setDate(reorderDateObj.getDate() + daysUntilReorder)
    reorderDate = reorderDateObj.toISOString().split('T')[0] || null

    // Significantly reduce reorder level to prevent further overstocking
    intelligentReorderLevel = Math.ceil(traditionalReorderLevel * 0.5)
    preventOverstockingNote = `OVERSTOCKED: ${stockSufficiencyDays} days of stock available. Do not reorder until ${reorderDate}`
  }

  console.log(`🎯 Enhanced Reorder Analysis for ${forecast.drug_name}:`, {
    currentStock,
    stockSufficiencyDays,
    leadTimeDays,
    recommendation: reorderRecommendation,
    reorderDate,
    traditionalLevel: traditionalReorderLevel,
    intelligentLevel: intelligentReorderLevel
  })

  // Final validation to ensure all values are finite and safe for database
  const safeCalculatedLevel = Math.min(999999, Math.max(1, traditionalReorderLevel))
  const safeSafetyStock = Math.min(999999, Math.max(0, safetyStock))
  const safeIntelligentLevel = Math.min(999999, Math.max(1, intelligentReorderLevel))
  const safeDaysUntilReorder = daysUntilReorder !== null ? Math.min(9999, Math.max(-1, daysUntilReorder)) : null

  return {
    drugId: databaseDrugId,
    calculatedLevel: safeCalculatedLevel, // Keep traditional for audit
    safetyStock: safeSafetyStock,
    avgDailyDemand,
    demandStdDev,
    leadTimeDays,
    confidenceLevel: targetServiceLevel,
    // Enhanced intelligence
    reorderDate,
    daysUntilReorder: safeDaysUntilReorder,
    stockSufficiencyDays,
    reorderRecommendation,
    intelligentReorderLevel: safeIntelligentLevel,
    preventOverstockingNote
  }
}

// Calculate reorder levels for all drugs
export async function calculateAllReorderLevels() {
  try {
    console.log('Starting reorder level calculation for all drugs...')
    
    // Check environment variables
    console.log('🔧 Environment check:', {
      ML_SERVICE_URL: process.env.ML_SERVICE_URL ? 'SET' : 'MISSING',
      ML_API_KEY: process.env.ML_API_KEY ? 'SET' : 'MISSING'
    })
    
    // Get ML predictions
    const mlPredictions = await getMLPredictions()
    if (!mlPredictions) {
      throw new Error('Failed to fetch ML predictions - check ML service connectivity')
    }
    
    console.log(`Retrieved ML predictions for ${mlPredictions.length} drugs`)
    if (mlPredictions.length > 0) {
      console.log('First ML prediction sample:', mlPredictions[0])
    }

    // Get drugs with supplier and current stock information
    const drugsWithSuppliers = await db
      .select({
        drugId: drugs.id,
        drugName: drugs.name,
        supplierId: drugs.supplier,
        currentReorderLevel: drugs.reorderLevel,
        currentStock: inventory.closingStock,
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

    console.log(`Found ${drugsWithSuppliers.length} drugs in database`)
    if (drugsWithSuppliers.length > 0) {
      console.log('First drug sample:', drugsWithSuppliers[0])
    }

    // Get default delivery days from suppliers
    const supplierData = await db
      .select({
        name: suppliers.name,
        deliveryDays: suppliers.deliveryDays,
      })
      .from(suppliers)

    const supplierMap = new Map(supplierData.map(s => [s.name, s.deliveryDays || 7]))

    const calculations: EnhancedReorderData[] = []
    const updates: Array<{ drugId: number; calculatedLevel: number; confidence: number }> = []

    // Process each drug
    for (const drug of drugsWithSuppliers) {
      // Match by drug name - try exact match first, then partial match
      let mlForecast = mlPredictions.find(f => f.drug_name === drug.drugName)
      
      // If no exact match, try matching by first word (generic name without dosage)
      if (!mlForecast) {
        const genericName = drug.drugName.split(' ')[0] // Get first word
        mlForecast = mlPredictions.find(f => f.drug_name === genericName)
      }
      
      // If still no match, try matching the other way (ML name contains drug name)
      if (!mlForecast) {
        mlForecast = mlPredictions.find(f => 
          drug.drugName.toLowerCase().includes(f.drug_name.toLowerCase()) ||
          f.drug_name.toLowerCase().includes((drug.drugName.split(' ')[0] || '').toLowerCase())
        )
      }
      
      if (!mlForecast) {
        console.log(`⚠️  No ML forecast found for drug ${drug.drugId} (${drug.drugName})`)
        console.log(`Available ML drug names: ${mlPredictions.map(f => f.drug_name).join(', ')}`)
        continue
      }
      
      console.log(`✅ Matched "${drug.drugName}" with ML forecast "${mlForecast.drug_name}"`)
      

      const leadTimeDays = supplierMap.get(drug.supplierId || '') || 7
      console.log(`🔍 Debug supplier lookup for ${drug.drugName}:`, {
        supplierInDrug: drug.supplierId,
        supplierMapKeys: Array.from(supplierMap.keys()),
        resolvedLeadTime: leadTimeDays
      })
      console.log(`📊 Bulk processing drug ${drug.drugId} (${drug.drugName}):`, {
        total_7_days: mlForecast.total_predicted_7_days,
        avgDaily: (mlForecast.total_predicted_7_days / 7).toFixed(1),
        leadTimeDays,
        method: 'bulk_endpoint'
      })
      
      const calculation = calculateOptimalReorderLevel(mlForecast, leadTimeDays, drug.drugId, drug.currentStock || 0)

      calculations.push(calculation)
      updates.push({
        drugId: drug.drugId,
        calculatedLevel: calculation.calculatedLevel,
        confidence: calculation.confidenceLevel
      })
    }

    // Save calculations and update drugs (without transaction due to neon-http driver limitation)
    if (calculations.length > 0) {
      // Insert calculations to audit table with enhanced data
      await db.insert(reorderCalculations).values(
        calculations.map(calc => ({
          drugId: calc.drugId,
          calculatedLevel: calc.calculatedLevel,
          safetyStock: calc.safetyStock,
          avgDailyDemand: calc.avgDailyDemand.toString(),
          demandStdDev: calc.demandStdDev.toString(),
          leadTimeDays: calc.leadTimeDays,
          confidenceLevel: calc.confidenceLevel.toString(),
          calculationMethod: 'enhanced_ml_forecast',
          // Enhanced intelligent fields
          reorderDate: calc.reorderDate,
          daysUntilReorder: calc.daysUntilReorder,
          stockSufficiencyDays: calc.stockSufficiencyDays,
          reorderRecommendation: calc.reorderRecommendation,
          intelligentReorderLevel: calc.intelligentReorderLevel,
          preventOverstockingNote: calc.preventOverstockingNote,
        }))
      )

      // Batch update drugs table with intelligent reorder levels and log changes
      // Use intelligent level to prevent overstocking, keep traditional for audit
      const updatePromises = updates.map(async (update, index) => {
        const calculation = calculations[index]
        if (!calculation) throw new Error(`Calculation missing for index ${index}`)
        
        // Get current reorder level before updating
        const [currentDrugData] = await db
          .select({ 
            name: drugs.name, 
            currentReorderLevel: drugs.reorderLevel,
            calculatedReorderLevel: drugs.calculatedReorderLevel 
          })
          .from(drugs)
          .where(eq(drugs.id, update.drugId))
          .limit(1)

        // Update the drug
        const result = await db.update(drugs)
          .set({
            calculatedReorderLevel: update.calculatedLevel, // Traditional for audit
            reorderLevel: calculation.intelligentReorderLevel, // Use intelligent level for actual decisions
            reorderCalculationConfidence: update.confidence.toString(),
            lastReorderCalculation: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(drugs.id, update.drugId))

        // Log the ML calculation and reorder level update
        if (currentDrugData) {
          try {
            // Log the ML calculation activity
            await logMLCalculation(
              update.drugId,
              currentDrugData.name,
              update.calculatedLevel,
              update.confidence,
              'enhanced_ml_forecast',
              {
                previousLevel: currentDrugData.currentReorderLevel,
                intelligentLevel: calculation.intelligentReorderLevel,
                safetyStock: calculation.safetyStock,
                avgDailyDemand: calculation.avgDailyDemand,
                leadTimeDays: calculation.leadTimeDays,
                reorderRecommendation: calculation.reorderRecommendation
              }
            )

            // Log the actual reorder level change if different from current
            if (currentDrugData.currentReorderLevel !== calculation.intelligentReorderLevel) {
              await logReorderLevelUpdate(
                update.drugId,
                currentDrugData.name,
                currentDrugData.currentReorderLevel || 0,
                calculation.intelligentReorderLevel,
                update.confidence,
                'enhanced_ml_forecast',
                'ml_system'
              )
            }
          } catch (logError) {
            console.error(`Failed to log activity for drug ${update.drugId}:`, logError)
            // Don't fail the update if logging fails
          }
        }

        return result
      })
      
      await Promise.all(updatePromises)
    }

    // Revalidate relevant pages
    revalidatePath('/dashboard')
    revalidatePath('/inventory')
    revalidatePath('/forecasts')

    return {
      success: true,
      calculationsCount: calculations.length,
      enhancedCalculations: calculations.map(calc => ({
        drugId: calc.drugId,
        calculatedLevel: calc.calculatedLevel,
        intelligentReorderLevel: calc.intelligentReorderLevel,
        safetyStock: calc.safetyStock,
        avgDailyDemand: calc.avgDailyDemand,
        leadTimeDays: calc.leadTimeDays,
        stockSufficiencyDays: calc.stockSufficiencyDays,
        reorderDate: calc.reorderDate,
        reorderRecommendation: calc.reorderRecommendation,
        preventOverstockingNote: calc.preventOverstockingNote,
      })),
      // Summary of recommendations
      recommendationSummary: {
        immediate: calculations.filter(calc => calc.reorderRecommendation === 'immediate').length,
        upcoming: calculations.filter(calc => calc.reorderRecommendation === 'upcoming').length,
        sufficient: calculations.filter(calc => calc.reorderRecommendation === 'sufficient').length,
        overstocked: calculations.filter(calc => calc.reorderRecommendation === 'overstocked').length,
      }
    }
  } catch (error) {
    console.error('Failed to calculate reorder levels:', error)
    throw new Error(`Failed to calculate reorder levels: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Get reorder level comparison for a specific drug
export async function getReorderLevelComparison(drugId: number) {
  try {
    const [drugData] = await db
      .select({
        id: drugs.id,
        name: drugs.name,
        unit: drugs.unit,
        currentReorderLevel: drugs.reorderLevel,
        calculatedReorderLevel: drugs.calculatedReorderLevel,
        lastCalculation: drugs.lastReorderCalculation,
        confidence: drugs.reorderCalculationConfidence,
      })
      .from(drugs)
      .where(eq(drugs.id, drugId))
      .limit(1)

    if (!drugData) {
      throw new Error('Drug not found')
    }

    // Get latest calculation details
    const [latestCalculation] = await db
      .select()
      .from(reorderCalculations)
      .where(eq(reorderCalculations.drugId, drugId))
      .orderBy(desc(reorderCalculations.calculationDate))
      .limit(1)

    // Get current stock
    const [currentStock] = await db
      .select({
        currentStock: inventory.closingStock,
      })
      .from(inventory)
      .where(eq(inventory.drugId, drugId))
      .orderBy(desc(inventory.date))
      .limit(1)

    return {
      drug: drugData,
      currentStock: currentStock?.currentStock || 0,
      calculationDetails: latestCalculation,
      recommendation: drugData.calculatedReorderLevel
        ? drugData.calculatedReorderLevel > drugData.currentReorderLevel
          ? 'INCREASE' as const
          : drugData.calculatedReorderLevel < drugData.currentReorderLevel
          ? 'DECREASE' as const
          : 'MAINTAIN' as const
        : 'CALCULATE' as const
    }
  } catch (error) {
    console.error('Failed to get reorder level comparison:', error)
    throw new Error(`Failed to get reorder level comparison: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Accept calculated reorder level (update manual reorder level)
export async function acceptCalculatedReorderLevel(drugId: number) {
  // Validate input
  try {
    DrugIdSchema.parse(drugId)
  } catch (validationError) {
    throw new Error(`Invalid drugId: ${validationError instanceof Error ? validationError.message : 'Invalid input'}`)
  }

  try {
    const [drugData] = await db
      .select({
        calculatedReorderLevel: drugs.calculatedReorderLevel,
        reorderLevel: drugs.reorderLevel,
        name: drugs.name,
        confidence: drugs.reorderCalculationConfidence,
      })
      .from(drugs)
      .where(eq(drugs.id, drugId))
      .limit(1)

    if (!drugData?.calculatedReorderLevel) {
      throw new Error('No calculated reorder level found')
    }

    const previousReorderLevel = drugData.reorderLevel

    await db
      .update(drugs)
      .set({
        reorderLevel: drugData.calculatedReorderLevel,
        updatedAt: new Date(),
      })
      .where(eq(drugs.id, drugId))

    // Log the manual acceptance of ML recommendation
    try {
      await logReorderLevelUpdate(
        drugId,
        drugData.name,
        previousReorderLevel,
        drugData.calculatedReorderLevel,
        parseFloat(drugData.confidence || '0'),
        'user_accepted_ml_recommendation',
        'user_manual'
      )
      
      await logSystemUpdate(
        drugId,
        drugData.name,
        `User manually accepted ML-calculated reorder level: ${drugData.calculatedReorderLevel} (was ${previousReorderLevel})`,
        {
          confidence: drugData.confidence,
          previousLevel: previousReorderLevel,
          acceptedLevel: drugData.calculatedReorderLevel,
          action: 'manual_acceptance'
        }
      )
    } catch (logError) {
      console.error(`Failed to log manual acceptance for drug ${drugId}:`, logError)
      // Don't fail the operation if logging fails
    }

    revalidatePath('/inventory')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Failed to accept calculated reorder level:', error)
    throw new Error(`Failed to accept calculated reorder level: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Get reorder level calculation history
export async function getReorderCalculationHistory(drugId: number, limit: number = 10) {
  try {
    const history = await db
      .select()
      .from(reorderCalculations)
      .where(eq(reorderCalculations.drugId, drugId))
      .orderBy(desc(reorderCalculations.calculationDate))
      .limit(limit)

    return history
  } catch (error) {
    console.error('Failed to get reorder calculation history:', error)
    throw new Error(`Failed to get reorder calculation history: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Get latest reorder calculation status for dashboard
export async function getLatestReorderCalculationStatus() {
  try {
    // Get the latest calculation date
    const [latestCalculation] = await db
      .select({
        calculationDate: reorderCalculations.calculationDate,
        drugId: reorderCalculations.drugId,
      })
      .from(reorderCalculations)
      .orderBy(desc(reorderCalculations.calculationDate))
      .limit(1)

    // Get total drugs with calculated reorder levels
    const drugsWithCalculations = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(drugs)
      .where(sql`${drugs.calculatedReorderLevel} IS NOT NULL`)

    // Get total drugs
    const totalDrugs = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(drugs)

    // Get drugs with recent calculations (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const recentCalculations = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(reorderCalculations)
      .where(sql`${reorderCalculations.calculationDate} > ${yesterday}`)

    return {
      lastCalculationDate: latestCalculation?.calculationDate || null,
      totalDrugsWithCalculations: Number(drugsWithCalculations[0]?.count || 0),
      totalDrugs: Number(totalDrugs[0]?.count || 0),
      recentCalculationsCount: Number(recentCalculations[0]?.count || 0),
      calculationCoverage: totalDrugs[0]?.count ? 
        Math.round((Number(drugsWithCalculations[0]?.count || 0)) / Number(totalDrugs[0].count) * 100) : 0,
    }
  } catch (error) {
    console.error('Failed to get latest reorder calculation status:', error)
    return {
      lastCalculationDate: null,
      totalDrugsWithCalculations: 0,
      totalDrugs: 0,
      recentCalculationsCount: 0,
      calculationCoverage: 0,
    }
  }
}

/**
 * Calculate reorder level for a single drug (used for automatic updates after usage recording)
 */
export async function calculateSingleDrugReorderLevel(drugId: number): Promise<boolean> {
  try {
    console.log(`🧠 Calculating adaptive reorder level for drug ${drugId}...`)
    
    // Check current state before calculation
    const currentState = await db
      .select({
        currentReorderLevel: drugs.reorderLevel,
        calculatedReorderLevel: drugs.calculatedReorderLevel,
      })
      .from(drugs)
      .where(eq(drugs.id, drugId))
    
    console.log(`📊 Current state for drug ${drugId}:`, currentState[0])
    
    // Try fast ML prediction first, with fallback to statistical method
    let averageDailyDemand: number
    let calculationMethod: string
    let mlPredictionAccuracy = 75
    
    try {
      // Use bulk endpoint (more reliable) instead of individual endpoint
      console.log(`🔄 Fetching ML predictions via bulk endpoint for drug ${drugId}...`)
      const mlPredictions = await getMLPredictions()
      
      if (!mlPredictions) {
        throw new Error('Bulk ML service failed')
      }
      
      const mlPrediction = mlPredictions.find(f => f.drug_id === drugId)
      if (!mlPrediction) {
        throw new Error(`No ML forecast found for drug ${drugId}`)
      }
      
      if (mlPrediction && mlPrediction.total_predicted_7_days) {
        averageDailyDemand = mlPrediction.total_predicted_7_days / 7
        calculationMethod = 'adaptive_ml_bulk'
        console.log(`✅ Bulk ML prediction for drug ${drugId}:`, {
          total_7_days: mlPrediction.total_predicted_7_days,
          avgDaily: averageDailyDemand.toFixed(1),
          method: 'bulk_endpoint_individual'
        })
      } else {
        throw new Error('Invalid ML response from bulk endpoint')
      }
      
    } catch (error) {
      console.log(`⚠️  ML failed, using statistical fallback: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Fallback: Use recent historical usage (fast database query)
      const recentUsage = await db
        .select({
          avgUsage: sql<number>`AVG(quantity_used)`,
          maxUsage: sql<number>`MAX(quantity_used)`,
        })
        .from(inventory)
        .where(
          and(
            eq(inventory.drugId, drugId),
            sql`date >= CURRENT_DATE - INTERVAL '14 days'`
          )
        )
      
      averageDailyDemand = Number(recentUsage[0]?.avgUsage || 30) // Default fallback
      calculationMethod = 'statistical_fallback'
      mlPredictionAccuracy = 60
      console.log(`✅ Statistical fallback: ${averageDailyDemand.toFixed(1)} units/day`)
    }

    // Get supplier-specific lead time (same logic as bulk calculation)
    const drugData = await db
      .select({
        supplierId: drugs.supplier,
      })
      .from(drugs)
      .where(eq(drugs.id, drugId))

    let leadTimeDays = 7 // Default
    if (drugData[0]?.supplierId) {
      const supplierData = await db
        .select({
          deliveryDays: suppliers.deliveryDays,
        })
        .from(suppliers)
        .where(eq(suppliers.name, drugData[0].supplierId))
      
      leadTimeDays = supplierData[0]?.deliveryDays || 7
    }

    // Calculate optimal reorder level using SAME formula as bulk calculation
    const demandStdDev = averageDailyDemand * 0.3 // Estimate std dev as 30% of mean
    const zScore = 1.96 // 95% service level (same as bulk)
    const safetyStock = Math.ceil(zScore * Math.sqrt(leadTimeDays) * demandStdDev)
    const optimalReorderLevel = Math.ceil((averageDailyDemand * leadTimeDays) + safetyStock)

    // Update the drug's reorder level
    await db
      .update(drugs)
      .set({
        reorderLevel: optimalReorderLevel,
        calculatedReorderLevel: optimalReorderLevel,
        updatedAt: new Date(),
      })
      .where(eq(drugs.id, drugId))

    // Record the calculation
    await db.insert(reorderCalculations).values({
      drugId,
      calculatedLevel: optimalReorderLevel,
      avgDailyDemand: averageDailyDemand.toString(),
      demandStdDev: demandStdDev.toString(),
      safetyStock: safetyStock,
      leadTimeDays,
      confidenceLevel: '0.95',
      calculationMethod,
      calculationDate: new Date(),
    })

    // Verify the update actually worked
    const finalState = await db
      .select({
        currentReorderLevel: drugs.reorderLevel,
        calculatedReorderLevel: drugs.calculatedReorderLevel,
      })
      .from(drugs)
      .where(eq(drugs.id, drugId))
    
    console.log(`✅ Updated reorder level for drug ${drugId}: ${optimalReorderLevel} (method: ${calculationMethod})`)
    console.log(`📊 Final state for drug ${drugId}:`, finalState[0])
    
    return true
    
  } catch (error) {
    console.error(`❌ Failed to calculate reorder level for drug ${drugId}:`, error)
    return false
  }
}

/**
 * Get ML prediction for a single drug
 */
async function getMLPredictionForDrug(drugId: number) {
  try {
    // Get environment variables
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL
    const ML_API_KEY = process.env.ML_API_KEY

    if (!ML_SERVICE_URL) {
      throw new Error('ML_SERVICE_URL environment variable is not set')
    }

    if (!ML_API_KEY) {
      throw new Error('ML_API_KEY environment variable is not set')
    }

    const response = await fetch(`${ML_SERVICE_URL}/forecast/${drugId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ML_API_KEY,
      },
      body: JSON.stringify({ days: 7 }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000), // 20 second timeout for single drug
    })

    if (!response.ok) {
      throw new Error(`ML service responded with status ${response.status}`)
    }

    return await response.json()
    
  } catch (error) {
    console.error(`Failed to get ML prediction for drug ${drugId}:`, error)
    return null
  }
}