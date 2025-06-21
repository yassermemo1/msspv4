import React, { useState, useEffect, useCallback } from 'react';
import '@/styles/powerbi-dashboard.css';
import { AppLayout } from '@/components/layout/app-layout';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Users,
  FileText,
  DollarSign,
  AlertCircle,
  Target,
  Calendar,
  RefreshCw,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  Settings2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

// Add Dialog imports
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Additional imports for widget management
import { GlobalWidgetManager } from '@/components/widgets/global-widget-manager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus } from 'lucide-react';

// Rate limiting helper
class RateLimiter {
  private lastRequest: Map<string, number> = new Map();
  private readonly minInterval: number = 60000; // 1 minute

  canRequest(key: string): boolean {
    const now = Date.now();
    const lastTime = this.lastRequest.get(key) || 0;
    return now - lastTime >= this.minInterval;
  }

  recordRequest(key: string): void {
    this.lastRequest.set(key, Date.now());
  }

  getTimeUntilNextRequest(key: string): number {
    const lastTime = this.lastRequest.get(key) || 0;
    const timePassed = Date.now() - lastTime;
    return Math.max(0, this.minInterval - timePassed);
  }
}

const rateLimiter = new RateLimiter();

// Modern color schemes inspired by PowerBI
const colorSchemes = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    lightBg: 'bg-blue-50',
    text: 'text-white',
    lightText: 'text-blue-700',
    border: 'border-blue-200',
    icon: 'text-blue-100'
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-500 to-green-600',
    lightBg: 'bg-emerald-50',
    text: 'text-white',
    lightText: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: 'text-emerald-100'
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500 to-indigo-600',
    lightBg: 'bg-purple-50',
    text: 'text-white',
    lightText: 'text-purple-700',
    border: 'border-purple-200',
    icon: 'text-purple-100'
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-500 to-red-600',
    lightBg: 'bg-orange-50',
    text: 'text-white',
    lightText: 'text-orange-700',
    border: 'border-orange-200',
    icon: 'text-orange-100'
  },
  teal: {
    bg: 'bg-gradient-to-br from-teal-500 to-cyan-600',
    lightBg: 'bg-teal-50',
    text: 'text-white',
    lightText: 'text-teal-700',
    border: 'border-teal-200',
    icon: 'text-teal-100'
  },
  red: {
    bg: 'bg-gradient-to-br from-red-500 to-rose-600',
    lightBg: 'bg-red-50',
    text: 'text-white',
    lightText: 'text-red-700',
    border: 'border-red-200',
    icon: 'text-red-100'
  },
  indigo: {
    bg: 'bg-gradient-to-br from-indigo-500 to-blue-600',
    lightBg: 'bg-indigo-50',
    text: 'text-white',
    lightText: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: 'text-indigo-100'
  }
};

interface MetricData {
  value: number;
  label: string;
  trend?: number;
  previousValue?: number;
  icon?: string;
  color?: string;
}

interface WidgetConfig {
  id: string;
  title: string;
  query: string;
  colorScheme: keyof typeof colorSchemes;
  icon: React.ElementType;
  formatter?: (value: number) => string;
  trendCalculation?: (current: number, previous: number) => number;
  description?: string;
  drilldownUrl?: string;
}

