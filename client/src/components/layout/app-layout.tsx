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
  LogOut,
  User
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
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('MSSP Platform');

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
        "hidden md:flex", // Hide on mobile by default
        isSidebarOpen ? "w-64" : "w-16"
      )}>
        {/* Logo Header */}
        <div className="p-4 lg:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
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
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 truncate">{companyName}</h1>
                <p className="text-xs text-gray-600 truncate">Client Management</p>
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
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            {isSidebarOpen && (
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
                <p className="text-xs text-gray-600 truncate">System Administrator</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header with global search */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="p-2 flex-shrink-0 md:hidden"
                aria-label="Toggle sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="p-2 flex-shrink-0 hidden md:flex"
                aria-label="Toggle sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{title}</h1>
                {subtitle && <p className="text-xs sm:text-sm text-gray-600 truncate">{subtitle}</p>}
              </div>
            </div>
            
            {/* Global Search */}
            <div className="hidden sm:flex flex-1 max-w-md lg:max-w-2xl mx-4">
              <GlobalSearchHeader
                className="w-full"
              />
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <SessionStatus />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {!isSidebarOpen && (
        <div className="md:hidden">
          {/* Mobile nav content would go here */}
        </div>
      )}
    </div>
  );
}