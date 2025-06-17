import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlobalFilters, FilterOption, FilterValue } from '@/components/ui/global-filters';
import { LicensePoolCard } from './license-pool-card';
import { IndividualLicensePoolCard } from './individual-license-pool-card';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useLocation } from 'wouter';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import {
  Building,
  FileText,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  Shield,
  Server,
  Filter,
  Eye,
  BarChart3,
  Calendar,
  Zap,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Settings,
  MoreHorizontal,
  EyeOff,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  ExternalLink
} from 'lucide-react';
import { DynamicDashboardCard } from "./dynamic-dashboard-card";
import { useToast } from "@/hooks/use-toast";
import { useDashboardSettings, DashboardCard } from "@/hooks/use-dashboard-settings";
import { formatClientName } from "@/lib/utils";
import { EnhancedDashboardCustomizer, EnhancedDashboardCard } from "./enhanced-dashboard-customizer";
// External widget card removed - deprecated

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c', '#d084d0', '#8dd1e1', '#ffb347'];

interface DashboardStats {
  totalClients: number;
  activeContracts: number;
  totalRevenue: number;
  pendingTasks: number;
  
  // Extended dynamic metrics
  activeClients: number;
  inactiveClients: number;
  expiringContracts: number;
  completedTasks: number;
  totalRecurringRevenue: number;
  newContractRevenue: number;
  
  clientsByIndustry: Array<{ name: string; value: number; color?: string }>;
  revenueByMonth: Array<{ month: string; revenue: number; contracts: number; clients: number; activeContracts: number }>;
  contractStatusDistribution: Array<{ status: string; count: number; color?: string }>;
  serviceUtilization: Array<{ service: string; utilization: number; activeUtilization: number; capacity: number }>;
  teamPerformance: Array<{ member: string; completed: number; pending: number; satisfaction: number }>;
  clientSatisfaction: Array<{ month: string; score: number; responses: number }>;
  periodInfo?: {
    startDate: string;
    endDate: string;
    description: string;
  };
}

interface ApiDashboardResponse {
  overview: {
    totalClients: number;
    totalContracts: number;
    totalServices: number;
    activeContracts: string | number;
    totalRevenue: string | number;
  };
  timeRange: string;
  period: {
    start: string;
    end: string;
  };
  recentActivity: {
    clients: Array<any>;
    contracts: Array<any>;
  };
}

interface EnhancedDashboardProps {
  className?: string;
}

// Time range options with dynamic calculations
const getTimeRangeOptions = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  
  return [
    { value: 'all_time', label: 'All Time', description: 'Since the beginning' },
    { value: 'ytd', label: 'Year to Date', description: `Jan 1, ${currentYear} - Present` },
    { value: 'current_year', label: 'Current Year', description: `${currentYear}` },
    { value: 'last_year', label: 'Last Year', description: `${currentYear - 1}` },
    { value: 'current_quarter', label: 'Current Quarter', description: `Q${currentQuarter} ${currentYear}` },
    { value: 'last_quarter', label: 'Last Quarter', description: `Q${currentQuarter === 1 ? 4 : currentQuarter - 1} ${currentQuarter === 1 ? currentYear - 1 : currentYear}` },
    { value: 'last_3_months', label: 'Last 3 Months', description: 'Last 90 days' },
    { value: 'last_6_months', label: 'Last 6 Months', description: 'Last 180 days' },
    { value: 'last_12_months', label: 'Last 12 Months', description: 'Last 365 days' },
    { value: 'current_month', label: 'Current Month', description: now.toLocaleString('default', { month: 'long', year: 'numeric' }) },
    { value: 'last_month', label: 'Last Month', description: new Date(now.getFullYear(), now.getMonth() - 1).toLocaleString('default', { month: 'long', year: 'numeric' }) },
    { value: '30d', label: 'Last 30 Days', description: 'Last 30 days' },
    { value: '7d', label: 'Last 7 Days', description: 'Last week' }
  ];
};

