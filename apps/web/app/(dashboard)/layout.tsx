'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@workspace/ui/lib/utils'
import { AlertNotification } from '@/features/alerts/components/alert-notification'
import { ThemeToggle } from '@/components/theme-toggle'
import { useEffect, useState } from 'react'
import { getAlerts } from '@/features/alerts/actions/alert-actions'
import { Button } from '@workspace/ui/components/button'
import { Sheet, SheetContent, SheetTrigger } from '@workspace/ui/components/sheet'
import { Menu, X } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', description: 'View pharmacy dashboard overview' },
  { name: 'Inventory', href: '/inventory', description: 'Manage drug inventory and stock levels' },
  { name: 'Forecasts', href: '/forecasts', description: 'View demand forecasting and predictions' },
  { name: 'Alerts', href: '/alerts', description: 'Check low stock and expiry alerts' },
  { name: 'Orders', href: '/orders', description: 'Manage purchase orders and deliveries' },
]

function AlertNotificationWrapper() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadAlerts = async () => {
    try {
      const activeAlerts = await getAlerts('active')
      setAlerts(activeAlerts.slice(0, 5)) // Show only recent 5
    } catch (error) {
      console.error('Error loading alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
    // Refresh alerts every 30 seconds
    const interval = setInterval(loadAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return null

  const unreadCount = alerts.filter(alert => !alert.isRead).length

  return (
    <AlertNotification 
      alerts={alerts} 
      unreadCount={unreadCount}
      onUpdate={loadAlerts}
    />
  )
}

function NavigationClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const NavigationItems = () => (
    <>
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
            onClick={() => setMobileMenuOpen(false)}
          >
            {item.name}
          </Link>
        )
      })}
    </>
  )

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r bg-card flex-col" role="navigation" aria-label="Main navigation">
        <div className="flex h-16 items-center border-b px-6">
          <h1 className="text-xl font-semibold tracking-tight">Pharma Inventory</h1>
        </div>
        <nav className="flex-1 space-y-2 p-4">
          <NavigationItems />
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1">
        {/* Top header with alerts */}
        <header className="border-b bg-background">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              {/* Mobile Navigation */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <div className="flex h-16 items-center border-b px-6">
                    <h1 className="text-xl font-semibold tracking-tight">Pharma Inventory</h1>
                  </div>
                  <nav className="space-y-2 p-4">
                    <NavigationItems />
                  </nav>
                </SheetContent>
              </Sheet>
              <div className="lg:hidden">
                <h1 className="text-lg font-semibold tracking-tight">Pharma Inventory</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <AlertNotificationWrapper />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
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