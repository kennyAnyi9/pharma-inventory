- const { createDatabaseClient, drugs, suppliers, inventory } = require('../../packages/database/src/index.ts');
+ const { createDatabaseClient, drugs, suppliers, inventory } = require('../../packages/database/src/index');
require('dotenv').config({ path: '.env.local' });

// Initialize database client using the shared Drizzle client
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Make sure .env.local exists with DATABASE_URL.');
}

const db = createDatabaseClient(process.env.DATABASE_URL);

// Sample pharmaceutical data for Ghana with all required fields
const sampleDrugs = [
  {
    name: "Paracetamol",
    genericName: "Acetaminophen",
    category: "Analgesics",
    unit: "tablets",
    packSize: 100,
    reorderLevel: 100,
    reorderQuantity: 500,
    unitPrice: "0.50",
    supplier: "Kinapharma Limited",
    requiresPrescription: false,
    storageCondition: "Cool & Dry"
  },
  {
    name: "Amoxicillin",
    genericName: "Amoxicillin",
    category: "Antibiotics",
    unit: "capsules",
    packSize: 50,
    reorderLevel: 75,
    reorderQuantity: 300,
    unitPrice: "1.20",
    supplier: "Danadams Pharmaceutical Industries",
    requiresPrescription: true,
    storageCondition: "Cool & Dry"
  },
  {
    name: "Metformin",
    genericName: "Metformin HCl",
    category: "Antidiabetics",
    unit: "tablets",
    packSize: 100,
    reorderLevel: 150,
    reorderQuantity: 600,
    unitPrice: "0.80",
    supplier: "Phyto-Riker (GIHOC) Pharmaceuticals",
    requiresPrescription: true,
    storageCondition: "Cool & Dry"
  },
  {
    name: "Amlodipine",
    genericName: "Amlodipine Besylate",
    category: "Antihypertensives",
    unit: "tablets",
    packSize: 100,
    reorderLevel: 120,
    reorderQuantity: 400,
    unitPrice: "1.50",
    supplier: "Ernest Chemists Ltd",
    requiresPrescription: true,
    storageCondition: "Cool & Dry"
  },
  {
    name: "Omeprazole",
    genericName: "Omeprazole",
    category: "Proton Pump Inhibitors",
    unit: "capsules",
    packSize: 30,
    reorderLevel: 90,
    reorderQuantity: 250,
    unitPrice: "2.00",
    supplier: "Kinapharma Limited",
    requiresPrescription: true,
    storageCondition: "Cool & Dry"
  },
  {
    name: "Artemether/Lumefantrine",
    genericName: "Artemether/Lumefantrine",
    category: "Antimalarials",
    unit: "tablets",
    packSize: 24,
    reorderLevel: 200,
    reorderQuantity: 800,
    unitPrice: "3.50",
    supplier: "Letap Pharmaceuticals",
    requiresPrescription: true,
    storageCondition: "Cool & Dry"
  },
  {
    name: "ORS Sachets",
    genericName: "Oral Rehydration Salts",
    category: "Electrolyte Solutions",
    unit: "sachets",
    packSize: 10,
    reorderLevel: 300,
    reorderQuantity: 1000,
    unitPrice: "0.25",
    supplier: "Phyto-Riker (GIHOC) Pharmaceuticals",
    requiresPrescription: false,
    storageCondition: "Cool & Dry"
  },
  {
    name: "Ferrous Sulphate",
    genericName: "Ferrous Sulphate",
    category: "Iron Supplements",
    unit: "tablets",
    packSize: 100,
    reorderLevel: 180,
    reorderQuantity: 600,
    unitPrice: "0.30",
    supplier: "Ernest Chemists Ltd",
    requiresPrescription: false,
    storageCondition: "Cool & Dry"
  },
  {
    name: "Diclofenac",
    genericName: "Diclofenac Sodium",
    category: "NSAIDs",
    unit: "tablets",
    packSize: 100,
    reorderLevel: 100,
    reorderQuantity: 400,
    unitPrice: "0.75",
    supplier: "Danadams Pharmaceutical Industries",
    requiresPrescription: true,
    storageCondition: "Cool & Dry"
  },
  {
    name: "Metronidazole",
    genericName: "Metronidazole",
    category: "Antibiotics",
    unit: "tablets",
    packSize: 100,
    reorderLevel: 85,
    reorderQuantity: 350,
    unitPrice: "0.90",
    supplier: "Letap Pharmaceuticals",
    requiresPrescription: true,
    storageCondition: "Cool & Dry"
  }
];

