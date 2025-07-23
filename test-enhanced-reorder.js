// Test the enhanced reorder calculation system
import { neon } from '@neondatabase/serverless'
import dotenv from 'dotenv'

dotenv.config({ path: './apps/web/.env.local' })

const sql = neon(process.env.DATABASE_URL)

async function demonstrateEnhancedReorder() {
  console.log('🎯 Enhanced Reorder System Demonstration\n')
  
  try {
    // Fetch some sample ML predictions
    const mlResponse = await fetch('https://pharma-inventory-production.up.railway.app/forecast/all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'ml-service-dev-key-2025'
      },
      body: JSON.stringify({ days: 7 })
    })
    
    const mlData = await mlResponse.json()
    
    console.log('📊 ML Forecasts Received:', mlData.forecasts.length)
    
    // Analyze each drug's reorder recommendation
    console.log('\n🔍 Enhanced Reorder Analysis:\n')
    
    mlData.forecasts.slice(0, 5).forEach((forecast, index) => {
      const leadTimeDays = 7 // Assume 7-day lead time
      const avgDailyDemand = forecast.total_predicted_7_days / 7
      const currentStock = forecast.current_stock
      const stockSufficiencyDays = Math.floor(currentStock / avgDailyDemand)
      
      // Traditional reorder level calculation
      const safetyStock = Math.ceil(1.96 * Math.sqrt(leadTimeDays) * (avgDailyDemand * 0.2))
      const traditionalReorderLevel = Math.ceil((avgDailyDemand * leadTimeDays) + safetyStock)
      
      // Enhanced intelligence
      let recommendation, intelligentLevel, reorderDate, note
      
      if (stockSufficiencyDays <= leadTimeDays) {
        recommendation = 'IMMEDIATE'
        intelligentLevel = traditionalReorderLevel
        reorderDate = new Date().toISOString().split('T')[0]
        note = 'Stock critical - will run out within lead time'
      } else if (stockSufficiencyDays <= (leadTimeDays + 7)) {
        recommendation = 'UPCOMING'
        intelligentLevel = traditionalReorderLevel
        const daysUntilReorder = Math.max(1, stockSufficiencyDays - leadTimeDays - 2)
        const reorderDateObj = new Date()
        reorderDateObj.setDate(reorderDateObj.getDate() + daysUntilReorder)
        reorderDate = reorderDateObj.toISOString().split('T')[0]
        note = `Reorder in ${daysUntilReorder} days`
      } else if (stockSufficiencyDays <= (leadTimeDays + 21)) {
        recommendation = 'SUFFICIENT'
        intelligentLevel = Math.ceil(traditionalReorderLevel * 0.8)
        const daysUntilReorder = stockSufficiencyDays - leadTimeDays - 3
        const reorderDateObj = new Date()
        reorderDateObj.setDate(reorderDateObj.getDate() + daysUntilReorder)
        reorderDate = reorderDateObj.toISOString().split('T')[0]
        note = `Stock sufficient for ${stockSufficiencyDays} days. Reduced level to prevent overstocking`
      } else {
        recommendation = 'OVERSTOCKED'
        intelligentLevel = Math.ceil(traditionalReorderLevel * 0.5)
        const daysUntilReorder = stockSufficiencyDays - leadTimeDays - 7
        const reorderDateObj = new Date()
        reorderDateObj.setDate(reorderDateObj.getDate() + daysUntilReorder)
        reorderDate = reorderDateObj.toISOString().split('T')[0]
        note = `OVERSTOCKED: ${stockSufficiencyDays} days of stock. Wait until ${reorderDate}`
      }
      
      console.log(`${index + 1}. ${forecast.drug_name}`)
      console.log(`   Current Stock: ${currentStock} ${forecast.unit}`)
      console.log(`   Daily Demand: ${avgDailyDemand.toFixed(1)} ${forecast.unit}/day`)
      console.log(`   Stock Lasts: ${stockSufficiencyDays} days`)
      console.log(`   Traditional Reorder Level: ${traditionalReorderLevel}`)
      console.log(`   🎯 Intelligent Level: ${intelligentLevel} (${recommendation})`)
      console.log(`   📅 Reorder Date: ${reorderDate}`)
      console.log(`   💡 Note: ${note}`)
      console.log()
    })
    
    // Show the difference this makes
    const overstockedDrugs = mlData.forecasts.filter(f => {
      const avgDaily = f.total_predicted_7_days / 7
      const stockDays = Math.floor(f.current_stock / avgDaily)
      return stockDays > 21 // More than 3 weeks beyond lead time
    })
    
    console.log(`\n📈 Impact Summary:`)
    console.log(`   Overstocked Drugs: ${overstockedDrugs.length}/${mlData.forecasts.length}`)
    console.log(`   Prevented Overstocking: Reduced reorder levels by 20-50% for overstocked items`)
    console.log(`   Added Date Intelligence: Each drug now has specific reorder timing`)
    console.log(`   Lead Time Integration: Considers ${7}-day supplier lead time in calculations`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

demonstrateEnhancedReorder()