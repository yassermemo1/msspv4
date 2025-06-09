import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  ExternalLink,
  Code,
  BarChart,
  Table,
  Activity,
  Shield,
  Users,
  Settings,
  Loader2
} from 'lucide-react';

export default function IntegrationEngine() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'chart',
    dataSource: '',
    category: 'custom',
    tags: ''
  });

  // Load widgets from Integration Engine
  const loadWidgets = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5003/integration-engine/api/widgets');
      if (response.ok) {
        const data = await response.json();
        setWidgets(data);
      }
    } catch (error) {
      console.error('Failed to load widgets:', error);
      toast({
        title: "Error",
        description: "Failed to load widgets from Integration Engine",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWidgets();
  }, []);

  // Create new widget
  const handleCreateWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:5003/integration-engine/api/widgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        })
      });

      if (response.ok) {
        const newWidget = await response.json();
        toast({
          title: "Widget Created",
          description: `${newWidget.name} has been created successfully`,
        });
        setWidgets([...widgets, newWidget]);
        setShowCreateForm(false);
        setFormData({
          name: '',
          description: '',
          type: 'chart',
          dataSource: '',
          category: 'custom',
          tags: ''
        });
      } else {
        throw new Error('Failed to create widget');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create widget",
        variant: "destructive"
      });
    }
  };

  // Delete widget
  const handleDeleteWidget = async (widgetId: string) => {
    try {
      const response = await fetch(`http://localhost:5003/integration-engine/api/widgets/${widgetId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Widget Deleted",
          description: "Widget has been deleted successfully",
        });
        setWidgets(widgets.filter(w => w.id !== widgetId));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete widget",
        variant: "destructive"
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'chart': return <BarChart className="h-4 w-4" />;
      case 'table': return <Table className="h-4 w-4" />;
      case 'metric': return <Activity className="h-4 w-4" />;
      case 'dashboard': return <Settings className="h-4 w-4" />;
      default: return <Code className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security': return <Shield className="h-4 w-4" />;
      case 'users': return <Users className="h-4 w-4" />;
      case 'analytics': return <BarChart className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Integration Engine</h1>
          <p className="text-muted-foreground">Create and manage external widgets</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadWidgets} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Widget
          </Button>
        </div>
      </div>

      {/* Create Widget Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Widget</CardTitle>
            <CardDescription>Define a new widget for external data integration</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateWidget} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Widget Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="My Custom Widget"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Widget Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => setFormData({...formData, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chart">Chart</SelectItem>
                      <SelectItem value="table">Table</SelectItem>
                      <SelectItem value="metric">Metric</SelectItem>
                      <SelectItem value="dashboard">Dashboard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe what this widget does..."
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataSource">Data Source URL</Label>
                  <Input
                    id="dataSource"
                    value={formData.dataSource}
                    onChange={(e) => setFormData({...formData, dataSource: e.target.value})}
                    placeholder="https://api.example.com/data"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analytics">Analytics</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="users">Users</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  placeholder="api, external, realtime"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Widget
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Widgets List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Widgets</CardTitle>
          <CardDescription>
            {widgets.length} widget{widgets.length !== 1 ? 's' : ''} available for integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : widgets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No widgets created yet. Click "Create Widget" to get started.
            </div>
          ) : (
            <div className="grid gap-4">
              {widgets.map((widget) => (
                <Card key={widget.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(widget.type)}
                          <h3 className="font-semibold">{widget.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {widget.type}
                          </Badge>
                          {widget.metadata?.featured && (
                            <Badge className="text-xs">Featured</Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {widget.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            {getCategoryIcon(widget.metadata?.category || 'custom')}
                            <span>{widget.metadata?.category || 'custom'}</span>
                          </div>
                          <div>
                            <span className="font-mono">{widget.dataSource}</span>
                          </div>
                          {widget.metadata?.version && (
                            <div>v{widget.metadata.version}</div>
                          )}
                        </div>

                        {widget.metadata?.tags && widget.metadata.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {widget.metadata.tags.map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`http://localhost:5003/integration-engine/widgets/${widget.id}`, '_blank')}
                          title="Preview widget"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWidget(widget.id)}
                          title="Delete widget"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use Widgets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">1. Create a Widget</h4>
            <p className="text-sm text-muted-foreground">
              Use the form above to create a new widget. Specify the data source URL where your external data is available.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">2. Import to Dashboard</h4>
            <p className="text-sm text-muted-foreground">
              Go to Dashboard → Customize → Discover Widgets to import your created widgets into your dashboard.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">3. Configure Data Source</h4>
            <p className="text-sm text-muted-foreground">
              Widgets can fetch data from any REST API endpoint. Use JSONPlaceholder for testing: 
              <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">https://jsonplaceholder.typicode.com/users</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 