'use client'

import { useState } from 'react'
import { acceptCalculatedReorderLevel } from '../actions/reorder-actions'
import { useToast } from '@workspace/ui/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { StockLevelBadge } from './stock-level-badge'
import { StockUpdateDialog } from './stock-update-dialog'
import { UsageRecordDialog } from './usage-record-dialog'
import { ReorderLevelDialog } from './reorder-level-dialog'
import { Package, Minus, Search, Filter, TrendingUp, TrendingDown, AlertTriangle, Brain, Check, X } from 'lucide-react'

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
  supplier: string | null
  // Enhanced intelligent reorder fields
  reorderDate: string | null
  daysUntilReorder: number | null
  stockSufficiencyDays: number | null
  reorderRecommendation: string | null
  intelligentReorderLevel: number | null
  preventOverstockingNote: string | null
}

interface InventoryTableProps {
  data: InventoryItem[]
}

export function InventoryTable({ data }: InventoryTableProps) {
  const [search, setSearch] = useState('')
  const [selectedDrug, setSelectedDrug] = useState<InventoryItem | null>(null)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [usageDialogOpen, setUsageDialogOpen] = useState(false)
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'low' | 'normal' | 'good'>('all')
  const [acceptingReorder, setAcceptingReorder] = useState<number | null>(null)
  const { toast } = useToast()

  const filteredData = data.filter(item => {
    const matchesSearch = item.drugName.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || item.stockStatus === filterStatus
    
    return matchesSearch && matchesFilter
  })

  const handleUpdateStock = (drug: InventoryItem) => {
    setSelectedDrug(drug)
    setUpdateDialogOpen(true)
  }

  const handleRecordUsage = (drug: InventoryItem) => {
    setSelectedDrug(drug)
    setUsageDialogOpen(true)
  }

  const handleReorderInfo = (drug: InventoryItem) => {
    setSelectedDrug(drug)
    setReorderDialogOpen(true)
  }

  const handleAcceptMLRecommendation = async (drugId: number) => {
    setAcceptingReorder(drugId)
    try {
      await acceptCalculatedReorderLevel(drugId)
      toast({
        title: 'Success',
        description: 'ML recommendation accepted and reorder level updated',
      })
      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to accept ML recommendation',
        variant: 'destructive',
      })
    } finally {
      setAcceptingReorder(null)
    }
  }

  const getStockIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-critical" />
      case 'low':
        return <TrendingDown className="h-4 w-4 text-warning" />
      case 'normal':
        return <TrendingUp className="h-4 w-4 text-info" />
      case 'good':
        return <TrendingUp className="h-4 w-4 text-success" />
      default:
        return null
    }
  }

  const getRowClass = (status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-critical/5 border-l-4 border-l-critical'
      case 'low':
        return 'bg-warning/5 border-l-4 border-l-warning'
      default:
        return 'transition-all duration-200 ease-in-out hover:bg-muted/50'
    }
  }

  const statusCounts = {
    all: data.length,
    critical: data.filter(item => item.stockStatus === 'critical').length,
    low: data.filter(item => item.stockStatus === 'low').length,
    normal: data.filter(item => item.stockStatus === 'normal').length,
    good: data.filter(item => item.stockStatus === 'good').length,
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header with search and filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search drugs or categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 transition-all duration-200 ease-in-out focus:ring-2 focus:ring-ring"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1 overflow-x-auto">
              {Object.entries(statusCounts).map(([status, count]) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(status as any)}
                  className="text-xs transition-all duration-200 ease-in-out whitespace-nowrap"
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  <span className="ml-1 text-xs opacity-70">({count})</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4 text-center transition-all duration-200 ease-in-out hover:bg-muted/50">
            <div className="text-heading-sm text-critical">{statusCounts.critical}</div>
            <div className="text-caption">Critical</div>
          </div>
          <div className="rounded-lg border p-4 text-center transition-all duration-200 ease-in-out hover:bg-muted/50">
            <div className="text-heading-sm text-warning">{statusCounts.low}</div>
            <div className="text-caption">Low Stock</div>
          </div>
          <div className="rounded-lg border p-4 text-center transition-all duration-200 ease-in-out hover:bg-muted/50">
            <div className="text-heading-sm text-info">{statusCounts.normal}</div>
            <div className="text-caption">Normal</div>
          </div>
          <div className="rounded-lg border p-4 text-center transition-all duration-200 ease-in-out hover:bg-muted/50">
            <div className="text-heading-sm text-success">{statusCounts.good}</div>
            <div className="text-caption">Well Stocked</div>
          </div>
        </div>

        {/* Enhanced table */}
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-heading-sm min-w-[200px]">Drug Name</TableHead>
                  <TableHead className="text-heading-sm min-w-[140px]">Stock Level</TableHead>
                  <TableHead className="text-heading-sm min-w-[120px]">Supplier</TableHead>
                  <TableHead className="text-right text-heading-sm min-w-[280px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 text-muted-foreground" />
                      <div className="text-heading-sm">No drugs found</div>
                      <div className="text-caption">
                        {search ? 'Try adjusting your search terms' : 'No drugs match the current filter'}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.drugId} className={getRowClass(item.stockStatus)}>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        {getStockIcon(item.stockStatus)}
                        <div>
                          <div className="text-heading-sm">{item.drugName}</div>
                          <div className="text-caption">{item.unit}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StockLevelBadge
                        status={item.stockStatus}
                        currentStock={item.currentStock}
                        unit={item.unit}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="text-body-md">
                        {item.supplier || <span className="text-muted-foreground">No supplier</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStock(item)}
                          className="transition-all duration-200 ease-in-out hover:bg-success/10 hover:border-success/20 whitespace-nowrap"
                        >
                          <Package className="mr-1 h-3 w-3" />
                          <span className="hidden sm:inline">Add Stock</span>
                          <span className="sm:hidden">Add</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRecordUsage(item)}
                          className="transition-all duration-200 ease-in-out hover:bg-info/10 hover:border-info/20 whitespace-nowrap"
                        >
                          <Minus className="mr-1 h-3 w-3" />
                          <span className="hidden sm:inline">Record Usage</span>
                          <span className="sm:hidden">Use</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReorderInfo(item)}
                          className="transition-all duration-200 ease-in-out hover:bg-blue/10 hover:border-blue/20 whitespace-nowrap"
                        >
                          <Package className="mr-1 h-3 w-3" />
                          <span className="hidden sm:inline">Reorder Info</span>
                          <span className="sm:hidden">Info</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Results summary */}
        <div className="text-caption text-center">
          Showing {filteredData.length} of {data.length} drugs
          {search && ` matching "${search}"`}
          {filterStatus !== 'all' && ` with ${filterStatus} status`}
        </div>
      </div>

      {selectedDrug && (
        <>
          <StockUpdateDialog
            drug={selectedDrug}
            open={updateDialogOpen}
            onOpenChange={setUpdateDialogOpen}
          />
          <UsageRecordDialog
            drug={selectedDrug}
            open={usageDialogOpen}
            onOpenChange={setUsageDialogOpen}
          />
          <ReorderLevelDialog
            drug={selectedDrug}
            open={reorderDialogOpen}
            onOpenChange={setReorderDialogOpen}
          />
        </>
      )}
    </>
  )
}