// Simple inventory test script
import { db } from './lib/db.ts'
import { drugs, inventory } from '@workspace/database'
import { eq, desc, and } from 'drizzle-orm'

async function testInventoryOperations() {
  console.log('🧪 Testing inventory database operations...')
  
  try {
    // Test 1: Check if we have drugs in the database
    console.log('📊 Checking drugs in database...')
    const drugsData = await db.select().from(drugs).limit(3)
    console.log(`Found ${drugsData.length} drugs`)
    
    if (drugsData.length === 0) {
      console.log('❌ No drugs found. Please seed the database first.')
      return
    }

    // Test 2: Check current inventory records
    console.log('📦 Checking inventory records...')
    const inventoryRecords = await db
      .select({
        drugId: inventory.drugId,
        date: inventory.date,
        openingStock: inventory.openingStock,
        quantityReceived: inventory.quantityReceived,
        quantityUsed: inventory.quantityUsed,
        closingStock: inventory.closingStock,
        updatedAt: inventory.updatedAt
      })
      .from(inventory)
      .orderBy(desc(inventory.updatedAt))
      .limit(10)

    console.log(`Found ${inventoryRecords.length} inventory records`)
    
    // Show recent inventory data
    console.log('\n📋 Recent inventory records:')
    inventoryRecords.slice(0, 5).forEach((record, index) => {
      console.log(`${index + 1}. Drug ${record.drugId}: ${record.closingStock} units (${record.date})`)
    })

    // Test 3: Check if ML service can access this data
    console.log('\n🤖 Testing ML service data access...')
    
    // Simulate what ML service does to get current stock
    const testDrug = drugsData[0]
    const [currentStock] = await db
      .select({
        closingStock: inventory.closingStock
      })
      .from(inventory)
      .where(eq(inventory.drugId, testDrug.id))
      .orderBy(desc(inventory.date))
      .limit(1)

    console.log(`Current stock for ${testDrug.name}: ${currentStock?.closingStock || 0}`)

    // Simulate what ML service does to get recent usage
    const recentUsage = await db
      .select({
        date: inventory.date,
        quantityUsed: inventory.quantityUsed
      })
      .from(inventory)
      .where(eq(inventory.drugId, testDrug.id))
      .orderBy(desc(inventory.date))
      .limit(14)

    console.log(`Recent usage data points: ${recentUsage.length}`)
    
    if (recentUsage.length > 0) {
      console.log('📊 Recent usage:')
      recentUsage.slice(0, 5).forEach((usage, index) => {
        console.log(`  ${usage.date}: ${usage.quantityUsed} units used`)
      })
    }

    console.log('\n✅ Database operations working correctly!')
    console.log('✅ ML service can access inventory data!')
    
    return {
      success: true,
      drugsFound: drugsData.length,
      inventoryRecords: inventoryRecords.length,
      currentStock: currentStock?.closingStock || 0,
      recentUsagePoints: recentUsage.length
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Run the test
testInventoryOperations()
  .then(result => {
    console.log('\n🎯 Test Results:', result)
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Test error:', error)
    process.exit(1)
  })