// KPI Card Component for built-in cards
const KPICard: React.FC<{
  card: DashboardCard;
  data: any;
  timeRange: string;
  onViewDetails?: (metric: string) => void;
}> = ({ card, data, timeRange, onViewDetails }) => {
  const IconComponent = {
    Building: Building,
    FileText: FileText,
    DollarSign: DollarSign,
    Users: Users,
    Server: Server,
  }[card.config.icon || 'Building'] || Building;

  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    purple: 'text-purple-600 bg-purple-50',
    violet: 'text-violet-600 bg-violet-50',
  };

  const getValue = () => {
    switch (card.config.dataSource || card.dataSource) {
      case 'clients':
        return data?.totalClients || 0;
      case 'contracts':
        if (card.config.aggregation === 'sum') {
          return data?.totalRevenue || 0;
        }
        return data?.totalContracts || 0;
      case 'tasks':
        return data?.totalTasks || 0;
      default:
        return 0;
    }
  };

  const getTrend = () => {
    // Mock trend data - in real app this would come from API
    return Math.random() > 0.5 ? 'up' : 'down';
  };

  const getTrendPercentage = () => {
    return (Math.random() * 20 + 1).toFixed(1);
  };

  const formatValue = (value: number) => {
    if (card.config.format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toLocaleString();
  };

  const value = getValue();
  const trend = getTrend();
  const trendPercentage = getTrendPercentage();

  return (
    <Card className="relative overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onViewDetails?.(card.id)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${colorClasses[card.config.color as keyof typeof colorClasses] || colorClasses.blue}`}>
            <IconComponent className="h-5 w-5" />
          </div>
          {card.config.trend && (
            <div className={`flex items-center text-xs ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? (
                <ArrowUpRight className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-1" />
              )}
              {trendPercentage}%
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <p className="text-2xl font-bold">{formatValue(value)}</p>
          <p className="text-sm text-muted-foreground">{card.title}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default function EnhancedDashboard({ className }: EnhancedDashboardProps) {
  const [location, setLocation] = useLocation();
  const [selectedTimeRange, setSelectedTimeRange] = useState('ytd');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [showDrilldown, setShowDrilldown] = useState(false);
  const [drilldownData, setDrilldownData] = useState<any>(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const { toast } = useToast();

  // External widgets removed - deprecated

  const timeRangeOptions = getTimeRangeOptions();

  // Query for dashboard statistics
  const { data: stats, isLoading: statsLoading, refetch } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats', selectedTimeRange, filters, 'fixed-null-handling-2025-06-15'],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('timeRange', selectedTimeRange);
      
      // Add filters to the query parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(`${key}[]`, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const res = await apiRequest('GET', `/api/dashboard/stats?${params.toString()}`);
      const response: ApiDashboardResponse = await res.json();
      
      // Transform the response to match DashboardStats interface
      return {
        totalClients: response.overview.totalClients,
        activeContracts: typeof response.overview.activeContracts === 'string' 
          ? parseInt(response.overview.activeContracts) 
          : response.overview.activeContracts,
        totalRevenue: typeof response.overview.totalRevenue === 'string'
          ? parseFloat(response.overview.totalRevenue)
          : response.overview.totalRevenue,
        pendingTasks: 0, // Will be replaced with actual data
        activeClients: response.overview.totalClients, // Placeholder
        inactiveClients: 0, // Placeholder
        expiringContracts: 0, // Placeholder
        completedTasks: 0, // Placeholder
        totalRecurringRevenue: 0, // Placeholder
        newContractRevenue: 0, // Placeholder
        clientsByIndustry: response.recentActivity?.clients?.map((client: any, index: number) => ({
          name: client.industry || 'Unknown',
          value: 1,
          color: COLORS[index % COLORS.length]
        })) || [],
        revenueByMonth: [],
        contractStatusDistribution: [],
        serviceUtilization: [],
        teamPerformance: [],
        clientSatisfaction: [],
        periodInfo: {
          startDate: response.period.start,
          endDate: response.period.end,
          description: selectedTimeRange
        }
      } as DashboardStats;
    },
  });

  // Query for license pools with enhanced error handling
  const { data: licensePools, isLoading: licensePoolsLoading, error: licensePoolsError, refetch: refetchLicensePools } = useQuery<Array<{ id: number; name: string; vendor: string; productName: string }>>({
    queryKey: ['/api/license-pools'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/license-pools');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 3,
  });

  // Fetch clients, contracts, services for filter options
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/clients');
      return res.json();
    },
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['/api/contracts'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/contracts');
      return res.json();
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/services');
      return res.json();
    },
  });

  // Filter configuration
  const filterOptions: FilterOption[] = [
    {
      key: 'clientId',
      label: 'Client',
      type: 'select',
      options: (clients || []).map((c: any) => ({ value: c.id.toString(), label: formatClientName(c) })),
      icon: Building
    },
    {
      key: 'contractStatus',
      label: 'Contract Status',
      type: 'multiselect',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'pending', label: 'Pending' },
        { value: 'expired', label: 'Expired' },
        { value: 'cancelled', label: 'Cancelled' }
      ],
      icon: FileText
    },
    {
      key: 'serviceCategory',
      label: 'Service Category',
      type: 'multiselect',
      options: Array.from(new Set((services || []).map((s: any) => s.category))).map((cat: unknown) => ({
        value: cat as string,
        label: cat as string
      })),
      icon: Target
    },
    {
      key: 'revenueRange',
      label: 'Revenue Range',
      type: 'select',
      options: [
        { value: '0-10000', label: '$0 - $10K' },
        { value: '10000-50000', label: '$10K - $50K' },
        { value: '50000-100000', label: '$50K - $100K' },
        { value: '100000+', label: '$100K+' }
      ],
      icon: DollarSign
    },
    {
      key: 'dateRange',
      label: 'Custom Date Range',
      type: 'dateRange',
      icon: Calendar
    }
  ];

  // Handle drill-down actions
  const handleDrillDown = async (type: string, data: any) => {
    try {
      const params = new URLSearchParams();
      params.append('timeRange', selectedTimeRange);
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          params.append(key, Array.isArray(value) ? value.join(',') : String(value));
        }
      });

      const res = await apiRequest('GET', `/api/dashboard/drilldown/${type}?${params.toString()}`);
      const drillData = await res.json();
      setDrilldownData(drillData);
      setShowDrilldown(true);
    } catch (error) {
      console.error('Failed to fetch drill-down data:', error);
    }
  };

  // Navigate to detailed views
  const navigateToDetails = (type: string, id?: number) => {
    switch (type) {
      case 'clients':
        setLocation(id ? `/clients/${id}` : '/clients');
        break;
      case 'contracts':
        setLocation(id ? `/contracts/${id}` : '/contracts');
        break;
      case 'services':
        setLocation(id ? `/services/${id}` : '/services');
        break;
      case 'team':
        setLocation(id ? `/team/${id}` : '/team');
        break;
      case 'financial':
        setLocation('/financial');
        break;
      default:
        break;
    }
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((pld: any, index: number) => (
            <p key={index} style={{ color: pld.color }}>
              {pld.dataKey}: {pld.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get the current time range description
  const getCurrentTimeRangeDescription = () => {
    const option = timeRangeOptions.find(opt => opt.value === selectedTimeRange);
    return option?.description || 'Selected period';
  };

  // Format revenue with currency
  const formatRevenue = (amount: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount);
  };

  // Calculate trend percentage (mock for now, would be real calculation)
  const calculateTrend = (current: number, type: string) => {
    // This would be calculated based on previous period comparison
    // For now, we'll use mock values but structure for real implementation
    const mockTrends = {
      clients: selectedTimeRange === 'last_month' ? -2 : 12,
      contracts: selectedTimeRange === 'last_month' ? 0 : 5,
      revenue: selectedTimeRange === 'last_month' ? -100 : 18,
      tasks: -8
    };
    return mockTrends[type as keyof typeof mockTrends] || 0;
  };

  // Use the dashboard settings hook
  const {
    cards: dashboardCards,
    updateCards,
    updateCard,
    removeCard,
    addCard,
    saveSettings,
    saveCardsDirectly,
    resetToDefaults,
    reorderCards,
    isSaving,
    isResetting,
    visibleCards,
    refetch: refetchDashboardSettings
  } = useDashboardSettings();

  const handleSaveDashboard = () => {
    const success = saveSettings();
    if (success) {
      toast({
        title: "Success",
        description: "Dashboard configuration saved successfully",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to save dashboard configuration",
        variant: "destructive",
      });
    }
  };

  const getGridColsClass = (cardCount: number) => {
    // Responsive grid that works well on all screen sizes
    if (cardCount === 1) return "grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-w-sm sm:max-w-md lg:max-w-none mx-auto lg:mx-0";
    if (cardCount === 2) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-w-md sm:max-w-none mx-auto sm:mx-0";
    if (cardCount === 3) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4";
    if (cardCount === 4) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4";
    if (cardCount <= 6) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4";
    if (cardCount <= 8) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4";
    return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4";
  };

  const handleRemoveCard = (cardId: string) => {
    removeCard(cardId);
    toast({
      title: "Card Removed",
      description: "The widget has been removed from your dashboard.",
    });
  };

  const handleEditCard = (cardId: string) => {
    // For now, just open the customizer.
    // A more specific edit modal could be implemented later.
    setShowCustomizer(true);
    toast({
      title: "Edit Card",
      description: "Use the customizer to modify your cards.",
    });
  };

  const getChartData = (dataSource: string, chartType: string) => {
    // This is a mock implementation. Replace with actual data fetching or processing.
    if (dataSource === 'revenueByMonth') {
      return stats?.revenueByMonth || [];
    }
    if (dataSource === 'clientsByIndustry') {
      return stats?.clientsByIndustry || [];
    }
    if (dataSource === 'contractStatusDistribution') {
      return stats?.contractStatusDistribution || [];
    }
    return [];
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={className}>

      {/* Dashboard Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Overview</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {getCurrentTimeRangeDescription()}
              {stats?.periodInfo && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {stats.periodInfo.description}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <GlobalFilters
          filters={filterOptions}
          values={filters}
          onChange={setFilters}
          onClear={() => setFilters({})}
          compact={true}
          className="mb-4"
        />
      </div>

      {/* Dashboard Cards Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold text-gray-900">
              Dashboard Overview
            </h2>
            <Badge variant="outline" className="ml-2">
              {visibleCards.length} card{visibleCards.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomizer(!showCustomizer)}
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>{showCustomizer ? 'Hide Customizer' : 'Customize Dashboard'}</span>
            </Button>
          </div>
        </div>

        {/* Customizable Dashboard Cards */}
        <div className="mb-6">
          {visibleCards.length > 0 && (
            <div className={getGridColsClass(visibleCards.length)}>
              {visibleCards.map((card) => {
                // External widget functionality removed - deprecated
                if (card.type === 'chart') {
                  const chartData = getChartData(card.config.dataSource || '', card.config.chartType || '');
                  // ... existing code ...
                }
                
                // Handle widget cards with special onClick behavior
                if (card.type === 'widget') {
                  return (
                    <DynamicDashboardCard
                      key={card.id}
                      card={card}
                      onClick={() => {
                        // For widget cards, you could navigate to widget manager or specific widget details
                        // setLocation(`/widgets/${card.config.widgetId}`);
                        console.log('Widget card clicked:', card.config.widgetId);
                      }}
                    />
                  );
                }
                
                return (
                  <DynamicDashboardCard
                    key={card.id}
                    card={card}
                    onClick={() => {
                      // Navigate to relevant page based on data source
                      const navigationMap: Record<string, string> = {
                        'clients': '/clients',
                        'contracts': '/contracts',
                        'services': '/services',
                        'license_pools': '/license-pools',
                        'hardware_assets': '/hardware-assets',
                      };
                      const route = navigationMap[card.dataSource];
                      if (route) {
                        setLocation(route);
                      }
                    }}
                  />
                );
              })}
            </div>
          )}
          
          {/* Empty Dashboard State */}
          {visibleCards.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="flex flex-col items-center space-y-4">
                  <BarChart3 className="h-12 w-12 text-gray-400" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Dashboard Cards Visible
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Customize your dashboard to add cards and charts
                    </p>
                    <Button onClick={() => setShowCustomizer(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Customize Dashboard
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>



      {/* License Pool Cards Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">License Pool Management</h3>
          <div className="flex items-center space-x-2">
            {!licensePoolsLoading && !licensePoolsError && (
              <Badge variant="outline" className="text-xs">
                {licensePools?.length || 0} Pool{(licensePools?.length || 0) !== 1 ? 's' : ''} Available
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchLicensePools()}
              disabled={licensePoolsLoading}
            >
              <Activity className={`h-4 w-4 mr-1 ${licensePoolsLoading ? 'animate-spin' : ''}`} />
              Refresh Pools
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation('/license-pools')}
            >
              <Eye className="h-4 w-4 mr-1" />
              View All Pools
            </Button>
          </div>
        </div>
        
        {/* Loading State */}
        {licensePoolsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-purple-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-purple-200 rounded mb-2"></div>
                    <div className="h-8 bg-purple-200 rounded mb-2"></div>
                    <div className="h-3 bg-purple-200 rounded mb-1"></div>
                    <div className="h-3 bg-purple-200 rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Error State */}
        {licensePoolsError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
              <h4 className="text-lg font-medium text-red-600 mb-2">Error Loading License Pools</h4>
              <p className="text-sm text-red-500 mb-4 max-w-md">
                Unable to fetch license pool data. Please check your connection and try again.
              </p>
              <Button 
                onClick={() => refetchLicensePools()}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-100"
              >
                <Activity className="h-4 w-4 mr-2" />
                Retry Loading
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Success State - Dynamic Grid Layout */}
        {!licensePoolsLoading && !licensePoolsError && licensePools && licensePools.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
            {licensePools.map((pool) => (
              <IndividualLicensePoolCard 
                key={pool.id}
                poolId={pool.id}
                className="bg-purple-50 border-purple-200 hover:bg-purple-100 transition-colors duration-200 hover:shadow-md"
              />
            ))}
          </div>
        )}
        
        {/* Empty State */}
        {!licensePoolsLoading && !licensePoolsError && (!licensePools || licensePools.length === 0) && (
          <Card className="border-dashed border-2 border-gray-300 bg-gray-50">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Server className="h-12 w-12 text-gray-400 mb-3" />
              <h4 className="text-lg font-medium text-gray-600 mb-2">No License Pools Available</h4>
              <p className="text-sm text-gray-500 mb-4 max-w-md">
                Get started by creating your first license pool to track software licenses and utilization.
              </p>
              <Button 
                onClick={() => setLocation('/license-pools')}
                variant="outline"
                size="sm"
              >
                <Server className="h-4 w-4 mr-2" />
                Manage License Pools
              </Button>
            </CardContent>
          </Card>
        )}
      </div>



      {/* Enhanced Dashboard Customizer Modal */}
      {showCustomizer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Enhanced Dashboard Customizer</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Create advanced dashboard cards with external data integration and comparisons
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomizer(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <EnhancedDashboardCustomizer
                cards={dashboardCards as EnhancedDashboardCard[]}
                onCardsChange={async (enhancedCards) => {
                  console.log('=== ENHANCED DASHBOARD: onCardsChange ===');
                  console.log('Enhanced cards received:', enhancedCards);
                  
                  // Convert EnhancedDashboardCard[] to DashboardCard[]
                  const convertedCards = enhancedCards.map((card): DashboardCard => {
                    console.log(`Converting card ${card.id}:`, card);
                    console.log(`Original config:`, card.config);
                    
                    const converted = {
                      id: card.id,
                      title: card.title,
                      type: (card.type === 'comparison' || card.type === 'pool-comparison')
                        ? ('custom' as DashboardCard['type'])
                        : (card.type as DashboardCard['type']),
                      category: (card.category === 'comparison' ? 'custom' : card.category) as DashboardCard['category'],
                      dataSource: card.dataSource,
                      size: card.size,
                      visible: card.visible,
                      position: card.position,
                      config: {
                        // Preserve ALL original config properties
                        ...card.config,
                        // Ensure these core properties are set even if not in original config
                        icon: card.config.icon || 'Building',
                        color: card.config.color || 'blue',
                        format: card.config.format || 'number',
                        aggregation: card.config.aggregation || 'count'
                      },
                      isBuiltIn: card.isBuiltIn,
                      isRemovable: card.isRemovable
                    };
                    
                    console.log(`Converted config:`, converted.config);
                    return converted;
                  });
                  
                  console.log('Final converted cards:', convertedCards);
                  
                  // Update cards and save
                  updateCards(convertedCards);
                  saveCardsDirectly(convertedCards);
                }}
                onClose={() => setShowCustomizer(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Drill-down Modal */}
      {showDrilldown && drilldownData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Detailed View - {getCurrentTimeRangeDescription()}</CardTitle>
                <Button variant="ghost" onClick={() => setShowDrilldown(false)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Render drill-down content based on data type */}
              <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(drilldownData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 