'use client'

import { useState, useCallback } from 'react'
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
import React from 'react'

interface InventoryItem {
  drugId: number
  drugName: string
  unit: string
  category: string
  currentStock: number
  reorderLevel: number
  calculatedReorderLevel: number | null
  lastReorderCalculation: Date | null
  effectiveReorderLevel: number
  hasCalculatedReorderLevel: boolean
  usingMLLevel: boolean
  reorderLevelVariance: number | null
  stockStatus: 'critical' | 'low' | 'normal' | 'good'
  reorderDate: string | null
  daysUntilReorder: number | null
  stockSufficiencyDays: number | null
  reorderRecommendation: string | null
  intelligentReorderLevel: number | null
  preventOverstockingNote: string | null
}

interface ReorderLevelDialogProps {
  drug: InventoryItem
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
    id: number
    createdAt: Date
    drugId: number
    calculatedLevel: number
    safetyStock: number
    avgDailyDemand: string
    demandStdDev: string
    leadTimeDays: number
    confidenceLevel: string
    calculationMethod: string
    calculationDate: Date
  } | undefined
  recommendation: 'INCREASE' | 'DECREASE' | 'MAINTAIN' | 'CALCULATE'
}

export function ReorderLevelDialog({ drug, open, onOpenChange }: ReorderLevelDialogProps) {
  const [comparison, setComparison] = useState<ReorderComparison | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)
  const { toast } = useToast()

  const fetchComparison = useCallback(async () => {
    if (!open) return
    
    setIsLoading(true)
    try {
      const data = await getReorderLevelComparison(drug.drugId)
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
  }, [open, drug.drugId, toast])

  const handleAcceptCalculation = async () => {
    setIsAccepting(true)
    try {
      await acceptCalculatedReorderLevel(drug.drugId)
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
  }, [open, drug.drugId, fetchComparison])

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
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Reorder Information
          </DialogTitle>
          <DialogDescription>
            Intelligent reorder analysis and recommendations for {drug.drugName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : comparison ? (
          <div className="space-y-6">
            {/* Intelligent Reorder Summary */}
            {drug.intelligentReorderLevel && drug.reorderRecommendation ? (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5 text-blue-500" />
                    AI-Optimized Reorder Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Current Stock</p>
                      <p className="text-2xl font-bold">{drug.currentStock} {drug.unit}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Intelligent Reorder Level</p>
                      <p className="text-2xl font-bold text-primary">{drug.intelligentReorderLevel} {drug.unit}</p>
                    </div>
                  </div>
                  
                  {/* Recommendation Badge */}
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${
                      drug.reorderRecommendation === 'immediate' 
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                        : drug.reorderRecommendation === 'upcoming'
                        ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
                        : drug.reorderRecommendation === 'sufficient'
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                    }`}>
                      {drug.reorderRecommendation.toUpperCase()} ACTION
                    </div>
                  </div>
                  
                  {/* Enhanced Information Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {drug.reorderDate && (
                      <div>
                        <p className="text-muted-foreground">📅 Reorder By</p>
                        <p className="font-medium">{new Date(drug.reorderDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}</p>
                      </div>
                    )}
                    {drug.stockSufficiencyDays !== null && (
                      <div>
                        <p className="text-muted-foreground">📊 Stock Duration</p>
                        <p className="font-medium">{drug.stockSufficiencyDays} days</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Prevention Note */}
                  {drug.preventOverstockingNote && (
                    <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                      <p className="text-sm">
                        💡 <strong>AI Insight:</strong> {drug.preventOverstockingNote}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Fallback for drugs without intelligent calculations */
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Current Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Current Stock</p>
                      <p className="text-2xl font-bold">{drug.currentStock} {drug.unit}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Current Reorder Level</p>
                      <p className="text-2xl font-bold">{drug.effectiveReorderLevel} {drug.unit}</p>
                    </div>
                  </div>
                  <div className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                    <p className="text-sm">
                      ⚠️ This drug is using default reorder levels. Run intelligent calculations for optimization.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Technical Details */}
            {comparison.drug.calculatedReorderLevel !== null && comparison.calculationDetails ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Technical Calculation Details
                  </CardTitle>
                  <CardDescription>
                    Last calculated: {comparison.drug.lastCalculation ? new Date(comparison.drug.lastCalculation).toLocaleDateString() : 'Never'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Traditional ML Level</p>
                      <p className="text-xl font-bold text-muted-foreground">
                        {comparison.drug.calculatedReorderLevel} {comparison.drug.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">Before AI optimization</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Confidence</p>
                      <p className="text-lg font-semibold">{(parseFloat(comparison.drug.confidence || '0') * 100).toFixed(0)}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
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
                  
                  {drug.intelligentReorderLevel && comparison.drug.calculatedReorderLevel !== drug.intelligentReorderLevel && (
                    <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                      <p className="text-sm">
                        🎯 <strong>AI Adjustment:</strong> Reduced from {comparison.drug.calculatedReorderLevel} to {drug.intelligentReorderLevel} {drug.unit} to prevent overstocking
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No calculation data available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Run the reorder level calculation to get intelligent recommendations
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