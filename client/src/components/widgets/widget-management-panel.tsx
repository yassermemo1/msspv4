import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Eye, 
  Settings, 
  Search,
  Filter,
  BarChart3,
  Table,
  Gauge,
  PieChart,
  List,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { DynamicWidgetBuilder } from './dynamic-widget-builder';
import { DynamicWidgetRenderer } from './dynamic-widget-renderer';
import { 
  getUserCustomWidgets, 
  createCustomWidget, 
  updateCustomWidget, 
  deleteCustomWidget,
  type CustomWidget as DBCustomWidget
} from '@/lib/user-preferences';

interface CustomWidget {
  id?: string;
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
  createdAt?: string;
  updatedAt?: string;
}

interface WidgetManagementPanelProps {
  placement?: 'client-details' | 'global-dashboard' | 'custom';
  onWidgetSelect?: (widget: CustomWidget) => void;
}

export const WidgetManagementPanel: React.FC<WidgetManagementPanelProps> = ({
  placement = 'client-details',
  onWidgetSelect
}) => {
  const [widgets, setWidgets] = useState<CustomWidget[]>([]);
  const [filteredWidgets, setFilteredWidgets] = useState<CustomWidget[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlacement, setFilterPlacement] = useState<string>('all');
  const [filterDisplayType, setFilterDisplayType] = useState<'all' | 'table' | 'chart' | 'metric' | 'list' | 'gauge' | 'query'>('all');
  
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWidget, setEditingWidget] = useState<CustomWidget | undefined>();
  const [previewWidget, setPreviewWidget] = useState<CustomWidget | undefined>();
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadWidgets();
  }, []);

  useEffect(() => {
    filterWidgets();
  }, [widgets, searchTerm, filterPlacement, filterDisplayType]);

  const loadWidgets = async () => {
    try {
      setLoading(true);
      const dbWidgets = await getUserCustomWidgets(placement);
      // Convert DB widgets to local widget format
      const localWidgets: CustomWidget[] = dbWidgets.map(w => ({
        id: w.id.toString(),
        name: w.name,
        description: w.description || '',
        pluginName: w.pluginName,
        instanceId: w.instanceId,
        queryType: w.queryType as 'default' | 'custom',
        queryId: w.queryId,
        customQuery: w.customQuery,
        queryMethod: w.queryMethod,
        queryParameters: w.queryParameters,
        displayType: w.displayType as 'table' | 'chart' | 'metric' | 'list' | 'gauge',
        chartType: w.chartType as 'bar' | 'line' | 'pie' | 'area' | undefined,
        refreshInterval: w.refreshInterval,
        placement: w.placement as 'client-details' | 'global-dashboard' | 'custom',
        styling: w.styling as any,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt
      }));
      setWidgets(localWidgets);
    } catch (error) {
      console.error('Failed to load widgets:', error);
      // Fallback to localStorage for existing widgets
      const savedWidgets = localStorage.getItem('customWidgets');
      if (savedWidgets) {
        setWidgets(JSON.parse(savedWidgets));
      }
    } finally {
      setLoading(false);
    }
  };

  const saveWidget = async (widget: CustomWidget) => {
    try {
      let savedWidget: DBCustomWidget;
      
      if (widget.id) {
        // Update existing widget
        savedWidget = await updateCustomWidget(parseInt(widget.id), {
          name: widget.name,
          description: widget.description,
          pluginName: widget.pluginName,
          instanceId: widget.instanceId,
          queryType: widget.queryType,
          queryId: widget.queryId,
          customQuery: widget.customQuery,
          queryMethod: widget.queryMethod,
          queryParameters: widget.queryParameters,
          displayType: widget.displayType,
          chartType: widget.chartType,
          refreshInterval: widget.refreshInterval,
          placement: widget.placement,
          styling: widget.styling
        });
      } else {
        // Create new widget
        savedWidget = await createCustomWidget({
          name: widget.name,
          description: widget.description,
          pluginName: widget.pluginName,
          instanceId: widget.instanceId,
          queryType: widget.queryType,
          queryId: widget.queryId,
          customQuery: widget.customQuery,
          queryMethod: widget.queryMethod,
          queryParameters: widget.queryParameters,
          displayType: widget.displayType,
          chartType: widget.chartType,
          refreshInterval: widget.refreshInterval,
          placement: widget.placement,
          styling: widget.styling,
          isActive: true
        });
      }

      // Reload widgets from database
      await loadWidgets();
      
      setShowBuilder(false);
      setEditingWidget(undefined);
    } catch (error) {
      console.error('Failed to save widget:', error);
      alert('Failed to save widget');
    }
  };

  const deleteWidget = async (widgetId: string) => {
    if (!confirm('Are you sure you want to delete this widget?')) {
      return;
    }

    try {
      await deleteCustomWidget(parseInt(widgetId));
      // Reload widgets from database
      await loadWidgets();
    } catch (error) {
      console.error('Failed to delete widget:', error);
      alert('Failed to delete widget');
    }
  };

  const duplicateWidget = (widget: CustomWidget) => {
    const duplicatedWidget = {
      ...widget,
      id: undefined,
      name: `${widget.name} (Copy)`,
      createdAt: undefined,
      updatedAt: undefined
    };
    setEditingWidget(duplicatedWidget);
    setShowBuilder(true);
  };

  const filterWidgets = () => {
    let filtered = widgets;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(widget =>
        widget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        widget.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        widget.pluginName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Placement filter
    if (filterPlacement !== 'all') {
      filtered = filtered.filter(widget => widget.placement === filterPlacement);
    }

    // Display type filter
    if (filterDisplayType !== 'all') {
      filtered = filtered.filter(widget => widget.displayType === filterDisplayType);
    }

    setFilteredWidgets(filtered);
  };

  const getDisplayTypeIcon = (type: string) => {
    switch (type) {
      case 'table': return <Table className="h-4 w-4" />;
      case 'chart': return <BarChart3 className="h-4 w-4" />;
      case 'metric': return <Gauge className="h-4 w-4" />;
      case 'list': return <List className="h-4 w-4" />;
      case 'gauge': return <PieChart className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getPlacementColor = (placement: string) => {
    switch (placement) {
      case 'client-details': return 'bg-blue-100 text-blue-800';
      case 'global-dashboard': return 'bg-green-100 text-green-800';
      case 'custom': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Widget Management</h2>
          <p className="text-gray-600">Create and manage custom widgets for your dashboards</p>
        </div>
        <Button onClick={() => setShowBuilder(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Widget
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search widgets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <select
                value={filterPlacement}
                onChange={(e) => setFilterPlacement(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="all">All Placements</option>
                <option value="client-details">Client Details</option>
                <option value="global-dashboard">Global Dashboard</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <select
                value={filterDisplayType}
                onChange={(e) => setFilterDisplayType(e.target.value as any)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="table">Table</option>
                <option value="chart">Chart</option>
                <option value="metric">Metric</option>
                <option value="list">List</option>
                <option value="gauge">Gauge</option>
                <option value="query">Query</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Widget Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading widgets...</span>
        </div>
      ) : filteredWidgets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No widgets found</h3>
            <p className="text-gray-600 mb-4">
              {widgets.length === 0 
                ? "Get started by creating your first custom widget"
                : "Try adjusting your search or filter criteria"
              }
            </p>
            <Button onClick={() => setShowBuilder(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Widget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWidgets.map((widget) => (
            <Card key={widget.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {getDisplayTypeIcon(widget.displayType)}
                    <CardTitle className="text-lg">{widget.name}</CardTitle>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPreviewWidget(widget);
                        setShowPreview(true);
                      }}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteWidget(widget.id!)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">{widget.description}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Plugin:</span>
                    <Badge variant="outline">{widget.pluginName}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Placement:</span>
                    <Badge className={getPlacementColor(widget.placement)}>
                      {widget.placement.replace('-', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Refresh:</span>
                    <span>{widget.refreshInterval}s</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Query Type:</span>
                    <Badge variant={widget.queryType === 'custom' ? 'default' : 'secondary'}>
                      {widget.queryType}
                    </Badge>
                  </div>
                </div>

                {onWidgetSelect && (
                  <Button
                    className="w-full mt-4"
                    variant="outline"
                    onClick={() => onWidgetSelect(widget)}
                  >
                    Select Widget
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Widget Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={(open) => {
        setShowBuilder(open);
        if (!open) setEditingWidget(undefined);
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWidget?.id ? 'Edit Widget' : 'Create New Widget'}
            </DialogTitle>
          </DialogHeader>
          <DynamicWidgetBuilder
            onSave={saveWidget}
            onCancel={() => {
              setShowBuilder(false);
              setEditingWidget(undefined);
            }}
            editingWidget={editingWidget}
            placement={placement}
          />
        </DialogContent>
      </Dialog>

      {/* Widget Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Widget Preview: {previewWidget?.name}</DialogTitle>
          </DialogHeader>
          {previewWidget && (
            <div className="mt-4">
              <DynamicWidgetRenderer
                widget={previewWidget}
                className="w-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}; 