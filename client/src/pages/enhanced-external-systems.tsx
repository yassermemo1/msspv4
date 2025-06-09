import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Settings, 
  Play, 
  Database, 
  ExternalLink, 
  Eye, 
  Trash2,
  Copy,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Download,
  Code,
  Zap,
  Search,
  Loader2,
  ArrowRight,
  Calendar,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';

interface ExternalSystem {
  id: number;
  systemName: string;
  displayName: string;
  systemType: string;
  baseUrl: string;
  authType: string;
  authConfig?: any;
  isActive: boolean;
  description?: string;
  lastSync?: string;
  status?: 'connected' | 'disconnected' | 'error';
}

interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  systemType: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  params: Record<string, any>;
  headers: Record<string, string>;
  body?: string;
  expectedResponseStructure: any;
}

interface TestResult {
  success: boolean;
  data: any;
  metadata: {
    executionTime: number;
    statusCode: number;
    responseSize: number;
    recordCount: number;
  };
  error?: string;
}

export default function EnhancedExternalSystems() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('systems');
  const [selectedSystem, setSelectedSystem] = useState<ExternalSystem | null>(null);
  const [showCreateSystem, setShowCreateSystem] = useState(false);
  const [showTestQuery, setShowTestQuery] = useState(false);
  
  // Query testing state
  const [queryMethod, setQueryMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [queryEndpoint, setQueryEndpoint] = useState('');
  const [queryParams, setQueryParams] = useState('{}');
  const [queryHeaders, setQueryHeaders] = useState('{}');
  const [queryBody, setQueryBody] = useState('');
  const [resultLimit, setResultLimit] = useState(100);
  const [timeoutSeconds, setTimeoutSeconds] = useState(30);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);

  // Form state for system creation
  const [formData, setFormData] = useState({
    systemName: '',
    displayName: '',
    systemType: '',
    baseUrl: '',
    authType: 'none',
    description: '',
    authConfig: {}
  });

  // Fetch external systems
  const { data: systems = [], isLoading } = useQuery({
    queryKey: ['external-systems'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/external-systems');
      return response.json();
    }
  });

  // Built-in query templates for common systems
  const queryTemplates: QueryTemplate[] = [
    {
      id: 'grafana-dashboards',
      name: 'List Grafana Dashboards',
      description: 'Get all dashboards from Grafana',
      systemType: 'grafana',
      method: 'GET',
      endpoint: '/api/search?type=dash-db',
      params: { limit: 100 },
      headers: { 'Content-Type': 'application/json' },
      expectedResponseStructure: { array: true, fields: ['id', 'title', 'type', 'url'] }
    },
    {
      id: 'splunk-search',
      name: 'Splunk Search Query',
      description: 'Execute a search query in Splunk',
      systemType: 'splunk',
      method: 'POST',
      endpoint: '/services/search/jobs',
      params: {},
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'search=search index=main | head 10&output_mode=json',
      expectedResponseStructure: { object: true, fields: ['sid'] }
    },
    {
      id: 'carbonblack-devices',
      name: 'CarbonBlack Devices',
      description: 'Get all monitored devices from CarbonBlack',
      systemType: 'carbonblack',
      method: 'GET',
      endpoint: '/integrationServices/v3/device',
      params: { rows: 100 },
      headers: { 'Content-Type': 'application/json' },
      expectedResponseStructure: { object: true, fields: ['results', 'totalResults'] }
    },
    {
      id: 'jira-issues',
      name: 'JIRA Issues Search',
      description: 'Search for JIRA issues using JQL',
      systemType: 'jira',
      method: 'POST',
      endpoint: '/rest/api/2/search',
      params: {},
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jql: 'project = "PROJ" AND status = "Open"',
        maxResults: 50,
        fields: ['summary', 'status', 'assignee', 'created']
      }),
      expectedResponseStructure: { object: true, fields: ['issues', 'total', 'maxResults'] }
    },
    {
      id: 'generic-api',
      name: 'Generic REST API',
      description: 'Generic REST API endpoint test',
      systemType: 'api',
      method: 'GET',
      endpoint: '/api/data',
      params: { limit: 100, offset: 0 },
      headers: { 'Content-Type': 'application/json' },
      expectedResponseStructure: { array: true, fields: [] }
    }
  ];

  // Get templates for selected system
  const availableTemplates = selectedSystem 
    ? queryTemplates.filter(t => t.systemType === selectedSystem.systemType || t.systemType === 'api')
    : queryTemplates;

  // Apply template to query form
  const applyTemplate = (template: QueryTemplate) => {
    setQueryMethod(template.method);
    setQueryEndpoint(template.endpoint);
    setQueryParams(JSON.stringify(template.params, null, 2));
    setQueryHeaders(JSON.stringify(template.headers, null, 2));
    setQueryBody(template.body || '');
  };

  // Test query execution
  const testQuery = async () => {
    if (!selectedSystem) {
      toast({ title: "Error", description: "Please select a system first", variant: "destructive" });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const startTime = Date.now();
      
      // Parse params and headers
      let params = {};
      let headers = {};
      
      try {
        params = JSON.parse(queryParams);
      } catch (e) {
        throw new Error('Invalid JSON in parameters');
      }
      
      try {
        headers = JSON.parse(queryHeaders);
      } catch (e) {
        throw new Error('Invalid JSON in headers');
      }

      // Build request configuration
      const requestConfig = {
        systemId: selectedSystem.id,
        method: queryMethod,
        endpoint: queryEndpoint,
        params,
        headers,
        body: queryBody || undefined,
        limit: resultLimit,
        timeout: timeoutSeconds * 1000
      };

      const response = await apiRequest('POST', '/api/external-systems/test-query', requestConfig);
      const result = await response.json();
      
      const executionTime = Date.now() - startTime;
      
      if (response.ok) {
        setTestResult({
          success: true,
          data: result.data,
          metadata: {
            executionTime,
            statusCode: result.statusCode || 200,
            responseSize: JSON.stringify(result.data).length,
            recordCount: Array.isArray(result.data) ? result.data.length : 1
          }
        });
        
        toast({ title: "Success", description: "Query executed successfully" });
      } else {
        setTestResult({
          success: false,
          data: null,
          metadata: {
            executionTime,
            statusCode: result.statusCode || 500,
            responseSize: 0,
            recordCount: 0
          },
          error: result.message || 'Query failed'
        });
        
        toast({ 
          title: "Query Failed", 
          description: result.message || 'Unknown error',
          variant: "destructive"
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        data: null,
        metadata: {
          executionTime: Date.now() - Date.now(),
          statusCode: 0,
          responseSize: 0,
          recordCount: 0
        },
        error: error.message
      });
      
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  // Render query result
  const renderQueryResult = () => {
    if (!testResult) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Query Result</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? "Success" : "Failed"}
              </Badge>
              <Badge variant="outline">
                {testResult.metadata.executionTime}ms
              </Badge>
              <Badge variant="outline">
                {testResult.metadata.recordCount} records
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {testResult.success ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Status Code</Label>
                  <div className="font-mono">{testResult.metadata.statusCode}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Response Size</Label>
                  <div className="font-mono">{(testResult.metadata.responseSize / 1024).toFixed(2)} KB</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Records</Label>
                  <div className="font-mono">{testResult.metadata.recordCount}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Execution Time</Label>
                  <div className="font-mono">{testResult.metadata.executionTime}ms</div>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Response Data</Label>
                <ScrollArea className="h-96 w-full border rounded-md">
                  <pre className="p-4 text-sm font-mono">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {testResult.error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8 text-blue-500" />
            Enhanced External Systems
          </h1>
          <p className="text-muted-foreground mt-1">
            Advanced external system management with interactive query testing and result analysis
          </p>
        </div>
        <Button onClick={() => setShowCreateSystem(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add System
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="systems">Systems</TabsTrigger>
          <TabsTrigger value="query-test">Query Tester</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Systems Tab */}
        <TabsContent value="systems" className="space-y-4">
          <div className="grid gap-4">
            {systems.map((system: ExternalSystem) => (
              <Card key={system.id} className={`hover:shadow-md transition-shadow cursor-pointer ${
                selectedSystem?.id === system.id ? 'ring-2 ring-blue-500' : ''
              }`} onClick={() => setSelectedSystem(system)}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        system.isActive ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <h3 className="font-semibold text-lg">{system.displayName}</h3>
                        <p className="text-sm text-muted-foreground">{system.systemType}</p>
                        <p className="text-xs text-muted-foreground">{system.baseUrl}</p>
                        {system.description && (
                          <p className="text-sm text-gray-600 mt-1">{system.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={system.isActive ? "default" : "secondary"}>
                        {system.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSystem(system);
                          setActiveTab('query-test');
                        }}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Query Test Tab */}
        <TabsContent value="query-test" className="space-y-4">
          {!selectedSystem ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select a system from the Systems tab to test queries.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {/* System Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Testing System: {selectedSystem.displayName}</CardTitle>
                  <CardDescription>
                    {selectedSystem.systemType} • {selectedSystem.baseUrl}
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Query Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Query Configuration</CardTitle>
                  <CardDescription>
                    Configure your API request with advanced options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="method">HTTP Method</Label>
                      <Select value={queryMethod} onValueChange={(value: any) => setQueryMethod(value)}>
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
                    <div>
                      <Label htmlFor="endpoint">Endpoint</Label>
                      <Input
                        id="endpoint"
                        value={queryEndpoint}
                        onChange={(e) => setQueryEndpoint(e.target.value)}
                        placeholder="/api/endpoint"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="limit">Result Limit</Label>
                      <Input
                        id="limit"
                        type="number"
                        value={resultLimit}
                        onChange={(e) => setResultLimit(parseInt(e.target.value) || 100)}
                        min="1"
                        max="10000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="timeout">Timeout (seconds)</Label>
                      <Input
                        id="timeout"
                        type="number"
                        value={timeoutSeconds}
                        onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 30)}
                        min="1"
                        max="300"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="params">Query Parameters (JSON)</Label>
                    <Textarea
                      id="params"
                      value={queryParams}
                      onChange={(e) => setQueryParams(e.target.value)}
                      placeholder='{"limit": 100, "offset": 0}'
                      rows={3}
                      className="font-mono"
                    />
                  </div>

                  <div>
                    <Label htmlFor="headers">Headers (JSON)</Label>
                    <Textarea
                      id="headers"
                      value={queryHeaders}
                      onChange={(e) => setQueryHeaders(e.target.value)}
                      placeholder='{"Content-Type": "application/json"}'
                      rows={3}
                      className="font-mono"
                    />
                  </div>

                  {(queryMethod === 'POST' || queryMethod === 'PUT') && (
                    <div>
                      <Label htmlFor="body">Request Body</Label>
                      <Textarea
                        id="body"
                        value={queryBody}
                        onChange={(e) => setQueryBody(e.target.value)}
                        placeholder='{"key": "value"}'
                        rows={4}
                        className="font-mono"
                      />
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button onClick={testQuery} disabled={testing}>
                      {testing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      {testing ? 'Executing...' : 'Execute Query'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setQueryMethod('GET');
                        setQueryEndpoint('');
                        setQueryParams('{}');
                        setQueryHeaders('{}');
                        setQueryBody('');
                        setTestResult(null);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Query Result */}
              {renderQueryResult()}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {availableTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                      <div className="flex space-x-2">
                        <Badge variant="outline">{template.method}</Badge>
                        <Badge variant="secondary">{template.systemType}</Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          applyTemplate(template);
                          setActiveTab('query-test');
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Use Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Database className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Systems</p>
                    <p className="text-2xl font-bold">{systems.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Active Systems</p>
                    <p className="text-2xl font-bold">
                      {systems.filter((s: ExternalSystem) => s.isActive).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">System Types</p>
                    <p className="text-2xl font-bold">
                      {new Set(systems.map((s: ExternalSystem) => s.systemType)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Types Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(
                  systems.reduce((acc: Record<string, number>, system: ExternalSystem) => {
                    acc[system.systemType] = (acc[system.systemType] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="capitalize">{type}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 