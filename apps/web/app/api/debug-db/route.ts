import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { drugs, inventory } from '@workspace/database'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  try {
    console.log('🔍 Testing database connection...')
    
    // Test 1: Check database connection
    console.log('📊 Checking drugs table...')
    const drugsData = await db.select().from(drugs).limit(5)
    console.log(`Found ${drugsData.length} drugs`)
    
    // Test 2: Check inventory table
    console.log('📦 Checking inventory table...')
    const inventoryData = await db
      .select({
        id: inventory.id,
        drugId: inventory.drugId,
        date: inventory.date,
        closingStock: inventory.closingStock,
        updatedAt: inventory.updatedAt
      })
      .from(inventory)
      .orderBy(desc(inventory.updatedAt))
      .limit(10)
    
    console.log(`Found ${inventoryData.length} inventory records`)
    
    // Test 3: Check specific drug stock
    if (drugsData.length > 0) {
      const testDrug = drugsData[0]
      const [currentStock] = await db
        .select({
          closingStock: inventory.closingStock,
          date: inventory.date
        })
        .from(inventory)
        .where(eq(inventory.drugId, testDrug.id))
        .orderBy(desc(inventory.date))
        .limit(1)
      
      console.log(`Current stock for ${testDrug.name}: ${currentStock?.closingStock || 0}`)
    }
    
    // Test 4: Check environment variables
    const envCheck = {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'undefined'
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database connection test completed',
      data: {
        drugsCount: drugsData.length,
        inventoryRecords: inventoryData.length,
        drugs: drugsData.map(d => ({ id: d.id, name: d.name })),
        recentInventory: inventoryData.slice(0, 3),
        environment: envCheck
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Database test failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
        NODE_ENV: process.env.NODE_ENV || 'undefined'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}