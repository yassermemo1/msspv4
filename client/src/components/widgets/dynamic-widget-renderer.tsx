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
  Target
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

interface DynamicWidgetRendererProps {
  widget: CustomWidget;
  clientShortName?: string; // For client-specific widgets
  onEdit?: (widget: CustomWidget) => void;
  onDelete?: (widgetId: string) => void;
  onRefresh?: () => void; // For external refresh requests
  className?: string;
  previewData?: any; // For preview mode with test data
}

export const DynamicWidgetRenderer: React.FC<DynamicWidgetRendererProps> = ({
  widget,
  clientShortName,
  onEdit,
  onDelete,
  onRefresh,
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
      return;
    }
    
    fetchData();
    
    // Set up auto-refresh (only if not in preview mode)
    if (widget.refreshInterval > 0 && !previewData) {
      const interval = setInterval(fetchData, widget.refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [widget, clientShortName, previewData]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = '';
      let body = null;

      // Build query parameters including client context
      const queryParams = {
        ...widget.queryParameters,
        ...(clientShortName && { clientShortName })
      };

      if (widget.queryType === 'default' && widget.queryId) {
        endpoint = `/api/plugins/${widget.pluginName}/instances/${widget.instanceId}/default-query/${widget.queryId}`;
        if (Object.keys(queryParams).length > 0) {
          body = { parameters: queryParams };
        }
      } else if (widget.queryType === 'custom' && widget.customQuery) {
        endpoint = `/api/plugins/${widget.pluginName}/instances/${widget.instanceId}/query`;
        body = {
          query: widget.customQuery,
          method: widget.queryMethod,
          parameters: queryParams
        };
      } else {
        throw new Error('Invalid widget configuration');
      }

      const response = await apiRequest('POST', endpoint, body);

      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date());
      } else {
        setError(result.message || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
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

    // Convert data to chart format if needed
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

    const colors = ['#3b82f6', '#1e40af', '#60a5fa', '#93c5fd', '#dbeafe'];

    switch (widget.chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} />
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
                dataKey="value"
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return renderTable();
    }
  };

  const renderMetric = () => {
    let value = data;
    let label = 'Value';

    if (Array.isArray(data)) {
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
        label = 'Value';
      } else {
        value = Object.keys(data).length;
        label = 'Properties';
      }
    }

    const formatValue = (val: any) => {
      if (typeof val === 'number') {
        return val.toLocaleString();
      }
      return String(val);
    };

    return (
      <div className="text-center py-8">
        <div className="text-4xl font-bold text-blue-600 mb-2">
          {formatValue(value)}
        </div>
        <div className="text-lg text-gray-600">
          {label}
        </div>
        {widget.description && (
          <div className="text-sm text-gray-500 mt-2">
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

    // Handle aggregation results
    if (widget.aggregation) {
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
    } else if (typeof data === 'object' && data !== null && 'totalResults' in data) {
      value = data.totalResults;
      label = 'Total Results';
    }

    const formatNumber = (num: any) => {
      if (typeof num === 'number') {
        return num.toLocaleString();
      }
      return String(num);
    };

    return (
      <div className="text-center py-8">
        <div className="flex items-center justify-center mb-4">
          <Hash className="h-6 w-6 text-blue-500 mr-2" />
          <div className="text-6xl font-bold text-blue-600">
            {formatNumber(value)}
          </div>
        </div>
        <div className="text-xl text-gray-600 font-medium">
          {label}
        </div>
        {widget.description && (
          <div className="text-sm text-gray-500 mt-2">
            {widget.description}
          </div>
        )}
      </div>
    );
  };

  const renderPercentage = () => {
    let value = 0;
    let label = 'Percentage';

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
    }

    const getColor = () => {
      if (value >= 90) return 'text-green-600';
      if (value >= 70) return 'text-blue-600';
      if (value >= 50) return 'text-yellow-600';
      return 'text-red-600';
    };

    return (
      <div className="text-center py-8">
        <div className="flex items-center justify-center mb-4">
          <Percent className="h-6 w-6 text-green-500 mr-2" />
          <div className={`text-6xl font-bold ${getColor()}`}>
            {Math.round(value)}%
          </div>
        </div>
        <div className="text-xl text-gray-600 font-medium">
          {label}
        </div>
        {widget.description && (
          <div className="text-sm text-gray-500 mt-2">
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
      if ('trend' in data) {
        // If trend is already calculated
        const trend = data.trend;
        return (
          <div className="text-center py-8">
            <div className="flex items-center justify-center mb-4">
              {trend > 0 ? (
                <TrendingUp className="h-8 w-8 text-green-500 mr-2" />
              ) : trend < 0 ? (
                <TrendingDown className="h-8 w-8 text-red-500 mr-2" />
              ) : (
                <Activity className="h-8 w-8 text-gray-500 mr-2" />
              )}
              <div className={`text-4xl font-bold ${
                trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend > 0 ? '+' : ''}{trend}%
              </div>
            </div>
            <div className="text-lg text-gray-600">{label}</div>
          </div>
        );
      }
    } else if (typeof data === 'number') {
      value = data;
    }

    const change = previous !== 0 ? ((value - previous) / previous) * 100 : 0;
    const isPositive = change > 0;
    const isNegative = change < 0;

    return (
      <div className="text-center py-8">
        <div className="flex items-center justify-center mb-4">
          {isPositive ? (
            <TrendingUp className="h-8 w-8 text-green-500 mr-2" />
          ) : isNegative ? (
            <TrendingDown className="h-8 w-8 text-red-500 mr-2" />
          ) : (
            <Activity className="h-8 w-8 text-gray-500 mr-2" />
          )}
          <div className={`text-4xl font-bold ${
            isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
          }`}>
            {change > 0 ? '+' : ''}{Math.round(change)}%
          </div>
        </div>
        <div className="text-lg text-gray-600">{label}</div>
        <div className="text-sm text-gray-500 mt-2">
          Current: {value.toLocaleString()} | Previous: {previous.toLocaleString()}
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

    return (
      <div className="py-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">{stats.min.toLocaleString()}</div>
            <div className="text-sm text-blue-800">Minimum</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{stats.max.toLocaleString()}</div>
            <div className="text-sm text-green-800">Maximum</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg border">
            <div className="text-2xl font-bold text-yellow-600">{Math.round(stats.avg).toLocaleString()}</div>
            <div className="text-sm text-yellow-800">Average</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg border">
            <div className="text-2xl font-bold text-purple-600">{stats.count.toLocaleString()}</div>
            <div className="text-sm text-purple-800">Count</div>
          </div>
        </div>
        {widget.description && (
          <div className="text-sm text-gray-500 text-center mt-4">
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

  const cardClasses = [
    className,
    getWidthClass(),
    widget.styling?.showBorder !== false ? 'border' : 'border-0',
    'transition-all duration-200 hover:shadow-md'
  ].filter(Boolean).join(' ');

  const contentClasses = [
    getHeightClass(),
    'overflow-hidden'
  ].join(' ');

  return (
    <Card className={cardClasses}>
      {(widget.styling?.showHeader !== false) && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {widget.name}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
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
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(widget)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className={contentClasses}>
        {renderContent()}
        {lastUpdate && (
          <div className="text-xs text-gray-500 mt-2 text-center">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 