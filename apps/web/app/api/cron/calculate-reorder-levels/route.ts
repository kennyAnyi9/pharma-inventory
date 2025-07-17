import { NextResponse } from 'next/server'
import { calculateAllReorderLevels } from '@/features/inventory/actions/reorder-actions'

export async function POST(request: Request) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting automated reorder level calculation...')
    
    const result = await calculateAllReorderLevels()
    
    console.log(`Reorder level calculation complete:`, {
      calculationsCount: result.calculationsCount,
      success: result.success
    })

    return NextResponse.json({
      success: true,
      message: `Calculated reorder levels for ${result.calculationsCount} drugs`,
      data: result
    })
  } catch (error) {
    console.error('Failed to calculate reorder levels:', error)
    return NextResponse.json(
      { 
        error: 'Failed to calculate reorder levels', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Reorder level calculation endpoint',
    description: 'This endpoint calculates ML-optimized reorder levels for all drugs',
    usage: 'POST request with proper authorization header'
  })
}