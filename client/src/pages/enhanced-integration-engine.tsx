import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Zap, 
  Plus, 
  Settings, 
  Database, 
  BarChart3, 
  Eye, 
  Trash2,
  ExternalLink,
  Workflow,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Grid3x3,
  Layers,
  Code,
  Play
} from 'lucide-react';
import { WidgetBuilder } from '@/unused-scripts/integration-engine/widget-builder';
import { CustomQueryBuilder } from '@/unused-scripts/integration-engine/custom-query-builder';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { PlatformConnector } from '@/unused-scripts/integration-engine/platform-connector';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';

interface ExternalSystem {
  id: number;
  systemName: string;
  displayName: string;
  systemType: string;
  baseUrl: string;
  authType: string;
  isActive: boolean;
  lastSync?: string;
  status?: 'connected' | 'disconnected' | 'error';
}

interface Widget {
  id: number;
  name: string;
  description: string;
  type: 'chart' | 'table' | 'metric' | 'status' | 'list';
  systemId: number;
  isActive: boolean;
  position: any;
  queryConfig: any;
  visualConfig: any;
  createdAt: string;
  updatedAt: string;
}

interface CustomQuery {
  id: number;
  name: string;
  description: string;
  systemId: number;
  queryType: string;
  query: string;
  parameters: any;
  dataMapping: any;
  isActive: boolean;
  isPublic: boolean;
  tags: string[];
}

