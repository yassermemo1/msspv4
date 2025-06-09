import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ExternalLink, AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { useEnhancedToast } from '@/lib/toast-utils';

interface WidgetData {
  status: 'success' | 'error' | 'loading';
  data?: any[];
  error?: string;
  lastUpdated?: string;
}

interface EmbeddableWidgetProps {
  widgetId: number;
  name: string;
  description?: string;
  type: 'chart' | 'table' | 'metric' | 'status' | 'list';
  height?: number;
  showHeader?: boolean;
  showControls?: boolean;
  refreshInterval?: number;
  onDataUpdate?: (data: WidgetData) => void;
  className?: string;
}

export function EmbeddableWidget({
  widgetId,
  name,
  description,
  type,
  height = 300,
  showHeader = true,
  showControls = true,
  refreshInterval = 30,
  onDataUpdate,
  className = ''
}: EmbeddableWidgetProps) {
  const { showError, handleApiError, handleNetworkError } = useEnhancedToast();
  const [data, setData] = useState<WidgetData>({ status: 'loading' });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch widget data
  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/integration-engine/widgets/${widgetId}/data`);
      if (!response.ok) {
        throw new Error(`Failed to fetch widget data: ${response.statusText}`);
      }
      
      const result = await response.json();
      const newData: WidgetData = {
        status: 'success',
        data: result.data || [],
        lastUpdated: new Date().toISOString()
      };
      
      setData(newData);
      onDataUpdate?.(newData);
    } catch (error) {
      const errorData: WidgetData = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: new Date().toISOString()
      };
      
      setData(errorData);
      onDataUpdate?.(errorData);
      
      await showError(`Failed to load widget "${name}": ${error instanceof Error ? error.message : 'Unknown error'}`, {
        context: 'EmbeddableWidget.fetchData'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchData();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [widgetId, refreshInterval]);

  // Render widget content based on type and data
  const renderContent = () => {
    if (data.status === 'loading') {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
            <span className="text-gray-600">Loading data...</span>
          </div>
        </div>
      );
    }

    if (data.status === 'error') {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 text-sm">{data.error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      );
    }

    // Success - render based on widget type
    switch (type) {
      case 'metric':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {Array.isArray(data.data) ? data.data.length : data.data?.value || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">
                {data.data?.label || 'Total Count'}
              </div>
            </div>
          </div>
        );

      case 'status':
        return (
          <div className="grid grid-cols-2 gap-4 p-4">
            {Array.isArray(data.data) ? data.data.slice(0, 4).map((item, index) => (
              <div key={index} className="text-center">
                <div className="text-lg font-semibold">{item.value || 0}</div>
                <div className="text-xs text-gray-600">{item.label || `Status ${index + 1}`}</div>
              </div>
            )) : (
              <div className="col-span-2 text-center text-gray-500">No status data</div>
            )}
          </div>
        );

      case 'list':
        return (
          <div className="space-y-2 p-4">
            {Array.isArray(data.data) ? data.data.slice(0, 10).map((item, index) => (
              <div key={index} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                <span className="text-sm">{item.title || item.name || `Item ${index + 1}`}</span>
                <Badge variant="outline" className="text-xs">
                  {item.status || item.type || 'Active'}
                </Badge>
              </div>
            )) : (
              <div className="text-center text-gray-500">No list data</div>
            )}
          </div>
        );

      case 'table':
        return (
          <div className="p-4">
            {Array.isArray(data.data) && data.data.length > 0 ? (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {Object.keys(data.data[0]).slice(0, 3).map(key => (
                        <th key={key} className="text-left py-2 px-1 font-medium text-gray-700">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.slice(0, 5).map((row, index) => (
                      <tr key={index} className="border-b border-gray-50">
                        {Object.values(row).slice(0, 3).map((value, i) => (
                          <td key={i} className="py-1 px-1">
                            {String(value).length > 20 ? `${String(value).substring(0, 20)}...` : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-500">No table data</div>
            )}
          </div>
        );

      case 'chart':
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Chart visualization ready</p>
              <p className="text-xs text-gray-400">
                {Array.isArray(data.data) ? `${data.data.length} data points` : 'Data loaded'}
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{name}</CardTitle>
              {description && (
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={data.status === 'success' ? 'default' : data.status === 'error' ? 'destructive' : 'secondary'} className="text-xs">
                {data.status}
              </Badge>
              {showControls && (
                <div className="flex space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchData}
                    disabled={isRefreshing}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/integration-engine?widget=${widgetId}`, '_blank')}
                    className="h-6 w-6 p-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          {data.lastUpdated && (
            <p className="text-xs text-gray-400">
              Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div style={{ height: height - (showHeader ? 80 : 0) }}>
          {renderContent()}
        </div>
      </CardContent>
    </Card>
  );
}

// Widget grid component for displaying multiple widgets
interface WidgetGridProps {
  widgetIds: number[];
  columns?: number;
  height?: number;
  showHeaders?: boolean;
  showControls?: boolean;
  className?: string;
}

export function WidgetGrid({
  widgetIds,
  columns = 2,
  height = 300,
  showHeaders = true,
  showControls = true,
  className = ''
}: WidgetGridProps) {
  const [widgets, setWidgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { handleApiError, handleNetworkError } = useEnhancedToast();

  useEffect(() => {
    const fetchWidgets = async () => {
      try {
        const promises = widgetIds.map(id => 
          fetch(`/api/integration-engine/widgets/${id}`).then(res => res.json())
        );
        const results = await Promise.all(promises);
        setWidgets(results.filter(w => w && !w.error));
      } catch (error) {
        await handleNetworkError(error as Error, {
          endpoint: '/api/integration-engine/widgets'
        }, 'WidgetGrid.fetchWidgets');
      } finally {
        setLoading(false);
      }
    };

    if (widgetIds.length > 0) {
      fetchWidgets();
    } else {
      setLoading(false);
    }
  }, [widgetIds]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mr-2" />
        <span>Loading widgets...</span>
      </div>
    );
  }

  if (widgets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No widgets available
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${className}`} style={{ 
      gridTemplateColumns: `repeat(${columns}, 1fr)` 
    }}>
      {widgets.map(widget => (
        <EmbeddableWidget
          key={widget.id}
          widgetId={widget.id}
          name={widget.name}
          description={widget.description}
          type={widget.type}
          height={height}
          showHeader={showHeaders}
          showControls={showControls}
          refreshInterval={widget.queryConfig?.refreshInterval}
        />
      ))}
    </div>
  );
} 