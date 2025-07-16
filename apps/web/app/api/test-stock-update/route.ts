import { NextResponse } from 'next/server'
import { updateStock } from '@/features/inventory/actions/inventory-actions'
import { db } from '@/lib/db'
import { inventory } from '@workspace/database'
import { eq, desc } from 'drizzle-orm'

export async function POST(request: Request) {
  try {
    const { drugId, quantity } = await request.json()
    
    console.log(`🧪 Testing stock update for drug ${drugId} with quantity ${quantity}`)
    
    // Get current stock before update
    const [beforeUpdate] = await db
      .select({
        closingStock: inventory.closingStock,
        date: inventory.date
      })
      .from(inventory)
      .where(eq(inventory.drugId, drugId))
      .orderBy(desc(inventory.date))
      .limit(1)
    
    const stockBefore = beforeUpdate?.closingStock || 0
    console.log(`📊 Stock before: ${stockBefore}`)
    
    // Try to update stock
    const result = await updateStock({
      drugId,
      quantity,
      notes: 'Test update from API'
    })
    
    console.log(`📋 Update result:`, result)
    
    // Get stock after update
    const [afterUpdate] = await db
      .select({
        closingStock: inventory.closingStock,
        date: inventory.date,
        updatedAt: inventory.updatedAt
      })
      .from(inventory)
      .where(eq(inventory.drugId, drugId))
      .orderBy(desc(inventory.date))
      .limit(1)
    
    const stockAfter = afterUpdate?.closingStock || 0
    console.log(`📊 Stock after: ${stockAfter}`)
    
    const updateWorked = stockAfter === (stockBefore + quantity)
    console.log(`✅ Update worked: ${updateWorked}`)
    
    return NextResponse.json({
      success: true,
      message: 'Stock update test completed',
      data: {
        drugId,
        quantity,
        stockBefore,
        stockAfter,
        updateWorked,
        expectedStock: stockBefore + quantity,
        actualStock: stockAfter,
        serverActionResult: result
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Stock update test failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Stock update test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST method to test stock updates',
    example: {
      method: 'POST',
      body: { drugId: 1, quantity: 10 }
    }
  })
}