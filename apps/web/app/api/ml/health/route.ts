import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/roles'

interface MLHealthCheck {
  service: {
    status: 'online' | 'offline' | 'error'
    responseTime: number
    lastChecked: string
    serviceUrl: string
  }
  models: {
    status: 'loaded' | 'loading' | 'error'
    totalModels: number
    loadedModels: string[]
    failedModels: string[]
    lastModelUpdate: string | null
  }
  predictions: {
    status: 'working' | 'error'
    lastSuccessfulPrediction: string | null
    totalPredictionsToday: number
    errorRate: number
  }
  overall: {
    status: 'healthy' | 'warning' | 'critical'
    issues: string[]
    recommendations: string[]
  }
}

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

    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'https://pharma-inventory-production.up.railway.app'
    const ML_API_KEY = process.env.ML_API_KEY || 'ml-service-dev-key-2025'

    if (!ML_SERVICE_URL || !ML_API_KEY) {
      return NextResponse.json({ 
        error: 'ML service configuration missing',
        details: 'ML_SERVICE_URL or ML_API_KEY not configured'
      }, { status: 500 })
    }

    const healthCheck: MLHealthCheck = {
      service: {
        status: 'offline',
        responseTime: 0,
        lastChecked: new Date().toISOString(),
        serviceUrl: ML_SERVICE_URL
      },
      models: {
        status: 'error',
        totalModels: 0,
        loadedModels: [],
        failedModels: [],
        lastModelUpdate: null
      },
      predictions: {
        status: 'error',
        lastSuccessfulPrediction: null,
        totalPredictionsToday: 0,
        errorRate: 0
      },
      overall: {
        status: 'critical',
        issues: [],
        recommendations: []
      }
    }

    console.log(`🏥 ML Health Check initiated by: ${session.user.email}`)
    
    // Check service availability
    const startTime = Date.now()
    try {
      const response = await fetch(`${ML_SERVICE_URL}/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': ML_API_KEY,
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      const responseTime = Date.now() - startTime
      healthCheck.service.responseTime = responseTime
      
      if (response.ok) {
        healthCheck.service.status = 'online'
        
        const healthData = await response.json()
        console.log(`✅ ML service online (${responseTime}ms):`, healthData)
        
        // Parse health response
        if (healthData.models) {
          healthCheck.models.status = healthData.models.status === 'loaded' ? 'loaded' : 'loading'
          healthCheck.models.totalModels = healthData.models.total || 0
          healthCheck.models.loadedModels = healthData.models.loaded || []
          healthCheck.models.failedModels = healthData.models.failed || []
          healthCheck.models.lastModelUpdate = healthData.models.last_update || null
        }
        
        if (healthData.predictions) {
          healthCheck.predictions.status = healthData.predictions.status === 'working' ? 'working' : 'error'
          healthCheck.predictions.lastSuccessfulPrediction = healthData.predictions.last_successful || null
          healthCheck.predictions.totalPredictionsToday = healthData.predictions.today_count || 0
          healthCheck.predictions.errorRate = healthData.predictions.error_rate || 0
        }
        
      } else {
        healthCheck.service.status = 'error'
        console.error(`❌ ML service unhealthy: ${response.status} ${response.statusText}`)
        healthCheck.overall.issues.push(`Service returned ${response.status}: ${response.statusText}`)
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime
      healthCheck.service.responseTime = responseTime
      healthCheck.service.status = 'offline'
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('❌ ML service timeout (>10s)')
          healthCheck.overall.issues.push('Service timeout (>10 seconds)')
        } else if (error.message.includes('fetch')) {
          console.error('❌ ML service unreachable:', error.message)
          healthCheck.overall.issues.push('Service unreachable - may be down')
        } else {
          console.error('❌ ML service error:', error.message)
          healthCheck.overall.issues.push(`Service error: ${error.message}`)
        }
      }
    }

    // Determine overall status
    if (healthCheck.service.status === 'online' && 
        healthCheck.models.status === 'loaded' && 
        healthCheck.predictions.status === 'working') {
      healthCheck.overall.status = 'healthy'
    } else if (healthCheck.service.status === 'online') {
      healthCheck.overall.status = 'warning'
      if (healthCheck.models.status !== 'loaded') {
        healthCheck.overall.issues.push('Some models are not fully loaded')
      }
      if (healthCheck.predictions.status !== 'working') {
        healthCheck.overall.issues.push('Predictions may not be working properly')
      }
    } else {
      healthCheck.overall.status = 'critical'
      healthCheck.overall.issues.push('ML service is not responding')
    }

    // Add recommendations
    if (healthCheck.overall.status === 'critical') {
      healthCheck.overall.recommendations.push('Check ML service deployment and logs')
      healthCheck.overall.recommendations.push('Verify API keys and network connectivity')
    } else if (healthCheck.overall.status === 'warning') {
      healthCheck.overall.recommendations.push('Consider retraining models if they are failing to load')
      healthCheck.overall.recommendations.push('Monitor prediction success rate')
    }

    console.log(`🏥 Health check completed: ${healthCheck.overall.status}`)
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      healthCheck
    })

  } catch (error) {
    console.error('❌ ML health check error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to perform health check',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}