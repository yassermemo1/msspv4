import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  TestTube, 
  Save, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Database,
  Code,
  History,
  Share,
  Trash2,
  Copy,
  RefreshCw,
  Zap,
  Settings
} from 'lucide-react';

interface Plugin {
  systemName: string;
  instanceCount: number;
  defaultQueries: number;
  refreshInterval: number;
  rateLimiting: any;
}

interface PluginInstance {
  id: string;
  name: string;
  baseUrl: string;
  authType: string;
  tags: string[];
  isActive: boolean;
}

interface DefaultQuery {
  id: string;
  description: string;
  path: string;
  method: string;
  parameters?: any;
}

interface SavedQuery {
  id: number;
  name: string;
  description: string;
  query: string;
  method: string;
  pluginName: string;
  instanceId: string;
  executionCount: number;
  lastExecutedAt: string;
  createdAt: string;
}

interface TestResult {
  success: boolean;
  status: string;
  message: string;
  responseTime?: string;
  dataPreview?: string;
  error?: string;
}

interface QueryResult {
  success: boolean;
  data: any;
  metadata: {
    responseTime: string;
    dataType: string;
    recordCount: number | null;
  };
  saved?: boolean;
}

export function PluginTestingPanel() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [instances, setInstances] = useState<PluginInstance[]>([]);
  const [defaultQueries, setDefaultQueries] = useState<DefaultQuery[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  
  const [selectedPlugin, setSelectedPlugin] = useState<string>('');
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [selectedQuery, setSelectedQuery] = useState<string>('');
  
  const [customQuery, setCustomQuery] = useState<string>('');
  const [queryMethod, setQueryMethod] = useState<string>('GET');
  const [queryName, setQueryName] = useState<string>('');
  const [queryDescription, setQueryDescription] = useState<string>('');
  
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState<string>('test-connection');

  // Load initial data
  useEffect(() => {
    loadPlugins();
    loadSavedQueries();
  }, []);

  // Load instances when plugin changes
  useEffect(() => {
    if (selectedPlugin) {
      loadInstances(selectedPlugin);
      loadDefaultQueries(selectedPlugin);
    }
  }, [selectedPlugin]);

  const loadPlugins = async () => {
    try {
      const response = await fetch('/api/plugins');
      const data = await response.json();
      setPlugins(data.plugins || []);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
  };

  const loadInstances = async (pluginName: string) => {
    try {
      const response = await fetch(`/api/plugins/plugins/${pluginName}/instances`);
      const data = await response.json();
      setInstances(data.instances || []);
    } catch (error) {
      console.error('Failed to load instances:', error);
    }
  };

  const loadDefaultQueries = async (pluginName: string) => {
    try {
      const response = await fetch(`/api/plugins/plugins/${pluginName}/queries`);
      const data = await response.json();
      setDefaultQueries(data.queries || []);
    } catch (error) {
      console.error('Failed to load default queries:', error);
    }
  };

  const loadSavedQueries = async () => {
    try {
      const response = await fetch('/api/plugins/saved-queries');
      const data = await response.json();
      setSavedQueries(data.queries || []);
    } catch (error) {
      console.error('Failed to load saved queries:', error);
    }
  };

  const testConnection = async () => {
    if (!selectedPlugin || !selectedInstance) return;
    
    setLoading({ ...loading, testConnection: true });
    try {
      const response = await fetch(
        `/api/plugins/${selectedPlugin}/instances/${selectedInstance}/test-connection`,
        { method: 'POST' }
      );
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        status: 'error',
        message: 'Failed to test connection',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading({ ...loading, testConnection: false });
    }
  };

  const validateQuery = async () => {
    if (!selectedPlugin || !selectedInstance || !customQuery) return;
    
    setLoading({ ...loading, validateQuery: true });
    try {
      const response = await fetch(
        `/api/plugins/plugins/${selectedPlugin}/instances/${selectedInstance}/validate-query`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: customQuery, method: queryMethod })
        }
      );
      const result = await response.json();
      setValidationResult(result);
    } catch (error) {
      console.error('Failed to validate query:', error);
    } finally {
      setLoading({ ...loading, validateQuery: false });
    }
  };

  const executeQuery = async (query?: string, method?: string, saveAs?: string) => {
    if (!selectedPlugin || !selectedInstance) return;
    
    const queryToExecute = query || customQuery;
    const methodToUse = method || queryMethod;
    
    if (!queryToExecute) return;
    
    setLoading({ ...loading, executeQuery: true });
    try {
      const response = await fetch(
        `/api/plugins/plugins/${selectedPlugin}/instances/${selectedInstance}/query`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: queryToExecute, 
            method: methodToUse,
            saveAs: saveAs || undefined
          })
        }
      );
      const result = await response.json();
      setQueryResult(result);
      
      if (saveAs) {
        loadSavedQueries(); // Refresh saved queries
      }
    } catch (error) {
      setQueryResult({
        success: false,
        data: null,
        metadata: { responseTime: '0ms', dataType: 'error', recordCount: null }
      });
    } finally {
      setLoading({ ...loading, executeQuery: false });
    }
  };

  const executeDefaultQuery = async (queryId: string) => {
    if (!selectedPlugin || !selectedInstance) return;
    
    setLoading({ ...loading, executeDefaultQuery: true });
    try {
      const response = await fetch(
        `/api/plugins/plugins/${selectedPlugin}/instances/${selectedInstance}/default-query/${queryId}`,
        { method: 'POST' }
      );
      const result = await response.json();
      setQueryResult(result);
    } catch (error) {
      console.error('Failed to execute default query:', error);
    } finally {
      setLoading({ ...loading, executeDefaultQuery: false });
    }
  };

  const executeSavedQuery = async (queryId: number) => {
    setLoading({ ...loading, executeSavedQuery: true });
    try {
      const response = await fetch(`/api/plugins/saved-queries/${queryId}/execute`, {
        method: 'POST'
      });
      const result = await response.json();
      setQueryResult(result);
    } catch (error) {
      console.error('Failed to execute saved query:', error);
    } finally {
      setLoading({ ...loading, executeSavedQuery: false });
    }
  };

  const saveQuery = () => {
    if (!queryName.trim()) {
      alert('Please enter a name for the query');
      return;
    }
    executeQuery(customQuery, queryMethod, queryName);
    setQueryName('');
    setQueryDescription('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'inactive': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatData = (data: any): string => {
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Plugin Testing & Query Builder
          </CardTitle>
          <CardDescription>
            Test plugin connections, build custom queries, and manage saved queries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label htmlFor="plugin-select">Plugin</Label>
              <Select value={selectedPlugin} onValueChange={setSelectedPlugin}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plugin" />
                </SelectTrigger>
                <SelectContent>
                  {plugins.map((plugin) => (
                    <SelectItem key={plugin.systemName} value={plugin.systemName}>
                      {plugin.systemName} ({plugin.instanceCount} instances)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="instance-select">Instance</Label>
              <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an instance" />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((instance) => (
                    <SelectItem key={instance.id} value={instance.id}>
                      {instance.name} {!instance.isActive && '(Inactive)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={testConnection} 
                disabled={!selectedPlugin || !selectedInstance || loading.testConnection}
                className="w-full"
              >
                {loading.testConnection ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
            </div>
          </div>

          {testResult && (
            <Alert className={`mb-6 ${testResult.success ? 'border-green-200' : 'border-red-200'}`}>
              <div className="flex items-center gap-2">
                {getStatusIcon(testResult.status)}
                <AlertDescription>
                  <div className="font-medium">{testResult.message}</div>
                  {testResult.responseTime && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Response time: {testResult.responseTime}
                    </div>
                  )}
                  {testResult.dataPreview && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Preview: {testResult.dataPreview}
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="test-connection">Connection</TabsTrigger>
              <TabsTrigger value="default-queries">Default Queries</TabsTrigger>
              <TabsTrigger value="custom-query">Query Builder</TabsTrigger>
              <TabsTrigger value="saved-queries">Saved Queries</TabsTrigger>
            </TabsList>

            <TabsContent value="test-connection" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Connection Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedInstance && instances.length > 0 && (
                    <div className="space-y-2">
                      {(() => {
                        const instance = instances.find(i => i.id === selectedInstance);
                        return instance ? (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><strong>Name:</strong> {instance.name}</div>
                            <div><strong>Base URL:</strong> {instance.baseUrl}</div>
                            <div><strong>Auth Type:</strong> {instance.authType}</div>
                            <div><strong>Status:</strong> 
                              <Badge variant={instance.isActive ? "default" : "secondary"} className="ml-2">
                                {instance.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            {instance.tags && instance.tags.length > 0 && (
                              <div className="col-span-2">
                                <strong>Tags:</strong>
                                <div className="flex gap-1 mt-1">
                                  {instance.tags.map((tag, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="default-queries" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Available Default Queries</CardTitle>
                  <CardDescription>
                    Pre-built queries provided by the plugin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {defaultQueries.map((query) => (
                        <div key={query.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <div className="font-medium">{query.description}</div>
                            <div className="text-sm text-muted-foreground">
                              {query.method} {query.path}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => executeDefaultQuery(query.id)}
                            disabled={loading.executeDefaultQuery}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Execute
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="custom-query" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Query Builder</CardTitle>
                  <CardDescription>
                    Build and test custom queries
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3">
                      <Label htmlFor="custom-query">Query</Label>
                      <Textarea
                        id="custom-query"
                        placeholder="Enter your query here..."
                        value={customQuery}
                        onChange={(e) => setCustomQuery(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="query-method">Method</Label>
                      <Select value={queryMethod} onValueChange={setQueryMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={validateQuery}
                      disabled={!customQuery || loading.validateQuery}
                      variant="outline"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Validate
                    </Button>
                    <Button
                      onClick={() => executeQuery()}
                      disabled={!customQuery || loading.executeQuery}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Execute
                    </Button>
                  </div>

                  {validationResult && (
                    <Alert>
                      <AlertDescription>
                        <div className="space-y-2">
                          {validationResult.validation.warnings.length > 0 && (
                            <div>
                              <strong>Warnings:</strong>
                              <ul className="list-disc list-inside text-sm">
                                {validationResult.validation.warnings.map((warning: string, idx: number) => (
                                  <li key={idx}>{warning}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {validationResult.validation.suggestions.length > 0 && (
                            <div>
                              <strong>Suggestions:</strong>
                              <ul className="list-disc list-inside text-sm">
                                {validationResult.validation.suggestions.map((suggestion: string, idx: number) => (
                                  <li key={idx}>{suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <Label>Save Query</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Query name"
                        value={queryName}
                        onChange={(e) => setQueryName(e.target.value)}
                      />
                      <Input
                        placeholder="Description (optional)"
                        value={queryDescription}
                        onChange={(e) => setQueryDescription(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={saveQuery}
                      disabled={!customQuery || !queryName.trim() || loading.executeQuery}
                      variant="outline"
                      size="sm"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save & Execute
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="saved-queries" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Saved Queries</CardTitle>
                  <CardDescription>
                    Your saved queries and their execution history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {savedQueries.map((query) => (
                        <div key={query.id} className="p-3 border rounded space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{query.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {query.pluginName} • {query.method}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCustomQuery(query.query);
                                  setQueryMethod(query.method);
                                  setActiveTab('custom-query');
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => executeSavedQuery(query.id)}
                                disabled={loading.executeSavedQuery}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Executed {query.executionCount} times
                            {query.lastExecutedAt && (
                              <> • Last: {new Date(query.lastExecutedAt).toLocaleString()}</>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {queryResult && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Query Results
                  {queryResult.success ? (
                    <Badge variant="default">Success</Badge>
                  ) : (
                    <Badge variant="destructive">Error</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Response time: {queryResult.metadata.responseTime} • 
                  Type: {queryResult.metadata.dataType}
                  {queryResult.metadata.recordCount !== null && (
                    <> • Records: {queryResult.metadata.recordCount}</>
                  )}
                  {queryResult.saved && <> • Query saved successfully</>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                    {formatData(queryResult.data)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 