import { UserRole } from '@workspace/database'

// Role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  operator: 1,
  admin: 2,
  super_admin: 3,
}

// Check if user has required role or higher
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

// Check if user is super admin
export function isSuperAdmin(userRole: UserRole): boolean {
  return userRole === 'super_admin'
}

// Check if user is admin or higher
export function isAdmin(userRole: UserRole): boolean {
  return hasRole(userRole, 'admin')
}

// Get user role display name
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'operator':
      return 'Operator'
    case 'admin':
      return 'Admin'
    case 'super_admin':
      return 'Super Admin'
    default:
      return 'Unknown'
  }
}

// Get permissions for role
export function getRolePermissions(role: UserRole) {
  const basePermissions = {
    viewInventory: true,
    viewAlerts: true,
    viewDashboard: true,
  }

  const adminPermissions = {
    ...basePermissions,
    viewReports: true,
    viewActivityLogs: true,
    manageInventory: true,
    manageAlerts: true,
  }

  const superAdminPermissions = {
    ...adminPermissions,
    viewMLMetrics: true,
    triggerMLRetraining: true,
    viewSystemHealth: true,
    manageUsers: true,
  }

  switch (role) {
    case 'operator':
      return basePermissions
    case 'admin':
      return adminPermissions
    case 'super_admin':
      return superAdminPermissions
    default:
      return basePermissions
  }
}