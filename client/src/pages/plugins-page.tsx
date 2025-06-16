import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plug, Plus, Trash2, Edit3, AlertCircle, Activity, PlayCircle, TestTube, Settings, Power, PowerOff, Edit, Save, X, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Plugin interfaces for the new architecture
interface PluginInstance {
  id: string;
  name: string;
  baseUrl: string;
  authType: 'none' | 'basic' | 'bearer' | 'api_key';
  authConfig?: {
    username?: string;
    password?: string;
    token?: string;
    key?: string;
    header?: string;
  };
  isActive: boolean;
  tags?: string[];
  sslConfig?: {
    rejectUnauthorized?: boolean;
    allowSelfSigned?: boolean;
    timeout?: number;
  };
}

interface Plugin {
  systemName: string;
  config: {
    instances: PluginInstance[];
    defaultRefreshInterval?: number;
    rateLimiting?: {
      requestsPerMinute: number;
      burstSize: number;
    };
  };
  defaultQueries?: Array<{
    id: string;
    method: string;
    path: string;
    description: string;
  }>;
}

interface PluginTestResult {
  success: boolean;
  status?: 'inactive' | 'configured' | 'connected';
  message?: string;
  responseTime?: number;
  statusCode?: number;
  error?: string;
  connected?: boolean;
}

