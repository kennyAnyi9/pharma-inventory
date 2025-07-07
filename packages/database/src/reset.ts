import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables with flexible path strategy
const envPaths = [
  process.env.DB_ENV_PATH,
  resolve(__dirname, '../../..', '.env'),
  resolve(__dirname, '../../..', 'apps', 'web', '.env.local'),
].filter(Boolean) as string[]

for (const envPath of envPaths) {
  dotenv.config({ path: envPath })
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required for database reset')
}

const sql = neon(process.env.DATABASE_URL)
const db = drizzle(sql)

async function reset() {
  try {
    // Production environment check
    const nodeEnv = process.env.NODE_ENV
    if (nodeEnv === 'production') {
      console.error('❌ DANGER: Cannot run database reset in production environment!')
      console.error('Set NODE_ENV to development or staging to proceed.')
      process.exit(1)
    }
    
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
    
    // Use transaction for atomic operations
    await sql('BEGIN')
    
    try {
      for (const table of tablesToDrop) {
        try {
          await sql(`DROP TABLE IF EXISTS ${table} CASCADE`)
          console.log(`✅ Dropped table: ${table}`)
        } catch (error) {
          console.log(`⚠️  Table ${table} might not exist or failed to drop`)
        }
      }
      
      await sql('COMMIT')
      console.log('✅ Database reset complete!')
      console.log('Now run: pnpm db:push to create fresh tables')
    } catch (error) {
      await sql('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('❌ Reset failed:', error)
    process.exit(1)
  }
}

reset()