export default function EnhancedIntegrationEngine() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [showWidgetBuilder, setShowWidgetBuilder] = useState(false);
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [showPlatformConnector, setShowPlatformConnector] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [editingQuery, setEditingQuery] = useState<CustomQuery | null>(null);
  const [loading, setLoading] = useState(false);
  const [widgetTemplates, setWidgetTemplates] = useState<Widget[]>([]);

  // Fetch external systems
  const { data: systems = [], isLoading: systemsLoading } = useQuery({
    queryKey: ['external-systems'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/external-systems');
      return response.json();
    }
  });

  // Fetch widgets
  const { data: widgets = [], isLoading: widgetsLoading } = useQuery({
    queryKey: ['enhanced-widgets'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/external-widgets');
      return response.json();
    }
  });

  // Fetch custom queries
  const { data: customQueries = [], isLoading: queriesLoading } = useQuery({
    queryKey: ['custom-queries'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/integration-engine/custom-queries');
      return response.json();
    }
  });

  // Platform statistics
  const platformStats = React.useMemo(() => {
    const stats = {
      totalSystems: systems.length,
      activeSystems: systems.filter((s: ExternalSystem) => s.isActive).length,
      totalWidgets: widgets.length,
      activeWidgets: widgets.filter((w: Widget) => w.isActive).length,
      totalQueries: customQueries.length,
      activeQueries: customQueries.filter((q: CustomQuery) => q.isActive).length,
      platforms: {
        grafana: systems.filter((s: ExternalSystem) => s.systemType.toLowerCase().includes('grafana')).length,
        splunk: systems.filter((s: ExternalSystem) => s.systemType.toLowerCase().includes('splunk')).length,
        carbonblack: systems.filter((s: ExternalSystem) => s.systemType.toLowerCase().includes('carbon')).length,
        jira: systems.filter((s: ExternalSystem) => s.systemType.toLowerCase().includes('jira')).length,
        other: systems.filter((s: ExternalSystem) => 
          !['grafana', 'splunk', 'carbon', 'jira'].some(platform => 
            s.systemType.toLowerCase().includes(platform)
          )
        ).length
      }
    };
    return stats;
  }, [systems, widgets, customQueries]);

  // Load templates
  const loadWidgets = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('GET', '/api/widgets/manage');
      const templates = await response.json();
      setWidgetTemplates(templates);
    } catch (error) {
      console.error('Failed to load widget templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle widget operations
  const handleSaveWidget = async (widget: Widget) => {
    try {
      if (editingWidget) {
        await apiRequest('PUT', `/api/widgets/manage/${editingWidget.id}`, widget);
      } else {
        await apiRequest('POST', '/api/widgets/manage', widget);
      }
      await loadWidgets(); // Reload templates
      setShowWidgetBuilder(false);
      setEditingWidget(null);
    } catch (error) {
      console.error('Failed to save widget:', error);
      alert('Failed to save widget. Please try again.');
    }
  };

  // Handle test widget data
  const handleTestWidget = async (config: any) => {
    try {
      const response = await apiRequest('POST', '/api/integration-engine/test-query', config);
      return response.json();
    } catch (error) {
      throw new Error('Failed to test widget configuration');
    }
  };

  // Platform overview stats
  const PlatformOverview = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Connected Systems</p>
                <p className="text-2xl font-bold">{platformStats.activeSystems}/{platformStats.totalSystems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Grid3x3 className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Widgets</p>
                <p className="text-2xl font-bold">{platformStats.activeWidgets}/{platformStats.totalWidgets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Code className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Custom Queries</p>
                <p className="text-2xl font-bold">{platformStats.activeQueries}/{platformStats.totalQueries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Layers className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Platform Types</p>
                <p className="text-2xl font-bold">{Object.keys(platformStats.platforms).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Platform Integrations
          </CardTitle>
          <CardDescription>
            Connected platforms and their integration status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(platformStats.platforms).map(([platform, count]) => (
              <div key={platform} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    count > 0 ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span className="font-medium capitalize">{platform}</span>
                </div>
                <Badge variant={count > 0 ? "default" : "secondary"}>
                  {count} system{count !== 1 ? 's' : ''}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {widgets.slice(0, 5).map((widget: Widget) => (
              <div key={widget.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="font-medium">{widget.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {systems.find((s: ExternalSystem) => s.id === widget.systemId)?.displayName}
                    </p>
                  </div>
                </div>
                <Badge variant={widget.isActive ? "default" : "secondary"}>
                  {widget.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-yellow-500" />
            Enhanced Integration Engine
          </h1>
          <p className="text-muted-foreground mt-1">
            Advanced platform integrations with drag-drop widget builder and custom queries
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPlatformConnector(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Connect Platform
          </Button>
          <Button onClick={() => setShowWidgetBuilder(true)}>
            <Grid3x3 className="h-4 w-4 mr-2" />
            Create Widget
          </Button>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="widgets">Widget Builder</TabsTrigger>
          <TabsTrigger value="queries">Custom Queries</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="dashboard">Live Dashboard</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PlatformOverview />
        </TabsContent>

        <TabsContent value="widgets">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Widget Builder</h2>
              <Button onClick={() => setShowWidgetBuilder(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Widget
              </Button>
            </div>

            <div className="grid gap-4">
              {widgets.map((widget: Widget) => (
                <Card key={widget.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <BarChart3 className="h-5 w-5 text-blue-500" />
                        <div>
                          <h3 className="font-semibold">{widget.name}</h3>
                          <p className="text-sm text-muted-foreground">{widget.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={widget.isActive ? "default" : "secondary"}>
                          {widget.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingWidget(widget);
                            setShowWidgetBuilder(true);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="queries">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Custom Queries</h2>
              <Button onClick={() => setShowQueryBuilder(true)}>
                <Code className="h-4 w-4 mr-2" />
                New Query
              </Button>
            </div>

            <div className="grid gap-4">
              {customQueries.map((query: CustomQuery) => (
                <Card key={query.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Code className="h-5 w-5 text-purple-500" />
                        <div>
                          <h3 className="font-semibold">{query.name}</h3>
                          <p className="text-sm text-muted-foreground">{query.description}</p>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {query.queryType}
                            </Badge>
                            {query.tags?.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={query.isActive ? "default" : "secondary"}>
                          {query.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingQuery(query);
                            setShowQueryBuilder(true);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="platforms">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Connected Platforms</h2>
            
            <div className="grid gap-4">
              {systems.map((system: ExternalSystem) => (
                <Card key={system.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          system.isActive ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <h3 className="font-semibold">{system.displayName}</h3>
                          <p className="text-sm text-muted-foreground">{system.systemType}</p>
                          <p className="text-xs text-muted-foreground">{system.baseUrl}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={system.isActive ? "default" : "secondary"}>
                          {system.isActive ? "Connected" : "Disconnected"}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="dashboard">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Live Dashboard</h2>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Drag and drop widgets to rearrange the dashboard layout. Live data updates automatically.
              </AlertDescription>
            </Alert>
            {/* This would contain the DashboardGrid component with drag-drop functionality */}
            <div className="min-h-[400px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Grid3x3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-600">Dashboard Grid</p>
                <p className="text-sm text-gray-500">Drag & drop widgets will appear here</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Integration Settings</h2>
            <Card>
              <CardHeader>
                <CardTitle>Global Configuration</CardTitle>
                <CardDescription>
                  Configure global settings for the Integration Engine
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Refresh Interval</label>
                  <select className="w-full p-2 border rounded">
                    <option value="300">5 minutes</option>
                    <option value="600">10 minutes</option>
                    <option value="1800">30 minutes</option>
                    <option value="3600">1 hour</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cache Duration</label>
                  <select className="w-full p-2 border rounded">
                    <option value="300">5 minutes</option>
                    <option value="900">15 minutes</option>
                    <option value="1800">30 minutes</option>
                    <option value="3600">1 hour</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog open={showWidgetBuilder} onOpenChange={(open) => {
        setShowWidgetBuilder(open);
        if (!open) setEditingWidget(null);
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWidget ? 'Edit Widget' : 'Create New Widget'}</DialogTitle>
            <DialogDescription>
              Build interactive widgets from external system data sources with advanced visualization options.
            </DialogDescription>
          </DialogHeader>
          <WidgetBuilder
            systems={systems}
            widget={editingWidget}
            onSave={handleSaveWidget}
            onCancel={() => {
              setShowWidgetBuilder(false);
              setEditingWidget(null);
            }}
            onTest={handleTestWidget}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showQueryBuilder} onOpenChange={(open) => {
        setShowQueryBuilder(open);
        if (!open) setEditingQuery(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuery ? 'Edit Custom Query' : 'Create Custom Query'}</DialogTitle>
            <DialogDescription>
              Build custom queries to integrate with external systems like Grafana, Splunk, and Carbon Black.
            </DialogDescription>
          </DialogHeader>
          <CustomQueryBuilder
            systems={systems}
            query={editingQuery}
            onSave={(query) => {
              // Handle save
              setShowQueryBuilder(false);
              setEditingQuery(null);
            }}
            onCancel={() => {
              setShowQueryBuilder(false);
              setEditingQuery(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showPlatformConnector} onOpenChange={setShowPlatformConnector}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Platform Connection</DialogTitle>
            <DialogDescription>
              Configure a new connection to external platforms like Grafana, Splunk, Carbon Black, or other systems.
            </DialogDescription>
          </DialogHeader>
          <PlatformConnector
            onSave={() => {
              setShowPlatformConnector(false);
              queryClient.invalidateQueries({ queryKey: ['external-systems'] });
            }}
            onCancel={() => setShowPlatformConnector(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 