function TestConnectionButton({ pluginName, instanceId }: { pluginName: string; instanceId: string }) {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch(`/api/plugins/${pluginName}/instances/${instanceId}/test-connection`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) {
        // Handle HTTP errors
        const errorText = await res.text();
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          // Use the raw text if it's not JSON
          errorMessage = errorText || errorMessage;
        }
        
        toast({
          title: "Connection Test Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
      
      const result: PluginTestResult = await res.json();
      
      if (result.success) {
        const description = result.responseTime 
          ? `Connected to ${pluginName} instance in ${result.responseTime}` 
          : `Connected to ${pluginName} instance`;
          
        toast({
          title: "✅ Connection Successful",
          description: result.message || description,
        });
      } else {
        // Handle different types of failures
        let title = "❌ Connection Failed";
        let description = result.message || "Unknown error";
        
        if (result.status === 'inactive') {
          title = "⚠️ Instance Inactive";
          description = result.message || "This instance is currently disabled";
        } else if (result.status === 'configured') {
          title = "⚠️ Limited Test";
          description = result.message || "Instance configured but no test queries available";
        }
        
        toast({
          title,
          description,
          variant: result.status === 'inactive' ? "default" : "destructive",
        });
      }
    } catch (error) {
      console.error('Test connection error:', error);
      toast({
        title: "❌ Test Failed",
        description: error instanceof Error ? error.message : "Network error occurred",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={testConnection}
      disabled={testing}
      className="flex items-center gap-2"
    >
      {testing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <TestTube className="w-4 h-4" />
      )}
      {testing ? "Testing..." : "Test"}
    </Button>
  );
}

function QueryRunner({ pluginName, instanceId }: { pluginName: string; instanceId: string }) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("GET");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { data: defaultQueries = [] } = useQuery({
    queryKey: ["plugin-queries", pluginName],
    queryFn: async () => {
      const res = await fetch(`/api/plugins/${pluginName}/queries`, { 
        credentials: "include" 
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.queries || [];
    },
  });

  const runQuery = async () => {
    if (!query.trim()) {
      toast({
        title: "Query Required",
        description: "Please enter a query to execute",
        variant: "destructive",
      });
      return;
    }

    setRunning(true);
    try {
      const res = await fetch(`/api/plugins/${pluginName}/instances/${instanceId}/query`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, method })
      });
      
      const queryResult = await res.json();
      setResult(queryResult);
      
      if (queryResult.success) {
        toast({
          title: "Query Executed",
          description: `Query completed in ${queryResult.metadata?.executionTime}ms`,
        });
      } else {
        toast({
          title: "Query Failed",
          description: queryResult.message || "Query execution failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Execution Failed",
        description: error instanceof Error ? error.message : "Network error",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const useDefaultQuery = (defaultQuery: any) => {
    setQuery(defaultQuery.id);
    setMethod(defaultQuery.method);
  };

  return (
    <div className="space-y-3">
      {defaultQueries && defaultQueries.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Default Queries</label>
          <div className="flex flex-wrap gap-1">
            {defaultQueries.map((dq: any) => (
              <Button
                key={dq.id}
                variant="outline"
                size="sm"
                onClick={() => useDefaultQuery(dq)}
                className="text-xs px-2 py-1 h-auto"
              >
                {dq.description}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Custom Query</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-full sm:w-20"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
          <Input
            placeholder="Enter query..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm"
          />
          <Button onClick={runQuery} disabled={running} size="sm" className="w-full sm:w-auto">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            <span className="ml-1 hidden sm:inline">Run</span>
          </Button>
        </div>
      </div>

      {result && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Result</label>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-48 border">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function PluginsPage() {
  const { data: plugins = [], isLoading, error, refetch } = useQuery<Plugin[]>({
    queryKey: ["plugins"],
    queryFn: async () => {
      const res = await fetch("/api/plugins", { credentials: "include" });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to fetch plugins");
      }
      const data = await res.json();
      return data.plugins || []; // Extract plugins array from response object
    },
  });

  // Fetch available plugin types for creating new instances
  const { data: pluginTypes = [] } = useQuery({
    queryKey: ["plugin-types"],
    queryFn: async () => {
      const res = await fetch("/api/plugins/types", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch plugin types");
      const data = await res.json();
      return data.pluginTypes || [];
    },
  });

  const [selectedPluginType, setSelectedPluginType] = useState('');
  const [showAddInstanceDialog, setShowAddInstanceDialog] = useState(false);
  const [editingInstance, setEditingInstance] = useState<PluginInstance | null>(null);
  const [testResults, setTestResults] = useState<Record<string, PluginTestResult>>({});
  const [testing, setTesting] = useState<{ plugin: string; instance: string } | null>(null);
  const { toast } = useToast();

  const loadPlugins = async () => {
    refetch();
  };

  const handleInstanceUpdate = async (pluginName: string, instanceId: string, updateData: Partial<PluginInstance>) => {
    try {
      const response = await fetch(`/api/plugins/instances/${pluginName}/${instanceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      
      if (result.success) {
        await loadPlugins();
        setEditingInstance(null);
        toast({
          title: "Instance Updated",
          description: `${instanceId} configuration has been updated.`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update instance configuration",
        variant: "destructive"
      });
    }
  };

  const handleInstanceToggle = async (pluginName: string, instanceId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/plugins/instances/${pluginName}/${instanceId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive })
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh plugins to show updated status
        await loadPlugins();
        toast({
          title: isActive ? "Instance Activated" : "Instance Deactivated",
          description: `${instanceId} is now ${isActive ? 'active' : 'inactive'}.`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: "Toggle Failed",
        description: error instanceof Error ? error.message : "Failed to toggle instance status",
        variant: "destructive"
      });
    }
  };

  const handleTestConnection = async (pluginName: string, instanceId: string) => {
    setTesting({ plugin: pluginName, instance: instanceId });
    
    try {
      const response = await fetch(`/api/plugins/instances/${pluginName}/${instanceId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      setTestResults(prev => ({
        ...prev,
        [`${pluginName}-${instanceId}`]: result
      }));

      toast({
        title: result.connected ? "Connection Successful" : "Connection Failed",
        description: result.message,
        variant: result.connected ? "default" : "destructive"
      });
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [`${pluginName}-${instanceId}`]: {
          success: false,
          connected: false,
          message: "Test failed"
        }
      }));
      
      toast({
        title: "Test Failed",
        description: "Failed to test connection",
        variant: "destructive"
      });
    } finally {
      setTesting(null);
    }
  };

  const handleCreateInstance = async (instanceData: any) => {
    try {
      const response = await fetch(`/api/plugins/instances/${selectedPluginType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(instanceData)
      });

      const result = await response.json();
      
      if (result.success) {
        await loadPlugins();
        setShowAddInstanceDialog(false);
        setSelectedPluginType('');
        toast({
          title: "Instance Created",
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create instance",
        variant: "destructive"
      });
    }
  };

  const handleDeleteInstance = async (pluginName: string, instanceId: string, instanceName: string) => {
    if (!window.confirm(`Are you sure you want to delete the instance "${instanceName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/plugins/instances/${pluginName}/${instanceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        await loadPlugins();
        toast({
          title: "Instance Deleted",
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete instance",
        variant: "destructive"
      });
    }
  };

  const getInstanceStatusIcon = (instance: PluginInstance) => {
    const testKey = `${plugins.find(p => p.config.instances.includes(instance))?.systemName}-${instance.id}`;
    const testResult = testResults[testKey];
    
    if (testing?.instance === instance.id) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    
    if (testResult) {
      if (testResult.connected) {
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      } else {
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      }
    }
    
    if (instance.isActive) {
      return <Power className="h-4 w-4 text-green-500" />;
    } else {
      return <PowerOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const InstanceConfigDialog = ({ instance, pluginName }: { instance: PluginInstance, pluginName: string }) => {
    const [formData, setFormData] = useState<PluginInstance>(instance);
    
    const handleSave = () => {
      handleInstanceUpdate(pluginName, instance.id, formData);
    };

    return (
      <Dialog open={editingInstance?.id === instance.id} onOpenChange={() => setEditingInstance(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure {instance.name}</DialogTitle>
            <DialogDescription>
              Update the configuration settings for this plugin instance.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Instance Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input
                  id="baseUrl"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  placeholder="https://api.example.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="authType">Authentication Type</Label>
              <select
                id="authType"
                value={formData.authType}
                onChange={(e) => setFormData({ ...formData, authType: e.target.value as any })}
                className="w-full p-2 border rounded"
              >
                <option value="none">None</option>
                <option value="basic">Basic Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="api_key">API Key</option>
              </select>
            </div>

            {formData.authType === 'basic' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.authConfig?.username || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      authConfig: { ...formData.authConfig, username: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.authConfig?.password || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      authConfig: { ...formData.authConfig, password: e.target.value }
                    })}
                  />
                </div>
              </div>
            )}

            {formData.authType === 'bearer' && (
              <div>
                <Label htmlFor="token">Bearer Token</Label>
                <Input
                  id="token"
                  type="password"
                  value={formData.authConfig?.token || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    authConfig: { ...formData.authConfig, token: e.target.value }
                  })}
                />
              </div>
            )}

            {formData.authType === 'api_key' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="key">API Key</Label>
                  <Input
                    id="key"
                    type="password"
                    value={formData.authConfig?.key || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      authConfig: { ...formData.authConfig, key: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="header">Header Name</Label>
                  <Input
                    id="header"
                    value={formData.authConfig?.header || 'Authorization'}
                    onChange={(e) => setFormData({
                      ...formData,
                      authConfig: { ...formData.authConfig, header: e.target.value }
                    })}
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags?.join(', ') || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                })}
                placeholder="production, firewall, security"
              />
            </div>

            {/* SSL/TLS Configuration */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">SSL/TLS Configuration</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={!formData.sslConfig?.rejectUnauthorized}
                    onCheckedChange={(checked) => setFormData({ 
                      ...formData, 
                      sslConfig: { 
                        ...formData.sslConfig,
                        rejectUnauthorized: !checked,
                        allowSelfSigned: checked
                      }
                    })}
                  />
                  <Label>Allow Self-Signed Certificates</Label>
                  <span className="text-sm text-gray-500">(Disable SSL verification)</span>
                </div>
                
                <div>
                  <Label htmlFor="edit-timeout">Connection Timeout (ms)</Label>
                  <Input
                    id="edit-timeout"
                    type="number"
                    value={formData.sslConfig?.timeout || 30000}
                    onChange={(e) => setFormData({
                      ...formData,
                      sslConfig: { ...formData.sslConfig, timeout: parseInt(e.target.value) || 30000 }
                    })}
                    placeholder="30000"
                    min="1000"
                    max="300000"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Timeout for HTTP requests (1-300 seconds)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Active</Label>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingInstance(null)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleSave} className="w-full sm:w-auto">
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (isLoading) {
    return (
      <AppLayout title="Plugin Management">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Plugin Management">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <p className="text-red-600">Failed to load plugins</p>
            <p className="text-sm text-gray-500">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const totalInstances = plugins.reduce((sum, plugin) => sum + plugin.config.instances.length, 0);
  const activeInstances = plugins.reduce((sum, plugin) => 
    sum + plugin.config.instances.filter(i => i.isActive).length, 0
  );

  return (
    <AppLayout title="Plugin Management">
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Plugin Management</h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              Manage external system connectors and test connections
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Add Instance Button */}
            <Dialog open={showAddInstanceDialog} onOpenChange={setShowAddInstanceDialog}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Instance
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Plugin Instance</DialogTitle>
                  <DialogDescription>
                    Create a new instance of a plugin to connect to an external system.
                  </DialogDescription>
                </DialogHeader>
                <AddInstanceForm 
                  pluginTypes={pluginTypes}
                  selectedPluginType={selectedPluginType}
                  setSelectedPluginType={setSelectedPluginType}
                  onSubmit={handleCreateInstance}
                  onCancel={() => {
                    setShowAddInstanceDialog(false);
                    setSelectedPluginType('');
                  }}
                />
              </DialogContent>
            </Dialog>
            
            {/* Stats */}
            <div className="flex gap-4 md:gap-6 text-sm">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-blue-600">{plugins.length}</div>
                <div className="text-gray-500 text-xs md:text-sm">Plugins</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-green-600">{activeInstances}</div>
                <div className="text-gray-500 text-xs md:text-sm">Active</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-gray-600">{totalInstances}</div>
                <div className="text-gray-500 text-xs md:text-sm">Total</div>
              </div>
            </div>
          </div>
        </div>

        {plugins.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Plug className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No Plugins Available</h3>
              <p className="text-gray-500">
                No plugins are currently registered in the system.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {plugins.map((plugin) => (
              <Card key={plugin.systemName} className="overflow-hidden flex flex-col">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg md:text-xl truncate">{plugin.systemName}</CardTitle>
                      <p className="text-gray-600 mt-1 text-sm">
                        {plugin.config.instances.length} instance{plugin.config.instances.length !== 1 ? 's' : ''} configured
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-white shrink-0 text-xs">
                      {plugin.systemName}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="p-4 md:p-6 flex-1">
                  <div className="space-y-3 md:space-y-4">
                    {plugin.config.instances.map((instance) => (
                      <div key={instance.id} className="border rounded-lg p-3 md:p-4 bg-gray-50">
                        <div className="space-y-3">
                          {/* Instance Info */}
                          <div className="flex items-start space-x-3">
                            {getInstanceStatusIcon(instance)}
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium truncate">{instance.name}</h4>
                              <p className="text-sm text-gray-600 truncate">{instance.baseUrl}</p>
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {instance.authType}
                                </Badge>
                                {instance.tags?.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons - Responsive Layout */}
                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex gap-2 flex-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTestConnection(plugin.systemName, instance.id)}
                                disabled={testing?.instance === instance.id}
                                className="flex-1 sm:flex-none"
                              >
                                {testing?.instance === instance.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <TestTube className="h-4 w-4" />
                                )}
                                <span className="ml-1 hidden sm:inline">Test</span>
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingInstance(instance)}
                                className="flex-1 sm:flex-none"
                              >
                                <Settings className="h-4 w-4" />
                                <span className="ml-1 hidden sm:inline">Config</span>
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteInstance(plugin.systemName, instance.id, instance.name)}
                                className="flex-1 sm:flex-none text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="ml-1 hidden sm:inline">Delete</span>
                              </Button>
                            </div>
                            
                            <Button
                              variant={instance.isActive ? "destructive" : "default"}
                              size="sm"
                              onClick={() => handleInstanceToggle(plugin.systemName, instance.id, !instance.isActive)}
                              className="w-full sm:w-auto"
                            >
                              {instance.isActive ? (
                                <>
                                  <PowerOff className="h-4 w-4" />
                                  <span className="ml-1">Disable</span>
                                </>
                              ) : (
                                <>
                                  <Power className="h-4 w-4" />
                                  <span className="ml-1">Enable</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Instance Configuration Dialogs */}
      {editingInstance && (
        <InstanceConfigDialog 
          instance={editingInstance} 
          pluginName={plugins.find(p => p.config.instances.some(i => i.id === editingInstance.id))?.systemName || ''} 
        />
      )}
    </AppLayout>
  );
}

// Add Instance Form Component
function AddInstanceForm({ 
  pluginTypes, 
  selectedPluginType, 
  setSelectedPluginType, 
  onSubmit, 
  onCancel 
}: {
  pluginTypes: any[];
  selectedPluginType: string;
  setSelectedPluginType: (type: string) => void;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    authType: 'none' as 'none' | 'basic' | 'bearer' | 'api_key',
    authConfig: {
      username: '',
      password: '',
      token: '',
      key: '',
      header: 'Authorization'
    },
    tags: '',
    isActive: true,
    sslConfig: {
      rejectUnauthorized: true,
      allowSelfSigned: false,
      timeout: 30000
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPluginType || !formData.name || !formData.baseUrl) {
      return;
    }

    const submitData = {
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    };

    onSubmit(submitData);
  };

  const selectedPlugin = pluginTypes.find(p => p.systemName === selectedPluginType);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="plugin-type">Plugin Type *</Label>
        <select
          id="plugin-type"
          value={selectedPluginType}
          onChange={(e) => setSelectedPluginType(e.target.value)}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select a plugin type</option>
          {pluginTypes.map((type) => (
            <option key={type.systemName} value={type.systemName}>
              {type.displayName} ({type.currentInstances} instances)
            </option>
          ))}
        </select>
        {selectedPlugin && (
          <p className="text-sm text-gray-600 mt-1">
            {selectedPlugin.description} • {selectedPlugin.defaultQueries} default queries available
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="instance-name">Instance Name *</Label>
          <Input
            id="instance-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="My Production Instance"
            required
          />
        </div>
        <div>
          <Label htmlFor="base-url">Base URL *</Label>
          <Input
            id="base-url"
            value={formData.baseUrl}
            onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
            placeholder="https://api.example.com"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="auth-type">Authentication Type</Label>
        <select
          id="auth-type"
          value={formData.authType}
          onChange={(e) => setFormData({ ...formData, authType: e.target.value as 'none' | 'basic' | 'bearer' | 'api_key' })}
          className="w-full p-2 border rounded"
        >
          <option value="none">None</option>
          <option value="basic">Basic Auth</option>
          <option value="bearer">Bearer Token</option>
          <option value="api_key">API Key</option>
        </select>
      </div>

      {formData.authType === 'basic' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={formData.authConfig.username || ''}
              onChange={(e) => setFormData({
                ...formData,
                authConfig: { ...formData.authConfig, username: e.target.value }
              })}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.authConfig.password || ''}
              onChange={(e) => setFormData({
                ...formData,
                authConfig: { ...formData.authConfig, password: e.target.value }
              })}
            />
          </div>
        </div>
      )}

      {formData.authType === 'bearer' && (
        <div>
          <Label htmlFor="token">Bearer Token</Label>
          <Input
            id="token"
            type="password"
            value={formData.authConfig.token || ''}
            onChange={(e) => setFormData({
              ...formData,
              authConfig: { ...formData.authConfig, token: e.target.value }
            })}
          />
        </div>
      )}

      {formData.authType === 'api_key' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={formData.authConfig.key || ''}
              onChange={(e) => setFormData({
                ...formData,
                authConfig: { ...formData.authConfig, key: e.target.value }
              })}
            />
          </div>
          <div>
            <Label htmlFor="header-name">Header Name</Label>
            <Input
              id="header-name"
              value={formData.authConfig.header || 'Authorization'}
              onChange={(e) => setFormData({
                ...formData,
                authConfig: { ...formData.authConfig, header: e.target.value }
              })}
            />
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="production, firewall, security"
        />
      </div>

      {/* SSL/TLS Configuration */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium mb-3">SSL/TLS Configuration</h3>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch
              checked={!formData.sslConfig.rejectUnauthorized}
              onCheckedChange={(checked) => setFormData({ 
                ...formData, 
                sslConfig: { 
                  ...formData.sslConfig, 
                  rejectUnauthorized: !checked,
                  allowSelfSigned: checked
                }
              })}
            />
            <Label>Allow Self-Signed Certificates</Label>
            <span className="text-sm text-gray-500">(Disable SSL verification for self-signed certs)</span>
          </div>
          
          <div>
            <Label htmlFor="timeout">Connection Timeout (ms)</Label>
            <Input
              id="timeout"
              type="number"
              value={formData.sslConfig.timeout}
              onChange={(e) => setFormData({
                ...formData,
                sslConfig: { ...formData.sslConfig, timeout: parseInt(e.target.value) || 30000 }
              })}
              placeholder="30000"
              min="1000"
              max="300000"
            />
            <p className="text-sm text-gray-600 mt-1">
              Timeout for HTTP requests (1-300 seconds)
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
        <Label>Start as Active</Label>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button 
          type="submit" 
          className="w-full sm:w-auto"
          disabled={!selectedPluginType || !formData.name || !formData.baseUrl}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Instance
        </Button>
      </div>
    </form>
  );
} 