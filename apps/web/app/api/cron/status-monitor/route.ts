import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Verify this is a legitimate cron request
  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
  
  if (!process.env.CRON_SECRET) {
    console.error('❌ CRON_SECRET not configured')
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    )
  }

  if (authHeader !== expectedAuth) {
    console.error('❌ Unauthorized status monitor cron request')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    console.log('🔍 [CRON] Starting automated status monitoring...')
    
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    // Trigger the status check
    const response = await fetch(`${baseUrl}/api/status/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    
    console.log(`✅ [CRON] Status monitoring completed. Checked ${result.checkedServices} services.`)
    
    // Log summary of results
    if (result.results) {
      const upServices = result.results.filter((s: any) => s.status === 'up').length
      const downServices = result.results.filter((s: any) => s.status === 'down').length
      const degradedServices = result.results.filter((s: any) => s.status === 'degraded').length
      
      console.log(`📊 [CRON] Status Summary: ${upServices} up, ${downServices} down, ${degradedServices} degraded`)
      
      // Log any issues
      result.results
        .filter((s: any) => s.status !== 'up')
        .forEach((s: any) => {
          console.warn(`⚠️ [CRON] ${s.serviceName}: ${s.status} - ${s.errorMessage || 'No details'}`)
        })
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Status monitoring completed successfully',
      details: {
        checkedServices: result.checkedServices || 0,
        upServices: result.results?.filter((s: any) => s.status === 'up').length || 0,
        issues: result.results?.filter((s: any) => s.status !== 'up').length || 0,
      }
    })

  } catch (error) {
    console.error('❌ [CRON] Status monitoring failed:', error)
    
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: 'Status monitoring failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}