import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { drugs, inventory, reorderCalculations } from '@workspace/database'
import { eq, desc, and, sql, gte, lte } from 'drizzle-orm'
import { getEffectiveReorderLevel } from '@/lib/reorder-level-utils'

export const dynamic = 'force-dynamic'

// Helper function to debug data inconsistencies
async function debugDataState() {
  try {
    const drugCount = await db.select({ count: sql<number>`COUNT(*)` }).from(drugs)
    const inventoryCount = await db.select({ count: sql<number>`COUNT(*)` }).from(inventory)
    const reorderCount = await db.select({ count: sql<number>`COUNT(*)` }).from(reorderCalculations)
    
    const latestInventory = await db
      .select({
        drugId: inventory.drugId,
        date: inventory.date,
        closingStock: inventory.closingStock
      })
      .from(inventory)
      .orderBy(desc(inventory.date))
      .limit(5)
    
    const reorderMethods = await db
      .select({
        method: reorderCalculations.calculationMethod,
        count: sql<number>`COUNT(*)`
      })
      .from(reorderCalculations)
      .groupBy(reorderCalculations.calculationMethod)
      .orderBy(desc(sql`COUNT(*)`))
    
    console.log('🔍 Database State Debug:')
    console.log(`  - Total Drugs: ${drugCount[0]?.count || 0}`)
    console.log(`  - Total Inventory Records: ${inventoryCount[0]?.count || 0}`)
    console.log(`  - Total Reorder Calculations: ${reorderCount[0]?.count || 0}`)
    console.log(`  - Calculation Methods:`, reorderMethods)
    console.log(`  - Latest Inventory (sample):`, latestInventory)
    
    return {
      drugCount: drugCount[0]?.count || 0,
      inventoryCount: inventoryCount[0]?.count || 0,
      reorderCount: reorderCount[0]?.count || 0,
      methods: reorderMethods,
      latestInventory
    }
  } catch (error) {
    console.error('Debug query failed:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]!
    
    console.log(`📊 Generating daily analytics report for ${date}`)
    
    // Debug database state for consistency checking
    await debugDataState()
    
    // Test ML Service Health (with fallback)
    let mlServiceHealth
    try {
      mlServiceHealth = await testMLServiceHealth()
    } catch (error) {
      console.warn('ML service health check failed, using fallback:', error)
      mlServiceHealth = {
        status: 'error',
        message: 'ML service health check failed',
        responseTime: null,
        lastChecked: new Date().toISOString()
      }
    }
    
    // Get inventory movements for the day
    const dailyMovements = await getDailyMovements(date).catch(err => {
      console.error('Error in getDailyMovements:', err)
      return { error: err.message }
    })
    
    // Get ML predictions performance
    const mlPerformance = await getMLPerformance().catch(err => {
      console.error('Error in getMLPerformance:', err)
      return { error: err.message }
    })
    
    // Get stock status analysis
    const stockAnalysis = await getStockAnalysis().catch(err => {
      console.error('Error in getStockAnalysis:', err)
      return { error: err.message }
    })
    
    // Get reorder level calculation history
    const reorderHistory = await getReorderCalculationHistory(date).catch(err => {
      console.error('Error in getReorderCalculationHistory:', err)
      return { error: err.message }
    })
    
    // Get usage patterns and trends
    const usagePatterns = await getUsagePatterns(date).catch(err => {
      console.error('Error in getUsagePatterns:', err)
      return { error: err.message }
    })
    
    // Get forecasting accuracy metrics
    const forecastAccuracy = await getForecastAccuracy(date).catch(err => {
      console.error('Error in getForecastAccuracy:', err)
      return { error: err.message }
    })
    
    // Validate data consistency before generating summary
    const mlSuccessRate = (mlPerformance && 'mlSuccessRate' in mlPerformance) ? mlPerformance.mlSuccessRate : 0
    const hasMLData = (mlPerformance && 'totalCalculations' in mlPerformance) ? mlPerformance.totalCalculations > 0 : false
    
    console.log(`📋 Report Data Validation:`)
    console.log(`  - ML Service: ${mlServiceHealth?.status}`)
    console.log(`  - ML Success Rate: ${mlSuccessRate}%`)
    console.log(`  - ML Calculations: ${(mlPerformance && 'mlCalculations' in mlPerformance) ? mlPerformance.mlCalculations : 0}`)
    console.log(`  - Total Calculations: ${(mlPerformance && 'totalCalculations' in mlPerformance) ? mlPerformance.totalCalculations : 0}`)
    console.log(`  - Has ML Data: ${hasMLData}`)
    console.log(`  - Stock Critical: ${(stockAnalysis && 'summary' in stockAnalysis && stockAnalysis.summary) ? stockAnalysis.summary.critical : 0}`)
    console.log(`  - Daily Movements: ${(dailyMovements && 'summary' in dailyMovements && dailyMovements.summary) ? dailyMovements.summary.totalDrugsWithMovements : 0}`)

    const report = {
      reportDate: date,
      timestamp: new Date().toISOString(),
      mlServiceHealth,
      dailyMovements,
      mlPerformance: {
        ...mlPerformance,
        // Ensure consistency across all ML metrics
        consistencyCheck: {
          hasData: hasMLData,
          dataSource: (mlPerformance && 'dataSource' in mlPerformance) ? mlPerformance.dataSource : 'no data',
          calculationRange: (mlPerformance && 'oldestCalculation' in mlPerformance && 'newestCalculation' in mlPerformance && mlPerformance.oldestCalculation && mlPerformance.newestCalculation) ? {
            from: mlPerformance.oldestCalculation,
            to: mlPerformance.newestCalculation
          } : null
        }
      },
      stockAnalysis,
      reorderHistory,
      usagePatterns,
      forecastAccuracy,
      summary: generateExecutiveSummary({
        mlServiceHealth,
        dailyMovements,
        stockAnalysis,
        reorderHistory,
        mlPerformance // Include ML performance in summary
      }),
      // Add metadata for debugging
      _metadata: {
        generatedAt: new Date().toISOString(),
        dataQuality: {
          mlDataAvailable: hasMLData,
          stockDataComplete: !!(stockAnalysis && 'summary' in stockAnalysis && stockAnalysis.summary),
          movementDataComplete: !!(dailyMovements && 'summary' in dailyMovements && dailyMovements.summary),
          consistencyScore: hasMLData && (stockAnalysis && 'summary' in stockAnalysis && stockAnalysis.summary) && (dailyMovements && 'summary' in dailyMovements && dailyMovements.summary) ? 'high' : 'low'
        }
      }
    }
    
    console.log(`✅ Daily analytics report generated successfully`)
    
    return NextResponse.json(report)
    
  } catch (error) {
    console.error('Failed to generate daily analytics report:', error)
    return NextResponse.json(
      { error: 'Failed to generate analytics report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function testMLServiceHealth() {
  const startTime = Date.now()
  
  try {
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL
    const ML_API_KEY = process.env.ML_API_KEY
    
    if (!ML_SERVICE_URL || !ML_API_KEY) {
      return {
        status: 'error',
        message: 'ML service configuration missing',
        responseTime: null,
        lastChecked: new Date().toISOString()
      }
    }
    
    // Test health endpoint
    const healthResponse = await fetch(`${ML_SERVICE_URL}/health`, {
      headers: { 'X-API-Key': ML_API_KEY },
      signal: AbortSignal.timeout(10000)
    })
    
    const responseTime = Date.now() - startTime
    
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`)
    }
    
    // Test a sample prediction
    const testStartTime = Date.now()
    const testResponse = await fetch(`${ML_SERVICE_URL}/forecast/all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ML_API_KEY,
      },
      body: JSON.stringify({ days: 7 }),
      signal: AbortSignal.timeout(30000)
    })
    
    const predictionResponseTime = Date.now() - testStartTime
    
    if (!testResponse.ok) {
      throw new Error(`Prediction test failed: ${testResponse.status}`)
    }
    
    const testData = await testResponse.json()
    
    return {
      status: 'healthy',
      message: 'ML service is operational',
      healthCheckResponseTime: responseTime,
      predictionResponseTime,
      predictionCount: testData.forecasts?.length || 0,
      lastChecked: new Date().toISOString(),
      serviceUrl: ML_SERVICE_URL
    }
    
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString()
    }
  }
}

