import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/roles'

export async function POST() {
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

    console.log(`🔄 Manual ML retraining triggered by: ${session.user.email}`)
    
    // Call ML service retraining endpoint
    const response = await fetch(`${ML_SERVICE_URL}/train`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ML_API_KEY,
      },
      signal: AbortSignal.timeout(300000) // 5 minute timeout for training
    })

    console.log(`🤖 ML service response: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error(`❌ ML retraining failed: ${response.status} - ${errorText}`)
      
      return NextResponse.json({
        success: false,
        error: 'ML retraining failed',
        details: `ML service returned ${response.status}: ${errorText}`,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    const result = await response.json()
    
    console.log(`✅ ML retraining completed successfully:`, {
      modelsReloaded: result.models_reloaded,
      trainingResults: result.training_results
    })

    return NextResponse.json({
      success: true,
      message: 'ML models retrained successfully',
      data: {
        modelsReloaded: result.models_reloaded || 0,
        trainingResults: result.training_results || {},
        triggeredBy: session.user.email,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ ML retraining error:', error)
    
    let errorMessage = 'Failed to retrain ML models'
    let details = 'Unknown error'
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'ML retraining timed out'
        details = 'Training took longer than 5 minutes. This may indicate an issue with the ML service.'
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Failed to connect to ML service'
        details = 'ML service may be down or unreachable'
      } else {
        details = error.message
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'ML Retraining API',
    description: 'Manually trigger ML model retraining (super admin only)',
    usage: 'POST request with valid super admin session',
    timeout: '5 minutes'
  })
}