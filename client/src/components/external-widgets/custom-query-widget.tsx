import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  Database,
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  Table as TableIcon
} from 'lucide-react';

interface CustomQueryWidgetProps {
  queryId: number;
  widgetConfig?: {
    type: 'chart' | 'table' | 'metric' | 'list';
    chartType?: 'bar' | 'line' | 'pie' | 'area';
    colors?: string[];
    showRefresh?: boolean;
    refreshInterval?: number;
    size?: 'small' | 'medium' | 'large';
  };
  onError?: (error: string) => void;
}

interface QueryResult {
  success: boolean;
  data: any;
  executionTime?: number;
  recordCount?: number;
  cached?: boolean;
  error?: string;
}

const DEFAULT_COLORS = ['#3b82f6', '#1e40af', '#60a5fa', '#93c5fd', '#dbeafe'];

export function CustomQueryWidget({ 
  queryId, 
  widgetConfig = {}, 
  onError 
}: CustomQueryWidgetProps) {
  const [query, setQuery] = useState<any>(null);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const {
    type = 'chart',
    chartType = 'bar',
    colors = DEFAULT_COLORS,
    showRefresh = true,
    refreshInterval = 300, // 5 minutes
    size = 'medium'
  } = widgetConfig;

  // Load query configuration
  useEffect(() => {
    const loadQuery = async () => {
      try {
        const response = await apiRequest('GET', `/api/custom-queries/${queryId}`);
        const queryData = await response.json();
        setQuery(queryData);
      } catch (error) {
        console.error('Failed to load query:', error);
        onError?.('Failed to load query configuration');
      }
    };

    loadQuery();
  }, [queryId]);

  // Execute query
  const executeQuery = async (forceRefresh = false) => {
    if (!query) return;

    setRefreshing(true);
    try {
      const response = await apiRequest('POST', `/api/custom-queries/${queryId}/execute`, {
        forceRefresh
      });
      const result = await response.json();
      
      setResult(result);
      setLastRefresh(new Date());
      
      if (!result.success && result.error) {
        onError?.(result.error);
      }
    } catch (error) {
      console.error('Failed to execute query:', error);
      onError?.('Failed to execute query');
      setResult({
        success: false,
        error: 'Failed to execute query',
        data: null
      });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Initial load and auto-refresh
  useEffect(() => {
    if (query) {
      executeQuery();
      
      // Set up auto-refresh if enabled
      if (refreshInterval > 0) {
        const interval = setInterval(() => {
          executeQuery();
        }, refreshInterval * 1000);
        
        return () => clearInterval(interval);
      }
    }
  }, [query, refreshInterval]);

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'h-64';
      case 'large':
        return 'h-96';
      default:
        return 'h-80';
    }
  };

  const renderChart = (data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <div className="text-center">
            <Database className="w-8 h-8 mx-auto mb-2" />
            <p>No data available</p>
          </div>
        </div>
      );
    }

    const chartData = data.slice(0, 20); // Limit to 20 items for performance

    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} />
            </LineChart>
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

      default: // bar chart
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
    }
  };

  const renderTable = (data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          <TableIcon className="w-8 h-8 mx-auto mb-2" />
          <p>No data available</p>
        </div>
      );
    }

    const columns = Object.keys(data[0]);
    const displayData = data.slice(0, 10); // Limit to 10 rows for widget

    return (
      <div className="overflow-auto max-h-64">
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
            {displayData.map((row, index) => (
              <tr key={index} className="border-b">
                {columns.map((col) => (
                  <td key={col} className="p-2">
                    {String(row[col] || '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 10 && (
          <div className="text-center text-xs text-muted-foreground p-2">
            Showing 10 of {data.length} records
          </div>
        )}
      </div>
    );
  };

  const renderMetric = (data: any) => {
    let value = 0;
    let label = 'Count';

    if (Array.isArray(data)) {
      value = data.length;
      label = 'Records';
    } else if (typeof data === 'object' && data !== null) {
      // Try to find a numeric value
      const numericKeys = Object.keys(data).filter(key => 
        typeof data[key] === 'number'
      );
      if (numericKeys.length > 0) {
        value = data[numericKeys[0]];
        label = numericKeys[0];
      }
    } else if (typeof data === 'number') {
      value = data;
    }

    return (
      <div className="text-center p-6">
        <div className="text-3xl font-bold text-primary mb-2">
          {value.toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground capitalize">
          {label}
        </div>
      </div>
    );
  };

  const renderList = (data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          <p>No items available</p>
        </div>
      );
    }

    const displayData = data.slice(0, 5); // Limit to 5 items for widget

    return (
      <div className="space-y-2">
        {displayData.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <span className="text-sm">
              {typeof item === 'object' ? item.name || item.title || item.key || JSON.stringify(item) : String(item)}
            </span>
            {typeof item === 'object' && item.value && (
              <Badge variant="secondary" className="text-xs">
                {item.value}
              </Badge>
            )}
          </div>
        ))}
        {data.length > 5 && (
          <div className="text-center text-xs text-muted-foreground">
            +{data.length - 5} more items
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <Skeleton className="w-full h-32" />;
    }

    if (!result) {
      return (
        <div className="text-center text-muted-foreground py-8">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>No data loaded</p>
        </div>
      );
    }

    if (!result.success) {
      return (
        <div className="text-center text-destructive py-8">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">{result.error || 'Query failed'}</p>
        </div>
      );
    }

    switch (type) {
      case 'table':
        return renderTable(result.data);
      case 'metric':
        return renderMetric(result.data);
      case 'list':
        return renderList(result.data);
      default:
        return renderChart(result.data);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'table':
        return <TableIcon className="w-4 h-4" />;
      case 'metric':
        return <TrendingUp className="w-4 h-4" />;
      case 'list':
        return <Activity className="w-4 h-4" />;
      default:
        switch (chartType) {
          case 'pie':
            return <PieIcon className="w-4 h-4" />;
          case 'line':
          case 'area':
            return <Activity className="w-4 h-4" />;
          default:
            return <BarChart3 className="w-4 h-4" />;
        }
    }
  };

  return (
    <Card className={`w-full ${getSizeClasses()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {getIcon()}
            {query?.name || 'Custom Query'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {result?.cached && (
              <Badge variant="outline" className="text-xs">
                <Database className="w-3 h-3 mr-1" />
                Cached
              </Badge>
            )}
            {showRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => executeQuery(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
        {query?.description && (
          <p className="text-sm text-muted-foreground">{query.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {result?.executionTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {result.executionTime}ms
            </div>
          )}
          {result?.recordCount !== undefined && (
            <div className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              {result.recordCount} records
            </div>
          )}
          {lastRefresh && (
            <div>
              Updated {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {renderContent()}
      </CardContent>
    </Card>
  );
} 