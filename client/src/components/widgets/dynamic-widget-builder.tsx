import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Save, 
  Play, 
  Settings, 
  Eye, 
  Code, 
  BarChart3, 
  PieChart, 
  LineChart, 
  Table, 
  Gauge,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
  Copy,
  RefreshCw
} from 'lucide-react';

interface Plugin {
  systemName: string;
  displayName: string;
  instanceCount: number;
  defaultQueries: DefaultQuery[];
  config: {
    instances: PluginInstance[];
  };
}

interface PluginInstance {
  id: string;
  name: string;
  isActive: boolean;
  tags?: string[];
}

interface DefaultQuery {
  id: string;
  description: string;
  method: string;
  path: string;
  parameters?: Record<string, any>;
}

interface CustomWidget {
  id?: string;
  name: string;
  description: string;
  pluginName: string;
  instanceId: string;
  queryType: 'default' | 'custom';
  queryId?: string; // For default queries
  customQuery?: string; // For custom queries
  queryMethod: string;
  queryParameters: Record<string, any>;
  displayType: 'table' | 'chart' | 'metric' | 'list' | 'gauge' | 'query';
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  refreshInterval: number; // seconds
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
}

interface DynamicWidgetBuilderProps {
  onSave: (widget: CustomWidget) => void;
  onCancel: () => void;
  editingWidget?: CustomWidget;
  placement?: 'client-details' | 'global-dashboard' | 'custom';
  clientContext?: {
    clientShortName: string;
    clientName: string;
    clientDomain?: string;
  };
}

