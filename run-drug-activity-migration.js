const { drizzle } = require('drizzle-orm/neon-http');
const { neon } = require('@neondatabase/serverless');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql);

async function runMigration() {
  
  console.log('🚀 Creating drug_activity_log table...');
  
  try {
    await sql`
      -- Create drug activity log table for comprehensive tracking
      CREATE TABLE IF NOT EXISTS drug_activity_log (
        id SERIAL PRIMARY KEY,
        drug_id INTEGER NOT NULL,
        drug_name VARCHAR(200) NOT NULL,
        date TIMESTAMP NOT NULL,
        activity_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        
        -- Stock Changes
        previous_stock INTEGER,
        current_stock INTEGER,
        stock_change INTEGER,
        
        -- Reorder Level Changes  
        previous_reorder_level INTEGER,
        new_reorder_level INTEGER,
        reorder_level_change INTEGER,
        
        -- Additional Context
        quantity INTEGER,
        unit VARCHAR(20),
        notes TEXT,
        source VARCHAR(50) NOT NULL,
        user_id VARCHAR(50),
        
        -- ML/System Data
        ml_confidence DECIMAL(5,2),
        calculation_method VARCHAR(100),
        
        -- Status Changes
        previous_status VARCHAR(20),
        new_status VARCHAR(20),
        
        -- Metadata
        metadata JSONB,
        
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );`;
    
    console.log('✅ Table created successfully');
    
    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_drug_activity_drug_date ON drug_activity_log (drug_id, date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_drug_activity_type ON drug_activity_log (activity_type);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_drug_activity_date ON drug_activity_log (date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_drug_activity_drug ON drug_activity_log (drug_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_drug_activity_source ON drug_activity_log (source);`;
    
    console.log('✅ Indexes created successfully');
    console.log('🎉 Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration().catch(console.error);