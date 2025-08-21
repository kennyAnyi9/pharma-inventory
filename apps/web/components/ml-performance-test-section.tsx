'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Progress } from '@workspace/ui/components/progress'
import { 
  TestTube, 
  Timer, 
  Target, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Clock,
  TrendingUp
} from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'

interface PerformanceTestResult {
  timestamp: string
  accuracyTest: {
    status: 'pass' | 'fail' | 'warning'
    averageError: number
    target: number
    message: string
    details: {
      totalDrugs: number
      drugsWithPredictions: number
      drugsWithActualData: number
      testPeriodDays: number
      predictions: Array<{
        drugId: number
        drugName: string
        predicted: number
        actual: number
        errorPercentage: number
      }>
    }
  }
  speedTest: {
    status: 'pass' | 'fail' | 'warning'
    averageResponseTime: number
    target: number
    message: string
    details: {
      mlHealthTime: number
      forecastTime: number
      reorderCalculationTime: number
      totalRequests: number
    }
  }
  overallStatus: 'pass' | 'fail' | 'warning'
  summary: string
}

interface MLPerformanceTestSectionProps {
  className?: string
}

export function MLPerformanceTestSection({ className }: MLPerformanceTestSectionProps) {
  const [testResult, setTestResult] = useState<PerformanceTestResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runPerformanceTest = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ml/performance-test')
      
      if (!response.ok) {
        throw new Error(`Test failed: ${response.status}`)
      }
      
      const result = await response.json()
      setTestResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'fail':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            ML Performance Test (Chapter 3 Metrics)
          </div>
          <Button 
            onClick={runPerformanceTest} 
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Testing...' : 'Run Test'}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-red-800">
                <XCircle className="h-4 w-4 text-red-600" />
                {error}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Running performance tests...
            </div>
            <Progress value={50} className="h-2" />
          </div>
        )}

        {testResult && (
          <>
            {/* Overall Status */}
            <Card className={cn(
              'border',
              testResult.overallStatus === 'pass' ? 'border-green-200 bg-green-50' :
              testResult.overallStatus === 'fail' ? 'border-red-200 bg-red-50' :
              'border-yellow-200 bg-yellow-50'
            )}>
              <CardContent className="pt-4">
                <div className={cn(
                  'flex items-center gap-2 font-medium',
                  testResult.overallStatus === 'pass' ? 'text-green-800' :
                  testResult.overallStatus === 'fail' ? 'text-red-800' :
                  'text-yellow-800'
                )}>
                  {getStatusIcon(testResult.overallStatus)}
                  {testResult.summary}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Speed Test Results */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Speed Test
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Badge className={getStatusColor(testResult.speedTest.status)}>
                      {getStatusIcon(testResult.speedTest.status)}
                      <span className="ml-1 capitalize">{testResult.speedTest.status}</span>
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Response Time</span>
                    <span className="text-sm font-mono">
                      {testResult.speedTest.averageResponseTime.toFixed(0)}ms
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Target</span>
                    <span className="text-sm font-mono text-muted-foreground">
                      ≤ {testResult.speedTest.target}ms
                    </span>
                  </div>

                  <div className="pt-2 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>ML Health</span>
                      <span>{testResult.speedTest.details.mlHealthTime}ms</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Reorder Calc</span>
                      <span>{testResult.speedTest.details.reorderCalculationTime}ms</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {testResult.speedTest.message}
                  </div>
                </CardContent>
              </Card>

              {/* Accuracy Test Results */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Accuracy Test
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Badge className={getStatusColor(testResult.accuracyTest.status)}>
                      {getStatusIcon(testResult.accuracyTest.status)}
                      <span className="ml-1 capitalize">{testResult.accuracyTest.status}</span>
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Error</span>
                    <span className="text-sm font-mono">
                      {testResult.accuracyTest.averageError.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Target</span>
                    <span className="text-sm font-mono text-muted-foreground">
                      ≤ {testResult.accuracyTest.target}%
                    </span>
                  </div>

                  <div className="pt-2 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Drugs Tested</span>
                      <span>{testResult.accuracyTest.details.drugsWithActualData}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Test Period</span>
                      <span>{testResult.accuracyTest.details.testPeriodDays} days</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {testResult.accuracyTest.message}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Test Details */}
            {testResult.accuracyTest.details.predictions.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Top Accuracy Results (Best 5)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {testResult.accuracyTest.details.predictions
                      .sort((a, b) => a.errorPercentage - b.errorPercentage)
                      .slice(0, 5)
                      .map((prediction, index) => (
                        <div key={`${prediction.drugId}-${index}`} className="flex items-center justify-between text-sm border-b pb-2">
                          <span className="flex-1 truncate">{prediction.drugName}</span>
                          <span className="font-mono text-xs px-2">
                            {prediction.predicted.toFixed(0)} vs {prediction.actual.toFixed(0)}
                          </span>
                          <Badge 
                            variant={prediction.errorPercentage <= 15 ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {prediction.errorPercentage.toFixed(1)}%
                          </Badge>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Test Metadata */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(testResult.timestamp).toLocaleString()}
              </div>
            </div>
          </>
        )}

        {!testResult && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <TestTube className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Run performance test to check ML system compliance with Chapter 3 objectives</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}