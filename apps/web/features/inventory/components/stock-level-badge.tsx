import { Badge } from '@workspace/ui/components/badge'
import { cn } from '@workspace/ui/lib/utils'

type StockStatus = 'critical' | 'low' | 'normal' | 'good'

interface StockLevelBadgeProps {
  status: StockStatus
  currentStock: number
  unit: string
}

export function StockLevelBadge({ status, currentStock, unit }: StockLevelBadgeProps) {
  const variants = {
    critical: { variant: 'destructive' as const, text: 'Critical' },
    low: { variant: 'warning' as const, text: 'Low Stock' },
    normal: { variant: 'secondary' as const, text: 'Normal' },
    good: { variant: 'success' as const, text: 'Good' },
  }

  const { variant, text } = variants[status]

  return (
    <div className="flex items-center gap-2">
      <Badge variant={variant} className="text-xs">
        {text}
      </Badge>
      <span className="text-sm text-muted-foreground">
        {currentStock} {unit}
      </span>
    </div>
  )
}