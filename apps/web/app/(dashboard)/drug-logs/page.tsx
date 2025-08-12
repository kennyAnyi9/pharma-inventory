'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select'
import { DrugActivityTimeline } from '@/components/drug-activity-timeline'
import { 
  Activity, 
  Search, 
  Calendar, 
  RefreshCw,
  FileText,
  Package,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { Badge } from '@workspace/ui/components/badge'

interface Drug {
  id: number
  name: string
  unit: string
  currentStock: number
  reorderLevel: number
}

interface DrugActivity {
  id: number
  drugId: number
  drugName: string
  date: string
  activityType: string
  description: string
  previousStock?: number
  newStock?: number
  stockChange?: number
  previousReorderLevel?: number
  newReorderLevel?: number
  reorderLevelChange?: number
  quantity?: number
  unit?: string
  notes?: string
  source: string
  userId?: string
  mlConfidence?: string
  calculationMethod?: string
  previousStatus?: string
  newStatus?: string
  metadata?: any
  createdAt: string
}

interface DailySummary {
  drugId: number
  drugName: string
  activities: DrugActivity[]
  totalStockChange: number
  reorderLevelChanges: number
}

export default function DrugLogsPage() {
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]!)
  const [activities, setActivities] = useState<DrugActivity[]>([])
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([])
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'drug' | 'daily'>('daily')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch drugs for selection
  useEffect(() => {
    const fetchDrugs = async () => {
      try {
        const response = await fetch('/api/drugs')
        if (response.ok) {
          const data = await response.json()
          setDrugs(data)
        }
      } catch (error) {
        console.error('Failed to fetch drugs:', error)
      }
    }
    fetchDrugs()
  }, [])

  // Fetch drug-specific activity
  const fetchDrugActivity = async (drugId: number) => {
    setLoading(true)
    let errorOccurred = false
    try {
      const response = await fetch(`/api/drug-activity?drugId=${drugId}&limit=100`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
      } else {
        console.error('Failed to fetch drug activity')
        setActivities([])
        errorOccurred = true
      }
    } catch (error) {
      console.error('Error fetching drug activity:', error)
      setActivities([])
      errorOccurred = true
    } finally {
      setLoading(false)
      if (errorOccurred) {
        // Consider adding a toast notification or error state
        // to inform the user about the failure
      }
    }
  }

  // Fetch daily summary for all drugs
  const fetchDailySummary = async (date: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/drug-activity?date=${date}`)
      if (response.ok) {
        const data = await response.json()
        setDailySummary(data.summary || [])
      } else {
        console.error('Failed to fetch daily summary')
        setDailySummary([])
      }
    } catch (error) {
      console.error('Error fetching daily summary:', error)
      setDailySummary([])
    } finally {
      setLoading(false)
    }
  }

  // Load data based on view
  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      if (!isMounted) return

      if (view === 'drug' && selectedDrug) {
        await fetchDrugActivity(selectedDrug.id)
      } else if (view === 'daily') {
        await fetchDailySummary(selectedDate)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [view, selectedDrug, selectedDate])

  // Filter drugs based on search
  const filteredDrugs = drugs.filter(drug =>
    drug.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filter daily summary based on search
  const filteredSummary = dailySummary.filter(item =>
    item.drugName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getSummaryStats = (activities: DrugActivity[]) => {
    return {
      stockAdditions: activities.filter(a => a.activityType === 'stock_add').length,
      stockUsage: activities.filter(a => a.activityType === 'stock_use').length,
      reorderUpdates: activities.filter(a => a.activityType === 'reorder_update').length,
      mlCalculations: activities.filter(a => a.activityType === 'ml_calculation').length,
      alerts: activities.filter(a => a.activityType === 'alert_generated').length,
    }
  }

  const getDailyStats = () => {
    const allActivities = dailySummary.flatMap(item => item.activities)
    return getSummaryStats(allActivities)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Drug Activity Logs
          </h1>
          <p className="text-muted-foreground">
            Comprehensive tracking of all drug-related activities and changes
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={view === 'daily' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('daily')}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Daily View
            </Button>
            <Button
              variant={view === 'drug' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('drug')}
            >
              <Package className="h-4 w-4 mr-1" />
              Drug View
            </Button>
          </div>
          
          <Button onClick={() => {
            if (view === 'drug' && selectedDrug) {
              fetchDrugActivity(selectedDrug.id)
            } else if (view === 'daily') {
              fetchDailySummary(selectedDate)
            }
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search drugs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {view === 'daily' ? (
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            ) : (
              <Select value={selectedDrug?.id.toString() || ''} onValueChange={(value) => {
                const drug = drugs.find(d => d.id === parseInt(value))
                setSelectedDrug(drug || null)
              }}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a drug" />
                </SelectTrigger>
                <SelectContent>
                  {filteredDrugs.map((drug) => (
                    <SelectItem key={drug.id} value={drug.id.toString()}>
                      {drug.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      {view === 'daily' && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(() => {
            const stats = getDailyStats()
            return (
              <>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-success">{stats.stockAdditions}</div>
                    <div className="text-sm text-muted-foreground">Stock Additions</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-info">{stats.stockUsage}</div>
                    <div className="text-sm text-muted-foreground">Usage Records</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-warning">{stats.reorderUpdates}</div>
                    <div className="text-sm text-muted-foreground">Reorder Updates</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{stats.mlCalculations}</div>
                    <div className="text-sm text-muted-foreground">ML Calculations</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-critical">{stats.alerts}</div>
                    <div className="text-sm text-muted-foreground">Alerts Generated</div>
                  </CardContent>
                </Card>
              </>
            )
          })()}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <div className="text-sm text-muted-foreground">Loading activity data...</div>
          </CardContent>
        </Card>
      ) : view === 'drug' && selectedDrug ? (
        /* Drug Timeline View */
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {selectedDrug.name}
              </CardTitle>
              <CardDescription>
                Current Stock: {selectedDrug.currentStock} {selectedDrug.unit} | 
                Reorder Level: {selectedDrug.reorderLevel}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {(() => {
                  const stats = getSummaryStats(activities)
                  return (
                    <>
                      <div className="text-center">
                        <div className="text-xl font-bold text-success">{stats.stockAdditions}</div>
                        <div className="text-sm text-muted-foreground">Additions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-info">{stats.stockUsage}</div>
                        <div className="text-sm text-muted-foreground">Usage</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-warning">{stats.reorderUpdates}</div>
                        <div className="text-sm text-muted-foreground">Reorder</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary">{stats.mlCalculations}</div>
                        <div className="text-sm text-muted-foreground">ML Calc</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-critical">{stats.alerts}</div>
                        <div className="text-sm text-muted-foreground">Alerts</div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </CardContent>
          </Card>
          
          <DrugActivityTimeline 
            activities={activities} 
            drugName={selectedDrug.name}
            limit={20}
          />
        </div>
      ) : view === 'daily' ? (
        /* Daily Summary View */
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Daily Summary - {new Date(selectedDate).toLocaleDateString()}
              </CardTitle>
              <CardDescription>
                Activity summary for all drugs on {new Date(selectedDate).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredSummary.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <div className="text-sm text-muted-foreground">
                    No activity recorded for this date
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSummary.map((drugSummary) => (
                    <Card key={drugSummary.drugId} className="border-l-4 border-l-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">{drugSummary.drugName}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{drugSummary.activities.length} activities</span>
                              {drugSummary.totalStockChange !== 0 && (
                                <Badge variant={drugSummary.totalStockChange > 0 ? 'default' : 'secondary'}>
                                  Stock: {drugSummary.totalStockChange > 0 ? '+' : ''}{drugSummary.totalStockChange}
                                </Badge>
                              )}
                              {drugSummary.reorderLevelChanges > 0 && (
                                <Badge variant="outline">
                                  Reorder changes: {drugSummary.reorderLevelChanges}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const drug = drugs.find(d => d.id === drugSummary.drugId)
                              if (drug) {
                                setSelectedDrug(drug)
                                setView('drug')
                              }
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                        
                        {/* Activity Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          {(() => {
                            const stats = getSummaryStats(drugSummary.activities)
                            return (
                              <>
                                {stats.stockAdditions > 0 && (
                                  <div className="flex items-center gap-1 text-success">
                                    <TrendingUp className="h-3 w-3" />
                                    {stats.stockAdditions} additions
                                  </div>
                                )}
                                {stats.stockUsage > 0 && (
                                  <div className="flex items-center gap-1 text-info">
                                    <Activity className="h-3 w-3" />
                                    {stats.stockUsage} usage
                                  </div>
                                )}
                                {stats.reorderUpdates > 0 && (
                                  <div className="flex items-center gap-1 text-warning">
                                    <RefreshCw className="h-3 w-3" />
                                    {stats.reorderUpdates} reorder
                                  </div>
                                )}
                                {stats.alerts > 0 && (
                                  <div className="flex items-center gap-1 text-critical">
                                    <AlertCircle className="h-3 w-3" />
                                    {stats.alerts} alerts
                                  </div>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <div className="text-sm text-muted-foreground">
              Select a drug to view its activity timeline
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}