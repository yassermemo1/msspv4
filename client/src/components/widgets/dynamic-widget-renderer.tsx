import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/api';
import { 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Settings,
  BarChart3,
  PieChart,
  LineChart,
  Table as TableIcon,
  Gauge,
  TrendingUp,
  TrendingDown,
  Activity,
  Hash,
  Percent,
  Target,
  Minus,
  Clock,
  Edit2,
  Trash2,
  Users,
  Shield,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

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
               'number' | 'percentage' | 'progress' | 'trend' | 'summary' | 'statistic' | 'cards';
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
  groupBy?: {
    field: string; // X-axis field for grouping
    valueField?: string; // Y-axis field for values
    aggregationFunction?: 'count' | 'sum' | 'avg' | 'min' | 'max';
    limit?: number; // Limit number of groups
    sortBy?: 'asc' | 'desc'; // Sort groups by value
  };
  fieldSelection?: {
    enabled: boolean;
    selectedFields: string[];
    excludeNullFields?: boolean;
  };
  chainedQuery?: {
    enabled: boolean;
    lookupQuery: string;
    lookupField: string;
    targetField: string;
  };
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface DynamicWidgetRendererProps {
  widget: CustomWidget;
  clientShortName?: string; // For client-specific widgets
  clientName?: string; // Full client name
  clientDomain?: string; // Client domain
  onEdit?: (widget: CustomWidget) => void;
  onDelete?: (widgetId: string) => void;
  onRefresh?: () => void; // For external refresh requests
  onLoadingStateChange?: (state: 'loading' | 'loaded' | 'error', errorMessage?: string) => void; // For async loading tracking
  className?: string;
  previewData?: any; // For preview mode with test data
}

// Global rate limiting tracker (shared across all widget instances)
const widgetLastRequestMap = new Map<string, number>();
const RATE_LIMIT_INTERVAL = 60000; // 1 minute in milliseconds

export const DynamicWidgetRenderer: React.FC<DynamicWidgetRendererProps> = ({
  widget,
  clientShortName,
  clientName,
  clientDomain,
  onEdit,
  onDelete,
  onRefresh,
  onLoadingStateChange,
  className = '',
  previewData
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // If we have preview data, use it directly
    if (previewData) {
      setData(previewData);
      setLastUpdate(new Date());
      setLoading(false);
      onLoadingStateChange?.('loaded');
      return;
    }
    
    fetchData();
    
    // Set up auto-refresh (only if not in preview mode)
    if (widget.refreshInterval > 0 && !previewData) {
      const interval = setInterval(fetchData, widget.refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [widget, clientShortName, clientName, clientDomain, previewData]);

  // Add force refresh event listener for smart refresh system
  useEffect(() => {
    const handleForceRefresh = (event: CustomEvent) => {
      const { widgetId, timestamp } = event.detail;
      if (widgetId === widget.id) {
        console.log(`🔄 Force refreshing widget: ${widget.name} at ${new Date(timestamp).toLocaleTimeString()}`);
        fetchData();
      }
    };

    // Listen for force refresh events
    document.addEventListener('forceRefresh', handleForceRefresh as EventListener);
    
    return () => {
      document.removeEventListener('forceRefresh', handleForceRefresh as EventListener);
    };
  }, [widget.id, widget.name]);

  const fetchData = async () => {
    if (previewData !== undefined) {
      setData(previewData);
      return;
    }

    setLoading(true);
    setError(null);
    if (onLoadingStateChange) {
      onLoadingStateChange('loading');
    }

    try {
      const endpoint = widget.queryType === 'custom' 
        ? `/api/plugins/${widget.pluginName}/${widget.instanceId}/query/custom`
        : `/api/plugins/${widget.pluginName}/${widget.instanceId}/query/${widget.queryId}`;

      // Add client context to parameters if clientShortName is provided
      const queryParams = widget.queryParameters || {};
      if (clientShortName) {
        queryParams.clientShortName = clientShortName;
      }
      if (clientName) {
        queryParams.clientName = clientName;
      }
      if (clientDomain) {
        queryParams.clientDomain = clientDomain;
      }

      const payload = {
        query: widget.customQuery || '',
        parameters: queryParams,
        filters: widget.filters,
        aggregation: widget.aggregation,
        groupBy: widget.groupBy,
        xAxisField: (widget as any).xAxisField,
        yAxisField: (widget as any).yAxisField,
        dynamicFilters: (widget as any).dynamicFilters,
        fieldSelection: widget.fieldSelection
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Extract data from wrapped responses
      let extractedData = result;
      
      // Handle common response wrapper patterns
      if (result && typeof result === 'object') {
        // Check for response wrapper (e.g., from generic-api plugin)
        if ('success' in result && 'response' in result) {
          extractedData = result.response;
        }
        // Check for data wrapper
        else if ('data' in result && !('value' in result)) {
          extractedData = result.data;
        }
        // Check for results wrapper
        else if ('results' in result && !('value' in result)) {
          extractedData = result.results;
        }
      }
      
      setData(extractedData);
      setLastUpdate(new Date());
      
      if (onLoadingStateChange) {
        onLoadingStateChange('loaded');
      }
    } catch (err) {
      console.error('Widget data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      if (onLoadingStateChange) {
        onLoadingStateChange('error', err instanceof Error ? err.message : 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const getWidthClass = () => {
    const width = widget.styling?.width || 'full';
    switch (width) {
      case 'full': return 'w-full';
      case 'half': return 'w-1/2';
      case 'third': return 'w-1/3';
      case 'quarter': return 'w-1/4';
      default: return 'w-full';
    }
  };

  const getHeightClass = () => {
    const height = widget.styling?.height || 'medium';
    switch (height) {
      case 'small': return 'h-48';
      case 'medium': return 'h-72';
      case 'large': return 'h-96';
      default: return 'h-72';
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      );
    }

    if (error) {
      return (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      );
    }

    if (!data) {
      return (
        <div className="text-center text-gray-500 py-8">
          No data available
        </div>
      );
    }

    switch (widget.displayType) {
      case 'table':
        return renderTable();
      case 'chart':
        return renderChart();
      case 'metric':
        return renderMetric();
      case 'list':
        return renderList();
      case 'gauge':
        return renderGauge();
      case 'query':
        return renderQuery();
      case 'number':
        return renderNumber();
      case 'percentage':
        return renderPercentage();
      case 'progress':
        return renderProgress();
      case 'trend':
        return renderTrend();
      case 'statistic':
        return renderStatistic();
      case 'summary':
        return renderSummary();
      case 'cards':
        return renderCards();
      default:
        return <div>Unsupported display type: {widget.displayType}</div>;
    }
  };

  const renderTable = () => {
    if (!Array.isArray(data)) {
      return <div className="text-gray-500">Data is not in table format</div>;
    }

    if (data.length === 0) {
      return <div className="text-gray-500">No data to display</div>;
    }

    const columns = Object.keys(data[0]);

    return (
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {columns.map((col) => (
                <th key={col} className="text-left p-2 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((row, idx) => (
              <tr key={idx} className="border-b hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col} className="p-2">
                    {String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 10 && (
          <div className="text-xs text-gray-500 mt-2 text-center">
            Showing 10 of {data.length} rows
          </div>
        )}
      </div>
    );
  };

  const renderChart = () => {
    let chartData = data;

    // Apply groupBy processing if configured
    if (widget.groupBy && Array.isArray(data) && data.length > 0) {
      chartData = processGroupedData(data, widget.groupBy);
    } else {
      // Convert data to chart format if needed (fallback to original logic)
      if (Array.isArray(data) && data.length > 0) {
        // If data is an array of objects, use as-is
        if (typeof data[0] === 'object') {
          chartData = data;
        } else {
          // Convert simple array to chart format
          chartData = data.map((value, index) => ({
            name: `Item ${index + 1}`,
            value: value
          }));
        }
      } else if (typeof data === 'object') {
        // Convert object to chart format
        chartData = Object.entries(data).map(([key, value]) => ({
          name: key,
          value: value
        }));
      }
    }

    const colors = ['#3b82f6', '#1e40af', '#60a5fa', '#93c5fd', '#dbeafe', '#f97316', '#ea580c', '#dc2626'];

    // Determine the data keys for X and Y axes
    const xKey = widget.groupBy?.field || 'name';
    const yKey = widget.groupBy?.valueField || 'value';

    switch (widget.chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={xKey} 
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                fontSize={12}
              />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [formatChartValue(value), name]}
                labelFormatter={(label) => `${widget.groupBy?.field || 'Category'}: ${label}`}
              />
              <Bar dataKey={yKey} fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={xKey}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                fontSize={12}
              />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [formatChartValue(value), name]}
                labelFormatter={(label) => `${widget.groupBy?.field || 'Category'}: ${label}`}
              />
              <Line type="monotone" dataKey={yKey} stroke={colors[0]} strokeWidth={2} />
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey={yKey}
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatChartValue(value)} />
            </RechartsPieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={xKey}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                fontSize={12}
              />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [formatChartValue(value), name]}
                labelFormatter={(label) => `${widget.groupBy?.field || 'Category'}: ${label}`}
              />
              <Area type="monotone" dataKey={yKey} stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return renderTable();
    }
  };

  // Helper function to process grouped data
  const processGroupedData = (rawData: any[], groupConfig: NonNullable<CustomWidget['groupBy']>) => {
    const { field, valueField, aggregationFunction = 'count', limit = 10, sortBy = 'desc' } = groupConfig;
    
    console.log('🔄 Processing grouped data:', {
      field,
      valueField,
      aggregationFunction,
      limit,
      sortBy,
      dataLength: rawData.length
    });

    // Group data by the specified field
    const groups: Record<string, any[]> = {};
    rawData.forEach(item => {
      const groupValue = String(item[field] || 'Unknown');
      if (!groups[groupValue]) {
        groups[groupValue] = [];
      }
      groups[groupValue].push(item);
    });

    // Calculate aggregated values for each group
    const processedData = Object.keys(groups).map(groupKey => {
      const groupItems = groups[groupKey];
      let value = 0;
      
      switch (aggregationFunction) {
        case 'count':
          value = groupItems.length;
          break;
        case 'sum':
          if (valueField) {
            value = groupItems.reduce((sum, item) => {
              const val = Number(item[valueField]) || 0;
              return sum + val;
            }, 0);
          } else {
            value = groupItems.length;
          }
          break;
        case 'avg':
          if (valueField) {
            const values = groupItems
              .map(item => Number(item[valueField]))
              .filter(val => !isNaN(val));
            value = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
          } else {
            value = groupItems.length;
          }
          break;
        case 'min':
          if (valueField) {
            const values = groupItems
              .map(item => Number(item[valueField]))
              .filter(val => !isNaN(val));
            value = values.length > 0 ? Math.min(...values) : 0;
          } else {
            value = groupItems.length;
          }
          break;
        case 'max':
          if (valueField) {
            const values = groupItems
              .map(item => Number(item[valueField]))
              .filter(val => !isNaN(val));
            value = values.length > 0 ? Math.max(...values) : 0;
          } else {
            value = groupItems.length;
          }
          break;
        default:
          value = groupItems.length;
      }
      
      return {
        [field]: groupKey, // Use the original field name as key
        name: groupKey, // Keep name for backward compatibility
        value: value,
        [valueField || 'value']: value, // Use valueField name if specified
        count: groupItems.length // Always include count
      };
    });

    // Sort the data
    const sortedData = processedData.sort((a, b) => {
      if (sortBy === 'asc') {
        return a.value - b.value;
      } else {
        return b.value - a.value;
      }
    });

    // Limit the results
    const limitedData = sortedData.slice(0, limit);
    
    console.log('✅ Grouped data processed:', {
      originalGroups: Object.keys(groups).length,
      processedItems: limitedData.length,
      sampleResult: limitedData[0]
    });

    return limitedData;
  };

  // Helper function to format chart values
  const formatChartValue = (value: any) => {
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toLocaleString();
    }
    return String(value);
  };

  const renderMetric = () => {
    let value = data;
    let label = 'Value';
    let icon = null;
    let color = 'blue';
    let trend = null;

    // Handle SQL query results that return an array with a single row
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const firstRow = data[0];
      // Check for common metric fields in the first row
      if ('value' in firstRow) value = firstRow.value;
      if ('label' in firstRow) label = firstRow.label;
      if ('icon' in firstRow) icon = firstRow.icon;
      if ('color' in firstRow) color = firstRow.color;
      if ('trend' in firstRow) trend = firstRow.trend;
      
      // If no explicit value field, try to extract from other numeric fields
      if (!('value' in firstRow) && Object.keys(firstRow).length > 0) {
        // Look for the first numeric value
        for (const [key, val] of Object.entries(firstRow)) {
          if (typeof val === 'number') {
            value = val;
            label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
            break;
          }
        }
      }
    } else if (Array.isArray(data)) {
      value = data.length;
      label = 'Count';
    } else if (typeof data === 'object' && data !== null) {
      // Look for common metric fields
      if ('count' in data) {
        value = data.count;
        label = 'Count';
      } else if ('total' in data) {
        value = data.total;
        label = 'Total';
      } else if ('value' in data) {
        value = data.value;
        if ('label' in data) label = data.label;
        if ('icon' in data) icon = data.icon;
        if ('color' in data) color = data.color;
        if ('trend' in data) trend = data.trend;
      } else {
        // Try to find the first numeric value in the object
        for (const [key, val] of Object.entries(data)) {
          if (typeof val === 'number') {
            value = val;
            label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
            break;
          }
        }
        // If still no numeric value, show object keys count
        if (value === data) {
          value = Object.keys(data).length;
          label = 'Properties';
        }
      }
    }

    const formatValue = (val: any) => {
      if (typeof val === 'number') {
        if (val >= 1000000) {
          return `${(val / 1000000).toFixed(1)}M`;
        } else if (val >= 1000) {
          return `${(val / 1000).toFixed(1)}K`;
        }
        return val.toLocaleString();
      }
      return String(val);
    };

    const getIconComponent = (iconName: string) => {
      const iconMap: { [key: string]: any } = {
        'Shield': Shield,
        'Users': Users,
        'FileText': FileText,
        'Calendar': Calendar,
        'AlertCircle': AlertCircle,
        'CheckCircle': CheckCircle,
        'TrendingUp': TrendingUp,
        'TrendingDown': TrendingDown,
        'Activity': Activity,
        'Target': Target,
        'AlertTriangle': AlertTriangle
      };
      return iconMap[iconName] || Target;
    };

    const getColorClasses = (colorName: string) => {
      const colorMap: { [key: string]: { bg: string, text: string, icon: string } } = {
        'blue': { bg: 'bg-blue-50', text: 'text-blue-900', icon: 'text-blue-600' },
        'green': { bg: 'bg-green-50', text: 'text-green-900', icon: 'text-green-600' },
        'red': { bg: 'bg-red-50', text: 'text-red-900', icon: 'text-red-600' },
        'yellow': { bg: 'bg-yellow-50', text: 'text-yellow-900', icon: 'text-yellow-600' },
        'purple': { bg: 'bg-purple-50', text: 'text-purple-900', icon: 'text-purple-600' },
        'orange': { bg: 'bg-orange-50', text: 'text-orange-900', icon: 'text-orange-600' },
        'gray': { bg: 'bg-gray-50', text: 'text-gray-900', icon: 'text-gray-600' }
      };
      return colorMap[colorName] || colorMap['blue'];
    };

    const colors = getColorClasses(color);
    const IconComponent = icon ? getIconComponent(icon) : null;

    return (
      <div className={`p-6 rounded-lg ${colors.bg} h-full flex flex-col justify-between`}>
        <div>
          <div className="flex items-center justify-between mb-4">
            {IconComponent && (
              <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                <IconComponent className={`h-6 w-6 ${colors.icon}`} />
              </div>
            )}
            {trend !== null && trend !== undefined && (
              <div className={`flex items-center space-x-1 text-sm font-medium ${
                trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : trend < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          <div>
            <div className={`text-3xl font-bold ${colors.text} mb-1`}>
              {formatValue(value)}
            </div>
            <div className={`text-sm font-medium ${colors.icon}`}>
              {label}
            </div>
          </div>
        </div>
        {widget.description && (
          <div className="text-xs text-gray-600 mt-4">
            {widget.description}
          </div>
        )}
      </div>
    );
  };

  const renderList = () => {
    let listData = data;

    if (!Array.isArray(data)) {
      if (typeof data === 'object' && data !== null) {
        listData = Object.entries(data).map(([key, value]) => ({
          key,
          value: String(value)
        }));
      } else {
        listData = [{ key: 'Value', value: String(data) }];
      }
    }

    return (
      <div className="space-y-2">
        {listData.slice(0, 10).map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
            <span className="text-sm">
              {typeof item === 'object' ? item.key || `Item ${idx + 1}` : String(item)}
            </span>
            <span className="text-sm font-medium">
              {typeof item === 'object' ? item.value : ''}
            </span>
          </div>
        ))}
        {listData.length > 10 && (
          <div className="text-xs text-gray-500 text-center">
            Showing 10 of {listData.length} items
          </div>
        )}
      </div>
    );
  };

  const renderGauge = () => {
    let value = 0;
    let max = 100;

    if (typeof data === 'number') {
      value = data;
    } else if (Array.isArray(data)) {
      value = data.length;
    } else if (typeof data === 'object' && data !== null) {
      if ('value' in data) value = data.value;
      if ('max' in data) max = data.max;
      if ('percentage' in data) {
        value = data.percentage;
        max = 100;
      }
    }

    const percentage = Math.min((value / max) * 100, 100);
    const getColor = () => {
      if (percentage >= 80) return 'text-red-600 bg-red-100';
      if (percentage >= 60) return 'text-yellow-600 bg-yellow-100';
      return 'text-green-600 bg-green-100';
    };

    return (
      <div className="text-center py-8">
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getColor()}`}>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {Math.round(percentage)}%
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-lg font-medium">
            {value} / {max}
          </div>
          <div className="text-sm text-gray-500">
            {widget.name}
          </div>
        </div>
      </div>
    );
  };

  const renderQuery = () => {
    const isJsonData = typeof data === 'object';
    
    return (
      <div className="space-y-4">
        {/* Query Info Header */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {widget.queryType === 'custom' ? 'Custom Query' : 'Default Query'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {widget.queryMethod}
            </Badge>
          </div>
          <div className="text-xs text-gray-500">
            {Array.isArray(data) ? `${data.length} results` : isJsonData ? 'Object response' : 'Simple response'}
          </div>
        </div>

        {/* Query Display */}
        {widget.queryType === 'custom' && widget.customQuery && (
          <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-xs">
            <div className="text-gray-400 mb-2">Query:</div>
            <pre className="whitespace-pre-wrap">{widget.customQuery}</pre>
          </div>
        )}

        {/* Results Display */}
        <div className="bg-white border rounded-lg">
          <div className="px-3 py-2 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Query Results</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
                className="text-xs"
              >
                Copy JSON
              </Button>
            </div>
          </div>
          <div className="p-3">
            {isJsonData ? (
              <pre className="text-xs font-mono bg-gray-50 p-3 rounded border overflow-auto max-h-64">
                {JSON.stringify(data, null, 2)}
              </pre>
            ) : (
              <div className="text-sm">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {String(data)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Data Statistics */}
        {Array.isArray(data) && data.length > 0 && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-blue-50 p-3 rounded-lg border">
              <div className="text-lg font-bold text-blue-600">{data.length}</div>
              <div className="text-xs text-blue-800">Total Records</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border">
              <div className="text-lg font-bold text-green-600">
                {typeof data[0] === 'object' ? Object.keys(data[0]).length : 1}
              </div>
              <div className="text-xs text-green-800">Fields</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border">
              <div className="text-lg font-bold text-purple-600">
                {new Date().toLocaleTimeString()}
              </div>
              <div className="text-xs text-purple-800">Last Updated</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderNumber = () => {
    let value = data;
    let label = 'Count';
    let trend = null;
    let previousValue = null;

    // Handle SQL query results that return an array with a single row
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const firstRow = data[0];
      // Check for common numeric fields in the first row
      if ('value' in firstRow) value = firstRow.value;
      else if ('count' in firstRow) value = firstRow.count;
      else if ('total' in firstRow) value = firstRow.total;
      else if ('sum' in firstRow) value = firstRow.sum;
      else {
        // Look for the first numeric value
        for (const [key, val] of Object.entries(firstRow)) {
          if (typeof val === 'number') {
            value = val;
            label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
            break;
          }
        }
      }
      if ('label' in firstRow) label = firstRow.label;
      if ('trend' in firstRow) trend = firstRow.trend;
      if ('previous' in firstRow) previousValue = firstRow.previous;
    }
    // Handle aggregation results
    else if (widget.aggregation) {
      if (typeof data === 'object' && data !== null) {
        if (widget.aggregation.function === 'count') {
          value = data.totalResults || data.length || data.count || 0;
          label = 'Total Count';
        } else if (widget.aggregation.function === 'sum') {
          value = data.sum || data.total || 0;
          label = 'Total Sum';
        }
      } else if (Array.isArray(data)) {
        value = data.length;
        label = 'Count';
      }
    } else if (Array.isArray(data)) {
      value = data.length;
      label = 'Count';
    } else if (typeof data === 'object' && data !== null) {
      if ('totalResults' in data) {
        value = data.totalResults;
        label = 'Total Results';
      }
      else if ('value' in data) value = data.value;
      else if ('count' in data) value = data.count;
      else if ('total' in data) value = data.total;
      else {
        // Try to find the first numeric value in the object
        for (const [key, val] of Object.entries(data)) {
          if (typeof val === 'number') {
            value = val;
            label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
            break;
          }
        }
      }
      if ('label' in data) label = data.label;
      if ('trend' in data) trend = data.trend;
      if ('previous' in data) previousValue = data.previous;
    }

    const formatNumber = (num: any) => {
      if (typeof num === 'number') {
        if (num >= 1000000) {
          return `${(num / 1000000).toFixed(1)}M`;
        } else if (num >= 1000) {
          return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toLocaleString();
      }
      return String(num);
    };

    // Calculate trend if we have previous value
    if (trend === null && previousValue !== null && typeof value === 'number' && typeof previousValue === 'number') {
      trend = previousValue !== 0 ? ((value - previousValue) / previousValue) * 100 : 0;
    }

    return (
      <div className="p-6 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 h-full flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-white shadow-sm">
              <Hash className="h-6 w-6 text-indigo-600" />
            </div>
            {trend !== null && (
              <div className={`flex items-center space-x-1 text-sm font-medium ${
                trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : trend < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                <span>{Math.abs(Math.round(trend))}%</span>
              </div>
            )}
          </div>
          <div>
            <div className="text-3xl font-bold text-indigo-900 mb-1">
              {formatNumber(value)}
            </div>
            <div className="text-sm font-medium text-indigo-600">
              {label}
            </div>
          </div>
        </div>
        {widget.description && (
          <div className="text-xs text-gray-600 mt-4">
            {widget.description}
          </div>
        )}
      </div>
    );
  };

  const renderPercentage = () => {
    let value = 0;
    let label = 'Percentage';
    let trend = null;
    let target = 100;

    // Handle aggregation results
    if (widget.aggregation) {
      if (typeof data === 'object' && data !== null) {
        if (widget.aggregation.function === 'avg') {
          value = data.average || data.avg || 0;
          label = 'Average';
        } else if (widget.aggregation.function === 'count') {
          // Calculate percentage if there's a total reference
          const count = data.count || data.length || 0;
          const total = data.total || 100;
          value = total > 0 ? (count / total) * 100 : 0;
          label = 'Completion Rate';
        }
      }
    } else if (typeof data === 'number') {
      value = data;
    } else if (typeof data === 'object' && data !== null) {
      if ('percentage' in data) value = data.percentage;
      else if ('percent' in data) value = data.percent;
      else if ('rate' in data) value = data.rate;
      if ('label' in data) label = data.label;
      if ('trend' in data) trend = data.trend;
      if ('target' in data) target = data.target;
    }

    const getColorScheme = () => {
      if (value >= 90) return { bg: 'from-green-50 to-emerald-50', text: 'text-green-900', icon: 'text-green-600' };
      if (value >= 70) return { bg: 'from-blue-50 to-sky-50', text: 'text-blue-900', icon: 'text-blue-600' };
      if (value >= 50) return { bg: 'from-yellow-50 to-amber-50', text: 'text-yellow-900', icon: 'text-yellow-600' };
      return { bg: 'from-red-50 to-rose-50', text: 'text-red-900', icon: 'text-red-600' };
    };

    const colors = getColorScheme();
    const progressPercentage = Math.min((value / target) * 100, 100);

    return (
      <div className={`p-6 rounded-lg bg-gradient-to-br ${colors.bg} h-full flex flex-col justify-between`}>
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-white shadow-sm">
              <Percent className={`h-6 w-6 ${colors.icon}`} />
            </div>
            {trend !== null && (
              <div className={`flex items-center space-x-1 text-sm font-medium ${
                trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : trend < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                <span>{Math.abs(Math.round(trend))}%</span>
              </div>
            )}
          </div>
          <div>
            <div className={`text-3xl font-bold ${colors.text} mb-1`}>
              {Math.round(value)}%
            </div>
            <div className={`text-sm font-medium ${colors.icon}`}>
              {label}
            </div>
          </div>
          {target !== 100 && (
            <div className="mt-3">
              <div className="w-full bg-white/50 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full bg-gradient-to-r ${colors.bg} opacity-80`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Target: {target}%
              </div>
            </div>
          )}
        </div>
        {widget.description && (
          <div className="text-xs text-gray-600 mt-4">
            {widget.description}
          </div>
        )}
      </div>
    );
  };

  const renderProgress = () => {
    let value = 0;
    let max = 100;
    let label = 'Progress';

    if (typeof data === 'object' && data !== null) {
      if ('value' in data) value = data.value;
      if ('max' in data) max = data.max;
      if ('current' in data) value = data.current;
      if ('target' in data) max = data.target;
      if ('completed' in data && 'total' in data) {
        value = data.completed;
        max = data.total;
        label = 'Completion';
      }
    } else if (typeof data === 'number') {
      value = data;
    } else if (Array.isArray(data)) {
      value = data.length;
      max = 100; // Assume out of 100 for arrays
    }

    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    
    const getBarColor = () => {
      if (percentage >= 80) return 'bg-green-500';
      if (percentage >= 60) return 'bg-blue-500';
      if (percentage >= 40) return 'bg-yellow-500';
      return 'bg-red-500';
    };

    return (
      <div className="py-8 px-4">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-lg font-medium text-gray-700">{label}</span>
            <span className="text-2xl font-bold text-gray-900">
              {value} / {max}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-6">
            <div 
              className={`h-6 rounded-full transition-all duration-500 ${getBarColor()}`}
              style={{ width: `${percentage}%` }}
            >
              <div className="h-full flex items-center justify-center text-white font-medium text-sm">
                {Math.round(percentage)}%
              </div>
            </div>
          </div>
        </div>
        {widget.description && (
          <div className="text-sm text-gray-500 text-center">
            {widget.description}
          </div>
        )}
      </div>
    );
  };

  const renderTrend = () => {
    let value = 0;
    let previous = 0;
    let label = 'Trend';

    if (typeof data === 'object' && data !== null) {
      if ('current' in data) value = data.current;
      if ('previous' in data) previous = data.previous;
      if ('value' in data) value = data.value;
      if ('baseline' in data) previous = data.baseline;
      if ('label' in data) label = data.label;
      if ('trend' in data) {
        // If trend is already calculated
        const trend = data.trend;
        const colorScheme = trend > 0 
          ? { bg: 'from-green-50 to-emerald-50', text: 'text-green-900', icon: 'text-green-600' }
          : trend < 0 
          ? { bg: 'from-red-50 to-rose-50', text: 'text-red-900', icon: 'text-red-600' }
          : { bg: 'from-gray-50 to-slate-50', text: 'text-gray-900', icon: 'text-gray-600' };
        
        return (
          <div className={`p-6 rounded-lg bg-gradient-to-br ${colorScheme.bg} h-full flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  {trend > 0 ? (
                    <TrendingUp className={`h-6 w-6 ${colorScheme.icon}`} />
                  ) : trend < 0 ? (
                    <TrendingDown className={`h-6 w-6 ${colorScheme.icon}`} />
                  ) : (
                    <Activity className={`h-6 w-6 ${colorScheme.icon}`} />
                  )}
                </div>
              </div>
              <div>
                <div className={`text-3xl font-bold ${colorScheme.text} mb-1`}>
                  {trend > 0 ? '+' : ''}{trend}%
                </div>
                <div className={`text-sm font-medium ${colorScheme.icon}`}>
                  {label}
                </div>
              </div>
            </div>
          </div>
        );
      }
    } else if (typeof data === 'number') {
      value = data;
    }

    const change = previous !== 0 ? ((value - previous) / previous) * 100 : 0;
    const isPositive = change > 0;
    const isNegative = change < 0;
    
    const colorScheme = isPositive 
      ? { bg: 'from-green-50 to-emerald-50', text: 'text-green-900', icon: 'text-green-600' }
      : isNegative 
      ? { bg: 'from-red-50 to-rose-50', text: 'text-red-900', icon: 'text-red-600' }
      : { bg: 'from-gray-50 to-slate-50', text: 'text-gray-900', icon: 'text-gray-600' };

    const formatValue = (val: number) => {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    };

    return (
      <div className={`p-6 rounded-lg bg-gradient-to-br ${colorScheme.bg} h-full flex flex-col justify-between`}>
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-white shadow-sm">
              {isPositive ? (
                <TrendingUp className={`h-6 w-6 ${colorScheme.icon}`} />
              ) : isNegative ? (
                <TrendingDown className={`h-6 w-6 ${colorScheme.icon}`} />
              ) : (
                <Activity className={`h-6 w-6 ${colorScheme.icon}`} />
              )}
            </div>
          </div>
          <div>
            <div className={`text-3xl font-bold ${colorScheme.text} mb-1`}>
              {change > 0 ? '+' : ''}{Math.round(change)}%
            </div>
            <div className={`text-sm font-medium ${colorScheme.icon} mb-3`}>
              {label}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Current</span>
                <span className="font-medium text-gray-900">{formatValue(value)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Previous</span>
                <span className="font-medium text-gray-900">{formatValue(previous)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStatistic = () => {
    let stats = { min: 0, max: 0, avg: 0, count: 0 };

    if (widget.aggregation && typeof data === 'object' && data !== null) {
      if ('min' in data) stats.min = data.min;
      if ('max' in data) stats.max = data.max;
      if ('avg' in data || 'average' in data) stats.avg = data.avg || data.average;
      if ('count' in data) stats.count = data.count;
    } else if (Array.isArray(data)) {
      // Calculate stats from array
      const numbers = data.filter(item => typeof item === 'number');
      if (numbers.length > 0) {
        stats.min = Math.min(...numbers);
        stats.max = Math.max(...numbers);
        stats.avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        stats.count = numbers.length;
      }
    }

    const formatStat = (value: number) => {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toLocaleString();
    };

    return (
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-md bg-white shadow-sm">
                <TrendingDown className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-900">{formatStat(stats.min)}</div>
            <div className="text-xs font-medium text-blue-600">Minimum</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-md bg-white shadow-sm">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-green-900">{formatStat(stats.max)}</div>
            <div className="text-xs font-medium text-green-600">Maximum</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-md bg-white shadow-sm">
                <Activity className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-yellow-900">{formatStat(Math.round(stats.avg))}</div>
            <div className="text-xs font-medium text-yellow-600">Average</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-md bg-white shadow-sm">
                <Hash className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-900">{formatStat(stats.count)}</div>
            <div className="text-xs font-medium text-purple-600">Count</div>
          </div>
        </div>
        {widget.description && (
          <div className="text-xs text-gray-600 text-center mt-4">
            {widget.description}
          </div>
        )}
      </div>
    );
  };

  const renderSummary = () => {
    let summaryData = {};

    if (typeof data === 'object' && data !== null) {
      summaryData = data;
    } else if (Array.isArray(data)) {
      summaryData = {
        'Total Items': data.length,
        'Data Type': 'Array',
        'First Item': data[0] ? (typeof data[0] === 'object' ? 'Object' : String(data[0]).substring(0, 30)) : 'None'
      };
    } else {
      summaryData = {
        'Value': String(data),
        'Type': typeof data
      };
    }

    return (
      <div className="py-6">
        <div className="space-y-3">
          {Object.entries(summaryData).slice(0, 6).map(([key, value], index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
              <span className="font-medium text-gray-700">{key}</span>
              <span className="text-gray-900 font-semibold">
                {typeof value === 'number' ? value.toLocaleString() : String(value)}
              </span>
            </div>
          ))}
        </div>
        {widget.description && (
          <div className="text-sm text-gray-500 text-center mt-4">
            {widget.description}
          </div>
        )}
      </div>
    );
  };

  const renderCards = () => {
    let cardsData: Record<string, any> = {};
    
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      // If data is already an object, use it directly
      cardsData = data;
    } else if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      // If data is an array of objects, use the first object
      cardsData = data[0];
    } else {
      // Fallback
      cardsData = { 'Value': String(data) };
    }

    // Apply field selection if enabled
    if (widget.fieldSelection?.enabled && widget.fieldSelection.selectedFields.length > 0) {
      const selectedData: any = {};
      widget.fieldSelection.selectedFields.forEach(field => {
        if (field in cardsData) {
          selectedData[field] = cardsData[field];
        }
      });
      cardsData = selectedData;
    }

    // Filter out null/undefined values if configured
    if (widget.fieldSelection?.excludeNullFields) {
      const filteredData: any = {};
      Object.entries(cardsData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          filteredData[key] = value;
        }
      });
      cardsData = filteredData;
    }

    // Format field names for display
    const formatFieldName = (fieldName: string) => {
      return fieldName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace(/_/g, ' ')
        .trim();
    };

    // Format values based on type
    const formatValue = (value: any, fieldName: string) => {
      if (value === null || value === undefined) return 'N/A';
      
      const name = fieldName.toLowerCase();
      if (name.includes('date') || name.includes('time')) {
        try {
          return new Date(value).toLocaleDateString();
        } catch {
          return String(value);
        }
      }
      
      if (typeof value === 'number') {
        if (value >= 1000000) {
          return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
          return `${(value / 1000).toFixed(1)}K`;
        }
        return value.toLocaleString();
      }
      
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
      }
      
      return String(value);
    };

    const entries = Object.entries(cardsData);
    
    if (entries.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          No data to display
        </div>
      );
    }

    // Use a simple list layout instead of nested cards
    return (
      <div className="p-6">
        <div className="space-y-3">
          {entries.map(([key, value], index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
            >
              <span className="text-sm font-medium text-gray-600">
                {formatFieldName(key)}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {formatValue(value, key)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const cardClasses = [
    className,
    getWidthClass(),
    'bg-white rounded-lg shadow-sm',
    widget.styling?.showBorder !== false ? 'border border-gray-200' : '',
    'transition-all duration-200 hover:shadow-lg'
  ].filter(Boolean).join(' ');

  const contentClasses = [
    getHeightClass(),
    'overflow-hidden'
  ].join(' ');

  const isMetricType = ['metric', 'number', 'percentage', 'trend', 'statistic'].includes(widget.displayType);

  return (
    <div className={cardClasses}>
      {(widget.styling?.showHeader !== false) && (
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            {widget.name}
          </h3>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs text-gray-500">
              {widget.pluginName}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                fetchData();
                if (onRefresh) {
                  onRefresh();
                }
              }}
              disabled={loading}
              title="Refresh widget data"
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(widget)}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4 text-gray-500" />
              </Button>
            )}
          </div>
        </div>
      )}
      <div className={`${contentClasses} ${isMetricType ? '' : 'p-4'}`}>
        {renderContent()}
        {lastUpdate && !isMetricType && (
          <div className="text-xs text-gray-400 mt-2 text-center">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}; 