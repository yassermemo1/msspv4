import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Copy,
  BarChart3,
  PieChart,
  LineChart,
  Table as TableIcon,
  Gauge,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  Search,
  Filter,
  Grid,
  List,
  Power,
  PowerOff,
  Code
} from 'lucide-react';
import { DynamicWidgetRenderer } from './dynamic-widget-renderer';
import { DynamicWidgetBuilder } from './dynamic-widget-builder';

interface CustomWidget {
  id: string;
  name: string;
  description: string;
  pluginName: string;
  instanceId: string;
  queryType: 'default' | 'custom';
  queryId?: string;
  customQuery?: string;
  queryMethod: string;
  queryParameters: Record<string, any>;
  displayType: 'table' | 'chart' | 'metric' | 'list' | 'gauge' | 'query';
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
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClientWidgetsManagerProps {
  clientShortName: string;
  clientName: string;
  clientDomain?: string;
  onWidgetChange?: () => void;
}

export const ClientWidgetsManager: React.FC<ClientWidgetsManagerProps> = ({
  clientShortName,
  clientName,
  clientDomain,
  onWidgetChange
}) => {
  const [widgets, setWidgets] = useState<CustomWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlugin, setFilterPlugin] = useState<string>('all');
  const [filterEnabled, setFilterEnabled] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWidget, setEditingWidget] = useState<CustomWidget | null>(null);
  const [previewWidget, setPreviewWidget] = useState<CustomWidget | null>(null);
  const [availablePlugins, setAvailablePlugins] = useState<any[]>([]);

  useEffect(() => {
    loadWidgets();
    loadAvailablePlugins();
  }, []);

  const loadWidgets = () => {
    try {
      setLoading(true);
      const savedWidgets = localStorage.getItem('customWidgets');
      if (savedWidgets) {
        const allWidgets = JSON.parse(savedWidgets);
        const clientWidgets = allWidgets.filter((widget: CustomWidget) => 
          widget.placement === 'client-details'
        );
        setWidgets(clientWidgets);
      }
    } catch (error) {
      console.error('Failed to load widgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePlugins = async () => {
    try {
      const response = await fetch('/api/plugins/available');
      if (response.ok) {
        const plugins = await response.json();
        setAvailablePlugins(plugins);
      }
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
  };

  const saveWidgets = (updatedWidgets: CustomWidget[]) => {
    try {
      // Get all widgets from storage
      const savedWidgets = localStorage.getItem('customWidgets');
      const allWidgets = savedWidgets ? JSON.parse(savedWidgets) : [];
      
      // Remove old client-details widgets and add updated ones
      const otherWidgets = allWidgets.filter((w: CustomWidget) => w.placement !== 'client-details');
      const newAllWidgets = [...otherWidgets, ...updatedWidgets];
      
      localStorage.setItem('customWidgets', JSON.stringify(newAllWidgets));
      setWidgets(updatedWidgets);
      onWidgetChange?.();
    } catch (error) {
      console.error('Failed to save widgets:', error);
    }
  };

  const toggleWidget = (widgetId: string) => {
    const updatedWidgets = widgets.map(widget =>
      widget.id === widgetId
        ? { ...widget, enabled: !widget.enabled, updatedAt: new Date().toISOString() }
        : widget
    );
    saveWidgets(updatedWidgets);
  };

  const deleteWidget = (widgetId: string) => {
    const updatedWidgets = widgets.filter(widget => widget.id !== widgetId);
    saveWidgets(updatedWidgets);
  };

  const duplicateWidget = (widget: CustomWidget) => {
    const newWidget: CustomWidget = {
      ...widget,
      id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${widget.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updatedWidgets = [...widgets, newWidget];
    saveWidgets(updatedWidgets);
  };

  const handleWidgetSave = (widget: CustomWidget) => {
    if (editingWidget) {
      // Update existing widget
      const updatedWidgets = widgets.map(w =>
        w.id === editingWidget.id
          ? { ...widget, id: editingWidget.id, updatedAt: new Date().toISOString() }
          : w
      );
      saveWidgets(updatedWidgets);
    } else {
      // Add new widget
      const newWidget: CustomWidget = {
        ...widget,
        id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        placement: 'client-details',
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const updatedWidgets = [...widgets, newWidget];
      saveWidgets(updatedWidgets);
    }
    setShowBuilder(false);
    setEditingWidget(null);
  };

  const filteredWidgets = widgets.filter(widget => {
    const matchesSearch = widget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         widget.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         widget.pluginName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlugin = filterPlugin === 'all' || widget.pluginName === filterPlugin;
    
    const matchesEnabled = filterEnabled === 'all' || 
                          (filterEnabled === 'enabled' && widget.enabled) ||
                          (filterEnabled === 'disabled' && !widget.enabled);
    
    return matchesSearch && matchesPlugin && matchesEnabled;
  });

  const getDisplayTypeIcon = (displayType: string) => {
    switch (displayType) {
      case 'chart': return BarChart3;
      case 'table': return TableIcon;
      case 'metric': return Gauge;
      case 'list': return List;
      case 'gauge': return Gauge;
      case 'query': return Code;
      default: return BarChart3;
    }
  };

  const getPluginBadgeColor = (pluginName: string) => {
    const colors: Record<string, string> = {
      'jira': 'bg-blue-100 text-blue-800',
      'fortigate': 'bg-red-100 text-red-800',
      'splunk': 'bg-green-100 text-green-800',
      'elasticsearch': 'bg-yellow-100 text-yellow-800',
      'qradar': 'bg-purple-100 text-purple-800',
      'grafana': 'bg-orange-100 text-orange-800'
    };
    return colors[pluginName] || 'bg-gray-100 text-gray-800';
  };

  const uniquePlugins = [...new Set(widgets.map(w => w.pluginName))];

  return (
    <div className="space-y-6">
      {/* Header with Client Context */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Client Widgets Manager</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Info className="h-4 w-4 mr-1" />
                <span>Client: <strong>{clientName}</strong></span>
              </div>
              <div className="flex items-center">
                <span>Short Name: <strong>{clientShortName}</strong></span>
              </div>
              {clientDomain && (
                <div className="flex items-center">
                  <span>Domain: <strong>{clientDomain}</strong></span>
                </div>
              )}
            </div>
          </div>
          <Button onClick={() => setShowBuilder(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Widget
          </Button>
        </div>
        
        {/* Client Variables Info */}
        <Alert className="mt-4 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Available Client Variables:</strong> Your widgets can use these variables in queries:
            <code className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">
              clientShortName="{clientShortName}", clientName="{clientName}"
              {clientDomain && `, clientDomain="${clientDomain}"`}
            </code>
          </AlertDescription>
        </Alert>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search widgets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={filterPlugin} onValueChange={setFilterPlugin}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Plugins" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plugins</SelectItem>
              {uniquePlugins.map(plugin => (
                <SelectItem key={plugin} value={plugin}>{plugin}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterEnabled} onValueChange={setFilterEnabled}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Widgets Display */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading widgets...</div>
        </div>
      ) : filteredWidgets.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {widgets.length === 0 ? 'No Widgets Created' : 'No Widgets Match Filters'}
          </h3>
          <p className="text-gray-500 mb-4">
            {widgets.length === 0 
              ? 'Create your first custom widget to display plugin data for this client.'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
          {widgets.length === 0 && (
            <Button onClick={() => setShowBuilder(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create First Widget
            </Button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
          : "space-y-4"
        }>
          {filteredWidgets.map((widget) => {
            const IconComponent = getDisplayTypeIcon(widget.displayType);
            
            return (
              <Card key={widget.id} className={`relative ${!widget.enabled ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${widget.enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-medium truncate">
                          {widget.name}
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {widget.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Switch
                        checked={widget.enabled}
                        onCheckedChange={() => toggleWidget(widget.id)}
                        className="data-[state=checked]:bg-green-600"
                      />
                      {widget.enabled ? (
                        <Power className="h-4 w-4 text-green-600" />
                      ) : (
                        <PowerOff className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Widget Metadata */}
                  <div className="flex flex-wrap gap-2">
                    <Badge className={getPluginBadgeColor(widget.pluginName)}>
                      {widget.pluginName}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {widget.displayType}
                    </Badge>
                    {widget.refreshInterval > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        {widget.refreshInterval}s
                      </Badge>
                    )}
                  </div>

                  {/* Widget Preview (if enabled) */}
                  {widget.enabled && (
                    <div className="border rounded-lg p-2 bg-gray-50">
                      <div className="text-xs text-gray-500 mb-2">Live Preview:</div>
                      <div className="max-h-32 overflow-hidden">
                        <DynamicWidgetRenderer
                          widget={widget}
                          clientShortName={clientShortName}
                          className="scale-75 origin-top-left transform"
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewWidget(widget)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingWidget(widget);
                          setShowBuilder(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateWidget(widget)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteWidget(widget.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Widget Info */}
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>Created: {new Date(widget.createdAt).toLocaleDateString()}</div>
                    <div>Updated: {new Date(widget.updatedAt).toLocaleDateString()}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Widget Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={(open) => {
        setShowBuilder(open);
        if (!open) {
          setEditingWidget(null);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWidget ? 'Edit Widget' : 'Create New Widget'}
            </DialogTitle>
          </DialogHeader>
          <DynamicWidgetBuilder
            initialWidget={editingWidget || undefined}
            onSave={handleWidgetSave}
            onCancel={() => {
              setShowBuilder(false);
              setEditingWidget(null);
            }}
            placement="client-details"
            clientContext={{
              clientShortName,
              clientName,
              clientDomain
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Widget Preview Dialog */}
      <Dialog open={!!previewWidget} onOpenChange={(open) => !open && setPreviewWidget(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Widget Preview: {previewWidget?.name}</DialogTitle>
          </DialogHeader>
          {previewWidget && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <DynamicWidgetRenderer
                  widget={previewWidget}
                  clientShortName={clientShortName}
                />
              </div>
              <div className="text-sm text-gray-600">
                <p><strong>Plugin:</strong> {previewWidget.pluginName}</p>
                <p><strong>Display Type:</strong> {previewWidget.displayType}</p>
                <p><strong>Refresh Interval:</strong> {previewWidget.refreshInterval}s</p>
                <p><strong>Status:</strong> {previewWidget.enabled ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}; 