export const DynamicWidgetBuilder: React.FC<DynamicWidgetBuilderProps> = ({
  onSave,
  onCancel,
  editingWidget,
  placement = 'client-details',
  clientContext
}) => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('basic');

  const [widget, setWidget] = useState<CustomWidget>({
    name: '',
    description: '',
    pluginName: '',
    instanceId: '',
    queryType: 'default',
    queryMethod: 'GET',
    queryParameters: {},
    displayType: 'table',
    refreshInterval: 30,
    placement: placement,
    styling: {
      width: 'full',
      height: 'medium',
      showBorder: true,
      showHeader: true
    }
  });

  // Load plugins on component mount
  useEffect(() => {
    loadPlugins();
    if (editingWidget) {
      setWidget(editingWidget);
    }
  }, [editingWidget]);

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/plugins');
      const data = await response.json();
      
      if (data.success) {
        setPlugins(data.plugins);
      }
    } catch (error) {
      console.error('Failed to load plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedPlugin = plugins.find(p => p.systemName === widget.pluginName);
  const selectedInstance = selectedPlugin?.config.instances.find(i => i.id === widget.instanceId);

  const handleTestQuery = async () => {
    if (!widget.pluginName || !widget.instanceId) {
      alert('Please select a plugin and instance first');
      return;
    }

    try {
      setLoading(true);
      setTestResult(null);

      let endpoint = '';
      let body = null;

      // Build query parameters including client context
      const queryParams = {
        ...widget.queryParameters,
        ...(clientContext && { 
          clientShortName: clientContext.clientShortName,
          clientName: clientContext.clientName,
          ...(clientContext.clientDomain && { clientDomain: clientContext.clientDomain })
        })
      };

      if (widget.queryType === 'default' && widget.queryId) {
        endpoint = `/api/plugins/${widget.pluginName}/instances/${widget.instanceId}/default-query/${widget.queryId}`;
        if (Object.keys(queryParams).length > 0) {
          body = { parameters: queryParams };
        }
      } else if (widget.queryType === 'custom' && widget.customQuery) {
        endpoint = `/api/plugins/${widget.pluginName}/instances/${widget.instanceId}/custom-query`;
        body = {
          query: widget.customQuery,
          method: widget.queryMethod,
          parameters: queryParams
        };
      } else {
        throw new Error('Please configure a query first');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : null
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Test failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!widget.name || !widget.pluginName || !widget.instanceId) {
      alert('Please fill in all required fields');
      return;
    }

    if (widget.queryType === 'default' && !widget.queryId) {
      alert('Please select a default query');
      return;
    }

    if (widget.queryType === 'custom' && !widget.customQuery) {
      alert('Please enter a custom query');
      return;
    }

    onSave(widget);
  };

  const addParameter = () => {
    const key = prompt('Parameter name:');
    const value = prompt('Parameter value:');
    if (key && value) {
      setWidget({
        ...widget,
        queryParameters: {
          ...widget.queryParameters,
          [key]: value
        }
      });
    }
  };

  const removeParameter = (key: string) => {
    const newParams = { ...widget.queryParameters };
    delete newParams[key];
    setWidget({
      ...widget,
      queryParameters: newParams
    });
  };

  // Helper function to get system-specific query examples
  const getSystemSpecificExamples = (systemName: string) => {
    const examples: Record<string, { language: string; examples: string[] }> = {
      jira: {
        language: 'JQL (Jira Query Language)',
        examples: [
          'project = "${clientShortName}" AND status != Done',
          'assignee = currentUser() AND project = "${clientShortName}"',
          'created >= -7d AND project = "${clientShortName}" ORDER BY created DESC'
        ]
      },
      splunk: {
        language: 'SPL (Search Processing Language)',
        examples: [
          'index=main client="${clientShortName}" | stats count by sourcetype',
          'index=security client="${clientShortName}" earliest=-24h | head 100',
          'search index=main "${clientName}" | timechart count by host'
        ]
      },
      qradar: {
        language: 'AQL (Ariel Query Language)',
        examples: [
          'SELECT * FROM events WHERE "Client Name" = \'${clientName}\' LAST 24 HOURS',
          'SELECT sourceip, count(*) FROM events WHERE "Client" = \'${clientShortName}\' GROUP BY sourceip',
          'SELECT * FROM offenses WHERE "Client Domain" ILIKE \'%${clientDomain}%\''
        ]
      },
      elasticsearch: {
        language: 'Elasticsearch Query DSL',
        examples: [
          '{"query": {"match": {"client.short_name": "${clientShortName}"}}}',
          '{"query": {"bool": {"must": [{"term": {"client": "${clientShortName}"}}, {"range": {"@timestamp": {"gte": "now-1d"}}}]}}}',
          '{"query": {"wildcard": {"client.domain": "*${clientDomain}*"}}}'
        ]
      },
      grafana: {
        language: 'PromQL/SQL (depends on data source)',
        examples: [
          'up{client="${clientShortName}"}',
          'rate(http_requests_total{client="${clientShortName}"}[5m])',
          'SELECT * FROM metrics WHERE client = \'${clientShortName}\' AND time > now() - 1h'
        ]
      },
      fortigate: {
        language: 'FortiGate API Paths',
        examples: [
          '/api/v2/monitor/system/status',
          '/api/v2/monitor/firewall/policy?client=${clientShortName}',
          '/api/v2/monitor/log/traffic?filter=client=="${clientShortName}"'
        ]
      }
    };

    return examples[systemName] || {
      language: 'System-specific query language',
      examples: [
        'Use ${clientShortName} for client identifier',
        'Use ${clientName} for full client name',
        'Use ${clientDomain} for client domain (if available)'
      ]
    };
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="query">Query Config</TabsTrigger>
          <TabsTrigger value="display">Display Options</TabsTrigger>
          <TabsTrigger value="preview">Preview & Test</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Widget Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="widget-name">Widget Name *</Label>
                  <Input
                    id="widget-name"
                    value={widget.name}
                    onChange={(e) => setWidget({ ...widget, name: e.target.value })}
                    placeholder="e.g., Client Security Alerts"
                  />
                </div>
                <div>
                  <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
                  <Input
                    id="refresh-interval"
                    type="number"
                    value={widget.refreshInterval}
                    onChange={(e) => setWidget({ ...widget, refreshInterval: parseInt(e.target.value) || 30 })}
                    min="10"
                    max="3600"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="widget-description">Description</Label>
                <Textarea
                  id="widget-description"
                  value={widget.description}
                  onChange={(e) => setWidget({ ...widget, description: e.target.value })}
                  placeholder="Describe what this widget displays..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="plugin-select">Plugin *</Label>
                  <Select
                    value={widget.pluginName}
                    onValueChange={(value) => setWidget({ ...widget, pluginName: value, instanceId: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plugin" />
                    </SelectTrigger>
                    <SelectContent>
                      {plugins.map((plugin) => (
                        <SelectItem key={plugin.systemName} value={plugin.systemName}>
                          {plugin.displayName || plugin.systemName} ({plugin.instanceCount} instances)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="instance-select">Instance *</Label>
                  <Select
                    value={widget.instanceId}
                    onValueChange={(value) => setWidget({ ...widget, instanceId: value })}
                    disabled={!selectedPlugin}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an instance" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedPlugin?.config.instances.map((instance) => (
                        <SelectItem key={instance.id} value={instance.id}>
                          {instance.name} {!instance.isActive && '(Inactive)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="placement">Widget Placement</Label>
                <Select
                  value={widget.placement}
                  onValueChange={(value: any) => setWidget({ ...widget, placement: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client-details">Client Details Pages</SelectItem>
                    <SelectItem value="global-dashboard">Global Dashboard</SelectItem>
                    <SelectItem value="custom">Custom Placement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="query" className="space-y-4">
          {/* Client Context Info */}
          {clientContext && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Client Context Available:</strong> Your queries can use these variables:
                <div className="mt-2 space-y-1 text-sm font-mono">
                  <div>• clientShortName = "{clientContext.clientShortName}"</div>
                  <div>• clientName = "{clientContext.clientName}"</div>
                  {clientContext.clientDomain && (
                    <div>• clientDomain = "{clientContext.clientDomain}"</div>
                  )}
                </div>
                
                {/* System-specific examples */}
                {selectedPlugin && (
                  <div className="mt-3 p-3 bg-white rounded border">
                    <div className="text-sm font-medium text-blue-900 mb-2">
                      {getSystemSpecificExamples(selectedPlugin.systemName).language} Examples:
                    </div>
                    <div className="space-y-1 text-xs font-mono text-gray-700">
                      {getSystemSpecificExamples(selectedPlugin.systemName).examples.map((example, index) => (
                        <div key={index} className="bg-gray-50 p-2 rounded border">
                          {example}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-2 text-xs">
                  These variables are automatically injected into your queries. Use the ${'{variable}'} syntax to reference them.
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Query Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Query Type</Label>
                <div className="flex space-x-4 mt-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={widget.queryType === 'default'}
                      onChange={() => setWidget({ ...widget, queryType: 'default', customQuery: '' })}
                    />
                    <span>Use Default Query</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={widget.queryType === 'custom'}
                      onChange={() => setWidget({ ...widget, queryType: 'custom', queryId: '' })}
                    />
                    <span>Write Custom Query</span>
                  </label>
                </div>
              </div>

              {widget.queryType === 'default' && selectedPlugin && (
                <div>
                  <Label htmlFor="default-query">Default Query</Label>
                  <Select
                    value={widget.queryId || ''}
                    onValueChange={(value) => setWidget({ ...widget, queryId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a default query" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedPlugin.defaultQueries.map((query) => (
                        <SelectItem key={query.id} value={query.id}>
                          {query.description} ({query.method})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {widget.queryType === 'custom' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3">
                      <Label htmlFor="custom-query">Custom Query</Label>
                      <Textarea
                        id="custom-query"
                        value={widget.customQuery || ''}
                        onChange={(e) => setWidget({ ...widget, customQuery: e.target.value })}
                        placeholder={selectedPlugin ? 
                          `Enter your ${getSystemSpecificExamples(selectedPlugin.systemName).language} query here...` : 
                          "Enter your query here..."
                        }
                        rows={4}
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor="query-method">Method</Label>
                      <Select
                        value={widget.queryMethod}
                        onValueChange={(value) => setWidget({ ...widget, queryMethod: value })}
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
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <Label>Query Parameters</Label>
                  <Button variant="outline" size="sm" onClick={addParameter}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Parameter
                  </Button>
                </div>
                <div className="space-y-2 mt-2">
                  {Object.entries(widget.queryParameters).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Input value={key} disabled className="flex-1" />
                      <Input 
                        value={String(value)} 
                        onChange={(e) => setWidget({
                          ...widget,
                          queryParameters: {
                            ...widget.queryParameters,
                            [key]: e.target.value
                          }
                        })}
                        className="flex-1" 
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeParameter(key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {Object.keys(widget.queryParameters).length === 0 && (
                    <p className="text-sm text-gray-500">No parameters configured</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="display" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Display Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="display-type">Display Type</Label>
                  <Select
                    value={widget.displayType}
                    onValueChange={(value: any) => setWidget({ ...widget, displayType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table">
                        <div className="flex items-center">
                          <Table className="h-4 w-4 mr-2" />
                          Table
                        </div>
                      </SelectItem>
                      <SelectItem value="chart">
                        <div className="flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Chart
                        </div>
                      </SelectItem>
                      <SelectItem value="metric">
                        <div className="flex items-center">
                          <Gauge className="h-4 w-4 mr-2" />
                          Metric/KPI
                        </div>
                      </SelectItem>
                      <SelectItem value="list">
                        <div className="flex items-center">
                          <Code className="h-4 w-4 mr-2" />
                          List
                        </div>
                      </SelectItem>
                      <SelectItem value="query">
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 mr-2" />
                          Raw Query Results
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {widget.displayType === 'chart' && (
                  <div>
                    <Label htmlFor="chart-type">Chart Type</Label>
                    <Select
                      value={widget.chartType || 'bar'}
                      onValueChange={(value: any) => setWidget({ ...widget, chartType: value })}
                    >
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="widget-width">Width</Label>
                  <Select
                    value={widget.styling.width}
                    onValueChange={(value: any) => setWidget({
                      ...widget,
                      styling: { ...widget.styling, width: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Width</SelectItem>
                      <SelectItem value="half">Half Width</SelectItem>
                      <SelectItem value="third">One Third</SelectItem>
                      <SelectItem value="quarter">Quarter Width</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="widget-height">Height</Label>
                  <Select
                    value={widget.styling.height}
                    onValueChange={(value: any) => setWidget({
                      ...widget,
                      styling: { ...widget.styling, height: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small (200px)</SelectItem>
                      <SelectItem value="medium">Medium (300px)</SelectItem>
                      <SelectItem value="large">Large (400px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Display Options</Label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={widget.styling.showBorder}
                      onChange={(e) => setWidget({
                        ...widget,
                        styling: { ...widget.styling, showBorder: e.target.checked }
                      })}
                    />
                    <span>Show Border</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={widget.styling.showHeader}
                      onChange={(e) => setWidget({
                        ...widget,
                        styling: { ...widget.styling, showHeader: e.target.checked }
                      })}
                    />
                    <span>Show Header</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test & Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Button onClick={handleTestQuery} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  Test Query
                </Button>
                <Button variant="outline" onClick={() => setTestResult(null)}>
                  Clear Results
                </Button>
              </div>

              {testResult && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center space-x-2">
                      {testResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {testResult.success ? 'Query executed successfully' : 'Query failed'}
                      </span>
                    </div>
                    {testResult.error && (
                      <p className="text-red-700 mt-2">{testResult.error}</p>
                    )}
                  </div>

                  {testResult.success && testResult.data && (
                    <div>
                      <Label>Query Results</Label>
                      <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64 mt-2">
                        {JSON.stringify(testResult.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Widget
        </Button>
      </div>
    </div>
  );
}; 