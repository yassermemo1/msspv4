import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  EyeOff, 
  Edit, 
  Trash2, 
  Copy, 
  Globe, 
  Power,
  PowerOff,
  BarChart3,
  Table,
  Gauge,
  List,
  AlertCircle,
  RefreshCw,
  Settings
} from 'lucide-react';
import { DynamicWidgetBuilder } from './dynamic-widget-builder';
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

interface GlobalWidgetManagerProps {
  onClose?: () => void;
}

export const GlobalWidgetManager: React.FC<GlobalWidgetManagerProps> = ({ onClose }) => {
  const [widgets, setWidgets] = useState<GlobalWidget[]>([]);
  const [filteredWidgets, setFilteredWidgets] = useState<GlobalWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGlobal, setFilterGlobal] = useState<'all' | 'global' | 'local'>('all');
  const [filterType, setFilterType] = useState<'all' | 'table' | 'chart' | 'metric' | 'list' | 'gauge'>('all');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWidget, setEditingWidget] = useState<GlobalWidget | undefined>();
  const [previewWidget, setPreviewWidget] = useState<GlobalWidget | undefined>();

  useEffect(() => {
    loadWidgets();
  }, []);

  useEffect(() => {
    filterWidgets();
  }, [widgets, searchTerm, filterGlobal, filterType]);

  const loadWidgets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all widgets for management
      const response = await fetch('/api/widgets/manage', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load widgets: ${response.statusText}`);
      }
      
      const allWidgets = await response.json();
      setWidgets(allWidgets);
    } catch (error) {
      console.error('Failed to load widgets:', error);
      setError(error instanceof Error ? error.message : 'Failed to load widgets');
    } finally {
      setLoading(false);
    }
  };

  const filterWidgets = () => {
    let filtered = widgets;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(widget =>
        widget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        widget.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        widget.pluginName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply global filter
    if (filterGlobal !== 'all') {
      filtered = filtered.filter(widget =>
        filterGlobal === 'global' ? widget.isGlobal : !widget.isGlobal
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(widget => widget.widgetType === filterType);
    }

    setFilteredWidgets(filtered);
  };

  const handleCreateWidget = () => {
    setEditingWidget(undefined);
    setShowBuilder(true);
  };

  const handleEditWidget = (widget: GlobalWidget) => {
    setEditingWidget(widget);
    setShowBuilder(true);
  };

  const handleSaveWidget = async (widget: Partial<GlobalWidget>) => {
    const url = editingWidget 
      ? `/api/widgets/manage/${editingWidget.id}`
      : '/api/widgets/manage';
    
    const method = editingWidget ? 'PUT' : 'POST';
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(widget)
      });

      if (!response.ok) {
        throw new Error(`Failed to save widget: ${response.statusText}`);
      }

      await loadWidgets(); // Reload widgets
      setEditingWidget(null);
      setShowBuilder(false);
    } catch (error) {
      console.error('Failed to save widget:', error);
      alert(`Failed to save widget: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleToggleGlobal = async (widgetId: string) => {
    try {
      const response = await fetch(`/api/widgets/manage/${widgetId}/toggle-global`, {
        method: 'PATCH',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to toggle global status: ${response.statusText}`);
      }
      
      await loadWidgets(); // Reload widgets
    } catch (error) {
      console.error('Failed to toggle global status:', error);
      alert(`Failed to toggle global status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!confirm('Are you sure you want to delete this widget?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/widgets/manage/${widgetId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete widget: ${response.statusText}`);
      }
      
      await loadWidgets(); // Reload widgets
    } catch (error) {
      console.error('Failed to delete widget:', error);
      alert(`Failed to delete widget: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDuplicateWidget = (widget: GlobalWidget) => {
    const duplicatedWidget = { ...widget };
    // Remove properties that should be auto-generated
    const { id, createdAt, updatedAt, createdBy, ...widgetData } = duplicatedWidget;
    
    setEditingWidget({
      ...widgetData,
      name: `${widget.name} (Copy)`,
      // Add required properties for CustomWidget compatibility
      instanceId: widget.pluginName || '',
      queryType: 'custom' as const,
      queryMethod: 'GET',
      queryParameters: {},
      customQuery: '',
      transformations: [],
      variables: []
    });
    setShowBuilder(true);
  };

  const getStatusIcon = (widget: GlobalWidget) => {
    if (widget.isGlobal && widget.isActive) {
      return <Power className="h-4 w-4 text-green-600" />;
    } else if (widget.isGlobal && !widget.isActive) {
      return <PowerOff className="h-4 w-4 text-orange-600" />;
    } else if (!widget.isGlobal && widget.isActive) {
      return <Eye className="h-4 w-4 text-blue-600" />;
    } else {
      return <EyeOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (widget: GlobalWidget) => {
    if (widget.isGlobal && widget.isActive) {
      return 'Global & Active';
    } else if (widget.isGlobal && !widget.isActive) {
      return 'Global & Inactive';
    } else if (!widget.isGlobal && widget.isActive) {
      return 'Local & Active';
    } else {
      return 'Local & Inactive';
    }
  };

  const handleCloseBuilder = () => {
    setShowBuilder(false);
    setEditingWidget(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading widgets...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Error:</strong> {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={loadWidgets}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Global Widget Manager</h2>
          <p className="text-muted-foreground">
            Create and manage widgets that can be deployed globally to all client pages
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCreateWidget}>
            <Plus className="h-4 w-4 mr-2" />
            Create Widget
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search widgets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterGlobal} onValueChange={(value: any) => setFilterGlobal(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Widgets</SelectItem>
                  <SelectItem value="global">Global Only</SelectItem>
                  <SelectItem value="local">Local Only</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                  <SelectItem value="chart">Chart</SelectItem>
                  <SelectItem value="metric">Metric</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="gauge">Gauge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>{filteredWidgets.length} widgets</span>
              <div className="flex items-center space-x-1">
                <Globe className="h-3 w-3" />
                <span>{widgets.filter(w => w.isGlobal).length} global</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Widgets Grid */}
      {filteredWidgets.length > 0 ? (
        <div className="grid gap-4">
          {filteredWidgets.map((widget) => (
            <Card key={widget.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusIcon(widget)}
                      <h3 className="font-semibold">{widget.name}</h3>
                      <Badge variant="outline">{widget.pluginName}</Badge>
                      <Badge variant="secondary">{widget.widgetType}</Badge>
                      {widget.isGlobal && (
                        <Badge className="bg-green-100 text-green-800">
                          <Globe className="h-3 w-3 mr-1" />
                          Global
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {widget.description || 'No description provided'}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>Status: {getStatusText(widget)}</span>
                      <span>Refresh: {widget.refreshInterval}s</span>
                      <span>Created: {new Date(widget.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <Label htmlFor={`global-${widget.id}`} className="text-xs">Global</Label>
                      <Switch
                        id={`global-${widget.id}`}
                        checked={widget.isGlobal}
                        onCheckedChange={() => handleToggleGlobal(widget.id)}
                      />
                    </div>
                    
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
                      onClick={() => handleEditWidget(widget)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicateWidget(widget)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteWidget(widget.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {widgets.length === 0 
                ? 'No widgets found' 
                : 'No widgets match your filters'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {widgets.length === 0 
                ? 'Create your first global widget to get started.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {widgets.length === 0 && (
              <Button onClick={handleCreateWidget}>
                <Plus className="h-4 w-4 mr-2" />
                Create Widget
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Widget Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWidget ? 'Edit Widget' : 'Create New Widget'}
            </DialogTitle>
          </DialogHeader>
          {showBuilder && (
            <DynamicWidgetBuilder
              onSave={handleSaveWidget}
              onCancel={handleCloseBuilder}
              editingWidget={editingWidget ? {
                ...editingWidget,
                instanceId: editingWidget.pluginName || '',
                queryType: 'custom' as const,
                queryMethod: 'GET',
                queryParameters: {},
                customQuery: '',
                transformations: [],
                variables: []
              } : undefined}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Widget Preview Dialog */}
      <Dialog open={!!previewWidget} onOpenChange={() => setPreviewWidget(undefined)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Widget Preview: {previewWidget?.name}</DialogTitle>
          </DialogHeader>
          {previewWidget && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{previewWidget.pluginName}</Badge>
                <Badge variant="secondary">{previewWidget.widgetType}</Badge>
                {previewWidget.isGlobal && (
                  <Badge className="bg-green-100 text-green-800">
                    <Globe className="h-3 w-3 mr-1" />
                    Global
                  </Badge>
                )}
              </div>
              
              <DynamicWidgetRenderer
                key={`${previewWidget.id}-demo`}
                widget={{
                  id: previewWidget.id,
                  name: previewWidget.name,
                  description: previewWidget.description,
                  pluginName: previewWidget.pluginName,
                  instanceId: previewWidget.pluginName || '',
                  queryType: 'custom' as const,
                  customQuery: previewWidget.query,
                  queryMethod: previewWidget.method,
                  queryParameters: previewWidget.parameters,
                  transformations: [],
                  variables: [],
                  enabled: previewWidget.isActive
                }}
                clientShortName="DEMO"
                clientDomain="demo.example.com"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}; 