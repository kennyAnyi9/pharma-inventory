const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

// Sample pharmaceutical data for Ghana
const sampleDrugs = [
  {
    name: "Paracetamol",
    genericName: "Acetaminophen",
    strength: "500mg",
    form: "Tablet",
    unit: "tablets",
    category: "Analgesics",
    description: "Pain reliever and fever reducer",
    reorderLevel: 100,
    supplier: "Kinapharma Limited",
    requiresPrescription: false,
    storageCondition: "Cool & Dry"
  },
  {
    name: "Amoxicillin",
    genericName: "Amoxicillin",
    strength: "250mg",
    form: "Capsule",
    unit: "capsules",
    category: "Antibiotics",
    description: "Broad-spectrum antibiotic",
    reorderLevel: 75,
    supplier: "Danadams Pharmaceutical Industries",
    requiresPrescription: true,
    storageCondition: "Cool & Dry"
  },
  {
    name: "Chloroquine",
    genericName: "Chloroquine Phosphate",
    strength: "250mg",
    form: "Tablet",
    unit: "tablets",
    category: "Antimalarials",
    description: "Antimalarial medication",
    reorderLevel: 200,
    supplier: "Letap Pharmaceuticals",
    requiresPrescription: true,
    storageCondition: "Cool & Dry"
  },
  {
    name: "Ibuprofen",
    genericName: "Ibuprofen",
    strength: "400mg",
    form: "Tablet",
    unit: "tablets",
    category: "NSAIDs",
    description: "Anti-inflammatory pain reliever",
    reorderLevel: 80,
    supplier: "Ernest Chemists Ltd",
    requiresPrescription: false,
    storageCondition: "Cool & Dry"
  },
  {
    name: "Metformin",
    genericName: "Metformin HCl",
    strength: "500mg",
    form: "Tablet",
    unit: "tablets",
    category: "Antidiabetics",
    description: "Type 2 diabetes medication",
    reorderLevel: 150,
    supplier: "Phyto-Riker (GIHOC) Pharmaceuticals",
    requiresPrescription: true,
    storageCondition: "Cool & Dry"
  },
  {
    name: "Aspirin",
    genericName: "Acetylsalicylic Acid",
    strength: "75mg",
    form: "Tablet",
    unit: "tablets",
    category: "Antiplatelet",
    description: "Blood thinner and pain reliever",
    reorderLevel: 120,
    supplier: "Kinapharma Limited",
    requiresPrescription: false,
    storageCondition: "Cool & Dry"
  },
  {
    name: "Ciprofloxacin",
    genericName: "Ciprofloxacin",
    strength: "500mg",
    form: "Tablet",
    unit: "tablets",
    category: "Antibiotics",
    description: "Fluoroquinolone antibiotic",
    reorderLevel: 60,
    supplier: "Danadams Pharmaceutical Industries",
    requiresPrescription: true,
    storageCondition: "Cool & Dry"
  },
  {
    name: "Vitamin C",
    genericName: "Ascorbic Acid",
    strength: "1000mg",
    form: "Tablet",
    unit: "tablets",
    category: "Vitamins",
    description: "Vitamin supplement",
    reorderLevel: 200,
    supplier: "Ernest Chemists Ltd",
    requiresPrescription: false,
    storageCondition: "Cool & Dry"
  }
];

const suppliers = [
  {
    name: "Kinapharma Limited",
    contact_person: "Dr. Samuel Adjei",
    email: "procurement@kinapharma.com",
    phone: "+233-30-276-7890",
    address: "Industrial Area, Tema, Greater Accra Region",
    payment_terms: "Net 30",
    delivery_days: 5,
    rating: "4.50",
    status: "active",
    notes: "Leading pharmaceutical distributor in Ghana. Specializes in essential medicines."
  },
  {
    name: "Danadams Pharmaceutical Industries",
    contact_person: "Mr. Francis Addo",
    email: "orders@danadams.com",
    phone: "+233-32-202-6543",
    address: "Kasoa Road, Central Region",
    payment_terms: "Net 45",
    delivery_days: 7,
    rating: "4.20",
    status: "active",
    notes: "Local manufacturer with competitive pricing. Good for bulk orders."
  },
  {
    name: "Ernest Chemists Ltd",
    contact_person: "Mrs. Grace Mensah",
    email: "wholesale@ernestchemists.com",
    phone: "+233-30-277-2345",
    address: "Ring Road West, Accra",
    payment_terms: "COD",
    delivery_days: 3,
    rating: "4.80",
    status: "active",
    notes: "Fastest delivery in Accra. Premium supplier with excellent quality control."
  },
  {
    name: "Phyto-Riker (GIHOC) Pharmaceuticals",
    contact_person: "Dr. Kwame Asante",
    email: "sales@phytoriker.gov.gh",
    phone: "+233-30-276-4567",
    address: "Dome, Greater Accra Region",
    payment_terms: "Net 15",
    delivery_days: 10,
    rating: "4.00",
    status: "active",
    notes: "Government pharmaceutical company. Reliable for essential medicines and vaccines."
  },
  {
    name: "Letap Pharmaceuticals",
    contact_person: "Mr. Emmanuel Tetteh",
    email: "procurement@letap.com",
    phone: "+233-24-567-8901",
    address: "Spintex Road, Accra",
    payment_terms: "Net 30",
    delivery_days: 6,
    rating: "4.30",
    status: "active",
    notes: "Specializes in antibiotics and antimalarials. Good supplier for tropical disease medications."
  }
];

