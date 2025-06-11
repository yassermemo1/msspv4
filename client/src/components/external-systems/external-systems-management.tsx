import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { AlertCircle, Plus, Settings, TestTube, Trash2, Edit, CheckCircle, XCircle, Loader2, Play, BarChart3, Clock, Download, Copy, MoreVertical } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

interface ExternalSystem {
  id: number;
  systemName: string;
  displayName: string;
  systemType: 'api' | 'database' | 'file' | 'custom';
  baseUrl: string;
  authType: 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth' | 'custom';
  authConfig?: {
    username?: string;
    password?: string;
    token?: string;
    key?: string;
    header?: string;
    accessToken?: string;
    customHeaders?: Record<string, string>;
  };
  connectionConfig?: {
    timeout?: number;
    retryAttempts?: number;
    sslVerify?: boolean;
    customSettings?: Record<string, any>;
  };
  queryMethods?: Record<string, {
    type: 'REST' | 'JQL' | 'AQL' | 'SPL' | 'PromQL' | 'GraphQL' | 'SQL' | 'Custom';
    endpoint?: string;
    method?: string;
    headers?: Record<string, string>;
    parameters?: Record<string, any>;
    example?: string;
    query?: string;
    queryLanguage?: string;
    description?: string;
  }>;
  dataTransforms?: string[];
  healthCheckConfig?: {
    endpoint?: string;
    interval?: number;
    enabled?: boolean;
  };
  rateLimitConfig?: {
    requestsPerMinute?: number;
    burstLimit?: number;
  };
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface TestResult {
  success: boolean;
  data?: any;
  metadata?: {
    executionTime: number;
    method: string;
    systemName: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

const SYSTEM_TYPES = [
  { value: 'api', label: 'REST API', description: 'HTTP/HTTPS REST API endpoints' },
  { value: 'database', label: 'Database', description: 'SQL or NoSQL database connections' },
  { value: 'file', label: 'File System', description: 'File-based data sources' },
  { value: 'custom', label: 'Custom', description: 'Custom integration protocol' }
];

const AUTH_TYPES = [
  { value: 'none', label: 'No Authentication', description: 'Public endpoints' },
  { value: 'basic', label: 'Basic Auth', description: 'Username and password' },
  { value: 'bearer', label: 'Bearer Token', description: 'Authorization header with token' },
  { value: 'api_key', label: 'API Key', description: 'API key in header or query' },
  { value: 'oauth', label: 'OAuth 2.0', description: 'OAuth 2.0 flow' },
  { value: 'custom', label: 'Custom', description: 'Custom authentication method' }
];

export function ExternalSystemsManagement() {
  const { toast } = useToast();
  const [systems, setSystems] = useState<ExternalSystem[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<ExternalSystem | null>(null);
  const [editingSystem, setEditingSystem] = useState<Partial<ExternalSystem>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showAddMethodDialog, setShowAddMethodDialog] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');

  useEffect(() => {
    loadSystems();
  }, []);

  const loadSystems = async () => {
    try {
      const response = await apiRequest('GET', '/api/external-systems');
      const data = await response.json();
      setSystems(data);
    } catch (error) {
      console.error('Failed to load systems:', error);
    } finally {
      setLoading(false);
    }
  };

  const startCreating = () => {
    setIsCreating(true);
    setSelectedSystem(null);
    setEditingSystem({
      systemName: '',
      displayName: '',
      systemType: 'api',
      baseUrl: '',
      authType: 'none',
      authConfig: {},
      connectionConfig: {
        timeout: 30000,
        retryAttempts: 3,
        sslVerify: true
      },
      queryMethods: {},
      dataTransforms: [],
      healthCheckConfig: {
        enabled: true,
        interval: 300
      },
      rateLimitConfig: {
        requestsPerMinute: 60,
        burstLimit: 10
      },
      isActive: true
    });
    setTestResult(null);
  };

  const startEditing = (system: ExternalSystem) => {
    setSelectedSystem(system);
    setEditingSystem({ ...system });
    setIsCreating(false);
    setTestResult(null);
  };

  const cancelEditing = () => {
    setSelectedSystem(null);
    setEditingSystem({});
    setIsCreating(false);
    setTestResult(null);
  };

  const saveSystem = async () => {
    if (!editingSystem.systemName || !editingSystem.displayName || !editingSystem.baseUrl) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const method = isCreating ? 'POST' : 'PUT';
      const url = isCreating ? '/api/external-systems' : `/api/external-systems/${selectedSystem?.id}`;
      
      const response = await apiRequest(method, url, editingSystem);
      const savedSystem = await response.json();

      if (isCreating) {
        setSystems([...systems, savedSystem]);
      } else {
        setSystems(systems.map(s => s.id === savedSystem.id ? savedSystem : s));
      }

      cancelEditing();
    } catch (error) {
      console.error('Failed to save system:', error);
      alert('Failed to save system');
    } finally {
      setSaving(false);
    }
  };

  const deleteSystem = async (systemId: number) => {
    if (!confirm('Are you sure you want to delete this system?')) return;

    try {
      await apiRequest('DELETE', `/api/external-systems/${systemId}`);
      setSystems(systems.filter(s => s.id !== systemId));
      if (selectedSystem?.id === systemId) {
        cancelEditing();
      }
    } catch (error) {
      console.error('Failed to delete system:', error);
      alert('Failed to delete system');
    }
  };

  const testConnection = async () => {
    if (!editingSystem.systemName || !editingSystem.baseUrl) {
      toast({
        title: "Error",
        description: "Please provide system name and base URL",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    try {
      // Test the system configuration
      const testConfig = {
        ...editingSystem,
        testQuery: 'SELECT 1' // Default test query
      };

      const response = await apiRequest('POST', '/api/external-systems/test-config', testConfig);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Convert backend response format to frontend format
      const convertedResult = {
        success: result.status === 'success',
        data: result.data,
        metadata: {
          executionTime: result.data?.response_time || 'N/A',
          method: 'Connection Test',
          systemName: editingSystem.displayName || editingSystem.systemName
        },
        error: result.status === 'error' ? {
          code: 'CONNECTION_ERROR',
          message: result.error_message || 'Connection test failed'
        } : undefined
      };
      
      setTestResult(convertedResult);
      
      if (convertedResult.success) {
        toast({
          title: "Success",
          description: "Connection test successful!"
        });
      } else {
        toast({
          title: "Connection Failed",
          description: convertedResult.error?.message || "Unknown error",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      const errorResult = {
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: error instanceof Error ? error.message : 'Failed to test connection'
        }
      };
      setTestResult(errorResult);
      
      toast({
        title: "Test Failed",
        description: errorResult.error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const addQueryMethod = () => {
    setShowAddMethodDialog(true);
  };

  const handleAddMethod = () => {
    if (!newMethodName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a method name",
        variant: "destructive"
      });
      return;
    }

    if (editingSystem.queryMethods?.[newMethodName]) {
      toast({
        title: "Error", 
        description: "A method with this name already exists",
        variant: "destructive"
      });
      return;
    }

    setEditingSystem({
      ...editingSystem,
      queryMethods: {
        ...editingSystem.queryMethods,
        [newMethodName]: {
          type: 'REST',
          endpoint: '/',
          method: 'GET',
          headers: {},
          parameters: {},
          example: '',
          query: '',
          description: '',
        }
      }
    });

    setShowAddMethodDialog(false);
    setNewMethodName('');
    
    toast({
      title: "Success",
      description: `Query method "${newMethodName}" added successfully`
    });
  };

  const removeQueryMethod = (methodName: string) => {
    const { [methodName]: removed, ...remaining } = editingSystem.queryMethods || {};
    setEditingSystem({
      ...editingSystem,
      queryMethods: remaining
    });
  };

  const updateQueryMethod = (methodName: string, field: string, value: any) => {
    setEditingSystem({
      ...editingSystem,
      queryMethods: {
        ...editingSystem.queryMethods,
        [methodName]: {
          ...editingSystem.queryMethods?.[methodName],
          [field]: value
        }
      }
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">External Systems</h1>
          <p className="text-muted-foreground">
            Manage external system integrations and configurations
          </p>
        </div>
        <Button onClick={startCreating} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
              Add System
            </Button>
                </div>
                
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Systems List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Systems ({systems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p>Loading systems...</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {systems.map((system) => (
                    <div
                      key={system.id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 border-l-4 ${
                        selectedSystem?.id === system.id ? 'border-primary bg-muted' : 'border-transparent'
                      }`}
                      onClick={() => startEditing(system)}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">{system.displayName}</h3>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {system.systemType.toUpperCase()}
                          </Badge>
                          {system.isActive ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>

                        {/* Row-action dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                startEditing(system);
                              }}
                              className="flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                deleteSystem(system.id);
                              }}
                              className="flex items-center gap-2 text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {system.baseUrl}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {system.authType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Object.keys(system.queryMethods || {}).length} methods
                        </span>
              </div>
              </div>
                  ))}
                  {systems.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground">
                      <Settings className="w-8 h-8 mx-auto mb-2" />
                      <p>No systems configured</p>
                      <Button variant="link" onClick={startCreating} className="mt-2">
                        Add your first system
                      </Button>
              </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* System Editor/Details */}
        <div className="lg:col-span-2">
          {(isCreating || selectedSystem) ? (
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList>
                <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                <TabsTrigger value="auth">Authentication</TabsTrigger>
                <TabsTrigger value="methods">Query Methods</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="basic">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{isCreating ? 'Add New System' : 'Edit System'}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={testConnection}
                          disabled={testing}
                          className="flex items-center gap-2"
                        >
                          <TestTube className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                          Test
                        </Button>
                        <Button
                          onClick={saveSystem}
                          disabled={saving}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
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
                        <Label htmlFor="systemName">System Name *</Label>
                      <Input
                          id="systemName"
                          value={editingSystem.systemName || ''}
                          onChange={(e) => setEditingSystem({ ...editingSystem, systemName: e.target.value })}
                          placeholder="e.g., jira, grafana, splunk"
                      />
                    </div>
                    <div>
                        <Label htmlFor="displayName">Display Name *</Label>
                        <Input
                          id="displayName"
                          value={editingSystem.displayName || ''}
                          onChange={(e) => setEditingSystem({ ...editingSystem, displayName: e.target.value })}
                          placeholder="e.g., Production Jira"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="systemType">System Type *</Label>
                        <Select
                          value={editingSystem.systemType}
                          onValueChange={(value) => setEditingSystem({ ...editingSystem, systemType: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select system type" />
                          </SelectTrigger>
                          <SelectContent>
                            {SYSTEM_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div>
                                  <div className="font-medium">{type.label}</div>
                                  <div className="text-sm text-muted-foreground">{type.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={editingSystem.isActive !== false}
                          onCheckedChange={(checked) => setEditingSystem({ ...editingSystem, isActive: checked })}
                        />
                        <Label htmlFor="isActive">Active</Label>
                      </div>
                    </div>
              
                  <div>
                      <Label htmlFor="baseUrl">Base URL *</Label>
                      <Input
                        id="baseUrl"
                        value={editingSystem.baseUrl || ''}
                        onChange={(e) => setEditingSystem({ ...editingSystem, baseUrl: e.target.value })}
                        placeholder="https://api.example.com"
                      />
                    </div>

                    {/* Test Results */}
                    {testResult && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">Connection Test Results</h4>
                        {testResult.success ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>✅ Connection successful</span>
                              <span>⏱️ {testResult.metadata?.executionTime || 0}ms</span>
                            </div>
                            {testResult.data && (
                              <div className="bg-muted p-3 rounded text-sm">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(testResult.data, null, 2).slice(0, 300)}
                                  {JSON.stringify(testResult.data, null, 2).length > 300 && '...'}
                                </pre>
                              </div>
                            )}
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

              <TabsContent value="auth">
                <Card>
                  <CardHeader>
                    <CardTitle>Authentication Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="authType">Authentication Type</Label>
                      <Select
                        value={editingSystem.authType}
                        onValueChange={(value) => setEditingSystem({ 
                          ...editingSystem, 
                          authType: value as any,
                          authConfig: {} // Reset auth config when type changes
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select authentication type" />
                        </SelectTrigger>
                        <SelectContent>
                          {AUTH_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-sm text-muted-foreground">{type.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dynamic auth configuration based on type */}
                    {editingSystem.authType === 'basic' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            value={editingSystem.authConfig?.username || ''}
                            onChange={(e) => setEditingSystem({
                              ...editingSystem,
                              authConfig: { ...editingSystem.authConfig, username: e.target.value }
                            })}
                            placeholder="Username"
                          />
                        </div>
                        <div>
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            value={editingSystem.authConfig?.password || ''}
                            onChange={(e) => setEditingSystem({
                              ...editingSystem,
                              authConfig: { ...editingSystem.authConfig, password: e.target.value }
                            })}
                            placeholder="Password or API token"
                          />
                  </div>
                </div>
              )}
              
                    {editingSystem.authType === 'bearer' && (
                    <div>
                        <Label htmlFor="token">Bearer Token</Label>
                        <Input
                          id="token"
                          type="password"
                          value={editingSystem.authConfig?.token || ''}
                          onChange={(e) => setEditingSystem({
                            ...editingSystem,
                            authConfig: { ...editingSystem.authConfig, token: e.target.value }
                          })}
                          placeholder="Bearer token"
                        />
                      </div>
                    )}

                    {editingSystem.authType === 'api_key' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="key">API Key</Label>
                          <Input
                            id="key"
                            type="password"
                            value={editingSystem.authConfig?.key || ''}
                            onChange={(e) => setEditingSystem({
                              ...editingSystem,
                              authConfig: { ...editingSystem.authConfig, key: e.target.value }
                            })}
                            placeholder="API key"
                          />
                    </div>
                        <div>
                          <Label htmlFor="header">Header Name</Label>
                          <Input
                            id="header"
                            value={editingSystem.authConfig?.header || 'X-API-Key'}
                            onChange={(e) => setEditingSystem({
                              ...editingSystem,
                              authConfig: { ...editingSystem.authConfig, header: e.target.value }
                            })}
                            placeholder="X-API-Key"
                          />
                  </div>
                </div>
              )}
              
                    {editingSystem.authType === 'custom' && (
                  <div>
                        <Label htmlFor="customHeaders">Custom Headers (JSON)</Label>
                    <Textarea
                          id="customHeaders"
                          value={JSON.stringify(editingSystem.authConfig?.customHeaders || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const headers = JSON.parse(e.target.value);
                              setEditingSystem({
                                ...editingSystem,
                                authConfig: { ...editingSystem.authConfig, customHeaders: headers }
                              });
                            } catch (error) {
                              // Invalid JSON, ignore
                            }
                          }}
                          placeholder='{"Authorization": "Custom token", "X-Custom-Header": "value"}'
                          rows={4}
                          className="font-mono"
                        />
                  </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="methods">
                <div className="space-y-6">
                  {/* Query Methods Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Query Methods</span>
                        <Dialog open={showAddMethodDialog} onOpenChange={setShowAddMethodDialog}>
                          <DialogTrigger asChild>
                            <Button onClick={addQueryMethod} size="sm" className="flex items-center gap-2">
                              <Plus className="w-4 h-4" />
                              Add Method
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add New Query Method</DialogTitle>
                              <DialogDescription>
                                Create a new query method for this external system
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="methodName">Method Name</Label>
                                <Input
                                  id="methodName"
                                  value={newMethodName}
                                  onChange={(e) => setNewMethodName(e.target.value)}
                                  placeholder="e.g., search, list, get, create"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddMethod();
                                    }
                                  }}
                                />
                                <p className="text-sm text-muted-foreground mt-1">
                                  Use descriptive names like "search", "list", "get", or "create"
                                </p>
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setShowAddMethodDialog(false);
                                    setNewMethodName('');
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button onClick={handleAddMethod}>
                                  Add Method
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {Object.entries(editingSystem.queryMethods || {}).map(([methodName, config]) => (
                        <div key={methodName} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{methodName}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeQueryMethod(methodName)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="space-y-4">
                            {/* Query Type Selection */}
                            <div>
                              <Label>Query Type</Label>
                              <Select
                                value={config.type || 'REST'}
                                onValueChange={(value) => updateQueryMethod(methodName, 'type', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="REST">REST API</SelectItem>
                                  <SelectItem value="JQL">Jira JQL</SelectItem>
                                  <SelectItem value="AQL">QRadar AQL</SelectItem>
                                  <SelectItem value="SPL">Splunk SPL</SelectItem>
                                  <SelectItem value="PromQL">Prometheus PromQL</SelectItem>
                                  <SelectItem value="GraphQL">GraphQL</SelectItem>
                                  <SelectItem value="SQL">SQL</SelectItem>
                                  <SelectItem value="Custom">Custom Query Language</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Description */}
                            <div>
                              <Label>Description</Label>
                              <Input
                                value={config.description || ''}
                                onChange={(e) => updateQueryMethod(methodName, 'description', e.target.value)}
                                placeholder="Describe what this query does"
                              />
                            </div>

                            {/* REST API specific fields */}
                            {config.type === 'REST' && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>HTTP Method</Label>
                                  <Select
                                    value={config.method || 'GET'}
                                    onValueChange={(value) => updateQueryMethod(methodName, 'method', value)}
                                  >
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
                                  <Label>Endpoint</Label>
                                  <Input
                                    value={config.endpoint || ''}
                                    onChange={(e) => updateQueryMethod(methodName, 'endpoint', e.target.value)}
                                    placeholder="/api/search"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Text Query for JQL, AQL, SPL, PromQL, GraphQL, SQL, Custom */}
                            {config.type !== 'REST' && (
                              <div className="space-y-4">
                                {config.type === 'Custom' && (
                                  <div>
                                    <Label>Query Language</Label>
                                    <Input
                                      value={config.queryLanguage || ''}
                                      onChange={(e) => updateQueryMethod(methodName, 'queryLanguage', e.target.value)}
                                      placeholder="e.g., KQL, YAML, Custom DSL"
                                    />
                                  </div>
                                )}
                                
                                <div>
                                  <Label>
                                    {config.type === 'JQL' && 'JQL Query'}
                                    {config.type === 'AQL' && 'AQL Query'}
                                    {config.type === 'SPL' && 'SPL Search'}
                                    {config.type === 'PromQL' && 'PromQL Query'}
                                    {config.type === 'GraphQL' && 'GraphQL Query'}
                                    {config.type === 'SQL' && 'SQL Query'}
                                    {config.type === 'Custom' && `${config.queryLanguage || 'Custom'} Query`}
                                  </Label>
                                  <Textarea
                                    value={config.query || ''}
                                    onChange={(e) => updateQueryMethod(methodName, 'query', e.target.value)}
                                    placeholder={
                                      config.type === 'JQL' ? 'project = "PROJECT" AND assignee = currentUser() ORDER BY created DESC' :
                                      config.type === 'AQL' ? 'SELECT sourceip, destinationip, eventcount(*) FROM events WHERE eventtime > 1692892800000 GROUP BY sourceip, destinationip' :
                                      config.type === 'SPL' ? 'index=main sourcetype=access_combined | stats count by host | sort -count' :
                                      config.type === 'PromQL' ? 'rate(http_requests_total[5m])' :
                                      config.type === 'GraphQL' ? 'query {\n  users {\n    id\n    name\n    email\n  }\n}' :
                                      config.type === 'SQL' ? 'SELECT * FROM events WHERE timestamp > NOW() - INTERVAL 1 HOUR ORDER BY timestamp DESC LIMIT 100' :
                                      'Enter your custom query here'
                                    }
                                    rows={6}
                                    className="font-mono text-sm"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {config.type === 'JQL' && 'Use Jira Query Language to search issues, projects, and boards'}
                                    {config.type === 'AQL' && 'Use QRadar Ariel Query Language for security event analysis'}
                                    {config.type === 'SPL' && 'Use Splunk Search Processing Language for log analysis'}
                                    {config.type === 'PromQL' && 'Use Prometheus Query Language for metrics analysis'}
                                    {config.type === 'GraphQL' && 'Define your GraphQL query with fields and operations'}
                                    {config.type === 'SQL' && 'Standard SQL query for database operations'}
                                    {config.type === 'Custom' && `Custom ${config.queryLanguage || 'query language'} syntax`}
                                  </p>
                                </div>

                                {/* Parameters for parameterized queries */}
                                <div>
                                  <Label>Query Parameters (JSON)</Label>
                                  <Textarea
                                    value={JSON.stringify(config.parameters || {}, null, 2)}
                                    onChange={(e) => {
                                      try {
                                        const params = JSON.parse(e.target.value);
                                        updateQueryMethod(methodName, 'parameters', params);
                                      } catch (error) {
                                        // Invalid JSON, ignore
                                      }
                                    }}
                                    placeholder='{"limit": 100, "timeframe": "1h"}'
                                    rows={3}
                                    className="font-mono text-sm"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Parameters that can be passed to customize the query
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Example for all query types */}
                            <div>
                              <Label>Example Usage</Label>
                              <Textarea
                                value={config.example || ''}
                                onChange={(e) => updateQueryMethod(methodName, 'example', e.target.value)}
                                placeholder={
                                  config.type === 'REST' ? 'GET /api/search?q=keyword&limit=10' :
                                  'Example usage or result description for this query method'
                                }
                                rows={2}
                                className="font-mono text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {Object.keys(editingSystem.queryMethods || {}).length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                          <p>No query methods configured</p>
                          <Button variant="link" onClick={addQueryMethod} className="mt-2">
                            Add your first method
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Enhanced Query Testing Interface */}
                  {selectedSystem && (
                    <QueryTestingInterface 
                      system={selectedSystem}
                      onTestComplete={(result) => setTestResult(result)}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="advanced">
                <Card>
              <CardHeader>
                    <CardTitle>Advanced Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Connection Settings */}
                    <div>
                      <h4 className="font-medium mb-3">Connection Settings</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="timeout">Timeout (ms)</Label>
                          <Input
                            id="timeout"
                            type="number"
                            value={editingSystem.connectionConfig?.timeout || 30000}
                            onChange={(e) => setEditingSystem({
                              ...editingSystem,
                              connectionConfig: {
                                ...editingSystem.connectionConfig,
                                timeout: parseInt(e.target.value) || 30000
                              }
                            })}
                          />
                        </div>
                  <div>
                          <Label htmlFor="retryAttempts">Retry Attempts</Label>
                          <Input
                            id="retryAttempts"
                            type="number"
                            value={editingSystem.connectionConfig?.retryAttempts || 3}
                            onChange={(e) => setEditingSystem({
                              ...editingSystem,
                              connectionConfig: {
                                ...editingSystem.connectionConfig,
                                retryAttempts: parseInt(e.target.value) || 3
                              }
                            })}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="sslVerify"
                            checked={editingSystem.connectionConfig?.sslVerify !== false}
                            onCheckedChange={(checked) => setEditingSystem({
                              ...editingSystem,
                              connectionConfig: {
                                ...editingSystem.connectionConfig,
                                sslVerify: checked
                              }
                            })}
                          />
                          <Label htmlFor="sslVerify">SSL Verification</Label>
                        </div>
                      </div>
                  </div>
                  
                    {/* Rate Limiting */}
                    <div>
                      <h4 className="font-medium mb-3">Rate Limiting</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="requestsPerMinute">Requests per Minute</Label>
                          <Input
                            id="requestsPerMinute"
                            type="number"
                            value={editingSystem.rateLimitConfig?.requestsPerMinute || 60}
                            onChange={(e) => setEditingSystem({
                              ...editingSystem,
                              rateLimitConfig: {
                                ...editingSystem.rateLimitConfig,
                                requestsPerMinute: parseInt(e.target.value) || 60
                              }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="burstLimit">Burst Limit</Label>
                          <Input
                            id="burstLimit"
                            type="number"
                            value={editingSystem.rateLimitConfig?.burstLimit || 10}
                            onChange={(e) => setEditingSystem({
                              ...editingSystem,
                              rateLimitConfig: {
                                ...editingSystem.rateLimitConfig,
                                burstLimit: parseInt(e.target.value) || 10
                              }
                            })}
                          />
                        </div>
                  </div>
                </div>

                    {/* Health Check */}
                    <div>
                      <h4 className="font-medium mb-3">Health Check</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="healthCheckEnabled"
                            checked={editingSystem.healthCheckConfig?.enabled !== false}
                            onCheckedChange={(checked) => setEditingSystem({
                              ...editingSystem,
                              healthCheckConfig: {
                                ...editingSystem.healthCheckConfig,
                                enabled: checked
                              }
                            })}
                          />
                          <Label htmlFor="healthCheckEnabled">Enable Health Check</Label>
                        </div>
                  <div>
                          <Label htmlFor="healthCheckEndpoint">Health Check Endpoint</Label>
                          <Input
                            id="healthCheckEndpoint"
                            value={editingSystem.healthCheckConfig?.endpoint || '/health'}
                            onChange={(e) => setEditingSystem({
                              ...editingSystem,
                              healthCheckConfig: {
                                ...editingSystem.healthCheckConfig,
                                endpoint: e.target.value
                              }
                            })}
                            placeholder="/health"
                          />
                  </div>
                  <div>
                          <Label htmlFor="healthCheckInterval">Interval (seconds)</Label>
                          <Input
                            id="healthCheckInterval"
                            type="number"
                            value={editingSystem.healthCheckConfig?.interval || 300}
                            onChange={(e) => setEditingSystem({
                              ...editingSystem,
                              healthCheckConfig: {
                                ...editingSystem.healthCheckConfig,
                                interval: parseInt(e.target.value) || 300
                              }
                            })}
                          />
                        </div>
                  </div>
                </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Settings className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No System Selected</h3>
                <p>Select a system from the list to view and edit its configuration</p>
              </CardContent>
            </Card>
        )}
        </div>
      </div>
    </div>
  );
}

// Enhanced Query Testing Interface Component
interface QueryTestingInterfaceProps {
  system: ExternalSystem;
  onTestComplete: (result: TestResult) => void;
}

function QueryTestingInterface({ system, onTestComplete }: QueryTestingInterfaceProps) {
  const [selectedMethodName, setSelectedMethodName] = useState('');
  const [queryType, setQueryType] = useState<'REST' | 'JQL' | 'AQL' | 'SPL' | 'PromQL' | 'GraphQL' | 'SQL' | 'Custom'>('REST');
  const [queryMethod, setQueryMethod] = useState('GET');
  const [queryEndpoint, setQueryEndpoint] = useState('');
  const [queryText, setQueryText] = useState('');
  const [queryParams, setQueryParams] = useState('{}');
  const [queryHeaders, setQueryHeaders] = useState('{}');
  const [queryBody, setQueryBody] = useState('');
  const [resultLimit, setResultLimit] = useState(100);
  const [timeoutSeconds, setTimeoutSeconds] = useState(30);
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);

  // Get available query methods for this system
  const availableMethods = Object.entries(system.queryMethods || {});

  // Load method configuration when selected
  const loadMethod = (methodName: string) => {
    const method = system.queryMethods?.[methodName];
    if (method) {
      setQueryType(method.type);
      setQueryMethod(method.method || 'GET');
      setQueryEndpoint(method.endpoint || '');
      setQueryText(method.query || '');
      setQueryParams(JSON.stringify(method.parameters || {}, null, 2));
      setQueryHeaders(JSON.stringify(method.headers || {}, null, 2));
    }
  };

  // Predefined query templates based on query type
  const getQueryTemplates = (type: string) => {
    switch (type) {
      case 'JQL':
        return [
          { name: 'Recent Issues', query: 'project = "PROJECT" ORDER BY created DESC' },
          { name: 'My Issues', query: 'assignee = currentUser() AND status != Done' },
          { name: 'Bug Reports', query: 'issuetype = Bug AND status = "In Progress"' }
        ];
      case 'AQL':
        return [
          { name: 'Recent Events', query: 'SELECT * FROM events WHERE eventtime > NOW() - INTERVAL 1 HOUR' },
          { name: 'Top Source IPs', query: 'SELECT sourceip, eventcount(*) FROM events GROUP BY sourceip ORDER BY eventcount(*) DESC' },
          { name: 'Failed Logins', query: 'SELECT * FROM events WHERE eventname = "Authentication Failure"' }
        ];
      case 'SPL':
        return [
          { name: 'Error Search', query: 'index=main error | stats count by host' },
          { name: 'Top Users', query: 'index=access_combined | stats count by user | sort -count' },
          { name: 'Time Chart', query: 'index=main | timechart span=1h count by sourcetype' }
        ];
      case 'PromQL':
        return [
          { name: 'CPU Usage', query: 'rate(cpu_seconds_total[5m])' },
          { name: 'Memory Usage', query: 'node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes' },
          { name: 'HTTP Requests', query: 'rate(http_requests_total[5m])' }
        ];
      case 'GraphQL':
        return [
          { name: 'List Users', query: 'query {\n  users {\n    id\n    name\n    email\n  }\n}' },
          { name: 'User Profile', query: 'query GetUser($id: ID!) {\n  user(id: $id) {\n    id\n    name\n    profile\n  }\n}' }
        ];
      case 'SQL':
        return [
          { name: 'Recent Records', query: 'SELECT * FROM events WHERE timestamp > NOW() - INTERVAL 1 HOUR LIMIT 100' },
          { name: 'Count by Status', query: 'SELECT status, COUNT(*) FROM events GROUP BY status' }
        ];
      default:
        return [
          { name: 'Health Check', method: 'GET', endpoint: '/health' },
          { name: 'List Data', method: 'GET', endpoint: '/api/data' },
          { name: 'JsonPlaceholder Posts', method: 'GET', endpoint: 'https://jsonplaceholder.typicode.com/posts' },
          { name: 'Full URL Example', method: 'GET', endpoint: 'https://api.example.com/data' }
        ];
    }
  };

  const executeQuery = async () => {
    setTesting(true);
    const startTime = Date.now();

    try {
      // Parse JSON inputs
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

      // Build request configuration based on query type
      const requestConfig = {
        systemId: system.id,
        queryType,
        method: queryMethod,
        endpoint: queryEndpoint,
        query: queryText,
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
        const testResult: TestResult = {
          success: true,
          data: result.data,
          metadata: {
            executionTime,
            method: queryMethod,
            systemName: system.displayName
          }
        };
        
        setLastResult(testResult);
        onTestComplete(testResult);
      } else {
        const testResult: TestResult = {
          success: false,
          metadata: {
            executionTime,
            method: queryMethod,
            systemName: system.displayName
          },
          error: {
            code: result.code || 'QUERY_ERROR',
            message: result.message || 'Query failed'
          }
        };
        
        setLastResult(testResult);
        onTestComplete(testResult);
      }
    } catch (error: any) {
      const testResult: TestResult = {
        success: false,
        metadata: {
          executionTime: Date.now() - startTime,
          method: queryMethod,
          systemName: system.displayName
        },
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message
        }
      };
      
      setLastResult(testResult);
      onTestComplete(testResult);
    } finally {
      setTesting(false);
    }
  };

  const applyTemplate = (template: any) => {
    if (template.query) {
      setQueryText(template.query);
    } else {
      setQueryMethod(template.method);
      setQueryEndpoint(template.endpoint);
      setQueryParams(template.params || '{}');
      setQueryHeaders(template.headers || '{}');
      setQueryBody(template.body || '');
    }
  };

  const getRecordCount = (data: any): number => {
    if (Array.isArray(data)) return data.length;
    if (data && typeof data === 'object') {
      if (data.results && Array.isArray(data.results)) return data.results.length;
      if (data.data && Array.isArray(data.data)) return data.data.length;
      if (data.items && Array.isArray(data.items)) return data.items.length;
      return 1;
    }
    return 0;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Advanced Query Testing
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test queries against {system.displayName} with advanced result analysis and limiting
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Method Selection */}
        {availableMethods.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Configured Query Methods</Label>
            <div className="flex gap-2 mt-2">
              {availableMethods.map(([methodName, config]) => (
                <Button
                  key={methodName}
                  variant={selectedMethodName === methodName ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedMethodName(methodName);
                    loadMethod(methodName);
                  }}
                  className="text-xs"
                >
                  {methodName} ({config.type})
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Query Type Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Query Type</Label>
            <Select value={queryType} onValueChange={(value: any) => setQueryType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REST">REST API</SelectItem>
                <SelectItem value="JQL">Jira JQL</SelectItem>
                <SelectItem value="AQL">QRadar AQL</SelectItem>
                <SelectItem value="SPL">Splunk SPL</SelectItem>
                <SelectItem value="PromQL">Prometheus PromQL</SelectItem>
                <SelectItem value="GraphQL">GraphQL</SelectItem>
                <SelectItem value="SQL">SQL</SelectItem>
                <SelectItem value="Custom">Custom Query Language</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quick Templates</Label>
            <Select onValueChange={(value) => {
              const templates = getQueryTemplates(queryType);
              const template = templates[parseInt(value)];
              if (template) applyTemplate(template);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose template" />
              </SelectTrigger>
              <SelectContent>
                {getQueryTemplates(queryType).map((template, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* REST API Configuration */}
        {queryType === 'REST' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>HTTP Method</Label>
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
              <div>
                <Label>URL Path</Label>
                <Input
                  value={queryEndpoint}
                  onChange={(e) => setQueryEndpoint(e.target.value)}
                  placeholder="Leave empty to use base URL, or /posts, or full URL"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Can be: empty (uses base URL), relative path (/posts), or full URL (https://example.com/api/data)
                </p>
              </div>
            </div>
            
            {/* Full URL Preview */}
            <div>
              <Label>Complete URL Preview</Label>
              <div className="p-2 bg-muted rounded border text-sm font-mono">
                {queryEndpoint.startsWith('http') 
                  ? queryEndpoint 
                  : `${system.baseUrl}${queryEndpoint || ''}`
                }
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This is the actual URL that will be called
              </p>
            </div>
          </div>
        )}

        {/* Text Query for JQL, AQL, SPL, PromQL, GraphQL, SQL, Custom */}
        {queryType !== 'REST' && (
          <div>
            <Label>
              {queryType === 'JQL' && 'JQL Query'}
              {queryType === 'AQL' && 'AQL Query'}
              {queryType === 'SPL' && 'SPL Search'}
              {queryType === 'PromQL' && 'PromQL Query'}
              {queryType === 'GraphQL' && 'GraphQL Query'}
              {queryType === 'SQL' && 'SQL Query'}
              {queryType === 'Custom' && 'Custom Query'}
            </Label>
            <Textarea
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder={
                queryType === 'JQL' ? 'project = "PROJECT" AND assignee = currentUser() ORDER BY created DESC' :
                queryType === 'AQL' ? 'SELECT sourceip, destinationip, eventcount(*) FROM events WHERE eventtime > 1692892800000 GROUP BY sourceip, destinationip' :
                queryType === 'SPL' ? 'index=main sourcetype=access_combined | stats count by host | sort -count' :
                queryType === 'PromQL' ? 'rate(http_requests_total[5m])' :
                queryType === 'GraphQL' ? 'query {\n  users {\n    id\n    name\n    email\n  }\n}' :
                queryType === 'SQL' ? 'SELECT * FROM events WHERE timestamp > NOW() - INTERVAL 1 HOUR ORDER BY timestamp DESC LIMIT 100' :
                'Enter your custom query here'
              }
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {queryType === 'JQL' && 'Use Jira Query Language to search issues, projects, and boards'}
              {queryType === 'AQL' && 'Use QRadar Ariel Query Language for security event analysis'}
              {queryType === 'SPL' && 'Use Splunk Search Processing Language for log analysis'}
              {queryType === 'PromQL' && 'Use Prometheus Query Language for metrics analysis'}
              {queryType === 'GraphQL' && 'Define your GraphQL query with fields and operations'}
              {queryType === 'SQL' && 'Standard SQL query for database operations'}
              {queryType === 'Custom' && 'Enter your custom query language syntax'}
            </p>
          </div>
        )}

        {/* Result Limiting and Timeout */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Result Limit</Label>
            <Input
              type="number"
              value={resultLimit}
              onChange={(e) => setResultLimit(parseInt(e.target.value) || 100)}
              min="1"
              max="10000"
              placeholder="100"
            />
            <p className="text-xs text-muted-foreground mt-1">Maximum records to return</p>
          </div>
          <div>
            <Label>Timeout (seconds)</Label>
            <Input
              type="number"
              value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 30)}
              min="1"
              max="300"
              placeholder="30"
            />
            <p className="text-xs text-muted-foreground mt-1">Query execution timeout</p>
          </div>
        </div>

        {/* Parameters and Headers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Query Parameters (JSON)</Label>
            <Textarea
              value={queryParams}
              onChange={(e) => setQueryParams(e.target.value)}
              placeholder='{"limit": 100, "offset": 0}'
              rows={3}
              className="font-mono text-sm"
            />
          </div>
          <div>
            <Label>Headers (JSON)</Label>
            <Textarea
              value={queryHeaders}
              onChange={(e) => setQueryHeaders(e.target.value)}
              placeholder='{"Content-Type": "application/json"}'
              rows={3}
              className="font-mono text-sm"
            />
          </div>
        </div>

        {/* Request Body */}
        {(queryMethod === 'POST' || queryMethod === 'PUT') && (
          <div>
            <Label>Request Body</Label>
            <Textarea
              value={queryBody}
              onChange={(e) => setQueryBody(e.target.value)}
              placeholder='{"key": "value"}'
              rows={4}
              className="font-mono text-sm"
            />
          </div>
        )}

        {/* Execute Button */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button onClick={executeQuery} disabled={testing} className="flex items-center gap-2">
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {testing ? 'Executing...' : 'Execute Query'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedMethodName('');
                setQueryType('REST');
                setQueryMethod('GET');
                setQueryEndpoint('');
                setQueryText('');
                setQueryParams('{}');
                setQueryHeaders('{}');
                setQueryBody('');
                setLastResult(null);
              }}
            >
              Clear
            </Button>
          </div>
          {lastResult && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={lastResult.success ? "default" : "destructive"}>
                {lastResult.success ? "Success" : "Failed"}
              </Badge>
              <span className="text-muted-foreground">
                {lastResult.metadata?.executionTime}ms
              </span>
            </div>
          )}
        </div>

        {/* Results Display */}
        {lastResult && (
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Query Results</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {lastResult.success ? (
                <div className="space-y-4">
                  {/* Metadata */}
                  <div className="grid grid-cols-4 gap-4 p-3 bg-muted rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="font-medium">Execution Time</p>
                        <p className="text-muted-foreground">{lastResult.metadata?.executionTime}ms</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="font-medium">Records</p>
                        <p className="text-muted-foreground">{getRecordCount(lastResult.data)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="font-medium">Status</p>
                        <p className="text-muted-foreground">Success</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="font-medium">Size</p>
                        <p className="text-muted-foreground">
                          {(JSON.stringify(lastResult.data).length / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Data Preview */}
                  <div>
                    <Label className="text-sm font-medium">Response Data</Label>
                    <ScrollArea className="h-96 w-full border rounded-md mt-2">
                      <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                        {JSON.stringify(lastResult.data, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <h4 className="font-medium text-destructive">Query Failed</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {lastResult.error?.message}
                    </p>
                    {lastResult.error?.code && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Error Code: {lastResult.error.code}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}