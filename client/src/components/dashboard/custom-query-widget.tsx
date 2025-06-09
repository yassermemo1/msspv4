import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Loader2, RefreshCw, AlertCircle, TrendingUp, BarChart3, PieChart, Table } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { apiRequest } from '../../lib/api';

interface CustomQueryWidgetProps {
  widgetId: number;
  title: string;
  widgetType: 'chart' | 'table' | 'metric' | 'gauge';
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  config?: any;
  refreshInterval?: number;
  className?: string;
  onError?: (error: string) => void;
}

interface WidgetData {
  success: boolean;
  data: any;
  metadata?: {
    executionTime?: number;
    recordCount?: number;
    systemName?: string;
    cached?: boolean;
    cacheCreatedAt?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function CustomQueryWidget({
  widgetId,
  title,
  widgetType,
  chartType = 'bar',
  config = {},
  refreshInterval = 300,
  className = '',
  onError
}: CustomQueryWidgetProps) {
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiRequest(
        'GET', 
        `/api/custom-queries/widgets/${widgetId}/data?forceRefresh=${forceRefresh}`
      );
      const result: WidgetData = await response.json();

      if (result.success) {
        setData(result);
        setLastRefresh(new Date());
      } else {
        setError(result.error?.message || 'Failed to load widget data');
        onError?.(result.error?.message || 'Failed to load widget data');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up auto-refresh if interval is specified
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchData();
      }, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [widgetId, refreshInterval]);

  const renderChart = () => {
    if (!data?.data || !Array.isArray(data.data)) {
      return <div className="text-muted-foreground text-center py-8">No data available</div>;
    }

    const chartData = data.data;

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xField || 'name'} />
              <YAxis />
              <Tooltip />
              <Bar dataKey={config.yField || 'value'} fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xField || 'name'} />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey={config.yField || 'value'} 
                stroke="#8884d8" 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={chartData}
                dataKey={config.valueField || 'value'}
                nameKey={config.nameField || 'name'}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        );

      default:
        return <div className="text-muted-foreground text-center py-8">Unsupported chart type</div>;
    }
  };

  const renderTable = () => {
    if (!data?.data || !Array.isArray(data.data)) {
      return <div className="text-muted-foreground text-center py-8">No data available</div>;
    }

    const tableData = data.data.slice(0, config.maxRows || 10);
    const columns = config.columns || Object.keys(tableData[0] || {});

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {columns.map((col: string) => (
                <th key={col} className="text-left p-2 font-medium">
                  {col.charAt(0).toUpperCase() + col.slice(1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={index} className="border-b border-gray-100">
                {columns.map((col: string) => (
                  <td key={col} className="p-2">
                    {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] || '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMetric = () => {
    if (!data?.data) {
      return <div className="text-muted-foreground text-center py-8">No data available</div>;
    }

    const value = config.valueField ? data.data[config.valueField] : 
                  Array.isArray(data.data) ? data.data.length : 
                  typeof data.data === 'number' ? data.data : 
                  Object.keys(data.data).length;

    const prevValue = config.previousValueField ? data.data[config.previousValueField] : null;
    const change = prevValue ? ((value - prevValue) / prevValue) * 100 : null;

    return (
      <div className="text-center py-8">
        <div className="text-3xl font-bold mb-2">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {config.unit && (
          <div className="text-sm text-muted-foreground mb-2">{config.unit}</div>
        )}
        {change !== null && (
          <div className={`text-sm flex items-center justify-center gap-1 ${
            change >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className="h-4 w-4" />
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading data...
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
          <div className="text-sm text-red-600 mb-3">{error}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      );
    }

    switch (widgetType) {
      case 'chart':
        return renderChart();
      case 'table':
        return renderTable();
      case 'metric':
        return renderMetric();
      default:
        return <div className="text-muted-foreground text-center py-8">Unknown widget type</div>;
    }
  };

  const getWidgetIcon = () => {
    switch (widgetType) {
      case 'chart':
        return chartType === 'pie' ? <PieChart className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />;
      case 'table':
        return <Table className="h-4 w-4" />;
      case 'metric':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  return (
    <Card className={`h-full ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {getWidgetIcon()}
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {data?.metadata?.cached && (
              <Badge variant="outline" className="text-xs">
                Cached
              </Badge>
            )}
            {data?.metadata?.systemName && (
              <Badge variant="secondary" className="text-xs">
                {data.metadata.systemName}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={loading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {data?.metadata && (
          <div className="text-xs text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
            {data.metadata.executionTime && ` • ${data.metadata.executionTime}ms`}
            {data.metadata.recordCount && ` • ${data.metadata.recordCount} records`}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {renderContent()}
      </CardContent>
    </Card>
  );
} 