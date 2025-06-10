import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Settings, 
  BarChart3, 
  Table, 
  TrendingUp, 
  PieChart, 
  Eye, 
  EyeOff,
  Edit,
  Copy,
  Save,
  Layout,
  Zap,
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { apiRequest } from '../../lib/api';
import { ExternalWidgetCard } from './external-widget-card';

interface ExternalSystem {
  id: number;
  systemName: string;
  displayName: string;
  systemType: string;
  baseUrl: string;
  authType: string;
  queryMethods?: Record<string, any>;
  isActive: boolean;
}

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
  position: number;
}

interface DashboardLayout {
  id: string;
  widgetId: number;
  position: { x: number; y: number; w: number; h: number };
  visible: boolean;
}

interface SortableWidgetItemProps {
  widget: ExternalWidgetTemplate;
  onEdit: (widget: ExternalWidgetTemplate) => void;
  onDelete: (widgetId: number) => void;
  onToggleVisibility: (widgetId: number) => void;
  onDuplicate: (widget: ExternalWidgetTemplate) => void;
}

function SortableWidgetItem({ widget, onEdit, onDelete, onToggleVisibility, onDuplicate }: SortableWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getWidgetTypeIcon = (type: string, chartType?: string) => {
    switch (type) {
      case 'metric':
      case 'gauge':
        return TrendingUp;
      case 'table':
        return Table;
      case 'chart':
        return chartType === 'pie' ? PieChart : BarChart3;
      default:
        return BarChart3;
    }
  };

  const WidgetIcon = getWidgetTypeIcon(widget.widgetType, widget.chartType);

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`transition-all duration-200 hover:shadow-md ${
        widget.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div 
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            
            <WidgetIcon className={`w-5 h-5 flex-shrink-0 ${
              widget.isActive ? 'text-green-600' : 'text-gray-400'
            }`} />
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{widget.name}</h4>
              <p className="text-xs text-muted-foreground truncate">
                {widget.description || 'No description'}
              </p>
              <div className="flex items-center mt-1 space-x-2">
                <Badge variant="outline" className="text-xs">
                  {widget.widgetType}
                </Badge>
                {widget.chartType && (
                  <Badge variant="secondary" className="text-xs">
                    {widget.chartType}
                  </Badge>
                )}
                {widget.cacheEnabled && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {widget.refreshInterval}s
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleVisibility(widget.id)}
              className="h-8 w-8 p-0"
            >
              {widget.isActive ? 
                <Eye className="w-4 h-4 text-green-600" /> : 
                <EyeOff className="w-4 h-4 text-gray-400" />
              }
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDuplicate(widget)}
              className="h-8 w-8 p-0"
            >
              <Copy className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(widget)}
              className="h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(widget.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface WidgetBuilderProps {
  onClose?: () => void;
}

export function WidgetBuilder({ onClose }: WidgetBuilderProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('widgets');
  const [widgets, setWidgets] = useState<ExternalWidgetTemplate[]>([]);
  const [systems, setSystems] = useState<ExternalSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateWidget, setShowCreateWidget] = useState(false);
  const [editingWidget, setEditingWidget] = useState<ExternalWidgetTemplate | null>(null);
  
  // Form state for widget creation/editing
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemId: 0,
    widgetType: 'chart' as const,
    chartType: 'bar' as const,
    query: '',
    method: '',
    parameters: '{}',
    transformations: '[]',
    displayConfig: '{}',
    refreshInterval: 300,
    cacheEnabled: true,
    isActive: true,
    isPublic: false,
    tags: ''
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch widgets and systems
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [widgetsRes, systemsRes] = await Promise.all([
        apiRequest('GET', '/api/external-widgets'),
        apiRequest('GET', '/api/external-systems')
      ]);

      const [widgetsData, systemsData] = await Promise.all([
        widgetsRes.json(),
        systemsRes.json()
      ]);

      setWidgets(widgetsData.sort((a: any, b: any) => a.position - b.position));
      setSystems(systemsData.filter((s: any) => s.isActive));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load widgets and systems",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = widgets.findIndex((item) => item.id === active.id);
      const newIndex = widgets.findIndex((item) => item.id === over.id);

      const newWidgets = arrayMove(widgets, oldIndex, newIndex);
      setWidgets(newWidgets);

      // Update positions on server
      try {
        await Promise.all(
          newWidgets.map((widget, index) =>
            apiRequest('PUT', `/api/external-widgets/${widget.id}`, {
              position: index
            })
          )
        );
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update widget order",
          variant: "destructive"
        });
        // Revert on error
        fetchData();
      }
    }
  };

  const handleCreateWidget = async () => {
    try {
      // Validate form data
      if (!formData.name || !formData.systemId || !formData.query) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      // Parse JSON fields
      let parameters, transformations, displayConfig;
      try {
        parameters = JSON.parse(formData.parameters);
        transformations = JSON.parse(formData.transformations);
        displayConfig = JSON.parse(formData.displayConfig);
      } catch (error) {
        toast({
          title: "JSON Error",
          description: "Invalid JSON in parameters, transformations, or display config",
          variant: "destructive"
        });
        return;
      }

      const widgetData = {
        ...formData,
        parameters,
        transformations,
        displayConfig,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        position: widgets.length
      };

      const response = await apiRequest('POST', '/api/external-widgets', widgetData);
      const newWidget = await response.json();

      setWidgets([...widgets, newWidget]);
      setShowCreateWidget(false);
      resetForm();

      toast({
        title: "Success",
        description: "Widget created successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create widget",
        variant: "destructive"
      });
    }
  };

  const handleUpdateWidget = async () => {
    if (!editingWidget) return;

    try {
      // Parse JSON fields
      let parameters, transformations, displayConfig;
      try {
        parameters = JSON.parse(formData.parameters);
        transformations = JSON.parse(formData.transformations);
        displayConfig = JSON.parse(formData.displayConfig);
      } catch (error) {
        toast({
          title: "JSON Error",
          description: "Invalid JSON in parameters, transformations, or display config",
          variant: "destructive"
        });
        return;
      }

      const widgetData = {
        ...formData,
        parameters,
        transformations,
        displayConfig,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
      };

      const response = await apiRequest('PUT', `/api/external-widgets/${editingWidget.id}`, widgetData);
      const updatedWidget = await response.json();

      setWidgets(widgets.map(w => w.id === editingWidget.id ? updatedWidget : w));
      setEditingWidget(null);
      resetForm();

      toast({
        title: "Success",
        description: "Widget updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update widget",
        variant: "destructive"
      });
    }
  };

  const handleDeleteWidget = async (widgetId: number) => {
    try {
      await apiRequest('DELETE', `/api/external-widgets/${widgetId}`);
      setWidgets(widgets.filter(w => w.id !== widgetId));

      toast({
        title: "Success",
        description: "Widget deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete widget",
        variant: "destructive"
      });
    }
  };

  const handleToggleVisibility = async (widgetId: number) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;

    try {
      const response = await apiRequest('PUT', `/api/external-widgets/${widgetId}`, {
        isActive: !widget.isActive
      });
      const updatedWidget = await response.json();

      setWidgets(widgets.map(w => w.id === widgetId ? updatedWidget : w));

      toast({
        title: "Success",
        description: `Widget ${updatedWidget.isActive ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update widget visibility",
        variant: "destructive"
      });
    }
  };

  const handleDuplicate = (widget: ExternalWidgetTemplate) => {
    setFormData({
      name: `${widget.name} (Copy)`,
      description: widget.description || '',
      systemId: widget.systemId,
      widgetType: widget.widgetType,
      chartType: widget.chartType || 'bar',
      query: widget.query,
      method: widget.method || '',
      parameters: JSON.stringify(widget.parameters, null, 2),
      transformations: JSON.stringify(widget.transformations || [], null, 2),
      displayConfig: JSON.stringify(widget.displayConfig, null, 2),
      refreshInterval: widget.refreshInterval,
      cacheEnabled: widget.cacheEnabled,
      isActive: widget.isActive,
      isPublic: widget.isPublic,
      tags: (widget.tags || []).join(', ')
    });
    setShowCreateWidget(true);
  };

  const handleEdit = (widget: ExternalWidgetTemplate) => {
    setEditingWidget(widget);
    setFormData({
      name: widget.name,
      description: widget.description || '',
      systemId: widget.systemId || 0,
      widgetType: widget.widgetType,
      chartType: widget.chartType || 'bar',
      query: widget.query,
      method: widget.method || '',
      parameters: JSON.stringify(widget.parameters, null, 2),
      transformations: JSON.stringify(widget.transformations || [], null, 2),
      displayConfig: JSON.stringify(widget.displayConfig, null, 2),
      refreshInterval: widget.refreshInterval,
      cacheEnabled: widget.cacheEnabled,
      isActive: widget.isActive,
      isPublic: widget.isPublic,
      tags: (widget.tags || []).join(', ')
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      systemId: 0,
      widgetType: 'chart',
      chartType: 'bar',
      query: '',
      method: '',
      parameters: '{}',
      transformations: '[]',
      displayConfig: '{}',
      refreshInterval: 300,
      cacheEnabled: true,
      isActive: true,
      isPublic: false,
      tags: ''
    });
  };

  const getSelectedSystem = () => {
    return systems.find(s => s.id === formData.systemId);
  };

  const renderWidgetForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Widget Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Jira Open Issues"
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Widget description"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="system">External System *</Label>
          <Select value={formData.systemId > 0 ? formData.systemId.toString() : ""} onValueChange={(value) => setFormData({ ...formData, systemId: parseInt(value) })}>
            <SelectTrigger>
              <SelectValue placeholder="Select system" />
            </SelectTrigger>
            <SelectContent>
              {systems.map((system) => (
                <SelectItem key={system.id} value={system.id.toString()}>
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4" />
                    <span>{system.displayName}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="widgetType">Widget Type *</Label>
          <Select value={formData.widgetType} onValueChange={(value: any) => setFormData({ ...formData, widgetType: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chart">Chart</SelectItem>
              <SelectItem value="table">Table</SelectItem>
              <SelectItem value="metric">Metric</SelectItem>
              <SelectItem value="gauge">Gauge</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {formData.widgetType === 'chart' && (
          <div>
            <Label htmlFor="chartType">Chart Type *</Label>
            <Select value={formData.chartType} onValueChange={(value: any) => setFormData({ ...formData, chartType: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="pie">Pie Chart</SelectItem>
                <SelectItem value="area">Area Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {getSelectedSystem()?.queryMethods && (
        <div>
          <Label htmlFor="method">Query Method</Label>
          <Select value={formData.method || ""} onValueChange={(value) => setFormData({ ...formData, method: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select method (optional)" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(getSelectedSystem()?.queryMethods || {}).map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="query">Query *</Label>
        <Textarea
          id="query"
          value={formData.query}
          onChange={(e) => setFormData({ ...formData, query: e.target.value })}
          placeholder="Enter your query here..."
          rows={6}
          className="font-mono"
        />
        <p className="text-sm text-muted-foreground mt-1">
          Write the query that will be executed on the selected external system
        </p>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
              <Input
                id="refreshInterval"
                type="number"
                value={formData.refreshInterval}
                onChange={(e) => setFormData({ ...formData, refreshInterval: parseInt(e.target.value) })}
                min="30"
                max="3600"
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="dashboard, monitoring, alerts"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="cacheEnabled"
                checked={formData.cacheEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, cacheEnabled: checked })}
              />
              <Label htmlFor="cacheEnabled">Enable Caching</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isPublic"
                checked={formData.isPublic}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
              />
              <Label htmlFor="isPublic">Public</Label>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-4">
          <div>
            <Label htmlFor="parameters">Parameters (JSON)</Label>
            <Textarea
              id="parameters"
              value={formData.parameters}
              onChange={(e) => setFormData({ ...formData, parameters: e.target.value })}
              placeholder='{"param1": "value1", "param2": "value2"}'
              rows={4}
              className="font-mono text-sm"
            />
          </div>
          <div>
            <Label htmlFor="transformations">Transformations (JSON Array)</Label>
            <Textarea
              id="transformations"
              value={formData.transformations}
              onChange={(e) => setFormData({ ...formData, transformations: e.target.value })}
              placeholder='["transformation1", "transformation2"]'
              rows={3}
              className="font-mono text-sm"
            />
          </div>
        </TabsContent>
        
        <TabsContent value="display" className="space-y-4">
          <div>
            <Label htmlFor="displayConfig">Display Configuration (JSON)</Label>
            <Textarea
              id="displayConfig"
              value={formData.displayConfig}
              onChange={(e) => setFormData({ ...formData, displayConfig: e.target.value })}
              placeholder='{"xAxis": "name", "yAxis": "value", "color": "#8884d8"}'
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Configure chart axes, colors, formatting, and other display options
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading widget builder...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Widget Builder</h2>
          <p className="text-muted-foreground">
            Create and manage custom widgets from external systems
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="widgets" className="flex items-center space-x-2">
            <Layout className="w-4 h-4" />
            <span>Widgets ({widgets.length})</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center space-x-2">
            <Eye className="w-4 h-4" />
            <span>Preview</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="widgets" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {widgets.filter(w => w.isActive).length} active
              </Badge>
              <Badge variant="secondary">
                {widgets.filter(w => !w.isActive).length} inactive
              </Badge>
            </div>
            <Button onClick={() => setShowCreateWidget(true)} className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Create Widget</span>
            </Button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={widgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {widgets.map((widget) => (
                  <SortableWidgetItem
                    key={widget.id}
                    widget={widget}
                    onEdit={handleEdit}
                    onDelete={handleDeleteWidget}
                    onToggleVisibility={handleToggleVisibility}
                    onDuplicate={handleDuplicate}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {widgets.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="flex flex-col items-center space-y-4">
                  <Layout className="h-12 w-12 text-gray-400" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Widgets Yet
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Create your first widget to get started with dynamic dashboards
                    </p>
                    <Button onClick={() => setShowCreateWidget(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Widget
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <div className="text-center text-muted-foreground py-8">
            <h3 className="text-lg font-medium mb-2">Widget Preview</h3>
            <p>Preview of your active widgets as they appear on the dashboard</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {widgets
              .filter(w => w.isActive)
              .map((widget) => (
                <ExternalWidgetCard
                  key={widget.id}
                  template={widget}
                  compact={true}
                  className="border-dashed"
                />
              ))}
          </div>

          {widgets.filter(w => w.isActive).length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="flex flex-col items-center space-y-4">
                  <EyeOff className="h-12 w-12 text-gray-400" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Active Widgets
                    </h3>
                    <p className="text-gray-500">
                      Enable some widgets to see the preview
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Widget Modal */}
      <Dialog open={showCreateWidget || !!editingWidget} onOpenChange={(open) => {
        if (!open) {
          setShowCreateWidget(false);
          setEditingWidget(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWidget ? 'Edit Widget' : 'Create New Widget'}
            </DialogTitle>
            <DialogDescription>
              {editingWidget ? 
                'Update your widget configuration and settings' :
                'Configure your new dashboard widget with external system data'
              }
            </DialogDescription>
          </DialogHeader>
          
          {renderWidgetForm()}
          
          <div className="flex items-center justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateWidget(false);
                setEditingWidget(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingWidget ? handleUpdateWidget : handleCreateWidget}
              className="flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{editingWidget ? 'Update Widget' : 'Create Widget'}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 