async function getDailyMovements(date: string) {
  try {
    const movements = await db
      .select({
        drugId: inventory.drugId,
        drugName: drugs.name,
        unit: drugs.unit,
        openingStock: inventory.openingStock,
        quantityReceived: inventory.quantityReceived,
        quantityUsed: inventory.quantityUsed,
        closingStock: inventory.closingStock,
        date: inventory.date
      })
      .from(inventory)
      .innerJoin(drugs, eq(inventory.drugId, drugs.id))
      .where(eq(inventory.date, date))
      .orderBy(drugs.name)
    
    const summary = {
      totalDrugsWithMovements: movements.length,
      totalReceived: movements.reduce((sum, m) => sum + (m.quantityReceived || 0), 0),
      totalUsed: movements.reduce((sum, m) => sum + (m.quantityUsed || 0), 0),
      averageUsage: movements.length > 0 ? movements.reduce((sum, m) => sum + (m.quantityUsed || 0), 0) / movements.length : 0,
      drugsWithHighUsage: movements.filter(m => (m.quantityUsed || 0) > 50).length,
      drugsReceived: movements.filter(m => (m.quantityReceived || 0) > 0).length
    }
    
    return {
      summary,
      movements: movements.slice(0, 20), // Top 20 for readability
      totalMovements: movements.length
    }
  } catch (error) {
    console.error('Error getting daily movements:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function getMLPerformance() {
  try {
    // Get all reorder calculations (not just last 7 days) to avoid empty data issues
    const allCalculations = await db
      .select({
        calculationMethod: reorderCalculations.calculationMethod,
        calculationDate: reorderCalculations.calculationDate,
        drugId: reorderCalculations.drugId,
        avgDailyDemand: reorderCalculations.avgDailyDemand,
        calculatedLevel: reorderCalculations.calculatedLevel
      })
      .from(reorderCalculations)
      .orderBy(desc(reorderCalculations.calculationDate))
      .limit(200) // Get more data for accurate ML success rate
    
    // Get recent calculations (last 30 days for better data availability)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentCalculations = allCalculations.filter(calc => 
      new Date(calc.calculationDate) >= thirtyDaysAgo
    )
    
    // Use all calculations if recent ones are insufficient
    const dataToAnalyze = recentCalculations.length >= 10 ? recentCalculations : allCalculations
    
    const mlCalculations = dataToAnalyze.filter(calc => 
      calc.calculationMethod?.toLowerCase().includes('ml') || 
      calc.calculationMethod?.toLowerCase().includes('forecast')
    )
    const fallbackCalculations = dataToAnalyze.filter(calc => 
      calc.calculationMethod?.toLowerCase().includes('fallback') || 
      calc.calculationMethod?.toLowerCase().includes('statistical')
    )
    
    console.log(`📊 ML Performance Analysis: ${dataToAnalyze.length} total, ${mlCalculations.length} ML, ${fallbackCalculations.length} fallback`)
    
    return {
      totalCalculations: dataToAnalyze.length,
      mlSuccessRate: dataToAnalyze.length > 0 ? (mlCalculations.length / dataToAnalyze.length) * 100 : 0,
      mlCalculations: mlCalculations.length,
      fallbackCalculations: fallbackCalculations.length,
      lastWeekTrend: {
        totalCalculations: recentCalculations.length,
        uniqueDrugs: new Set(dataToAnalyze.map(calc => calc.drugId)).size,
        averageDemand: dataToAnalyze.length > 0 ? 
          dataToAnalyze.reduce((sum, calc) => sum + parseFloat(calc.avgDailyDemand || '0'), 0) / dataToAnalyze.length : 0
      },
      dataSource: dataToAnalyze.length === recentCalculations.length ? 'recent (30 days)' : 'historical (all available)',
      oldestCalculation: dataToAnalyze.length > 0 ? dataToAnalyze[dataToAnalyze.length - 1]?.calculationDate || null : null,
      newestCalculation: dataToAnalyze.length > 0 ? dataToAnalyze[0]?.calculationDate || null : null
    }
  } catch (error) {
    console.error('Error getting ML performance:', error)
    return { 
      error: error instanceof Error ? error.message : 'Unknown error',
      totalCalculations: 0,
      mlSuccessRate: 0,
      mlCalculations: 0,
      fallbackCalculations: 0
    }
  }
}

async function getStockAnalysis() {
  try {
    const stockStatus = await db
      .select({
        drugId: drugs.id,
        drugName: drugs.name,
        currentStock: inventory.closingStock,
        reorderLevel: drugs.reorderLevel,
        calculatedReorderLevel: drugs.calculatedReorderLevel,
        intelligentReorderLevel: reorderCalculations.intelligentReorderLevel,
        unit: drugs.unit,
        category: drugs.category
      })
      .from(drugs)
      .leftJoin(
        inventory,
        and(
          eq(drugs.id, inventory.drugId),
          eq(inventory.date, sql`(SELECT MAX(date) FROM inventory WHERE drug_id = ${drugs.id})`)
        )
      )
      .leftJoin(
        reorderCalculations,
        and(
          eq(drugs.id, reorderCalculations.drugId),
          eq(
            reorderCalculations.calculationDate,
            sql`(SELECT MAX(calculation_date) FROM reorder_calculations WHERE drug_id = ${drugs.id})`
          )
        )
      )
      .orderBy(drugs.name)
    
    let critical = 0, low = 0, normal = 0, good = 0
    
    const analysis = stockStatus.map(item => {
      const currentStock = item.currentStock || 0
      const reorderLevel = getEffectiveReorderLevel({
        intelligentReorderLevel: item.intelligentReorderLevel,
        calculatedReorderLevel: item.calculatedReorderLevel,
        reorderLevel: item.reorderLevel
      })
      
      let status: string
      if (currentStock === 0) status = 'critical'
      else if (currentStock <= reorderLevel * 0.5) status = 'critical'
      else if (currentStock <= reorderLevel) status = 'low'
      else if (currentStock <= reorderLevel * 2) status = 'normal'
      else status = 'good'
      
      if (status === 'critical') critical++
      else if (status === 'low') low++
      else if (status === 'normal') normal++
      else good++
      
      return { ...item, stockStatus: status, effectiveReorderLevel: reorderLevel }
    })
    
    return {
      summary: {
        totalDrugs: stockStatus.length,
        critical,
        low,
        normal,
        good,
        stockOutDrugs: critical,
        lowStockDrugs: low,
        wellStockedDrugs: good + normal
      },
      criticalDrugs: analysis.filter(drug => drug.stockStatus === 'critical').slice(0, 10),
      lowStockDrugs: analysis.filter(drug => drug.stockStatus === 'low').slice(0, 10)
    }
  } catch (error) {
    console.error('Error getting stock analysis:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function getReorderCalculationHistory(date: string) {
  try {
    const calculations = await db
      .select({
        drugId: reorderCalculations.drugId,
        drugName: drugs.name,
        calculatedLevel: reorderCalculations.calculatedLevel,
        avgDailyDemand: reorderCalculations.avgDailyDemand,
        safetyStock: reorderCalculations.safetyStock,
        leadTimeDays: reorderCalculations.leadTimeDays,
        calculationMethod: reorderCalculations.calculationMethod,
        calculationDate: reorderCalculations.calculationDate,
        confidenceLevel: reorderCalculations.confidenceLevel
      })
      .from(reorderCalculations)
      .innerJoin(drugs, eq(reorderCalculations.drugId, drugs.id))
      .where(
        gte(reorderCalculations.calculationDate, new Date(date))
      )
      .orderBy(desc(reorderCalculations.calculationDate))
    
    return {
      calculationsToday: calculations.length,
      calculations: calculations.slice(0, 20),
      methods: calculations.reduce((acc, calc) => {
        const method = calc.calculationMethod || 'unknown'
        acc[method] = (acc[method] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  } catch (error) {
    console.error('Error getting reorder calculation history:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function getUsagePatterns(date: string) {
  try {
    const sevenDaysAgo = new Date(date)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const patterns = await db
      .select({
        drugId: inventory.drugId,
        drugName: drugs.name,
        category: drugs.category,
        date: inventory.date,
        quantityUsed: inventory.quantityUsed
      })
      .from(inventory)
      .innerJoin(drugs, eq(inventory.drugId, drugs.id))
      .where(
        and(
          gte(inventory.date, sevenDaysAgo.toISOString().split('T')[0]!),
          lte(inventory.date, date)
        )
      )
      .orderBy(drugs.name, inventory.date)
    
    // Group by drug and calculate trends
    const drugTrends = patterns.reduce((acc, pattern) => {
      const key = `${pattern.drugId}-${pattern.drugName}`
      if (!acc[key]) {
        acc[key] = {
          drugId: pattern.drugId,
          drugName: pattern.drugName,
          category: pattern.category,
          dailyUsage: [],
          totalUsage: 0,
          averageDaily: 0
        }
      }
      
      acc[key].dailyUsage.push({
        date: pattern.date,
        usage: pattern.quantityUsed || 0
      })
      acc[key].totalUsage += pattern.quantityUsed || 0
      
      return acc
    }, {} as Record<string, any>)
    
    // Calculate averages and trends
    Object.values(drugTrends).forEach((trend: any) => {
      trend.averageDaily = trend.totalUsage / Math.max(trend.dailyUsage.length, 1)
      
      // Simple trend calculation (last 3 days vs first 3 days)
      const recent = trend.dailyUsage.slice(-3).reduce((sum: number, day: any) => sum + day.usage, 0) / 3
      const earlier = trend.dailyUsage.slice(0, 3).reduce((sum: number, day: any) => sum + day.usage, 0) / 3
      trend.trend = recent > earlier ? 'increasing' : recent < earlier ? 'decreasing' : 'stable'
    })
    
    const trendArray = Object.values(drugTrends)
    
    return {
      totalDrugsAnalyzed: trendArray.length,
      highestUsage: trendArray.sort((a: any, b: any) => b.totalUsage - a.totalUsage).slice(0, 5),
      increasingTrends: trendArray.filter((trend: any) => trend.trend === 'increasing').length,
      decreasingTrends: trendArray.filter((trend: any) => trend.trend === 'decreasing').length,
      stableTrends: trendArray.filter((trend: any) => trend.trend === 'stable').length
    }
  } catch (error) {
    console.error('Error getting usage patterns:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function getForecastAccuracy(date: string) {
  try {
    // Get ML predictions from the same dataset as ML performance for consistency
    const recentPredictions = await db
      .select({
        drugId: reorderCalculations.drugId,
        avgDailyDemand: reorderCalculations.avgDailyDemand,
        calculationDate: reorderCalculations.calculationDate,
        calculationMethod: reorderCalculations.calculationMethod
      })
      .from(reorderCalculations)
      .where(
        and(
          gte(reorderCalculations.calculationDate, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
          sql`LOWER(${reorderCalculations.calculationMethod}) LIKE '%ml%' OR LOWER(${reorderCalculations.calculationMethod}) LIKE '%forecast%'`
        )
      )
      .orderBy(desc(reorderCalculations.calculationDate))
    
    // If no recent ML predictions, get any available ML calculations
    let mlData = recentPredictions
    if (mlData.length === 0) {
      mlData = await db
        .select({
          drugId: reorderCalculations.drugId,
          avgDailyDemand: reorderCalculations.avgDailyDemand,
          calculationDate: reorderCalculations.calculationDate,
          calculationMethod: reorderCalculations.calculationMethod
        })
        .from(reorderCalculations)
        .where(
          sql`LOWER(${reorderCalculations.calculationMethod}) LIKE '%ml%' OR LOWER(${reorderCalculations.calculationMethod}) LIKE '%forecast%'`
        )
        .orderBy(desc(reorderCalculations.calculationDate))
        .limit(50)
    }
    
    console.log(`🎯 Forecast Accuracy: Found ${mlData.length} ML predictions`)
    
    return {
      recentMLPredictions: mlData.length,
      averagePredictedDemand: mlData.length > 0 ? 
        mlData.reduce((sum, pred) => sum + parseFloat(pred.avgDailyDemand || '0'), 0) / mlData.length : 0,
      predictionCoverage: mlData.length > 0 ? 
        `${new Set(mlData.map(pred => pred.drugId)).size} drugs` : '0 drugs',
      dataRange: mlData.length > 0 ? {
        oldest: mlData[mlData.length - 1]?.calculationDate || null,
        newest: mlData[0]?.calculationDate || null
      } : null,
      note: mlData.length > 0 ? 
        'Based on available ML prediction data' : 
        'No ML prediction data available - requires reorder level calculations to be run'
    }
  } catch (error) {
    console.error('Error getting forecast accuracy:', error)
    return { 
      error: error instanceof Error ? error.message : 'Unknown error',
      recentMLPredictions: 0,
      averagePredictedDemand: 0,
      predictionCoverage: '0 drugs'
    }
  }
}

function generateExecutiveSummary(data: any) {
  const summary = {
    systemHealth: data.mlServiceHealth?.status || 'unknown',
    keyMetrics: {
      mlServiceStatus: data.mlServiceHealth?.status || 'unknown',
      totalDailyMovements: data.dailyMovements?.summary?.totalDrugsWithMovements || 0,
      criticalStockItems: data.stockAnalysis?.summary?.critical || 0,
      mlSuccessRate: Math.round(data.mlPerformance?.mlSuccessRate || 0)
    },
    alerts: [] as string[],
    recommendations: [] as string[]
  }
  
  // Generate alerts
  if (data.mlServiceHealth?.status !== 'healthy') {
    summary.alerts.push('⚠️ ML Service is not responding properly')
  }
  
  if (data.stockAnalysis?.summary?.critical > 0) {
    summary.alerts.push(`🚨 ${data.stockAnalysis.summary.critical} drugs are out of stock`)
  }
  
  if (data.stockAnalysis?.summary?.low > 5) {
    summary.alerts.push(`⚠️ ${data.stockAnalysis.summary.low} drugs have low stock levels`)
  }
  
  if (data.mlPerformance?.mlSuccessRate < 80) {
    summary.alerts.push('📉 ML prediction success rate is below 80%')
  }
  
  // Generate recommendations
  if (data.stockAnalysis?.summary?.critical > 0) {
    summary.recommendations.push('📋 Review and place urgent orders for out-of-stock items')
  }
  
  if (data.mlPerformance?.mlSuccessRate > 90) {
    summary.recommendations.push('✅ ML system performing well - consider expanding to additional metrics')
  }
  
  if (data.dailyMovements?.summary?.totalUsed > data.dailyMovements?.summary?.totalReceived) {
    summary.recommendations.push('📈 Usage exceeding receipts - monitor stock levels closely')
  }
  
  return summary
}