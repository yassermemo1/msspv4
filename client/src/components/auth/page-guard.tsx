import { ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { usePageAccess } from "@/components/layout/dynamic-navigation";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppLayout } from "@/components/layout/app-layout";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageGuardProps {
  children: ReactNode;
  pageUrl?: string; // Optional - if not provided, uses current location
  fallbackPath?: string;
  showUnauthorizedPage?: boolean;
}

function UnauthorizedPage({ pageUrl }: { pageUrl?: string }) {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  return (
    <AppLayout title="Access Denied" subtitle="Insufficient permissions">
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
            <p className="text-gray-600">
              You don't have permission to access this page.
            </p>
          </div>

          <Alert className="text-left">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Current Role:</strong> {user?.role || 'Unknown'}</p>
                <p><strong>Requested Page:</strong> {pageUrl || 'Unknown'}</p>
                <p>Contact your administrator if you believe you should have access to this page.</p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={() => navigate(-1 as any)}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={() => navigate('/')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export function PageGuard({ 
  children, 
  pageUrl, 
  fallbackPath = '/',
  showUnauthorizedPage = true 
}: PageGuardProps) {
  const [location] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { hasPageAccess, accessiblePages } = usePageAccess();
  
  // Determine the page URL to check
  const targetPageUrl = pageUrl || location;
  
  // Show loading while auth or page access is loading
  if (authLoading || !accessiblePages) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is not logged in, redirect to login
  if (!user) {
    return <Redirect to="/login" replace />;
  }

  // Check if user has access to the page
  const hasAccess = hasPageAccess(targetPageUrl);
  
  if (!hasAccess) {
    if (showUnauthorizedPage) {
      return <UnauthorizedPage pageUrl={targetPageUrl} />;
    } else {
      return <Redirect to={fallbackPath} replace />;
    }
  }
  
  // User has access, render the page
  return <>{children}</>;
}

// Hook for programmatic access checking
export function useCurrentPageAccess() {
  const [location] = useLocation();
  const { hasPageAccess } = usePageAccess();
  
  return {
    hasAccess: hasPageAccess(location),
    currentPage: location
  };
}

// Higher-order component for protecting routes
export function withPageGuard<T extends object>(
  Component: React.ComponentType<T>,
  options?: {
    pageUrl?: string;
    fallbackPath?: string;
    showUnauthorizedPage?: boolean;
  }
) {
  return function PageGuardedComponent(props: T) {
    return (
      <PageGuard {...options}>
        <Component {...props} />
      </PageGuard>
    );
  };
} 