'use server'

import { db } from '@/lib/db'
import { drugs, reorderCalculations } from '@workspace/database'
import { eq, and, sql, inArray } from 'drizzle-orm'
import { getEffectiveReorderLevel } from '@/lib/reorder-level-utils'

interface DemandForecast {
  date: string
  predicted_demand: number
  day_of_week: string
}

interface DrugForecast {
  drug_id: number
  drug_name: string
  unit: string
  current_stock: number
  reorder_level: number
  forecasts: DemandForecast[]
  total_predicted_7_days: number
  recommendation: string
  generated_at: string
}

interface AllForecastsResponse {
  forecasts: DrugForecast[]
  generated_at: string
}

interface MLServiceError {
  error: true
  message: string
  status?: number
  timestamp: string
}

// Function to enrich forecast data with unified reorder levels
async function enrichForecastsWithEffectiveReorderLevels(forecasts: DrugForecast[]): Promise<DrugForecast[]> {
  try {
    // Get all reorder level data for the drugs in forecasts
    const drugIds = forecasts.map(f => f.drug_id)
    
    const reorderLevelData = await db
      .select({
        drugId: drugs.id,
        reorderLevel: drugs.reorderLevel,
        calculatedReorderLevel: drugs.calculatedReorderLevel,
        intelligentReorderLevel: reorderCalculations.intelligentReorderLevel,
      })
      .from(drugs)
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
      .where(inArray(drugs.id, drugIds))
    
    // Create a map for quick lookup
    const reorderLevelMap = new Map(
      reorderLevelData.map(item => [
        item.drugId,
        getEffectiveReorderLevel({
          intelligentReorderLevel: item.intelligentReorderLevel,
          calculatedReorderLevel: item.calculatedReorderLevel,
          reorderLevel: item.reorderLevel
        })
      ])
    )
    
    // Enrich forecasts with effective reorder levels
    return forecasts.map(forecast => ({
      ...forecast,
      reorder_level: reorderLevelMap.get(forecast.drug_id) || forecast.reorder_level
    }))
    
  } catch (error) {
    console.error('Failed to enrich forecasts with effective reorder levels:', error)
    // Return original forecasts if enrichment fails
    return forecasts
  }
}

// Fallback strategy: try bulk endpoint first, then individual forecasts
async function fetchAllForecasts(): Promise<AllForecastsResponse | MLServiceError | null> {
  const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'https://pharma-inventory-production.up.railway.app'
  const ML_API_KEY = process.env.ML_API_KEY || 'ml-service-dev-key-2025'

  if (!ML_SERVICE_URL || !ML_API_KEY) {
    console.error('ML service configuration missing')
    return null
  }

  // Try bulk endpoint first
  try {
    console.log(`🔗 Attempting bulk forecast from: ${ML_SERVICE_URL}/forecast/all`)
    
    const response = await fetch(`${ML_SERVICE_URL}/forecast/all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ML_API_KEY,
      },
      body: JSON.stringify({ days: 7 }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000) // Reduced timeout for bulk
    })

    console.log(`📡 Bulk forecast response: ${response.status} ${response.statusText}`)

    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Bulk forecast successful: ${data.forecasts?.length || 0} forecasts`)
      return data
    }

    console.warn(`⚠️ Bulk forecast failed with ${response.status}, trying individual forecasts...`)
    
  } catch (error) {
    console.warn('⚠️ Bulk forecast failed, trying individual forecasts...', error instanceof Error ? error.message : error)
  }

  // Fallback: fetch individual forecasts
  try {
    console.log(`🔄 Fallback: Fetching individual forecasts`)
    
    // Get drug list from database
    const { db } = await import('@/lib/db')
    const { drugs } = await import('@workspace/database')
    const drugList = await db.select().from(drugs)
    
    console.log(`📋 Found ${drugList.length} drugs to forecast`)
    
    const forecasts: DrugForecast[] = []
    const errors: string[] = []
    
    // Fetch forecasts for each drug individually
    for (const drug of drugList) {
      try {
        const response = await fetch(`${ML_SERVICE_URL}/forecast/${drug.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': ML_API_KEY,
          },
          body: JSON.stringify({ days: 7 }),
          cache: 'no-store',
          signal: AbortSignal.timeout(10000)
        })

        if (response.ok) {
          const forecast = await response.json()
          forecasts.push(forecast)
          console.log(`✅ Individual forecast for ${drug.name}: OK`)
        } else {
          errors.push(`${drug.name}: ${response.status}`)
          console.warn(`❌ Individual forecast for ${drug.name}: ${response.status}`)
        }
      } catch (error) {
        errors.push(`${drug.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        console.warn(`❌ Individual forecast for ${drug.name}:`, error)
      }
    }

    if (forecasts.length === 0) {
      return { 
        error: true, 
        message: `All individual forecasts failed. Errors: ${errors.join(', ')}`,
        timestamp: new Date().toISOString()
      }
    }

    if (errors.length > 0) {
      console.warn(`⚠️ Some individual forecasts failed: ${errors.join(', ')}`)
    }

    console.log(`✅ Individual forecasts successful: ${forecasts.length}/${drugList.length} drugs`)
    
    return {
      forecasts,
      generated_at: new Date().toISOString()
    }
    
  } catch (error) {
    let errorMessage = 'Failed to fetch forecasts using both bulk and individual methods'
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Individual forecast requests timed out - service may be overloaded'
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Network error connecting to ML service - service may be down'
      } else {
        errorMessage = `Individual forecast error: ${error.message}`
      }
    }
    
    console.error('❌ All forecast methods failed:', errorMessage, error)
    return { 
      error: true, 
      message: errorMessage,
      timestamp: new Date().toISOString()
    }
  }
}

export async function getAllForecasts(): Promise<AllForecastsResponse | MLServiceError | null> {
  const result = await fetchAllForecasts()
  
  // If we got forecasts successfully, enrich them with effective reorder levels
  if (result && !('error' in result) && result.forecasts) {
    try {
      const enrichedForecasts = await enrichForecastsWithEffectiveReorderLevels(result.forecasts)
      return {
        ...result,
        forecasts: enrichedForecasts
      }
    } catch (error) {
      console.error('Failed to enrich forecasts, returning original data:', error)
      return result
    }
  }
  
  return result
}