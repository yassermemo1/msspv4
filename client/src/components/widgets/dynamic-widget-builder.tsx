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
import { DynamicWidgetRenderer } from './dynamic-widget-renderer';
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
  RefreshCw,
  Activity,
  TrendingUp
} from 'lucide-react';

// Define filter type for better type safety
type FilterType = {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' |
            'greater_than' | 'greater_equal' | 'less_than' | 'less_equal' | 'between' | 'in' | 'not_in' |
            'is_null' | 'is_not_null' | 'date_equals' | 'date_before' | 'date_after' | 'date_range' |
            'regex_match' | 'exists' | 'not_exists';
  value: any;
  value2?: any; // For range operators like 'between'
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'array';
  enabled: boolean;
};

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
  displayType: 'table' | 'chart' | 'metric' | 'list' | 'gauge' | 'query' | 
               'number' | 'percentage' | 'progress' | 'trend' | 'summary' | 'statistic' | 'cards';
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  refreshInterval: number; // seconds
  placement: 'client-details' | 'global-dashboard' | 'custom';
  styling: {
    width: 'full' | 'half' | 'third' | 'quarter';
    height: 'small' | 'medium' | 'large';
    showBorder: boolean;
    showHeader: boolean;
  };
  filters?: FilterType[];
  aggregation?: {
    function: 'count' | 'sum' | 'avg' | 'min' | 'max';
    field?: string;
  };
  groupBy?: {
    field: string; // X-axis field for grouping
    valueField?: string; // Y-axis field for values
    aggregationFunction?: 'count' | 'sum' | 'avg' | 'min' | 'max';
    limit?: number; // Limit number of groups
    sortBy?: 'asc' | 'desc'; // Sort groups by value
  };
  fieldSelection?: {
    enabled: boolean;
    selectedFields: string[];
    excludeNullFields?: boolean;
  };
  chainedQuery?: {
    enabled: boolean;
    lookupQuery: string; // First query to get tenant info
    lookupField: string; // Field to extract from lookup (e.g., 'id')
    targetField: string; // Where to inject in main query (e.g., 'tenantId')
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
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [databaseSchema, setDatabaseSchema] = useState<Array<{
    tableName: string;
    columns: Array<{ name: string; type: string; nullable: boolean; default: string | null }>;
  }>>([]);

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
    },
    filters: [],
    fieldSelection: {
      enabled: false,
      selectedFields: [],
      excludeNullFields: true
    }
  });

  // Load plugins on component mount
  useEffect(() => {
    loadPlugins();
    if (editingWidget) {
      console.log('🔍 BUILDER MOUNT - EditingWidget received:', editingWidget);
      console.log('🔍 BUILDER MOUNT - EditingWidget groupBy:', editingWidget.groupBy);
      
      // Ensure queryParameters is always an object
      setWidget({
        ...editingWidget,
        queryParameters: editingWidget.queryParameters || {},
        filters: editingWidget.filters || [],
        // Preserve existing groupBy configuration
        groupBy: editingWidget.groupBy || undefined
      });
      
      console.log('🔍 BUILDER MOUNT - Widget state set with groupBy:', editingWidget.groupBy);
    }
  }, [editingWidget]);

  // Load database schema when SQL plugin is selected
  useEffect(() => {
    if (widget.pluginName === 'sql') {
      loadDatabaseSchema();
    }
  }, [widget.pluginName]);

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

  const loadDatabaseSchema = async () => {
    try {
      const response = await fetch('/api/database-schema');
      const data = await response.json();
      
      if (data.tables) {
        setDatabaseSchema(data.tables);
      }
    } catch (error) {
      console.error('Failed to load database schema:', error);
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
      setAvailableFields([]); // Reset available fields

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
        endpoint = `/api/plugins/${widget.pluginName}/instances/${widget.instanceId}/query`;
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

      // Extract field names from the response data
      if (result.success && result.data) {
        const fields = extractFieldNames(result.data);
        setAvailableFields(fields);
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Test failed'
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to extract field names from response data
  const extractFieldNames = (data: any): string[] => {
    const fields = new Set<string>();

    if (Array.isArray(data)) {
      // If data is an array, extract fields from the first few items
      const sampleSize = Math.min(data.length, 10); // Sample first 10 items
      for (let i = 0; i < sampleSize; i++) {
        if (data[i] && typeof data[i] === 'object') {
          Object.keys(data[i]).forEach(key => {
            if (key && key.trim() !== '') {
              fields.add(key);
            }
          });
        }
      }
    } else if (data && typeof data === 'object') {
      // Check different possible data structures
      if (data.sampleData && Array.isArray(data.sampleData)) {
        // Jira-style response with sampleData
        const sampleSize = Math.min(data.sampleData.length, 10);
        for (let i = 0; i < sampleSize; i++) {
          if (data.sampleData[i] && typeof data.sampleData[i] === 'object') {
            Object.keys(data.sampleData[i]).forEach(key => {
              if (key && key.trim() !== '') {
                fields.add(key);
              }
            });
          }
        }
      } else if (data.results && Array.isArray(data.results)) {
        // Generic results array
        const sampleSize = Math.min(data.results.length, 10);
        for (let i = 0; i < sampleSize; i++) {
          if (data.results[i] && typeof data.results[i] === 'object') {
            Object.keys(data.results[i]).forEach(key => {
              if (key && key.trim() !== '') {
                fields.add(key);
              }
            });
          }
        }
      } else if (data.items && Array.isArray(data.items)) {
        // Items array structure
        const sampleSize = Math.min(data.items.length, 10);
        for (let i = 0; i < sampleSize; i++) {
          if (data.items[i] && typeof data.items[i] === 'object') {
            Object.keys(data.items[i]).forEach(key => {
              if (key && key.trim() !== '') {
                fields.add(key);
              }
            });
          }
        }
      } else if (data.records && Array.isArray(data.records)) {
        // Records array structure
        const sampleSize = Math.min(data.records.length, 10);
        for (let i = 0; i < sampleSize; i++) {
          if (data.records[i] && typeof data.records[i] === 'object') {
            Object.keys(data.records[i]).forEach(key => {
              if (key && key.trim() !== '') {
                fields.add(key);
              }
            });
          }
        }
      } else {
        // Direct object - extract its keys
        Object.keys(data).forEach(key => {
          // Skip metadata keys and focus on data fields
          if (key && key.trim() !== '' && !['metadata', 'timestamp', 'saved', 'totalResults', 'displayedSample'].includes(key)) {
            fields.add(key);
          }
        });
      }
    }

    // Convert to sorted array, filtering out common metadata fields and empty values
    const fieldArray = Array.from(fields).filter(field => 
      field && 
      field.trim() !== '' &&
      !['metadata', 'timestamp', 'saved', 'success', 'error', 'message'].includes(field)
    ).sort();

    return fieldArray;
  };

  const handleSave = () => {
    console.log('🔍 BUILDER SAVE - Full widget state:', widget);
    console.log('🔍 BUILDER SAVE - GroupBy configuration:', widget.groupBy);
    console.log('🔍 BUILDER SAVE - Available fields:', availableFields);
    
    // Validate required fields
    if (!widget.name.trim()) {
      alert('Please enter a widget name');
      return;
    }

    if (!widget.pluginName) {
      alert('Please select a data source');
      return;
    }

    onSave(widget);
  };

  const addParameter = () => {
    const paramName = prompt("Enter parameter name (e.g., 'reporterDomain'):");
    if (paramName && paramName.trim()) {
      setWidget({
        ...widget,
        queryParameters: {
          ...widget.queryParameters,
          [paramName.trim()]: {
            source: 'static',
            value: ''
          }
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

  // Filter management functions
  const addFilter = () => {
    if (widget.pluginName === 'sql' && databaseSchema.length > 0) {
      // For SQL plugin, just add a new empty filter
      const newFilter = {
        id: Date.now().toString(),
        field: '',
        operator: 'equals' as const,
        value: '',
        dataType: 'string' as const,
        enabled: true
      };
      
      setWidget({
        ...widget,
        filters: [...(widget.filters || []), newFilter]
      });
    } else {
      // For other plugins, use the prompt
      const fieldName = prompt("Enter field name to filter (e.g., 'status', 'priority', 'amount'):");
      if (fieldName && fieldName.trim()) {
        const newFilter = {
          id: Date.now().toString(),
          field: fieldName.trim(),
          operator: 'equals' as const,
          value: '',
          dataType: 'string' as const,
          enabled: true
        };
        
        setWidget({
          ...widget,
          filters: [...(widget.filters || []), newFilter]
        });
      }
    }
  };

  const updateFilter = (filterId: string, updates: Partial<FilterType>) => {
    setWidget({
      ...widget,
      filters: widget.filters?.map(filter => 
        filter.id === filterId ? { ...filter, ...updates } : filter
      ) || []
    });
  };

  const removeFilter = (filterId: string) => {
    setWidget({
      ...widget,
      filters: widget.filters?.filter(filter => filter.id !== filterId) || []
    });
  };

  const getOperatorsForDataType = (dataType: string) => {
    const operators = {
      string: [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'not_contains', label: 'Does Not Contain' },
        { value: 'starts_with', label: 'Starts With' },
        { value: 'ends_with', label: 'Ends With' },
        { value: 'in', label: 'In List' },
        { value: 'not_in', label: 'Not In List' },
        { value: 'is_null', label: 'Is Empty' },
        { value: 'is_not_null', label: 'Is Not Empty' },
        { value: 'regex_match', label: 'Matches Pattern' }
      ],
      number: [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not Equals' },
        { value: 'greater_than', label: 'Greater Than' },
        { value: 'greater_equal', label: 'Greater Or Equal' },
        { value: 'less_than', label: 'Less Than' },
        { value: 'less_equal', label: 'Less Or Equal' },
        { value: 'between', label: 'Between' },
        { value: 'in', label: 'In List' },
        { value: 'not_in', label: 'Not In List' },
        { value: 'is_null', label: 'Is Empty' },
        { value: 'is_not_null', label: 'Is Not Empty' }
      ],
      date: [
        { value: 'date_equals', label: 'Date Equals' },
        { value: 'date_before', label: 'Before Date' },
        { value: 'date_after', label: 'After Date' },
        { value: 'date_range', label: 'Date Range' },
        { value: 'is_null', label: 'Is Empty' },
        { value: 'is_not_null', label: 'Is Not Empty' }
      ],
      boolean: [
        { value: 'equals', label: 'Is True/False' },
        { value: 'is_null', label: 'Is Empty' },
        { value: 'is_not_null', label: 'Is Not Empty' }
      ],
      array: [
        { value: 'contains', label: 'Contains Element' },
        { value: 'not_contains', label: 'Does Not Contain' },
        { value: 'in', label: 'Array In List' },
        { value: 'not_in', label: 'Array Not In List' },
        { value: 'is_null', label: 'Is Empty' },
        { value: 'is_not_null', label: 'Is Not Empty' }
      ]
    };
    
    return operators[dataType as keyof typeof operators] || operators.string;
  };

  const getFilterExamples = (pluginName: string) => {
    const examples = {
      jira: [
        { field: 'status', operator: 'equals' as const, value: 'Done', dataType: 'string' as const },
        { field: 'priority', operator: 'in' as const, value: 'High,Critical', dataType: 'string' as const },
        { field: 'created', operator: 'date_after' as const, value: '2024-01-01', dataType: 'date' as const },
        { field: 'assignee', operator: 'is_not_null' as const, value: '', dataType: 'string' as const }
      ],
      contract: [
        { field: 'totalValue', operator: 'greater_than' as const, value: '1000000', dataType: 'number' as const },
        { field: 'endDate', operator: 'date_before' as const, value: '90 days', dataType: 'date' as const },
        { field: 'status', operator: 'not_equals' as const, value: 'expired', dataType: 'string' as const },
        { field: 'autoRenewal', operator: 'equals' as const, value: 'true', dataType: 'boolean' as const }
      ],
      firewall: [
        { field: 'action', operator: 'equals' as const, value: 'ALLOW', dataType: 'string' as const },
        { field: 'action', operator: 'equals' as const, value: 'DENY', dataType: 'string' as const },
        { field: 'port', operator: 'between' as const, value: '80', value2: '443', dataType: 'number' as const },
        { field: 'protocol', operator: 'in' as const, value: 'TCP,UDP', dataType: 'string' as const }
      ],
      endpoint: [
        { field: 'edrCount', operator: 'less_than' as const, value: '500', dataType: 'number' as const },
        { field: 'osType', operator: 'equals' as const, value: 'Windows', dataType: 'string' as const },
        { field: 'lastSeen', operator: 'date_after' as const, value: '7 days ago', dataType: 'date' as const },
        { field: 'isActive', operator: 'equals' as const, value: 'true', dataType: 'boolean' as const }
      ]
    };
    
    return examples[pluginName as keyof typeof examples] || examples.jira;
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

  // Helper function to provide context-sensitive descriptions
  const getDisplayTypeDescription = (displayType: string, aggregationFunction?: string) => {
    const aggDesc = aggregationFunction ? ` with ${aggregationFunction}` : '';
    
    switch (displayType) {
      case 'number':
        return `Large number display${aggDesc}. Perfect for counts and totals.`;
      case 'percentage':
        return `Percentage display${aggDesc}. Shows values as percentages with % symbol.`;
      case 'progress':
        return `Progress bar${aggDesc}. Shows completion or ratio as a filled bar.`;
      case 'gauge':
        return `Circular gauge${aggDesc}. Shows value within a range.`;
      case 'trend':
        return `Trend indicator${aggDesc}. Shows up/down direction with arrows.`;
      case 'statistic':
        return `Statistical summary${aggDesc}. Perfect for min/max/average displays.`;
      case 'summary':
        return `Summary card${aggDesc}. Combines multiple metrics in one card.`;
      case 'table':
        return 'Tabular data display. Best for detailed raw data viewing.';
      case 'chart':
        return 'Graphical chart display. Visualizes data patterns and trends.';
      case 'list':
        return 'Simple list format. Good for key-value pairs and simple data.';
      case 'query':
        return 'Raw query results. Shows unprocessed data from the system.';
      default:
        return 'Choose the best display format for your data type.';
    }
  };

  const getColumnsForTable = (tableName: string): string[] => {
    const tableColumns: Record<string, string[]> = {
      clients: ['id', 'name', 'shortName', 'domain', 'industry', 'companySize', 'status', 'source', 'address', 'website'],
      contracts: ['id', 'clientId', 'name', 'startDate', 'endDate', 'autoRenewal', 'totalValue', 'status'],
      services: ['id', 'name', 'category', 'description', 'deliveryModel', 'basePrice', 'pricingUnit', 'isActive'],
      users: ['id', 'username', 'email', 'firstName', 'lastName', 'role', 'authProvider', 'isActive'],
      proposals: ['id', 'contractId', 'name', 'description', 'status', 'totalValue', 'validUntil'],
      service_scopes: ['id', 'contractId', 'serviceId', 'scopeDefinition', 'safDocumentUrl', 'safStartDate', 'safEndDate']
    };
    
    return tableColumns[tableName] || [];
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="query">Query Config</TabsTrigger>
          <TabsTrigger value="display">Display Options</TabsTrigger>
          <TabsTrigger value="aggregation">Aggregation</TabsTrigger>
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
                      {widget.pluginName === 'generic-api' && (
                        <div className="mt-2">
                          {(() => {
                            try {
                              if (widget.customQuery) {
                                JSON.parse(widget.customQuery);
                                return (
                                  <Badge variant="outline" className="bg-green-50 text-green-700">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Valid JSON
                                  </Badge>
                                );
                              }
                            } catch (e) {
                              return (
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Invalid JSON: {(e as Error).message}
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
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
                  
                  {widget.pluginName === 'generic-api' && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        <strong>JSON Format Required:</strong> For Generic API, provide a JSON object with these fields:
                        <pre className="mt-2 text-xs bg-white p-2 rounded border">
{`{
  "method": "POST",
  "endpoint": "/api/path",
  "headers": { "custom-header": "value" },
  "body": { "your": "payload" },
  "verifySsl": false
}`}
                        </pre>
                      </AlertDescription>
                    </Alert>
                  )}
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
                <div className="space-y-3 mt-2">
                  {Object.entries(widget.queryParameters || {}).map(([key, config]) => {
                    const parameterConfig = typeof config === 'object' && config !== null ? config : { value: config, source: 'static' };
                    
                    return (
                      <div key={key} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">{key}</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeParameter(key)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-gray-600">Parameter Source</Label>
                            <Select
                              value={parameterConfig.source || 'static'}
                              onValueChange={(value) => setWidget({
                                ...widget,
                                queryParameters: {
                                  ...widget.queryParameters,
                                  [key]: {
                                    ...parameterConfig,
                                    source: value,
                                    ...(value === 'static' && { dbColumn: undefined, dbTable: undefined })
                                  }
                                }
                              })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="static">Static Value</SelectItem>
                                <SelectItem value="database">Database Column</SelectItem>
                                <SelectItem value="context">Page Context</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            {parameterConfig.source === 'static' && (
                              <>
                                <Label className="text-xs text-gray-600">Static Value</Label>
                                <Input 
                                  value={parameterConfig.value || ''} 
                                  onChange={(e) => setWidget({
                                    ...widget,
                                    queryParameters: {
                                      ...widget.queryParameters,
                                      [key]: {
                                        ...parameterConfig,
                                        value: e.target.value
                                      }
                                    }
                                  })}
                                  className="h-8" 
                                  placeholder="Enter static value"
                                />
                              </>
                            )}
                            
                            {parameterConfig.source === 'database' && (
                              <>
                                <Label className="text-xs text-gray-600">Database Table</Label>
                                <Select
                                  value={parameterConfig.dbTable || ''}
                                  onValueChange={(value) => setWidget({
                                    ...widget,
                                    queryParameters: {
                                      ...widget.queryParameters,
                                      [key]: {
                                        ...parameterConfig,
                                        dbTable: value,
                                        dbColumn: '' // Reset column when table changes
                                      }
                                    }
                                  })}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Select table" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="clients">clients</SelectItem>
                                    <SelectItem value="contracts">contracts</SelectItem>
                                    <SelectItem value="services">services</SelectItem>
                                    <SelectItem value="users">users</SelectItem>
                                    <SelectItem value="proposals">proposals</SelectItem>
                                    <SelectItem value="service_scopes">service_scopes</SelectItem>
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                            
                            {parameterConfig.source === 'context' && (
                              <>
                                <Label className="text-xs text-gray-600">Context Variable</Label>
                                <Select
                                  value={parameterConfig.contextVar || ''}
                                  onValueChange={(value) => setWidget({
                                    ...widget,
                                    queryParameters: {
                                      ...widget.queryParameters,
                                      [key]: {
                                        ...parameterConfig,
                                        contextVar: value
                                      }
                                    }
                                  })}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Select context" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="clientId">Client ID</SelectItem>
                                    <SelectItem value="clientShortName">Client Short Name</SelectItem>
                                    <SelectItem value="clientName">Client Name</SelectItem>
                                    <SelectItem value="clientDomain">Client Domain</SelectItem>
                                    <SelectItem value="contractId">Contract ID</SelectItem>
                                    <SelectItem value="userId">Current User ID</SelectItem>
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {parameterConfig.source === 'database' && parameterConfig.dbTable && (
                          <div>
                            <Label className="text-xs text-gray-600">Database Column</Label>
                            <Select
                              value={parameterConfig.dbColumn || ''}
                              onValueChange={(value) => setWidget({
                                ...widget,
                                queryParameters: {
                                  ...widget.queryParameters,
                                  [key]: {
                                    ...parameterConfig,
                                    dbColumn: value
                                  }
                                }
                              })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent>
                                {getColumnsForTable(parameterConfig.dbTable).map((column) => (
                                  <SelectItem key={column} value={column}>
                                    {column}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        {parameterConfig.source === 'database' && (
                          <div className="text-xs text-gray-500 mt-1">
                            💡 Value will be fetched from database column based on current page context (e.g., client ID from URL)
                          </div>
                        )}
                        
                        {parameterConfig.source === 'context' && (
                          <div className="text-xs text-gray-500 mt-1">
                            💡 Value will be taken from current page context automatically
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {Object.keys(widget.queryParameters || {}).length === 0 && (
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
                      {/* Raw Data Displays */}
                      <SelectItem value="table">
                        <div className="flex items-center">
                          <Table className="h-4 w-4 mr-2" />
                          Table
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
                      
                      {/* Chart Displays */}
                      <SelectItem value="chart">
                        <div className="flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Chart
                        </div>
                      </SelectItem>
                      
                      {/* Aggregation-Specific Displays */}
                      <SelectItem value="number">
                        <div className="flex items-center">
                          <span className="h-4 w-4 mr-2 text-center font-bold text-blue-600">#</span>
                          Number Display (Count/Sum)
                        </div>
                      </SelectItem>
                      <SelectItem value="percentage">
                        <div className="flex items-center">
                          <span className="h-4 w-4 mr-2 text-center font-bold text-green-600">%</span>
                          Percentage (Average)
                        </div>
                      </SelectItem>
                      <SelectItem value="progress">
                        <div className="flex items-center">
                          <Activity className="h-4 w-4 mr-2" />
                          Progress Bar
                        </div>
                      </SelectItem>
                      <SelectItem value="gauge">
                        <div className="flex items-center">
                          <Gauge className="h-4 w-4 mr-2" />
                          Gauge/Meter
                        </div>
                      </SelectItem>
                      <SelectItem value="trend">
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Trend Indicator
                        </div>
                      </SelectItem>
                      <SelectItem value="statistic">
                        <div className="flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Statistic Card (Min/Max/Avg)
                        </div>
                      </SelectItem>
                      <SelectItem value="summary">
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 mr-2" />
                          Summary Card
                        </div>
                      </SelectItem>
                      
                      {/* Cards Display */}
                      <SelectItem value="cards">
                        <div className="flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Service Detail Cards
                        </div>
                      </SelectItem>
                      
                      {/* Legacy - keep for compatibility */}
                      <SelectItem value="metric">
                        <div className="flex items-center">
                          <Gauge className="h-4 w-4 mr-2" />
                          Legacy Metric/KPI
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {getDisplayTypeDescription(widget.displayType, widget.aggregation?.function)}
                  </p>
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

        <TabsContent value="aggregation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Aggregation & Processing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="aggregation-function">Aggregation Function</Label>
                <Select
                  value={widget.aggregation?.function || 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setWidget({ ...widget, aggregation: undefined });
                    } else {
                      setWidget({
                        ...widget,
                        aggregation: {
                          function: value as 'count' | 'sum' | 'avg' | 'min' | 'max',
                          field: widget.aggregation?.field || ''
                        }
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select aggregation function" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Aggregation</SelectItem>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="sum">Sum</SelectItem>
                    <SelectItem value="avg">Average</SelectItem>
                    <SelectItem value="min">Minimum</SelectItem>
                    <SelectItem value="max">Maximum</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Apply mathematical functions to aggregate the data (useful for metrics and charts)
                </p>
              </div>

              {widget.aggregation && widget.aggregation.function !== 'count' && (
                <div>
                  <Label htmlFor="aggregation-field">Aggregation Field</Label>
                  <Input
                    id="aggregation-field"
                    value={widget.aggregation.field || ''}
                    onChange={(e) => setWidget({
                      ...widget,
                      aggregation: {
                        ...widget.aggregation!,
                        field: e.target.value
                      }
                    })}
                    placeholder="Field name to aggregate (e.g., 'priority', 'status')"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Specify the field name to perform {widget.aggregation.function} operation on
                  </p>
                </div>
              )}

              <Separator />

              <div>
                <Label>Data Filters</Label>
                {widget.pluginName === 'sql' && databaseSchema.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    <Activity className="h-3 w-3 inline mr-1" />
                    Loading database schema...
                  </p>
                )}
                <div className="space-y-2 mt-2">
                  {widget.filters?.map((filter, index) => (
                    <div key={filter.id || index} className="flex space-x-2 items-center">
                      {widget.pluginName === 'sql' && databaseSchema.length > 0 ? (
                        <Select
                          value={filter.field}
                          onValueChange={(value) => updateFilter(filter.id, { field: value })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select table.column" />
                          </SelectTrigger>
                          <SelectContent>
                            {databaseSchema.map((table) => (
                              <React.Fragment key={table.tableName}>
                                <SelectItem value={table.tableName} disabled>
                                  <span className="font-semibold text-gray-600">{table.tableName}</span>
                                </SelectItem>
                                {table.columns.map((column) => (
                                  <SelectItem 
                                    key={`${table.tableName}.${column.name}`} 
                                    value={`${table.tableName}.${column.name}`}
                                    onSelect={() => {
                                      // Auto-detect data type based on PostgreSQL column type
                                      let dataType: FilterType['dataType'] = 'string';
                                      const pgType = column.type.toLowerCase();
                                      
                                      if (pgType.includes('int') || pgType.includes('numeric') || 
                                          pgType.includes('decimal') || pgType.includes('real') || 
                                          pgType.includes('double') || pgType.includes('serial')) {
                                        dataType = 'number';
                                      } else if (pgType.includes('bool')) {
                                        dataType = 'boolean';
                                      } else if (pgType.includes('date') || pgType.includes('time')) {
                                        dataType = 'date';
                                      } else if (pgType.includes('array') || pgType.includes('[]')) {
                                        dataType = 'array';
                                      }
                                      
                                      updateFilter(filter.id, { 
                                        field: `${table.tableName}.${column.name}`,
                                        dataType 
                                      });
                                    }}
                                  >
                                    <span className="ml-4">
                                      {table.tableName}.{column.name}
                                      <span className="text-xs text-gray-500 ml-2">({column.type})</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </React.Fragment>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder="Field name"
                          value={filter.field}
                          onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                          className="flex-1"
                        />
                      )}
                      <Select
                        value={filter.dataType}
                        onValueChange={(value: any) => updateFilter(filter.id, { dataType: value })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="array">Array</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={filter.operator}
                        onValueChange={(value: any) => updateFilter(filter.id, { operator: value })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getOperatorsForDataType(filter.dataType).map((operator) => (
                            <SelectItem key={operator.value} value={operator.value}>
                              {operator.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Value"
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                        className="flex-1"
                      />
                      {filter.operator === 'between' && (
                        <Input
                          placeholder="To value"
                          value={filter.value2 || ''}
                          onChange={(e) => updateFilter(filter.id, { value2: e.target.value })}
                          className="flex-1"
                        />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFilter(filter.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addFilter}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Filter
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {widget.pluginName === 'sql' 
                    ? "Select database columns from the dropdown. Data types are automatically detected." 
                    : "Add filters to process and refine the data before display"}
                </p>
                {widget.pluginName === 'sql' && databaseSchema.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    <CheckCircle className="h-3 w-3 inline mr-1" />
                    {databaseSchema.length} tables with {databaseSchema.reduce((sum, t) => sum + t.columns.length, 0)} columns available
                  </p>
                )}
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between">
                  <Label>Chart Grouping & Data Processing</Label>
                  {availableFields.length > 0 && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {availableFields.length} fields detected
                    </Badge>
                  )}
                </div>
                <div className="space-y-4 mt-2 p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enable-groupby"
                      checked={!!widget.groupBy}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setWidget({
                            ...widget,
                            groupBy: {
                              field: availableFields.length > 0 ? availableFields[0] : '',
                              valueField: '',
                              aggregationFunction: 'count',
                              limit: 10,
                              sortBy: 'desc'
                            }
                          });
                        } else {
                          setWidget({ ...widget, groupBy: undefined });
                        }
                      }}
                      className="rounded"
                    />
                    <Label htmlFor="enable-groupby" className="text-sm font-medium">
                      Enable Group By (recommended for charts)
                    </Label>
                  </div>
                  
                  {availableFields.length === 0 && (
                    <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-blue-800">
                          <Activity className="h-4 w-4 inline mr-1" />
                          <strong>Tip:</strong> Test your query first in the "Test & Preview" tab to automatically populate field dropdowns with available data fields.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setActiveTab('preview')}
                          className="ml-2 text-xs"
                        >
                          Go to Test
                        </Button>
                      </div>
                    </div>
                  )}

                  {availableFields.length > 0 && (
                    <div className="flex items-center justify-between bg-green-50 p-2 rounded">
                      <span className="text-sm text-green-800">
                        <CheckCircle className="h-4 w-4 inline mr-1" />
                        Fields detected from query test
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setActiveTab('preview')}
                        className="text-xs"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Re-test Query
                      </Button>
                    </div>
                  )}
                  
                  {widget.groupBy && (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="groupby-field">Group By Field (X-axis)</Label>
                        {availableFields.length > 0 ? (
                          <div className="space-y-2">
                            <Select
                              value={widget.groupBy.field}
                              onValueChange={(value) => setWidget({
                                ...widget,
                                groupBy: { ...widget.groupBy!, field: value }
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select field to group by..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableFields.filter(field => field && field.trim() !== '').map(field => (
                                  <SelectItem key={field} value={field}>
                                    {field}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={widget.groupBy.field}
                              onChange={(e) => setWidget({
                                ...widget,
                                groupBy: { ...widget.groupBy!, field: e.target.value }
                              })}
                              placeholder="Or type field name manually..."
                              className="text-sm"
                            />
                          </div>
                        ) : (
                          <Input
                            id="groupby-field"
                            value={widget.groupBy.field}
                            onChange={(e) => setWidget({
                              ...widget,
                              groupBy: { ...widget.groupBy!, field: e.target.value }
                            })}
                            placeholder="Field to group by (e.g., 'assignee', 'status', 'priority')"
                          />
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {availableFields.length > 0 
                            ? `Choose from dropdown or type manually. ${availableFields.length} fields detected from test query.` 
                            : "Enter the field name to group by. For JIRA queries, common fields include: assignee, status, priority, project, reporter."
                          }
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="groupby-value-field">Value Field (Y-axis) - Optional</Label>
                        {availableFields.length > 0 ? (
                          <div className="space-y-2">
                            <Select
                              value={widget.groupBy.valueField || '__none__'}
                              onValueChange={(value) => setWidget({
                                ...widget,
                                groupBy: { ...widget.groupBy!, valueField: value === '__none__' ? '' : value }
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select value field (optional)..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">No specific field (use count)</SelectItem>
                                {availableFields.filter(field => field && field.trim() !== '').map(field => (
                                  <SelectItem key={field} value={field}>
                                    {field}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={widget.groupBy.valueField || ''}
                              onChange={(e) => setWidget({
                                ...widget,
                                groupBy: { ...widget.groupBy!, valueField: e.target.value }
                              })}
                              placeholder="Or type field name manually (leave empty for count)..."
                              className="text-sm"
                            />
                          </div>
                        ) : (
                          <Input
                            id="groupby-value-field"
                            value={widget.groupBy.valueField || ''}
                            onChange={(e) => setWidget({
                              ...widget,
                              groupBy: { ...widget.groupBy!, valueField: e.target.value }
                            })}
                            placeholder="Optional: field for values (leave empty to count items per group)"
                          />
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {availableFields.length > 0 
                            ? "Choose from dropdown, type manually, or leave empty to count items per group"
                            : "Leave empty to count items per group, or specify a field name for numeric values (e.g., 'story_points', 'time_spent')."
                          }
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="groupby-aggregation">Aggregation Function</Label>
                          <Select
                            value={widget.groupBy.aggregationFunction || 'count'}
                            onValueChange={(value: any) => setWidget({
                              ...widget,
                              groupBy: { ...widget.groupBy!, aggregationFunction: value }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="count">Count</SelectItem>
                              <SelectItem value="sum">Sum</SelectItem>
                              <SelectItem value="avg">Average</SelectItem>
                              <SelectItem value="min">Minimum</SelectItem>
                              <SelectItem value="max">Maximum</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="groupby-sort">Sort Order</Label>
                          <Select
                            value={widget.groupBy.sortBy || 'desc'}
                            onValueChange={(value: any) => setWidget({
                              ...widget,
                              groupBy: { ...widget.groupBy!, sortBy: value }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="desc">Highest First</SelectItem>
                              <SelectItem value="asc">Lowest First</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="groupby-limit">Max Groups to Show</Label>
                        <Input
                          id="groupby-limit"
                          type="number"
                          min="5"
                          max="50"
                          value={widget.groupBy.limit || 10}
                          onChange={(e) => setWidget({
                            ...widget,
                            groupBy: { ...widget.groupBy!, limit: parseInt(e.target.value) || 10 }
                          })}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Limit the number of groups to display (5-50)
                        </p>
                      </div>

                      {availableFields.length > 0 && (
                        <div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                          <p className="text-sm text-green-800 mb-2">
                            <strong>Available Fields:</strong>
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {availableFields.map(field => (
                              <Badge key={field} variant="outline" className="text-xs">
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                        <p className="text-sm text-blue-800">
                          <strong>Example:</strong> Group by "status" with count function will show how many issues exist for each status (Open: 45, In Progress: 23, Done: 67)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Configure how data should be grouped and aggregated for charts and analysis
                </p>
              </div>

              <Separator />

              {widget.displayType === 'cards' && (
                <>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label>Field Selection</Label>
                      {availableFields.length > 0 && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {availableFields.length} fields available
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-4 mt-2 p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enable-field-selection"
                          checked={widget.fieldSelection?.enabled || false}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setWidget({
                                ...widget,
                                fieldSelection: {
                                  enabled: true,
                                  selectedFields: [],
                                  excludeNullFields: true
                                }
                              });
                            } else {
                              setWidget({ ...widget, fieldSelection: undefined });
                            }
                          }}
                          className="rounded"
                        />
                        <Label htmlFor="enable-field-selection" className="text-sm font-medium">
                          Enable Field Selection
                        </Label>
                      </div>

                      {widget.fieldSelection?.enabled && (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="exclude-null-fields"
                              checked={widget.fieldSelection.excludeNullFields || false}
                              onChange={(e) => setWidget({
                                ...widget,
                                fieldSelection: {
                                  ...widget.fieldSelection!,
                                  excludeNullFields: e.target.checked
                                }
                              })}
                              className="rounded"
                            />
                            <Label htmlFor="exclude-null-fields" className="text-sm">
                              Exclude null/empty fields
                            </Label>
                          </div>

                          {availableFields.length > 0 ? (
                            <div>
                              <Label>Select Fields to Display</Label>
                              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded p-2 bg-white">
                                {availableFields.map(field => (
                                  <label key={field} className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded">
                                    <input
                                      type="checkbox"
                                      checked={widget.fieldSelection?.selectedFields.includes(field) || false}
                                      onChange={(e) => {
                                        const fields = widget.fieldSelection?.selectedFields || [];
                                        if (e.target.checked) {
                                          setWidget({
                                            ...widget,
                                            fieldSelection: {
                                              ...widget.fieldSelection!,
                                              selectedFields: [...fields, field]
                                            }
                                          });
                                        } else {
                                          setWidget({
                                            ...widget,
                                            fieldSelection: {
                                              ...widget.fieldSelection!,
                                              selectedFields: fields.filter(f => f !== field)
                                            }
                                          });
                                        }
                                      }}
                                      className="rounded"
                                    />
                                    <span className="text-sm">{field}</span>
                                  </label>
                                ))}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {widget.fieldSelection?.selectedFields.length || 0} fields selected
                                {widget.fieldSelection?.selectedFields.length === 0 && ' (all fields will be shown)'}
                              </p>
                            </div>
                          ) : (
                            <Alert className="bg-blue-50 border-blue-200">
                              <Activity className="h-4 w-4 text-blue-600" />
                              <AlertDescription className="text-blue-800">
                                Test your query first to populate available fields
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              <div>
                <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
                <Input
                  id="refresh-interval"
                  type="number"
                  min="10"
                  max="3600"
                  value={widget.refreshInterval}
                  onChange={(e) => setWidget({ ...widget, refreshInterval: parseInt(e.target.value) || 30 })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  How often the widget data should be refreshed (minimum 10 seconds)
                </p>
              </div>

              <div>
                <Label htmlFor="widget-placement">Dashboard Placement</Label>
                <Select
                  value={widget.placement}
                  onValueChange={(value: any) => setWidget({ ...widget, placement: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client-details">Client Detail Pages</SelectItem>
                    <SelectItem value="global-dashboard">Global Dashboard</SelectItem>
                    <SelectItem value="custom">Custom Placement</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Where this widget will appear in the dashboard
                </p>
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
                    <div className="space-y-4">
                      <div>
                        <Label>Query Results Summary</Label>
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mt-2">
                          <div className="flex items-center space-x-4 text-sm">
                            <span><strong>Total Results:</strong> {testResult.data.totalResults || testResult.data.total || 'Unknown'}</span>
                            {testResult.data.displayedSample && (
                              <span><strong>Sample Shown:</strong> {testResult.data.displayedSample} records</span>
                            )}
                            {testResult.metadata?.responseTime && (
                              <span><strong>Response Time:</strong> {testResult.metadata.responseTime}</span>
                            )}
                            <span><strong>Display Type:</strong> {widget.displayType}</span>
                          </div>
                        </div>
                      </div>

                      {/* Detected Fields Display */}
                      {availableFields.length > 0 && (
                        <div>
                          <Label>Detected Data Fields ({availableFields.length})</Label>
                          <div className="bg-green-50 border border-green-200 p-3 rounded-lg mt-2">
                            <div className="flex flex-wrap gap-1">
                              {availableFields.map(field => (
                                <Badge key={field} variant="outline" className="text-xs bg-white">
                                  {field}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-xs text-green-700 mt-2">
                              These fields are now available in the Group By dropdowns in the "Advanced" tab.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Preview Widget with Selected Display Type */}
                      <div>
                        <Label>Widget Preview ({widget.displayType})</Label>
                        <div className="border rounded-lg mt-2 p-4 bg-white min-h-64">
                          <DynamicWidgetRenderer
                            widget={{
                              ...widget,
                              id: 'preview',
                              name: `Preview: ${widget.name || 'Test Widget'}`,
                            }}
                            clientShortName={clientContext?.clientShortName}
                            className="shadow-none border-0"
                            previewData={testResult.data.sampleData || testResult.data.issues || testResult.data}
                          />
                        </div>
                      </div>

                      {/* Raw JSON for debugging */}
                      <details className="border rounded-lg">
                        <summary className="px-3 py-2 bg-gray-50 cursor-pointer text-sm font-medium">Raw Response Data</summary>
                        <div className="p-3">
                          <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
                            {JSON.stringify(testResult.data, null, 2)}
                          </pre>
                        </div>
                      </details>
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