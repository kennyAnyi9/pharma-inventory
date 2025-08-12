import { Suspense } from 'react'
import { getAllForecasts } from '@/features/forecasts/actions/forecast-actions'
import { ForecastCard } from '@/features/forecasts/components/forecast-card'
import { ForecastsLoading } from '@/features/forecasts/components/forecasts-loading'
import { MLServiceError } from '@/features/forecasts/components/ml-service-error'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Brain, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

// Type guard to check if data is a successful forecast response
function isSuccessfulForecastResponse(data: any): data is { forecasts: any[]; generated_at: string } {
  return data && !('error' in data) && 'forecasts' in data
}

// Force dynamic rendering - no caching for real-time forecasts
export const dynamic = 'force-dynamic'

async function ForecastsContent() {
  const data = await getAllForecasts()

  // Use type guard to handle errors and ensure type safety
  if (!isSuccessfulForecastResponse(data)) {
    const errorProps = data && 'error' in data ? 
      { message: data.message, timestamp: data.timestamp } : 
      {}
    return <MLServiceError {...errorProps} />
  }

  // Now TypeScript knows data has forecasts and generated_at properties

  // Group forecasts by status
  const critical = data.forecasts.filter(f => 
    f.recommendation.includes('URGENT') || f.recommendation.includes('Critical')
  )
  const warning = data.forecasts.filter(f => 
    f.recommendation.includes('Warning')
  )
  const good = data.forecasts.filter(f => 
    f.recommendation.includes('Good')
  )

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Total Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.forecasts.length}</div>
            <p className="text-xs text-muted-foreground">drugs analyzed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{critical.length}</div>
            <p className="text-xs text-muted-foreground">need immediate action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-yellow-600" />
              Warning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{warning.length}</div>
            <p className="text-xs text-muted-foreground">order soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Sufficient
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{good.length}</div>
            <p className="text-xs text-muted-foreground">well stocked</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Items Alert */}
      {critical.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Critical Stock Levels
            </CardTitle>
            <CardDescription className="text-red-700">
              These drugs need immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {critical.map(drug => (
                <Badge key={drug.drug_id} variant="destructive">
                  {drug.drug_name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forecast Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Demand Forecasts</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.forecasts.map(forecast => (
            <ForecastCard key={forecast.drug_id} forecast={forecast} />
          ))}
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-sm text-muted-foreground text-center">
        Last updated: {new Date(data.generated_at).toLocaleString()}
      </div>
    </div>
  )
}

export default function ForecastsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Demand Forecasts</h2>
        <p className="text-muted-foreground">
          AI-powered predictions for the next 7 days using XGBoost models
        </p>
      </div>

      <Suspense fallback={<ForecastsLoading />}>
        <ForecastsContent />
      </Suspense>
    </div>
  )
}