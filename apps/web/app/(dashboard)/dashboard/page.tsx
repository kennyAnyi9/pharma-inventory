import { Suspense } from 'react'
import { db } from '@/lib/db'
import { drugs } from '@workspace/database'
import { desc, asc } from 'drizzle-orm'

interface DashboardContentProps {
  searchParams?: Promise<{ 
    page?: string;
    limit?: string;
  }>
}

// Loading component
function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-6"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
        ))}
      </div>
      <div className="bg-gray-200 h-64 rounded-lg"></div>
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
    .orderBy(asc(drugs.name))
    
  // Get total count for pagination
  const totalDrugs = await db.select().from(drugs)
  const totalCount = totalDrugs.length
  const totalPages = Math.ceil(totalCount / limit)
  
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Drugs</h3>
          <p className="text-3xl font-bold mt-2">{totalCount}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Low Stock</h3>
          <p className="text-3xl font-bold mt-2 text-yellow-600">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Pending Orders</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Active Alerts</h3>
          <p className="text-3xl font-bold mt-2 text-red-600">0</p>
        </div>
      </div>
      
      {/* Drug List Preview */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Drugs in System</h3>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reorder Level
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {drugRecords.map((drug) => (
                <tr key={drug.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {drug.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {drug.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {drug.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {drug.reorderLevel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {offset + 1} to {Math.min(offset + limit, totalCount)} of {totalCount} results
            </div>
            <div className="flex space-x-2">
              {page > 1 && (
                <a
                  href={`/dashboard?page=${page - 1}&limit=${limit}`}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  Previous
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`/dashboard?page=${page + 1}&limit=${limit}`}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  Next
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function DashboardPage({ searchParams }: DashboardContentProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}