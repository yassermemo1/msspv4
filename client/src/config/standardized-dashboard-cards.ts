import { StandardizedDashboardCard } from '@/components/dashboard/standardized-dashboard-card';

// SINGLE SOURCE OF TRUTH - All dashboard cards defined here
export const STANDARDIZED_DASHBOARD_CARDS: StandardizedDashboardCard[] = [
  // =================
  // KPI CARDS
  // =================
  {
    id: "kpi-new-clients",
    title: "New Clients",
    type: "kpi",
    category: "kpi",
    dataSource: "clients",
    size: "small",
    visible: true,
    position: 0,
    config: {
      icon: "Building",
      color: "blue",
      format: "number",
      aggregation: "count",
      trend: true,
      filters: { "created_within": "current_month" }
    },
    isBuiltIn: true,
    isRemovable: true,
  },
  {
    id: "kpi-contracts-signed",
    title: "Contracts Signed",
    type: "kpi",
    category: "kpi",
    dataSource: "contracts",
    size: "small",
    visible: true,
    position: 1,
    config: {
      icon: "FileText",
      color: "green",
      format: "number",
      aggregation: "count",
      trend: true,
      filters: { "status": "signed", "signed_within": "current_month" }
    },
    isBuiltIn: true,
    isRemovable: true,
  },
  {
    id: "kpi-period-revenue",
    title: "Period Revenue",
    type: "kpi",
    category: "kpi",
    dataSource: "contracts",
    size: "small",
    visible: true,
    position: 2,
    config: {
      icon: "DollarSign",
      color: "emerald",
      format: "currency",
      aggregation: "sum",
      trend: true,
      filters: { "period": "current_month" }
    },
    isBuiltIn: true,
    isRemovable: true,
  },
  {
    id: "kpi-tasks-progress",
    title: "Tasks Progress",
    type: "kpi",
    category: "kpi",
    dataSource: "tasks",
    size: "small",
    visible: true,
    position: 3,
    config: {
      icon: "Users",
      color: "purple",
      format: "number",
      aggregation: "count",
      trend: true,
      filters: { "status": "in_progress" }
    },
    isBuiltIn: true,
    isRemovable: true,
  },

  // =================
  // DASHBOARD METRIC CARDS
  // =================
  {
    id: "total-clients",
    title: "Total Clients",
    type: "metric",
    category: "dashboard",
    dataSource: "clients",
    size: "small",
    visible: true,
    position: 10,
    config: {
      icon: "Building",
      color: "blue",
      format: "number",
      aggregation: "count"
    },
    isBuiltIn: false,
    isRemovable: true,
  },
  {
    id: "active-contracts",
    title: "Active Contracts",
    type: "metric",
    category: "dashboard",
    dataSource: "contracts",
    size: "small",
    visible: true,
    position: 11,
    config: {
      icon: "FileText",
      color: "green",
      format: "number",
      aggregation: "count",
      filters: { status: "active" }
    },
    isBuiltIn: false,
    isRemovable: true,
  },
  {
    id: "expiring-contracts",
    title: "Expiring Contracts",
    type: "metric",
    category: "dashboard",
    dataSource: "contracts",
    size: "medium",
    visible: true,
    position: 12,
    config: {
      icon: "AlertCircle",
      color: "orange",
      format: "number",
      aggregation: "count",
      filters: { 
        status: "active",
        expiring_in_months: 3 // Default to 3 months
      },
      enableDrillDown: true,
      customApiEndpoint: "/api/contracts/expiring"
    },
    isBuiltIn: false,
    isRemovable: true,
  },
  {
    id: "total-revenue",
    title: "Total Revenue",
    type: "metric",
    category: "dashboard",
    dataSource: "contracts",
    size: "small",
    visible: true,
    position: 13,
    config: {
      icon: "DollarSign",
      color: "emerald",
      format: "currency",
      aggregation: "sum"
    },
    isBuiltIn: false,
    isRemovable: true,
  },
  {
    id: "pending-tasks",
    title: "Pending Tasks",
    type: "metric",
    category: "dashboard",
    dataSource: "tasks",
    size: "small",
    visible: true,
    position: 14,
    config: {
      icon: "AlertCircle",
      color: "orange",
      format: "number",
      aggregation: "count",
      filters: { status: "pending" }
    },
    isBuiltIn: false,
    isRemovable: true,
  },

  // =================
  // ADVANCED COMPARISON CARDS
  // =================
  {
    id: "siem-vs-edr-pools",
    title: "SIEM vs EDR Pool Comparison",
    type: "comparison",
    category: "license",
    dataSource: "comparison",
    size: "large",
    visible: true,
    position: 100,
    config: {
      icon: "BarChart3",
      color: "violet",
      format: "comparison",
      chartType: "bar",
      comparison: {
        siem_pool: {
          table: "license_pools",
          aggregation: "sum",
          filters: { pool_type: "SIEM_EPS" },
          label: "SIEM EPS Pool",
          color: "#8b5cf6"
        },
        edr_pool: {
          table: "license_pools", 
          aggregation: "sum",
          filters: { pool_type: "EDR" },
          label: "EDR Pool",
          color: "#06b6d4"
        }
      }
    },
    isBuiltIn: true,
    isRemovable: true,
  },
  {
    id: "active-vs-inactive-clients",
    title: "Active vs Non-Active Clients",
    type: "comparison",
    category: "clients",
    dataSource: "comparison",
    size: "medium",
    visible: true,
    position: 101,
    config: {
      icon: "Users",
      color: "blue",
      format: "comparison",
      chartType: "doughnut",
      comparison: {
        active_clients: {
          table: "clients",
          aggregation: "count",
          filters: { status: "active" },
          label: "Active Clients",
          color: "#22c55e"
        },
        inactive_clients: {
          table: "clients",
          aggregation: "count", 
          filters: { status: "inactive" },
          label: "Inactive Clients",
          color: "#ef4444"
        },
        suspended_clients: {
          table: "clients",
          aggregation: "count",
          filters: { status: "suspended" },
          label: "Suspended Clients", 
          color: "#f59e0b"
        }
      }
    },
    isBuiltIn: true,
    isRemovable: true,
  },
  {
    id: "direct-vs-non-direct-clients",
    title: "Direct vs Non-Direct Clients",
    type: "comparison",
    category: "clients",
    dataSource: "comparison",
    size: "medium",
    visible: true,
    position: 102,
    config: {
      icon: "Network",
      color: "indigo",
      format: "comparison",
      chartType: "pie",
      comparison: {
        direct_clients: {
          table: "clients",
          aggregation: "count",
          filters: { client_type: "direct" },
          label: "Direct Clients",
          color: "#6366f1"
        },
        non_direct_clients: {
          table: "clients",
          aggregation: "count",
          filters: { client_type: "non_direct" },
          label: "Non-Direct Clients",
          color: "#8b5cf6"
        }
      }
    },
    isBuiltIn: true,
    isRemovable: true,
  },
  {
    id: "client-size-distribution",
    title: "Client Size Distribution",
    type: "comparison",
    category: "clients",
    dataSource: "comparison",
    size: "large",
    visible: true,
    position: 103,
    config: {
      icon: "Building2",
      color: "emerald",
      format: "comparison",
      chartType: "bar",
      comparison: {
        small_clients: {
          table: "clients",
          aggregation: "count",
          filters: { company_size: "small" },
          label: "Small (1-50)",
          color: "#10b981"
        },
        medium_clients: {
          table: "clients",
          aggregation: "count",
          filters: { company_size: "medium" },
          label: "Medium (51-250)",
          color: "#059669"
        },
        large_clients: {
          table: "clients",
          aggregation: "count",
          filters: { company_size: "large" },
          label: "Large (251-1000)",
          color: "#047857"
        },
        enterprise_clients: {
          table: "clients",
          aggregation: "count",
          filters: { company_size: "enterprise" },
          label: "Enterprise (1000+)",
          color: "#065f46"
        }
      }
    },
    isBuiltIn: true,
    isRemovable: true,
  },
  {
    id: "contract-vs-proposal-revenue",
    title: "Contract vs Proposal Revenue",
    type: "comparison",
    category: "financial",
    dataSource: "comparison",
    size: "medium",
    visible: true,
    position: 104,
    config: {
      icon: "DollarSign",
      color: "emerald",
      format: "currency_comparison",
      chartType: "bar",
      comparison: {
        active_contracts: {
          table: "contracts",
          aggregation: "sum",
          filters: { status: "active" },
          label: "Active Contract Revenue",
          color: "#22c55e"
        },
        pending_proposals: {
          table: "proposals",
          aggregation: "sum",
          filters: { status: "pending" },
          label: "Pending Proposal Value",
          color: "#f59e0b"
        }
      }
    },
    isBuiltIn: true,
    isRemovable: true,
  },
  {
    id: "license-utilization-by-type",
    title: "License Utilization by Type",
    type: "comparison",
    category: "license",
    dataSource: "comparison",
    size: "large",
    visible: true,
    position: 105,
    config: {
      icon: "Package",
      color: "violet",
      format: "utilization_comparison",
      chartType: "composed",
      comparison: {
        siem_utilization: {
          table: "license_pools",
          aggregation: "custom",
          filters: { pool_type: "SIEM_EPS" },
          label: "SIEM EPS",
          color: "#8b5cf6"
        },
        edr_utilization: {
          table: "license_pools",
          aggregation: "custom",
          filters: { pool_type: "EDR" },
          label: "EDR",
          color: "#06b6d4"
        },
        email_security_utilization: {
          table: "license_pools",
          aggregation: "custom",
          filters: { pool_type: "EMAIL_SECURITY" },
          label: "Email Security",
          color: "#22c55e"
        }
      }
    },
    isBuiltIn: true,
    isRemovable: true,
  },

  // =================
  // EXTERNAL DATA SOURCE CARDS - DEPRECATED
  // External data source cards have been migrated to the plugin system
  // =================

  // =================
  // LICENSE POOL CARDS (STANDARDIZED)
  // =================
  {
    id: "license-pools-summary",
    title: "License Pools",
    type: "license-pool",
    category: "license",
    dataSource: "license_pools",
    size: "medium",
    visible: true,
    position: 20,
    config: {
      icon: "Package",
      color: "violet",
      format: "number",
      aggregation: "count",
      showUtilization: true,
      showStatus: false
    },
    isBuiltIn: false,
    isRemovable: true,
  },

  // =================
  // ADDITIONAL METRICS
  // =================
  {
    id: "service-authorization-forms",
    title: "Service Authorizations (SAF)",
    type: "metric",
    category: "dashboard",
    dataSource: "service_authorization_forms",
    size: "small",
    visible: true,
    position: 15,
    config: {
      icon: "FileCheck",
      color: "teal",
      format: "number",
      aggregation: "count"
    },
    isBuiltIn: false,
    isRemovable: true,
  },
  {
    id: "certificates-compliance",
    title: "Compliance Certificates",
    type: "metric",
    category: "dashboard",
    dataSource: "certificates_of_compliance",
    size: "small",
    visible: true,
    position: 16,
    config: {
      icon: "Award",
      color: "emerald",
      format: "number",
      aggregation: "count"
    },
    isBuiltIn: false,
    isRemovable: true,
  },
  {
    id: "financial-transactions",
    title: "Financial Transactions",
    type: "metric",
    category: "dashboard",
    dataSource: "financial_transactions",
    size: "small",
    visible: true,
    position: 17,
    config: {
      icon: "CreditCard",
      color: "green",
      format: "currency",
      aggregation: "sum"
    },
    isBuiltIn: false,
    isRemovable: true,
  },
  {
    id: "active-proposals",
    title: "Active Proposals",
    type: "metric",
    category: "dashboard",
    dataSource: "proposals",
    size: "small",
    visible: true,
    position: 18,
    config: {
      icon: "FileText",
      color: "blue",
      format: "number",
      aggregation: "count",
      filters: { status: "pending" }
    },
    isBuiltIn: false,
    isRemovable: true,
  },
  {
    id: "hardware-assets",
    title: "Hardware Assets",
    type: "metric",
    category: "dashboard",
    dataSource: "hardware_assets",
    size: "small",
    visible: true,
    position: 19,
    config: {
      icon: "HardDrive",
      color: "gray",
      format: "number",
      aggregation: "count"
    },
    isBuiltIn: false,
    isRemovable: true,
  },
  {
    id: "documents-total",
    title: "Documents",
    type: "metric",
    category: "dashboard",
    dataSource: "documents",
    size: "small",
    visible: true,
    position: 20,
    config: {
      icon: "File",
      color: "indigo",
      format: "number",
      aggregation: "count"
    },
    isBuiltIn: false,
    isRemovable: true,
  },

  // =================
  // CHART CARDS
  // =================
  {
    id: "client-growth-chart",
    title: "Client Growth Over Time",
    type: "chart",
    category: "analytics",
    dataSource: "clients",
    size: "large",
    visible: true,
    position: 400,
    config: {
      chartType: "line",
      timeRange: "12_months",
      groupBy: "month",
      color: "blue",
      aggregation: "count",
      showLegend: true,
      showGrid: true
    },
    isBuiltIn: false,
    isRemovable: true,
  },
  {
    id: "revenue-breakdown-chart",
    title: "Revenue Breakdown by Service",
    type: "chart",
    category: "analytics",
    dataSource: "contracts",
    size: "large",
    visible: true,
    position: 401,
    config: {
      chartType: "doughnut",
      groupBy: "service_type",
      color: "emerald",
      aggregation: "sum",
      showLegend: true,
      showPercentage: true
    },
    isBuiltIn: false,
    isRemovable: true,
  },
  {
    id: "license-utilization-chart",
    title: "License Utilization Trend",
    type: "chart",
    category: "analytics",
    dataSource: "license_pools",
    size: "large",
    visible: true,
    position: 402,
    config: {
      chartType: "composed",
      timeRange: "6_months",
      groupBy: "month",
      color: "violet",
      aggregation: "utilization_percentage",
      showLegend: true,
      showGrid: true,
      yAxisMax: 100
    },
    isBuiltIn: false,
    isRemovable: true,
  },

  // =================
  // EXTERNAL SYSTEM MONITORING - DEPRECATED
  // =================
  // External system cards removed - migrated to plugin system
  {
    id: "integration-data-freshness",
    title: "Integration Data Freshness",
    type: "metric",
    category: "external",
    dataSource: "integrated_data",
    size: "medium",
    visible: true,
    position: 501,
    config: {
      icon: "RefreshCw",
      color: "cyan",
      format: "time_ago",
      aggregation: "latest_sync",
      showDataSources: true
    },
    isBuiltIn: true,
    isRemovable: true,
  }
];

