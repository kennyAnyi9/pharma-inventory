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

    console.log(`🔍 ML System Diagnosis initiated by: ${session.user.email}`)

    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'NOT_SET',
        ML_API_KEY: process.env.ML_API_KEY ? 'SET (hidden)' : 'NOT_SET',
        NODE_ENV: process.env.NODE_ENV || 'NOT_SET'
      },
      tests: [] as Array<{
        name: string
        status: 'pass' | 'fail' | 'warning'
        message: string
        details?: any
        duration?: number
      }>
    }

    // Test 1: Environment Variables
    console.log('🔧 Test 1: Environment Variables')
    const envTest: {
      name: string
      status: 'pass' | 'fail' | 'warning'
      message: string
      details: any
    } = {
      name: 'Environment Variables',
      status: 'pass',
      message: 'All required environment variables are set',
      details: {
        ML_SERVICE_URL: !!process.env.ML_SERVICE_URL,
        ML_API_KEY: !!process.env.ML_API_KEY
      }
    }

    if (!process.env.ML_SERVICE_URL) {
      envTest.status = 'fail'
      envTest.message = 'ML_SERVICE_URL is not set'
    } else if (!process.env.ML_API_KEY) {
      envTest.status = 'fail'
      envTest.message = 'ML_API_KEY is not set'
    }

    diagnostics.tests.push(envTest)

    // Test 2: Basic Connectivity
    console.log('🌐 Test 2: Basic Connectivity')
    const connectivityTest: {
      name: string
      status: 'pass' | 'fail' | 'warning'
      message: string
      details: any
      duration: number
    } = {
      name: 'Basic Connectivity',
      status: 'fail',
      message: 'Cannot reach ML service',
      details: {},
      duration: 0
    }

    if (process.env.ML_SERVICE_URL) {
      const startTime = Date.now()
      try {
        const response = await fetch(`${process.env.ML_SERVICE_URL}`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        })
        
        connectivityTest.duration = Date.now() - startTime
        connectivityTest.details = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }

        if (response.ok) {
          connectivityTest.status = 'pass'
          connectivityTest.message = `ML service reachable (${response.status} ${response.statusText})`
        } else {
          connectivityTest.status = 'warning'
          connectivityTest.message = `ML service responded with ${response.status}: ${response.statusText}`
        }
      } catch (error) {
        connectivityTest.duration = Date.now() - startTime
        connectivityTest.details = { error: error instanceof Error ? error.message : 'Unknown error' }
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            connectivityTest.message = 'ML service timeout (>5 seconds)'
          } else if (error.message.includes('fetch')) {
            connectivityTest.message = 'Network error - ML service unreachable'
          } else {
            connectivityTest.message = `Connection error: ${error.message}`
          }
        }
      }
    } else {
      connectivityTest.message = 'Cannot test connectivity - ML_SERVICE_URL not set'
    }

    diagnostics.tests.push(connectivityTest)

    // Test 3: Health Endpoint
    console.log('🏥 Test 3: Health Endpoint')
    const healthTest: {
      name: string
      status: 'pass' | 'fail' | 'warning'
      message: string
      details: any
      duration: number
    } = {
      name: 'Health Endpoint',
      status: 'fail',
      message: 'Health endpoint not accessible',
      details: {},
      duration: 0
    }

    if (process.env.ML_SERVICE_URL && process.env.ML_API_KEY && connectivityTest.status !== 'fail') {
      const startTime = Date.now()
      try {
        const response = await fetch(`${process.env.ML_SERVICE_URL}/health`, {
          method: 'GET',
          headers: {
            'X-API-Key': process.env.ML_API_KEY,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        })
        
        healthTest.duration = Date.now() - startTime
        
        if (response.ok) {
          const healthData = await response.json()
          healthTest.status = 'pass'
          healthTest.message = 'Health endpoint responding correctly'
          healthTest.details = healthData
        } else {
          const errorText = await response.text().catch(() => 'No response body')
          healthTest.status = 'fail'
          healthTest.message = `Health endpoint error: ${response.status} ${response.statusText}`
          healthTest.details = { status: response.status, body: errorText }
        }
      } catch (error) {
        healthTest.duration = Date.now() - startTime
        healthTest.details = { error: error instanceof Error ? error.message : 'Unknown error' }
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            healthTest.message = 'Health endpoint timeout (>10 seconds)'
          } else {
            healthTest.message = `Health endpoint error: ${error.message}`
          }
        }
      }
    } else {
      healthTest.message = 'Cannot test health endpoint - connectivity or config issues'
    }

    diagnostics.tests.push(healthTest)

    // Test 4: Models Endpoint
    console.log('🤖 Test 4: Models Endpoint')
    const modelsTest: {
      name: string
      status: 'pass' | 'fail' | 'warning'
      message: string
      details: any
      duration: number
    } = {
      name: 'Models Endpoint',
      status: 'fail',
      message: 'Models endpoint not accessible',
      details: {},
      duration: 0
    }

    if (process.env.ML_SERVICE_URL && process.env.ML_API_KEY && connectivityTest.status !== 'fail') {
      const startTime = Date.now()
      try {
        const response = await fetch(`${process.env.ML_SERVICE_URL}/models`, {
          method: 'GET',
          headers: {
            'X-API-Key': process.env.ML_API_KEY,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        })
        
        modelsTest.duration = Date.now() - startTime
        
        if (response.ok) {
          const modelsData = await response.json()
          modelsTest.status = 'pass'
          modelsTest.message = 'Models endpoint responding'
          modelsTest.details = modelsData
        } else {
          const errorText = await response.text().catch(() => 'No response body')
          modelsTest.status = 'fail'
          modelsTest.message = `Models endpoint error: ${response.status} ${response.statusText}`
          modelsTest.details = { status: response.status, body: errorText }
        }
      } catch (error) {
        modelsTest.duration = Date.now() - startTime
        modelsTest.details = { error: error instanceof Error ? error.message : 'Unknown error' }
        modelsTest.message = `Models endpoint error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    } else {
      modelsTest.message = 'Cannot test models endpoint - connectivity or config issues'
    }

    diagnostics.tests.push(modelsTest)

    // Test 5: Predict Endpoint (with sample data)
    console.log('🔮 Test 5: Predict Endpoint')
    const predictTest: {
      name: string
      status: 'pass' | 'fail' | 'warning'
      message: string
      details: any
      duration: number
    } = {
      name: 'Predict Endpoint',
      status: 'fail',
      message: 'Predict endpoint not accessible',
      details: {},
      duration: 0
    }

    if (process.env.ML_SERVICE_URL && process.env.ML_API_KEY && connectivityTest.status !== 'fail') {
      const startTime = Date.now()
      try {
        const samplePrediction = {
          drug_id: 1,
          drug_name: "Paracetamol 500mg",
          current_stock: 100,
          avg_daily_usage: 10,
          days_since_last_restock: 5,
          seasonal_factor: 1.0,
          lead_time_days: 7
        }

        const response = await fetch(`${process.env.ML_SERVICE_URL}/predict`, {
          method: 'POST',
          headers: {
            'X-API-Key': process.env.ML_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(samplePrediction),
          signal: AbortSignal.timeout(15000) // 15 second timeout for predictions
        })
        
        predictTest.duration = Date.now() - startTime
        
        if (response.ok) {
          const predictionData = await response.json()
          predictTest.status = 'pass'
          predictTest.message = 'Predict endpoint working correctly'
          predictTest.details = { input: samplePrediction, output: predictionData }
        } else {
          const errorText = await response.text().catch(() => 'No response body')
          predictTest.status = 'fail'
          predictTest.message = `Predict endpoint error: ${response.status} ${response.statusText}`
          predictTest.details = { status: response.status, body: errorText, input: samplePrediction }
        }
      } catch (error) {
        predictTest.duration = Date.now() - startTime
        predictTest.details = { error: error instanceof Error ? error.message : 'Unknown error' }
        predictTest.message = `Predict endpoint error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    } else {
      predictTest.message = 'Cannot test predict endpoint - connectivity or config issues'
    }

    diagnostics.tests.push(predictTest)

    // Summary
    const passedTests = diagnostics.tests.filter(t => t.status === 'pass').length
    const failedTests = diagnostics.tests.filter(t => t.status === 'fail').length
    const warningTests = diagnostics.tests.filter(t => t.status === 'warning').length

    console.log(`🔍 ML Diagnosis Complete: ${passedTests} passed, ${failedTests} failed, ${warningTests} warnings`)

    return NextResponse.json({
      success: true,
      summary: {
        total_tests: diagnostics.tests.length,
        passed: passedTests,
        failed: failedTests,
        warnings: warningTests,
        overall_status: failedTests > 0 ? 'CRITICAL' : warningTests > 0 ? 'WARNING' : 'HEALTHY'
      },
      diagnostics,
      recommendations: generateRecommendations(diagnostics.tests)
    })

  } catch (error) {
    console.error('❌ ML diagnosis error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to run ML diagnostics',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

function generateRecommendations(tests: Array<{name: string, status: string, message: string}>) {
  const recommendations: string[] = []
  
  const envTest = tests.find(t => t.name === 'Environment Variables')
  const connectTest = tests.find(t => t.name === 'Basic Connectivity')
  const healthTest = tests.find(t => t.name === 'Health Endpoint')
  const modelsTest = tests.find(t => t.name === 'Models Endpoint')
  const predictTest = tests.find(t => t.name === 'Predict Endpoint')

  if (envTest?.status === 'fail') {
    recommendations.push('Set missing environment variables (ML_SERVICE_URL, ML_API_KEY)')
    recommendations.push('Check .env.local file configuration')
  }

  if (connectTest?.status === 'fail') {
    recommendations.push('Verify ML service is running and accessible')
    recommendations.push('Check network connectivity and firewall settings')
    recommendations.push('Confirm ML service URL is correct')
  }

  if (healthTest?.status === 'fail') {
    recommendations.push('Check ML service health endpoint implementation')
    recommendations.push('Verify API key authentication')
  }

  if (modelsTest?.status === 'fail') {
    recommendations.push('Check if ML models are properly loaded')
    recommendations.push('Review ML service model initialization')
  }

  if (predictTest?.status === 'fail') {
    recommendations.push('Debug ML prediction functionality')
    recommendations.push('Check model training and availability')
  }

  if (recommendations.length === 0) {
    recommendations.push('All tests passed - ML service appears to be working correctly')
  }

  return recommendations
}