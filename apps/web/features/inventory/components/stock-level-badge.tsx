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
    critical: { 
      variant: 'destructive' as const, 
      text: 'Critical',
      className: 'bg-critical/15 text-critical border-critical/20',
      stockClass: 'text-critical font-semibold'
    },
    low: { 
      variant: 'warning' as const, 
      text: 'Low Stock',
      className: 'bg-warning/15 text-warning border-warning/20',
      stockClass: 'text-warning font-semibold'
    },
    normal: { 
      variant: 'secondary' as const, 
      text: 'Normal',
      className: 'bg-info/15 text-info border-info/20',
      stockClass: 'text-info font-medium'
    },
    good: { 
      variant: 'success' as const, 
      text: 'Well Stocked',
      className: 'bg-success/15 text-success border-success/20',
      stockClass: 'text-success font-medium'
    },
  }

  const { variant, text, className, stockClass } = variants[status]

  return (
    <div className="flex flex-col gap-1">
      <Badge 
        variant={variant} 
        className={cn('text-xs font-medium transition-all duration-200 ease-in-out', className)}
      >
        {text}
      </Badge>
      <div className={cn('text-body-sm', stockClass)}>
        {currentStock} {unit}
      </div>
    </div>
  )
}