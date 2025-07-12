import { db } from "@/lib/db";
import { suppliers } from "@workspace/database/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

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
    status: "active" as const,
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
    status: "active" as const,
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
    status: "active" as const,
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
    status: "active" as const,
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
    status: "active" as const,
    notes: "Specializes in antibiotics and antimalarials. Good supplier for tropical disease medications."
  }
];

export async function GET() {
  try {
    console.log('🌱 Seeding suppliers...');
    
    const results = [];
    
    for (const supplier of ghanaSuppliers) {
      try {
        // Check if supplier already exists
        const existing = await db
          .select()
          .from(suppliers)
          .where(eq(suppliers.name, supplier.name))
          .limit(1);
        
        if (existing.length > 0) {
          results.push({ supplier: supplier.name, status: 'already exists' });
          continue;
        }
        
        // Insert supplier
        const [newSupplier] = await db
          .insert(suppliers)
          .values(supplier)
          .returning();
        
        results.push({ 
          supplier: supplier.name, 
          status: 'created', 
          id: newSupplier?.id || 0
        });
        
      } catch (error) {
        console.error(`Error adding ${supplier.name}:`, error);
        results.push({ 
          supplier: supplier.name, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    // Get final count
    const totalSuppliers = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(suppliers)
      .where(eq(suppliers.status, 'active'));
    
    return NextResponse.json({
      success: true,
      message: 'Suppliers seeded successfully!',
      results,
      totalActiveSuppliers: totalSuppliers[0]?.count || 0
    });
    
  } catch (error) {
    console.error('Error seeding suppliers:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

