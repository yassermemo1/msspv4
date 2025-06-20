import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  Users,
  Shield,
  FileText,
  AlertCircle,
  Calendar,
  RefreshCw,
  X
} from 'lucide-react';
import { DrillDownTable } from '@/components/ui/drill-down-table';
import { DynamicWidgetRenderer } from './dynamic-widget-renderer';

interface Widget {
  id: string;
  name: string;
  description: string;
  pluginName: string;
  widgetType: 'table' | 'chart' | 'metric' | 'list' | 'gauge' | 'query';
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  query: string;
  method: string;
  parameters: Record<string, any>;
  displayConfig: Record<string, any>;
  refreshInterval: number;
  isActive: boolean;
  isGlobal: boolean;
  position: number;
  systemId: number;
  systemName: string;
  createdAt: string;
  updatedAt: string;
  groupBy?: any;
}

interface WidgetData {
  success: boolean;
  data?: {
    totalResults: number;
    sampleData?: any[];
  };
  metadata?: {
    query: string;
    responseTime: string;
    dataType: string;
    recordCount: number;
  };
  message?: string;
  error?: any;
}

interface AllWidgetsGridProps {
  className?: string;
  maxColumns?: number;
  showOnlyActive?: boolean;
  showOnlyGlobal?: boolean;
}

