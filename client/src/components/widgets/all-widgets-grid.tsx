import React, { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';

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
}> = ({ widget, data, loading, onRefresh }) => {
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

export const AllWidgetsGrid: React.FC<AllWidgetsGridProps> = ({
  className = '',
  maxColumns = 4, // Reduced for better business dashboard layout
  showOnlyActive = true,
  showOnlyGlobal = false,
}) => {
  const [widgetData, setWidgetData] = useState<Record<string, WidgetData>>({});
  const [loadingWidgets, setLoadingWidgets] = useState<Record<string, boolean>>({});
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { toast } = useToast();

  // Fetch all widgets
  const { data: widgets, isLoading: widgetsLoading, refetch: refetchWidgets } = useQuery({
    queryKey: ['business-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/widgets/manage', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch business metrics');
      }
      
      const data = await response.json();
      return data as Widget[];
    },
    staleTime: 60000, // 1 minute for business data
    refetchInterval: 300000, // Auto-refresh every 5 minutes
  });

  // Filter widgets based on props
  const filteredWidgets = React.useMemo(() => {
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

  // Execute widget query to get business data
  const executeWidgetQuery = async (widget: Widget) => {
    try {
      setLoadingWidgets(prev => ({ ...prev, [widget.id]: true }));

      const response = await fetch('/api/plugins/jira/instances/jira-main/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          query: widget.query,
          method: widget.method,
          parameters: widget.parameters,
        }),
      });

      const result = await response.json();
      
      setWidgetData(prev => ({
        ...prev,
        [widget.id]: result
      }));

    } catch (error) {
      console.error(`Business metric error for ${widget.name}:`, error);
      setWidgetData(prev => ({
        ...prev,
        [widget.id]: {
          success: false,
          message: 'Data temporarily unavailable',
          error: error
        }
      }));
    } finally {
      setLoadingWidgets(prev => ({ ...prev, [widget.id]: false }));
    }
  };

  // Auto-execute all widgets on load
  useEffect(() => {
    if (filteredWidgets && filteredWidgets.length > 0) {
      filteredWidgets.forEach(widget => {
        executeWidgetQuery(widget);
      });
      setLastRefresh(new Date());
    }
  }, [filteredWidgets]);

  const refreshWidget = (widget: Widget) => {
    executeWidgetQuery(widget);
  };

  const refreshAllWidgets = () => {
    filteredWidgets.forEach(widget => {
      executeWidgetQuery(widget);
    });
    setLastRefresh(new Date());
    toast({
      title: "Business Metrics Refreshed",
      description: "All business metrics have been updated with the latest data.",
    });
  };

  const getGridClass = () => {
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
  };

  if (widgetsLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Business Dashboard</h2>
            <p className="text-gray-600">Loading business metrics...</p>
          </div>
        </div>
        <div className={`grid gap-6 ${getGridClass()}`}>
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-48 animate-pulse">
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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Business Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Dashboard</h2>
          <p className="text-gray-600">Real-time business metrics and performance indicators</p>
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
            disabled={Object.values(loadingWidgets).some(Boolean)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${Object.values(loadingWidgets).some(Boolean) ? 'animate-spin' : ''}`} />
            Refresh All
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
        <div className={`grid gap-6 ${getGridClass()}`}>
          {filteredWidgets.map((widget) => (
            <BusinessMetricCard
              key={widget.id}
              widget={widget}
              data={widgetData[widget.id] || null}
              loading={loadingWidgets[widget.id] || false}
              onRefresh={() => refreshWidget(widget)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AllWidgetsGrid; 