'use server'

import { unstable_cache } from 'next/cache'

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

// Cache forecasts for 1 hour
const getCachedForecasts = unstable_cache(
  async () => fetchAllForecasts(),
  ['all-forecasts'],
  { revalidate: 3600 }
)

async function fetchAllForecasts(): Promise<AllForecastsResponse | null> {
  const ML_SERVICE_URL = process.env.ML_SERVICE_URL
  const ML_API_KEY = process.env.ML_API_KEY

  if (!ML_SERVICE_URL || !ML_API_KEY) {
    console.error('ML service configuration missing')
    return null
  }

  try {
    const response = await fetch(`${ML_SERVICE_URL}/forecast/all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ML_API_KEY,
      },
      body: JSON.stringify({ days: 7 }),
      // Don't cache at fetch level, we handle caching above
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error('ML service error:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch forecasts:', error)
    return null
  }
}

export async function getAllForecasts(): Promise<AllForecastsResponse | null> {
  return getCachedForecasts()
}

export async function refreshForecasts(): Promise<void> {
  // This will invalidate the cache and fetch fresh data
  const { revalidatePath } = await import('next/cache')
  revalidatePath('/forecasts')
}