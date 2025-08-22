import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { ModelEvaluationService } from '@/lib/model-evaluation-service'
import { predictionLogger } from '@/lib/prediction-logger'
import { sendCriticalStockAlert, getEmailRecipients } from '@/lib/email-service'

interface EvaluationStatus {
  timestamp: string
  success: boolean
  evaluationsPerformed: number
  predictionsLogged: number
  alertsSent: number
  performance: {
    rSquared: number
    rmse: number
    meetsTargets: boolean
    overallGrade: string
  } | null
  errors: string[]
}

export async function GET() {
  try {
    // Verify the request is from Vercel Cron
    const headersList = await headers()
    const authorization = headersList.get('authorization')
    
    // Check for Vercel Cron secret
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error('CRON_SECRET environment variable not set')
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      )
    }

    // Verify authorization
    if (authorization !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🕐 Starting scheduled model evaluation and monitoring...')
    
    const status: EvaluationStatus = {
      timestamp: new Date().toISOString(),
      success: true,
      evaluationsPerformed: 0,
      predictionsLogged: 0,
      alertsSent: 0,
      performance: null,
      errors: []
    }

    const evaluationService = new ModelEvaluationService()

    try {
      // Step 1: Log today's predictions from ML service
      console.log('📊 Logging daily ML predictions...')
      await predictionLogger.logDailyForecasts()
      status.predictionsLogged = 1 // Simplified count
      console.log('✅ Daily predictions logged')
    } catch (error) {
      const errorMsg = `Failed to log daily predictions: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('❌', errorMsg)
      status.errors.push(errorMsg)
    }

    try {
      // Step 2: Check if we have enough data for evaluation (at least 7 days old predictions)
      const evaluationDate = new Date()
      evaluationDate.setDate(evaluationDate.getDate() - 7) // Evaluate predictions made 7 days ago

      const periodStart = new Date(evaluationDate)
      periodStart.setDate(periodStart.getDate() - 7) // 7-day evaluation window
      
      console.log(`📈 Evaluating model performance for period: ${periodStart.toISOString()} to ${evaluationDate.toISOString()}`)

      // Perform evaluation for the past week
      const evaluationResult = await evaluationService.evaluatePeriod(
        periodStart,
        evaluationDate,
        'xgboost' // Default algorithm
      )

      status.evaluationsPerformed = 1
      status.performance = {
        rSquared: evaluationResult.rSquared,
        rmse: evaluationResult.rmse,
        meetsTargets: evaluationResult.meetsRSquaredThreshold && evaluationResult.meetsRmseThreshold,
        overallGrade: evaluationResult.overallGrade
      }

      console.log(`📊 Evaluation complete: R² = ${evaluationResult.rSquared.toFixed(3)}, RMSE = ${evaluationResult.rmse.toFixed(3)}, Grade = ${evaluationResult.overallGrade}`)

      // Step 3: Check performance thresholds and send alerts if needed
      if (!evaluationResult.meetsRSquaredThreshold || !evaluationResult.meetsRmseThreshold) {
        console.log('⚠️ Model performance below thresholds - sending alert...')
        
        try {
          await sendPerformanceAlert(evaluationResult)
          status.alertsSent = 1
          console.log('📧 Performance alert sent to administrators')
        } catch (alertError) {
          const errorMsg = `Failed to send performance alert: ${alertError instanceof Error ? alertError.message : 'Unknown error'}`
          console.error('❌', errorMsg)
          status.errors.push(errorMsg)
        }
      } else {
        console.log('✅ Model performance meets all thresholds')
      }

    } catch (error) {
      const errorMsg = `Failed to evaluate model performance: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error('❌', errorMsg)
      status.errors.push(errorMsg)
    }

    // Set overall success status
    status.success = status.errors.length === 0

    console.log(`${status.success ? '✅' : '⚠️'} Model evaluation monitoring complete`)
    
    return NextResponse.json({
      success: status.success,
      message: status.success 
        ? 'Model evaluation monitoring completed successfully'
        : 'Model evaluation monitoring completed with errors',
      data: status,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Model evaluation cron job error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error during model evaluation monitoring',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Send email alert when model performance is below thresholds
async function sendPerformanceAlert(evaluation: any): Promise<void> {
  try {
    // Skip email sending if API key is not configured
    if (!process.env.RESEND_API_KEY) {
      console.log('📧 RESEND_API_KEY not configured, skipping performance alert email')
      return
    }

    // Get email recipients (admin and super_admin users)
    const recipients = await getEmailRecipients()
    
    if (recipients.length === 0) {
      console.log('📧 No email recipients found for performance alert')
      return
    }

    const subject = `🚨 ML Model Performance Alert - Thresholds Not Met`
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Model Performance Alert</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🚨 ML Model Performance Alert</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Model performance below target thresholds</p>
          </div>
          
          <div style="background: #fff; border: 1px solid #e5e7eb; padding: 24px; border-radius: 0 0 8px 8px;">
            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
              <h2 style="margin: 0 0 12px 0; color: #d97706; font-size: 18px;">Performance Issues Detected</h2>
              <p style="margin: 0; color: #92400e; font-weight: 500;">The ML prediction model is not meeting target thresholds.</p>
            </div>
            
            <div style="background: #f9fafb; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">Performance Metrics</h3>
              <ul style="margin: 0; padding: 0; list-style: none;">
                <li style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="font-weight: 500;">R² Score:</span>
                  <span style="color: ${evaluation.meetsRSquaredThreshold ? '#059669' : '#dc2626'}; font-weight: 600;">
                    ${evaluation.rSquared.toFixed(3)} ${evaluation.meetsRSquaredThreshold ? '✅' : '❌'}
                  </span>
                </li>
                <li style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="font-weight: 500;">Target R²:</span>
                  <span>≥ 0.85</span>
                </li>
                <li style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="font-weight: 500;">RMSE:</span>
                  <span style="color: ${evaluation.meetsRmseThreshold ? '#059669' : '#dc2626'}; font-weight: 600;">
                    ${evaluation.rmse.toFixed(3)} ${evaluation.meetsRmseThreshold ? '✅' : '❌'}
                  </span>
                </li>
                <li style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="font-weight: 500;">Target RMSE:</span>
                  <span>< 0.10</span>
                </li>
                <li style="display: flex; justify-content: space-between; padding: 4px 0;">
                  <span style="font-weight: 500;">Overall Grade:</span>
                  <span style="font-weight: 600; color: ${getGradeColor(evaluation.overallGrade)};">${evaluation.overallGrade}</span>
                </li>
              </ul>
            </div>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; color: #dc2626; font-size: 16px;">Recommended Actions</h3>
              <ul style="margin: 0; padding: 0 0 0 20px; color: #991b1b;">
                ${!evaluation.meetsRSquaredThreshold ? '<li>Review and retrain model - R² below 0.85 threshold</li>' : ''}
                ${!evaluation.meetsRmseThreshold ? '<li>Investigate prediction accuracy - RMSE above 0.10 threshold</li>' : ''}
                <li>Check data quality and feature engineering</li>
                <li>Consider algorithm tuning or alternative models</li>
                <li>Review recent prediction vs actual consumption patterns</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
                 style="background: #f59e0b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                View Dashboard & Diagnostics
              </a>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center; color: #6b7280; font-size: 14px;">
              <p style="margin: 0;">This alert was generated automatically by your ML monitoring system.</p>
              <p style="margin: 4px 0 0 0;">Time: ${new Date().toLocaleString()}</p>
              <p style="margin: 4px 0 0 0;">Evaluation Period: ${evaluation.period?.start} - ${evaluation.period?.end}</p>
            </div>
          </div>
        </body>
      </html>
    `

    const textContent = `
🚨 ML MODEL PERFORMANCE ALERT 🚨

Performance Issues Detected:
- R² Score: ${evaluation.rSquared.toFixed(3)} ${evaluation.meetsRSquaredThreshold ? '✅' : '❌ (Target: ≥ 0.85)'}
- RMSE: ${evaluation.rmse.toFixed(3)} ${evaluation.meetsRmseThreshold ? '✅' : '❌ (Target: < 0.10)'}
- Overall Grade: ${evaluation.overallGrade}

RECOMMENDED ACTIONS:
${!evaluation.meetsRSquaredThreshold ? '• Review and retrain model - R² below 0.85 threshold' : ''}
${!evaluation.meetsRmseThreshold ? '• Investigate prediction accuracy - RMSE above 0.10 threshold' : ''}
• Check data quality and feature engineering
• Consider algorithm tuning or alternative models

View dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard

Generated: ${new Date().toLocaleString()}
    `

    // Send email using existing email service
    const Resend = require('resend').Resend
    const resend = new Resend(process.env.RESEND_API_KEY)

    const results = await Promise.allSettled(
      recipients.map(recipient =>
        resend.emails.send({
          from: 'Pharma Inventory <onboarding@resend.dev>',
          to: recipient.email,
          subject,
          html: htmlContent,
          text: textContent,
        })
      )
    )

    const successful = results.filter(result => result.status === 'fulfilled').length
    console.log(`📧 Performance alert sent to ${successful} recipients`)

  } catch (error) {
    console.error('❌ Failed to send performance alert:', error)
    throw error
  }
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '#059669'
    case 'B': return '#0891b2'
    case 'C': return '#f59e0b'
    case 'D': return '#ea580c'
    case 'F': return '#dc2626'
    default: return '#6b7280'
  }
}

// Only allow GET method for cron
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}