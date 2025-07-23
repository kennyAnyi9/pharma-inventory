#!/usr/bin/env tsx

import { createDatabaseClient, drugs, inventory } from './index'
import { desc, eq, max, sql } from 'drizzle-orm'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

/**
 * Load environment variables from multiple possible locations
 */
const envPaths = [
  process.env.DB_ENV_PATH,
  resolve(__dirname, '../../../.env'),
  resolve(__dirname, '../../../apps/web/.env.local'),
].filter(Boolean) as string[]

for (const envPath of envPaths) {
  dotenv.config({ path: envPath })
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required but not found.')
  console.error('Please ensure DATABASE_URL is set in your environment.')
  process.exit(1)
}

async function checkCurrentStockLevels() {
  console.log('🔍 Checking current stock levels...\n')
  
  const db = createDatabaseClient(process.env.DATABASE_URL!)
  
  try {
    // First, get all drugs
    const allDrugs = await db
      .select({
        drugId: drugs.id,
        drugName: drugs.name,
        category: drugs.category,
        unit: drugs.unit,
        reorderLevel: drugs.reorderLevel,
        calculatedReorderLevel: drugs.calculatedReorderLevel,
      })
      .from(drugs)
      .orderBy(drugs.name)

    console.log(`📊 Found ${allDrugs.length} drugs in the system\n`)

    // Get the most recent inventory record for each drug
    const currentStockLevels = []
    
    for (const drug of allDrugs) {
      // Get the most recent inventory record for this drug
      const latestInventory = await db
        .select({
          date: inventory.date,
          openingStock: inventory.openingStock,
          quantityReceived: inventory.quantityReceived,
          quantityUsed: inventory.quantityUsed,
          quantityExpired: inventory.quantityExpired,
          closingStock: inventory.closingStock,
          stockoutFlag: inventory.stockoutFlag,
          createdAt: inventory.createdAt
        })
        .from(inventory)
        .where(eq(inventory.drugId, drug.drugId))
        .orderBy(desc(inventory.date), desc(inventory.createdAt))
        .limit(1)

      // Get total inventory records count for this drug
      const inventoryCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(inventory)
        .where(eq(inventory.drugId, drug.drugId))

      currentStockLevels.push({
        ...drug,
        mostRecentDate: latestInventory[0]?.date || null,
        closingStock: latestInventory[0]?.closingStock || null,
        openingStock: latestInventory[0]?.openingStock || null,
        quantityReceived: latestInventory[0]?.quantityReceived || null,
        quantityUsed: latestInventory[0]?.quantityUsed || null,
        stockoutFlag: latestInventory[0]?.stockoutFlag || null,
        inventoryRecordsCount: inventoryCount[0]?.count || 0
      })
    }

    // Categorize results
    const drugsWithStock = currentStockLevels.filter(drug => (drug.closingStock || 0) > 0)
    const drugsWithZeroStock = currentStockLevels.filter(drug => (drug.closingStock || 0) === 0)
    const drugsWithoutInventory = currentStockLevels.filter(drug => drug.inventoryRecordsCount === 0)
    const drugsWithInventory = currentStockLevels.filter(drug => drug.inventoryRecordsCount > 0)

    console.log('📈 SUMMARY:')
    console.log(`- Drugs with positive stock: ${drugsWithStock.length}`)
    console.log(`- Drugs with zero stock: ${drugsWithZeroStock.length}`)
    console.log(`- Drugs without any inventory records: ${drugsWithoutInventory.length}`)
    console.log(`- Drugs with inventory records: ${drugsWithInventory.length}\n`)

    if (drugsWithoutInventory.length > 0) {
      console.log('⚠️  DRUGS WITHOUT ANY INVENTORY RECORDS:')
      console.log('━'.repeat(80))
      drugsWithoutInventory.forEach(drug => {
        console.log(`• ${drug.drugName} (ID: ${drug.drugId}) - Category: ${drug.category}`)
      })
      console.log()
    }

    if (drugsWithStock.length > 0) {
      console.log('✅ DRUGS WITH POSITIVE STOCK:')
      console.log('━'.repeat(120))
      console.log('Drug Name'.padEnd(30) + 'Stock'.padEnd(10) + 'Unit'.padEnd(10) + 'Reorder'.padEnd(10) + 'ML Reorder'.padEnd(12) + 'Last Date'.padEnd(12) + 'Category')
      console.log('─'.repeat(120))
      drugsWithStock.forEach(drug => {
        const stock = (drug.closingStock || 0).toString()
        const reorder = (drug.reorderLevel || 0).toString()
        const mlReorder = (drug.calculatedReorderLevel || 'N/A').toString()
        const stockStatus = (drug.closingStock || 0) <= (drug.reorderLevel || 0) ? '🔴' : '🟢'
        
        console.log(
          `${stockStatus} ${drug.drugName}`.padEnd(30) +
          stock.padEnd(10) +
          (drug.unit || '').padEnd(10) +
          reorder.padEnd(10) +
          mlReorder.padEnd(12) +
          (drug.mostRecentDate || 'N/A').padEnd(12) +
          (drug.category || '')
        )
      })
      console.log()
    }

    if (drugsWithZeroStock.length > 0) {
      console.log('❌ DRUGS WITH ZERO STOCK (but have inventory records):')
      console.log('━'.repeat(120))
      console.log('Drug Name'.padEnd(30) + 'Stock'.padEnd(10) + 'Opening'.padEnd(10) + 'Received'.padEnd(10) + 'Used'.padEnd(10) + 'Last Date'.padEnd(12) + 'Records')
      console.log('─'.repeat(120))
      drugsWithZeroStock
        .filter(drug => drug.inventoryRecordsCount > 0)
        .forEach(drug => {
          console.log(
            drug.drugName.padEnd(30) +
            '0'.padEnd(10) +
            (drug.openingStock || 0).toString().padEnd(10) +
            (drug.quantityReceived || 0).toString().padEnd(10) +
            (drug.quantityUsed || 0).toString().padEnd(10) +
            (drug.mostRecentDate || 'N/A').padEnd(12) +
            (drug.inventoryRecordsCount || 0).toString()
          )
        })
      console.log()
    }

    // Additional analysis
    console.log('🔍 DETAILED ANALYSIS:')
    console.log('━'.repeat(50))
    
    // Check for potential data issues
    const drugsWithNegativeStock = currentStockLevels.filter(drug => (drug.closingStock || 0) < 0)
    if (drugsWithNegativeStock.length > 0) {
      console.log(`⚠️  Found ${drugsWithNegativeStock.length} drugs with negative stock!`)
    }

    // Show recent inventory activity
    const recentInventoryActivity = await db
      .select({
        drugName: drugs.name,
        date: inventory.date,
        openingStock: inventory.openingStock,
        quantityReceived: inventory.quantityReceived,
        quantityUsed: inventory.quantityUsed,
        closingStock: inventory.closingStock,
        createdAt: inventory.createdAt
      })
      .from(inventory)
      .innerJoin(drugs, eq(drugs.id, inventory.drugId))
      .orderBy(desc(inventory.date), desc(inventory.createdAt))
      .limit(10)

    console.log('\n📅 LAST 10 INVENTORY TRANSACTIONS:')
    console.log('━'.repeat(100))
    console.log('Drug Name'.padEnd(25) + 'Date'.padEnd(12) + 'Opening'.padEnd(10) + 'Received'.padEnd(10) + 'Used'.padEnd(10) + 'Closing'.padEnd(10))
    console.log('─'.repeat(100))
    recentInventoryActivity.forEach(record => {
      console.log(
        record.drugName.padEnd(25) +
        record.date.padEnd(12) +
        record.openingStock.toString().padEnd(10) +
        record.quantityReceived.toString().padEnd(10) +
        record.quantityUsed.toString().padEnd(10) +
        record.closingStock.toString().padEnd(10)
      )
    })

    console.log('\n✅ Stock level check completed!')
    
  } catch (error) {
    console.error('❌ Error checking stock levels:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  checkCurrentStockLevels()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
}

export { checkCurrentStockLevels }