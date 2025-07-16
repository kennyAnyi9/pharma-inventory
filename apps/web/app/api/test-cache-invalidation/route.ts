import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { updateStock, getInventoryStatus } from '@/features/inventory/actions/inventory-actions'
import { getAllForecasts } from '@/features/forecasts/actions/forecast-actions'
import { getAlertCounts, getAlerts } from '@/features/alerts/actions/alert-actions'

export async function POST(request: Request) {
  try {
    const { action, drugId, quantity } = await request.json()
    
    console.log(`🧪 Testing real-time system for action: ${action}`)
    
    if (action === 'test-realtime-flow') {
      console.log(`📊 Testing complete real-time flow for drug ${drugId} with quantity ${quantity}`)
      
      // 1. Get initial state
      console.log('📋 Getting initial state...')
      const initialInventory = await getInventoryStatus()
      const initialAlerts = await getAlertCounts()
      const initialForecasts = await getAllForecasts()
      
      console.log('Initial state:', {
        inventory: initialInventory.find(item => item.drugId === drugId),
        alerts: initialAlerts,
        forecasts: initialForecasts?.forecasts?.find(f => f.drug_id === drugId)
      })
      
      // 2. Update stock (this should trigger alerts automatically)
      console.log('🔄 Updating stock...')
      const updateResult = await updateStock({
        drugId,
        quantity,
        notes: 'Real-time flow test'
      })
      
      console.log('✅ Stock updated, result:', updateResult)
      
      // 3. Get new state to verify real-time updates
      console.log('📋 Getting updated state...')
      const newInventory = await getInventoryStatus()
      const newAlerts = await getAlertCounts()
      const newForecasts = await getAllForecasts()
      
      const drugInventory = newInventory.find(item => item.drugId === drugId)
      const drugForecast = newForecasts?.forecasts?.find(f => f.drug_id === drugId)
      
      console.log('New state:', {
        inventory: drugInventory,
        alerts: newAlerts,
        forecasts: drugForecast
      })
      
      // 4. Verify real-time updates worked
      const realTimeVerification = {
        stockUpdated: drugInventory?.currentStock !== initialInventory.find(item => item.drugId === drugId)?.currentStock,
        alertsUpdated: newAlerts.total !== initialAlerts.total,
        forecastsUpdated: drugForecast?.current_stock !== initialForecasts?.forecasts?.find(f => f.drug_id === drugId)?.current_stock,
        stockStatus: drugInventory?.stockStatus,
        newCurrentStock: drugInventory?.currentStock,
        alertCount: newAlerts.total
      }
      
      console.log('✅ Real-time verification:', realTimeVerification)
      
      return NextResponse.json({
        success: true,
        message: 'Real-time flow test completed',
        data: {
          updateResult,
          realTimeVerification,
          drugInventory,
          drugForecast,
          alertCounts: newAlerts
        }
      })
    }
    
    if (action === 'get-current-state') {
      console.log(`📋 Getting current state for drug ${drugId}`)
      
      const inventory = await getInventoryStatus()
      const alerts = await getAlertCounts()
      const forecasts = await getAllForecasts()
      
      const drugInventory = inventory.find(item => item.drugId === drugId)
      const drugForecast = forecasts?.forecasts?.find(f => f.drug_id === drugId)
      
      return NextResponse.json({
        success: true,
        message: 'Current state fetched',
        data: {
          inventory: drugInventory,
          alerts,
          forecasts: drugForecast
        }
      })
    }
    
    return NextResponse.json({
      success: false,
      message: 'Invalid action. Use "test-realtime-flow" or "get-current-state"'
    })

  } catch (error) {
    console.error('❌ Real-time test failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Real-time test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Real-time pharmaceutical inventory test endpoint',
    usage: {
      'Test complete real-time flow': 'POST { "action": "test-realtime-flow", "drugId": 1, "quantity": 50 }',
      'Get current state': 'POST { "action": "get-current-state", "drugId": 1 }'
    },
    description: 'Tests the complete real-time flow: stock update → reorder calculations → alert generation → forecast updates → dashboard refresh'
  })
}