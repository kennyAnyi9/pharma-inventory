import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({
  path: '/home/kennedy/devmode/final-year-project/pharma-inventory/apps/web/.env.local'
})

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)

async function reset() {
  try {
    console.log('🗑️ Dropping ALL existing tables...')
    
    // Drop all tables that might exist
    const tablesToDrop = [
      'inventory',
      'drugs', 
      'orders',
      'forecasts',
      'alerts',
      'users'
    ]
    
    for (const table of tablesToDrop) {
      try {
        await sql(`DROP TABLE IF EXISTS ${table} CASCADE`)
        console.log(`✅ Dropped table: ${table}`)
      } catch (error) {
        console.log(`⚠️  Table ${table} might not exist or failed to drop`)
      }
    }
    
    console.log('✅ Database reset complete!')
    console.log('Now run: pnpm db:push to create fresh tables')
  } catch (error) {
    console.error('❌ Reset failed:', error)
    process.exit(1)
  }
}

reset()