const BusinessMetricCard: React.FC<{
  widget: Widget;
  data: WidgetData | null;
  loading: boolean;
  onRefresh: () => void;
  onDrillDown: (widget: Widget, data: any) => void;
}> = ({ widget, data, loading, onRefresh, onDrillDown }) => {
  const { toast } = useToast();

  // Business-friendly widget categories and icons
  const getBusinessMetric = () => {
    const name = widget.name.toLowerCase();
    const description = widget.description?.toLowerCase() || '';
    
    // Security & Incidents
    if (name.includes('security') || name.includes('incident') || name.includes('critical') || name.includes('high priority')) {
      return {
        icon: <Shield className="h-8 w-8" />,
        category: 'Security',
        color: 'text-red-600',
        bgColor: 'bg-gradient-to-r from-red-50 to-red-100',
        borderColor: 'border-red-200'
      };
    }
    
    // Issues & Problems
    if (name.includes('issues') || name.includes('open') || name.includes('unresolved') || name.includes('problems')) {
      return {
        icon: <AlertTriangle className="h-8 w-8" />,
        category: 'Issues',
        color: 'text-orange-600',
        bgColor: 'bg-gradient-to-r from-orange-50 to-orange-100',
        borderColor: 'border-orange-200'
      };
    }
    
    // Performance & Activity
    if (name.includes('performance') || name.includes('activity') || name.includes('recent') || name.includes('updated')) {
      return {
        icon: <Activity className="h-8 w-8" />,
        category: 'Activity',
        color: 'text-blue-600',
        bgColor: 'bg-gradient-to-r from-blue-50 to-blue-100',
        borderColor: 'border-blue-200'
      };
    }
    
    // Reports & Analytics
    if (name.includes('report') || name.includes('analytics') || name.includes('distribution') || name.includes('trend')) {
      return {
        icon: <BarChart3 className="h-8 w-8" />,
        category: 'Analytics',
        color: 'text-purple-600',
        bgColor: 'bg-gradient-to-r from-purple-50 to-purple-100',
        borderColor: 'border-purple-200'
      };
    }
    
    // Time-based metrics
    if (name.includes('time') || name.includes('duration') || name.includes('month') || name.includes('daily')) {
      return {
        icon: <Clock className="h-8 w-8" />,
        category: 'Timeline',
        color: 'text-green-600',
        bgColor: 'bg-gradient-to-r from-green-50 to-green-100',
        borderColor: 'border-green-200'
      };
    }
    
    // User/Client related
    if (name.includes('client') || name.includes('user') || name.includes('assignee')) {
      return {
        icon: <Users className="h-8 w-8" />,
        category: 'Clients',
        color: 'text-indigo-600',
        bgColor: 'bg-gradient-to-r from-indigo-50 to-indigo-100',
        borderColor: 'border-indigo-200'
      };
    }
    
    // Default
    return {
      icon: <FileText className="h-8 w-8" />,
      category: 'General',
      color: 'text-gray-600',
      bgColor: 'bg-gradient-to-r from-gray-50 to-gray-100',
      borderColor: 'border-gray-200'
    };
  };

  const businessMetric = getBusinessMetric();

  const formatBusinessValue = (count: number) => {
    if (count === 0) return '0';
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  };

  const getBusinessName = (name: string) => {
    // Convert technical names to business-friendly names
    return name
      .replace(/jira/gi, '')
      .replace(/issues/gi, 'Items')
      .replace(/DEP|MD/gi, 'Project')
      .replace(/security incidents/gi, 'Security Alerts')
      .replace(/open/gi, 'Active')
      .replace(/created/gi, 'New')
      .replace(/updated/gi, 'Modified')
      .replace(/unassigned/gi, 'Pending Assignment')
      .trim();
  };

  const getStatusIndicator = () => {
    if (loading) return { icon: <RefreshCw className="h-4 w-4 animate-spin" />, text: 'Updating', color: 'text-blue-500' };
    if (!data?.success) return { icon: <AlertCircle className="h-4 w-4" />, text: 'Offline', color: 'text-red-500' };
    return { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Live', color: 'text-green-500' };
  };

  const status = getStatusIndicator();
  const businessValue = data?.success && data.data?.totalResults !== undefined 
    ? formatBusinessValue(data.data.totalResults) 
    : '--';

  const handleCardClick = () => {
    if (data?.success && data.data?.totalResults !== undefined) {
      // Show drill-down modal with widget details
      onDrillDown(widget, data.data);
    } else {
      toast({
        title: getBusinessName(widget.name),
        description: `Current value: ${businessValue}`,
      });
    }
  };

  return (
    <Card 
      className={`${businessMetric.bgColor} ${businessMetric.borderColor} hover:shadow-md transition-shadow cursor-pointer`}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${businessMetric.color}`}>
              {getBusinessName(widget.name)}
            </p>
            <p className={`text-2xl font-bold ${businessMetric.color === 'text-gray-600' ? 'text-gray-900' : businessMetric.color}`}>
              {loading ? (
                <span className="animate-pulse">--</span>
              ) : (
                businessValue
              )}
            </p>
            <div className={`flex items-center text-xs mt-1 ${status.color}`}>
              {status.icon}
              <span className="ml-1">{status.text}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {businessMetric.icon}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              disabled={loading}
              className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Enhanced Asynchronous Widget Renderer Component with independent loading
const AsyncWidgetRenderer: React.FC<{
  widget: any;
  index: number;
  className?: string;
  onLoadingStateChange?: (widgetId: string, isLoading: boolean) => void;
}> = ({ widget, index, className, onLoadingStateChange }) => {
  const [loadingState, setLoadingState] = useState<'pending' | 'loading' | 'loaded' | 'error'>('pending');
  const [shouldMount, setShouldMount] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Immediate mounting - no artificial delays
    // Use RAF to ensure smooth rendering performance
    const rafId = requestAnimationFrame(() => {
      setShouldMount(true);
      setLoadingState('loading');
      onLoadingStateChange?.(widget.id, true);
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [widget.id, onLoadingStateChange]);

  const handleWidgetStateChange = (state: 'loading' | 'loaded' | 'error', errorMessage?: string) => {
    setLoadingState(state);
    if (state === 'error' && errorMessage) {
      setError(errorMessage);
    }
    if (state !== 'loading') {
      onLoadingStateChange?.(widget.id, false);
    }
  };

  // Convert GlobalWidget format to CustomWidget format for DynamicWidgetRenderer
  const customWidget = {
    id: widget.id,
    name: widget.name,
    description: widget.description,
    pluginName: widget.pluginName,
    instanceId: widget.pluginName === 'generic-api' ? 'mdr-main' : `${widget.pluginName}-main`,
    queryType: 'custom' as const,
    customQuery: widget.query,
    queryMethod: widget.method,
    queryParameters: widget.parameters || {},
    displayType: widget.widgetType,
    chartType: widget.chartType,
    refreshInterval: widget.refreshInterval || 300,
    placement: 'global-dashboard' as const,
    styling: widget.displayConfig || {},
    groupBy: widget.groupBy,
    filters: []
  };

  if (!shouldMount) {
    return (
      <Card className={`h-72 ${className} opacity-0 animate-in fade-in duration-300`}>
        <CardContent className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 bg-gray-200 rounded-full mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-gray-400">Preparing...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loadingState === 'error') {
    return (
      <Card className={`h-72 ${className} border-red-200 bg-red-50 animate-in fade-in duration-300`}>
        <CardContent className="p-6 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-700 font-medium">{widget.name}</p>
            <p className="text-xs text-red-600 mt-1">{error || 'Failed to load'}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 text-red-600 border-red-300 hover:bg-red-100"
              onClick={() => {
                setLoadingState('loading');
                setError(null);
                handleWidgetStateChange('loading');
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`animate-in fade-in duration-300 ${className}`} style={{ animationDelay: `${index * 50}ms` }}>
      <DynamicWidgetRenderer
        key={widget.id}
        widget={customWidget}
        className="h-72"
        onLoadingStateChange={handleWidgetStateChange}
      />
    </div>
  );
};

export const AllWidgetsGrid: React.FC<AllWidgetsGridProps> = ({
  className = '',
  maxColumns = 4,
  showOnlyActive = true,
  showOnlyGlobal = false,
}) => {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [loadingWidgets, setLoadingWidgets] = useState<Set<string>>(new Set());
  const [retryCount, setRetryCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedWidgets, setRefreshedWidgets] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Track individual widget loading states
  const handleWidgetLoadingStateChange = useCallback((widgetId: string, isLoading: boolean) => {
    setLoadingWidgets(prev => {
      const newSet = new Set(prev);
      if (isLoading) {
        newSet.add(widgetId);
      } else {
        newSet.delete(widgetId);
      }
      return newSet;
    });
  }, []);

  // Fetch all widgets with React Query for better caching and error handling
  const { data: widgets, isLoading: widgetsLoading, error: widgetsError, refetch: refetchWidgets } = useQuery({
    queryKey: ['business-metrics', retryCount],
    queryFn: async () => {
      const response = await fetch('/api/widgets/manage', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch business metrics: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data as Widget[];
    },
    staleTime: 60000, // 1 minute for business data
    refetchInterval: 300000, // Auto-refresh every 5 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Filter widgets based on props with memoization for performance
  const filteredWidgets = useMemo(() => {
    if (!widgets) return [];
    
    let filtered = widgets;
    
    if (showOnlyActive) {
      filtered = filtered.filter(w => w.isActive);
    }
    
    if (showOnlyGlobal) {
      filtered = filtered.filter(w => w.isGlobal);
    }

    // Sort by business priority (security first, then issues, then activity)
    return filtered.sort((a, b) => {
      const getPriority = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('security') || lower.includes('critical')) return 1;
        if (lower.includes('high priority') || lower.includes('incident')) return 2;
        if (lower.includes('open') || lower.includes('unresolved')) return 3;
        if (lower.includes('activity') || lower.includes('recent')) return 4;
        return 5;
      };
      
      return getPriority(a.name) - getPriority(b.name);
    });
  }, [widgets, showOnlyActive, showOnlyGlobal]);

  // Set refresh timestamp when widgets load
  useEffect(() => {
    if (filteredWidgets && filteredWidgets.length > 0) {
      setLastRefresh(new Date());
      console.log(`🚀 Dashboard loaded with ${filteredWidgets.length} widgets - PARALLEL LOADING ENABLED`);
      console.log('⚡ All widgets loading simultaneously for maximum performance');
    }
  }, [filteredWidgets]);

  // Smart staggered refresh that respects rate limits and provides fast feedback
  const refreshAllWidgets = useCallback(async () => {
    if (refreshing) return; // Prevent multiple simultaneous refreshes
    
    setRefreshing(true);
    setRefreshedWidgets(new Set());
    
    console.log(`🔄 Smart refresh: ${filteredWidgets.length} widgets with optimized staggering...`);
    
    // Show immediate feedback
    toast({
      title: "Smart Refresh Started",
      description: `Refreshing ${filteredWidgets.length} widgets with optimized timing to prevent overload.`,
      duration: 4000,
    });

    try {
      // Stagger refreshes to prevent API overload
      // Group widgets into batches to prevent overwhelming the server
      const BATCH_SIZE = 3; // Refresh 3 widgets at a time
      const BATCH_DELAY = 2000; // 2 second delay between batches
      const WIDGET_DELAY = 200; // 200ms delay between widgets in a batch

      for (let i = 0; i < filteredWidgets.length; i += BATCH_SIZE) {
        const batch = filteredWidgets.slice(i, i + BATCH_SIZE);
        
        // Process batch with internal staggering
        batch.forEach((widget, batchIndex) => {
          setTimeout(() => {
            setRefreshedWidgets(prev => new Set([...prev, widget.id]));
            
            // Force widget refresh by updating its key
            const widgetElement = document.querySelector(`[data-widget-id="${widget.id}"]`);
            if (widgetElement) {
              const refreshEvent = new CustomEvent('forceRefresh', { 
                detail: { widgetId: widget.id, timestamp: Date.now() } 
              });
              widgetElement.dispatchEvent(refreshEvent);
            }
          }, batchIndex * WIDGET_DELAY);
        });

        // Wait before processing next batch (except for the last batch)
        if (i + BATCH_SIZE < filteredWidgets.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      }

      // Update main refresh timestamp after all batches are scheduled
      setTimeout(() => {
        setLastRefresh(new Date());
        setRefreshing(false);
        
        toast({
          title: "Refresh Complete",
          description: `All ${filteredWidgets.length} widgets have been refreshed successfully.`,
          duration: 3000,
        });
      }, (Math.ceil(filteredWidgets.length / BATCH_SIZE) - 1) * BATCH_DELAY + BATCH_SIZE * WIDGET_DELAY + 1000);

    } catch (error) {
      console.error('Refresh error:', error);
      setRefreshing(false);
      toast({
        title: "Refresh Error",
        description: "Some widgets may not have updated. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    }
  }, [filteredWidgets, refreshing, toast]);

  const getGridClass = useMemo(() => {
    const cols = Math.min(maxColumns, filteredWidgets.length);
    const gridCols = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
      5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
      6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
    };
    return gridCols[cols as keyof typeof gridCols] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  }, [maxColumns, filteredWidgets.length]);

  // Loading state for initial widget list fetch
  if (widgetsLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Business Dashboard</h2>
            <p className="text-gray-600">Loading business metrics...</p>
          </div>
        </div>
        <div className={`grid gap-6 ${getGridClass}`}>
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-72 animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state for widget list fetch
  if (widgetsError) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Business Dashboard</h2>
            <p className="text-red-600">Failed to load business metrics</p>
          </div>
        </div>
        <Card className="p-12 text-center border-red-200 bg-red-50">
          <div className="space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-red-900">Unable to Load Widgets</h3>
              <p className="text-red-700 mt-2">
                {widgetsError instanceof Error ? widgetsError.message : 'Unknown error occurred'}
              </p>
              <Button 
                onClick={() => refetchWidgets()} 
                className="mt-4"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Business Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Dashboard</h2>
          <div className="flex items-center space-x-4 mt-1">
            <p className="text-gray-600">Real-time business metrics and performance indicators</p>
            {loadingWidgets.size > 0 && (
              <Badge variant="outline" className="animate-pulse">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                {loadingWidgets.size} loading
              </Badge>
            )}
            {refreshing && (
              <Badge variant="secondary" className="animate-pulse">
                <Clock className="h-3 w-3 mr-1" />
                Smart refresh in progress...
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            <Calendar className="h-4 w-4 inline mr-1" />
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <Button 
            onClick={refreshAllWidgets}
            variant="outline"
            size="sm"
            disabled={refreshing || loadingWidgets.size > 0}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Smart Refresh'}
          </Button>
        </div>
      </div>

      {/* Business Metrics Grid */}
      {filteredWidgets.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">No Business Metrics Available</h3>
              <p className="text-gray-600 mt-2">
                Business metrics are currently being configured. Please check back shortly.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className={`grid gap-6 ${getGridClass}`}>
          {filteredWidgets.map((widget: any, index: number) => (
            <div 
              key={`${widget.id}-${lastRefresh.getTime()}`}
              data-widget-id={widget.id}
              className={`${refreshedWidgets.has(widget.id) ? 'ring-2 ring-blue-200 ring-opacity-50' : ''} transition-all duration-300`}
            >
              <AsyncWidgetRenderer
                widget={widget}
                index={index}
                className="h-72"
                onLoadingStateChange={handleWidgetLoadingStateChange}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AllWidgetsGrid; 