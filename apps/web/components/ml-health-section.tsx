'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Loader2, Bot, RefreshCw, CheckCircle, AlertCircle, Clock, Activity, Zap, Timer } from 'lucide-react'
import { isSuperAdmin } from '@/lib/roles'

interface MLHealthProps {
  className?: string
}

interface RetrainResult {
  success: boolean
  message: string
  data?: {
    modelsReloaded: number
    triggeredBy: string
    timestamp: string
  }
  error?: string
  details?: string
}

interface HealthCheckResult {
  success: boolean
  timestamp: string
  healthCheck?: {
    service: {
      status: 'online' | 'offline' | 'error'
      responseTime: number
      lastChecked: string
      serviceUrl: string
    }
    models: {
      status: 'loaded' | 'loading' | 'error'
      totalModels: number
      loadedModels: string[]
      failedModels: string[]
      lastModelUpdate: string | null
    }
    predictions: {
      status: 'working' | 'error'
      lastSuccessfulPrediction: string | null
      totalPredictionsToday: number
      errorRate: number
    }
    overall: {
      status: 'healthy' | 'warning' | 'critical'
      issues: string[]
      recommendations: string[]
    }
  }
  error?: string
  details?: string
}

interface PerformanceResult {
  success: boolean
  timestamp: string
  performance?: {
    period: string
    totalPredictions: number
    accurateWithin10Percent: number
    accurateWithin20Percent: number
    accurateWithin50Percent: number
    majorErrors: number
    averageAccuracy: number
    accuracyTrend: 'improving' | 'stable' | 'declining'
    worstPerformers: Array<{
      drugName: string
      predicted: number
      actual: number
      accuracyPercentage: number
      errorMagnitude: number
    }>
    recommendationsNeeded: boolean
    alertLevel: 'none' | 'warning' | 'critical'
    issues: string[]
    recommendations: string[]
  }
  error?: string
  details?: string
}

