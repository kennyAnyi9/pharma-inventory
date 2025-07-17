'use server'

import { db } from '@/lib/db'
import { drugs, inventory, reorderCalculations, suppliers } from '@workspace/database'
import { eq, desc, and, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

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

// Calculate optimal reorder level using ML predictions
function calculateOptimalReorderLevel(
  forecast: MLForecastData,
  leadTimeDays: number,
  targetServiceLevel: number = 0.95
): ReorderCalculationData {
  // Calculate average daily demand from 7-day forecast
  const avgDailyDemand = forecast.total_predicted_7_days / 7

  // Calculate demand standard deviation from daily forecasts
  const dailyDemands = forecast.forecasts.map(f => f.predicted_demand)
  const variance = dailyDemands.reduce((sum, demand) => {
    return sum + Math.pow(demand - avgDailyDemand, 2)
  }, 0) / dailyDemands.length
  const demandStdDev = Math.sqrt(variance)

  // Z-score for target service level (95% = 1.96, 99% = 2.58)
  const zScore = targetServiceLevel === 0.99 ? 2.58 : 1.96

  // Safety stock calculation: Z * sqrt(lead_time) * demand_std_dev
  const safetyStock = Math.ceil(zScore * Math.sqrt(leadTimeDays) * demandStdDev)

  // Reorder level: (avg_daily_demand * lead_time) + safety_stock
  const calculatedLevel = Math.ceil((avgDailyDemand * leadTimeDays) + safetyStock)

  return {
    drugId: forecast.drug_id,
    calculatedLevel,
    safetyStock,
    avgDailyDemand,
    demandStdDev,
    leadTimeDays,
    confidenceLevel: targetServiceLevel
  }
}

// Calculate reorder levels for all drugs
export async function calculateAllReorderLevels() {
  try {
    console.log('Starting reorder level calculation for all drugs...')
    
    // Get ML predictions
    const mlPredictions = await getMLPredictions()
    if (!mlPredictions) {
      throw new Error('Failed to fetch ML predictions - check ML service connectivity')
    }
    
    console.log(`Retrieved ML predictions for ${mlPredictions.length} drugs`)

    // Get drugs with supplier information
    const drugsWithSuppliers = await db
      .select({
        drugId: drugs.id,
        drugName: drugs.name,
        supplierId: drugs.supplier,
        currentReorderLevel: drugs.reorderLevel,
      })
      .from(drugs)

    // Get default delivery days from suppliers
    const supplierData = await db
      .select({
        name: suppliers.name,
        deliveryDays: suppliers.deliveryDays,
      })
      .from(suppliers)

    const supplierMap = new Map(supplierData.map(s => [s.name, s.deliveryDays || 7]))

    const calculations: ReorderCalculationData[] = []
    const updates: Array<{ drugId: number; calculatedLevel: number; confidence: number }> = []

    // Process each drug
    for (const drug of drugsWithSuppliers) {
      const mlForecast = mlPredictions.find(f => f.drug_id === drug.drugId)
      if (!mlForecast) continue

      const leadTimeDays = supplierMap.get(drug.supplierId || '') || 7
      const calculation = calculateOptimalReorderLevel(mlForecast, leadTimeDays)

      calculations.push(calculation)
      updates.push({
        drugId: drug.drugId,
        calculatedLevel: calculation.calculatedLevel,
        confidence: calculation.confidenceLevel
      })
    }

    // Save calculations and update drugs (without transaction due to neon-http driver limitation)
    if (calculations.length > 0) {
      // Insert calculations to audit table
      await db.insert(reorderCalculations).values(
        calculations.map(calc => ({
          drugId: calc.drugId,
          calculatedLevel: calc.calculatedLevel,
          safetyStock: calc.safetyStock,
          avgDailyDemand: calc.avgDailyDemand.toString(),
          demandStdDev: calc.demandStdDev.toString(),
          leadTimeDays: calc.leadTimeDays,
          confidenceLevel: calc.confidenceLevel.toString(),
        }))
      )

      // Batch update drugs table with calculated reorder levels
      // Set both calculatedReorderLevel and reorderLevel to ML value for simplified ML-only system
      const updatePromises = updates.map(update => 
        db.update(drugs)
          .set({
            calculatedReorderLevel: update.calculatedLevel,
            reorderLevel: update.calculatedLevel, // Set manual level to ML level
            reorderCalculationConfidence: update.confidence.toString(),
            lastReorderCalculation: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(drugs.id, update.drugId))
      )
      
      await Promise.all(updatePromises)
    }

    // Revalidate relevant pages
    revalidatePath('/dashboard')
    revalidatePath('/inventory')
    revalidatePath('/forecasts')

    return {
      success: true,
      calculationsCount: calculations.length,
      calculations: calculations.map(calc => ({
        drugId: calc.drugId,
        calculatedLevel: calc.calculatedLevel,
        safetyStock: calc.safetyStock,
        avgDailyDemand: calc.avgDailyDemand,
        leadTimeDays: calc.leadTimeDays,
      }))
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
      })
      .from(drugs)
      .where(eq(drugs.id, drugId))
      .limit(1)

    if (!drugData?.calculatedReorderLevel) {
      throw new Error('No calculated reorder level found')
    }

    await db
      .update(drugs)
      .set({
        reorderLevel: drugData.calculatedReorderLevel,
        updatedAt: new Date(),
      })
      .where(eq(drugs.id, drugId))

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