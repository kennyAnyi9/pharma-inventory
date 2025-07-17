'use client'

import { useState } from 'react'
import { useToast } from '@workspace/ui/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { getReorderLevelComparison, acceptCalculatedReorderLevel } from '../actions/reorder-actions'
import { Brain, Package, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from 'lucide-react'
import React

interface ReorderLevelDialogProps {
  drugId: number
  drugName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ReorderComparison {
  drug: {
    id: number
    name: string
    unit: string
    currentReorderLevel: number
    calculatedReorderLevel: number | null
    lastCalculation: Date | null
    confidence: string | null
  }
  currentStock: number
  calculationDetails: {
    calculatedLevel: number
    safetyStock: number
    avgDailyDemand: string
    demandStdDev: string
    leadTimeDays: number
    confidenceLevel: string
  } | null
  recommendation: 'INCREASE' | 'DECREASE' | 'MAINTAIN' | 'CALCULATE'
}

export function ReorderLevelDialog({ drugId, drugName, open, onOpenChange }: ReorderLevelDialogProps) {
  const [comparison, setComparison] = useState<ReorderComparison | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)
  const { toast } = useToast()

  const fetchComparison = async () => {
    if (!open) return
    
    setIsLoading(true)
    try {
      const data = await getReorderLevelComparison(drugId)
      setComparison(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch reorder level comparison',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptCalculation = async () => {
    setIsAccepting(true)
    try {
      await acceptCalculatedReorderLevel(drugId)
      toast({
        title: 'Success',
        description: 'Reorder level updated successfully',
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to accept calculated reorder level',
        variant: 'destructive',
      })
    } finally {
      setIsAccepting(false)
    }
  }

  // Fetch data when dialog opens
  React.useEffect(() => {
    fetchComparison()
  }, [open])

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'INCREASE': return 'destructive'
      case 'DECREASE': return 'secondary'
      case 'MAINTAIN': return 'default'
      case 'CALCULATE': return 'outline'
      default: return 'outline'
    }
  }

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'INCREASE': return <TrendingUp className="h-4 w-4" />
      case 'DECREASE': return <TrendingDown className="h-4 w-4" />
      case 'MAINTAIN': return <CheckCircle className="h-4 w-4" />
      case 'CALCULATE': return <AlertTriangle className="h-4 w-4" />
      default: return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            ML Reorder Level Analysis
          </DialogTitle>
          <DialogDescription>
            Compare manual and ML-calculated reorder levels for {drugName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : comparison ? (
          <div className="space-y-6">
            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Current Stock</p>
                    <p className="text-2xl font-bold">{comparison.currentStock} {comparison.drug.unit}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Current Reorder Level</p>
                    <p className="text-2xl font-bold">{comparison.drug.currentReorderLevel} {comparison.drug.unit}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ML Calculation */}
            {comparison.drug.calculatedReorderLevel && comparison.calculationDetails ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    ML-Calculated Reorder Level
                  </CardTitle>
                  <CardDescription>
                    Last calculated: {comparison.drug.lastCalculation ? new Date(comparison.drug.lastCalculation).toLocaleDateString() : 'Never'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Calculated Level</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {comparison.drug.calculatedReorderLevel} {comparison.drug.unit}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Confidence</p>
                      <p className="text-lg font-semibold">{(parseFloat(comparison.drug.confidence || '0') * 100).toFixed(0)}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Avg Daily Demand</p>
                      <p className="font-medium">{parseFloat(comparison.calculationDetails.avgDailyDemand).toFixed(1)} {comparison.drug.unit}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Lead Time</p>
                      <p className="font-medium">{comparison.calculationDetails.leadTimeDays} days</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Safety Stock</p>
                      <p className="font-medium">{comparison.calculationDetails.safetyStock} {comparison.drug.unit}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No ML calculation available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Run the reorder level calculation to get ML-optimized recommendations
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Recommendation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recommendation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant={getRecommendationColor(comparison.recommendation)}>
                    {getRecommendationIcon(comparison.recommendation)}
                    {comparison.recommendation}
                  </Badge>
                  {comparison.drug.calculatedReorderLevel && (
                    <span className="text-sm text-muted-foreground">
                      Change: {comparison.drug.calculatedReorderLevel - comparison.drug.currentReorderLevel > 0 ? '+' : ''}
                      {comparison.drug.calculatedReorderLevel - comparison.drug.currentReorderLevel} {comparison.drug.unit}
                    </span>
                  )}
                </div>

                {comparison.recommendation === 'CALCULATE' && (
                  <p className="text-sm text-muted-foreground">
                    No ML calculation available. Run the calculation to get optimized reorder levels.
                  </p>
                )}

                {comparison.recommendation === 'INCREASE' && (
                  <p className="text-sm text-muted-foreground">
                    ML analysis suggests increasing the reorder level to prevent potential stockouts based on demand patterns.
                  </p>
                )}

                {comparison.recommendation === 'DECREASE' && (
                  <p className="text-sm text-muted-foreground">
                    ML analysis suggests decreasing the reorder level to reduce excess inventory while maintaining service levels.
                  </p>
                )}

                {comparison.recommendation === 'MAINTAIN' && (
                  <p className="text-sm text-muted-foreground">
                    Current reorder level is optimal based on ML analysis. No changes needed.
                  </p>
                )}

                {comparison.drug.calculatedReorderLevel && comparison.recommendation !== 'MAINTAIN' && (
                  <Button 
                    onClick={handleAcceptCalculation}
                    disabled={isAccepting}
                    className="mt-4"
                  >
                    {isAccepting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept ML Recommendation
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to load reorder level comparison</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}