const ghanaSuppliers = [
  {
    name: "Kinapharma Limited",
    contactPerson: "Dr. Samuel Adjei",
    email: "procurement@kinapharma.com",
    phone: "+233-30-276-7890",
    address: "Industrial Area, Tema, Greater Accra Region",
    paymentTerms: "Net 30",
    deliveryDays: 5,
    rating: "4.50",
    status: "active",
    notes: "Leading pharmaceutical distributor in Ghana. Specializes in essential medicines."
  },
  {
    name: "Danadams Pharmaceutical Industries",
    contactPerson: "Mr. Francis Addo",
    email: "orders@danadams.com",
    phone: "+233-32-202-6543",
    address: "Kasoa Road, Central Region",
    paymentTerms: "Net 45",
    deliveryDays: 7,
    rating: "4.20",
    status: "active",
    notes: "Local manufacturer with competitive pricing. Good for bulk orders."
  },
  {
    name: "Ernest Chemists Ltd",
    contactPerson: "Mrs. Grace Mensah",
    email: "wholesale@ernestchemists.com",
    phone: "+233-30-277-2345",
    address: "Ring Road West, Accra",
    paymentTerms: "COD",
    deliveryDays: 3,
    rating: "4.80",
    status: "active",
    notes: "Fastest delivery in Accra. Premium supplier with excellent quality control."
  },
  {
    name: "Phyto-Riker (GIHOC) Pharmaceuticals",
    contactPerson: "Dr. Kwame Asante",
    email: "sales@phytoriker.gov.gh",
    phone: "+233-30-276-4567",
    address: "Dome, Greater Accra Region",
    paymentTerms: "Net 15",
    deliveryDays: 10,
    rating: "4.00",
    status: "active",
    notes: "Government pharmaceutical company. Reliable for essential medicines and vaccines."
  },
  {
    name: "Letap Pharmaceuticals",
    contactPerson: "Mr. Emmanuel Tetteh",
    email: "procurement@letap.com",
    phone: "+233-24-567-8901",
    address: "Spintex Road, Accra",
    paymentTerms: "Net 30",
    deliveryDays: 6,
    rating: "4.30",
    status: "active",
    notes: "Specializes in antibiotics and antimalarials. Good supplier for tropical disease medications."
  }
];

async function seedSuppliers() {
  console.log('🌱 Seeding suppliers...');
  
  for (const supplier of ghanaSuppliers) {
    try {
      const result = await db.insert(suppliers).values({
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        paymentTerms: supplier.paymentTerms,
        deliveryDays: supplier.deliveryDays,
        rating: supplier.rating,
        status: supplier.status,
        notes: supplier.notes
      }).returning();
      
      console.log(`✓ Added supplier: ${supplier.name}`);
    } catch (error) {
      if (error.message.includes('duplicate key')) {
        console.log(`⚠️  Supplier ${supplier.name} already exists - skipping`);
      } else {
        console.error(`❌ Error adding ${supplier.name}:`, error.message);
      }
    }
  }
}

async function seedDrugs() {
  console.log('🌱 Seeding drugs with transaction...');
  
  // Wrap the entire drug seeding operation in a transaction
  await db.transaction(async (tx) => {
    for (const drug of sampleDrugs) {
      try {
        const result = await tx.insert(drugs).values({
          name: drug.name,
          genericName: drug.genericName,
          category: drug.category,
          unit: drug.unit,
          packSize: drug.packSize,
          reorderLevel: drug.reorderLevel,
          reorderQuantity: drug.reorderQuantity,
          unitPrice: drug.unitPrice,
          supplier: drug.supplier,
          requiresPrescription: drug.requiresPrescription,
          storageCondition: drug.storageCondition
        }).returning();
        
        console.log(`✓ Added drug: ${drug.name}`);
      } catch (error) {
        if (error.message.includes('duplicate key')) {
          console.log(`⚠️  Drug ${drug.name} already exists - skipping`);
        } else {
          console.error(`❌ Error adding ${drug.name}:`, error.message);
          throw error; // Re-throw to trigger transaction rollback
        }
      }
    }
  });
}

async function seedInventory() {
  console.log('🌱 Seeding inventory data...');
  
  // Wrap in transaction for atomicity
  await db.transaction(async (tx) => {
    // Get all drugs using Drizzle ORM
    const drugResults = await tx.select().from(drugs);
    
    // Create inventory entries for the last 30 days
    const today = new Date();
    const inventoryData = [];
    
    for (const drug of drugResults) {
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Generate realistic inventory data
        const baseStock = Math.floor(Math.random() * 500) + 100;
        const quantityReceived = i % 7 === 0 ? Math.floor(Math.random() * 200) + 50 : 0; // Delivery every 7 days
        const quantityUsed = Math.floor(Math.random() * 50) + 10;
        const openingStock = i === 29 ? baseStock : baseStock + quantityReceived;
        const closingStock = Math.max(0, openingStock + quantityReceived - quantityUsed);
        
        inventoryData.push({
          drugId: drug.id,
          date: date.toISOString().split('T')[0],
          openingStock,
          quantityReceived,
          quantityUsed,
          closingStock
        });
      }
      console.log(`✓ Generated inventory data for: ${drug.name}`);
    }
    
    // Insert inventory data using Drizzle ORM
    await tx.insert(inventory).values(inventoryData);
    console.log(`✅ Added ${inventoryData.length} inventory records`);
  });
}

async function seedDatabase() {
  console.log('🚀 Starting database seeding...');
  
  try {
    console.log('Database connected. Starting seeding process...');
    
    await seedSuppliers();
    await seedDrugs();
    await seedInventory();
    
    // Verify data was added using Drizzle ORM
    const supplierCount = await db.select().from(suppliers);
    const drugCount = await db.select().from(drugs);
    const inventoryCount = await db.select().from(inventory);
    
    console.log(`\n✅ Database seeded successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Suppliers: ${supplierCount.length}`);
    console.log(`   - Drugs: ${drugCount.length}`);
    console.log(`   - Inventory records: ${inventoryCount.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    throw error;
  }
}

seedDatabase()
  .then(() => {
    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database seeding failed:', error.message);
    process.exit(1);
  });