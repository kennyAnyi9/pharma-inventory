import { NextResponse } from 'next/server'

export async function GET() {
  const startTime = Date.now()
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {
      ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'NOT SET',
      ML_API_KEY: process.env.ML_API_KEY ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    },
    tests: []
  }

  // Test 1: Direct ML service health check
  try {
    const healthStart = Date.now()
    const healthResponse = await fetch(`${process.env.ML_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000)
    })
    const healthTime = Date.now() - healthStart

    results.tests.push({
      test: 'ML Service Health',
      success: healthResponse.ok,
      status: healthResponse.status,
      time: healthTime,
      data: healthResponse.ok ? await healthResponse.json() : null
    })
  } catch (error) {
    results.tests.push({
      test: 'ML Service Health',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      note: 'ML service not reachable from Next.js'
    })
  }

  // Test 2: Single forecast
  if (process.env.ML_SERVICE_URL && process.env.ML_API_KEY) {
    try {
      const forecastStart = Date.now()
      const forecastResponse = await fetch(`${process.env.ML_SERVICE_URL}/forecast/1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.ML_API_KEY
        },
        body: JSON.stringify({ days: 7 }),
        signal: AbortSignal.timeout(10000)
      })
      const forecastTime = Date.now() - forecastStart

      results.tests.push({
        test: 'Single Drug Forecast',
        success: forecastResponse.ok,
        status: forecastResponse.status,
        time: forecastTime,
        dataSize: forecastResponse.ok ? 
          JSON.stringify(await forecastResponse.json()).length : 0
      })
    } catch (error) {
      results.tests.push({
        test: 'Single Drug Forecast',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // Test 3: Database connectivity
  try {
    const { db } = await import('@/lib/db')
    const { drugs } = await import('@workspace/database')
    
    const dbStart = Date.now()
    const drugCount = await db.select().from(drugs)
    const dbTime = Date.now() - dbStart

    results.tests.push({
      test: 'Database Query',
      success: true,
      time: dbTime,
      drugCount: drugCount.length
    })
  } catch (error) {
    results.tests.push({
      test: 'Database Query',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  results.totalTime = Date.now() - startTime
  results.isProduction = process.env.NODE_ENV === 'production'
  results.isVercel = !!process.env.VERCEL

  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  })
}