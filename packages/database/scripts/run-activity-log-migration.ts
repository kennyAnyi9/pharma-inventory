import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { join } from 'path'

async function runMigration() {
  try {
    console.log('🔧 Running drug_activity_log migration...')
    
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set')
    }

    const sql = neon(databaseUrl)
    
    // Read the migration file
    const migrationPath = join(__dirname, '../migrations/add-drug-activity-log.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration SQL loaded')
    console.log('🚀 Executing migration...')
    
    // Execute the migration
    await sql(migrationSQL)
    
    console.log('✅ Migration completed successfully!')
    console.log('📊 drug_activity_log table created with indexes')
    
    // Test the table exists
    const result = await sql`SELECT COUNT(*) FROM drug_activity_log`
    console.log(`🔍 Table verification: drug_activity_log exists with ${result[0].count} records`)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()