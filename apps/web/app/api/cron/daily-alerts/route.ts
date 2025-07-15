import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { generateAlerts } from '@/features/alerts/actions/alert-actions'

export async function GET() {
  try {
    // Verify the request is from Vercel Cron
    const headersList = await headers()
    const authorization = headersList.get('authorization')
    
    // Check for Vercel Cron secret
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error('CRON_SECRET environment variable not set')
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      )
    }

    // Verify authorization
    if (authorization !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🕐 Starting daily alert generation...')
    
    // Generate all alerts
    const result = await generateAlerts()
    
    console.log(`✅ Daily alerts completed: ${result.generated} generated, ${result.resolved} resolved`)
    
    return NextResponse.json({
      success: true,
      message: 'Daily alerts generated successfully',
      data: {
        generated: result.generated,
        resolved: result.resolved,
        errors: result.errors
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Cron job error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error during alert generation',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Only allow GET method
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}