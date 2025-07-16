import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { updateStock } from '@/features/inventory/actions/inventory-actions'
import { getAllForecasts } from '@/features/forecasts/actions/forecast-actions'

export async function POST(request: Request) {
  try {
    const { action, drugId, quantity } = await request.json()
    
    console.log(`🧪 Testing cache invalidation for action: ${action}`)
    
    if (action === 'update-stock') {
      console.log(`📊 Updating stock for drug ${drugId} with quantity ${quantity}`)
      
      // 1. Update stock
      const result = await updateStock({
        drugId,
        quantity,
        notes: 'Cache invalidation test'
      })
      
      console.log('✅ Stock updated, result:', result)
      
      // 2. Manually invalidate all related caches
      console.log('🔄 Invalidating caches...')
      
      revalidatePath('/dashboard')
      revalidatePath('/dashboard/inventory')
      revalidatePath('/dashboard/forecasts')
      revalidatePath('/dashboard/alerts')
      
      // Also try to invalidate the forecast cache tag
      revalidateTag('all-forecasts')
      
      console.log('✅ Cache invalidation complete')
      
      return NextResponse.json({
        success: true,
        message: 'Stock updated and caches invalidated',
        data: result
      })
    }
    
    if (action === 'get-forecasts') {
      console.log('🔮 Fetching forecasts...')
      
      const forecasts = await getAllForecasts()
      
      return NextResponse.json({
        success: true,
        message: 'Forecasts fetched',
        data: forecasts
      })
    }
    
    return NextResponse.json({
      success: false,
      message: 'Invalid action. Use "update-stock" or "get-forecasts"'
    })

  } catch (error) {
    console.error('❌ Cache invalidation test failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Cache invalidation test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Cache invalidation test endpoint',
    usage: {
      'Update stock': 'POST { "action": "update-stock", "drugId": 1, "quantity": 50 }',
      'Get forecasts': 'POST { "action": "get-forecasts" }'
    }
  })
}