'use client'

import { useState } from 'react'
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
import { Package, Minus, Search, Filter, TrendingUp, TrendingDown, AlertTriangle, Brain } from 'lucide-react'

interface InventoryItem {
  drugId: number
  drugName: string
  unit: string
  category: string
  currentStock: number
  reorderLevel: number
  calculatedReorderLevel: number | null
  effectiveReorderLevel: number
  hasCalculatedReorderLevel: boolean
  reorderLevelVariance: number | null
  stockStatus: 'critical' | 'low' | 'normal' | 'good'
  supplier: string | null
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

  const handleReorderLevelAnalysis = (drug: InventoryItem) => {
    setSelectedDrug(drug)
    setReorderDialogOpen(true)
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
                  <TableHead className="text-heading-sm min-w-[120px]">Category</TableHead>
                  <TableHead className="text-heading-sm min-w-[140px]">Stock Level</TableHead>
                  <TableHead className="text-heading-sm min-w-[160px]">Reorder Level</TableHead>
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
                    <TableCell className="text-body-md">{item.category}</TableCell>
                    <TableCell>
                      <StockLevelBadge
                        status={item.stockStatus}
                        currentStock={item.currentStock}
                        unit={item.unit}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-body-md font-medium">
                            {item.effectiveReorderLevel} {item.unit}
                          </span>
                          {item.hasCalculatedReorderLevel && (
                            <div title="ML-optimized">
                              <Brain className="h-3 w-3 text-blue-500" />
                            </div>
                          )}
                        </div>
                        {item.reorderLevelVariance && item.reorderLevelVariance !== 0 && (
                          <div className="text-xs text-muted-foreground">
                            {item.reorderLevelVariance > 0 ? '+' : ''}{item.reorderLevelVariance} from manual
                          </div>
                        )}
                      </div>
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
                          onClick={() => handleReorderLevelAnalysis(item)}
                          className="transition-all duration-200 ease-in-out hover:bg-purple/10 hover:border-purple/20 whitespace-nowrap"
                        >
                          <Brain className="mr-1 h-3 w-3" />
                          <span className="hidden sm:inline">ML Analysis</span>
                          <span className="sm:hidden">ML</span>
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
            drugId={selectedDrug.drugId}
            drugName={selectedDrug.drugName}
            open={reorderDialogOpen}
            onOpenChange={setReorderDialogOpen}
          />
        </>
      )}
    </>
  )
}