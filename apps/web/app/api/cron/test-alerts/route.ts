import { NextResponse } from 'next/server'
import { generateAlerts } from '@/features/alerts/actions/alert-actions'

// Manual test endpoint for alert generation (no auth required for testing)
export async function GET() {
  try {
    console.log('🧪 Testing alert generation manually...')
    
    // Generate all alerts
    const result = await generateAlerts()
    
    console.log(`✅ Test alerts completed: ${result.generated} generated, ${result.resolved} resolved`)
    
    return NextResponse.json({
      success: true,
      message: 'Test alert generation completed successfully',
      data: {
        generated: result.generated,
        resolved: result.resolved,
        errors: result.errors
      },
      timestamp: new Date().toISOString(),
      note: 'This is a test endpoint. Production uses /api/cron/daily-alerts with authentication.'
    })

  } catch (error) {
    console.error('❌ Test alert generation error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Test alert generation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}