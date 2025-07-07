'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@workspace/ui/lib/utils'

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
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card" role="navigation" aria-label="Main navigation">
        <div className="flex h-16 items-center border-b px-6">
          <h1 className="text-xl font-semibold tracking-tight">Pharma Inventory</h1>
        </div>
        <nav className="space-y-2 p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.description}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1">
        <main className="container mx-auto p-6">{children}</main>
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