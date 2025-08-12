import { NextRequest, NextResponse } from 'next/server'
import { getDrugActivityHistory, getDailyActivitySummary } from '@/lib/drug-activity-logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const drugId = searchParams.get('drugId')
    const date = searchParams.get('date')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    if (drugId) {
      // Get activity history for a specific drug
      const activities = await getDrugActivityHistory(parseInt(drugId), limit)
      return NextResponse.json({ activities })
    }
    
    if (date) {
      // Get daily summary for all drugs on a specific date
      const summary = await getDailyActivitySummary(date)
      return NextResponse.json({ summary })
    }
    
    return NextResponse.json(
      { error: 'Either drugId or date parameter is required' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Failed to get drug activity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drug activity', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}