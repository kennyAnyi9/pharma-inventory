import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

const sql = neon(DATABASE_URL)

async function runMigration() {
  try {
    console.log('🚀 Running intelligent reorder fields migration...')
    
    const migrationSQL = readFileSync(
      resolve('./packages/database/migrations/add-intelligent-reorder-fields.sql'),
      'utf-8'
    )
    
    await sql(migrationSQL)
    console.log('✅ Migration completed successfully!')
    
    // Verify the new columns exist
    const result = await sql(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'reorder_calculations' 
      AND column_name IN (
        'reorder_date',
        'days_until_reorder', 
        'stock_sufficiency_days',
        'reorder_recommendation',
        'intelligent_reorder_level',
        'prevent_overstocking_note'
      )
      ORDER BY column_name
    `)
    
    console.log('📋 New columns added:')
    result.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()