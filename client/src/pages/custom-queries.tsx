import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/api';
import { CustomQueryWidget } from '@/components/external-widgets/custom-query-widget';
import { 
  Plus, 
  Play, 
  Save, 
  Edit, 
  Trash2, 
  Database, 
  Search,
  Settings,
  Clock,
  Tag,
  ExternalLink
} from 'lucide-react';

interface CustomQuery {
  id: number;
  name: string;
  description?: string;
  systemId: number;
  method?: string; // Query method to use
  query: string;
  parameters: any;
  transformations?: string[];
  dataMapping: any;
  refreshInterval: number;
  cacheEnabled: boolean;
  isActive: boolean;
  isPublic: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

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

// Query types are now dynamically loaded from system configurations

const WIDGET_TYPES = [
  { value: 'chart', label: 'Chart', description: 'Visualize data as charts' },
  { value: 'table', label: 'Table', description: 'Display data in tabular format' },
  { value: 'metric', label: 'Metric', description: 'Show single numeric value' },
  { value: 'list', label: 'List', description: 'Show items as a list' }
];

const CHART_TYPES = [
  { value: 'bar', label: 'Bar Chart' },
  { value: 'line', label: 'Line Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'area', label: 'Area Chart' }
];

export default function CustomQueriesPage() {
  const [queries, setQueries] = useState<CustomQuery[]>([]);
  const [systems, setSystems] = useState<ExternalSystem[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<CustomQuery | null>(null);
  const [editingQuery, setEditingQuery] = useState<Partial<CustomQuery>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Load data
  useEffect(() => {
    loadQueries();
    loadSystems();
  }, []);

  const loadQueries = async () => {
    try {
      const response = await apiRequest('GET', '/api/custom-queries');
      const queriesData = await response.json();
      setQueries(queriesData);
    } catch (error) {
      console.error('Failed to load queries:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystems = async () => {
    try {
      const response = await apiRequest('GET', '/api/custom-queries/systems');
      const systemsData = await response.json();
      setSystems(systemsData);
    } catch (error) {
      console.error('Failed to load systems:', error);
    }
  };

  const startCreating = () => {
    setIsCreating(true);
    setSelectedQuery(null);
    setEditingQuery({
      name: '',
      description: '',
      systemId: systems[0]?.id,
      method: '',
      query: '',
      parameters: {},
      transformations: [],
      dataMapping: {},
      refreshInterval: 300,
      cacheEnabled: true,
      isActive: true,
      isPublic: false,
      tags: []
    });
    setTestResult(null);
  };

  const startEditing = (query: CustomQuery) => {
    setIsCreating(false);
    setSelectedQuery(query);
    setEditingQuery({ ...query });
    setTestResult(null);
  };

  const cancelEditing = () => {
    setIsCreating(false);
    setSelectedQuery(null);
    setEditingQuery({});
    setTestResult(null);
  };

  const saveQuery = async () => {
    if (!editingQuery.name || !editingQuery.query || !editingQuery.systemId) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      if (isCreating) {
        const response = await apiRequest('POST', '/api/custom-queries', editingQuery);
        const newQuery = await response.json();
        setQueries([...queries, newQuery]);
      } else if (selectedQuery) {
        await apiRequest('PUT', `/api/custom-queries/${selectedQuery.id}`, editingQuery);
        const updatedQueries = queries.map(q => 
          q.id === selectedQuery.id ? { ...q, ...editingQuery } : q
        );
        setQueries(updatedQueries);
      }
      
      cancelEditing();
    } catch (error) {
      console.error('Failed to save query:', error);
      alert('Failed to save query');
    } finally {
      setSaving(false);
    }
  };

  const deleteQuery = async (queryId: number) => {
    if (!confirm('Are you sure you want to delete this query?')) return;

    try {
      await apiRequest('DELETE', `/api/custom-queries/${queryId}`);
      setQueries(queries.filter(q => q.id !== queryId));
      if (selectedQuery?.id === queryId) {
        cancelEditing();
      }
    } catch (error) {
      console.error('Failed to delete query:', error);
      alert('Failed to delete query');
    }
  };

  const testQuery = async () => {
    if (!editingQuery.query || !editingQuery.systemId) {
      alert('Please provide query and select a system');
      return;
    }

    setTesting(true);
    try {
      const queryRequest = {
        systemId: editingQuery.systemId,
        query: editingQuery.query,
        method: editingQuery.method,
        parameters: editingQuery.parameters || {},
        transformations: editingQuery.transformations || [],
        timeout: 30000
      };

      const response = await apiRequest('POST', '/api/external-systems/query', queryRequest);
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      console.error('Query test failed:', error);
      setTestResult({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Failed to test query'
        }
      });
    } finally {
      setTesting(false);
    }
  };

  const getSelectedSystem = () => {
    return systems.find(s => s.id === editingQuery.systemId);
  };

  const getSystemName = (systemId: number) => {
    const system = systems.find(s => s.id === systemId);
    return system?.displayName || 'Unknown System';
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Custom Queries</h1>
          <p className="text-muted-foreground">
            Create and manage custom queries for external systems
          </p>
        </div>
        <Button onClick={startCreating} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Query
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Query List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Queries ({queries.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {queries.map((query) => (
                  <div
                    key={query.id}
                    className={`p-3 cursor-pointer hover:bg-muted/50 border-l-4 ${
                      selectedQuery?.id === query.id ? 'border-primary bg-muted' : 'border-transparent'
                    }`}
                    onClick={() => startEditing(query)}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate">{query.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {query.method?.toUpperCase() || 'DEFAULT'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {getSystemName(query.systemId)}
                    </p>
                    {query.tags && query.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {query.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {query.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{query.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {queries.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground">
                    <Database className="w-8 h-8 mx-auto mb-2" />
                    <p>No queries created yet</p>
                    <Button variant="link" onClick={startCreating} className="mt-2">
                      Create your first query
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Query Editor/Details */}
        <div className="lg:col-span-2">
          {(isCreating || selectedQuery) ? (
            <Tabs defaultValue="editor" className="space-y-4">
              <TabsList>
                <TabsTrigger value="editor">Query Editor</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="editor">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{isCreating ? 'Create New Query' : 'Edit Query'}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={testQuery}
                          disabled={testing}
                          className="flex items-center gap-2"
                        >
                          <Play className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                          Test
                        </Button>
                        <Button
                          onClick={saveQuery}
                          disabled={saving}
                          className="flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </Button>
                        <Button variant="ghost" onClick={cancelEditing}>
                          Cancel
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Query Name *</Label>
                        <Input
                          id="name"
                          value={editingQuery.name || ''}
                          onChange={(e) => setEditingQuery({ ...editingQuery, name: e.target.value })}
                          placeholder="Enter query name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="system">External System *</Label>
                        <Select
                          value={editingQuery.systemId?.toString()}
                          onValueChange={(value) => setEditingQuery({ ...editingQuery, systemId: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select system" />
                          </SelectTrigger>
                          <SelectContent>
                            {systems.map((system) => (
                              <SelectItem key={system.id} value={system.id.toString()}>
                                {system.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={editingQuery.description || ''}
                        onChange={(e) => setEditingQuery({ ...editingQuery, description: e.target.value })}
                        placeholder="Optional description"
                      />
                    </div>

                    {getSelectedSystem()?.queryMethods && (
                      <div>
                        <Label htmlFor="method">Query Method</Label>
                        <Select
                          value={editingQuery.method || ''}
                          onValueChange={(value) => setEditingQuery({ 
                            ...editingQuery, 
                            method: value
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select query method" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(getSelectedSystem()?.queryMethods || {}).map(([method, config]) => (
                              <SelectItem key={method} value={method}>
                                {method} ({(config as any).type})
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
                        value={editingQuery.query || ''}
                        onChange={(e) => setEditingQuery({ ...editingQuery, query: e.target.value })}
                        placeholder={`Enter your query here... (Method: ${editingQuery.method || 'default'})`}
                        rows={8}
                        className="font-mono"
                      />
                      {getSelectedSystem() && (
                        <p className="text-sm text-muted-foreground mt-1">
                          System: {getSelectedSystem()?.displayName} ({getSelectedSystem()?.systemType})
                        </p>
                      )}
                    </div>

                    {/* Test Results */}
                    {testResult && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">Test Results</h4>
                        {testResult.success ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>✅ Success</span>
                              <span>⏱️ {testResult.metadata?.executionTime || 0}ms</span>
                              <span>📊 {testResult.metadata?.recordCount || 0} records</span>
                              <span>🔧 {testResult.metadata?.method || 'default'}</span>
                            </div>
                            <div className="bg-muted p-3 rounded text-sm">
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(testResult.data, null, 2).slice(0, 500)}
                                {JSON.stringify(testResult.data, null, 2).length > 500 && '...'}
                              </pre>
                            </div>
                          </div>
                        ) : (
                          <div className="text-destructive">
                            <span>❌ Error: {testResult.error?.message || 'Unknown error'}</span>
                            {testResult.error?.code && (
                              <div className="text-sm mt-1">Code: {testResult.error.code}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preview">
                <Card>
                  <CardHeader>
                    <CardTitle>Widget Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedQuery ? (
                      <CustomQueryWidget
                        queryId={selectedQuery.id}
                        widgetConfig={{
                          type: 'chart',
                          chartType: 'bar',
                          showRefresh: true,
                          size: 'medium'
                        }}
                      />
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <p>Save the query first to see preview</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Query Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                        <Input
                          id="refreshInterval"
                          type="number"
                          value={editingQuery.refreshInterval || 300}
                          onChange={(e) => setEditingQuery({ 
                            ...editingQuery, 
                            refreshInterval: parseInt(e.target.value) || 300 
                          })}
                          min={30}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="cacheEnabled"
                          checked={editingQuery.cacheEnabled !== false}
                          onCheckedChange={(checked) => setEditingQuery({ 
                            ...editingQuery, 
                            cacheEnabled: checked 
                          })}
                        />
                        <Label htmlFor="cacheEnabled">Enable Caching</Label>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={editingQuery.isActive !== false}
                          onCheckedChange={(checked) => setEditingQuery({ 
                            ...editingQuery, 
                            isActive: checked 
                          })}
                        />
                        <Label htmlFor="isActive">Active</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isPublic"
                          checked={editingQuery.isPublic === true}
                          onCheckedChange={(checked) => setEditingQuery({ 
                            ...editingQuery, 
                            isPublic: checked 
                          })}
                        />
                        <Label htmlFor="isPublic">Public (other users can use)</Label>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        value={editingQuery.tags?.join(', ') || ''}
                        onChange={(e) => setEditingQuery({ 
                          ...editingQuery, 
                          tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                        })}
                        placeholder="monitoring, jira, reports"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Query Selected</h3>
                  <p>Select a query from the list to edit, or create a new one.</p>
                  <Button variant="outline" onClick={startCreating} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Query
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 