// Helper functions for card management
export const getCardsByCategory = (category: string): StandardizedDashboardCard[] => {
  return STANDARDIZED_DASHBOARD_CARDS.filter(card => card.category === category);
};

export const getVisibleCards = (): StandardizedDashboardCard[] => {
  return STANDARDIZED_DASHBOARD_CARDS
    .filter(card => card.visible)
    .sort((a, b) => a.position - b.position);
};

export const getKPICards = (): StandardizedDashboardCard[] => {
  return getCardsByCategory('kpi');
};

export const getDashboardCards = (): StandardizedDashboardCard[] => {
  return getCardsByCategory('dashboard');
};

export const getLicenseCards = (): StandardizedDashboardCard[] => {
  return getCardsByCategory('license');
};

export const getComparisonCards = (): StandardizedDashboardCard[] => {
  return getCardsByCategory('comparison');
};

export const getExternalCards = (): StandardizedDashboardCard[] => {
  // External cards removed - deprecated
  return [];
};

export const getAnalyticsCards = (): StandardizedDashboardCard[] => {
  return getCardsByCategory('analytics');
};

export const getCardById = (id: string): StandardizedDashboardCard | undefined => {
  return STANDARDIZED_DASHBOARD_CARDS.find(card => card.id === id);
};

// Advanced card filtering and search
export const searchCards = (query: string): StandardizedDashboardCard[] => {
  const searchTerm = query.toLowerCase();
  return STANDARDIZED_DASHBOARD_CARDS.filter(card => 
    card.title.toLowerCase().includes(searchTerm) ||
    card.category.toLowerCase().includes(searchTerm) ||
    card.dataSource.toLowerCase().includes(searchTerm)
  );
};

