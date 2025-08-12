'use server'

import { db } from '@/lib/db'
import { drugActivityLog, drugs, inventory } from '@workspace/database'
import { eq, desc, and } from 'drizzle-orm'

// Types for different activity types
type ActivityType = 
  | 'stock_add' 
  | 'stock_use' 
  | 'reorder_update' 
  | 'ml_calculation' 
  | 'alert_generated' 
  | 'system_update'
  | 'stock_status_change'

type ActivitySource = 'user_manual' | 'ml_system' | 'cron_job' | 'api_update' | 'system_automatic'

interface LogActivityParams {
  drugId: number
  drugName: string
  activityType: ActivityType
  description: string
  
  // Stock changes
  previousStock?: number
  newStock?: number
  quantity?: number
  
  // Reorder level changes
  previousReorderLevel?: number
  newReorderLevel?: number
  
  // Status changes
  previousStatus?: string
  newStatus?: string
  
  // Context
  unit?: string
  notes?: string
  source: ActivitySource
  userId?: string
  mlConfidence?: number
  calculationMethod?: string
  metadata?: any
}

export async function logDrugActivity(params: LogActivityParams) {
  try {
    // Validate required fields
    if (!params.drugId || !params.drugName || !params.activityType || !params.description) {
      throw new Error('Missing required fields for activity logging');
    }

    const stockChange = params.newStock && params.previousStock 
      ? params.newStock - params.previousStock 
      : params.quantity || 0;

    const reorderLevelChange = params.newReorderLevel && params.previousReorderLevel
      ? params.newReorderLevel - params.previousReorderLevel
      : 0;

    const result = await db.insert(drugActivityLog).values({
      drugId: params.drugId,
      drugName: params.drugName,
      date: new Date(),
      activityType: params.activityType,
      description: params.description,
      
      previousStock: params.previousStock,
      newStock: params.newStock,
      stockChange,
      
      previousReorderLevel: params.previousReorderLevel,
      newReorderLevel: params.newReorderLevel,
      reorderLevelChange,
      
      quantity: params.quantity,
      unit: params.unit,
      notes: params.notes,
      source: params.source,
      userId: params.userId,
      
      mlConfidence: params.mlConfidence ? params.mlConfidence.toString() : null,
      calculationMethod: params.calculationMethod,
      
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      
      metadata: params.metadata,
    }).returning({ id: drugActivityLog.id });

    console.log(
      `📝 Activity logged for drug ${params.drugName} (ID: ${params.drugId}): ${params.description}`
    );
    return result[0]?.id;
  } catch (error) {
    console.error('Failed to log drug activity:', error);
    // Don't throw error to prevent breaking main functionality
    return null;
  }
}

// Helper functions for common logging scenarios
export async function logStockAddition(drugId: number, drugName: string, quantity: number, previousStock: number, newStock: number, unit: string, notes?: string, userId?: string) {
  await logDrugActivity({
    drugId,
    drugName,
    activityType: 'stock_add',
    description: `Added ${quantity} ${unit} to stock`,
    previousStock,
    newStock,
    quantity,
    unit,
    notes,
    source: 'user_manual',
    userId,
  })
}

export async function logStockUsage(drugId: number, drugName: string, quantity: number, previousStock: number, newStock: number, unit: string, notes?: string, userId?: string) {
  await logDrugActivity({
    drugId,
    drugName,
    activityType: 'stock_use',
    description: `Used ${quantity} ${unit} from stock`,
    previousStock,
    newStock,
    quantity: -quantity, // Negative for usage
    unit,
    notes,
    source: 'user_manual',
    userId,
  })
}

export async function logReorderLevelUpdate(drugId: number, drugName: string, previousLevel: number, newLevel: number, confidence?: number, method?: string, source: ActivitySource = 'ml_system') {
  const change = newLevel - previousLevel
  const description = source === 'ml_system' 
    ? `ML system updated reorder level from ${previousLevel} to ${newLevel} (${change > 0 ? '+' : ''}${change})`
    : `Reorder level manually updated from ${previousLevel} to ${newLevel} (${change > 0 ? '+' : ''}${change})`

  await logDrugActivity({
    drugId,
    drugName,
    activityType: 'reorder_update',
    description,
    previousReorderLevel: previousLevel,
    newReorderLevel: newLevel,
    source,
    mlConfidence: confidence,
    calculationMethod: method,
  })
}

export async function logMLCalculation(drugId: number, drugName: string, calculatedLevel: number, confidence: number, method: string, metadata?: any) {
  await logDrugActivity({
    drugId,
    drugName,
    activityType: 'ml_calculation',
    description: `ML calculated optimal reorder level: ${calculatedLevel} (confidence: ${confidence.toFixed(1)}%)`,
    newReorderLevel: calculatedLevel,
    source: 'ml_system',
    mlConfidence: confidence,
    calculationMethod: method,
    metadata,
  })
}

export async function logStatusChange(drugId: number, drugName: string, previousStatus: string, newStatus: string, currentStock: number) {
  await logDrugActivity({
    drugId,
    drugName,
    activityType: 'stock_status_change',
    description: `Stock status changed from ${previousStatus} to ${newStatus} (current stock: ${currentStock})`,
    newStock: currentStock,
    previousStatus,
    newStatus,
    source: 'system_automatic',
  })
}

export async function logSystemUpdate(drugId: number, drugName: string, description: string, metadata?: any) {
  await logDrugActivity({
    drugId,
    drugName,
    activityType: 'system_update',
    description,
    source: 'system_automatic',
    metadata,
  })
}

// Get activity history for a drug
export async function getDrugActivityHistory(drugId: number, limit: number = 50) {
  try {
    const activities = await db
      .select()
      .from(drugActivityLog)
      .where(eq(drugActivityLog.drugId, drugId))
      .orderBy(desc(drugActivityLog.date))
      .limit(limit)

    return activities
  } catch (error) {
    console.error('Failed to get drug activity history:', error)
    return []
  }
}

// Get daily summary for all drugs on a specific date
export async function getDailyActivitySummary(date: string) {
  try {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const activities = await db
      .select()
      .from(drugActivityLog)
      .where(
        and(
          eq(drugActivityLog.date, startOfDay),
          eq(drugActivityLog.date, endOfDay)
        )
      )
      .orderBy(drugActivityLog.drugName, desc(drugActivityLog.date))

    // Group by drug
    const drugSummaries = activities.reduce((acc, activity) => {
      const drugKey = `${activity.drugId}-${activity.drugName}`
      if (!acc[drugKey]) {
        acc[drugKey] = {
          drugId: activity.drugId,
          drugName: activity.drugName,
          activities: [],
          totalStockChange: 0,
          reorderLevelChanges: 0,
        }
      }
      
      acc[drugKey].activities.push(activity)
      if (activity.stockChange) {
        acc[drugKey].totalStockChange += activity.stockChange
      }
      if (activity.reorderLevelChange) {
        acc[drugKey].reorderLevelChanges += Math.abs(activity.reorderLevelChange)
      }
      
      return acc
    }, {} as Record<string, any>)

    return Object.values(drugSummaries)
  } catch (error) {
    console.error('Failed to get daily activity summary:', error)
    return []
  }
}