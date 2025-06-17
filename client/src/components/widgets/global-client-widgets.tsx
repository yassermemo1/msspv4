import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  Settings, 
  Globe, 
  AlertCircle, 
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { DynamicWidgetRenderer } from './dynamic-widget-renderer';

interface GlobalWidget {
  id: string;
  systemId: number;
  systemName: string;
  pluginName: string;
  name: string;
  description: string;
  widgetType: 'table' | 'chart' | 'metric' | 'list' | 'gauge';
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  query: string;
  method: string;
  parameters: Record<string, any>;
  displayConfig: Record<string, any>;
  refreshInterval: number;
  isActive: boolean;
  isGlobal: boolean;
  position: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface GlobalClientWidgetsProps {
  clientId?: number;
  clientShortName: string;
  clientName: string;
  clientDomain?: string;
  onManageWidgets?: () => void;
}

export const GlobalClientWidgets: React.FC<GlobalClientWidgetsProps> = ({
  clientId,
  clientShortName,
  clientName,
  clientDomain,
  onManageWidgets
}) => {
  const [widgets, setWidgets] = useState<GlobalWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGlobalWidgets();
  }, []);

  const loadGlobalWidgets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load global widgets from API
      const response = await fetch('/api/global-widgets', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load global widgets: ${response.statusText}`);
      }
      
      const globalWidgets = await response.json();
      // Filter to show only active widgets
      const activeWidgets = globalWidgets.filter((widget: GlobalWidget) => widget.isActive);
      setWidgets(activeWidgets);
    } catch (error) {
      console.error('Failed to load global widgets:', error);
      setError(error instanceof Error ? error.message : 'Failed to load global widgets');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshWidget = (widgetId: string) => {
    // Force refresh the specific widget
    const widgetElement = document.querySelector(`[data-widget-id="${widgetId}"]`);
    if (widgetElement) {
      const refreshEvent = new CustomEvent('refreshWidget', { detail: { widgetId } });
      widgetElement.dispatchEvent(refreshEvent);
    }
  };

  // Helper function to properly map systemId to instanceId
  const getInstanceId = (pluginName: string, systemId: number) => {
    if (pluginName === 'jira') {
      return systemId === 1 ? 'jira-main' : `jira-system-${systemId}`;
    }
    return `${pluginName}-main`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Globe className="h-5 w-5 mr-2 text-blue-600" />
            <h2 className="text-lg font-semibold">Global Widgets</h2>
            <Badge variant="outline" className="ml-2">Loading...</Badge>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-64">
              <CardContent className="flex items-center justify-center h-full">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Loading widgets...</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Globe className="h-5 w-5 mr-2 text-blue-600" />
            <h2 className="text-lg font-semibold">Global Widgets</h2>
            <Badge variant="destructive" className="ml-2">Error</Badge>
          </div>
        </div>
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Error:</strong> {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={loadGlobalWidgets}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (widgets.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Globe className="h-5 w-5 mr-2 text-blue-600" />
            <h2 className="text-lg font-semibold">Global Widgets</h2>
            <Badge variant="secondary" className="ml-2">0 widgets</Badge>
          </div>
          {onManageWidgets && (
            <Button
              variant="outline"
              size="sm"
              onClick={onManageWidgets}
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Global Widgets
            </Button>
          )}
        </div>
        <Card className="border-dashed border-gray-300">
          <CardContent className="text-center py-12">
            <Globe className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No global widgets available</h3>
            <p className="text-gray-600 mb-4">
              No global widgets have been created yet, or none are enabled for client detail pages.
            </p>
            {onManageWidgets && (
              <Button
                variant="outline"
                onClick={onManageWidgets}
              >
                <Settings className="h-4 w-4 mr-2" />
                Create Global Widgets
              </Button>
            )}
          </CardContent>
        </Card>
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Global Widgets:</strong> These widgets are automatically deployed to all client detail pages.
            They can query any available plugin (Jira, Fortigate, Splunk, etc.) and will automatically 
            receive client context variables like clientShortName, clientName, and clientDomain.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Globe className="h-5 w-5 mr-2 text-blue-600" />
          <h2 className="text-lg font-semibold">Global Widgets</h2>
          <Badge variant="secondary" className="ml-2">
            {widgets.length} active
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {onManageWidgets && (
            <Button
              variant="outline"
              size="sm"
              onClick={onManageWidgets}
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Global Widgets
            </Button>
          )}
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {widgets.map((widget) => (
          <div key={widget.id} className="relative group">
            <Card className="h-auto min-h-[120px] hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Badge variant="outline" className="text-xs">
                    {widget.pluginName}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {widget.widgetType}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRefreshWidget(widget.id)}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  title="Refresh widget"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0">
                <CardTitle className="text-sm font-medium truncate mb-2">
                  {widget.name}
                </CardTitle>
                <div data-widget-id={widget.id} className="min-h-[60px]">
                  <DynamicWidgetRenderer
                    widget={{
                      id: widget.id,
                      name: widget.name,
                      description: widget.description,
                      pluginName: widget.pluginName,
                      instanceId: getInstanceId(widget.pluginName, widget.systemId),
                      queryType: 'custom',
                      customQuery: widget.query,
                      queryMethod: widget.method,
                      queryParameters: widget.parameters,
                      displayType: widget.widgetType,
                      chartType: widget.chartType,
                      refreshInterval: widget.refreshInterval,
                      placement: 'client-details',
                      styling: {
                        width: 'full',
                        height: 'small',
                        showBorder: false,
                        showHeader: false
                      },
                      enabled: widget.isActive
                    }}
                    clientShortName={clientShortName}
                    clientName={clientName}
                    clientDomain={clientDomain}
                    className="compact-widget"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50 mt-6">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Global Widgets:</strong> These widgets are automatically deployed to all client pages
          and will dynamically adapt to show client-specific data using context variables.
        </AlertDescription>
      </Alert>
    </div>
  );
}; 