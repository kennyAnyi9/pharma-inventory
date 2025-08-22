import { ModelEvaluationService } from './model-evaluation-service'
import { db } from './db'
import { drugs } from '@workspace/database'
import { eq } from 'drizzle-orm'

interface PredictionData {
  drugId: number
  predictedConsumption: number
  confidenceScore?: number
  forecastPeriodDays?: number
  algorithm?: string
  modelVersion?: string
  features?: Record<string, any>
  metadata?: Record<string, any>
}

interface MLServiceResponse {
  drug_id: number
  drug_name: string
  total_predicted_7_days: number
  confidence?: number
  model_version?: string
  features_used?: string[]
  [key: string]: any
}

export class PredictionLogger {
  private evaluationService: ModelEvaluationService

  constructor() {
    this.evaluationService = new ModelEvaluationService()
  }

  /**
   * Log a single prediction for future evaluation
   */
  async logSinglePrediction(prediction: PredictionData): Promise<number> {
    try {
      const predictionId = await this.evaluationService.logPrediction({
        drugId: prediction.drugId,
        predictionDate: new Date(),
        forecastPeriodDays: prediction.forecastPeriodDays || 7,
        predictedConsumption: prediction.predictedConsumption.toString(),
        confidenceScore: prediction.confidenceScore?.toString(),
        modelVersion: prediction.modelVersion || 'unknown',
        algorithm: prediction.algorithm || 'xgboost',
        features: prediction.features ? JSON.stringify(prediction.features) : null,
        metadata: prediction.metadata ? JSON.stringify(prediction.metadata) : null
      })

      console.log(`📊 Logged prediction ${predictionId} for drug ${prediction.drugId}: ${prediction.predictedConsumption}`)
      return predictionId
    } catch (error) {
      console.error('❌ Failed to log prediction:', error)
      throw error
    }
  }

  /**
   * Log batch predictions from ML service response
   */
  async logMLServiceResponse(response: MLServiceResponse[]): Promise<number[]> {
    const predictionIds: number[] = []

    for (const forecast of response) {
      try {
        const predictionData: PredictionData = {
          drugId: forecast.drug_id,
          predictedConsumption: forecast.total_predicted_7_days || 0,
          confidenceScore: forecast.confidence,
          forecastPeriodDays: 7,
          algorithm: 'xgboost',
          modelVersion: forecast.model_version || 'latest',
          features: forecast.features_used ? { features: forecast.features_used } : undefined,
          metadata: {
            response_timestamp: new Date().toISOString(),
            drug_name: forecast.drug_name,
            raw_response: forecast
          }
        }

        const predictionId = await this.logSinglePrediction(predictionData)
        predictionIds.push(predictionId)
      } catch (error) {
        console.error(`❌ Failed to log prediction for drug ${forecast.drug_id}:`, error)
      }
    }

    console.log(`📊 Logged ${predictionIds.length} predictions from ML service`)
    return predictionIds
  }

  /**
   * Enhanced reorder calculation logging with prediction tracking
   */
  async logReorderPrediction(
    drugId: number,
    calculatedLevel: number,
    confidence: number,
    method: string,
    features?: Record<string, any>
  ): Promise<void> {
    try {
      // Get drug name for logging
      const drugData = await db
        .select({ name: drugs.name })
        .from(drugs)
        .where(eq(drugs.id, drugId))
        .limit(1)

      const drugName = drugData[0]?.name || `Drug ${drugId}`

      // Log as a reorder level prediction (different from consumption prediction)
      await this.logSinglePrediction({
        drugId,
        predictedConsumption: calculatedLevel, // Using reorder level as prediction
        confidenceScore: confidence,
        forecastPeriodDays: 30, // Reorder levels typically for 30-day periods
        algorithm: method,
        modelVersion: 'reorder-v1',
        features,
        metadata: {
          prediction_type: 'reorder_level',
          drug_name: drugName,
          calculation_timestamp: new Date().toISOString()
        }
      })

      console.log(`📊 Logged reorder prediction for ${drugName}: level ${calculatedLevel} (confidence: ${confidence})`)
    } catch (error) {
      console.error('❌ Failed to log reorder prediction:', error)
    }
  }

