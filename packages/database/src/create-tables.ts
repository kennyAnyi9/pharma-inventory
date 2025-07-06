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
  throw new Error('DATABASE_URL environment variable is required for table creation')
}

const sql = neon(process.env.DATABASE_URL)
const db = drizzle(sql)

async function createTables() {
  try {
    console.log('🏗️ Creating database tables...')
    
    // Start transaction
    await sql('BEGIN')
    
    try {
      // Create drugs table
      await sql(`
        CREATE TABLE IF NOT EXISTS "drugs" (
          "id" serial PRIMARY KEY NOT NULL,
          "name" varchar(255) NOT NULL,
          "generic_name" varchar(255),
          "category" varchar(100) NOT NULL,
          "unit" varchar(50) NOT NULL,
          "pack_size" integer DEFAULT 1 NOT NULL,
          "reorder_level" integer DEFAULT 100 NOT NULL,
          "reorder_quantity" integer DEFAULT 500 NOT NULL,
          "unit_price" numeric(10, 2) DEFAULT '0' NOT NULL,
          "supplier" varchar(255),
          "requires_prescription" boolean DEFAULT false NOT NULL,
          "storage_condition" varchar(100),
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL,
          CONSTRAINT "drugs_name_unique" UNIQUE("name")
        )
      `)
      console.log('✅ Created drugs table')
      
      // Create inventory table
      await sql(`
        CREATE TABLE IF NOT EXISTS "inventory" (
          "id" serial PRIMARY KEY NOT NULL,
          "drug_id" integer NOT NULL,
          "date" date NOT NULL,
          "opening_stock" integer DEFAULT 0 NOT NULL,
          "quantity_received" integer DEFAULT 0 NOT NULL,
          "quantity_used" integer DEFAULT 0 NOT NULL,
          "quantity_expired" integer DEFAULT 0 NOT NULL,
          "closing_stock" integer DEFAULT 0 NOT NULL,
          "stockout_flag" boolean DEFAULT false NOT NULL,
          "expiry_date" date,
          "batch_number" varchar(100),
          "notes" varchar(500),
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        )
      `)
      console.log('✅ Created inventory table')
      
      // Create foreign key constraint
      await sql(`
        DO $$ BEGIN
          ALTER TABLE "inventory" ADD CONSTRAINT "inventory_drug_id_drugs_id_fk" 
          FOREIGN KEY ("drug_id") REFERENCES "public"."drugs"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$
      `)
      console.log('✅ Created foreign key constraint')
      
      // Create index
      await sql(`CREATE INDEX IF NOT EXISTS "drug_date_idx" ON "inventory" ("drug_id","date")`)
      console.log('✅ Created index')
      
      // Commit transaction
      await sql('COMMIT')
      console.log('🎉 All tables created successfully!')
    } catch (error) {
      // Rollback on error
      await sql('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('❌ Table creation failed:', error)
    process.exit(1)
  }
}

createTables()