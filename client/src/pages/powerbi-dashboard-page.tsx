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
  AlertTriangle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { GlobalWidgetManager } from '@/components/widgets/global-widget-manager';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  details?: any;
}

interface WidgetConfig {
  id: string;
  title: string;
  query: string;
  colorScheme: keyof typeof colorSchemes;
  icon: React.ElementType;
  plugin: 'sql' | 'jira';
  formatter?: (value: number) => string;
  description?: string;
  drilldownUrl?: string;
}

// Widget configurations - both SQL and Jira
const widgetConfigs: WidgetConfig[] = [
  // SQL Widgets
  {
    id: 'total-clients',
    title: 'Total Clients',
    query: `SELECT COUNT(*) as value, 'Total Clients' as label FROM clients`,
    colorScheme: 'blue',
    icon: Users,
    plugin: 'sql',
    formatter: (value) => value.toLocaleString(),
    description: 'Total number of client organizations',
    drilldownUrl: '/clients'
  },
  {
    id: 'active-contracts',
    title: 'Active Contracts',
    query: `SELECT COUNT(*) as value, 'Active Contracts' as label FROM contracts WHERE status = 'active'`,
    colorScheme: 'green',
    icon: FileText,
    plugin: 'sql',
    formatter: (value) => value.toLocaleString(),
    description: 'Number of active contracts',
    drilldownUrl: '/contracts'
  },
  {
    id: 'total-revenue',
    title: 'Total Revenue',
    query: `SELECT COALESCE(SUM("totalValue"), 0) as value, 'Total Revenue' as label FROM contracts WHERE status = 'active'`,
    colorScheme: 'purple',
    icon: DollarSign,
    plugin: 'sql',
    formatter: (value) => `$${value.toLocaleString()}`,
    description: 'Combined value of active contracts',
    drilldownUrl: '/financial-dashboard'
  },
  // Jira Widgets - TEMPORARILY DISABLED DUE TO CONNECTION ISSUES
  // Uncomment these when Jira connection is fixed
  /*
  {
    id: 'open-issues',
    title: 'Open Issues',
    query: `status not in (Closed, Resolved) ORDER BY created DESC`,
    colorScheme: 'red',
    icon: AlertCircle,
    plugin: 'jira',
    formatter: (value) => value.toLocaleString(),
    description: 'Total open Jira issues'
  },
  {
    id: 'critical-high',
    title: 'Critical & High Priority',
    query: `priority in (Critical, High) AND status not in (Closed, Resolved)`,
    colorScheme: 'orange',
    icon: AlertTriangle,
    plugin: 'jira',
    formatter: (value) => value.toLocaleString(),
    description: 'Critical and high priority open issues'
  },
  {
    id: 'this-week',
    title: "This Week's Issues",
    query: `created >= startOfWeek() ORDER BY created DESC`,
    colorScheme: 'teal',
    icon: TrendingUp,
    plugin: 'jira',
    formatter: (value) => value.toLocaleString(),
    description: 'Issues created this week'
  }
  */
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
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                setShowDetails(!showDetails);
              }}>
                {showDetails ? 'Hide' : 'Show'} Details
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }} 
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
            {error.message.includes('Authentication required') && (
              <a 
                href="/login" 
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Click here to log in
              </a>
            )}
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
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">Last Update:</div>
                    <div className="text-gray-900">{new Date().toLocaleTimeString()}</div>
                    <div className="text-gray-500">Plugin:</div>
                    <div className="text-gray-900">{config.plugin.toUpperCase()}</div>
                  </div>
                  
                  {config.description && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Description</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">{config.description}</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Query</h4>
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
  const [showVisibilityDialog, setShowVisibilityDialog] = useState(false);
  const [showWidgetManager, setShowWidgetManager] = useState(false);
  
  // Widget visibility state
  const [widgetVisibility, setWidgetVisibility] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('powerbi-widget-visibility');
    if (saved) {
      return JSON.parse(saved);
    }
    return widgetConfigs.reduce((acc, config) => ({
      ...acc,
      [config.id]: true
    }), {});
  });

  // Toggle widget visibility
  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgetVisibility(prev => {
      const newVisibility = {
        ...prev,
        [widgetId]: !prev[widgetId]
      };
      localStorage.setItem('powerbi-widget-visibility', JSON.stringify(newVisibility));
      return newVisibility;
    });
  };

  // Fetch data for a widget
  const fetchData = async (config: WidgetConfig) => {
    if (!rateLimiter.canRequest(config.id)) {
      toast({
        title: `Rate limit for ${config.title}`,
        description: `Please wait before refreshing.`,
        variant: 'destructive'
      });
      return;
    }

    setLoading(prev => ({ ...prev, [config.id]: true }));
    setErrors(prev => ({ ...prev, [config.id]: null }));
    
    try {
      let endpoint = '';
      let body = {};
      
      if (config.plugin === 'sql') {
        endpoint = '/api/plugins/sql/instances/sql-main/query';
        body = { query: config.query };
      } else if (config.plugin === 'jira') {
        endpoint = '/api/plugins/jira/instances/jira-main/query';
        body = { jql: config.query };
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        // Check if it's an authentication error
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in to view data.');
        }
        throw new Error('Query failed');
      }

      const result = await response.json();
      
      let value = 0;
      let label = config.title;
      
      if (config.plugin === 'sql' && result.data?.rows?.[0]) {
        const row = result.data.rows[0];
        value = Number(row.value) || 0;
        label = row.label || label;
      } else if (config.plugin === 'jira') {
        value = result.data?.total || 0;
      }
      
      setWidgetData(prev => ({
        ...prev,
        [config.id]: {
          value,
          label,
          details: result.data
        }
      }));
      
      rateLimiter.recordRequest(config.id);
    } catch (error) {
      console.error(`Failed to fetch data for ${config.title}:`, error);
      setErrors(prev => ({
        ...prev,
        [config.id]: error as Error
      }));
    } finally {
      setLoading(prev => ({ ...prev, [config.id]: false }));
    }
  };

  // Initial load
  useEffect(() => {
    widgetConfigs.forEach(config => {
      if (widgetVisibility[config.id]) {
        fetchData(config);
      }
    });
  }, []);

  // Refresh individual widget
  const refreshWidget = useCallback((configId: string) => {
    const config = widgetConfigs.find(c => c.id === configId);
    if (config) {
      fetchData(config);
    }
  }, []);

  // Refresh all widgets
  const handleRefreshAll = useCallback(() => {
    widgetConfigs.forEach(config => {
      if (widgetVisibility[config.id]) {
        fetchData(config);
      }
    });
    toast({
      title: "Refreshing All",
      description: "All dashboard data is being updated...",
    });
  }, [widgetVisibility]);

  // Update timer for rate limit display
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const interval = setInterval(() => forceUpdate({}), 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if any errors are authentication errors
  const hasAuthenticationError = Object.values(errors).some(
    error => error?.message.includes('Authentication required')
  );

  return (
    <AppLayout 
      title="PowerBI Dashboard" 
      subtitle="Business intelligence metrics with PowerBI-style visualization"
    >
      <div className="min-h-screen bg-gray-50">
        {/* Authentication Alert */}
        {hasAuthenticationError && (
          <Alert className="mx-6 mt-4 mb-0 border-orange-200 bg-orange-50">
            <Shield className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Authentication Required:</strong> Please{' '}
              <a href="/login" className="underline font-medium">log in</a>{' '}
              to view real-time dashboard data. Use credentials: admin@test.mssp.local / admin123
            </AlertDescription>
          </Alert>
        )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 powerbi-grid">
            {widgetConfigs
              .filter(config => widgetVisibility[config.id])
              .map((config) => (
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
              ))}
          </div>

          {/* Show message if no widgets are visible */}
          {widgetConfigs.every(config => !widgetVisibility[config.id]) && (
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
        </div>
      </div>

      {/* Widget Visibility Dialog */}
      <Dialog open={showVisibilityDialog} onOpenChange={setShowVisibilityDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Show/Hide Dashboard Widgets</DialogTitle>
            <DialogDescription>
              Choose which widgets to display on your PowerBI dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[50vh] overflow-y-auto">
            {widgetConfigs.map((config) => {
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
                    <div>
                      <Label 
                        htmlFor={`widget-${config.id}`} 
                        className={`font-medium cursor-pointer ${
                          isVisible ? scheme.lightText : 'text-gray-600'
                        }`}
                      >
                        {config.title}
                      </Label>
                      <p className="text-xs text-gray-500">{config.plugin.toUpperCase()}</p>
                    </div>
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
              {Object.values(widgetVisibility).filter(Boolean).length} of {widgetConfigs.length} widgets visible
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allVisible = widgetConfigs.reduce((acc, config) => ({
                    ...acc,
                    [config.id]: true
                  }), {});
                  setWidgetVisibility(allVisible);
                  localStorage.setItem('powerbi-widget-visibility', JSON.stringify(allVisible));
                }}
              >
                Show All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allHidden = widgetConfigs.reduce((acc, config) => ({
                    ...acc,
                    [config.id]: false
                  }), {});
                  setWidgetVisibility(allHidden);
                  localStorage.setItem('powerbi-widget-visibility', JSON.stringify(allHidden));
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
              Create and manage custom widgets for the PowerBI dashboard.
            </DialogDescription>
          </DialogHeader>
          
          <Alert className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>PowerBI Dashboard Widgets:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>This dashboard displays both SQL metrics and Jira issue tracking</li>
                <li>Custom widgets you create here will appear on this dashboard</li>
                <li>Set placement to "powerbi-dashboard" for new widgets</li>
                <li>Jira widgets have 1-minute rate limiting to prevent API overload</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          <div className="mt-6">
            <GlobalWidgetManager 
              onClose={() => {
                setShowWidgetManager(false);
                window.location.reload(); // Reload to show new widgets
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