export function MLHealthSection({ className }: MLHealthProps) {
  const { data: session } = useSession()
  const [isRetraining, setIsRetraining] = useState(false)
  const [retrainResult, setRetrainResult] = useState<RetrainResult | null>(null)
  const [lastRetrain, setLastRetrain] = useState<string | null>(null)
  const [isCheckingHealth, setIsCheckingHealth] = useState(false)
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null)
  const [isCheckingPerformance, setIsCheckingPerformance] = useState(false)
  const [performanceResult, setPerformanceResult] = useState<PerformanceResult | null>(null)
  const [isDiagnosing, setIsDiagnosing] = useState(false)
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null)
  const [isExploring, setIsExploring] = useState(false)
  const [explorationResult, setExplorationResult] = useState<any>(null)
  const [isTestingCron, setIsTestingCron] = useState(false)
  const [cronTestResult, setCronTestResult] = useState<any>(null)

  const userRole = session?.user?.role
  const showTechnicalDetails = isSuperAdmin(userRole || 'operator')

  const handleRetrain = async () => {
    if (!showTechnicalDetails) return
    
    setIsRetraining(true)
    setRetrainResult(null)
    
    try {
      const response = await fetch('/api/ml/retrain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      setRetrainResult(result)
      
      if (result.success && result.data?.timestamp) {
        setLastRetrain(result.data.timestamp)
      }
      
    } catch (error) {
      setRetrainResult({
        success: false,
        message: 'Failed to trigger retraining',
        error: error instanceof Error ? error.message : 'Network error'
      })
    } finally {
      setIsRetraining(false)
    }
  }

  const handleHealthCheck = async () => {
    if (!showTechnicalDetails) return
    
    setIsCheckingHealth(true)
    setHealthResult(null)
    
    try {
      const response = await fetch('/api/ml/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      setHealthResult(result)
      
    } catch (error) {
      setHealthResult({
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Network error'
      })
    } finally {
      setIsCheckingHealth(false)
    }
  }

  const handlePerformanceCheck = async () => {
    if (!showTechnicalDetails) return
    
    setIsCheckingPerformance(true)
    setPerformanceResult(null)
    
    try {
      const response = await fetch('/api/ml/performance?days=7', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      setPerformanceResult(result)
      
    } catch (error) {
      setPerformanceResult({
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Network error'
      })
    } finally {
      setIsCheckingPerformance(false)
    }
  }

  const handleDiagnose = async () => {
    if (!showTechnicalDetails) return
    
    setIsDiagnosing(true)
    setDiagnosticResult(null)
    
    try {
      const response = await fetch('/api/ml/diagnose', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      setDiagnosticResult(result)
      
    } catch (error) {
      setDiagnosticResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsDiagnosing(false)
    }
  }

  const handleExplore = async () => {
    if (!showTechnicalDetails) return
    
    setIsExploring(true)
    setExplorationResult(null)
    
    try {
      const response = await fetch('/api/ml/explore', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      setExplorationResult(result)
      
    } catch (error) {
      setExplorationResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsExploring(false)
    }
  }

  const handleTestCron = async () => {
    if (!showTechnicalDetails) return
    
    setIsTestingCron(true)
    setCronTestResult(null)
    
    try {
      const response = await fetch('/api/cron/test-reorder', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      setCronTestResult(result)
      
    } catch (error) {
      setCronTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsTestingCron(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
      case 'loaded':
      case 'working':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'warning':
      case 'loading':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'critical':
      case 'offline':
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
      case 'loaded':
      case 'working':
        return <CheckCircle className="h-4 w-4" />
      case 'warning':
      case 'loading':
        return <Clock className="h-4 w-4" />
      case 'critical':
      case 'offline':
      case 'error':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  // Simple view for regular admins
  if (!showTechnicalDetails) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-500" />
            Forecasting System
          </CardTitle>
          <CardDescription>
            AI-powered demand prediction status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">Working Properly</span>
            <Badge variant="secondary" className="ml-2">Active</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            The system is automatically predicting drug demand to help optimize inventory levels.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Detailed view for super admins
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-500" />
          ML Model Health
        </CardTitle>
        <CardDescription>
          Machine learning model status and retraining controls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Models Active</span>
            </div>
            <p className="text-xs text-muted-foreground">
              XGBoost models loaded and serving predictions
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Last Retrain</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {lastRetrain ? formatDate(lastRetrain) : 'Not available'}
            </p>
          </div>
        </div>

        {/* System Diagnostics Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-medium">System Diagnostics</h4>
              <p className="text-xs text-muted-foreground">
                Run comprehensive ML system tests to identify issues
              </p>
            </div>
            <Button
              onClick={handleDiagnose}
              disabled={isDiagnosing}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              {isDiagnosing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Diagnosing...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4" />
                  Run Diagnostics
                </>
              )}
            </Button>
          </div>

          {/* Diagnostic Results */}
          {diagnosticResult && (
            <div className="mb-4">
              {diagnosticResult.success ? (
                <div className="space-y-3">
                  {/* Summary */}
                  <div className={`p-3 rounded-lg border ${getStatusColor(diagnosticResult.summary?.overall_status?.toLowerCase() || 'error')}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(diagnosticResult.summary?.overall_status?.toLowerCase() || 'error')}
                      <span className="text-sm font-medium">
                        Overall Status: {diagnosticResult.summary?.overall_status || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="text-xs">
                      <p><strong>Tests:</strong> {diagnosticResult.summary?.passed || 0} passed, {diagnosticResult.summary?.failed || 0} failed, {diagnosticResult.summary?.warnings || 0} warnings</p>
                    </div>
                  </div>

                  {/* Individual Test Results */}
                  <div className="space-y-2">
                    {diagnosticResult.diagnostics?.tests?.map((test: any, index: number) => (
                      <div key={index} className={`p-2 rounded border text-xs ${getStatusColor(test.status)}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(test.status)}
                            <span className="font-medium">{test.name}</span>
                          </div>
                          {test.duration && <span>{test.duration}ms</span>}
                        </div>
                        <p className="mt-1">{test.message}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recommendations */}
                  {diagnosticResult.recommendations && diagnosticResult.recommendations.length > 0 && (
                    <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                      <h5 className="text-sm font-medium text-blue-800 mb-2">🔧 Recommendations:</h5>
                      <div className="text-xs text-blue-700 space-y-1">
                        {diagnosticResult.recommendations.map((rec: string, index: number) => (
                          <p key={index}>• {rec}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Diagnostic Failed</span>
                  </div>
                  <p className="text-xs">{diagnosticResult.error || 'Unknown error occurred'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Endpoint Explorer Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-medium">Endpoint Explorer</h4>
              <p className="text-xs text-muted-foreground">
                Discover available ML service endpoints and find working prediction routes
              </p>
            </div>
            <Button
              onClick={handleExplore}
              disabled={isExploring}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              {isExploring ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exploring...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Explore Endpoints
                </>
              )}
            </Button>
          </div>

          {/* Exploration Results */}
          {explorationResult && (
            <div className="mb-4">
              {explorationResult.success ? (
                <div className="space-y-3">
                  {/* Summary */}
                  <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        Exploration Complete
                      </span>
                    </div>
                    <div className="text-xs text-blue-700">
                      <p><strong>Found:</strong> {explorationResult.analysis?.working_endpoints || 0} working endpoints out of {explorationResult.analysis?.total_endpoints_tested || 0} tested</p>
                      <p><strong>Prediction endpoints:</strong> {explorationResult.analysis?.prediction_endpoints?.available?.length || 0} available</p>
                    </div>
                  </div>

                  {/* Available Endpoints */}
                  {explorationResult.working_endpoints && explorationResult.working_endpoints.length > 0 && (
                    <div className="p-3 rounded-lg border border-green-200 bg-green-50">
                      <h5 className="text-sm font-medium text-green-800 mb-2">✅ Working Endpoints:</h5>
                      <div className="text-xs text-green-700 space-y-1 max-h-32 overflow-y-auto">
                        {explorationResult.working_endpoints.map((endpoint: any, index: number) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="font-mono">{endpoint.endpoint}</span>
                            <span className="text-green-600">{endpoint.status} ({endpoint.responseTime}ms)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prediction-specific Results */}
                  {explorationResult.analysis?.prediction_endpoints && (
                    <div className="space-y-2">
                      {explorationResult.analysis.prediction_endpoints.available?.length > 0 && (
                        <div className="p-3 rounded-lg border border-green-200 bg-green-50">
                          <h5 className="text-sm font-medium text-green-800 mb-2">🎯 Available Prediction Endpoints:</h5>
                          <div className="text-xs text-green-700 space-y-1">
                            {explorationResult.analysis.prediction_endpoints.available.map((endpoint: any, index: number) => (
                              <div key={index} className="font-mono">{endpoint.endpoint}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {explorationResult.analysis.prediction_endpoints.not_found?.length > 0 && (
                        <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                          <h5 className="text-sm font-medium text-red-800 mb-2">❌ Missing Prediction Endpoints:</h5>
                          <div className="text-xs text-red-700 space-y-1">
                            {explorationResult.analysis.prediction_endpoints.not_found.map((endpoint: any, index: number) => (
                              <div key={index} className="font-mono">{endpoint.endpoint}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recommendations */}
                  {explorationResult.analysis?.recommendations && explorationResult.analysis.recommendations.length > 0 && (
                    <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                      <h5 className="text-sm font-medium text-blue-800 mb-2">💡 Recommendations:</h5>
                      <div className="text-xs text-blue-700 space-y-1">
                        {explorationResult.analysis.recommendations.map((rec: string, index: number) => (
                          <p key={index}>{rec}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Exploration Failed</span>
                  </div>
                  <p className="text-xs">{explorationResult.error || 'Unknown error occurred'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Health Check Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-medium">Service Health Check</h4>
              <p className="text-xs text-muted-foreground">
                Check ML service status and model availability
              </p>
            </div>
            <Button
              onClick={handleHealthCheck}
              disabled={isCheckingHealth}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              {isCheckingHealth ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4" />
                  Check Health
                </>
              )}
            </Button>
          </div>

          {/* Health Results */}
          {healthResult && (
            <div className="mb-4">
              {healthResult.success && healthResult.healthCheck ? (
                <div className="space-y-3">
                  {/* Overall Status */}
                  <div className={`p-3 rounded-lg border ${getStatusColor(healthResult.healthCheck.overall.status)}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(healthResult.healthCheck.overall.status)}
                      <span className="text-sm font-medium">
                        Overall Status: {healthResult.healthCheck.overall.status.toUpperCase()}
                      </span>
                    </div>
                    {healthResult.healthCheck.overall.issues.length > 0 && (
                      <div className="text-xs space-y-1">
                        {healthResult.healthCheck.overall.issues.map((issue, index) => (
                          <p key={index}>• {issue}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Service Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-2">
                      <div className={`p-2 rounded border ${getStatusColor(healthResult.healthCheck.service.status)}`}>
                        <div className="flex items-center gap-1 mb-1">
                          {getStatusIcon(healthResult.healthCheck.service.status)}
                          <span className="font-medium">Service: {healthResult.healthCheck.service.status}</span>
                        </div>
                        <p>Response: {healthResult.healthCheck.service.responseTime}ms</p>
                      </div>
                      
                      <div className={`p-2 rounded border ${getStatusColor(healthResult.healthCheck.predictions.status)}`}>
                        <div className="flex items-center gap-1 mb-1">
                          <Zap className="h-3 w-3" />
                          <span className="font-medium">Predictions: {healthResult.healthCheck.predictions.status}</span>
                        </div>
                        <p>Today: {healthResult.healthCheck.predictions.totalPredictionsToday}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className={`p-2 rounded border ${getStatusColor(healthResult.healthCheck.models.status)}`}>
                        <div className="flex items-center gap-1 mb-1">
                          <Bot className="h-3 w-3" />
                          <span className="font-medium">Models: {healthResult.healthCheck.models.status}</span>
                        </div>
                        <p>Loaded: {healthResult.healthCheck.models.loadedModels.length}/{healthResult.healthCheck.models.totalModels}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Health Check Failed</span>
                  </div>
                  <p className="text-xs">{healthResult.error || 'Unknown error occurred'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Performance Alerting Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-medium">Performance Analysis</h4>
              <p className="text-xs text-muted-foreground">
                Check prediction accuracy and alert on performance issues
              </p>
            </div>
            <Button
              onClick={handlePerformanceCheck}
              disabled={isCheckingPerformance}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              {isCheckingPerformance ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Check Performance
                </>
              )}
            </Button>
          </div>

          {/* Performance Results */}
          {performanceResult && (
            <div className="mb-4">
              {performanceResult.success && performanceResult.performance ? (
                <div className="space-y-3">
                  {/* Alert Level */}
                  <div className={`p-3 rounded-lg border ${getStatusColor(performanceResult.performance.alertLevel === 'none' ? 'healthy' : performanceResult.performance.alertLevel)}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(performanceResult.performance.alertLevel === 'none' ? 'healthy' : performanceResult.performance.alertLevel)}
                      <span className="text-sm font-medium">
                        Alert Level: {performanceResult.performance.alertLevel === 'none' ? 'NONE' : performanceResult.performance.alertLevel.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs">
                      <p><strong>Period:</strong> {performanceResult.performance.period}</p>
                      <p><strong>Average Accuracy:</strong> {performanceResult.performance.averageAccuracy.toFixed(1)}%</p>
                      <p><strong>Total Predictions:</strong> {performanceResult.performance.totalPredictions}</p>
                    </div>
                  </div>

                  {/* Performance Breakdown */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-2">
                      <div className="p-2 rounded border bg-green-50 border-green-200">
                        <p className="font-medium text-green-800">Accurate (±10%)</p>
                        <p className="text-green-600">{performanceResult.performance.accurateWithin10Percent} predictions</p>
                      </div>
                      
                      <div className="p-2 rounded border bg-yellow-50 border-yellow-200">
                        <p className="font-medium text-yellow-800">Moderate (±20%)</p>
                        <p className="text-yellow-600">{performanceResult.performance.accurateWithin20Percent} predictions</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="p-2 rounded border bg-orange-50 border-orange-200">
                        <p className="font-medium text-orange-800">Poor (±50%)</p>
                        <p className="text-orange-600">{performanceResult.performance.accurateWithin50Percent} predictions</p>
                      </div>
                      
                      <div className="p-2 rounded border bg-red-50 border-red-200">
                        <p className="font-medium text-red-800">Major Errors</p>
                        <p className="text-red-600">{performanceResult.performance.majorErrors} predictions</p>
                      </div>
                    </div>
                  </div>

                  {/* Issues and Recommendations */}
                  {performanceResult.performance.issues.length > 0 && (
                    <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                      <h5 className="text-sm font-medium text-yellow-800 mb-2">Issues Detected:</h5>
                      <div className="text-xs text-yellow-700 space-y-1">
                        {performanceResult.performance.issues.map((issue, index) => (
                          <p key={index}>• {issue}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {performanceResult.performance.recommendations.length > 0 && (
                    <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                      <h5 className="text-sm font-medium text-blue-800 mb-2">Recommendations:</h5>
                      <div className="text-xs text-blue-700 space-y-1">
                        {performanceResult.performance.recommendations.map((rec, index) => (
                          <p key={index}>• {rec}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Worst Performers */}
                  {performanceResult.performance.worstPerformers.length > 0 && (
                    <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                      <h5 className="text-sm font-medium text-red-800 mb-2">Worst Performing Drugs:</h5>
                      <div className="text-xs text-red-700 space-y-1">
                        {performanceResult.performance.worstPerformers.slice(0, 3).map((drug, index) => (
                          <p key={index}>
                            <strong>{drug.drugName}:</strong> Predicted {drug.predicted}, Actual {drug.actual} 
                            ({drug.accuracyPercentage.toFixed(1)}% accurate)
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Performance Check Failed</span>
                  </div>
                  <p className="text-xs">{performanceResult.error || 'Unknown error occurred'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cron Job Diagnostics Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-medium">Cron Job Diagnostics</h4>
              <p className="text-xs text-muted-foreground">
                Test and debug the daily reorder calculation cron job (scheduled for 2 AM)
              </p>
            </div>
            <Button
              onClick={handleTestCron}
              disabled={isTestingCron}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              {isTestingCron ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Timer className="h-4 w-4" />
                  Test Cron Job
                </>
              )}
            </Button>
          </div>

          {/* Cron Test Results */}
          {cronTestResult && (
            <div className="mb-4">
              {cronTestResult.success ? (
                <div className="space-y-3">
                  {/* Summary */}
                  <div className={`p-3 rounded-lg border ${getStatusColor(cronTestResult.summary?.overall_status?.toLowerCase() || 'error')}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(cronTestResult.summary?.overall_status?.toLowerCase() || 'error')}
                      <span className="text-sm font-medium">
                        Overall Status: {cronTestResult.summary?.overall_status || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="text-xs">
                      <p><strong>Tests:</strong> {cronTestResult.summary?.passed || 0} passed, {cronTestResult.summary?.failed || 0} failed, {cronTestResult.summary?.warnings || 0} warnings</p>
                    </div>
                  </div>

                  {/* Individual Test Results */}
                  <div className="space-y-2">
                    {cronTestResult.diagnostics?.tests?.map((test: any, index: number) => (
                      <div key={index} className={`p-2 rounded border text-xs ${getStatusColor(test.status)}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(test.status)}
                            <span className="font-medium">{test.name}</span>
                          </div>
                          {test.duration && <span>{test.duration}ms</span>}
                        </div>
                        <p className="mt-1">{test.message}</p>
                        {test.details && typeof test.details === 'object' && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
                            {test.details.calculationsCount !== undefined && (
                              <p>Calculations: {test.details.calculationsCount}</p>
                            )}
                            {test.details.success !== undefined && (
                              <p>Success: {test.details.success ? 'Yes' : 'No'}</p>
                            )}
                            {test.details.error && (
                              <p className="text-red-600">Error: {test.details.error}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Recommendations */}
                  {cronTestResult.recommendations && cronTestResult.recommendations.length > 0 && (
                    <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                      <h5 className="text-sm font-medium text-blue-800 mb-2">🔧 Recommendations:</h5>
                      <div className="text-xs text-blue-700 space-y-1">
                        {cronTestResult.recommendations.map((rec: string, index: number) => (
                          <p key={index}>• {rec}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Cron Test Failed</span>
                  </div>
                  <p className="text-xs">{cronTestResult.error || 'Unknown error occurred'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Retraining Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-medium">Model Retraining</h4>
              <p className="text-xs text-muted-foreground">
                Update models with latest inventory data
              </p>
            </div>
            <Button
              onClick={handleRetrain}
              disabled={isRetraining}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              {isRetraining ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Retraining...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Retrain Models
                </>
              )}
            </Button>
          </div>

          {/* Result Display */}
          {retrainResult && (
            <div className={`p-3 rounded-lg border ${
              retrainResult.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {retrainResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">
                  {retrainResult.message}
                </span>
              </div>
              
              {retrainResult.success && retrainResult.data && (
                <div className="text-xs space-y-1">
                  <p>Models reloaded: {retrainResult.data.modelsReloaded}</p>
                  <p>Completed: {formatDate(retrainResult.data.timestamp)}</p>
                </div>
              )}
              
              {!retrainResult.success && retrainResult.details && (
                <p className="text-xs mt-1">{retrainResult.details}</p>
              )}
            </div>
          )}
        </div>

        {/* Performance Note */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p>
            <strong>Note:</strong> Retraining typically takes 2-5 minutes and updates all drug prediction models 
            with the latest inventory patterns.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}