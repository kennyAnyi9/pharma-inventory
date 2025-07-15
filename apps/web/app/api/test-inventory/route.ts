import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { inventory, drugs } from '@workspace/database'
import { eq, desc, and } from 'drizzle-orm'
import { updateStock, recordUsage } from '@/features/inventory/actions/inventory-actions'

export async function GET() {
  try {
    console.log('🧪 Testing inventory database operations...')
    
    // Test 1: Check if we have any drugs in the database
    const drugsData = await db.select().from(drugs).limit(3)
    console.log(`📊 Found ${drugsData.length} drugs in database`)
    
    if (drugsData.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No drugs found in database. Please seed the database first.',
        testResults: {
          drugsFound: 0,
          inventoryRecords: 0
        }
      })
    }

    // Test 2: Check current inventory records
    const inventoryRecords = await db
      .select({
        drugId: inventory.drugId,
        drugName: drugs.name,
        date: inventory.date,
        openingStock: inventory.openingStock,
        quantityReceived: inventory.quantityReceived,
        quantityUsed: inventory.quantityUsed,
        closingStock: inventory.closingStock,
        updatedAt: inventory.updatedAt
      })
      .from(inventory)
      .innerJoin(drugs, eq(inventory.drugId, drugs.id))
      .orderBy(desc(inventory.updatedAt))
      .limit(10)

    console.log(`📦 Found ${inventoryRecords.length} inventory records`)

    // Test 3: Try to update stock for first drug
    const testDrug = drugsData[0]
    const testQuantity = 50
    
    console.log(`🔄 Testing stock update for drug: ${testDrug.name}`)
    
    // Get current stock before update
    const [beforeUpdate] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.drugId, testDrug.id),
          eq(inventory.date, new Date().toISOString().split('T')[0]!)
        )
      )
      .limit(1)

    const stockBefore = beforeUpdate?.closingStock || 0
    console.log(`📊 Stock before update: ${stockBefore}`)

    // Perform stock update
    await updateStock({
      drugId: testDrug.id,
      quantity: testQuantity,
      notes: 'Test inventory update'
    })

    // Get stock after update
    const [afterUpdate] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.drugId, testDrug.id),
          eq(inventory.date, new Date().toISOString().split('T')[0]!)
        )
      )
      .limit(1)

    const stockAfter = afterUpdate?.closingStock || 0
    console.log(`📊 Stock after update: ${stockAfter}`)

    // Test 4: Test usage recording
    const usageQuantity = 10
    console.log(`🔄 Testing usage recording: ${usageQuantity} units`)

    await recordUsage({
      drugId: testDrug.id,
      quantity: usageQuantity,
      notes: 'Test usage recording'
    })

    // Get stock after usage
    const [afterUsage] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.drugId, testDrug.id),
          eq(inventory.date, new Date().toISOString().split('T')[0]!)
        )
      )
      .limit(1)

    const stockAfterUsage = afterUsage?.closingStock || 0
    console.log(`📊 Stock after usage: ${stockAfterUsage}`)

    // Test 5: Verify changes were persisted
    const updateWorked = stockAfter === (stockBefore + testQuantity)
    const usageWorked = stockAfterUsage === (stockAfter - usageQuantity)

    console.log(`✅ Stock update worked: ${updateWorked}`)
    console.log(`✅ Usage recording worked: ${usageWorked}`)

    return NextResponse.json({
      success: true,
      message: 'Inventory database test completed',
      testResults: {
        drugsFound: drugsData.length,
        inventoryRecords: inventoryRecords.length,
        testDrug: testDrug.name,
        stockBefore,
        stockAfter,
        stockAfterUsage,
        updateWorked,
        usageWorked,
        changesCorrect: updateWorked && usageWorked
      },
      recentInventory: inventoryRecords.slice(0, 5),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Inventory test error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Inventory test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}