export const getAvailableDataSources = (): string[] => {
  const dataSources = new Set(STANDARDIZED_DASHBOARD_CARDS.map(card => card.dataSource));
  return Array.from(dataSources).sort();
};

export const getAvailableCategories = (): string[] => {
  const categories = new Set(STANDARDIZED_DASHBOARD_CARDS.map(card => card.category));
  return Array.from(categories).sort();
};

// Card templates for easy creation
export const createComparisonCard = (config: {
  id: string;
  title: string;
  comparison: Record<string, any>;
  chartType?: string;
  size?: string;
}): StandardizedDashboardCard => {
  return {
    id: config.id,
    title: config.title,
    type: "comparison",
    category: "comparison",
    dataSource: "comparison",
    size: config.size || "medium",
    visible: true,
    position: 9999, // Will be repositioned when added
    config: {
      icon: "BarChart3",
      color: "blue",
      format: "comparison",
      chartType: config.chartType || "bar",
      comparison: config.comparison
    },
    isBuiltIn: false,
    isRemovable: true,
  };
};

export const createExternalCard = (config: {
  id: string;
  title: string;
  externalSource: string;
  endpoint: string;
  aggregation?: string;
  refreshInterval?: number;
}): StandardizedDashboardCard => {
  // External cards removed - deprecated
  throw new Error('External cards have been deprecated. Use plugin system instead.');
}; 