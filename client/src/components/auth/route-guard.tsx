import { ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAuth, type UserRole } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface RouteGuardProps {
  /**
   * Required roles to access the route
   */
  allowedRoles: UserRole[];
  /**
   * Path to redirect to when user doesn't have permission
   */
  fallbackPath?: string;
  /**
   * If true, requires ALL roles in the array (AND logic)
   * If false (default), requires ANY role in the array (OR logic)
   */
  requireAll?: boolean;
  /**
   * Custom unauthorized component instead of redirect
   */
  unauthorizedComponent?: ReactNode;
  /**
   * Content to show when user has permission
   */
  children: ReactNode;
}

/**
 * Default unauthorized access component
 */
const DefaultUnauthorized = () => (
  <div className="flex items-center justify-center min-h-[400px] p-4">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <CardTitle>Access Denied</CardTitle>
        <CardDescription>
          You don't have permission to access this page.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-gray-600">
          Contact your administrator if you believe this is an error.
        </p>
      </CardContent>
    </Card>
  </div>
);

/**
 * Component that protects routes based on user permissions
 * 
 * @example
 * // Protect admin-only route
 * <RouteGuard allowedRoles={['admin']}>
 *   <UserManagementPage />
 * </RouteGuard>
 * 
 * @example
 * // Protect route for managers and admins with custom redirect
 * <RouteGuard 
 *   allowedRoles={['admin', 'manager']} 
 *   fallbackPath="/dashboard"
 * >
 *   <FinancialPage />
 * </RouteGuard>
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({
  allowedRoles,
  fallbackPath,
  requireAll = false,
  unauthorizedComponent,
  children
}) => {
  const { user, hasAnyRole, hasRole, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is not logged in, redirect to login
  if (!user) {
    return <Redirect to="/login" replace />;
  }

  // Check permissions based on requireAll flag
  const hasPermission = requireAll
    ? allowedRoles.every(role => hasRole(role))
    : hasAnyRole(allowedRoles);

  // If user doesn't have permission
  if (!hasPermission) {
    // Use custom unauthorized component if provided
    if (unauthorizedComponent) {
      return <>{unauthorizedComponent}</>;
    }
    
    // Redirect to fallback path if provided
    if (fallbackPath) {
      return <Redirect to={fallbackPath} replace />;
    }
    
    // Show default unauthorized component
    return <DefaultUnauthorized />;
  }

  // User has permission, render children
  return <>{children}</>;
}; 