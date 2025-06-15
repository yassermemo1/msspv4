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
  clientShortName: string;
  clientName: string;
  clientDomain?: string;
  onManageWidgets?: () => void;
}

export const GlobalClientWidgets: React.FC<GlobalClientWidgetsProps> = ({
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
      setWidgets(globalWidgets);
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-4 w-4 mr-2" />
            Global Widgets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading global widgets...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-4 w-4 mr-2" />
            Global Widgets
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    );
  }

  if (widgets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Globe className="h-4 w-4 mr-2" />
              Global Widgets
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
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
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
          </div>
          <Alert className="mt-4 border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Global Widgets:</strong> These widgets are automatically deployed to all client detail pages.
              They can query any available plugin (Jira, Fortigate, Splunk, etc.) and will automatically 
              receive client context variables like clientShortName, clientName, and clientDomain.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Globe className="h-4 w-4 mr-2" />
            Global Widgets
            <Badge variant="secondary" className="ml-2">
              {widgets.length} active
            </Badge>
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
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Global widgets automatically deployed to all client pages
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {widgets.map((widget) => (
            <div key={widget.id} className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {widget.pluginName}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {widget.widgetType}
                  </Badge>
                  <span className="text-sm font-medium">{widget.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRefreshWidget(widget.id)}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
              
              <div data-widget-id={widget.id}>
                <DynamicWidgetRenderer
                  widget={{
                    id: widget.id,
                    name: widget.name,
                    description: widget.description,
                    pluginName: widget.pluginName,
                    instanceId: widget.systemId.toString(),
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
                      height: 'medium',
                      showBorder: true,
                      showHeader: true
                    },
                    enabled: widget.isActive
                  }}
                  clientShortName={clientShortName}
                  clientName={clientName}
                  clientDomain={clientDomain}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}; 