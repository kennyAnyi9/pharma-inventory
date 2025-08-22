'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Progress } from '@workspace/ui/components/progress'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Clock,
  Activity,
  Server,
  Database,
  Brain,
  Shield,
  Globe
} from 'lucide-react'

interface ServiceStatus {
  serviceName: string
  description: string
  category: string
  status: 'up' | 'down' | 'degraded' | null
  responseTime: number | null
  statusCode: number | null
  errorMessage: string | null
  checkedAt: string | null
  uptime: number
  totalChecks: number
  avgResponseTime: number | null
  lastChecked: string | null
}

interface StatusResponse {
  timestamp: string
  overallStatus: 'operational' | 'down' | 'degraded'
  summary: {
    total: number
    up: number
    down: number
    degraded: number
  }
  services: ServiceStatus[]
}

const CategoryIcons = {
  web: Globe,
  api: Server,
  database: Database,
  ml: Brain,
  auth: Shield,
} as const

const StatusIcons = {
  up: CheckCircle,
  down: XCircle,
  degraded: AlertTriangle,
} as const

const StatusColors = {
  up: 'bg-green-500',
  down: 'bg-red-500',
  degraded: 'bg-yellow-500',
} as const

const OverallStatusColors = {
  operational: 'text-green-600 bg-green-50 border-green-200',
  down: 'text-red-600 bg-red-50 border-red-200',
  degraded: 'text-yellow-600 bg-yellow-50 border-yellow-200',
} as const

function formatUptime(uptime: number): string {
  if (uptime >= 99.99) return '99.99%'
  return `${uptime.toFixed(2)}%`
}

function formatResponseTime(ms: number | null): string {
  if (!ms) return 'N/A'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function getRelativeTime(timestamp: string | null): string {
  if (!timestamp) return 'Never'
  
  const now = new Date()
  const time = new Date(timestamp)
  const diffMs = now.getTime() - time.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export default function StatusPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchStatus = async () => {
    try {
      setError(null)
      const response = await fetch('/api/status/current')
      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.status}`)
      }
      const data = await response.json()
      setStatus(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const runHealthCheck = async () => {
    try {
      setLoading(true)
      await fetch('/api/status/check', { method: 'POST' })
      // Fetch updated status after check
      await fetchStatus()
    } catch {
      setError('Failed to run health check')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchStatus()
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh])

  if (loading && !status) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Loading system status...
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Pharma Inventory System Status
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Real-time monitoring of all system components
          </p>
          
          {lastUpdated && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()} • Next update in {Math.floor((30000 - (Date.now() - lastUpdated.getTime())) / 1000)}s
            </p>
          )}
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <XCircle className="h-4 w-4" />
                {error}
              </div>
            </CardContent>
          </Card>
        )}

        {status && (
          <>
            {/* Overall Status */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border font-medium ${OverallStatusColors[status.overallStatus]}`}>
                    {status.overallStatus === 'operational' && <CheckCircle className="h-4 w-4" />}
                    {status.overallStatus === 'down' && <XCircle className="h-4 w-4" />}
                    {status.overallStatus === 'degraded' && <AlertTriangle className="h-4 w-4" />}
                    
                    {status.overallStatus === 'operational' && 'All Systems Operational'}
                    {status.overallStatus === 'down' && 'Some Systems Down'}
                    {status.overallStatus === 'degraded' && 'Some Systems Degraded'}
                  </div>
                  
                  <div className="mt-4 flex justify-center gap-6 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {status.summary.up} Up
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      {status.summary.degraded} Degraded
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      {status.summary.down} Down
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Service Status
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Auto-refresh {autoRefresh ? 'On' : 'Off'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runHealthCheck}
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Run Check
                </Button>
              </div>
            </div>

            {/* Services Grid */}
            <div className="grid gap-4">
              {status.services.map((service) => {
                const CategoryIcon = CategoryIcons[service.category as keyof typeof CategoryIcons] || Server
                const StatusIcon = service.status ? StatusIcons[service.status] : Clock
                
                return (
                  <Card key={service.serviceName} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <CategoryIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-slate-900 dark:text-slate-100">
                              {service.serviceName}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {service.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* Uptime */}
                          <div className="text-right">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {formatUptime(service.uptime)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Uptime (24h)
                            </div>
                          </div>
                          
                          {/* Response Time */}
                          <div className="text-right">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {formatResponseTime(service.avgResponseTime)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Avg Response
                            </div>
                          </div>
                          
                          {/* Status */}
                          <div className="flex items-center gap-2">
                            {service.status ? (
                              <StatusIcon className={`h-5 w-5 ${
                                service.status === 'up' ? 'text-green-500' :
                                service.status === 'down' ? 'text-red-500' :
                                'text-yellow-500'
                              }`} />
                            ) : (
                              <Clock className="h-5 w-5 text-slate-400" />
                            )}
                            <div className="text-right">
                              <div className={`text-sm font-medium capitalize ${
                                service.status === 'up' ? 'text-green-600 dark:text-green-400' :
                                service.status === 'down' ? 'text-red-600 dark:text-red-400' :
                                service.status === 'degraded' ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-slate-500 dark:text-slate-400'
                              }`}>
                                {service.status || 'Unknown'}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {getRelativeTime(service.lastChecked)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Error Message */}
                      {service.errorMessage && (
                        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                          {service.errorMessage}
                        </div>
                      )}
                      
                      {/* Uptime Bar */}
                      <div className="mt-3">
                        <Progress 
                          value={service.uptime} 
                          className="h-1.5"
                        />
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span>{formatUptime(service.uptime)} uptime</span>
                          <span>{service.totalChecks} checks in 24h</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
              <p>Status page powered by Pharma Inventory System</p>
              <p>Automated health checks run every 5 minutes</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}