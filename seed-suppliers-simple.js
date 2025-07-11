const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: './apps/web/.env.local' });

const sql = neon(process.env.DATABASE_URL);

const ghanaSuppliers = [
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
  
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    // Insert suppliers
    console.log('Inserting suppliers...');
    for (const supplier of ghanaSuppliers) {
      try {
        await sql`
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
          ON CONFLICT (name) DO NOTHING
        `;
        console.log(`✓ Added supplier: ${supplier.name}`);
      } catch (error) {
        console.log(`⚠️  Supplier ${supplier.name} may already exist - skipping`);
      }
    }
    
    console.log('✅ Suppliers seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding suppliers:', error);
    throw error;
  }
}

seedSuppliers()
  .then(() => {
    console.log('Seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });