#!/usr/bin/env tsx

import { createDatabaseClient, drugs, inventory } from './index'
import { desc, eq } from 'drizzle-orm'
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
  process.exit(1)
}

async function quickStockCheck() {
  const db = createDatabaseClient(process.env.DATABASE_URL!)
  
  try {
    // Get all drugs with their current stock
    const allDrugs = await db
      .select({
        id: drugs.id,
        name: drugs.name,
        category: drugs.category,
        unit: drugs.unit,
        reorderLevel: drugs.reorderLevel,
      })
      .from(drugs)
      .orderBy(drugs.name)

    console.log('Drug ID | Drug Name                     | Current Stock | Unit      | Status')
    console.log('--------|------------------------------|---------------|-----------|--------')
    
    for (const drug of allDrugs) {
      // Get the most recent inventory record
      const latestInventory = await db
        .select({ closingStock: inventory.closingStock })
        .from(inventory)
        .where(eq(inventory.drugId, drug.id))
        .orderBy(desc(inventory.date), desc(inventory.createdAt))
        .limit(1)

      const currentStock = latestInventory[0]?.closingStock ?? 0
      const status = currentStock <= drug.reorderLevel ? '🔴 LOW' : '🟢 OK'
      
      console.log(
        `${drug.id.toString().padStart(7)} | ${drug.name.padEnd(28)} | ${currentStock.toString().padStart(13)} | ${(drug.unit || '').padEnd(9)} | ${status}`
      )
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  quickStockCheck()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
}

export { quickStockCheck }