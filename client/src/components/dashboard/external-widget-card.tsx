import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Loader2, RefreshCw, AlertCircle, TrendingUp, BarChart3, PieChart, Table, Settings, MoreHorizontal } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../hooks/use-toast';

interface ExternalWidgetTemplate {
  id: number;
  systemId: number;
  name: string;
  description?: string;
  widgetType: 'chart' | 'table' | 'metric' | 'gauge';
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  query: string;
  method?: string;
  parameters: Record<string, any>;
  transformations?: string[];
  displayConfig: Record<string, any>;
  refreshInterval: number;
  cacheEnabled: boolean;
  isActive: boolean;
  isPublic: boolean;
  tags?: string[];
}

interface ExternalWidgetCardProps {
  template: ExternalWidgetTemplate;
  className?: string;
  onEdit?: (template: ExternalWidgetTemplate) => void;
  onDelete?: (templateId: number) => void;
  onConfigure?: (template: ExternalWidgetTemplate) => void;
  compact?: boolean;
}

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c', '#d084d0'];

export function ExternalWidgetCard({
  template,
  className = "",
  onEdit,
  onDelete,
  onConfigure,
  compact = false
}: ExternalWidgetCardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExecuted, setLastExecuted] = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  // Auto-refresh if enabled
  useEffect(() => {
    if (template.refreshInterval > 0) {
      const interval = setInterval(() => {
        executeWidget(false);
      }, template.refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [template.refreshInterval]);

  // Initial load
  useEffect(() => {
    executeWidget();
  }, [template.id]);

  const executeWidget = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest('POST', `/api/external-widgets/${template.id}/execute`, {
        parameters: template.parameters,
        forceRefresh
      });

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setLastExecuted(new Date());
      } else {
        throw new Error(result.error || 'Widget execution failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute widget';
      setError(errorMessage);
      toast({
        title: "Widget Error",
        description: `Failed to load ${template.name}: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderMetricWidget = () => {
    if (!data) return null;

    const value = typeof data === 'object' && data.value !== undefined ? data.value : data;
    const formatValue = (val: any) => {
      if (typeof val === 'number') {
        if (template.displayConfig.format === 'currency') {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(val);
        }
        if (template.displayConfig.format === 'percentage') {
          return `${val}%`;
        }
        return val.toLocaleString();
      }
      return String(val);
    };

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[120px]">
        <div className="text-3xl font-bold text-primary mb-2">
          {formatValue(value)}
        </div>
        {data.subtitle && (
          <div className="text-sm text-muted-foreground text-center">
            {data.subtitle}
          </div>
        )}
        {data.trend && (
          <div className={`flex items-center mt-2 text-sm ${
            data.trend > 0 ? 'text-green-600' : data.trend < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            <TrendingUp className="w-4 h-4 mr-1" />
            {Math.abs(data.trend)}%
          </div>
        )}
      </div>
    );
  };

  const renderTableWidget = () => {
    if (!data || !Array.isArray(data)) return <div>No data available</div>;

    const columns = data.length > 0 ? Object.keys(data[0]) : [];

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
            {data.slice(0, compact ? 5 : 10).map((row, index) => (
              <tr key={index} className="border-b border-gray-100">
                {columns.map((col) => (
                  <td key={col} className="p-2">
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > (compact ? 5 : 10) && (
          <div className="text-xs text-muted-foreground p-2 text-center">
            Showing {compact ? 5 : 10} of {data.length} rows
          </div>
        )}
      </div>
    );
  };

  const renderChartWidget = () => {
    if (!data || !Array.isArray(data)) return <div>No data available</div>;

    const height = compact ? 200 : 300;

    switch (template.chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={template.displayConfig.xAxis || 'name'} />
              <YAxis />
              <Tooltip />
              <Bar 
                dataKey={template.displayConfig.yAxis || 'value'} 
                fill={template.displayConfig.color || CHART_COLORS[0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={template.displayConfig.xAxis || 'name'} />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey={template.displayConfig.yAxis || 'value'} 
                stroke={template.displayConfig.color || CHART_COLORS[0]}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={compact ? 60 : 80}
                fill="#8884d8"
                dataKey={template.displayConfig.valueKey || 'value'}
                label={template.displayConfig.showLabels ? 
                  (entry) => entry[template.displayConfig.labelKey || 'name'] : false
                }
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        );

      default:
        return renderTableWidget();
    }
  };

  const renderWidgetContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading widget...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <AlertCircle className="w-8 h-8 text-destructive mb-2" />
          <div className="text-sm text-destructive mb-2">{error}</div>
          <Button variant="outline" size="sm" onClick={() => executeWidget(true)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          No data available
        </div>
      );
    }

    switch (template.widgetType) {
      case 'metric':
      case 'gauge':
        return renderMetricWidget();
      case 'table':
        return renderTableWidget();
      case 'chart':
        return renderChartWidget();
      default:
        return <div>Unsupported widget type: {template.widgetType}</div>;
    }
  };

  const getWidgetIcon = () => {
    switch (template.widgetType) {
      case 'metric':
      case 'gauge':
        return TrendingUp;
      case 'table':
        return Table;
      case 'chart':
        return template.chartType === 'pie' ? PieChart : BarChart3;
      default:
        return BarChart3;
    }
  };

  const WidgetIcon = getWidgetIcon();

  return (
    <Card className={`relative transition-all duration-200 hover:shadow-lg ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <WidgetIcon className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-medium truncate">{template.name}</CardTitle>
            {template.description && !compact && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {template.description}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 flex-shrink-0">
          {template.tags && template.tags.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {template.tags[0]}
            </Badge>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => executeWidget(true)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </DropdownMenuItem>
              {onConfigure && (
                <DropdownMenuItem onClick={() => onConfigure(template)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(template)}>
                  Edit Widget
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(template.id)}
                  className="text-destructive"
                >
                  Delete Widget
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        {renderWidgetContent()}
        
        {lastExecuted && !compact && (
          <div className="text-xs text-muted-foreground mt-4 flex items-center justify-between">
            <span>Last updated: {lastExecuted.toLocaleTimeString()}</span>
            {template.cacheEnabled && (
              <Badge variant="outline" className="text-xs">
                Cached
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 