import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
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
  TrendingDown,
  Shield,
  Server,
  CheckCircle,
  Database,
  Package,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Zap,
  Monitor,
  Key,
  HardDrive,
  Activity,
  RefreshCw,
  Network,
  Building2,
  Award,
  FileCheck,
  CreditCard,
  File
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart } from 'recharts';

// Enhanced standardized card configuration interface
export interface StandardizedDashboardCard {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'table' | 'custom' | 'kpi' | 'license-pool' | 'license-pool-individual' | 'comparison' | 'external';
  category: 'dashboard' | 'kpi' | 'license' | 'custom' | 'comparison' | 'external' | 'clients' | 'financial' | 'analytics';
  dataSource: string;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  visible: boolean;
  position: number;
  config: {
    icon?: string;
    color?: string;
    format?: 'number' | 'currency' | 'percentage' | 'comparison' | 'currency_comparison' | 'utilization_comparison' | 'health_status' | 'time_ago';
    aggregation?: 'count' | 'sum' | 'average' | 'max' | 'min' | 'custom' | 'health_check' | 'latest_sync';
    chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'composed';
    filters?: Record<string, any>;
    trend?: boolean;
    poolId?: number; // For individual license pool cards
    showUtilization?: boolean; // For license pools
    showStatus?: boolean; // For license pools
    comparison?: Record<string, any>; // For comparison cards
    externalSource?: string; // For external data cards
    endpoint?: string; // For external data cards
    refreshInterval?: number; // For external data cards
    dataSourceId?: number; // For external data cards
    showStatusBreakdown?: boolean; // For external system health
    showDataSources?: boolean; // For data freshness
    showLegend?: boolean; // For charts
    showGrid?: boolean; // For charts
    showPercentage?: boolean; // For charts
    timeRange?: string; // For charts
    groupBy?: string; // For charts
    yAxisMax?: number; // For charts
  };
  isBuiltIn: boolean;
  isRemovable: boolean;
}

// Enhanced icon mapping
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
  Package,
  XCircle,
  ExternalLink,
  Zap,
  Monitor,
  Key,
  HardDrive,
  Activity,
  RefreshCw,
  Network,
  Building2,
  Award,
  FileCheck,
  CreditCard,
  File
};

// Enhanced color classes
const COLOR_CLASSES = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200', cardBg: 'bg-blue-50' },
  green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200', cardBg: 'bg-green-50' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200', cardBg: 'bg-emerald-50' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', cardBg: 'bg-orange-50' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200', cardBg: 'bg-purple-50' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200', cardBg: 'bg-indigo-50' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-200', cardBg: 'bg-cyan-50' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-200', cardBg: 'bg-violet-50' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', cardBg: 'bg-slate-50' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-200', cardBg: 'bg-yellow-50' },
  red: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200', cardBg: 'bg-red-50' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200', cardBg: 'bg-teal-50' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', cardBg: 'bg-gray-50' }
};

interface StandardizedDashboardCardProps {
  card: StandardizedDashboardCard;
  className?: string;
  onClick?: () => void;
}

