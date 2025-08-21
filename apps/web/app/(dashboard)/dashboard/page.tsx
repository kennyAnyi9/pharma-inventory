import { Suspense } from 'react'
import Link from 'next/link'
import { db } from '@/lib/db'
import { drugs, reorderCalculations, inventory } from '@workspace/database'
import { eq, and, sql } from 'drizzle-orm'
import { getInventoryStatus } from '@/features/inventory/actions/inventory-actions'
import { getAlertCounts } from '@/features/alerts/actions/alert-actions'
import { getEffectiveReorderLevel } from '@/lib/reorder-level-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@workspace/ui/components/table'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'

// Force dynamic rendering - no caching for real-time dashboard
export const dynamic = 'force-dynamic'

interface DashboardContentProps {
  searchParams?: Promise<{ 
    page?: string;
    limit?: string;
  }>
}

// Loading component
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

// Data fetching component
async function DashboardContent({ searchParams }: DashboardContentProps) {
  const resolvedSearchParams = await searchParams
  const page = parseInt(resolvedSearchParams?.page || '1')
  const limit = parseInt(resolvedSearchParams?.limit || '10')
  const offset = (page - 1) * limit
  
  // Fetch all data in parallel
  const [drugRecordsRaw, totalDrugs, inventoryStatus, alertCounts] = await Promise.all([
    db.select({
        id: drugs.id,
        name: drugs.name,
        unit: drugs.unit,
        reorderLevel: drugs.reorderLevel,
        calculatedReorderLevel: drugs.calculatedReorderLevel,
        intelligentReorderLevel: reorderCalculations.intelligentReorderLevel,
        currentStock: inventory.closingStock,
      })
      .from(drugs)
      .leftJoin(
        reorderCalculations,
        and(
          eq(drugs.id, reorderCalculations.drugId),
          eq(
            reorderCalculations.calculationDate,
            sql`(SELECT MAX(calculation_date) FROM reorder_calculations WHERE drug_id = ${drugs.id})`
          )
        )
      )
      .leftJoin(
        inventory,
        and(
          eq(drugs.id, inventory.drugId),
          eq(
            inventory.date,
            sql`(SELECT MAX(date) FROM inventory WHERE drug_id = ${drugs.id})`
          )
        )
      )
      .limit(limit)
      .offset(offset),
    db.select().from(drugs),
    getInventoryStatus().catch(() => []),
    getAlertCounts().catch(() => ({ active: 0, acknowledged: 0, resolved: 0, total: 0 }))
  ])
  
  // Apply unified reorder level logic
  const drugRecords = drugRecordsRaw.map(drug => ({
    ...drug,
    effectiveReorderLevel: getEffectiveReorderLevel({
      intelligentReorderLevel: drug.intelligentReorderLevel,
      calculatedReorderLevel: drug.calculatedReorderLevel,
      reorderLevel: drug.reorderLevel
    })
  }))
  
  const totalCount = totalDrugs.length
  const totalPages = Math.ceil(totalCount / limit)
  
  // Calculate inventory stats
  const lowStockCount = inventoryStatus.filter(item => 
    item.stockStatus === 'critical' || item.stockStatus === 'low'
  ).length
  
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-display-md">Dashboard</h1>
        <p className="text-body-lg text-muted-foreground">
          Monitor your pharmaceutical inventory system at a glance
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="text-caption uppercase tracking-wide">Total Drugs</div>
            <div className="text-display-sm text-info">{totalCount}</div>
            <div className="text-body-sm text-muted-foreground">
              Registered in system
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="text-caption uppercase tracking-wide">Low Stock</div>
            <div className="text-display-sm text-warning">
              {lowStockCount}
            </div>
            <div className="text-body-sm text-muted-foreground">
              Require attention
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="text-caption uppercase tracking-wide">Active Alerts</div>
            <div className="text-display-sm text-critical">
              {alertCounts.active}
            </div>
            <div className="text-body-sm text-muted-foreground">
              Need immediate action
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Detailed Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-heading-sm flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-info"></div>
              Inventory Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-body-md">Critical</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-critical"></div>
                <span className="text-heading-sm text-critical">
                  {inventoryStatus.filter(item => item.stockStatus === 'critical').length}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-body-md">Low Stock</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-warning"></div>
                <span className="text-heading-sm text-warning">
                  {inventoryStatus.filter(item => item.stockStatus === 'low').length}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-body-md">Normal</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-info"></div>
                <span className="text-heading-sm text-info">
                  {inventoryStatus.filter(item => item.stockStatus === 'normal').length}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-body-md">Well Stocked</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success"></div>
                <span className="text-heading-sm text-success">
                  {inventoryStatus.filter(item => item.stockStatus === 'good').length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-heading-sm flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-critical"></div>
              Alert Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-body-md">Active</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-critical"></div>
                <span className="text-heading-sm text-critical">{alertCounts.active}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-body-md">Acknowledged</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-warning"></div>
                <span className="text-heading-sm text-warning">{alertCounts.acknowledged}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-body-md">Resolved</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success"></div>
                <span className="text-heading-sm text-success">{alertCounts.resolved}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drug List Preview */}
      <Card className="card-hover">
        <CardHeader className="pb-3">
          <CardTitle className="text-heading-lg flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-info"></div>
            Drugs in System
          </CardTitle>
          <p className="text-body-md text-muted-foreground">
            Quick overview of registered pharmaceutical products
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-heading-sm">Name</TableHead>
                  <TableHead className="text-heading-sm">Stock Level</TableHead>
                  <TableHead className="text-heading-sm">Reorder Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drugRecords.map((drug) => {
                  const stockLevel = drug.currentStock ?? 0
                  const stockStatus = stockLevel <= drug.effectiveReorderLevel 
                    ? stockLevel === 0 
                      ? 'critical' 
                      : 'low'
                    : stockLevel > drug.effectiveReorderLevel * 2
                      ? 'good'
                      : 'normal'
                  
                  const stockColor = stockStatus === 'critical' 
                    ? 'text-critical' 
                    : stockStatus === 'low' 
                      ? 'text-warning' 
                      : stockStatus === 'good' 
                        ? 'text-success' 
                        : 'text-info'
                  
                  return (
                    <TableRow key={drug.id} className="transition-all duration-200 ease-in-out hover:bg-muted/50">
                      <TableCell className="py-3">
                        <div className="text-heading-sm">{drug.name}</div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className={`text-body-md font-medium ${stockColor}`}>
                          {stockLevel} {drug.unit}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="text-body-md font-medium">{drug.effectiveReorderLevel} {drug.unit}</div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-6">
            <p className="text-caption">
              Showing {offset + 1} to {Math.min(offset + limit, totalCount)} of {totalCount} results
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild className="transition-all duration-200 ease-in-out">
                  <Link href={`/dashboard?page=${page - 1}&limit=${limit}`}>
                    Previous
                  </Link>
                </Button>
              )}
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild className="transition-all duration-200 ease-in-out">
                  <Link href={`/dashboard?page=${page + 1}&limit=${limit}`}>
                    Next
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function DashboardPage({ searchParams }: DashboardContentProps) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  )
}