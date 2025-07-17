'use client'

import { useState } from 'react'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { useToast } from '@workspace/ui/hooks/use-toast'
import { calculateAllReorderLevels } from '../actions/reorder-actions'
import { Brain, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'

interface ReorderCalculationTriggerProps {
  onCalculationComplete?: () => void
}

export function ReorderCalculationTrigger({ onCalculationComplete }: ReorderCalculationTriggerProps) {
  const [isCalculating, setIsCalculating] = useState(false)
  const [lastCalculation, setLastCalculation] = useState<{
    timestamp: Date
    calculationsCount: number
    success: boolean
  } | null>(null)
  const { toast } = useToast()

  const handleCalculateReorderLevels = async () => {
    setIsCalculating(true)
    try {
      const result = await calculateAllReorderLevels()
      
      setLastCalculation({
        timestamp: new Date(),
        calculationsCount: result.calculationsCount,
        success: result.success
      })

      toast({
        title: 'Reorder levels calculated',
        description: `Successfully calculated optimal reorder levels for ${result.calculationsCount} drugs`,
      })

      if (onCalculationComplete) {
        onCalculationComplete()
      }
    } catch (error) {
      toast({
        title: 'Calculation failed',
        description: 'Failed to calculate reorder levels. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          ML Reorder Level Optimization
        </CardTitle>
        <CardDescription>
          Calculate optimal reorder levels for all drugs using machine learning predictions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Optimization Status</p>
            <p className="text-sm text-muted-foreground">
              {lastCalculation ? (
                <>
                  Last calculated: {lastCalculation.timestamp.toLocaleString()}
                  <br />
                  {lastCalculation.calculationsCount} drugs optimized
                </>
              ) : (
                'No recent calculations'
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastCalculation && (
              <Badge variant={lastCalculation.success ? 'default' : 'destructive'}>
                {lastCalculation.success ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Success
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Failed
                  </>
                )}
              </Badge>
            )}
            <Button
              onClick={handleCalculateReorderLevels}
              disabled={isCalculating}
              className="flex items-center gap-2"
            >
              {isCalculating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Calculate Now
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-4">
          <h4 className="text-sm font-medium mb-2">How it works:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Analyzes 7-day demand forecasts from ML models</li>
            <li>• Calculates optimal reorder levels based on demand patterns</li>
            <li>• Considers supplier lead times and safety stock requirements</li>
            <li>• Updates reorder levels to prevent stockouts and reduce overstock</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}