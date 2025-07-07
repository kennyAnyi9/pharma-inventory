import { Suspense } from 'react'
import Link from 'next/link'
import { db } from '@/lib/db'
import { drugs } from '@workspace/database'
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
  
  // Fetch paginated drugs
  const drugRecords = await db.select().from(drugs)
    .limit(limit)
    .offset(offset)
    
  // Get total count for pagination
  const totalDrugs = await db.select().from(drugs)
  const totalCount = totalDrugs.length
  const totalPages = Math.ceil(totalCount / limit)
  
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
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Pending Orders</div>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Active Alerts</div>
            <div className="text-2xl font-bold text-destructive">0</div>
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