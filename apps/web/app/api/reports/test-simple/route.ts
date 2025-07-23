import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { drugs, inventory } from '@workspace/database'
import { eq, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing simple database query...')
    
    // Simple test query
    const drugCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(drugs)
    
    console.log('Drug count:', drugCount[0]?.count)
    
    return NextResponse.json({
      success: true,
      drugCount: drugCount[0]?.count || 0,
      message: 'Simple test successful'
    })
    
  } catch (error) {
    console.error('Simple test failed:', error)
    return NextResponse.json(
      { 
        error: 'Simple test failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}