/**
 * AppLayout Component
 * 
 * RESPONSIBILITY: Main application layout wrapper with embedded navigation
 * STATUS: ACTIVE - This is the primary layout component used throughout the app
 * 
 * CONTAINS:
 * - Main navigation sidebar with collapsible functionality
 * - Header with page title, global search, and session status
 * - Main content area
 * - Dynamic logo and company name from settings
 * - RBAC-based dynamic navigation
 * 
 * NAVIGATION: Uses DynamicNavigation component for role-based page access
 * 
 * USAGE: Wrap all authenticated pages with this component
 */

import { ReactNode, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SessionStatus } from "@/components/ui/session-status";
import { GlobalSearchHeader } from "@/components/ui/global-search-header";
import { DynamicNavigation } from "@/components/layout/dynamic-navigation";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { 
  Menu,
  Shield,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Fetch company settings for logo and name
  const { data: companySettings } = useQuery({
    queryKey: ['/api/company/settings'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/company/settings');
        return res.json();
      } catch (error) {
        // Return defaults if endpoint doesn't exist yet
        return { companyName: "MSSP Platform", logoUrl: null };
      }
    },
  });

  const companyName = companySettings?.companyName || "MSSP Platform";
  const logoUrl = companySettings?.logoUrl;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={cn(
        "bg-white shadow-sm border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out",
        isSidebarOpen ? "w-64" : "w-16"
      )}>
        {/* Logo Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Company Logo" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <Shield className="h-4 w-4 text-white" />
              )}
            </div>
            {isSidebarOpen && (
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{companyName}</h1>
                <p className="text-xs text-gray-600">Client Management</p>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Navigation Menu */}
        <div className="flex-1 overflow-y-auto">
          <DynamicNavigation 
            compact={!isSidebarOpen}
            showCategories={isSidebarOpen}
            className={isSidebarOpen ? "p-4 space-y-1" : "p-2 space-y-1"}
          />
        </div>
        
        {/* User Profile Section */}
        {isSidebarOpen && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {user?.firstName?.charAt(0) || ""}{user?.lastName?.charAt(0) || ""}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.firstName || ""} {user?.lastName || ""}
                </p>
                <p className="text-xs text-gray-500 capitalize truncate">
                  {user?.role || "User"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="p-2 hover:bg-red-50 hover:text-red-600"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Compact User Profile for collapsed sidebar */}
        {!isSidebarOpen && (
          <div className="p-2 border-t border-gray-200">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {user?.firstName?.charAt(0) || ""}{user?.lastName?.charAt(0) || ""}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="p-2 hover:bg-red-50 hover:text-red-600 w-8 h-8"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with global search */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-4 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="p-2 flex-shrink-0"
                aria-label="Toggle sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-gray-900 truncate">{title}</h1>
                {subtitle && <p className="text-sm text-gray-600 truncate">{subtitle}</p>}
              </div>
            </div>
            
            {/* Global Search */}
            <div className="flex-1 max-w-2xl mx-4">
              <GlobalSearchHeader
                className="w-full"
              />
            </div>
            
            <div className="flex items-center space-x-4 flex-shrink-0">
              <SessionStatus />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}