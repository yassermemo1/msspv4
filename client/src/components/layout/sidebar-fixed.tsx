import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { 
  Shield, 
  LogOut,
  Menu,
  X,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { mainNavigation } from "@/config/navigation";

// Split navigation into primary and secondary for better organization
const primaryNavigation = mainNavigation.slice(0, -2); // All except Reports and Settings
const secondaryNavigation = mainNavigation.slice(-2); // Reports and Settings

export function Sidebar() {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleNavigate = (href: string) => {
    navigate(href);
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* Mobile hamburger button - always visible on mobile */}
      <div className="md:hidden fixed top-4 left-4 z-[60]">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white shadow-lg border-2 hover:bg-gray-50 p-2"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col",
        "hidden md:flex", // Hidden on mobile by default
        isMobileMenuOpen && "fixed inset-y-0 left-0 z-50 flex md:relative md:inset-auto" // Show on mobile when open
      )}>
        {/* Logo Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">MSSP Platform</h1>
              <p className="text-xs text-gray-600">Client Management</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-1">
          {primaryNavigation.filter(item => {
            if(item.name === "Plugins" && !["admin","manager"].includes(user?.role || '')) return false;
            return true;
          }).map((item) => {
            const isActive = location === item.href;
            const isDynamicDashboards = item.name === "Dynamic Dashboards";
            return (
              <button
                key={item.name}
                onClick={() => handleNavigate(item.href)}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors",
                  isActive
                    ? isDynamicDashboards 
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : "bg-primary/10 text-primary"
                    : isDynamicDashboards
                      ? "text-red-600 hover:bg-red-50 border border-red-200"
                      : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <item.icon className={cn("h-5 w-5", isDynamicDashboards && "text-red-600")} />
                <span className="flex-1 text-left">{item.name}</span>
                {item.isNew && (
                  <Badge variant="secondary" className="text-xs">
                    NEW
                  </Badge>
                )}
              </button>
            );
          })}
          
          <div className="pt-4 border-t border-gray-200 mt-4">
            {secondaryNavigation.map((item) => {
              const isActive = location === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigate(item.href)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="flex-1 text-left">{item.name}</span>
                </button>
              );
            })}
          </div>
        </nav>
        
        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 p-2 rounded-lg">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user ? `${user.firstName[0]}${user.lastName[0]}` : "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user ? `${user.firstName} ${user.lastName}` : "User"}
              </p>
              <p className="text-xs text-gray-600 truncate capitalize">
                {user?.role || "User"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Version Information Footer */}
        <div className="px-4 pb-4">
          <VersionFooter />
        </div>
      </div>
    </>
  );
}

interface VersionData {
  version: string;
  name: string;
  environment: string;
  nodeVersion: string;
  uptime: number;
  timestamp: string;
}

function VersionFooter() {
  const { data: versionData } = useQuery<VersionData>({
    queryKey: ['/api/version'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/version');
      return res.json();
    },
  });

  if (!versionData) {
    return null;
  }

  return (
    <div className="text-center border-t border-gray-200 pt-3">
      <div className="flex items-center justify-center space-x-2">
        <span className="text-xs text-gray-500">v{versionData.version}</span>
        <Badge 
          variant={versionData.environment === 'production' ? 'default' : 'secondary'} 
          className="text-xs px-2 py-0"
        >
          {versionData.environment}
        </Badge>
      </div>
      <p className="text-xs text-gray-400 mt-1">
        {versionData.name}
      </p>
    </div>
  );
}