// Widget configurations with tested queries
const widgetConfigs: WidgetConfig[] = [
  {
    id: 'total-clients',
    title: 'Total Clients',
    query: `SELECT COUNT(*) as value, 'Total Clients' as label FROM clients`,
    colorScheme: 'blue',
    icon: Users,
    formatter: (value) => value.toLocaleString(),
    description: 'Total number of active client organizations currently being managed in the MSSP portal. This includes all clients regardless of their contract status or service scope.',
    drilldownUrl: '/clients'
  },
  {
    id: 'active-contracts',
    title: 'Active Contracts',
    query: `SELECT COUNT(*) as value, 'Active Contracts' as label FROM contracts WHERE status = 'active'`,
    colorScheme: 'green',
    icon: FileText,
    formatter: (value) => value.toLocaleString(),
    description: 'Number of contracts with \'active\' status, representing ongoing service agreements that are currently in effect.',
    drilldownUrl: '/contracts'
  },
  {
    id: 'total-revenue',
    title: 'Total Revenue',
    query: `SELECT COALESCE(SUM("totalValue"), 0) as value, 'Total Revenue' as label FROM contracts WHERE status = 'active' AND "totalValue" IS NOT NULL`,
    colorScheme: 'purple',
    icon: DollarSign,
    formatter: (value) => `$${value.toLocaleString()}`,
    description: 'Combined total value of all active contracts, calculated by summing the totalValue field from contracts with active status.',
    drilldownUrl: '/financial-dashboard'
  },
  {
    id: 'service-scopes',
    title: 'Service Scopes',
    query: `SELECT COUNT(*) as value, 'Service Scopes' as label FROM service_scopes WHERE status = 'active'`,
    colorScheme: 'orange',
    icon: Target,
    formatter: (value) => value.toLocaleString(),
    description: 'Total count of active service scopes across all clients, showing the breadth of services being delivered.',
    drilldownUrl: '/service-scopes'
  },
  {
    id: 'expiring-soon',
    title: 'Expiring Soon',
    query: `SELECT COUNT(*) as value, 'Expiring Soon' as label FROM contracts WHERE status = 'active' AND "endDate" BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'`,
    colorScheme: 'teal',
    icon: AlertCircle,
    formatter: (value) => value.toLocaleString(),
    description: 'Number of active contracts that will expire within the next 90 days (3 months). This helps identify contracts that need renewal attention with a longer lead time for planning.',
    drilldownUrl: '/contracts?filter=expiring'
  },
  {
    id: 'expired-contracts',
    title: 'Expired Contracts',
    query: `SELECT COUNT(*) as value, 'Expired Contracts' as label FROM contracts WHERE "endDate" < CURRENT_DATE AND status = 'active'`,
    colorScheme: 'red',
    icon: Calendar,
    formatter: (value) => value.toLocaleString(),
    description: 'Number of contracts that have passed their end date but are still marked as active. These contracts need immediate attention for renewal or closure.',
    drilldownUrl: '/contracts?filter=expired'
  },
  {
    id: 'license-pool-total',
    title: 'Total Licenses',
    query: `SELECT COALESCE(SUM("total_licenses"), 0) as value, 'Total Licenses in Pools' as label FROM license_pools WHERE "is_active" = true`,
    colorScheme: 'indigo',
    icon: Shield,
    formatter: (value: number) => value.toLocaleString(),
    description: 'Total number of licenses available across all active license pools.',
    drilldownUrl: '/license-pools'
  },
  {
    id: 'license-pool-available',
    title: 'Available Licenses',
    query: `SELECT COALESCE(SUM("available_licenses"), 0) as value, 'Available Licenses' as label FROM license_pools WHERE "is_active" = true`,
    colorScheme: 'green',
    icon: ShieldCheck,
    formatter: (value: number) => value.toLocaleString(),
    description: 'Number of licenses currently available for allocation across all pools.',
    drilldownUrl: '/license-pools'
  }
];

