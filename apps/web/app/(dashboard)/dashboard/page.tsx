import { Suspense } from 'react'
import Link from 'next/link'
import { db } from '@/lib/db'
import { drugs } from '@workspace/database'
import { getInventoryStatus } from '@/features/inventory/actions/inventory-actions'
import { getAlertCounts } from '@/features/alerts/actions/alert-actions'
import { getOrderStats } from '@/features/orders/actions/order-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@workspace/ui/components/table'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'

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
  const [drugRecords, totalDrugs, inventoryStatus, alertCounts, orderStats] = await Promise.all([
    db.select().from(drugs).limit(limit).offset(offset),
    db.select().from(drugs),
    getInventoryStatus().catch(() => []),
    getAlertCounts().catch(() => ({ active: 0, acknowledged: 0, resolved: 0, total: 0 })),
    getOrderStats().catch(() => ({ draft: 0, pending: 0, approved: 0, ordered: 0, delivered: 0, completed: 0, total: 0 }))
  ])
  
  const totalCount = totalDrugs.length
  const totalPages = Math.ceil(totalCount / limit)
  
  // Calculate inventory stats
  const lowStockCount = inventoryStatus.filter(item => 
    item.stockStatus === 'critical' || item.stockStatus === 'low'
  ).length
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Total Drugs</div>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Low Stock</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {lowStockCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Pending Orders</div>
            <div className="text-2xl font-bold">
              {orderStats.pending + orderStats.draft}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Active Alerts</div>
            <div className="text-2xl font-bold text-destructive">
              {alertCounts.active}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Inventory Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Critical:</span>
                <span className="font-medium text-red-600">
                  {inventoryStatus.filter(item => item.stockStatus === 'critical').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Low:</span>
                <span className="font-medium text-orange-600">
                  {inventoryStatus.filter(item => item.stockStatus === 'low').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Normal:</span>
                <span className="font-medium text-green-600">
                  {inventoryStatus.filter(item => item.stockStatus === 'normal').length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Approved:</span>
                <span className="font-medium">{orderStats.approved}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Ordered:</span>
                <span className="font-medium">{orderStats.ordered}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivered:</span>
                <span className="font-medium">{orderStats.delivered}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Alert Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active:</span>
                <span className="font-medium text-red-600">{alertCounts.active}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Acknowledged:</span>
                <span className="font-medium text-yellow-600">{alertCounts.acknowledged}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Resolved:</span>
                <span className="font-medium text-green-600">{alertCounts.resolved}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drug List Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Drugs in System</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Reorder Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drugRecords.map((drug) => (
                <TableRow key={drug.id}>
                  <TableCell className="font-medium">{drug.name}</TableCell>
                  <TableCell>{drug.category}</TableCell>
                  <TableCell>{drug.unit}</TableCell>
                  <TableCell>{drug.reorderLevel}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {offset + 1} to {Math.min(offset + limit, totalCount)} of {totalCount} results
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard?page=${page - 1}&limit=${limit}`}>
                    Previous
                  </Link>
                </Button>
              )}
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild>
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