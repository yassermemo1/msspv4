import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useSystemNotifications } from '@/lib/system-notifications';
import { 
  BarChart3, PieChart, LineChart, Grid3x3, Table, TrendingUp,
  Settings, Play, Save, Eye, Copy, RefreshCw, Zap, Plus, Edit, Trash2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

interface ExternalSystem {
  id: number;
  systemName: string;
  displayName: string;
  baseUrl: string;
  apiEndpoints: any;
  isActive: boolean;
}

interface DataWidget {
  id?: number;
  name: string;
  description?: string;
  type: 'chart' | 'table' | 'metric' | 'status' | 'list';
  systemId: number;
  queryConfig: {
    endpoint: string;
    method: string;
    params?: Record<string, any>;
    mapping?: Record<string, string>;
    refreshInterval?: number;
  };
  visualConfig: {
    chartType?: 'bar' | 'line' | 'pie' | 'doughnut';
    colors?: string[];
    showLegend?: boolean;
    showGrid?: boolean;
    height?: number;
  };
  isActive: boolean;
}

interface WidgetBuilderProps {
  systems: ExternalSystem[];
  widget?: DataWidget | null;
  onSave: (widget: DataWidget) => void;
  onCancel: () => void;
  onTest: (config: any) => Promise<any>;
  onPreviewWidget?: (widget: any) => void;
  onPreviewMapping?: (mapping: any, sampleData: any) => void;
  loading?: boolean;
}

export function WidgetBuilder({ systems, widget, onSave, onCancel, onTest, onPreviewWidget, onPreviewMapping, loading = false }: WidgetBuilderProps) {
  const { prompt: systemPrompt } = useSystemNotifications();
  const [activeTab, setActiveTab] = useState('basic');
  const [widgetForm, setWidgetForm] = useState<DataWidget>({
    id: 0,
    name: '',
    description: '',
    type: 'chart',
    systemId: 0,
    queryConfig: {
      endpoint: '',
      method: 'GET',
      params: {}
    },
    visualConfig: {
      chartType: 'bar',
      colors: ['#3b82f6', '#1e40af', '#60a5fa', '#93c5fd'],
      showLegend: true,
      showGrid: true,
      height: 300
    },
    isActive: true
  });

  const [testData, setTestData] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [availableEndpoints, setAvailableEndpoints] = useState<string[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredEndpoints, setDiscoveredEndpoints] = useState<Record<string, string>>({});

  // Replace fixed field mapping with dynamic custom fields
  const [customFields, setCustomFields] = useState<Array<{
    id: string;
    customName: string;
    apiField: string;
    description?: string;
  }>>([]);
  
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldDescription, setNewFieldDescription] = useState('');
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingFieldName, setEditingFieldName] = useState('');

  const [validationMessage, setValidationMessage] = useState('');

  // Initialize form with existing widget data
  useEffect(() => {
    if (widget) {
      setWidgetForm({ ...widget });
    }
  }, [widget]);

  // Auto-discover endpoints when system changes
  useEffect(() => {
    const selectedSystem = systems.find(s => s.id === widgetForm.systemId);
    console.log('🔍 Widget Builder Debug - Selected System:', {
      systemId: widgetForm.systemId,
      selectedSystem: selectedSystem ? {
        id: selectedSystem.id,
        systemName: selectedSystem.systemName,
        displayName: selectedSystem.displayName,
        baseUrl: selectedSystem.baseUrl,
        apiEndpoints: selectedSystem.apiEndpoints,
        apiEndpointsType: typeof selectedSystem.apiEndpoints,
        isActive: selectedSystem.isActive
      } : null
    });

    if (selectedSystem) {
      // First try to use manually configured endpoints
      if (selectedSystem.apiEndpoints) {
        let parsedEndpoints = selectedSystem.apiEndpoints;
        
        // Handle if apiEndpoints is stored as a JSON string
        if (typeof selectedSystem.apiEndpoints === 'string') {
          try {
            parsedEndpoints = JSON.parse(selectedSystem.apiEndpoints);
            console.log('📝 Parsed endpoints from JSON string:', parsedEndpoints);
          } catch (error) {
            console.error('❌ Failed to parse apiEndpoints JSON:', error);
            // Fall back to auto-discovery
            autoDiscoverEndpoints(selectedSystem);
            return;
          }
        }
        
        // Get the endpoint keys
        const endpointKeys = Object.keys(parsedEndpoints || {});
        console.log('🔑 Available endpoint keys:', endpointKeys);
        
        if (endpointKeys.length > 0) {
          setAvailableEndpoints(endpointKeys);
          return;
        }
      }
      
      // No manual endpoints configured, try auto-discovery
      console.log('🔍 No manual endpoints found, attempting auto-discovery...');
      autoDiscoverEndpoints(selectedSystem);
    } else {
      console.log('⚠️ No system selected');
      setAvailableEndpoints([]);
    }
  }, [widgetForm.systemId, systems]);

  const widgetTypes = [
    { value: 'chart', label: 'Chart', icon: BarChart3, description: 'Bar, line, pie charts' },
    { value: 'table', label: 'Data Table', icon: Table, description: 'Tabular data display' },
    { value: 'metric', label: 'Metric Card', icon: TrendingUp, description: 'Single value display' },
    { value: 'status', label: 'Status Widget', icon: Grid3x3, description: 'Status indicators' },
    { value: 'list', label: 'List View', icon: Eye, description: 'Item list display' }
  ];

  const chartTypes = [
    { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
    { value: 'line', label: 'Line Chart', icon: LineChart },
    { value: 'pie', label: 'Pie Chart', icon: PieChart },
    { value: 'doughnut', label: 'Doughnut Chart', icon: PieChart }
  ];

  const colorPresets = [
    { name: 'Blue Theme', colors: ['#3b82f6', '#1e40af', '#60a5fa', '#93c5fd'] },
    { name: 'Green Theme', colors: ['#10b981', '#047857', '#34d399', '#6ee7b7'] },
    { name: 'Rainbow', colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'] },
    { name: 'Monochrome', colors: ['#374151', '#6b7280', '#9ca3af', '#d1d5db'] }
  ];

  // Real Preview Component
  const RealPreviewWidget = ({ widget, data }: { widget: DataWidget; data: any[] }) => {
    const chartColors = widget.visualConfig.colors || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    // Process data for visualization
    const processedData = React.useMemo(() => {
      if (!data || !Array.isArray(data)) return [];
      
      return data.slice(0, 10).map((item, index) => {
        const processed: any = { name: `Item ${index + 1}`, index };
        
        Object.entries(item).forEach(([key, value]) => {
          if (typeof value === 'number') {
            processed[key] = value;
          } else if (typeof value === 'string' && !isNaN(Number(value))) {
            processed[key] = Number(value);
          } else if (typeof value === 'string') {
            processed.name = value.slice(0, 15); // Use first string as name
          }
        });
        
        return processed;
      });
    }, [data]);

    if (widget.type === 'chart') {
      if (!processedData.length) {
        return (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2" />
              <div>No data available for chart</div>
            </div>
          </div>
        );
      }

      const chartProps = {
        data: processedData,
        margin: { top: 20, right: 30, left: 20, bottom: 20 }
      };

      const numericKeys = Object.keys(processedData[0] || {})
        .filter(key => key !== 'name' && key !== 'index' && typeof processedData[0]?.[key] === 'number')
        .slice(0, 4); // Limit to 4 series for readability

      switch (widget.visualConfig.chartType) {
        case 'line':
          return (
            <ResponsiveContainer width="100%" height={widget.visualConfig.height || 300}>
              <RechartsLineChart {...chartProps}>
                {widget.visualConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                {widget.visualConfig.showLegend && <Legend />}
                {numericKeys.map((key, index) => (
                  <Line 
                    key={key}
                    type="monotone" 
                    dataKey={key} 
                    stroke={chartColors[index % chartColors.length]} 
                    strokeWidth={2}
                  />
                ))}
              </RechartsLineChart>
            </ResponsiveContainer>
          );

        case 'pie':
        case 'doughnut':
          const pieData = processedData.slice(0, 6).map((item, index) => ({
            name: item.name || `Item ${index + 1}`,
            value: numericKeys.length > 0 ? item[numericKeys[0]] : index + 1
          }));
          
          return (
            <ResponsiveContainer width="100%" height={widget.visualConfig.height || 300}>
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={widget.visualConfig.chartType === 'doughnut' ? 40 : 0}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                {widget.visualConfig.showLegend && <Legend />}
              </RechartsPieChart>
            </ResponsiveContainer>
          );

        case 'bar':
        default:
          return (
            <ResponsiveContainer width="100%" height={widget.visualConfig.height || 300}>
              <BarChart {...chartProps}>
                {widget.visualConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                {widget.visualConfig.showLegend && <Legend />}
                {numericKeys.map((key, index) => (
                  <Bar 
                    key={key}
                    dataKey={key} 
                    fill={chartColors[index % chartColors.length]} 
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          );
      }
    }

    if (widget.type === 'table') {
      const tableData = data.slice(0, 5);
      const columns = Object.keys(tableData[0] || {}).slice(0, 5);
      
      return (
        <div className="border rounded-lg overflow-hidden" style={{ height: widget.visualConfig.height || 300 }}>
          <div className="overflow-auto h-full">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {columns.map(col => (
                    <th key={col} className="px-3 py-2 text-left font-medium text-gray-700 border-b">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    {columns.map(col => (
                      <td key={col} className="px-3 py-2 text-gray-600">
                        {String(row[col]).slice(0, 50)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (widget.type === 'metric') {
      const value = Array.isArray(data) ? data.length : 0;
      const numericValue = data?.[0] ? Object.values(data[0]).find(v => typeof v === 'number') : null;
      
      return (
        <div 
          className="bg-gradient-to-br from-blue-50 to-blue-100 border rounded-lg p-6 text-center"
          style={{ height: widget.visualConfig.height || 300 }}
        >
          <div className="flex flex-col justify-center h-full">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {numericValue || value}
            </div>
            <div className="text-lg text-gray-700">{widget.name}</div>
            <div className="text-sm text-gray-500 mt-2">
              {Array.isArray(data) ? `Based on ${data.length} records` : 'Live data'}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <Grid3x3 className="h-12 w-12 mx-auto mb-2" />
          <div>Widget type: {widget.type}</div>
        </div>
      </div>
    );
  };

  // Helper function to flatten nested objects for field selection
  const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
    const flattened: Record<string, any> = {};
    
    if (Array.isArray(obj)) {
      if (obj.length > 0) {
        Object.assign(flattened, flattenObject(obj[0], prefix));
      }
    } else if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        
        if (Array.isArray(value)) {
          flattened[fullPath] = `[${value.length} items]`;
          if (value.length > 0 && typeof value[0] === 'object') {
            Object.assign(flattened, flattenObject(value[0], fullPath));
          }
        } else if (value && typeof value === 'object') {
          Object.assign(flattened, flattenObject(value, fullPath));
        } else {
          flattened[fullPath] = value;
        }
      });
    }
    
    return flattened;
  };

  // Auto-discover API endpoints from base URL
  const autoDiscoverEndpoints = async (system: ExternalSystem) => {
    setDiscovering(true);
    console.log('🔍 Starting auto-discovery for:', system.baseUrl);
    
    try {
      // For known APIs, provide their standard endpoints directly
      if (system.baseUrl.includes('jsonplaceholder.typicode.com')) {
        console.log('🎯 JSONPlaceholder detected - using known endpoints');
        const endpoints = ['/posts', '/comments', '/albums', '/photos', '/todos', '/users'];
        setAvailableEndpoints(endpoints);
        const endpointsMap: Record<string, string> = {};
        endpoints.forEach(endpoint => {
          const cleanName = endpoint.replace(/^\//, '');
          endpointsMap[cleanName] = endpoint;
        });
        setDiscoveredEndpoints(endpointsMap);
        setDiscovering(false);
        return;
      }
      
      if (system.baseUrl.includes('api.github.com')) {
        console.log('🎯 GitHub API detected - using known endpoints');
        const endpoints = ['/user', '/users', '/repos', '/orgs', '/search/repositories', '/search/users'];
        setAvailableEndpoints(endpoints);
        const endpointsMap: Record<string, string> = {};
        endpoints.forEach(endpoint => {
          const cleanName = endpoint.replace(/^\//, '').replace(/\//g, '_');
          endpointsMap[cleanName] = endpoint;
        });
        setDiscoveredEndpoints(endpointsMap);
        setDiscovering(false);
        return;
      }
      
      if (system.baseUrl.includes('restcountries.com')) {
        console.log('🎯 REST Countries detected - using known endpoints');
        const endpoints = ['/v3.1/all', '/v3.1/name/{name}', '/v3.1/alpha/{code}', '/v3.1/region/{region}'];
        setAvailableEndpoints(endpoints);
        const endpointsMap: Record<string, string> = {};
        endpoints.forEach(endpoint => {
          const cleanName = endpoint.replace(/^\//, '').replace(/\//g, '_').replace(/[{}]/g, '');
          endpointsMap[cleanName] = endpoint;
        });
        setDiscoveredEndpoints(endpointsMap);
        setDiscovering(false);
        return;
      }
      
      if (system.baseUrl.includes('catfact.ninja')) {
        console.log('🎯 Cat Facts API detected - using known endpoints');
        const endpoints = ['/fact', '/facts', '/breeds'];
        setAvailableEndpoints(endpoints);
        const endpointsMap: Record<string, string> = {};
        endpoints.forEach(endpoint => {
          const cleanName = endpoint.replace(/^\//, '');
          endpointsMap[cleanName] = endpoint;
        });
        setDiscoveredEndpoints(endpointsMap);
        setDiscovering(false);
        return;
      }
      
      // For other systems, try common discovery endpoints
      const discoveryUrls = [
        '', // Root URL
        '/api', // Common API root
        '/api/v1', // Versioned API
        '/api/v2',
        '/.well-known/api', // Well-known endpoints
        '/swagger.json', // Swagger docs
        '/openapi.json', // OpenAPI docs
        '/docs', // Documentation
        '/health', // Health check that might reveal endpoints
        '/status' // Status endpoint
      ];

      let discoveredData = {};
      let endpoints: string[] = [];

      for (const path of discoveryUrls) {
        try {
          const testUrl = system.baseUrl.replace(/\/$/, '') + path;
          console.log(`🔍 Trying discovery URL: ${testUrl}`);
          
          const response = await fetch(`/api/external-systems/${system.id}/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: path,
              method: 'GET'
            })
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`✅ Got response from ${path}:`, result);
            
            if (result.data) {
              discoveredData = { ...discoveredData, ...result.data };
              
              // Extract potential endpoints from the response
              const extractedEndpoints = extractEndpointsFromResponse(result.data, path);
              endpoints = [...endpoints, ...extractedEndpoints];
            }
          }
        } catch (error) {
          console.log(`❌ Failed to discover from ${path}:`, error);
        }
      }

      // Remove duplicates and format
      const uniqueEndpoints = [...new Set(endpoints)];
      console.log('🎯 Discovered endpoints:', uniqueEndpoints);
      
      if (uniqueEndpoints.length > 0) {
        setAvailableEndpoints(uniqueEndpoints);
        
        // Create discovered endpoints mapping
        const endpointsMap: Record<string, string> = {};
        uniqueEndpoints.forEach(endpoint => {
          const cleanName = endpoint.replace(/^\//, '').replace(/\//g, '_') || 'root';
          endpointsMap[cleanName] = endpoint;
        });
        setDiscoveredEndpoints(endpointsMap);
        
        console.log('✅ Auto-discovery successful:', endpointsMap);
      } else {
        console.log('⚠️ No endpoints discovered, providing fallback options');
        // Provide some common fallback endpoints to try
        const fallbackEndpoints = ['/', '/api', '/api/v1', '/health', '/status'];
        setAvailableEndpoints(fallbackEndpoints);
      }
      
    } catch (error) {
      console.error('❌ Auto-discovery failed:', error);
      // Provide basic fallback
      setAvailableEndpoints(['/']);
    } finally {
      setDiscovering(false);
    }
  };

  // Extract endpoints from API response
  const extractEndpointsFromResponse = (data: any, basePath: string): string[] => {
    const endpoints: string[] = [];
    
    if (typeof data === 'object' && data !== null) {
      // Look for common patterns that indicate endpoints
      Object.keys(data).forEach(key => {
        const value = data[key];
        
        // Pattern 1: Direct endpoint mappings like {"users": "/api/users"}
        if (typeof value === 'string' && value.startsWith('/')) {
          endpoints.push(value);
        }
        
        // Pattern 2: URLs in values
        if (typeof value === 'string' && (value.includes('/api/') || value.includes('/rest/'))) {
          endpoints.push(value);
        }
        
        // Pattern 3: Nested objects that might contain endpoints
        if (typeof value === 'object' && value !== null) {
          if (value.href || value.url || value.endpoint) {
            const endpoint = value.href || value.url || value.endpoint;
            if (typeof endpoint === 'string' && endpoint.startsWith('/')) {
              endpoints.push(endpoint);
            }
          }
        }
        
        // Pattern 4: Common REST endpoint names
        const commonEndpoints = ['users', 'projects', 'issues', 'tickets', 'items', 'data', 'search'];
        if (commonEndpoints.includes(key.toLowerCase())) {
          endpoints.push(basePath + (basePath.endsWith('/') ? '' : '/') + key);
        }
      });
      
      // Pattern 5: Look for arrays that might indicate available resources
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (typeof item === 'object' && item.name && typeof item.name === 'string') {
            endpoints.push(basePath + '/' + item.name);
          }
        });
      }
    }
    
    return endpoints;
  };

  const testWidget = async () => {
    setTesting(true);
    try {
      const testConfig = {
        systemId: widgetForm.systemId,
        endpoint: widgetForm.queryConfig.endpoint,
        method: widgetForm.queryConfig.method,
        params: widgetForm.queryConfig.params
      };
      
      const data = await onTest(testConfig);
      setTestData(data);
    } catch (error) {
      setTestData({ error: error instanceof Error ? error.message : 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const validation = validateForm();
    if (!validation.isValid) {
      // Show specific validation errors
      const firstError = validation.errors[0];
      setValidationMessage(firstError);
      
      // Navigate to the appropriate tab for the error
      if (firstError.includes('name') || firstError.includes('system')) {
        setActiveTab('basic');
      } else if (firstError.includes('endpoint')) {
        setActiveTab('query');
      }
      
      // Clear message after 5 seconds
      setTimeout(() => setValidationMessage(''), 5000);
      return;
    }
    
    setValidationMessage('');
    onSave(widgetForm);
  };

  const validateForm = () => {
    const errors: string[] = [];
    
    if (!widgetForm.name?.trim()) {
      errors.push('Widget name is required');
    }
    
    if (!widgetForm.systemId || widgetForm.systemId <= 0) {
      errors.push('External system must be selected');
    }
    
    if (!widgetForm.queryConfig.endpoint?.trim()) {
      errors.push('Data endpoint is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const selectedSystem = systems.find(s => s.id === widgetForm.systemId);

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    
    const newField = {
      id: Date.now().toString(),
      customName: newFieldName.trim(),
      apiField: '__none__',
      description: newFieldDescription.trim()
    };
    
    setCustomFields([...customFields, newField]);
    setNewFieldName('');
    setNewFieldDescription('');
  };

  const updateCustomField = (id: string, updates: Partial<typeof customFields[0]>) => {
    setCustomFields(fields => 
      fields.map(field => 
        field.id === id ? { ...field, ...updates } : field
      )
    );
  };

  const removeCustomField = (id: string) => {
    setCustomFields(fields => fields.filter(field => field.id !== id));
  };

  const autoSuggestCustomFields = () => {
    if (!testData) return;
    
    const flattenedData = flattenObject(testData);
    const apiFields = Object.keys(flattenedData);
    
    // Auto-suggest some common field mappings
    const suggestions = [
      { customName: 'Title', apiField: apiFields.find(f => ['title', 'name', 'summary', 'subject'].includes(f.toLowerCase())) || '__none__', description: 'Main display text' },
      { customName: 'ID', apiField: apiFields.find(f => ['id', 'key', 'number', 'uuid'].includes(f.toLowerCase())) || '__none__', description: 'Unique identifier' },
      { customName: 'Status', apiField: apiFields.find(f => ['status', 'state', 'condition'].includes(f.toLowerCase())) || '__none__', description: 'Current status' },
      { customName: 'Date', apiField: apiFields.find(f => ['date', 'created', 'updated', 'modified'].includes(f.toLowerCase())) || '__none__', description: 'Timestamp field' },
      { customName: 'Priority', apiField: apiFields.find(f => ['priority', 'importance', 'severity'].includes(f.toLowerCase())) || '__none__', description: 'Priority level' },
      { customName: 'Assignee', apiField: apiFields.find(f => ['assignee', 'owner', 'assigned'].includes(f.toLowerCase())) || '__none__', description: 'Assigned person' }
    ].filter(suggestion => suggestion.apiField !== '__none__');

    setCustomFields(suggestions.map((suggestion, index) => ({
      id: (Date.now() + index).toString(),
      ...suggestion
    })));
  };

  // Update data mapping when custom fields change
  useEffect(() => {
    const newMapping: Record<string, string> = {};
    customFields.forEach(field => {
      if (field.apiField !== '__none__') {
        newMapping[field.customName] = field.apiField;
      }
    });
    
    setWidgetForm(prev => ({
      ...prev,
      dataMapping: newMapping
    }));
  }, [customFields]);

  // Preview handlers
  const handlePreviewWidget = () => {
    if (onPreviewWidget) {
      onPreviewWidget(widgetForm);
    }
  };

  const handlePreviewMapping = () => {
    if (onPreviewMapping && testData) {
      const mapping = Object.fromEntries(
        customFields.map(field => [field.customName, field.apiField])
      );
      onPreviewMapping(mapping, Array.isArray(testData) ? testData : testData.data || []);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="query">Data Query</TabsTrigger>
          <TabsTrigger value="visual">Visualization</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          {/* Widget Type Selection */}
          <div className="space-y-3">
            <Label>Widget Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {widgetTypes.map(type => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.value}
                    className={`cursor-pointer transition-all ${
                      widgetForm.type === type.value 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setWidgetForm({ ...widgetForm, type: type.value as any })}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Icon className="h-8 w-8 text-blue-500" />
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-gray-600">{type.description}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="widgetName">Widget Name *</Label>
              <Input
                id="widgetName"
                value={widgetForm.name}
                onChange={(e) => setWidgetForm({ ...widgetForm, name: e.target.value })}
                placeholder="e.g., Active Tickets Chart"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="systemSelect">External System *</Label>
              <Select 
                value={widgetForm.systemId.toString()} 
                onValueChange={(value) => setWidgetForm({ ...widgetForm, systemId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select system" />
                </SelectTrigger>
                <SelectContent>
                  {systems.filter(s => s.isActive).map(system => (
                    <SelectItem key={system.id} value={system.id.toString()}>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{system.systemName}</Badge>
                        <span>{system.displayName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="widgetDescription">Description</Label>
            <Textarea
              id="widgetDescription"
              value={widgetForm.description || ''}
              onChange={(e) => setWidgetForm({ ...widgetForm, description: e.target.value })}
              placeholder="Describe what this widget displays..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={widgetForm.isActive}
              onCheckedChange={(checked) => setWidgetForm({ ...widgetForm, isActive: checked })}
            />
            <Label htmlFor="isActive">Widget is active</Label>
          </div>
        </TabsContent>

        <TabsContent value="query" className="space-y-4">
          {selectedSystem ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="endpoint">API Endpoint *</Label>
                    {selectedSystem && !discovering && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => autoDiscoverEndpoints(selectedSystem)}
                        className="text-xs h-6"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Auto-Discover
                      </Button>
                    )}
                  </div>
                  
                  <Select
                    value={widgetForm.queryConfig.endpoint}
                    onValueChange={(value) => setWidgetForm({
                      ...widgetForm,
                      queryConfig: { ...widgetForm.queryConfig, endpoint: value }
                    })}
                    disabled={discovering}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        discovering 
                          ? "🔍 Discovering endpoints..." 
                          : "Select endpoint"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {discovering ? (
                        <SelectItem value="__discovering__" disabled>
                          <div className="flex items-center">
                            <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                            Scanning API endpoints...
                          </div>
                        </SelectItem>
                      ) : availableEndpoints.length > 0 ? (
                        availableEndpoints.map(endpoint => {
                          // Handle both manually configured and auto-discovered endpoints
                          let displayEndpoint = endpoint;
                          let actualEndpoint = endpoint;
                          
                          // Check if this is from manual configuration
                          let parsedEndpoints = selectedSystem.apiEndpoints;
                          if (typeof selectedSystem.apiEndpoints === 'string') {
                            try {
                              parsedEndpoints = JSON.parse(selectedSystem.apiEndpoints);
                            } catch {
                              parsedEndpoints = {};
                            }
                          }
                          
                          if (parsedEndpoints && parsedEndpoints[endpoint]) {
                            // Manual configuration
                            actualEndpoint = parsedEndpoints[endpoint];
                            displayEndpoint = endpoint;
                          } else if (discoveredEndpoints[endpoint]) {
                            // Auto-discovered
                            actualEndpoint = discoveredEndpoints[endpoint];
                            displayEndpoint = endpoint;
                          }
                          
                          return (
                            <SelectItem key={endpoint} value={actualEndpoint}>
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">{displayEndpoint}</Badge>
                                  <span className="font-mono text-sm">{actualEndpoint}</span>
                                </div>
                                {Object.keys(discoveredEndpoints).includes(endpoint) && (
                                  <span className="text-xs text-green-600 ml-2">✨ auto</span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem value="__no_endpoints__" disabled>
                          <div className="text-gray-500 italic">
                            No endpoints found
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  
                  {/* Enhanced Debug Info Panel */}
                  {selectedSystem && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md text-xs space-y-1">
                      <div><strong>Debug Info:</strong></div>
                      <div>System: {selectedSystem.systemName} ({selectedSystem.displayName})</div>
                      <div>Base URL: {selectedSystem.baseUrl}</div>
                      <div>Endpoints Type: {typeof selectedSystem.apiEndpoints}</div>
                      <div>Available Endpoints: {availableEndpoints.length}</div>
                      {Object.keys(discoveredEndpoints).length > 0 && (
                        <div className="text-green-600">
                          ✨ Auto-discovered: {Object.keys(discoveredEndpoints).length} endpoints
                        </div>
                      )}
                      {availableEndpoints.length === 0 && !discovering && (
                        <div className="text-orange-600 font-medium">
                          ⚠️ No endpoints found. Try auto-discovery or configure manually.
                        </div>
                      )}
                      {discovering && (
                        <div className="text-blue-600 font-medium">
                          🔍 Scanning {selectedSystem.baseUrl} for available endpoints...
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">HTTP Method</Label>
                  <Select
                    value={widgetForm.queryConfig.method}
                    onValueChange={(value) => setWidgetForm({
                      ...widgetForm,
                      queryConfig: { ...widgetForm.queryConfig, method: value }
                    })}
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

              <div className="space-y-2">
                <Label htmlFor="queryParams">Query Parameters (JSON)</Label>
                <Textarea
                  id="queryParams"
                  value={JSON.stringify(widgetForm.queryConfig.params || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const params = JSON.parse(e.target.value);
                      setWidgetForm({
                        ...widgetForm,
                        queryConfig: { ...widgetForm.queryConfig, params }
                      });
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  placeholder={`{
  "status": "active",
  "limit": 100
}`}
                  className="font-mono text-sm"
                  rows={4}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">🎯 Dynamic Field Mapping</Label>
                    <p className="text-sm text-gray-600">
                      Create custom field names and map them to API response fields
                    </p>
                  </div>
                  {testData && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={autoSuggestCustomFields}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Auto-Suggest Fields
                    </Button>
                  )}
                </div>

                {testData ? (
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-medium">🎛️ Your Custom Field Mappings</h4>
                    
                    {/* Add New Field */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                      <h5 className="text-sm font-medium mb-3">➕ Add New Field</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="newFieldName" className="text-xs">Custom Field Name *</Label>
                          <Input
                            id="newFieldName"
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            placeholder="e.g., Ticket Title, User Name"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="newFieldDesc" className="text-xs">Description (Optional)</Label>
                          <Input
                            id="newFieldDesc"
                            value={newFieldDescription}
                            onChange={(e) => setNewFieldDescription(e.target.value)}
                            placeholder="What this field represents"
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button 
                            onClick={addCustomField}
                            disabled={!newFieldName.trim()}
                            size="sm"
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Field
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Custom Fields List */}
                    <div className="space-y-3">
                      {customFields.map((field) => (
                        <div key={field.id} className="border rounded-lg p-4 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div>
                              <Label className="text-sm font-medium text-blue-700">
                                {field.customName}
                              </Label>
                              {field.description && (
                                <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                              )}
                            </div>
                            
                            <div>
                              <Label className="text-xs">Maps to API Field:</Label>
                              <Select
                                value={field.apiField}
                                onValueChange={(value) => updateCustomField(field.id, { apiField: value })}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select API field" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">-- None --</SelectItem>
                                  {Object.entries(flattenObject(testData)).map(([apiField, value]) => (
                                    <SelectItem key={apiField} value={apiField}>
                                      <div className="flex items-center justify-between w-full">
                                        <span className="font-mono text-sm">{apiField}</span>
                                        <span className="text-xs text-gray-500 ml-2 max-w-24 truncate">
                                          {String(value).substring(0, 20)}...
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex gap-2">
                              {editingFieldId === field.id ? (
                                <div className="flex gap-2 flex-1">
                                  <Input
                                    value={editingFieldName}
                                    onChange={(e) => setEditingFieldName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        if (editingFieldName.trim()) {
                                          updateCustomField(field.id, { customName: editingFieldName.trim() });
                                        }
                                        setEditingFieldId(null);
                                        setEditingFieldName('');
                                      } else if (e.key === 'Escape') {
                                        setEditingFieldId(null);
                                        setEditingFieldName('');
                                      }
                                    }}
                                    className="text-sm"
                                    autoFocus
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (editingFieldName.trim()) {
                                        updateCustomField(field.id, { customName: editingFieldName.trim() });
                                      }
                                      setEditingFieldId(null);
                                      setEditingFieldName('');
                                    }}
                                  >
                                    ✓
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingFieldId(null);
                                      setEditingFieldName('');
                                    }}
                                  >
                                    ✗
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingFieldId(field.id);
                                      setEditingFieldName(field.customName);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeCustomField(field.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {customFields.length === 0 && (
                        <div className="text-center py-6 text-gray-500">
                          <div className="text-2xl mb-2">📋</div>
                          <p className="font-medium">No custom fields yet</p>
                          <p className="text-sm">Add fields above or use "Auto-Suggest Fields"</p>
                        </div>
                      )}
                    </div>

                    {/* Current Mapping Preview */}
                    {customFields.length > 0 && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h5 className="text-sm font-medium text-blue-800 mb-2">📋 Current Mapping Preview:</h5>
                        <div className="text-xs font-mono text-blue-700 space-y-1">
                          {customFields
                            .filter(field => field.apiField !== '__none__')
                            .map(field => (
                              <div key={field.id} className="flex justify-between">
                                <span className="font-semibold">{field.customName}:</span>
                                <span>{field.apiField}</span>
                              </div>
                            ))}
                          {customFields.filter(field => field.apiField !== '__none__').length === 0 && (
                            <span className="text-gray-500">No fields mapped yet</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="font-medium">Test your API first</p>
                    <p className="text-sm text-gray-600">Click "Test Query" to see available fields for mapping</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                <Input
                  id="refreshInterval"
                  type="number"
                  value={widgetForm.queryConfig.refreshInterval || 30}
                  onChange={(e) => setWidgetForm({
                    ...widgetForm,
                    queryConfig: { 
                      ...widgetForm.queryConfig, 
                      refreshInterval: parseInt(e.target.value) || 30 
                    }
                  })}
                  min="10"
                  max="3600"
                />
              </div>

              <Button onClick={testWidget} disabled={testing || !widgetForm.queryConfig.endpoint}>
                {testing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Test Query
                  </>
                )}
              </Button>

              {testData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                      {testData.error ? (
                        <span className="text-red-600">❌ Test Failed</span>
                      ) : (
                        <span className="text-green-600">✅ Test Results</span>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreviewWidget}
                          disabled={!testData || testData.error}
                          title="Preview widget with current data"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview Widget
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreviewMapping}
                          disabled={!testData || testData.error || customFields.length === 0}
                          title="Preview field mapping results"
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Preview Mapping
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(testData, null, 2));
                            // Could add toast notification here
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {testData.error ? (
                      <div className="bg-red-50 border border-red-200 p-3 rounded">
                        <div className="text-sm font-medium text-red-800 mb-2">
                          🚨 API Request Failed
                        </div>
                        <div className="text-sm text-red-700 mb-3">
                          Error: {testData.error}
                        </div>
                        <div className="text-xs text-red-600 space-y-1">
                          <p><strong>Common causes:</strong></p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Wrong endpoint URL or endpoint doesn't exist</li>
                            <li>External system is down or unreachable</li>
                            <li>Authentication required (check system credentials)</li>
                            <li>Network connectivity issues</li>
                          </ul>
                          <p className="mt-2"><strong>Try:</strong></p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Check if the system base URL is correct</li>
                            <li>Use the "Auto-Discover" button to find valid endpoints</li>
                            <li>Verify the system is online and accessible</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <strong className="text-sm">✅ Response Structure:</strong>
                        <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40 mt-1">
                          {JSON.stringify(testData, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {testData && typeof testData === 'object' && !testData.error && (
                      <div>
                        <strong className="text-sm">Available Fields for Mapping:</strong>
                        <div className="mt-1 text-xs bg-blue-50 p-3 rounded">
                          {(() => {
                            const extractFields = (obj: any, prefix = ''): string[] => {
                              const fields: string[] = [];
                              if (Array.isArray(obj)) {
                                if (obj.length > 0) {
                                  fields.push(...extractFields(obj[0], prefix));
                                }
                              } else if (obj && typeof obj === 'object') {
                                Object.keys(obj).forEach(key => {
                                  const fullPath = prefix ? `${prefix}.${key}` : key;
                                  const value = obj[key];
                                  if (Array.isArray(value)) {
                                    fields.push(`${fullPath}[] (array)`);
                                    if (value.length > 0 && typeof value[0] === 'object') {
                                      fields.push(...extractFields(value[0], `${fullPath}[0]`));
                                    }
                                  } else if (value && typeof value === 'object') {
                                    fields.push(`${fullPath} (object)`);
                                    fields.push(...extractFields(value, fullPath));
                                  } else {
                                    fields.push(`${fullPath}: ${typeof value}`);
                                  }
                                });
                              }
                              return fields;
                            };
                            
                            const fields = extractFields(testData);
                            return fields.length > 0 ? (
                              <div className="grid grid-cols-1 gap-1">
                                {fields.slice(0, 20).map((field, i) => (
                                  <div key={i} className="font-mono text-xs">
                                    • {field}
                                  </div>
                                ))}
                                {fields.length > 20 && (
                                  <div className="text-gray-500 italic">
                                    ... and {fields.length - 20} more fields
                                  </div>
                                )}
                              </div>
                            ) : 'No fields detected';
                          })()}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <strong className="text-sm">Example Data Mapping:</strong>
                      <pre className="text-xs bg-green-50 p-3 rounded mt-1">
{`{
  "label": "field_name_for_labels",
  "value": "field_name_for_values", 
  "status": "field_name_for_status",
  "date": "field_name_for_dates"
}`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Please select an external system first</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="visual" className="space-y-4">
          {widgetForm.type === 'chart' && (
            <>
              <div className="space-y-3">
                <Label>Chart Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {chartTypes.map(chart => {
                    const Icon = chart.icon;
                    return (
                      <Card
                        key={chart.value}
                        className={`cursor-pointer transition-all ${
                          widgetForm.visualConfig.chartType === chart.value 
                            ? 'ring-2 ring-blue-500 bg-blue-50' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setWidgetForm({
                          ...widgetForm,
                          visualConfig: { ...widgetForm.visualConfig, chartType: chart.value as any }
                        })}
                      >
                        <CardContent className="p-4 text-center">
                          <Icon className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                          <div className="font-medium">{chart.label}</div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Color Preset</Label>
                <div className="grid grid-cols-2 gap-3">
                  {colorPresets.map(preset => (
                    <Card
                      key={preset.name}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setWidgetForm({
                        ...widgetForm,
                        visualConfig: { ...widgetForm.visualConfig, colors: preset.colors }
                      })}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            {preset.colors.map((color, i) => (
                              <div
                                key={i}
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium">{preset.name}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="showLegend"
                    checked={widgetForm.visualConfig.showLegend}
                    onCheckedChange={(checked) => setWidgetForm({
                      ...widgetForm,
                      visualConfig: { ...widgetForm.visualConfig, showLegend: checked }
                    })}
                  />
                  <Label htmlFor="showLegend">Show Legend</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="showGrid"
                    checked={widgetForm.visualConfig.showGrid}
                    onCheckedChange={(checked) => setWidgetForm({
                      ...widgetForm,
                      visualConfig: { ...widgetForm.visualConfig, showGrid: checked }
                    })}
                  />
                  <Label htmlFor="showGrid">Show Grid</Label>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="height">Widget Height (px)</Label>
            <Input
              id="height"
              type="number"
              value={widgetForm.visualConfig.height || 300}
              onChange={(e) => setWidgetForm({
                ...widgetForm,
                visualConfig: { ...widgetForm.visualConfig, height: parseInt(e.target.value) || 300 }
              })}
              min="200"
              max="800"
            />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Widget Preview</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testWidget}
                    disabled={testing || !widgetForm.systemId || !widgetForm.queryConfig.endpoint}
                  >
                    {testing ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Preview Data
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('query')}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Configure Query
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!widgetForm.systemId || !widgetForm.queryConfig.endpoint ? (
                <div className="text-center py-8 text-gray-500 space-y-4">
                  <div className="text-lg font-medium">Configure Widget to See Preview</div>
                  <div className="text-sm">
                    {!widgetForm.systemId && <div>• Select an external system</div>}
                    {!widgetForm.queryConfig.endpoint && <div>• Configure the data endpoint</div>}
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('basic')}
                    className="mt-4"
                  >
                    Go to Configuration
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Widget Configuration Summary */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Widget Type</div>
                      <div className="text-lg capitalize">{widgetForm.type}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">Data Source</div>
                      <div className="text-lg">
                        {systems.find(s => s.id === widgetForm.systemId)?.displayName || 'Unknown System'}
                      </div>
                    </div>
                    {widgetForm.type === 'chart' && (
                      <>
                        <div>
                          <div className="text-sm font-medium text-gray-700">Chart Type</div>
                          <div className="text-lg capitalize">{widgetForm.visualConfig.chartType}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-700">Colors</div>
                          <div className="flex space-x-1">
                            {widgetForm.visualConfig.colors?.slice(0, 4).map((color, i) => (
                              <div
                                key={i}
                                className="w-6 h-6 rounded border"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Live Data Preview */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="text-center space-y-4">
                      <div className="text-lg font-medium">Live Data Preview</div>
                      {testData ? (
                        testData.error ? (
                          <div className="text-red-600 space-y-2">
                            <div className="text-lg">❌ Data Error</div>
                            <div className="text-sm bg-red-50 p-3 rounded border border-red-200">
                              {testData.error}
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setActiveTab('query')}
                            >
                              Fix Query Configuration
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="text-green-600 text-lg">✅ Data Connected</div>
                            
                            {/* Real Widget Preview */}
                            <div className="bg-white border rounded-lg p-4">
                              <div className="text-lg font-medium mb-4 text-center">
                                {widgetForm.name || `${widgetForm.type.charAt(0).toUpperCase() + widgetForm.type.slice(1)} Widget`}
                              </div>
                              <RealPreviewWidget 
                                widget={widgetForm} 
                                data={Array.isArray(testData) ? testData : testData.data || []} 
                              />
                              <div className="text-center text-sm text-gray-500 mt-3">
                                {Array.isArray(testData) ? testData.length : (testData.data?.length || 'N/A')} data points
                                • {widgetForm.visualConfig.chartType} style
                                • {widgetForm.visualConfig.height || 300}px height
                              </div>
                            </div>

                            <div className="text-sm text-gray-600 space-y-1">
                              <div>✓ Data connection established</div>
                              <div>✓ {customFields.length} fields mapped</div>
                              <div>✓ Refresh every {widgetForm.queryConfig.refreshInterval || 30} seconds</div>
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={testWidget}
                              disabled={testing}
                              className="mt-4"
                            >
                              {testing ? (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  Refreshing...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Refresh Preview
                                </>
                              )}
                            </Button>
                          </div>
                        )
                      ) : (
                        <div className="space-y-4">
                          <div className="text-gray-600">
                            <div className="text-lg">🔗 Ready to Preview</div>
                            <div className="text-sm">Test your data connection to see a live preview</div>
                          </div>
                          <Button 
                            variant="default"
                            onClick={() => setActiveTab('query')}
                          >
                            Test Data Connection
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Field Mapping Preview */}
                  {customFields.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Field Mapping</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {customFields.slice(0, 6).map(field => (
                          <div key={field.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                            <div className="font-medium text-blue-600">{field.customName}</div>
                            <div className="text-gray-400">→</div>
                            <div className="text-gray-600">{field.apiField}</div>
                          </div>
                        ))}
                        {customFields.length > 6 && (
                          <div className="text-gray-500 p-2">
                            ... and {customFields.length - 6} more fields
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Validation Message */}
        {validationMessage && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-5 w-5 text-red-400">⚠️</div>
              </div>
              <div className="ml-3">
                <div className="text-sm text-red-800">
                  <strong>Validation Error:</strong> {validationMessage}
                </div>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setValidationMessage('')}
                    className="h-5 w-5 p-0 text-red-400 hover:text-red-600"
                  >
                    <span className="sr-only">Dismiss</span>
                    ×
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!validateForm().isValid || loading}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {widget ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {widget ? 'Update Widget' : 'Create Widget'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 