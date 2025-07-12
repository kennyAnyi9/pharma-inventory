'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Progress } from '@workspace/ui/components/progress'
import { ForecastChart } from './forecast-chart'
import { getStatusVariant } from '../lib/utils'
import { TrendingUp, Package, AlertTriangle } from 'lucide-react'

interface DrugForecast {
  drug_id: number
  drug_name: string
  unit: string
  current_stock: number
  reorder_level: number
  forecasts: Array<{
    date: string
    predicted_demand: number
    day_of_week: string
  }>
  total_predicted_7_days: number
  recommendation: string
}

interface ForecastCardProps {
  forecast: DrugForecast
}

export function ForecastCard({ forecast }: ForecastCardProps) {
  const stockPercentage = Math.min(100, (forecast.current_stock / (forecast.reorder_level * 2)) * 100)
  const daysOfStock = forecast.current_stock / (forecast.total_predicted_7_days / 7)
  const statusVariant = getStatusVariant(forecast.recommendation)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{forecast.drug_name}</CardTitle>
            <CardDescription>
              Current stock: {forecast.current_stock} {forecast.unit}
            </CardDescription>
          </div>
          <Badge variant={statusVariant} className="ml-2">
            {Math.round(daysOfStock)} days
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stock level progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Stock Level</span>
            <span className="font-medium">{Math.round(stockPercentage)}%</span>
          </div>
          <Progress value={stockPercentage} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>Reorder: {forecast.reorder_level}</span>
            <span>{forecast.reorder_level * 2}</span>
          </div>
        </div>

        {/* Forecast chart */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">7-Day Forecast</span>
          </div>
          <ForecastChart data={forecast.forecasts} unit={forecast.unit} />
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Daily Average</p>
            <p className="text-lg font-semibold">
              {Math.round(forecast.total_predicted_7_days / 7)} {forecast.unit}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">7-Day Total</p>
            <p className="text-lg font-semibold">
              {Math.round(forecast.total_predicted_7_days)} {forecast.unit}
            </p>
          </div>
        </div>

        {/* Recommendation */}
        <div className="border-t pt-3">
          <p className="text-sm">{forecast.recommendation}</p>
        </div>
      </CardContent>
    </Card>
  )
}