export function StandardizedDashboardCard({ card, className, onClick }: StandardizedDashboardCardProps) {
  const [, navigate] = useLocation();

  // Enhanced API endpoint determination
  const getApiEndpoint = () => {
    switch (card.type) {
      case 'license-pool':
        return '/api/license-pools/summary';
      case 'license-pool-individual':
        return `/api/license-pools/${card.config.poolId}/stats`;
      case 'comparison':
        return '/api/dashboard/card-data';
      case 'external':
        return card.config.endpoint || '/api/dashboard/card-data';
      default:
        return '/api/dashboard/card-data';
    }
  };

  // Enhanced query key building
  const getQueryKey = () => {
    if (card.type === 'license-pool') {
      return ['license-pools-summary'];
    } else if (card.type === 'license-pool-individual') {
      return ['license-pool-individual', card.config.poolId];
    } else if (card.type === 'comparison') {
      return ['dashboard-comparison', card.id, card.config.comparison];
    } else if (card.type === 'external') {
      return ['dashboard-external', card.id, card.config.externalSource, card.config.dataSourceId];
    } else {
      return ['dashboard-card', card.id, card.dataSource, card.config];
    }
  };

  // Enhanced API request building
  const buildApiRequest = async () => {
    if (card.type === 'license-pool' || card.type === 'license-pool-individual') {
      const response = await apiRequest('GET', getApiEndpoint());
      return response.json();
    }

    if (card.type === 'comparison') {
      // Build comparison request
      const params = new URLSearchParams();
      params.append('comparison', JSON.stringify(card.config.comparison));
      
      const response = await apiRequest('GET', `/api/dashboard/card-data?${params.toString()}`);
      return response.json();
    }

    if (card.type === 'external') {
      // Build external data request
      const params = new URLSearchParams();
      
      if (card.config.dataSourceId) {
        params.append('dataSourceId', card.config.dataSourceId.toString());
      }
      
      params.append('aggregation', card.config.aggregation || 'count');
      
      if (card.config.filters) {
        Object.entries(card.config.filters).forEach(([key, value]) => {
          params.append(`filter_${key}`, String(value));
        });
      }

      const response = await apiRequest('GET', `/api/dashboard/card-data?${params.toString()}`);
      return response.json();
    }

    // Standard dashboard card API request
    const params = new URLSearchParams();
    params.append('table', card.dataSource);
    params.append('aggregation', card.config.aggregation || 'count');
    
    if (card.config.filters) {
      Object.entries(card.config.filters).forEach(([key, value]) => {
        params.append(`filter_${key}`, String(value));
      });
    }

    const response = await apiRequest('GET', `${getApiEndpoint()}?${params.toString()}`);
    return response.json();
  };

  const { data, isLoading, error } = useQuery({
    queryKey: getQueryKey(),
    queryFn: buildApiRequest,
    staleTime: card.type === 'external' ? (card.config.refreshInterval || 300000) : 5 * 60 * 1000,
    refetchInterval: card.type === 'external' ? (card.config.refreshInterval || 300000) : 30 * 1000,
  });

  // Enhanced click handler
  const handleCardClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    // Enhanced navigation based on card type and data source
    const navigationMap: Record<string, string> = {
      'clients': '/clients',
      'contracts': '/contracts',
      'services': '/services',
      'license_pools': '/license-pools',
      'hardware_assets': '/hardware-assets',
      'financial_transactions': '/financial-transactions',
      'proposals': '/proposals',
      'documents': '/documents',
      'service_authorization_forms': '/service-authorization-forms',
      'certificates_of_compliance': '/certificates-of-compliance',
      'users': '/admin/users',
      'external_systems': '/integration-engine',
      'integrated_data': '/integration-engine'
    };

    if (card.type === 'license-pool') {
      navigate('/license-pools');
    } else if (card.type === 'license-pool-individual') {
      navigate(`/license-pools/${card.config.poolId}`);
    } else if (card.type === 'external') {
      navigate('/integration-engine');
    } else {
      const route = navigationMap[card.dataSource];
      if (route) {
        navigate(route);
      }
    }
  };

  // Utility functions
  const getIconComponent = (iconName: string) => {
    const IconComponent = AVAILABLE_ICONS[iconName as keyof typeof AVAILABLE_ICONS];
    return IconComponent || Building;
  };

  const getColorClasses = (color: string) => {
    return COLOR_CLASSES[color as keyof typeof COLOR_CLASSES] || COLOR_CLASSES.blue;
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
      case 'time_ago':
        return formatTimeAgo(numValue);
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(numValue);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = new Date().getTime();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const calculateTrend = (current: number) => {
    // Mock trend calculation - in real implementation you'd compare with previous period
    const previousValue = current * (0.85 + Math.random() * 0.3);
    const change = ((current - previousValue) / previousValue) * 100;
    return Math.round(change * 10) / 10;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': 
      case 'active': 
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': 
      case 'degraded': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'critical': 
      case 'error': 
      case 'disconnected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Server className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': 
      case 'active': 
      case 'connected': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': 
      case 'degraded': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': 
      case 'error': 
      case 'disconnected': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Enhanced comparison chart rendering
  const renderComparisonChart = (comparisonData: Record<string, any>, chartType: string) => {
    if (!comparisonData || Object.keys(comparisonData).length === 0) {
      return <div className="text-center text-muted-foreground">No comparison data available</div>;
    }

    const data = Object.entries(comparisonData).map(([key, value]) => {
      const config = card.config.comparison?.[key] || {};
      return {
        name: config.label || key,
        value: typeof value === 'number' ? value : 0,
        color: config.color || '#8884d8'
      };
    });

    const COLORS = data.map(d => d.color);

    switch (chartType) {
      case 'pie':
      case 'doughnut':
        return (
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={chartType === 'doughnut' ? 20 : 0}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatValue(value as number, card.config.format)} />
              {card.config.showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
      default:
        return (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={data}>
              {card.config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip formatter={(value) => formatValue(value as number, card.config.format)} />
              {card.config.showLegend && <Legend />}
              <Bar dataKey="value" fill="#8884d8">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  // Component setup
  const IconComponent = getIconComponent(card.config.icon || 'Building');
  const colors = getColorClasses(card.config.color || 'blue');

  if (!card.visible) {
    return null;
  }

  const cardClassName = `cursor-pointer hover:shadow-lg transition-all ${
    card.size === 'small' ? 'h-auto' : card.size === 'large' ? 'min-h-[200px]' : 'min-h-[120px]'
  } ${colors.cardBg} ${colors.border} ${className}`;

  // Loading state
  if (isLoading) {
    return (
      <Card className={cardClassName}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <IconComponent className={`h-4 w-4 ${colors.text}`} />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
          {card.size === 'large' && <Skeleton className="h-20 w-full mt-4" />}
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cardClassName}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <IconComponent className={`h-4 w-4 ${colors.text}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600">Error loading data</div>
        </CardContent>
      </Card>
    );
  }

  // Render comparison cards
  if (card.type === 'comparison') {
    if (!data?.data) {
      return (
        <Card className={cardClassName}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={`p-2 rounded-lg ${colors.bg}`}>
              <IconComponent className={`h-4 w-4 ${colors.text}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">No comparison data available</div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={cardClassName} onClick={handleCardClick}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <IconComponent className={`h-4 w-4 ${colors.text}`} />
          </div>
        </CardHeader>
        <CardContent>
          {renderComparisonChart(data.data, card.config.chartType || 'bar')}
          
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            {Object.entries(data.data).map(([key, value]) => {
              const config = card.config.comparison?.[key] || {};
              return (
                <div key={key} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: config.color || '#8884d8' }}
                  />
                  <span className="text-muted-foreground">{config.label || key}:</span>
                  <span className="font-medium">
                    {formatValue(value as number, card.config.format)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render external data cards
  if (card.type === 'external') {
    const value = data?.value || 0;
    const metadata = data?.metadata || {};

    return (
      <Card className={cardClassName} onClick={handleCardClick}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">External</Badge>
            <div className={`p-2 rounded-lg ${colors.bg}`}>
              <IconComponent className={`h-4 w-4 ${colors.text}`} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${colors.text}`}>
            {formatValue(value, card.config.format)}
          </div>
          
          {card.config.externalSource && (
            <div className="text-xs text-muted-foreground mt-1">
              Source: {card.config.externalSource}
            </div>
          )}

          {data?.timestamp && (
            <div className="text-xs text-muted-foreground mt-1">
              Last updated: {formatTimeAgo(new Date(data.timestamp).getTime())}
            </div>
          )}

          {card.config.showStatusBreakdown && metadata.systemStatusBreakdown && (
            <div className="mt-3 space-y-1">
              {Object.entries(metadata.systemStatusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(status)}
                    <span className="capitalize">{status}</span>
                  </div>
                  <span className="font-medium">{formatValue(count as number, 'number')}</span>
                </div>
              ))}
            </div>
          )}

          {card.config.showDataSources && metadata.dataFreshness && (
            <div className="mt-3 space-y-1">
              {metadata.dataFreshness.map((source: any, index: number) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span>Source {source.dataSourceId}</span>
                  <span className="text-muted-foreground">
                    {formatTimeAgo(new Date(source.lastSync).getTime())}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Render license pool cards (existing implementation)
  if (card.type === 'license-pool') {
    const overallUtilization = data?.totalLicenses 
      ? ((data.totalAssigned / data.totalLicenses) * 100)
      : 0;

    return (
      <Card className={cardClassName} onClick={handleCardClick}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold">
            {formatValue(data?.totalLicenses || 0, 'number')}
          </div>
          <div className="text-xs text-muted-foreground">Total licenses</div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Utilization</span>
              <span className="text-sm font-medium">{overallUtilization.toFixed(1)}%</span>
            </div>
            <Progress value={overallUtilization} className="h-1.5" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Available: {formatValue(data?.totalAvailable || 0, 'number')}</span>
              <span>Assigned: {formatValue(data?.totalAssigned || 0, 'number')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (card.type === 'license-pool-individual') {
    if (!data) {
      return (
        <Card className={cardClassName}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pool Not Found</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              License pool data not available
            </div>
          </CardContent>
        </Card>
      );
    }

    const utilizationPercentage = data.utilizationPercentage || 0;

    return (
      <Card className={cardClassName} onClick={handleCardClick}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{data.licenseType || card.title}</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold">
            {formatValue(data.totalLicenses, 'number')}
          </div>
          <div className="text-xs text-muted-foreground">Total licenses</div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Utilization</span>
              <span className="text-sm font-medium">{utilizationPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={utilizationPercentage} className="h-1.5" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Available: {formatValue(data.availableLicenses, 'number')}</span>
              <span>Assigned: {formatValue(data.assignedLicenses, 'number')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Standard metric/KPI card (enhanced)
  const value = data?.value || 0;
  const trend = calculateTrend(value);
  const metadata = data?.metadata || {};

  return (
    <Card className={cardClassName} onClick={handleCardClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
        <div className="flex items-center space-x-2">
          {card.config.trend && (
            <div className={`flex items-center text-xs ${
              trend >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend >= 0 ? (
                <ArrowUpRight className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-1" />
              )}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <IconComponent className={`h-4 w-4 ${colors.text}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colors.text}`}>
          {formatValue(value, card.config.format)}
        </div>
        
        {card.size !== 'small' && (
          <>
            {card.config.trend && (
              <div className="flex items-center text-xs text-muted-foreground mt-2">
                {trend >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                )}
                {Math.abs(trend)}% from previous period
              </div>
            )}
            
            {/* Enhanced metadata display */}
            {metadata && metadata.statusBreakdown && (
              <div className="mt-3 space-y-1">
                <div className="text-xs text-muted-foreground font-medium">Status Breakdown:</div>
                {Object.entries(metadata.statusBreakdown).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between text-xs">
                    <span className="capitalize">{status ? status.replace('_', ' ') : 'Unknown'}</span>
                    <span className="font-medium">{formatValue(count as number, 'number')}</span>
                  </div>
                ))}
              </div>
            )}

            {metadata && metadata.industryBreakdown && Object.keys(metadata.industryBreakdown).length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-xs text-muted-foreground font-medium">Top Industries:</div>
                {Object.entries(metadata.industryBreakdown)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 3)
                  .map(([industry, count]) => (
                    <div key={industry} className="flex items-center justify-between text-xs">
                      <span>{industry}</span>
                      <span className="font-medium">{formatValue(count as number, 'number')}</span>
                    </div>
                  ))}
              </div>
            )}

            {metadata && metadata.utilizationByType && (
              <div className="mt-3 space-y-1">
                <div className="text-xs text-muted-foreground font-medium">Utilization by Type:</div>
                {metadata.utilizationByType.slice(0, 3).map((pool: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span>{pool.type}</span>
                    <span className="font-medium">{pool.utilization}%</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {card.config && card.config.filters && Object.keys(card.config.filters).length > 0 && (
          <div className="mt-2">
            {Object.entries(card.config.filters).map(([key, value]) => (
              <Badge key={key} variant="outline" className="text-xs mr-1">
                {key}: {String(value)}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 