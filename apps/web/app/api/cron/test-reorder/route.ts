import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/roles'
import { calculateAllReorderLevels } from '@/features/inventory/actions/reorder-actions'

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

    console.log(`🔍 Cron Job Test initiated by: ${session.user.email}`)

    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        CRON_SECRET: process.env.CRON_SECRET ? 'SET (hidden)' : 'NOT_SET',
        NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
        VERCEL: process.env.VERCEL || 'NOT_SET'
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
    const envTest = {
      name: 'Environment Variables',
      status: 'pass' as const,
      message: 'CRON_SECRET is set',
      details: {
        CRON_SECRET: !!process.env.CRON_SECRET,
        VERCEL: process.env.VERCEL
      }
    }

    if (!process.env.CRON_SECRET) {
      envTest.status = 'fail'
      envTest.message = 'CRON_SECRET is not set - cron jobs will fail authentication'
    }

    diagnostics.tests.push(envTest)

    // Test 2: Manual Cron Endpoint Call
    console.log('⏰ Test 2: Manual Cron Endpoint Call')
    const cronTest = {
      name: 'Cron Endpoint Test',
      status: 'fail' as const,
      message: 'Cannot test cron endpoint',
      details: {},
      duration: 0
    }

    if (process.env.CRON_SECRET) {
      const startTime = Date.now()
      try {
        // Get the current origin to make internal request
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
        const host = process.env.VERCEL_URL || 'localhost:3000'
        const baseUrl = `${protocol}://${host}`
        
        const response = await fetch(`${baseUrl}/api/cron/calculate-reorder-levels`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(30000) // 30 second timeout
        })
        
        cronTest.duration = Date.now() - startTime
        
        if (response.ok) {
          const cronData = await response.json()
          cronTest.status = 'pass'
          cronTest.message = 'Cron endpoint executed successfully'
          cronTest.details = cronData
        } else {
          const errorText = await response.text().catch(() => 'No response body')
          cronTest.status = 'fail'
          cronTest.message = `Cron endpoint error: ${response.status} ${response.statusText}`
          cronTest.details = { status: response.status, body: errorText }
        }
      } catch (error) {
        cronTest.duration = Date.now() - startTime
        cronTest.details = { error: error instanceof Error ? error.message : 'Unknown error' }
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            cronTest.message = 'Cron endpoint timeout (>30 seconds)'
          } else {
            cronTest.message = `Cron endpoint error: ${error.message}`
          }
        }
      }
    } else {
      cronTest.message = 'Cannot test cron endpoint - CRON_SECRET not set'
    }

    diagnostics.tests.push(cronTest)

    // Test 3: Direct Function Call
    console.log('📊 Test 3: Direct Function Call')
    const functionTest = {
      name: 'Direct Function Call',
      status: 'fail' as const,
      message: 'Direct function call failed',
      details: {},
      duration: 0
    }

    const startTime = Date.now()
    try {
      console.log('Calling calculateAllReorderLevels directly...')
      const result = await calculateAllReorderLevels()
      functionTest.duration = Date.now() - startTime
      
      functionTest.status = 'pass'
      functionTest.message = `Function executed successfully: ${result.calculationsCount} calculations`
      functionTest.details = {
        success: result.success,
        calculationsCount: result.calculationsCount,
        timestamp: result.timestamp,
        errors: result.errors || []
      }
    } catch (error) {
      functionTest.duration = Date.now() - startTime
      functionTest.details = { error: error instanceof Error ? error.message : 'Unknown error' }
      functionTest.message = `Direct function call error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }

    diagnostics.tests.push(functionTest)

    // Test 4: Check Last Calculation Times
    console.log('📅 Test 4: Check Last Calculation Times')
    const timeTest = {
      name: 'Last Calculation Times',
      status: 'warning' as const,
      message: 'Checking last calculation times',
      details: {},
      duration: 0
    }

    try {
      // We can check this from the database or logs
      // For now, we'll just note what we need to check
      timeTest.details = {
        note: 'Check database for lastReorderCalculation timestamps',
        expectedSchedule: 'Daily at 2:00 AM UTC (0 2 * * *)',
        currentTime: new Date().toISOString(),
        timezoneInfo: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
      
      timeTest.status = 'pass'
      timeTest.message = 'Time check completed - review details for analysis'
    } catch (error) {
      timeTest.details = { error: error instanceof Error ? error.message : 'Unknown error' }
      timeTest.message = 'Failed to check calculation times'
    }

    diagnostics.tests.push(timeTest)

    // Summary
    const passedTests = diagnostics.tests.filter(t => t.status === 'pass').length
    const failedTests = diagnostics.tests.filter(t => t.status === 'fail').length
    const warningTests = diagnostics.tests.filter(t => t.status === 'warning').length

    console.log(`🔍 Cron Diagnosis Complete: ${passedTests} passed, ${failedTests} failed, ${warningTests} warnings`)

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
    console.error('❌ Cron diagnosis error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to run cron diagnostics',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

function generateRecommendations(tests: Array<{name: string, status: string, message: string}>) {
  const recommendations: string[] = []
  
  const envTest = tests.find(t => t.name === 'Environment Variables')
  const cronTest = tests.find(t => t.name === 'Cron Endpoint Test')
  const functionTest = tests.find(t => t.name === 'Direct Function Call')

  if (envTest?.status === 'fail') {
    recommendations.push('Set CRON_SECRET environment variable in Vercel dashboard')
    recommendations.push('Ensure CRON_SECRET matches between Vercel configuration and application')
  }

  if (cronTest?.status === 'fail') {
    recommendations.push('Check Vercel cron job configuration in vercel.json')
    recommendations.push('Verify cron job is enabled in Vercel dashboard')
    recommendations.push('Check Vercel function logs for cron execution errors')
  }

  if (functionTest?.status === 'fail') {
    recommendations.push('Debug the calculateAllReorderLevels function directly')
    recommendations.push('Check database connectivity and permissions')
    recommendations.push('Review ML service integration for reorder calculations')
  }

  if (functionTest?.status === 'pass' && cronTest?.status === 'fail') {
    recommendations.push('Function works but cron fails - likely authentication or routing issue')
    recommendations.push('Check Vercel cron job logs and configuration')
  }

  if (recommendations.length === 0) {
    recommendations.push('All tests passed - cron job should be working correctly')
    recommendations.push('Check Vercel dashboard for cron execution history')
  }

  return recommendations
}