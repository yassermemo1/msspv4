import { ReactNode } from 'react';
import { useAuth, type UserRole } from '@/hooks/use-auth';

interface PermissionGuardProps {
  /**
   * Required roles to view the content
   */
  requiredRoles: UserRole[];
  /**
   * Optional fallback content to show when user doesn't have permission
   */
  fallback?: ReactNode;
  /**
   * Content to show when user has permission
   */
  children: ReactNode;
  /**
   * If true, requires ALL roles in the array (AND logic)
   * If false (default), requires ANY role in the array (OR logic)
   */
  requireAll?: boolean;
}

/**
 * Component that conditionally renders children based on user permissions
 * 
 * @example
 * // Show button only for admins
 * <PermissionGuard requiredRoles={['admin']}>
 *   <Button>Delete User</Button>
 * </PermissionGuard>
 * 
 * @example
 * // Show content for managers or admins, with fallback
 * <PermissionGuard 
 *   requiredRoles={['admin', 'manager']} 
 *   fallback={<div>Access Denied</div>}
 * >
 *   <SensitiveContent />
 * </PermissionGuard>
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  requiredRoles,
  fallback = null,
  children,
  requireAll = false
}) => {
  const { user, hasAnyRole, hasRole } = useAuth();

  // If user is not logged in, don't show content
  if (!user) {
    return <>{fallback}</>;
  }

  // Check permissions based on requireAll flag
  const hasPermission = requireAll
    ? requiredRoles.every(role => hasRole(role))
    : hasAnyRole(requiredRoles);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}; 