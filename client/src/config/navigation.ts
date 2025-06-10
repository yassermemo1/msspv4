/**
 * Navigation Configuration
 * 
 * CENTRALIZED navigation configuration for the MSSP Client Management Platform
 * 
 * USAGE:
 * - Import this in layout components instead of hardcoding navigation
 * - Ensures consistency across the application
 * - Single source of truth for navigation items
 * 
 * MAINTENANCE:
 * - Add new navigation items here
 * - Ensure corresponding routes exist in App.tsx
 * - Update icons as needed (import from lucide-react)
 */

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
  Network,
  type LucideIcon
} from "lucide-react";

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  badge?: string;
  isNew?: boolean;
}

/**
 * Main application navigation items
 * Displayed in the primary sidebar navigation
 */
export const mainNavigation: NavigationItem[] = [
  { 
    name: "Dashboard", 
    href: "/", 
    icon: LayoutDashboard,
    description: "Overview and key metrics"
  },
  { 
    name: "Dynamic Dashboards", 
    href: "/dashboards", 
    icon: BarChart3,
    description: "Create and manage custom dashboards",
    isNew: true
  },
  { 
    name: "Clients", 
    href: "/clients", 
    icon: Building,
    description: "Manage client information and contacts"
  },
  { 
    name: "Contracts", 
    href: "/contracts", 
    icon: FileText,
    description: "Contract management and tracking"
  },
  { 
    name: "Proposals", 
    href: "/proposals", 
    icon: BookOpen,
    description: "Technical and financial proposals"
  },
  { 
    name: "Service Scopes", 
    href: "/service-scopes", 
    icon: Target,
    description: "Service scope definitions and SAFs"
  },
  { 
    name: "Services", 
    href: "/services", 
    icon: ServerCog,
    description: "Service catalog and offerings"
  },
  { 
    name: "Assets", 
    href: "/assets", 
    icon: Server,
    description: "Hardware and license management"
  },
  { 
    name: "License Pools", 
    href: "/license-pools", 
    icon: Server,
    description: "Software license pool management"
  },
  { 
    name: "Financial", 
    href: "/financial", 
    icon: DollarSign,
    description: "Financial transactions and reporting"
  },
  { 
    name: "Team", 
    href: "/team", 
    icon: Users,
    description: "Team member and role management"
  },
  { 
    name: "Documents", 
    href: "/documents", 
    icon: FolderOpen,
    description: "Document management system"
  },
  { 
    name: "Integration Engine", 
    href: "/integration-engine", 
    icon: Zap,
    description: "External API integrations and data sync",
    isNew: true
  },
  { 
    name: "Entity Navigation Demo", 
    href: "/entity-navigation-demo", 
    icon: Network,
    description: "Jira-style entity linking and relationships",
    isNew: true
  },
  { 
    name: "Bulk Import", 
    href: "/bulk-import", 
    icon: Upload,
    description: "Import client data from CSV files",
    isNew: true
  },
  { 
    name: "Comprehensive Bulk Import", 
    href: "/comprehensive-bulk-import", 
    icon: Upload,
    description: "Import comprehensive client data with multiple entities",
    isNew: true
  },
  { 
    name: "Reports", 
    href: "/reports", 
    icon: BarChart3,
    description: "Analytics and reporting"
  },

  { 
    name: "Field Visibility", 
    href: "/field-visibility", 
    icon: Shield,
    description: "Manage form field visibility settings",
    isNew: true
  },
  { 
    name: "Settings", 
    href: "/settings", 
    icon: Settings,
    description: "Application and user settings"
  },
];

/**
 * Get navigation item by href
 */
export const getNavigationItem = (href: string): NavigationItem | undefined => {
  return mainNavigation.find(item => item.href === href);
};

/**
 * Get navigation items by category (if we add categories in the future)
 */
export const getNavigationByCategory = (category: string): NavigationItem[] => {
  // Future enhancement: add category field to NavigationItem
  return mainNavigation;
};

/**
 * Check if a navigation item is active based on current location
 */
export const isNavigationItemActive = (item: NavigationItem, currentLocation: string): boolean => {
  if (item.href === "/") {
    return currentLocation === "/";
  }
  return currentLocation.startsWith(item.href);
}; 