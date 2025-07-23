import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Starting automated daily report generation...')
    
    // Generate report for yesterday (since this typically runs early morning)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const reportDate = yesterday.toISOString().split('T')[0]
    
    // Call our analytics API
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === 'production'
      ? 'https://your-domain.vercel.app'  // Replace with your actual domain
      : 'http://localhost:3000'
    
    const analyticsResponse = await fetch(`${baseUrl}/api/reports/daily-analytics?date=${reportDate}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!analyticsResponse.ok) {
      throw new Error(`Analytics API failed: ${analyticsResponse.status}`)
    }
    
    const reportData = await analyticsResponse.json()
    
    // Here you could:
    // 1. Send email with report summary
    // 2. Save report to a specific location
    // 3. Send notifications about critical items
    // 4. Post to Slack/Teams
    
    console.log('✅ Daily report generated successfully')
    console.log('📊 Report Summary:', {
      date: reportData.reportDate,
      mlHealth: reportData.mlServiceHealth.status,
      criticalItems: reportData.summary.keyMetrics.criticalStockItems,
      mlSuccessRate: reportData.summary.keyMetrics.mlSuccessRate + '%',
      totalAlerts: reportData.summary.alerts.length
    })
    
    // For now, we'll just log it. In production, you might:
    // - Send to email service
    // - Save to external storage
    // - Send push notifications
    
    return NextResponse.json({
      success: true,
      message: 'Daily report generated successfully',
      reportDate: reportData.reportDate,
      summary: {
        mlHealth: reportData.mlServiceHealth.status,
        criticalStockItems: reportData.summary.keyMetrics.criticalStockItems,
        mlSuccessRate: reportData.summary.keyMetrics.mlSuccessRate,
        totalAlerts: reportData.summary.alerts.length,
        totalRecommendations: reportData.summary.recommendations.length
      }
    })

  } catch (error) {
    console.error('❌ Failed to generate daily report:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate daily report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}