// PowerBI-style metric card component
const MetricCard: React.FC<{
  config: WidgetConfig;
  data: MetricData | null;
  loading: boolean;
  error: Error | null;
  onRefresh: () => void;
  canRefresh: boolean;
  timeUntilRefresh: number;
}> = ({ config, data, loading, error, onRefresh, canRefresh, timeUntilRefresh }) => {
  const Icon = config.icon;
  const scheme = colorSchemes[config.colorScheme];
  const [showDetails, setShowDetails] = useState(false);

  const formatTimeRemaining = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const trend = data?.trend || 0;
  const trendIcon = trend > 0 ? ChevronUp : trend < 0 ? ChevronDown : null;
  const trendColor = trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-400';

  return (
    <Card 
      className={`powerbi-card overflow-hidden h-full flex flex-col ${showDetails ? 'powerbi-card-expanded' : ''} cursor-pointer hover:shadow-lg transition-shadow`}
      onClick={() => {
        if (config.drilldownUrl && !showDetails) {
          window.location.href = config.drilldownUrl;
        }
      }}
    >
      {/* Header */}
      <div className={`${scheme.bg} p-4`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="powerbi-icon-container">
              <Icon className={`h-5 w-5 ${scheme.text}`} />
            </div>
            <h3 className={`font-semibold ${scheme.text}`}>{config.title}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/20">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? 'Hide' : 'Show'} Details
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onRefresh} 
                disabled={!canRefresh}
                className={!canRefresh ? 'opacity-50' : ''}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh {!canRefresh && `(${formatTimeRemaining(timeUntilRefresh)})`}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className={`p-6 bg-white flex-1 powerbi-content ${showDetails ? 'overflow-y-auto' : ''}`}>
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-24 text-center">
            <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
            <p className="text-sm text-red-600">Failed to load data</p>
            <p className="text-xs text-gray-500 mt-1">{error.message}</p>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between mb-2">
              <div className="text-3xl font-bold text-gray-900 powerbi-metric-value">
                {data ? config.formatter!(data.value) : '--'}
              </div>
              {trend !== 0 && trendIcon && (
                <div className={`flex items-center space-x-1 ${trendColor}`}>
                  {React.createElement(trendIcon, { className: 'h-4 w-4' })}
                  <span className="text-sm font-medium">{Math.abs(trend)}%</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">{data?.label || config.title}</p>
            
            {showDetails && data && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="space-y-4">
                  {/* Metric Details */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">Last Update:</div>
                    <div className="text-gray-900">{new Date().toLocaleTimeString()}</div>
                    {data.previousValue !== undefined && (
                      <>
                        <div className="text-gray-500">Previous:</div>
                        <div className="text-gray-900">{config.formatter!(data.previousValue)}</div>
                      </>
                    )}
                  </div>
                  
                  {/* Business Description */}
                  {config.description && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Business Description</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">{config.description}</p>
                    </div>
                  )}
                  
                  {/* Query Details */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Query Details</h4>
                    <pre className="powerbi-query-details">
{config.query}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

// Main PowerBI Dashboard Component
export default function PowerBIDashboardPage() {
  const { toast } = useToast();
  const [widgetData, setWidgetData] = useState<Record<string, MetricData | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, Error | null>>({});
  const [refreshTriggers, setRefreshTriggers] = useState<Record<string, number>>({});
  
  // Add visibility state
  const [widgetVisibility, setWidgetVisibility] = useState<Record<string, boolean>>(() => {
    // Load saved visibility settings from localStorage
    const saved = localStorage.getItem('powerbi-widget-visibility');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default all widgets to visible
    return widgetConfigs.reduce((acc, config) => ({
      ...acc,
      [config.id]: true
    }), {});
  });
  
  const [showVisibilityDialog, setShowVisibilityDialog] = useState(false);

  // Toggle widget visibility
  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgetVisibility(prev => {
      const newVisibility = {
        ...prev,
        [widgetId]: !prev[widgetId]
      };
      // Save to localStorage
      localStorage.setItem('powerbi-widget-visibility', JSON.stringify(newVisibility));
      return newVisibility;
    });
  };

  // Fetch data for a widget
  const fetchData = async (config: WidgetConfig) => {
    if (!rateLimiter.canRequest(config.id)) {
      const nextRequest = rateLimiter.getTimeUntilNextRequest(config.id);
      toast({
        title: `Rate limit for ${config.title}`,
        description: `Please wait ${nextRequest} seconds before refreshing.`,
        variant: 'destructive'
      });
      return;
    }

    setLoading(prev => ({ ...prev, [config.id]: true }));
    
    try {
      // Determine if this is a dynamic widget or hardcoded
      const isDynamic = config.id.startsWith('dynamic-');
      
      if (isDynamic) {
        // Extract the actual widget ID
        const widgetId = config.id.replace('dynamic-', '');
        
        // Load the full widget configuration from the API
        const widgetResponse = await fetch(`/api/widgets/manage/${widgetId}`, {
          credentials: 'include'
        });
        
        if (!widgetResponse.ok) {
          throw new Error('Failed to load widget configuration');
        }
        
        const widget = await widgetResponse.json();
        
        // Execute the query through the appropriate plugin
        const response = await fetch(`/api/plugins/${widget.pluginName}/${widget.instanceId || `${widget.pluginName}-main`}/query`, {
          method: widget.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            query: widget.query,
            ...widget.parameters
          })
        });

        if (!response.ok) {
          throw new Error('Query failed');
        }

        const result = await response.json();
        
        // Extract data based on widget type and plugin
        let value = 0;
        let label = config.title;
        let previousValue: number | undefined;
        let trendPercentage: number | undefined;
        
        if (widget.pluginName === 'sql' || widget.pluginName === 'sql-plugin') {
          // SQL query result
          if (result.data?.rows?.[0]) {
            const row = result.data.rows[0];
            value = Number(row.value) || 0;
            label = row.label || label;
            previousValue = row.previous_value ? Number(row.previous_value) : undefined;
          }
        } else {
          // Other plugin results
          if (result.data?.value !== undefined) {
            value = Number(result.data.value) || 0;
          } else if (result.data?.total !== undefined) {
            value = Number(result.data.total) || 0;
          } else if (result.data?.count !== undefined) {
            value = Number(result.data.count) || 0;
          } else if (Array.isArray(result.data)) {
            value = result.data.length;
          }
        }
        
        // Calculate trend if previous value exists
        if (previousValue !== undefined && value > 0) {
          trendPercentage = ((value - previousValue) / previousValue) * 100;
        }
        
        setWidgetData(prev => ({
          ...prev,
          [config.id]: {
            value,
            label,
            previousValue,
            trendPercentage,
            lastUpdate: new Date()
          }
        }));
      } else {
        // Original hardcoded SQL query
        const response = await fetch('/api/plugins/sql/sql-main/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ query: config.query })
        });

        if (!response.ok) {
          throw new Error('Query failed');
        }

        const result = await response.json();
        
        if (result.data?.rows?.[0]) {
          const row = result.data.rows[0];
          const value = Number(row.value) || 0;
          
          setWidgetData(prev => {
            const prevData = prev[config.id];
            const prevValue = prevData?.value;
            
            return {
              ...prev,
              [config.id]: {
                value,
                label: row.label || config.title,
                previousValue: prevValue,
                trendPercentage: prevValue && value > 0
                  ? ((value - prevValue) / prevValue) * 100
                  : undefined,
                lastUpdate: new Date()
              }
            };
          });
        }
      }
      
      rateLimiter.recordRequest(config.id);
    } catch (error) {
      console.error(`Failed to fetch data for ${config.title}:`, error);
      setWidgetData(prev => ({
        ...prev,
        [config.id]: {
          value: 0,
          label: config.title,
          error: error instanceof Error ? error.message : 'Failed to load data',
          lastUpdate: new Date()
        }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [config.id]: false }));
    }
  };

  // Initial load
  useEffect(() => {
    allWidgets.forEach(config => {
      fetchData(config);
    });
  }, []); // Empty dependency - only run on mount

  // Refresh individual widget
  const refreshWidget = useCallback((configId: string) => {
    const config = widgetConfigs.find(c => c.id === configId);
    if (!config) return;

    if (!rateLimiter.canRequest(configId)) {
      toast({
        title: "Rate Limited",
        description: `Please wait ${Math.ceil(rateLimiter.getTimeUntilNextRequest(configId) / 1000)} seconds before refreshing.`,
        variant: "destructive"
      });
      return;
    }

    setRefreshTriggers(prev => ({
      ...prev,
      [configId]: (prev[configId] || 0) + 1
    }));

    fetchData(config);

    toast({
      title: "Refreshing",
      description: "Widget data is being updated...",
    });
  }, [toast, fetchData]);

  // Refresh all widgets
  const handleRefreshAll = useCallback(() => {
    const canRefreshAll = widgetConfigs.every(config => rateLimiter.canRequest(config.id));
    
    if (!canRefreshAll) {
      toast({
        title: "Rate Limited",
        description: "Some widgets are still rate limited. Please wait.",
        variant: "destructive"
      });
      return;
    }

    widgetConfigs.forEach(config => {
      fetchData(config);
    });

    toast({
      title: "Refreshing All",
      description: "All dashboard data is being updated...",
    });
  }, [toast, fetchData]);

  // Update timer for rate limit display
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const interval = setInterval(() => forceUpdate({}), 1000);
    return () => clearInterval(interval);
  }, []);

  // New states for dynamic widgets
  const [dynamicWidgets, setDynamicWidgets] = useState<WidgetConfig[]>([]);
  const [showWidgetManager, setShowWidgetManager] = useState(false);
  const [loadingDynamicWidgets, setLoadingDynamicWidgets] = useState(true);
  
  // Combine hardcoded and dynamic widgets
  const allWidgets = [...widgetConfigs, ...dynamicWidgets];

  // Load dynamic widgets from database
  const loadDynamicWidgets = async () => {
    try {
      setLoadingDynamicWidgets(true);
      const response = await fetch('/api/widgets/manage?placement=powerbi-dashboard', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load widgets');
      }
      
      const widgets = await response.json();
      
      // Convert database widgets to PowerBI widget format
      const powerbiWidgets = widgets
        .filter((w: any) => w.isActive && w.placement === 'powerbi-dashboard')
        .map((w: any) => ({
          id: `dynamic-${w.id}`,
          title: w.name,
          query: w.query,
          colorScheme: getColorSchemeForPlugin(w.pluginName),
          icon: getIconForPlugin(w.pluginName),
          formatter: (value: number) => value.toLocaleString(),
          description: w.description,
          drilldownUrl: w.displayConfig?.drilldownUrl
        }));
      
      setDynamicWidgets(powerbiWidgets);
      
      // Update visibility state for new widgets
      setWidgetVisibility(prev => {
        const updated = { ...prev };
        powerbiWidgets.forEach((widget: WidgetConfig) => {
          if (!(widget.id in updated)) {
            updated[widget.id] = true;
          }
        });
        return updated;
      });
    } catch (error) {
      console.error('Failed to load dynamic widgets:', error);
      toast({
        title: 'Failed to load custom widgets',
        description: 'Some widgets may not be displayed',
        variant: 'destructive'
      });
    } finally {
      setLoadingDynamicWidgets(false);
    }
  };

  // Helper function to get color scheme based on plugin name
  const getColorSchemeForPlugin = (pluginName: string): keyof typeof colorSchemes => {
    const colorMap: Record<string, keyof typeof colorSchemes> = {
      'jira': 'blue',
      'sql': 'green',
      'confluence': 'purple',
      'carbonblack': 'red',
      'fortigate': 'orange',
      'palo-alto': 'teal',
      'generic-api': 'indigo'
    };
    return colorMap[pluginName] || 'blue';
  };

  // Helper function to get icon based on plugin name
  const getIconForPlugin = (pluginName: string) => {
    const iconMap: Record<string, any> = {
      'jira': AlertCircle,
      'sql': Target,
      'confluence': FileText,
      'carbonblack': Shield,
      'fortigate': ShieldCheck,
      'palo-alto': Shield,
      'generic-api': Activity
    };
    return iconMap[pluginName] || Activity;
  };

  useEffect(() => {
    loadDynamicWidgets();
  }, []);

  return (
    <AppLayout 
      title="Business Intelligence Dashboard" 
      subtitle="Real-time metrics and KPIs powered by PowerBI-style design"
    >
      <div className="min-h-screen bg-gray-50">
        {/* Action Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <Calendar className="h-4 w-4 inline mr-1" />
              {new Date().toLocaleDateString()} • Last updated: {new Date().toLocaleTimeString()}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWidgetManager(true)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Manage Widgets
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVisibilityDialog(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Show/Hide Widgets
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAll}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh All
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 powerbi-grid">
            {allWidgets
              .filter(config => widgetVisibility[config.id])
              .map((config) => {
                return (
                  <MetricCard
                    key={config.id}
                    config={config}
                    data={widgetData[config.id] || null}
                    loading={loading[config.id] || false}
                    error={errors[config.id]}
                    onRefresh={() => refreshWidget(config.id)}
                    canRefresh={rateLimiter.canRequest(config.id)}
                    timeUntilRefresh={rateLimiter.getTimeUntilNextRequest(config.id)}
                  />
                );
              })}
          </div>

          {/* Show message if no widgets are visible */}
          {allWidgets.every(config => !widgetVisibility[config.id]) && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <EyeOff className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Widgets Visible</h3>
              <p className="text-sm text-gray-500 mb-4">
                All widgets are currently hidden. Click the button below to show them.
              </p>
              <Button onClick={() => setShowVisibilityDialog(true)} variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Manage Widget Visibility
              </Button>
            </div>
          )}

          {/* Additional sections can be added here */}
        </div>
      </div>

      {/* Widget Visibility Dialog */}
      <Dialog open={showVisibilityDialog} onOpenChange={setShowVisibilityDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Show/Hide Dashboard Widgets
            </DialogTitle>
            <DialogDescription>
              Choose which widgets to display on your dashboard. Changes are saved automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {allWidgets.map((config) => {
              const Icon = config.icon;
              const scheme = colorSchemes[config.colorScheme];
              const isVisible = widgetVisibility[config.id];
              
              return (
                <div 
                  key={config.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isVisible ? scheme.border : 'border-gray-200'
                  } ${isVisible ? scheme.lightBg : 'bg-gray-50'}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isVisible ? scheme.bg : 'bg-gray-300'}`}>
                      <Icon className={`h-4 w-4 ${isVisible ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <Label 
                      htmlFor={`widget-${config.id}`} 
                      className={`font-medium cursor-pointer ${
                        isVisible ? scheme.lightText : 'text-gray-600'
                      }`}
                    >
                      {config.title}
                    </Label>
                  </div>
                  <Switch
                    id={`widget-${config.id}`}
                    checked={isVisible}
                    onCheckedChange={() => toggleWidgetVisibility(config.id)}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-gray-500">
              {Object.values(widgetVisibility).filter(Boolean).length} of {allWidgets.length} widgets visible
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allVisible = allWidgets.reduce((acc, config) => ({
                    ...acc,
                    [config.id]: true
                  }), {});
                  setWidgetVisibility(allVisible);
                  localStorage.setItem('powerbi-widget-visibility', JSON.stringify(allVisible));
                  toast({
                    title: "All widgets shown",
                    description: "All dashboard widgets are now visible.",
                  });
                }}
              >
                Show All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allHidden = allWidgets.reduce((acc, config) => ({
                    ...acc,
                    [config.id]: false
                  }), {});
                  setWidgetVisibility(allHidden);
                  localStorage.setItem('powerbi-widget-visibility', JSON.stringify(allHidden));
                  toast({
                    title: "All widgets hidden",
                    description: "All dashboard widgets are now hidden.",
                  });
                }}
              >
                Hide All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Widget Manager Dialog */}
      <Dialog open={showWidgetManager} onOpenChange={setShowWidgetManager}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage PowerBI Dashboard Widgets</DialogTitle>
            <DialogDescription>
              Create and manage widgets for the PowerBI dashboard. These widgets will appear with the PowerBI styling.
            </DialogDescription>
          </DialogHeader>
          
          <Alert className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Creating PowerBI Widgets:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Use the <strong>SQL plugin</strong> to create metrics from your database</li>
                <li>Set widget type to <strong>"metric"</strong> for best PowerBI appearance</li>
                <li>Include these fields in your SQL query: <code>value</code>, <code>label</code></li>
                <li>Widgets will automatically get PowerBI styling and colors</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          <div className="mt-6">
            <GlobalWidgetManager 
              onClose={() => {
                setShowWidgetManager(false);
                loadDynamicWidgets();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
