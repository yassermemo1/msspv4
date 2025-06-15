import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Activity
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
  displayType: 'table' | 'chart' | 'metric' | 'list' | 'gauge';
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
  className?: string;
}

export const DynamicWidgetRenderer: React.FC<DynamicWidgetRendererProps> = ({
  widget,
  clientShortName,
  onEdit,
  onDelete,
  className = ''
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh
    if (widget.refreshInterval > 0) {
      const interval = setInterval(fetchData, widget.refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [widget, clientShortName]);

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
        endpoint = `/api/plugins/${widget.pluginName}/instances/${widget.instanceId}/custom-query`;
        body = {
          query: widget.customQuery,
          method: widget.queryMethod,
          parameters: queryParams
        };
      } else {
        throw new Error('Invalid widget configuration');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : null
      });

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
    switch (widget.styling.width) {
      case 'full': return 'w-full';
      case 'half': return 'w-1/2';
      case 'third': return 'w-1/3';
      case 'quarter': return 'w-1/4';
      default: return 'w-full';
    }
  };

  const getHeightClass = () => {
    switch (widget.styling.height) {
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
                {chartData.map((entry, index) => (
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
        {listData.slice(0, 10).map((item, idx) => (
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

  const cardClasses = [
    className,
    getWidthClass(),
    widget.styling.showBorder ? 'border' : 'border-0',
    'transition-all duration-200 hover:shadow-md'
  ].filter(Boolean).join(' ');

  const contentClasses = [
    getHeightClass(),
    'overflow-hidden'
  ].join(' ');

  return (
    <Card className={cardClasses}>
      {widget.styling.showHeader && (
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
              onClick={fetchData}
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