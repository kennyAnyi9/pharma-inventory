import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/roles'
import { ModelEvaluationService } from '@/lib/model-evaluation-service'
import { predictionLogger } from '@/lib/prediction-logger'

interface EvaluationRequest {
  action: 'evaluate' | 'simulate' | 'status' | 'history'
  periodStart?: string
  periodEnd?: string
  algorithm?: string
  drugId?: number
  simulationDays?: number
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!isSuperAdmin(session.user.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Super admin required for model evaluation.' 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'status'
    const algorithm = searchParams.get('algorithm') || undefined
    const drugId = searchParams.get('drugId') ? parseInt(searchParams.get('drugId')!) : undefined

    const evaluationService = new ModelEvaluationService()

    switch (action) {
      case 'status':
        // Get current performance status
        const performance = await evaluationService.getLatestPerformance(algorithm, drugId)
        const thresholds = await evaluationService.checkPerformanceThresholds(algorithm)
        
        return NextResponse.json({
          success: true,
          data: {
            performance,
            thresholds,
            timestamp: new Date().toISOString()
          }
        })

      case 'history':
        // Get performance history (last 10 evaluations)
        // Note: This would require additional method in service
        return NextResponse.json({
          success: true,
          data: {
            message: 'Performance history not yet implemented',
            timestamp: new Date().toISOString()
          }
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: status, history'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Model evaluation GET error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve evaluation data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!isSuperAdmin(session.user.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Super admin required for model evaluation.' 
      }, { status: 403 })
    }

    const body: EvaluationRequest = await request.json()
    const { action, periodStart, periodEnd, algorithm, drugId, simulationDays } = body

    console.log(`🧪 Model evaluation ${action} initiated by: ${session.user.email}`)

    const evaluationService = new ModelEvaluationService()

    switch (action) {
      case 'evaluate':
        // Perform batch evaluation for specified period
        if (!periodStart || !periodEnd) {
          return NextResponse.json({
            success: false,
            error: 'periodStart and periodEnd are required for evaluation'
          }, { status: 400 })
        }

        const startDate = new Date(periodStart)
        const endDate = new Date(periodEnd)

        console.log(`📊 Evaluating model performance from ${startDate.toISOString()} to ${endDate.toISOString()}`)

        const evaluationResult = await evaluationService.evaluatePeriod(
          startDate,
          endDate,
          algorithm,
          drugId
        )

        return NextResponse.json({
          success: true,
          data: {
            evaluation: evaluationResult,
            summary: {
              meetsTargets: evaluationResult.meetsRSquaredThreshold && evaluationResult.meetsRmseThreshold,
              rSquaredTarget: 0.85,
              rmseTarget: 0.10,
              actualRSquared: evaluationResult.rSquared,
              actualRMSE: evaluationResult.rmse,
              overallGrade: evaluationResult.overallGrade,
              recommendations: generateRecommendations(evaluationResult)
            },
            timestamp: new Date().toISOString()
          }
        })

      case 'simulate':
        // Generate historical predictions for testing
        const days = simulationDays || 30
        
        console.log(`🎭 Simulating ${days} days of historical predictions`)
        
        await predictionLogger.simulateHistoricalPredictions(days)

        return NextResponse.json({
          success: true,
          data: {
            message: `Successfully simulated ${days} days of historical predictions`,
            simulatedDays: days,
            nextStep: 'Run evaluation on simulated data',
            timestamp: new Date().toISOString()
          }
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: evaluate, simulate'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Model evaluation POST error:', error)
    return NextResponse.json({
      success: false,
      error: 'Model evaluation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generateRecommendations(result: any): string[] {
  const recommendations: string[] = []

  if (!result.meetsRSquaredThreshold) {
    recommendations.push(`R² of ${result.rSquared.toFixed(3)} is below target (0.85). Consider feature engineering or model tuning.`)
  }

  if (!result.meetsRmseThreshold) {
    recommendations.push(`RMSE of ${result.rmse.toFixed(3)} exceeds target (0.10). Review prediction accuracy and outliers.`)
  }

  if (result.categorizedResults.poor > result.totalPredictions * 0.2) {
    recommendations.push(`${((result.categorizedResults.poor / result.totalPredictions) * 100).toFixed(1)}% of predictions are poor. Focus on problematic drugs.`)
  }

  if (result.categorizedResults.excellent < result.totalPredictions * 0.5) {
    recommendations.push(`Only ${((result.categorizedResults.excellent / result.totalPredictions) * 100).toFixed(1)}% of predictions are excellent. Aim for >50%.`)
  }

  if (result.overallGrade === 'F') {
    recommendations.push('Model performance is failing. Immediate retraining and evaluation required.')
  } else if (result.overallGrade === 'D') {
    recommendations.push('Model performance is poor. Consider data quality issues and algorithm changes.')
  }

  if (recommendations.length === 0) {
    recommendations.push('Model performance meets all targets. Continue monitoring and periodic evaluation.')
  }

  return recommendations
}