async function seedSuppliers() {
  console.log('🌱 Seeding suppliers...');
  
  for (const supplier of suppliers) {
    try {
      const result = await sql`
        INSERT INTO suppliers (
          name, contact_person, email, phone, address, 
          payment_terms, delivery_days, rating, status, notes,
          created_at, updated_at
        ) VALUES (
          ${supplier.name}, ${supplier.contact_person}, ${supplier.email}, 
          ${supplier.phone}, ${supplier.address}, ${supplier.payment_terms}, 
          ${supplier.delivery_days}, ${supplier.rating}, ${supplier.status}, 
          ${supplier.notes}, NOW(), NOW()
        )
        ON CONFLICT (name) DO UPDATE SET
          contact_person = EXCLUDED.contact_person,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          address = EXCLUDED.address,
          payment_terms = EXCLUDED.payment_terms,
          delivery_days = EXCLUDED.delivery_days,
          rating = EXCLUDED.rating,
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING id, name
      `;
      console.log(`✓ Added/Updated supplier: ${supplier.name}`);
    } catch (error) {
      console.error(`❌ Error adding ${supplier.name}:`, error.message);
    }
  }
}

async function seedDrugs() {
  console.log('🌱 Seeding drugs...');
  
  for (const drug of sampleDrugs) {
    try {
      const result = await sql`
        INSERT INTO drugs (
          name, generic_name, strength, form, unit, category, description,
          reorder_level, supplier, requires_prescription, storage_condition,
          created_at, updated_at
        ) VALUES (
          ${drug.name}, ${drug.genericName}, ${drug.strength}, ${drug.form}, 
          ${drug.unit}, ${drug.category}, ${drug.description}, ${drug.reorderLevel},
          ${drug.supplier}, ${drug.requiresPrescription}, ${drug.storageCondition},
          NOW(), NOW()
        )
        ON CONFLICT (name, strength, form) DO UPDATE SET
          generic_name = EXCLUDED.generic_name,
          unit = EXCLUDED.unit,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          reorder_level = EXCLUDED.reorder_level,
          supplier = EXCLUDED.supplier,
          requires_prescription = EXCLUDED.requires_prescription,
          storage_condition = EXCLUDED.storage_condition,
          updated_at = NOW()
        RETURNING id, name
      `;
      console.log(`✓ Added/Updated drug: ${drug.name} ${drug.strength}`);
    } catch (error) {
      console.error(`❌ Error adding ${drug.name}:`, error.message);
    }
  }
}

async function seedInventory() {
  console.log('🌱 Seeding inventory data...');
  
  // Get all drugs
  const drugs = await sql`SELECT id, name, unit FROM drugs`;
  
  // Create inventory entries for the last 30 days
  const today = new Date();
  
  for (const drug of drugs) {
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Generate realistic inventory data
      const baseStock = Math.floor(Math.random() * 500) + 100;
      const received = i % 7 === 0 ? Math.floor(Math.random() * 200) + 50 : 0; // Delivery every 7 days
      const dispensed = Math.floor(Math.random() * 50) + 10;
      const openingStock = i === 29 ? baseStock : baseStock + received;
      const closingStock = Math.max(0, openingStock + received - dispensed);
      
      try {
        await sql`
          INSERT INTO inventory (
            drug_id, date, opening_stock, received, dispensed, closing_stock,
            created_at, updated_at
          ) VALUES (
            ${drug.id}, ${date.toISOString().split('T')[0]}, ${openingStock},
            ${received}, ${dispensed}, ${closingStock}, NOW(), NOW()
          )
          ON CONFLICT (drug_id, date) DO UPDATE SET
            opening_stock = EXCLUDED.opening_stock,
            received = EXCLUDED.received,
            dispensed = EXCLUDED.dispensed,
            closing_stock = EXCLUDED.closing_stock,
            updated_at = NOW()
        `;
      } catch (error) {
        console.error(`❌ Error adding inventory for ${drug.name} on ${date.toISOString().split('T')[0]}:`, error.message);
      }
    }
    console.log(`✓ Added inventory data for: ${drug.name}`);
  }
}

async function seedDatabase() {
  console.log('🚀 Starting database seeding...');
  
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set. Make sure .env.local exists with DATABASE_URL.');
    }
    
    console.log('Database connected. Starting seeding process...');
    
    await seedSuppliers();
    await seedDrugs();
    await seedInventory();
    
    // Verify data was added
    const supplierCount = await sql`SELECT COUNT(*) as count FROM suppliers`;
    const drugCount = await sql`SELECT COUNT(*) as count FROM drugs`;
    const inventoryCount = await sql`SELECT COUNT(*) as count FROM inventory`;
    
    console.log(`\n✅ Database seeded successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Suppliers: ${supplierCount[0].count}`);
    console.log(`   - Drugs: ${drugCount[0].count}`);
    console.log(`   - Inventory records: ${inventoryCount[0].count}`);
    
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