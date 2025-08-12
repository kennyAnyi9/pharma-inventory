'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { 
  Package, 
  Minus, 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Settings,
  Clock,
  ChevronRight,
  Activity,
  ArrowUp,
  ArrowDown,
  Equal,
  Zap
} from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'

interface DrugActivity {
  id: number
  drugId: number
  drugName: string
  date: string
  activityType: string
  description: string
  
  // Stock Changes
  previousStock?: number
  newStock?: number
  stockChange?: number
  
  // Reorder Level Changes  
  previousReorderLevel?: number
  newReorderLevel?: number
  reorderLevelChange?: number
  
  // Additional Context
  quantity?: number
  unit?: string
  notes?: string
  source: string
  userId?: string
  
  // ML/System Data
  mlConfidence?: string
  calculationMethod?: string
  
  // Status Changes
  previousStatus?: string
  newStatus?: string
  
  // Metadata
  metadata?: any
  
  createdAt: string
}

interface DrugActivityTimelineProps {
  activities: DrugActivity[]
  drugName: string
  limit?: number
}

export function DrugActivityTimeline({ activities, drugName, limit = 20 }: DrugActivityTimelineProps) {
  const [showAll, setShowAll] = useState(false)
  
  const displayedActivities = showAll ? activities : activities.slice(0, limit)
  
  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'stock_add':
        return <Package className="h-4 w-4 text-success" />
      case 'stock_use':
        return <Minus className="h-4 w-4 text-info" />
      case 'reorder_update':
        return <Settings className="h-4 w-4 text-warning" />
      case 'ml_calculation':
        return <Brain className="h-4 w-4 text-primary" />
      case 'alert_generated':
        return <AlertTriangle className="h-4 w-4 text-critical" />
      case 'stock_status_change':
        return <Activity className="h-4 w-4 text-muted-foreground" />
      case 'system_update':
        return <Zap className="h-4 w-4 text-info" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }
  
  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'stock_add':
        return 'bg-success/10 border-success/20'
      case 'stock_use':
        return 'bg-info/10 border-info/20'
      case 'reorder_update':
        return 'bg-warning/10 border-warning/20'
      case 'ml_calculation':
        return 'bg-primary/10 border-primary/20'
      case 'alert_generated':
        return 'bg-critical/10 border-critical/20'
      case 'stock_status_change':
        return 'bg-muted/10 border-border'
      case 'system_update':
        return 'bg-info/10 border-info/20'
      default:
        return 'bg-muted/10 border-border'
    }
  }
  
  const getSourceBadge = (source: string) => {
    const variants = {
      'user_manual': 'default',
      'ml_system': 'secondary', 
      'cron_job': 'outline',
      'api_update': 'outline',
      'system_automatic': 'secondary'
    } as const
    
    const labels = {
      'user_manual': 'Manual',
      'ml_system': 'AI',
      'cron_job': 'Scheduled',
      'api_update': 'API',
      'system_automatic': 'System'
    }
    
    return (
      <Badge variant={variants[source as keyof typeof variants] || 'outline'} className="text-xs">
        {labels[source as keyof typeof labels] || source}
      </Badge>
    )
  }
  
  const getStockChangeIndicator = (change?: number) => {
    if (!change) return null
    
    if (change > 0) {
      return <ArrowUp className="h-3 w-3 text-success inline ml-1" />
    } else if (change < 0) {
      return <ArrowDown className="h-3 w-3 text-critical inline ml-1" />
    }
    return <Equal className="h-3 w-3 text-muted-foreground inline ml-1" />
  }
  
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }
  
  const groupActivitiesByDate = (activities: DrugActivity[]) => {
    return activities.reduce((groups, activity) => {
      const date = new Date(activity.date).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(activity)
      return groups
    }, {} as Record<string, DrugActivity[]>)
  }
  
  const groupedActivities = groupActivitiesByDate(displayedActivities)
  
  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <div className="text-sm text-muted-foreground">
            No activity recorded yet for {drugName}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
        <CardDescription>
          Detailed activity history for {drugName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([date, dayActivities]) => (
            <div key={date} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                <Clock className="h-4 w-4" />
                {formatDate(dayActivities[0]?.date || date)}
                <Badge variant="outline" className="ml-auto">
                  {dayActivities.length} {dayActivities.length === 1 ? 'activity' : 'activities'}
                </Badge>
              </div>
              
              {/* Activities for the day */}
              <div className="space-y-2 pl-6 border-l border-border">
                {dayActivities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className={cn(
                      "relative p-3 rounded-lg border transition-all duration-200 hover:shadow-sm",
                      getActivityColor(activity.activityType)
                    )}
                  >
                    {/* Activity Icon */}
                    <div className="absolute -left-8 top-3 bg-background rounded-full p-1 border">
                      {getActivityIcon(activity.activityType)}
                    </div>
                    
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {formatTime(activity.createdAt)}
                          </span>
                          {getSourceBadge(activity.source)}
                        </div>
                        
                        {/* ML Confidence */}
                        {activity.mlConfidence && (
                          <Badge variant="secondary" className="text-xs">
                            {parseFloat(activity.mlConfidence).toFixed(1)}% confidence
                          </Badge>
                        )}
                      </div>
                      
                      {/* Description */}
                      <div className="text-sm text-foreground">
                        {activity.description}
                      </div>
                      
                      {/* Stock Changes */}
                      {(activity.previousStock !== null || activity.newStock !== null) && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground bg-background/50 rounded p-2">
                          <span>
                            Stock: {activity.previousStock || 0} → {activity.newStock || 0} {activity.unit}
                            {getStockChangeIndicator(activity.stockChange)}
                          </span>
                          {activity.stockChange && (
                            <span className={activity.stockChange > 0 ? 'text-success' : 'text-critical'}>
                              ({activity.stockChange > 0 ? '+' : ''}{activity.stockChange})
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Reorder Level Changes */}
                      {(activity.previousReorderLevel !== null || activity.newReorderLevel !== null) && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground bg-background/50 rounded p-2">
                          <span>
                            Reorder Level: {activity.previousReorderLevel || 0} → {activity.newReorderLevel || 0}
                            {getStockChangeIndicator(activity.reorderLevelChange)}
                          </span>
                          {activity.calculationMethod && (
                            <Badge variant="outline" className="text-xs">
                              {activity.calculationMethod}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* Status Changes */}
                      {(activity.previousStatus || activity.newStatus) && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground bg-background/50 rounded p-2">
                          <span>
                            Status: {activity.previousStatus} → {activity.newStatus}
                          </span>
                        </div>
                      )}
                      
                      {/* Notes */}
                      {activity.notes && (
                        <div className="text-xs text-muted-foreground italic bg-background/50 rounded p-2">
                          Note: {activity.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Show More Button */}
          {activities.length > limit && (
            <div className="text-center pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowAll(!showAll)}
                className="gap-2"
              >
                {showAll ? 'Show Less' : `Show All (${activities.length - limit} more)`}
                <ChevronRight className={cn("h-4 w-4 transition-transform", showAll && "rotate-90")} />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}