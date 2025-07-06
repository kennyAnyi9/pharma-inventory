'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', description: 'View pharmacy dashboard overview' },
  { name: 'Inventory', href: '/inventory', description: 'Manage drug inventory and stock levels' },
  { name: 'Forecasts', href: '/forecasts', description: 'View demand forecasting and predictions' },
  { name: 'Alerts', href: '/alerts', description: 'Check low stock and expiry alerts' },
  { name: 'Orders', href: '/orders', description: 'Manage purchase orders and deliveries' },
]

function NavigationClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-sm" role="navigation" aria-label="Main navigation">
        <div className="flex h-16 items-center border-b px-6">
          <h1 className="text-xl font-semibold">Pharma Inventory</h1>
        </div>
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.description}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1">
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <NavigationClient>{children}</NavigationClient>
}