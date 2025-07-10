import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { suppliers } from './schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)

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
    notes: "Specializes in antibiotics and antimalarials. Good supplier for tropical disease medications."
  }
]

async function seedSuppliers() {
  console.log('🌱 Seeding suppliers...')
  
  try {
    // Clear existing suppliers
    console.log('Clearing existing suppliers...')
    // Note: Uncomment if you want to clear existing data
    // await db.delete(suppliers)
    
    // Insert suppliers
    console.log('Inserting suppliers...')
    for (const supplier of ghanaSuppliers) {
      await db.insert(suppliers).values(supplier)
      console.log(`✓ Added supplier: ${supplier.name}`)
    }
    
    console.log('✅ Suppliers seeded successfully!')
    
  } catch (error) {
    console.error('❌ Error seeding suppliers:', error)
    throw error
  }
}

if (require.main === module) {
  seedSuppliers()
    .then(() => {
      console.log('Seeding completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Seeding failed:', error)
      process.exit(1)
    })
}

export { seedSuppliers }