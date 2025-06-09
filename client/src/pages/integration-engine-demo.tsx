import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ExternalLink, 
  RefreshCw, 
  Search, 
  Plus,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Play,
  Settings,
  Package
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import IntegrationEngineWidget from '@/components/external-widgets/integration-engine-widget';

interface ExternalSystem {
  id: number;
  displayName: string;
  systemName: string;
  baseUrl: string;
  authType: string;
  isActive: boolean;
}

interface IntegrationEngineWidget {
  id: string;
  name: string;
  description: string;
  type: string;
  component: string;
  config: any;
  dataSource: string;
  metadata: {
    author: string;
    version: string;
    category: string;
    tags: string[];
  };
}

export default function IntegrationEngineDemo() {
  const { toast } = useToast();
  const [systems, setSystems] = useState<ExternalSystem[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<ExternalSystem | null>(null);
  const [widgets, setWidgets] = useState<IntegrationEngineWidget[]>([]);
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [demoWidgets, setDemoWidgets] = useState<string[]>([]);

  useEffect(() => {
    loadExternalSystems();
  }, []);

  const loadExternalSystems = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('GET', '/api/external-systems');
      const systemsData = await response.json();
      setSystems(systemsData);
      
      // Auto-select Integration Engine if available
      const integrationEngine = systemsData.find((s: ExternalSystem) => 
        s.systemName === 'integration-engine' || s.baseUrl.includes('localhost:5001')
      );
      
      if (integrationEngine) {
        setSelectedSystem(integrationEngine);
        testConnection(integrationEngine.id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load external systems",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (systemId: number) => {
    try {
      setTestingConnection(true);
      const response = await apiRequest('GET', `/api/external-widgets/integration-engine/${systemId}/test`);
      const result = await response.json();
      
      if (result.success) {
        setConnectionStatus('success');
        toast({
          title: "Connection Successful",
          description: "Integration Engine is accessible",
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: "Connection Failed", 
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "Connection Error",
        description: "Failed to connect to Integration Engine",
        variant: "destructive"
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const discoverWidgets = async () => {
    if (!selectedSystem) return;
    
    try {
      setDiscovering(true);
      
      // Get widgets and dashboards
      const [widgetsResponse, dashboardsResponse] = await Promise.all([
        apiRequest('GET', `/api/external-widgets/integration-engine/${selectedSystem.id}/widgets`),
        apiRequest('GET', `/api/external-widgets/integration-engine/${selectedSystem.id}/dashboards`)
      ]);
      
      const widgetsData = await widgetsResponse.json();
      const dashboardsData = await dashboardsResponse.json();
      
      setWidgets(widgetsData.widgets || []);
      setDashboards(dashboardsData.dashboards || []);
      
      toast({
        title: "Discovery Complete",
        description: `Found ${widgetsData.widgets?.length || 0} widgets and ${dashboardsData.dashboards?.length || 0} dashboards`,
      });
    } catch (error) {
      toast({
        title: "Discovery Failed",
        description: "Failed to discover widgets from Integration Engine",
        variant: "destructive"
      });
    } finally {
      setDiscovering(false);
    }
  };

  const addToDemo = (widgetId: string) => {
    if (!demoWidgets.includes(widgetId)) {
      setDemoWidgets([...demoWidgets, widgetId]);
      toast({
        title: "Widget Added",
        description: "Widget added to demo dashboard",
      });
    }
  };

  const removeFromDemo = (widgetId: string) => {
    setDemoWidgets(demoWidgets.filter(id => id !== widgetId));
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading Integration Engine Demo...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integration Engine Demo</h1>
          <p className="text-gray-600">
            Test and demonstrate external widget integration with your existing Integration Engine
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Localhost:5001
        </Badge>
      </div>

      <Tabs defaultValue="setup" className="w-full">
        <TabsList>
          <TabsTrigger value="setup">Setup & Connection</TabsTrigger>
          <TabsTrigger value="discovery">Widget Discovery</TabsTrigger>
          <TabsTrigger value="demo">Live Demo</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>
                Configure connection to your Integration Engine system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSystem ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">System Name</label>
                      <p className="text-sm text-gray-600">{selectedSystem.displayName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Base URL</label>
                      <p className="text-sm text-gray-600">{selectedSystem.baseUrl}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Authentication</label>
                      <p className="text-sm text-gray-600">{selectedSystem.authType}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <div className="flex items-center gap-2">
                        {connectionStatus === 'success' && (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        )}
                        {connectionStatus === 'error' && (
                          <Badge variant="outline" className="text-red-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Error
                          </Badge>
                        )}
                        {connectionStatus === 'unknown' && (
                          <Badge variant="outline" className="text-gray-600">
                            Unknown
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => testConnection(selectedSystem.id)}
                    disabled={testingConnection}
                    className="w-full"
                  >
                    {testingConnection ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {testingConnection ? 'Testing Connection...' : 'Test Connection'}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Integration Engine Found</h3>
                  <p className="text-gray-600 mb-4">
                    No Integration Engine system is configured. Please run the setup script first.
                  </p>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                    node scripts/setup-integration-engine.js
                  </code>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discovery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Widget Discovery
              </CardTitle>
              <CardDescription>
                Discover available widgets and dashboards from your Integration Engine
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSystem && connectionStatus === 'success' ? (
                <div className="space-y-4">
                  <Button 
                    onClick={discoverWidgets}
                    disabled={discovering}
                    className="w-full"
                  >
                    {discovering ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    {discovering ? 'Discovering...' : 'Discover Widgets & Dashboards'}
                  </Button>
                  
                  {widgets.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Discovered Widgets ({widgets.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {widgets.map((widget) => (
                          <Card key={widget.id} className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-sm">{widget.name}</h5>
                                <p className="text-xs text-gray-600 mt-1">{widget.description}</p>
                                <div className="flex gap-1 mt-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {widget.type}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {widget.metadata?.category || 'general'}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => addToDemo(widget.id)}
                                disabled={demoWidgets.includes(widget.id)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {dashboards.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Discovered Dashboards ({dashboards.length})</h4>
                      <div className="space-y-2">
                        {dashboards.map((dashboard) => (
                          <Card key={dashboard.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium text-sm">{dashboard.name}</h5>
                                <p className="text-xs text-gray-600">
                                  {dashboard.widgets?.length || 0} widgets
                                </p>
                              </div>
                              <Button size="sm" variant="outline">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Import
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Required</h3>
                  <p className="text-gray-600">
                    Please establish a successful connection first before discovering widgets.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Live Widget Demo
              </CardTitle>
              <CardDescription>
                See your Integration Engine widgets running live within the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {demoWidgets.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {demoWidgets.map((widgetId) => {
                    const widget = widgets.find(w => w.id === widgetId);
                    return widget && selectedSystem ? (
                      <IntegrationEngineWidget
                        key={widgetId}
                        widgetId={widgetId}
                        widgetName={widget.name}
                        systemId={selectedSystem.id}
                        config={{
                          refreshInterval: 30,
                          dataParams: {}
                        }}
                        size="medium"
                        onError={(error) => {
                          toast({
                            title: "Widget Error",
                            description: error,
                            variant: "destructive"
                          });
                        }}
                      />
                    ) : null;
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Widgets Added</h3>
                  <p className="text-gray-600">
                    Go to the Widget Discovery tab and add some widgets to see them here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 