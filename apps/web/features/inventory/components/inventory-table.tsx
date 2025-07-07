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
import { Package, Minus, Search } from 'lucide-react'

interface InventoryItem {
  drugId: number
  drugName: string
  unit: string
  category: string
  currentStock: number
  reorderLevel: number
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

  const filteredData = data.filter(item =>
    item.drugName.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  )

  const handleUpdateStock = (drug: InventoryItem) => {
    setSelectedDrug(drug)
    setUpdateDialogOpen(true)
  }

  const handleRecordUsage = (drug: InventoryItem) => {
    setSelectedDrug(drug)
    setUsageDialogOpen(true)
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search drugs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drug Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No drugs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.drugId}>
                    <TableCell className="font-medium">{item.drugName}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <StockLevelBadge
                        status={item.stockStatus}
                        currentStock={item.currentStock}
                        unit={item.unit}
                      />
                    </TableCell>
                    <TableCell>
                      {item.reorderLevel} {item.unit}
                    </TableCell>
                    <TableCell>{item.supplier || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStock(item)}
                        >
                          <Package className="mr-1 h-3 w-3" />
                          Add Stock
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRecordUsage(item)}
                        >
                          <Minus className="mr-1 h-3 w-3" />
                          Record Usage
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
        </>
      )}
    </>
  )
}