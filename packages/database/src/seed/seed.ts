import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import bcrypt from 'bcryptjs'
import { drugs, inventory, reorderCalculations, users } from '../schema'

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
  throw new Error('DATABASE_URL environment variable is required for seeding')
}

const sql = neon(process.env.DATABASE_URL)
const db = drizzle(sql)

// Ghana Essential Medicines - 10 drugs
const ghanaDrugs = [
  {
    name: 'Paracetamol 500mg',
    genericName: 'Acetaminophen',
    category: 'Analgesic',
    unit: 'tablets',
    packSize: 100,
    reorderLevel: 500,
    reorderQuantity: 2000,
    unitPrice: '0.05',
    supplier: 'Danadams Pharmaceutical',
    requiresPrescription: false,
    storageCondition: 'Cool & Dry',
  },
  {
    name: 'Amoxicillin 250mg',
    genericName: 'Amoxicillin',
    category: 'Antibiotic',
    unit: 'capsules',
    packSize: 30,
    reorderLevel: 300,
    reorderQuantity: 1000,
    unitPrice: '0.20',
    supplier: 'Kinapharma Limited',
    requiresPrescription: true,
    storageCondition: 'Cool & Dry',
  },
  {
    name: 'Metformin 500mg',
    genericName: 'Metformin HCl',
    category: 'Antidiabetic',
    unit: 'tablets',
    packSize: 60,
    reorderLevel: 200,
    reorderQuantity: 800,
    unitPrice: '0.15',
    supplier: 'Ernest Chemists',
    requiresPrescription: true,
    storageCondition: 'Cool & Dry',
  },
  {
    name: 'Amlodipine 5mg',
    genericName: 'Amlodipine Besylate',
    category: 'Antihypertensive',
    unit: 'tablets',
    packSize: 30,
    reorderLevel: 150,
    reorderQuantity: 600,
    unitPrice: '0.25',
    supplier: 'Pharmanova Limited',
    requiresPrescription: true,
    storageCondition: 'Cool & Dry',
  },
  {
    name: 'Omeprazole 20mg',
    genericName: 'Omeprazole',
    category: 'Proton Pump Inhibitor',
    unit: 'capsules',
    packSize: 30,
    reorderLevel: 200,
    reorderQuantity: 800,
    unitPrice: '0.30',
    supplier: 'LaGray Chemical Company',
    requiresPrescription: true,
    storageCondition: 'Cool & Dry',
  },
  {
    name: 'Artemether/Lumefantrine 20/120mg',
    genericName: 'Artemether/Lumefantrine',
    category: 'Antimalarial',
    unit: 'tablets',
    packSize: 24,
    reorderLevel: 400,
    reorderQuantity: 1500,
    unitPrice: '2.50',
    supplier: 'Danadams Pharmaceutical',
    requiresPrescription: true,
    storageCondition: 'Cool & Dry',
  },
  {
    name: 'ORS Sachets',
    genericName: 'Oral Rehydration Salts',
    category: 'Rehydration',
    unit: 'sachets',
    packSize: 100,
    reorderLevel: 500,
    reorderQuantity: 2000,
    unitPrice: '0.10',
    supplier: 'UNICEF Supply',
    requiresPrescription: false,
    storageCondition: 'Cool & Dry',
  },
  {
    name: 'Ferrous Sulphate 200mg',
    genericName: 'Ferrous Sulphate',
    category: 'Antianemic',
    unit: 'tablets',
    packSize: 100,
    reorderLevel: 300,
    reorderQuantity: 1200,
    unitPrice: '0.08',
    supplier: 'Kinapharma Limited',
    requiresPrescription: false,
    storageCondition: 'Cool & Dry',
  },
  {
    name: 'Diclofenac 50mg',
    genericName: 'Diclofenac Sodium',
    category: 'NSAID',
    unit: 'tablets',
    packSize: 30,
    reorderLevel: 250,
    reorderQuantity: 1000,
    unitPrice: '0.15',
    supplier: 'Ernest Chemists',
    requiresPrescription: true,
    storageCondition: 'Cool & Dry',
  },
  {
    name: 'Metronidazole 400mg',
    genericName: 'Metronidazole',
    category: 'Antibiotic',
    unit: 'tablets',
    packSize: 30,
    reorderLevel: 300,
    reorderQuantity: 1200,
    unitPrice: '0.12',
    supplier: 'Pharmanova Limited',
    requiresPrescription: true,
    storageCondition: 'Cool & Dry',
  },
]

async function seed() {
  try {
    console.log('🌱 Starting seed...')
    
    // First, run the migration to add intelligent reorder fields
    console.log('🚀 Running intelligent reorder fields migration...')
    try {
      await sql(`
        ALTER TABLE reorder_calculations 
        ADD COLUMN IF NOT EXISTS reorder_date DATE,
        ADD COLUMN IF NOT EXISTS days_until_reorder INTEGER,
        ADD COLUMN IF NOT EXISTS stock_sufficiency_days INTEGER,
        ADD COLUMN IF NOT EXISTS reorder_recommendation VARCHAR(20),
        ADD COLUMN IF NOT EXISTS intelligent_reorder_level INTEGER,
        ADD COLUMN IF NOT EXISTS prevent_overstocking_note VARCHAR(500)
      `)
      console.log('✅ Migration completed successfully!')
    } catch (migrationError) {
      console.log('ℹ️ Migration columns may already exist, continuing...')
    }
    
    // Start transaction
    await sql('BEGIN')
    
    try {
      // Clear existing data in correct order (foreign key constraints)
      await db.delete(reorderCalculations)  // Delete child records first
      await db.delete(inventory)
      await db.delete(drugs)
      await db.delete(users)
      
      // Insert drugs
      console.log('💊 Inserting drugs...')
      const insertedDrugs = await db.insert(drugs).values(ghanaDrugs).returning()
      console.log(`✅ Inserted ${insertedDrugs.length} drugs`)
      
      // Create initial inventory records (current stock levels)
      console.log('📦 Creating initial inventory...')
      const today = new Date().toISOString().split('T')[0]!
      
      const inventoryRecords = insertedDrugs.map(drug => ({
        drugId: drug.id,
        date: today,
        openingStock: drug.reorderLevel * 2, // Start with double the reorder level
        quantityReceived: 0,
        quantityUsed: 0,
        quantityExpired: 0,
        closingStock: drug.reorderLevel * 2,
        stockoutFlag: false,
      }))
      
      await db.insert(inventory).values(inventoryRecords)
      console.log(`✅ Created inventory records for ${inventoryRecords.length} drugs`)
      
      // Create admin user
      console.log('👤 Creating admin user...')
      const hashedPassword = await bcrypt.hash('12345', 12)
      await db.insert(users).values({
        email: 'kennyanyi9@gmail.com',
        password: hashedPassword,
        name: 'Kenny Anyi',
        role: 'admin',
      })
      console.log('✅ Admin user created successfully')
      
      // Commit transaction
      await sql('COMMIT')
      console.log('🎉 Seed completed successfully!')
      console.log('📧 Admin Email: kennyanyi9@gmail.com')
      console.log('🔑 Admin Password: 12345')
    } catch (error) {
      // Rollback on error
      await sql('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

seed()