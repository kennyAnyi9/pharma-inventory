'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@workspace/ui/lib/utils'
import { AlertNotification } from '@/features/alerts/components/alert-notification'
import { ThemeToggle } from '@/components/theme-toggle'
import { useEffect, useState } from 'react'
import { getAlerts } from '@/features/alerts/actions/alert-actions'
import { Button } from '@workspace/ui/components/button'
import { Sheet, SheetContent, SheetTrigger } from '@workspace/ui/components/sheet'
import { Menu, LogOut, User, Shield, Crown, LayoutDashboard, Package, AlertTriangle, BarChart3, Activity, TrendingUp } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { UserRole } from '@workspace/database'
import { hasRole } from '@/lib/roles'

// Define navigation items with role requirements and icons
const allNavigationItems = [
  { name: 'Overview', href: '/dashboard', description: 'View pharmacy dashboard overview', minRole: 'operator' as UserRole, icon: LayoutDashboard },
  { name: 'Inventory', href: '/dashboard/inventory', description: 'Manage drug inventory and stock levels', minRole: 'operator' as UserRole, icon: Package },
  { name: 'Alerts', href: '/dashboard/alerts', description: 'Check low stock and expiry alerts', minRole: 'operator' as UserRole, icon: AlertTriangle },
  { name: 'Forecasts', href: '/dashboard/forecasts', description: 'View ML forecasts and predictions', minRole: 'super_admin' as UserRole, icon: TrendingUp },
  { name: 'Reports', href: '/dashboard/reports', description: 'View comprehensive daily analytics and ML performance reports', minRole: 'admin' as UserRole, icon: BarChart3 },
  { name: 'Activity Logs', href: '/dashboard/drug-logs', description: 'Track detailed drug activity and system changes', minRole: 'admin' as UserRole, icon: Activity },
]

// Filter navigation based on user role
function getNavigationForRole(userRole: UserRole) {
  return allNavigationItems.filter(item => hasRole(userRole, item.minRole))
}

// Get role display information
function getRoleInfo(role: UserRole) {
  switch (role) {
    case 'super_admin':
      return {
        label: 'Super Admin',
        icon: Crown,
        color: 'text-purple-600 bg-purple-100 border-purple-200',
        description: 'Full system access'
      }
    case 'admin':
      return {
        label: 'Admin',
        icon: Shield,
        color: 'text-blue-600 bg-blue-100 border-blue-200',
        description: 'Administrative access'
      }
    case 'operator':
      return {
        label: 'Operator',
        icon: User,
        color: 'text-green-600 bg-green-100 border-green-200',
        description: 'Standard access'
      }
    default:
      return {
        label: 'User',
        icon: User,
        color: 'text-gray-600 bg-gray-100 border-gray-200',
        description: 'Basic access'
      }
  }
}

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
  const { data: session } = useSession()
  
  // Get navigation items based on user role
  const userRole = session?.user?.role || 'operator'
  const navigation = getNavigationForRole(userRole)

  const NavigationItems = () => (
    <>
      {navigation.map((item) => {
        const isActive = pathname === item.href
        const IconComponent = item.icon
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150 group relative",
              isActive
                ? "bg-primary/10 text-primary border-l-2 border-primary"
                : "text-foreground/70 hover:text-foreground hover:bg-accent/50"
            )}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.description}
            onClick={() => setMobileMenuOpen(false)}
          >
            <IconComponent className="h-4 w-4 flex-shrink-0" />
            <span className="relative z-10">{item.name}</span>
            {isActive && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-md" />
            )}
          </Link>
        )
      })}
    </>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header Bar - Full Width */}
      <header className="h-14 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-50">
        <div className="flex h-full items-center justify-between px-6">
          {/* Left side - Logo and Mobile Menu */}
          <div className="flex items-center gap-4">
            {/* Mobile Navigation */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Toggle navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-sidebar border-r">
                <div className="flex h-14 items-center border-b px-6">
                  <h1 className="text-lg font-semibold tracking-tight text-sidebar-foreground">Pharma Inventory</h1>
                </div>
                <nav className="space-y-1 p-4">
                  <NavigationItems />
                </nav>
              </SheetContent>
            </Sheet>
            
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">P</span>
              </div>
              <h1 className="text-lg font-semibold tracking-tight">Pharma Inventory</h1>
            </div>
          </div>

          {/* Right side - User controls */}
          <div className="flex items-center gap-3">
            <AlertNotificationWrapper />
            <ThemeToggle />
            <Button
              variant="default"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/' })}
              title="Sign out"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Left Sidebar - Hidden on Mobile */}
        <aside className="hidden lg:flex w-64 border-r bg-sidebar/50 flex-col" role="navigation" aria-label="Main navigation">
          <nav className="flex-1 space-y-1 p-4 pt-6">
            <NavigationItems />
          </nav>
          
          {/* Sidebar Footer - User Info */}
          {session?.user && (
            <div className="p-4 border-t bg-sidebar/80">
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${getRoleInfo(userRole).color}`}>
                  {(() => {
                    const roleInfo = getRoleInfo(userRole)
                    const IconComponent = roleInfo.icon
                    return (
                      <>
                        <IconComponent className="h-3 w-3" />
                        <span>{roleInfo.label}</span>
                      </>
                    )
                  })()}
                </div>
              </div>
              <div className="text-xs">
                <p className="font-medium text-foreground">{session.user.name}</p>
                <p className="text-muted-foreground truncate">{session.user.email}</p>
              </div>
            </div>
          )}
          
          {!session?.user && (
            <div className="p-4 border-t bg-sidebar/80">
              <div className="text-xs text-muted-foreground">
                <p>© 2024 Pharma Inventory</p>
                <p className="mt-1">v1.0.0</p>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="h-full">
            <div className="p-6 max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
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