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
import { Menu, LogOut, User, Shield, Crown } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { UserRole } from '@workspace/database'
import { hasRole } from '@/lib/roles'

// Define navigation items with role requirements
const allNavigationItems = [
  { name: 'Dashboard', href: '/dashboard', description: 'View pharmacy dashboard overview', minRole: 'operator' as UserRole },
  { name: 'Inventory', href: '/dashboard/inventory', description: 'Manage drug inventory and stock levels', minRole: 'operator' as UserRole },
  { name: 'Alerts', href: '/dashboard/alerts', description: 'Check low stock and expiry alerts', minRole: 'operator' as UserRole },
  { name: 'Reports', href: '/dashboard/reports', description: 'View comprehensive daily analytics and ML performance reports', minRole: 'admin' as UserRole },
  { name: 'Activity Logs', href: '/dashboard/drug-logs', description: 'Track detailed drug activity and system changes', minRole: 'admin' as UserRole },
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
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
      <aside className="hidden lg:flex w-64 border-r bg-sidebar shadow-soft flex-col" role="navigation" aria-label="Main navigation">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <h1 className="text-xl font-semibold tracking-tight text-sidebar-foreground">Pharma Inventory</h1>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <NavigationItems />
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1">
        {/* Top header with alerts */}
        <header className="border-b bg-card shadow-soft sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-card/80">
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
                <SheetContent side="left" className="w-64 p-0 bg-sidebar">
                  <div className="flex h-16 items-center border-b border-sidebar-border px-6">
                    <h1 className="text-xl font-semibold tracking-tight text-sidebar-foreground">Pharma Inventory</h1>
                  </div>
                  <nav className="space-y-1 p-4">
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
              
              {/* User Role Indicator */}
              {session?.user && (
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${getRoleInfo(userRole).color}`}>
                    {(() => {
                      const roleInfo = getRoleInfo(userRole)
                      const IconComponent = roleInfo.icon
                      return (
                        <>
                          <IconComponent className="h-3 w-3" />
                          <span className="hidden sm:inline">{roleInfo.label}</span>
                          <span className="sm:hidden">{roleInfo.label.charAt(0)}</span>
                        </>
                      )
                    })()}
                  </div>
                  <div className="hidden md:flex flex-col text-right">
                    <span className="text-xs font-medium text-foreground">{session.user.name}</span>
                    <span className="text-xs text-muted-foreground">{session.user.email}</span>
                  </div>
                </div>
              )}
              
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: '/' })}
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Sign out</span>
              </Button>
            </div>
          </div>
        </header>
        <main className="section-spacing px-4 lg:px-6">
          <div className="content-spacing max-w-7xl mx-auto">
            {children}
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