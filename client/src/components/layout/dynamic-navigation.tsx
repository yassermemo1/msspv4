import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  Shield, 
  Building, 
  FileText, 
  ServerCog, 
  Server, 
  Users, 
  DollarSign,
  BarChart3, 
  Settings,
  LayoutDashboard,
  Target,
  BookOpen,
  FolderOpen,
  Zap,
  Upload,
  LucideIcon
} from "lucide-react";

// Icon mapping for dynamic icons
const iconMap: Record<string, LucideIcon> = {
  Shield,
  Building,
  FileText,
  ServerCog,
  Server,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  LayoutDashboard,
  Target,
  BookOpen,
  FolderOpen,
  Zap,
  Upload,
};

interface AccessiblePage {
  pageName: string;
  pageUrl: string;
  displayName: string;
  description?: string;
  category: string;
  icon?: string;
  sortOrder: number;
}

interface DynamicNavigationProps {
  onNavigate?: (href: string) => void;
  className?: string;
  showCategories?: boolean;
  compact?: boolean;
}

export function DynamicNavigation({ 
  onNavigate, 
  className,
  showCategories = true,
  compact = false
}: DynamicNavigationProps) {
  const [location, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  // Query for accessible pages with proper cache invalidation
  const { data: accessiblePages = [], isLoading } = useQuery<AccessiblePage[]>({
    queryKey: ["/api/user/accessible-pages", "field-visibility-added-2025-06-08"],
    enabled: !!user, // Only fetch if user is authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const handleNavigate = (href: string) => {
    if (onNavigate) {
      onNavigate(href);
    } else {
      navigate(href);
    }
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return LayoutDashboard;
    return iconMap[iconName] || LayoutDashboard;
  };

  if (authLoading || isLoading) {
    return (
      <nav className={cn("p-4 space-y-1", className)}>
        {/* Loading skeleton */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 px-3 py-2">
            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
            {!compact && <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />}
          </div>
        ))}
      </nav>
    );
  }

  if (!user || accessiblePages.length === 0) {
    return (
      <nav className={cn("p-4", className)}>
        <div className="text-sm text-gray-500 px-3 py-2">
          No accessible pages
        </div>
      </nav>
    );
  }

  // Group pages by category if showCategories is true
  const groupedPages = showCategories 
    ? accessiblePages.reduce((acc, page) => {
        const category = page.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(page);
        return acc;
      }, {} as Record<string, AccessiblePage[]>)
    : { all: accessiblePages };

  const categoryOrder = ['main', 'advanced', 'integration', 'reports', 'admin', 'other'];
  const sortedCategories = Object.keys(groupedPages).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  return (
    <nav className={cn("p-4 space-y-1", className)}>
      {sortedCategories.map((category, categoryIndex) => (
        <div key={category}>
          {showCategories && category !== 'all' && groupedPages[category].length > 0 && (
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {category === 'main' ? 'Core' : category}
              </h3>
            </div>
          )}
          
          {groupedPages[category]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((page) => {
              const isActive = location === page.pageUrl;
              const Icon = getIcon(page.icon);
              
              return (
                <button
                  key={page.pageName}
                  onClick={() => handleNavigate(page.pageUrl)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors text-left",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                  title={compact ? page.displayName : page.description}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!compact && (
                    <span className="flex-1">
                      {page.displayName}
                    </span>
                  )}
                </button>
              );
            })}
          
          {/* Add spacing between categories */}
          {showCategories && categoryIndex < sortedCategories.length - 1 && (
            <div className="h-4" />
          )}
        </div>
      ))}
    </nav>
  );
}

// Hook for getting accessible pages
export function useAccessiblePages() {
  const { user } = useAuth();
  
  return useQuery<AccessiblePage[]>({
    queryKey: ["/api/user/accessible-pages", "reorder-2025-06-07"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// Hook for checking if user has access to a specific page
export function usePageAccess() {
  const { data: accessiblePages = [] } = useAccessiblePages();
  
  const hasPageAccess = (pageUrl: string): boolean => {
    return accessiblePages.some(page => page.pageUrl === pageUrl);
  };
  
  const getAccessiblePageUrls = (): string[] => {
    return accessiblePages.map(page => page.pageUrl);
  };
  
  return {
    hasPageAccess,
    getAccessiblePageUrls,
    accessiblePages
  };
} 