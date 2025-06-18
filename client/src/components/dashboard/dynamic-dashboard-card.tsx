// @ts-nocheck

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { 
  Building,
  FileText,
  Users,
  DollarSign,
  AlertCircle,
  BarChart3,
  Target,
  Clock,
  TrendingUp,
  Shield,
  Server,
  CheckCircle,
  Database,
  TrendingDown,
  ExternalLink
} from "lucide-react";
import { DashboardCard } from "@/hooks/use-dashboard-settings";
import { apiRequest } from "@/lib/api";
import { DynamicWidgetRenderer } from "@/components/widgets/dynamic-widget-renderer";
import { ExpiringContractsCard } from "./expiring-contracts-card";
// IntegrationEngineWidget removed - integration engine deprecated

// Import CustomWidget interface for type safety
interface CustomWidget {
  id?: string;
  name: string;
  description: string;
  pluginName: string;
  instanceId: string;
  queryType: 'default' | 'custom';
  queryId?: string;
  customQuery?: string;
  queryMethod: string;
  queryParameters: Record<string, any>;
  displayType: 'table' | 'chart' | 'metric' | 'list' | 'gauge' | 'query' | 
               'number' | 'percentage' | 'progress' | 'trend' | 'summary' | 'statistic';
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  refreshInterval: number;
  placement: 'client-details' | 'global-dashboard' | 'custom';
  styling: {
    width: 'full' | 'half' | 'third' | 'quarter';
    height: 'small' | 'medium' | 'large';
    showBorder: boolean;
    showHeader: boolean;
  };
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  aggregation?: {
    function: 'count' | 'sum' | 'avg' | 'min' | 'max';
    field?: string;
  };
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Widget Card Renderer Component
interface WidgetCardRendererProps {
  card: DashboardCard;
}

function WidgetCardRenderer({ card }: WidgetCardRendererProps) {
  const { data: widget, isLoading, error, refetch } = useQuery({
    queryKey: ['widget', card.config.widgetId],
    queryFn: async () => {
      const response = await fetch(`/api/widgets/manage/${card.config.widgetId}`, {
        credentials: 'include', // Ensure authentication cookies are included
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch widget: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !!card.config.widgetId,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className={getSizeClasses(card.size)}>
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !widget) {
    return (
      <div className={getSizeClasses(card.size)}>
        <Card className="h-full border-red-200">
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-red-600">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Widget not found</p>
              <p className="text-xs text-red-500 mt-1">ID: {card.config.widgetId}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Convert the API widget data to the format expected by DynamicWidgetRenderer
  // Use the proper plugin instance mapping based on systemId
  const getInstanceId = () => {
    if (widget.pluginName === 'jira') {
      return widget.systemId === 1 ? 'jira-main' : `jira-system-${widget.systemId}`;
    }
    return `${widget.pluginName}-main`;
  };

  const widgetConfig: CustomWidget = {
    id: widget.id,
    name: widget.name,
    description: widget.description || '',
    pluginName: widget.pluginName,
    instanceId: getInstanceId(),
    queryType: 'custom' as const,
    customQuery: widget.query,
    queryMethod: widget.method || 'GET',
    queryParameters: widget.parameters || {},
    displayType: widget.widgetType as 'table' | 'chart' | 'metric' | 'list' | 'gauge' | 'query' | 
                                    'number' | 'percentage' | 'progress' | 'trend' | 'summary' | 'statistic',
    chartType: widget.chartType as 'bar' | 'line' | 'pie' | 'area' | undefined,
    refreshInterval: widget.refreshInterval || 30,
    placement: 'global-dashboard' as const,
    styling: {
      width: (widget.displayConfig?.width as 'full' | 'half' | 'third' | 'quarter') || 'full',
      height: (widget.displayConfig?.height as 'small' | 'medium' | 'large') || 'medium',
      showBorder: widget.displayConfig?.showBorder !== false,
      showHeader: widget.displayConfig?.showHeader !== false
    },
    enabled: widget.isActive !== false,
    // Add debugging info
    updatedAt: widget.updatedAt
  };

  console.log('=== WIDGET CARD RENDERER ===');
  console.log('Widget data:', widget);
  console.log('Converted config:', widgetConfig);
  console.log('Plugin instance ID:', getInstanceId());

  return (
    <div className={getSizeClasses(card.size)}>
      <DynamicWidgetRenderer
        key={`widget-${widget.id}-${widget.query}-${widget.updatedAt || Date.now()}`}
        widget={widgetConfig}
        className="h-full"
        onRefresh={() => refetch()}
        showTitle={true}
        enableCredentials={true}
      />
    </div>
  );
}

const AVAILABLE_ICONS = {
  Building,
  FileText,
  Users,
  DollarSign,
  AlertCircle,
  BarChart3,
  Target,
  Clock,
  TrendingUp,
  Shield,
  Server,
  CheckCircle,
  Database,
  ExternalLink
};

interface DynamicDashboardCardProps {
  card: DashboardCard;
  onClick?: () => void;
}

// Size class helper function
const getSizeClasses = (size: string) => {
  switch (size) {
    case 'small':
      return "col-span-1";
    case 'medium':
      return "col-span-1 md:col-span-2";
    case 'large':
      return "col-span-1 md:col-span-2 lg:col-span-3";
    case 'xlarge':
      return "col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4";
    default:
      return "col-span-1";
  }
};

export function DynamicDashboardCard({ card, onClick }: DynamicDashboardCardProps) {
  // Integration Engine widget support removed - deprecated

  // Check for special card types first
  if (card.id === 'expiring-contracts') {
    return <ExpiringContractsCard card={card} onClick={onClick} />;
  }

  // Handle widget cards differently from regular dashboard cards
  if (card.type === 'widget' && card.config.widgetId) {
    return <WidgetCardRenderer card={card} />;
  }

  // Create stable config object to prevent infinite re-renders
  const stableConfig = React.useMemo(() => {
    return {
      refreshInterval: card.config.refreshInterval || 60,
      dataParams: {}
    };
  }, [card.config]);

  // Regular widget handling for non-external widgets
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-card', card.id, card.dataSource, card.config],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('table', card.dataSource);
      params.append('aggregation', card.config.aggregation || 'count');
      
      if (card.config.filters) {
        Object.entries(card.config.filters).forEach(([key, value]) => {
          params.append(`filter_${key}`, String(value));
        });
      }

      const response = await apiRequest('GET', `/api/dashboard/card-data?${params.toString()}`);
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (reduced from 5)
    refetchInterval: 60 * 1000, // 1 minute (increased from 30 seconds for better performance)
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const getIconComponent = (iconName: string) => {
    const IconComponent = AVAILABLE_ICONS[iconName as keyof typeof AVAILABLE_ICONS];
    return IconComponent || Building;
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string; cardBg?: string }> = {
      blue: { 
        bg: "bg-blue-100", 
        text: "text-blue-600", 
        border: "border-blue-200",
        cardBg: "bg-blue-50"
      },
      green: { 
        bg: "bg-green-100", 
        text: "text-green-600", 
        border: "border-green-200",
        cardBg: "bg-green-50"
      },
      emerald: { 
        bg: "bg-emerald-100", 
        text: "text-emerald-600", 
        border: "border-emerald-200",
        cardBg: "bg-emerald-50"
      },
      orange: { 
        bg: "bg-orange-100", 
        text: "text-orange-600", 
        border: "border-orange-200",
        cardBg: "bg-orange-50"
      },
      purple: { 
        bg: "bg-purple-100", 
        text: "text-purple-600", 
        border: "border-purple-200",
        cardBg: "bg-purple-50"
      },
      indigo: { 
        bg: "bg-indigo-100", 
        text: "text-indigo-600", 
        border: "border-indigo-200",
        cardBg: "bg-indigo-50"
      },
      cyan: { 
        bg: "bg-cyan-100", 
        text: "text-cyan-600", 
        border: "border-cyan-200",
        cardBg: "bg-cyan-50"
      },
      violet: { 
        bg: "bg-violet-100", 
        text: "text-violet-600", 
        border: "border-violet-200",
        cardBg: "bg-violet-50"
      },
      slate: { 
        bg: "bg-slate-100", 
        text: "text-slate-600", 
        border: "border-slate-200",
        cardBg: "bg-slate-50"
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  const formatValue = (value: number | string, format?: string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(numValue);
      case 'percentage':
        return `${numValue.toFixed(1)}%`;
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(numValue);
    }
  };



  const calculateTrend = (current: number) => {
    // Mock trend calculation - in real implementation you'd compare with previous period
    // Use the card ID as a seed for consistent trend values across renders
    const seed = card.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const randomFactor = (Math.sin(seed) + 1) / 2; // Normalize to 0-1
    const previousValue = current * (0.8 + randomFactor * 0.4); // 80-120% of current
    
    if (previousValue === 0) return 0;
    const change = ((current - previousValue) / previousValue) * 100;
    return Math.round(change * 10) / 10;
  };

  const IconComponent = getIconComponent(card.config.icon || 'Building');
  const colors = getColorClasses(card.config.color || 'blue');

  if (!card.visible) {
    return null;
  }

  const cardClassName = `cursor-pointer hover:shadow-lg transition-all ${
    card.size === 'small' ? 'h-auto min-h-[100px]' : 'min-h-[120px]'
  } ${colors.cardBg} ${colors.border}`;

  if (isLoading) {
    return (
      <Card className={cardClassName}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
          <CardTitle className="text-xs font-medium truncate">{card.title}</CardTitle>
          <div className={`p-1.5 rounded-md ${colors.bg}`}>
            <IconComponent className={`h-3.5 w-3.5 ${colors.text}`} />
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <Skeleton className="h-6 w-16 mb-1" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cardClassName}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
          <CardTitle className="text-xs font-medium truncate">{card.title}</CardTitle>
          <div className={`p-1.5 rounded-md ${colors.bg}`}>
            <IconComponent className={`h-3.5 w-3.5 ${colors.text}`} />
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="text-xs text-red-600">Error loading data</div>
        </CardContent>
      </Card>
    );
  }

  const value = data?.value || 0;
  const trend = calculateTrend(value);

  return (
    <Card className={cardClassName} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
        <CardTitle className="text-xs font-medium truncate">{card.title}</CardTitle>
        <div className={`p-1.5 rounded-md ${colors.bg}`}>
          <IconComponent className={`h-3.5 w-3.5 ${colors.text}`} />
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className={`text-lg font-bold ${colors.text} leading-tight`}>
          {formatValue(value, card.config.format)}
        </div>
        
        {card.config.trend && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {trend >= 0 ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
            )}
            {Math.abs(trend)}% vs prev
          </div>
        )}
        
        {card.size !== 'small' && data?.metadata && (
          <div className="text-xs text-muted-foreground mt-1">
            {Object.entries(data.metadata).slice(0, 2).map(([key, value]) => (
              <div key={key} className="truncate">
                {key}: {typeof value === 'number' ? formatValue(value, 'number') : String(value)}
              </div>
            ))}
          </div>
        )}

        {card.config.filters && Object.keys(card.config.filters).length > 0 && card.size !== 'small' && (
          <div className="mt-1">
            {Object.entries(card.config.filters).slice(0, 2).map(([key, value]) => (
              <Badge key={key} variant="outline" className="text-xs mr-1 px-1 py-0">
                {key}: {String(value)}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 