  /**
   * Log predictions from daily forecast cron job
   */
  async logDailyForecasts(): Promise<void> {
    try {
      console.log('📊 Starting daily forecast logging...')

      // Call ML service to get forecasts
      const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "https://pharma-inventory-production.up.railway.app"
      const ML_API_KEY = process.env.ML_API_KEY || "ml-service-dev-key-2025"

      const response = await fetch(`${ML_SERVICE_URL}/forecast/all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": ML_API_KEY,
        },
        body: JSON.stringify({ days: 7 }),
      })

      if (!response.ok) {
        throw new Error(`ML service error: ${response.status}`)
      }

      const forecastData = await response.json()
      
      if (forecastData.forecasts && Array.isArray(forecastData.forecasts)) {
        const predictionIds = await this.logMLServiceResponse(forecastData.forecasts)
        console.log(`✅ Daily forecast logging complete: ${predictionIds.length} predictions logged`)
      } else {
        console.warn('⚠️ No forecasts received from ML service')
      }

    } catch (error) {
      console.error('❌ Daily forecast logging failed:', error)
      throw error
    }
  }

  /**
   * Simulate historical predictions for evaluation testing
   */
  async simulateHistoricalPredictions(daysBack: number = 30): Promise<void> {
    try {
      console.log(`📊 Simulating historical predictions for last ${daysBack} days...`)

      // Get all drugs
      const allDrugs = await db.select({ id: drugs.id, name: drugs.name }).from(drugs)

      const predictions: PredictionData[] = []

      // Create predictions for each day and each drug
      for (let day = daysBack; day > 0; day--) {
        const predictionDate = new Date()
        predictionDate.setDate(predictionDate.getDate() - day)

        for (const drug of allDrugs) {
          // Simulate realistic consumption predictions (5-50 units with some variation)
          const basePrediction = 10 + Math.random() * 40
          const variation = (Math.random() - 0.5) * 0.4 // ±20% variation
          const predictedConsumption = Math.max(0, basePrediction * (1 + variation))

          predictions.push({
            drugId: drug.id,
            predictedConsumption: Math.round(predictedConsumption),
            confidenceScore: 0.6 + Math.random() * 0.4, // 60-100% confidence
            forecastPeriodDays: 7,
            algorithm: 'xgboost',
            modelVersion: 'historical-sim',
            metadata: {
              simulation: true,
              prediction_date: predictionDate.toISOString(),
              drug_name: drug.name
            }
          })
        }
      }

      console.log(`📊 Generated ${predictions.length} historical predictions`)

      // Log all predictions (batch process)
      let logged = 0
      for (const prediction of predictions) {
        try {
          // Temporarily set prediction date for historical data
          const originalLogFunction = this.evaluationService.logPrediction
          this.evaluationService.logPrediction = async (pred) => {
            return await db.insert(require('@workspace/database').mlPredictions).values({
              ...pred,
              predictionDate: new Date(prediction.metadata!.prediction_date),
              createdAt: new Date(prediction.metadata!.prediction_date)
            }).returning({ id: require('@workspace/database').mlPredictions.id }).then(r => r[0]?.id || 0)
          }

          await this.logSinglePrediction(prediction)
          logged++

          // Restore original function
          this.evaluationService.logPrediction = originalLogFunction

        } catch (error) {
          console.error(`Failed to log historical prediction for drug ${prediction.drugId}:`, error)
        }
      }

      console.log(`✅ Historical simulation complete: ${logged} predictions logged`)

    } catch (error) {
      console.error('❌ Historical prediction simulation failed:', error)
      throw error
    }
  }
}

// Global instance
export const predictionLogger = new PredictionLogger()