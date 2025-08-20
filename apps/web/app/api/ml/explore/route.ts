import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/roles'

export async function GET() {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions. Super admin required.' }, { status: 403 })
    }

    console.log(`🔍 ML Endpoint Explorer initiated by: ${session.user.email}`)

    const ML_SERVICE_URL = process.env.ML_SERVICE_URL
    const ML_API_KEY = process.env.ML_API_KEY

    if (!ML_SERVICE_URL || !ML_API_KEY) {
      return NextResponse.json({ 
        error: 'ML service configuration missing' 
      }, { status: 500 })
    }

    const exploration = {
      timestamp: new Date().toISOString(),
      service_url: ML_SERVICE_URL,
      endpoints_tested: [] as Array<{
        endpoint: string
        method: string
        status: number
        statusText: string
        responseTime: number
        body?: any
        error?: string
      }>
    }

    // List of common ML service endpoints to test
    const endpointsToTest = [
      { path: '', method: 'GET' },
      { path: '/health', method: 'GET' },
      { path: '/predict', method: 'GET' },
      { path: '/predict', method: 'POST' },
      { path: '/prediction', method: 'GET' },
      { path: '/prediction', method: 'POST' },
      { path: '/predictions', method: 'GET' },
      { path: '/predictions', method: 'POST' },
      { path: '/forecast', method: 'GET' },
      { path: '/forecast', method: 'POST' },
      { path: '/models', method: 'GET' },
      { path: '/train', method: 'GET' },
      { path: '/train', method: 'POST' },
      { path: '/status', method: 'GET' },
      { path: '/api', method: 'GET' },
      { path: '/api/predict', method: 'GET' },
      { path: '/api/predict', method: 'POST' },
      { path: '/api/health', method: 'GET' },
      { path: '/docs', method: 'GET' },
      { path: '/openapi.json', method: 'GET' },
      { path: '/swagger.json', method: 'GET' }
    ]

    console.log(`🕵️ Testing ${endpointsToTest.length} endpoints...`)

    // Test each endpoint
    for (const endpoint of endpointsToTest) {
      const startTime = Date.now()
      
      try {
        const url = `${ML_SERVICE_URL}${endpoint.path}`
        const requestConfig: RequestInit = {
          method: endpoint.method,
          headers: {
            'X-API-Key': ML_API_KEY,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        }

        // Add sample body for POST requests to prediction endpoints
        if (endpoint.method === 'POST' && (
          endpoint.path.includes('predict') || 
          endpoint.path.includes('forecast') ||
          endpoint.path.includes('train')
        )) {
          requestConfig.body = JSON.stringify({
            drug_id: 1,
            drug_name: "Test Drug",
            current_stock: 100,
            avg_daily_usage: 10,
            days_since_last_restock: 5,
            seasonal_factor: 1.0,
            lead_time_days: 7
          })
        }

        const response = await fetch(url, requestConfig)
        const responseTime = Date.now() - startTime

        let body = null
        try {
          const text = await response.text()
          if (text) {
            try {
              body = JSON.parse(text)
            } catch {
              body = text.substring(0, 500) // Truncate long text responses
            }
          }
        } catch (e) {
          body = 'Unable to read response body'
        }

        exploration.endpoints_tested.push({
          endpoint: `${endpoint.method} ${endpoint.path}`,
          method: endpoint.method,
          status: response.status,
          statusText: response.statusText,
          responseTime,
          body
        })

        console.log(`✅ ${endpoint.method} ${endpoint.path}: ${response.status} ${response.statusText} (${responseTime}ms)`)

      } catch (error) {
        const responseTime = Date.now() - startTime
        
        exploration.endpoints_tested.push({
          endpoint: `${endpoint.method} ${endpoint.path}`,
          method: endpoint.method,
          status: 0,
          statusText: 'ERROR',
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        console.log(`❌ ${endpoint.method} ${endpoint.path}: ${error instanceof Error ? error.message : 'Unknown error'} (${responseTime}ms)`)
      }
    }

    // Analyze results
    const workingEndpoints = exploration.endpoints_tested.filter(e => e.status >= 200 && e.status < 300)
    const notFoundEndpoints = exploration.endpoints_tested.filter(e => e.status === 404)
    const errorEndpoints = exploration.endpoints_tested.filter(e => e.status === 0 || e.status >= 400)

    const analysis = {
      total_endpoints_tested: exploration.endpoints_tested.length,
      working_endpoints: workingEndpoints.length,
      not_found_endpoints: notFoundEndpoints.length,
      error_endpoints: errorEndpoints.length,
      available_endpoints: workingEndpoints.map(e => e.endpoint),
      prediction_endpoints: {
        available: workingEndpoints.filter(e => 
          e.endpoint.toLowerCase().includes('predict') || 
          e.endpoint.toLowerCase().includes('forecast')
        ),
        not_found: notFoundEndpoints.filter(e => 
          e.endpoint.toLowerCase().includes('predict') || 
          e.endpoint.toLowerCase().includes('forecast')
        )
      },
      recommendations: [] as string[]
    }

    // Generate recommendations
    if (analysis.prediction_endpoints.available.length === 0) {
      analysis.recommendations.push('❌ No prediction endpoints found - ML service may not support predictions')
      analysis.recommendations.push('🔍 Check ML service documentation for correct prediction endpoint path')
      analysis.recommendations.push('🛠️ Verify ML service is properly configured with prediction functionality')
    } else {
      analysis.recommendations.push(`✅ Found ${analysis.prediction_endpoints.available.length} working prediction endpoint(s)`)
      analysis.recommendations.push('🔧 Update application to use the correct prediction endpoint(s)')
    }

    if (workingEndpoints.some(e => e.endpoint.includes('/docs') || e.endpoint.includes('/openapi') || e.endpoint.includes('/swagger'))) {
      analysis.recommendations.push('📚 API documentation endpoint available - check for complete API specification')
    }

    console.log(`🔍 Exploration complete: ${workingEndpoints.length}/${exploration.endpoints_tested.length} endpoints working`)

    return NextResponse.json({
      success: true,
      exploration,
      analysis,
      working_endpoints: workingEndpoints,
      failed_endpoints: errorEndpoints.concat(notFoundEndpoints)
    })

  } catch (error) {
    console.error('❌ ML endpoint exploration error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to explore ML endpoints',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}