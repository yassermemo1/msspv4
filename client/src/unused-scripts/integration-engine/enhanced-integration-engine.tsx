import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, Settings, Database, Eye, Trash2, Edit, Play, RefreshCw, 
  ExternalLink, Copy, BarChart3, PieChart, LineChart, Grid3x3,
  AlertTriangle, CheckCircle, Clock, Activity, Search, Filter, Download, Check
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEnhancedToast } from '@/lib/toast-utils';
import { SystemConfigDialog } from './system-config-dialog';
import { WidgetBuilder } from './widget-builder';
import { 
  AreaChart, Area, BarChart, Bar, LineChart as RechartsLineChart, Line, 
  PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// Types
interface ExternalSystem {
  id: number;
  systemName: string;
  displayName: string;
  baseUrl: string;
  authType: string;
  authConfig: any;
  apiEndpoints: any;
  isActive: boolean;
  lastSync?: string;
  syncStatus?: 'success' | 'error' | 'pending' | 'never';
  createdAt: string;
}

interface DataWidget {
  id: number;
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
  dataMapping?: Record<string, string>;
  isActive: boolean;
  createdAt: string;
}

interface WidgetData {
  widgetId: number;
  data: any[];
  lastUpdated: string;
  status: 'success' | 'error' | 'loading';
  error?: string;
}

// Widget Chart Component
function WidgetChart({ widget, data }: { widget: DataWidget; data: any[] }) {
  const chartColors = widget.visualConfig.colors || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  // Process data for charts
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    // Try to extract numeric data for charts
    return data.map((item, index) => {
      const processedItem: any = { name: `Item ${index + 1}`, index };
      
      Object.entries(item).forEach(([key, value]) => {
        if (typeof value === 'number') {
          processedItem[key] = value;
        } else if (typeof value === 'string' && !isNaN(Number(value))) {
          processedItem[key] = Number(value);
        } else if (typeof value === 'string') {
          processedItem.name = value.slice(0, 20); // Use first string as name
        }
      });
      
      return processedItem;
    });
  }, [data]);

  const renderChart = () => {
    if (!chartData.length) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <div>No data available for visualization</div>
          </div>
        </div>
      );
    }

    const chartProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    };

    switch (widget.visualConfig.chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart {...chartProps}>
              {widget.visualConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {widget.visualConfig.showLegend && <Legend />}
              {Object.keys(chartData[0] || {})
                .filter(key => key !== 'name' && key !== 'index' && typeof chartData[0]?.[key] === 'number')
                .map((key, index) => (
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
        const pieData = chartData.slice(0, 8).map((item, index) => ({
          name: item.name || `Item ${index + 1}`,
          value: Object.values(item).find(v => typeof v === 'number') as number || 1
        }));
        
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius="80%"
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
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...chartProps}>
              {widget.visualConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {widget.visualConfig.showLegend && <Legend />}
              {Object.keys(chartData[0] || {})
                .filter(key => key !== 'name' && key !== 'index' && typeof chartData[0]?.[key] === 'number')
                .map((key, index) => (
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
  };

  return (
    <div className="w-full h-full">
      {renderChart()}
    </div>
  );
}

// Widget Table Component
function WidgetTable({ data }: { data: any[] }) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <Grid3x3 className="h-8 w-8 mx-auto mb-2" />
          <div>No data available</div>
        </div>
      </div>
    );
  }

  const columns = Object.keys(data[0] || {});
  
  return (
    <div className="overflow-auto h-full">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(col => (
              <TableHead key={col} className="font-medium">
                {col.charAt(0).toUpperCase() + col.slice(1)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, 10).map((row, index) => (
            <TableRow key={index}>
              {columns.map(col => (
                <TableCell key={col} className="text-sm">
                  {String(row[col] || '')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.length > 10 && (
        <div className="text-xs text-gray-500 text-center py-2">
          Showing 10 of {data.length} records
        </div>
      )}
    </div>
  );
}

// Widget Metric Component
function WidgetMetric({ data }: { data: any[] }) {
  if (!data || !Array.isArray(data)) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <Activity className="h-8 w-8 mx-auto mb-2" />
          <div>No data available</div>
        </div>
      </div>
    );
  }

  // Calculate basic metrics
  const totalRecords = data.length;
  const numericValues = data.flatMap(item => 
    Object.values(item).filter(val => typeof val === 'number')
  ) as number[];
  
  const average = numericValues.length > 0 
    ? (numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(2)
    : 'N/A';
    
  const max = numericValues.length > 0 ? Math.max(...numericValues) : 'N/A';
  const min = numericValues.length > 0 ? Math.min(...numericValues) : 'N/A';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 h-full">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{totalRecords}</div>
        <div className="text-sm text-gray-600">Total Records</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{average}</div>
        <div className="text-sm text-gray-600">Average</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-600">{max}</div>
        <div className="text-sm text-gray-600">Maximum</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-orange-600">{min}</div>
        <div className="text-sm text-gray-600">Minimum</div>
      </div>
    </div>
  );
}

export function EnhancedIntegrationEngine() {
  const { showError, showSuccess, showInfo, showWarning } = useEnhancedToast();
  
  // State
  const [activeTab, setActiveTab] = useState('systems');
  const [systems, setSystems] = useState<ExternalSystem[]>([]);
  const [widgets, setWidgets] = useState<DataWidget[]>([]);
  const [widgetData, setWidgetData] = useState<Map<number, WidgetData>>(new Map());
  const [selectedSystem, setSelectedSystem] = useState<ExternalSystem | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [showSystemDialog, setShowSystemDialog] = useState(false);
  const [showWidgetDialog, setShowWidgetDialog] = useState(false);
  const [editingSystem, setEditingSystem] = useState<ExternalSystem | null>(null);
  const [editingWidget, setEditingWidget] = useState<DataWidget | null>(null);

  // Form states
  const [systemForm, setSystemForm] = useState({
    systemName: '',
    displayName: '',
    baseUrl: '',
    authType: 'none',
    authConfig: '{}',
    apiEndpoints: '{}',
    basicUsername: '',
    basicPassword: '',
    bearerToken: '',
    apiKeyHeader: '',
    apiKeyValue: ''
  });

  const [widgetForm, setWidgetForm] = useState({
    name: '',
    description: '',
    type: 'chart' as const,
    systemId: '',
    endpoint: '',
    method: 'GET',
    params: '{}',
    mapping: '{}',
    refreshInterval: 30,
    chartType: 'bar' as const,
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
    showLegend: true,
    showGrid: true,
    height: 300
  });

  // Preview states
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewType, setPreviewType] = useState<'widget' | 'mapping' | 'system'>('widget');
  const [previewConfig, setPreviewConfig] = useState<any>(null);

  // Load data on mount
  useEffect(() => {
    fetchSystems();
    fetchWidgets();
  }, []);

  // Auto-refresh widgets
  useEffect(() => {
    const intervals = new Map();
    
    widgets.forEach(widget => {
      if (widget.isActive && widget.queryConfig.refreshInterval) {
        const interval = setInterval(() => {
          refreshWidgetData(widget.id);
        }, widget.queryConfig.refreshInterval * 1000);
        intervals.set(widget.id, interval);
      }
    });

    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [widgets]);

  // API Functions
  const fetchSystems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/external-systems');
      if (!response.ok) {
        showError(`Failed to fetch external systems: ${response.status} ${response.statusText}`, {
          context: 'EnhancedIntegrationEngine.fetchSystems'
        });
        return;
      }
      const data = await response.json();
      setSystems(data);
    } catch (error) {
      showError(error as Error, {
        context: 'EnhancedIntegrationEngine.fetchSystems'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWidgets = async () => {
    try {
      const response = await fetch('/api/dashboard-widgets', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('Authentication required for widgets');
          return;
        }
        showError(`Failed to fetch widgets: ${response.status} ${response.statusText}`, {
          context: 'EnhancedIntegrationEngine.fetchWidgets'
        });
        return;
      }
      const serverWidgets = await response.json();
      
      // Transform server widget format back to client format
      const clientWidgets: DataWidget[] = serverWidgets.map((serverWidget: any) => ({
        id: serverWidget.id,
        name: serverWidget.name,
        description: serverWidget.config?.description || '',
        type: serverWidget.widgetType, // Transform 'widgetType' back to 'type'
        systemId: serverWidget.config?.systemId || 0,
        queryConfig: serverWidget.config?.queryConfig || {
          endpoint: '',
          method: 'GET',
          params: {},
          refreshInterval: serverWidget.refreshInterval || 30
        },
        visualConfig: serverWidget.config?.visualConfig || {
          chartType: 'bar',
          colors: ['#3b82f6', '#1e40af', '#60a5fa', '#93c5fd'],
          showLegend: true,
          showGrid: true,
          height: 300
        },
        dataMapping: serverWidget.config?.dataMapping || {},
        isActive: serverWidget.isActive,
        createdAt: serverWidget.createdAt
      }));
      
      console.log('📊 Fetched widgets:', { server: serverWidgets, client: clientWidgets });
      setWidgets(clientWidgets);
      
      // Load initial data for all active widgets
      clientWidgets.filter((w: DataWidget) => w.isActive).forEach((widget: DataWidget) => {
        refreshWidgetData(widget.id);
      });
    } catch (error) {
      showError(error as Error, {
        context: 'EnhancedIntegrationEngine.fetchWidgets'
      });
    }
  };

  const refreshWidgetData = async (widgetId: number) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;

    setWidgetData(prev => new Map(prev.set(widgetId, {
      widgetId,
      data: prev.get(widgetId)?.data || [],
      lastUpdated: new Date().toISOString(),
      status: 'loading'
    })));

    try {
      const response = await fetch(`/api/dashboard-widgets/${widgetId}/data`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please login first.');
        }
        throw new Error(`Failed to fetch widget data: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Widget ${widgetId} data:`, data); // Debug log
      
      setWidgetData(prev => new Map(prev.set(widgetId, {
        widgetId,
        data: data.data || [],
        lastUpdated: new Date().toISOString(),
        status: 'success'
      })));
    } catch (error) {
      console.error(`Widget ${widgetId} error:`, error); // Debug log
      
      setWidgetData(prev => new Map(prev.set(widgetId, {
        widgetId,
        data: [],
        lastUpdated: new Date().toISOString(),
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })));
      
      await showError(`Failed to refresh widget "${widget.name}": ${error instanceof Error ? error.message : 'Unknown error'}`, {
        context: 'EnhancedIntegrationEngine.refreshWidgetData'
      });
    }
  };

  const testSystemConnection = async (system: ExternalSystem) => {
    try {
      const response = await fetch('/api/external-systems/test-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemName: system.systemName,
          baseUrl: system.baseUrl,
          authType: system.authType,
          authConfig: system.authConfig
        })
      });

      if (!response.ok) {
        await showError(`Connection test failed: ${response.statusText}`, {
          context: 'EnhancedIntegrationEngine.testSystemConnection'
        });
        return;
      }

      const result = await response.json();
      if (result.status === 'success') {
        showSuccess(`✅ Connection to "${system.displayName}" successful! Response time: ${result.data?.response_time || 'N/A'}`);
      } else {
        await showError(`Connection test failed: ${result.error_message || 'Unknown error'}`, {
          context: 'EnhancedIntegrationEngine.testSystemConnection'
        });
      }
    } catch (error) {
      await showError(error as Error, {
        context: 'EnhancedIntegrationEngine.testSystemConnection'
      });
    }
  };

  const saveSystem = async () => {
    try {
      const systemData = {
        systemName: systemForm.systemName,
        displayName: systemForm.displayName,
        baseUrl: systemForm.baseUrl,
        authType: systemForm.authType,
        authConfig: buildAuthConfig(),
        apiEndpoints: JSON.parse(systemForm.apiEndpoints || '{}')
      };

      const url = editingSystem 
        ? `/api/external-systems/${editingSystem.id}`
        : '/api/external-systems';
      
      const response = await fetch(url, {
        method: editingSystem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemData)
      });

      if (!response.ok) {
        await showError(`Failed to ${editingSystem ? 'update' : 'create'} external system: ${response.status} ${response.statusText}`, {
          context: editingSystem ? 'EnhancedIntegrationEngine.saveSystem' : 'EnhancedIntegrationEngine.saveSystem'
        });
        return;
      }

      showSuccess(`External system ${editingSystem ? 'updated' : 'created'} successfully`);
      setShowSystemDialog(false);
      resetSystemForm();
      fetchSystems();
    } catch (error) {
      await showError(error as Error, {
        context: editingSystem ? 'EnhancedIntegrationEngine.saveSystem' : 'EnhancedIntegrationEngine.saveSystem'
      });
    }
  };

  const buildAuthConfig = () => {
    if (systemForm.authType === 'none') return {};
    if (systemForm.authType === 'basic') {
      return {
        username: systemForm.basicUsername,
        password: systemForm.basicPassword
      };
    }
    if (systemForm.authType === 'bearer') {
      return { token: systemForm.bearerToken };
    }
    if (systemForm.authType === 'api_key') {
      return {
        header: systemForm.apiKeyHeader,
        key: systemForm.apiKeyValue
      };
    }
    try {
      return JSON.parse(systemForm.authConfig);
    } catch {
      return {};
    }
  };

  const resetSystemForm = () => {
    setSystemForm({
      systemName: '',
      displayName: '',
      baseUrl: '',
      authType: 'none',
      authConfig: '{}',
      apiEndpoints: '{}',
      basicUsername: '',
      basicPassword: '',
      bearerToken: '',
      apiKeyHeader: '',
      apiKeyValue: ''
    });
    setEditingSystem(null);
  };

  const editSystem = (system: ExternalSystem) => {
    setEditingSystem(system);
    const auth = system.authConfig || {};
    setSystemForm({
      systemName: system.systemName,
      displayName: system.displayName,
      baseUrl: system.baseUrl,
      authType: system.authType,
      authConfig: JSON.stringify(system.authConfig, null, 2),
      apiEndpoints: JSON.stringify(system.apiEndpoints, null, 2),
      basicUsername: auth.username || '',
      basicPassword: auth.password || '',
      bearerToken: auth.token || '',
      apiKeyHeader: auth.header || '',
      apiKeyValue: auth.key || ''
    });
    setShowSystemDialog(true);
  };

  const deleteSystem = async (systemId: number) => {
    if (!confirm('Are you sure you want to delete this external system?')) return;

    try {
      const response = await fetch(`/api/external-systems/${systemId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        await showError(`Failed to delete external system: ${response.status} ${response.statusText}`, {
          context: 'EnhancedIntegrationEngine.deleteSystem'
        });
        return;
      }

      showSuccess('External system deleted successfully');
      fetchSystems();
    } catch (error) {
      await showError(error as Error, {
        context: 'EnhancedIntegrationEngine.deleteSystem'
      });
    }
  };

  // Widget Management Functions
  const saveWidget = async (widget: DataWidget) => {
    try {
      setLoading(true);
      
      // Transform the client widget format to the server's expected format
      const serverWidget = {
        name: widget.name,
        widgetType: widget.type, // Transform 'type' to 'widgetType'
        config: {
          // Combine all widget configuration into a single config object
          systemId: widget.systemId,
          queryConfig: widget.queryConfig,
          visualConfig: widget.visualConfig,
          dataMapping: widget.dataMapping,
          description: widget.description
        },
        dataSourceId: null, // For now, we're not using data sources, only external systems
        refreshInterval: widget.queryConfig.refreshInterval || 30,
        createdBy: 1 // This should be set by the server from the authenticated user
      };
      
      const url = editingWidget 
        ? `/api/dashboard-widgets/${editingWidget.id}`
        : '/api/dashboard-widgets';
      
      console.log('🚀 Saving widget:', { url, method: editingWidget ? 'PUT' : 'POST', data: serverWidget });
      
      const response = await fetch(url, {
        method: editingWidget ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverWidget)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to ${editingWidget ? 'update' : 'create'} widget`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If not JSON, use the raw text
          errorMessage = errorText || errorMessage;
        }
        
        console.error('❌ Widget save failed:', { status: response.status, errorText });
        
        await showError(errorMessage, {
          context: 'Widget Save',
          requestDetails: {
            method: editingWidget ? 'PUT' : 'POST',
            endpoint: url,
            body: serverWidget,
            status: response.status
          }
        });
        return;
      }

      const savedWidget = await response.json();
      console.log('✅ Widget saved successfully:', savedWidget);
      
      showSuccess(`Widget ${editingWidget ? 'updated' : 'created'} successfully`);
      setShowWidgetDialog(false);
      setEditingWidget(null);
      fetchWidgets();
    } catch (error) {
      console.error('❌ Widget save network error:', error);
      await showError(error as Error, {
        context: 'Widget Save Network Error',
        requestDetails: {
          method: editingWidget ? 'PUT' : 'POST',
          endpoint: editingWidget ? `/api/dashboard-widgets/${editingWidget.id}` : '/api/dashboard-widgets'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // 🧪 Simple and Clean Test Query Function
  const testWidgetQuery = async (config: any) => {
    console.log('🧪 Test Query - Starting test with config:', config);
    
    try {
      // Validate required fields
      if (!config.systemId) {
        throw new Error('Please select a system first');
      }
      if (!config.endpoint) {
        throw new Error('Please enter an API endpoint');
      }

      console.log('🌐 Making test request to server...');
      
      const response = await fetch('/api/integration-engine/test-query', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          systemId: parseInt(config.systemId.toString()),
          endpoint: config.endpoint,
          method: config.method || 'GET',
          params: config.params || {}
        }),
        credentials: 'include' // Include session cookies
      });

      console.log('📡 Response received:', response.status, response.statusText);

      // Handle different response status codes
      if (response.status === 401) {
        throw new Error('⚠️ Please login first to test API endpoints');
      }
      
      if (response.status === 404) {
        throw new Error('❌ Server endpoint not found. Make sure the server is running properly.');
      }
      
      if (response.status === 403) {
        throw new Error('⚠️ Access denied. You may not have permission to test API endpoints.');
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Test failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Test successful! Data received:', data);
      
      return {
        success: true,
        data: data,
        message: `Successfully fetched ${Array.isArray(data) ? data.length : 1} record(s)`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  };

  const editWidget = (widget: DataWidget) => {
    setEditingWidget(widget);
    setShowWidgetDialog(true);
  };

  const deleteWidget = async (widgetId: number) => {
    if (!confirm('Are you sure you want to delete this widget?')) return;

    try {
      const response = await fetch(`/api/dashboard-widgets/${widgetId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        await showError(`Failed to delete widget: ${response.status} ${response.statusText}`, {
          context: 'EnhancedIntegrationEngine.deleteWidget'
        });
        return;
      }

      showSuccess('Widget deleted successfully');
      fetchWidgets();
    } catch (error) {
      await showError(error as Error, {
        context: 'EnhancedIntegrationEngine.deleteWidget'
      });
    }
  };

  // Preview Functions
  const previewWidgetData = async (widget: Partial<DataWidget> | any) => {
    try {
      setPreviewLoading(true);
      setPreviewType('widget');
      setPreviewConfig(widget);
      setShowPreview(true);

      // Check if we have the required configuration for real data
      const systemId = widget.systemId || widget.config?.systemId;
      const endpoint = widget.queryConfig?.endpoint || widget.endpoint;
      
      console.log('🔍 Preview Widget Data Debug:', {
        widget,
        systemId,
        endpoint,
        availableSystems: systems.map(s => ({ id: s.id, name: s.systemName }))
      });

      // If we have a system and endpoint, fetch real data
      if (systemId && endpoint) {
        const system = systems.find(s => s.id === parseInt(systemId.toString()));
        if (system) {
          console.log('🌐 Fetching real data from system:', system.displayName);
          
          const response = await fetch('/api/integration-engine/test-query', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              systemId: system.id,
              endpoint: endpoint,
              method: widget.queryConfig?.method || widget.method || 'GET',
              params: widget.queryConfig?.params || widget.params || {}
            }),
            credentials: 'include'
          });

          if (!response.ok) {
            if (response.status === 401) {
              throw new Error('⚠️ Please login first to preview widgets');
            } else if (response.status === 404) {
              throw new Error('❌ Server endpoint not found. Check server status.');
            } else {
              const errorText = await response.text().catch(() => 'Unknown error');
              console.error('❌ Real data fetch failed:', errorText);
              throw new Error(`Preview failed (${response.status}): ${errorText}`);
            }
          }

          const data = await response.json();
          console.log('✅ Real data fetched successfully:', data);
          
          setPreviewData({
            ...data,
            isRealData: true,
            systemName: system.displayName,
            endpoint: endpoint,
            fetchedAt: new Date().toISOString()
          });
          
          showSuccess(`Real data loaded from ${system.displayName}!`);
          return;
        } else {
          console.warn('⚠️ System not found:', systemId);
          throw new Error(`System with ID ${systemId} not found. Available systems: ${systems.map(s => s.systemName).join(', ')}`);
        }
      }

      // Show sample data with helpful guidance
      console.log('📋 Showing sample data - missing configuration:', { systemId, endpoint });
      setPreviewData({
        sampleData: true,
        isRealData: false,
        message: "Configure system and endpoint to see real data preview",
        guidance: {
          steps: [
            !systemId ? "1. Select an external system in the 'Basic Info' tab" : null,
            !endpoint ? "2. Configure the data endpoint in the 'Data Query' tab" : null,
            "3. Test the connection to verify it works",
            "4. Return to this preview to see real data"
          ].filter(Boolean),
          currentConfig: {
            systemSelected: !!systemId,
            endpointConfigured: !!endpoint,
            systemName: systemId ? systems.find(s => s.id === parseInt(systemId.toString()))?.displayName : 'None selected'
          }
        },
        data: [
          { id: 1, name: "Sample Item 1", status: "active", value: 100, category: "A", priority: "high" },
          { id: 2, name: "Sample Item 2", status: "inactive", value: 75, category: "B", priority: "medium" },
          { id: 3, name: "Sample Item 3", status: "active", value: 150, category: "A", priority: "low" },
          { id: 4, name: "Sample Item 4", status: "pending", value: 200, category: "C", priority: "high" }
        ]
      });
      
      showInfo(
        "Sample Data Preview", 
        !systemId ? "Please select a system first" : "Please configure an endpoint to see real data"
      );
      
    } catch (error) {
      console.error('❌ Preview error:', error);
      await showError(error as Error, {
        context: 'Widget Data Preview',
        requestDetails: {
          systemId: widget.systemId,
          endpoint: widget.queryConfig?.endpoint
        }
      });
      
      setPreviewData({
        error: true,
        isRealData: false,
        message: error instanceof Error ? error.message : 'Preview failed',
        troubleshooting: [
          "Check if the external system is properly configured",
          "Verify the endpoint URL is correct",
          "Ensure the system is accessible and responding",
          "Check authentication credentials if required"
        ]
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const previewFieldMapping = async (mapping: any, sampleData: any) => {
    try {
      setPreviewLoading(true);
      setPreviewType('mapping');
      setPreviewConfig({ mapping, sampleData });
      setShowPreview(true);

      // Apply field mapping to sample data
      const mappedData = sampleData.map((item: any) => {
        const mapped: any = {};
        Object.entries(mapping).forEach(([customField, apiField]) => {
          if (typeof apiField === 'string' && item[apiField] !== undefined) {
            mapped[customField] = item[apiField];
          }
        });
        return mapped;
      });

      setPreviewData({
        original: sampleData.slice(0, 5), // Show first 5 items
        mapped: mappedData.slice(0, 5),
        mapping
      });
    } catch (error) {
      await showError(error as Error, {
        context: 'EnhancedIntegrationEngine.previewFieldMapping'
      });
      setPreviewData({
        error: true,
        message: error instanceof Error ? error.message : 'Mapping preview failed'
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const previewSystemResponse = async (system: ExternalSystem, endpoint: string) => {
    try {
      setPreviewLoading(true);
      setPreviewType('system');
      setPreviewConfig({ system, endpoint });
      setShowPreview(true);

      const response = await fetch('/api/integration-engine/test-query', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          systemId: system.id,
          endpoint: endpoint,
          method: 'GET'
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`System test failed: ${response.statusText}`);
      }

      const data = await response.json();
      setPreviewData(data);
    } catch (error) {
      await showError(error as Error, {
        context: 'EnhancedIntegrationEngine.previewSystemResponse'
      });
      setPreviewData({
        error: true,
        message: error instanceof Error ? error.message : 'System preview failed'
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadPreviewData = () => {
    if (!previewData) return;
    
    const dataStr = JSON.stringify(previewData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `preview-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showSuccess('Preview data downloaded successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Integration Engine</h1>
          <p className="text-gray-600">Manage external systems, create data widgets, and build integrations</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchSystems} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="systems">External Systems</TabsTrigger>
          <TabsTrigger value="widgets">Data Widgets</TabsTrigger>
          <TabsTrigger value="dashboard">Live Dashboard</TabsTrigger>
        </TabsList>

        {/* Systems Tab */}
        <TabsContent value="systems" className="space-y-4 min-h-[600px]">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">External Systems</h2>
            <Button onClick={() => { resetSystemForm(); setShowSystemDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add System
            </Button>
          </div>

          <div className="grid gap-4">
            {loading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Systems...</h3>
                  <p className="text-gray-600">Please wait while we fetch your external systems</p>
                </CardContent>
              </Card>
            ) : systems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No External Systems</h3>
                  <p className="text-gray-600 mb-4">
                    Get started by connecting your first external system
                  </p>
                  <Button onClick={() => setShowSystemDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First System
                  </Button>
                </CardContent>
              </Card>
            ) : (
              systems.map(system => (
                <Card key={system.id} className="relative">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {system.displayName}
                          <Badge variant={system.isActive ? "default" : "secondary"}>
                            {system.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {system.syncStatus && (
                            <Badge variant={
                              system.syncStatus === 'success' ? "default" :
                              system.syncStatus === 'error' ? "destructive" :
                              system.syncStatus === 'pending' ? "secondary" : "outline"
                            }>
                              {system.syncStatus === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {system.syncStatus === 'error' && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {system.syncStatus === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                              {system.syncStatus}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          {system.baseUrl}
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => testSystemConnection(system)}>
                          <Activity className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => editSystem(system)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => deleteSystem(system.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">System Name:</span> {system.systemName}
                      </div>
                      <div>
                        <span className="font-medium">Auth Type:</span> {system.authType || 'None'}
                      </div>
                      <div>
                        <span className="font-medium">Last Sync:</span> {
                          system.lastSync ? new Date(system.lastSync).toLocaleString() : 'Never'
                        }
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {new Date(system.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Widgets Tab */}
        <TabsContent value="widgets" className="space-y-4 min-h-[600px]">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Data Widgets</h2>
            <div className="flex items-center space-x-2">
              {systems.length === 0 && (
                <p className="text-sm text-gray-500 mr-2">Add an external system first</p>
              )}
              <Button 
                onClick={() => { setEditingWidget(null); setShowWidgetDialog(true); }}
                disabled={systems.length === 0}
                title={systems.length === 0 ? "Add an external system first" : "Create new widget"}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Widget
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {systems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">External System Required</h3>
                  <p className="text-gray-600 mb-4">
                    You need to add an external system before creating widgets
                  </p>
                  <Button onClick={() => setShowSystemDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add External System
                  </Button>
                </CardContent>
              </Card>
            ) : widgets.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Grid3x3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Widgets</h3>
                  <p className="text-gray-600 mb-4">
                    Create interactive widgets from your external system data
                  </p>
                  <Button onClick={() => setShowWidgetDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Widget
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {widgets.map((widget) => {
                  const system = systems.find(s => s.id === widget.systemId);
                  const currentWidgetData = widgetData.get(widget.id);
                  const hasValidConfig = widget.systemId && widget.queryConfig?.endpoint;
                  
                  return (
                    <Card key={widget.id} className={`transition-colors ${!hasValidConfig ? 'border-orange-200 bg-orange-50' : ''}`}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${hasValidConfig ? 'bg-blue-100' : 'bg-orange-100'}`}>
                            {widget.type === 'chart' && <BarChart3 className={`h-4 w-4 ${hasValidConfig ? 'text-blue-600' : 'text-orange-600'}`} />}
                            {widget.type === 'table' && <Grid3x3 className={`h-4 w-4 ${hasValidConfig ? 'text-blue-600' : 'text-orange-600'}`} />}
                            {widget.type === 'metric' && <Activity className={`h-4 w-4 ${hasValidConfig ? 'text-blue-600' : 'text-orange-600'}`} />}
                          </div>
                          <div>
                            <CardTitle className={`text-sm ${hasValidConfig ? '' : 'text-orange-900'}`}>{widget.name}</CardTitle>
                            <p className={`text-xs mt-1 ${hasValidConfig ? 'text-gray-600' : 'text-orange-700'}`}>
                              {!hasValidConfig ? (
                                <span className="flex items-center space-x-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>Configuration needed</span>
                                </span>
                              ) : (
                                `${system?.displayName || 'Unknown System'} • ${widget.queryConfig.endpoint}`
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!hasValidConfig && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => editWidget(widget)}
                              className="border-orange-300 text-orange-700 hover:bg-orange-100"
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              Configure
                            </Button>
                          )}
                          <Badge 
                            variant={widget.isActive ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {widget.type}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => previewWidgetData(widget)}
                              disabled={!hasValidConfig}
                              className={!hasValidConfig ? 'opacity-50' : ''}
                            >
                              <Eye className="h-3 w-3 mr-2" />
                              {hasValidConfig ? 'Preview Data' : 'Need Config'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => editWidget(widget)}
                            >
                              <Edit className="h-3 w-3 mr-2" />
                              Edit
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteWidget(widget.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {currentWidgetData && (
                          <div className="mt-3 p-2 bg-gray-50 rounded-md">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">
                                Last updated: {new Date(currentWidgetData.lastUpdated).toLocaleString()}
                              </span>
                              <Badge 
                                variant={currentWidgetData.status === 'success' ? 'default' : currentWidgetData.status === 'error' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {currentWidgetData.status}
                              </Badge>
                            </div>
                            {currentWidgetData.error && (
                              <p className="text-xs text-red-600 mt-1">{currentWidgetData.error}</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4 min-h-[600px]">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Live Dashboard</h2>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => {
                widgets.filter(w => w.isActive).forEach(w => refreshWidgetData(w.id));
              }} disabled={widgets.filter(w => w.isActive).length === 0}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh All
              </Button>
            </div>
          </div>

          {widgets.filter(w => w.isActive).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Widgets</h3>
                <p className="text-gray-600 mb-4">
                  Create and activate widgets to see live data dashboard
                </p>
                {systems.length === 0 ? (
                  <Button onClick={() => setShowSystemDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add External System
                  </Button>
                ) : (
                  <Button onClick={() => setShowWidgetDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Widget
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {widgets.filter(w => w.isActive).map(widget => {
                const data = widgetData.get(widget.id);
                return (
                  <Card key={widget.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{widget.name}</span>
                        <div className="flex items-center space-x-2">
                          <Badge variant={data?.status === 'success' ? "default" : "secondary"}>
                            {data?.status || 'loading'}
                          </Badge>
                          <Button variant="outline" size="sm" onClick={() => refreshWidgetData(widget.id)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 rounded p-4" style={{ height: widget.visualConfig.height || 300 }}>
                        {data?.status === 'loading' && (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="flex items-center">
                              <RefreshCw className="h-6 w-6 mr-2 animate-spin" />
                              Loading data...
                            </div>
                          </div>
                        )}
                        {data?.status === 'error' && (
                          <div className="flex items-center justify-center h-full text-red-500">
                            <div className="text-center">
                              <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                              <div>Error loading data</div>
                              <div className="text-sm mt-1">{data.error}</div>
                            </div>
                          </div>
                        )}
                        {data?.status === 'success' && data.data && (
                          <div className="h-full">
                            {widget.type === 'chart' && (
                              <WidgetChart widget={widget} data={data.data} />
                            )}
                            {widget.type === 'table' && (
                              <WidgetTable data={data.data} />
                            )}
                            {widget.type === 'metric' && (
                              <WidgetMetric data={data.data} />
                            )}
                            {!['chart', 'table', 'metric'].includes(widget.type) && (
                              <div className="flex items-center justify-center h-full text-gray-500">
                                <div className="text-center">
                                  <Activity className="h-6 w-6 mx-auto mb-2 text-green-500" />
                                  <div>Widget type "{widget.type}" visualization coming soon</div>
                                  <div className="text-sm text-gray-400 mt-2">
                                    {Array.isArray(data.data) ? `${data.data.length} records loaded` : 'Data loaded'}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {!data && (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                              <Clock className="h-6 w-6 mx-auto mb-2" />
                              <div>No data loaded yet</div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2"
                                onClick={() => refreshWidgetData(widget.id)}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Load Data
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* System Configuration Dialog */}
      <Dialog open={showSystemDialog} onOpenChange={setShowSystemDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSystem ? 'Edit' : 'Add'} External System</DialogTitle>
            <DialogDescription>
              Configure external system connection and authentication
            </DialogDescription>
          </DialogHeader>
          <SystemConfigDialog
            systemForm={systemForm}
            setSystemForm={setSystemForm}
            onSave={saveSystem}
            onCancel={() => setShowSystemDialog(false)}
            editingSystem={editingSystem}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Widget Builder Dialog */}
      <Dialog open={showWidgetDialog} onOpenChange={setShowWidgetDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWidget ? 'Edit' : 'Create'} Data Widget</DialogTitle>
            <DialogDescription>
              Build interactive widgets from external system data
            </DialogDescription>
          </DialogHeader>
          <WidgetBuilder
            systems={systems}
            widget={editingWidget}
            onSave={saveWidget}
            onCancel={() => setShowWidgetDialog(false)}
            onTest={testWidgetQuery}
            onPreviewWidget={previewWidgetData}
            onPreviewMapping={previewFieldMapping}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewType === 'widget' ? 'Widget Data Preview' : previewType === 'mapping' ? 'Field Mapping Preview' : 'System Response Preview'}</DialogTitle>
            <DialogDescription>
              {previewType === 'widget' ? 'View widget data' : previewType === 'mapping' ? 'View field mapping' : 'View system response'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {previewLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Loading...</h3>
                  <p className="text-gray-600">Please wait while we load the preview</p>
                </CardContent>
              </Card>
            ) : previewData?.error ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-red-900 mb-2">Preview Error</h3>
                  <p className="text-red-600">{previewData.message}</p>
                  <Button onClick={() => setShowPreview(false)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </CardContent>
              </Card>
            ) : previewData?.sampleData ? (
              <div className="space-y-4">
                {/* Sample Data Header */}
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-orange-100 rounded-full">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle className="text-orange-900">Sample Data Preview</CardTitle>
                        <p className="text-sm text-orange-700 mt-1">
                          {previewData.message}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  {previewData.guidance && (
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Configuration Status */}
                        <div>
                          <h4 className="font-medium text-orange-900 mb-2">Configuration Status</h4>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              {previewData.guidance.currentConfig.systemSelected ? (
                                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              ) : (
                                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">×</span>
                                </div>
                              )}
                              <span className="text-sm">
                                System: {previewData.guidance.currentConfig.systemName || 'None selected'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {previewData.guidance.currentConfig.endpointConfigured ? (
                                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              ) : (
                                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">×</span>
                                </div>
                              )}
                              <span className="text-sm">
                                Endpoint: {previewData.guidance.currentConfig.endpointConfigured ? 'Configured' : 'Not configured'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Next Steps */}
                        <div>
                          <h4 className="font-medium text-orange-900 mb-2">Next Steps</h4>
                          <ol className="space-y-1">
                            {previewData.guidance.steps.map((step: string, index: number) => (
                              <li key={index} className="text-sm text-orange-700 flex items-start space-x-2">
                                <span className="flex-shrink-0 w-4 h-4 bg-orange-200 rounded-full text-orange-800 text-xs flex items-center justify-center mt-0.5">
                                  {index + 1}
                                </span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Sample Data Display */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <span>Sample Data Structure</span>
                      <Badge variant="outline" className="text-xs">
                        {previewData.data?.length || 0} records
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Table View */}
                      {previewData.data && previewData.data.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2 border-b">
                            <h5 className="text-sm font-medium">Preview Table</h5>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100">
                                <tr>
                                  {Object.keys(previewData.data[0]).map(key => (
                                    <th key={key} className="px-3 py-2 text-left font-medium text-gray-700">
                                      {key}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {previewData.data.slice(0, 3).map((row: any, index: number) => (
                                  <tr key={index} className="border-t">
                                    {Object.values(row).map((value: any, cellIndex: number) => (
                                      <td key={cellIndex} className="px-3 py-2 text-gray-600">
                                        {String(value)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      
                      {/* JSON View */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b">
                          <h5 className="text-sm font-medium">JSON Structure</h5>
                        </div>
                        <div className="bg-gray-50 p-4 max-h-64 overflow-auto">
                          <pre className="text-xs text-gray-800">
                            {JSON.stringify(previewData.data, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : previewData ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">
                    {previewType === 'widget' ? 'Widget Data' : 'System Response'}
                  </h3>
                  <div className="flex gap-2">
                    <Button onClick={downloadPreviewData} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download JSON
                    </Button>
                    <Button 
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(previewData, null, 2))}
                      variant="outline" 
                      size="sm"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </div>
                
                {/* Real Data Header */}
                {previewData.isRealData && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-full">
                          <Check className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <CardTitle className="text-green-900">Live Data Connected</CardTitle>
                          <p className="text-sm text-green-700 mt-1">
                            Successfully connected to {previewData.systemName} at {previewData.endpoint}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center space-x-4 text-sm text-green-700">
                        <span>Fetched: {new Date(previewData.fetchedAt).toLocaleString()}</span>
                        <span>•</span>
                        <span>Records: {Array.isArray(previewData.data) ? previewData.data.length : 'Object'}</span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span>Live</span>
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Data Table View */}
                {Array.isArray(previewData) || Array.isArray(previewData.data) ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Grid3x3 className="h-4 w-4" />
                        Table View ({Array.isArray(previewData) ? previewData.length : previewData.data?.length || 0} records)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-96 overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {(() => {
                                const data = Array.isArray(previewData) ? previewData : previewData.data;
                                if (data && data.length > 0) {
                                  return Object.keys(data[0]).map(key => (
                                    <TableHead key={key} className="font-mono text-xs">{key}</TableHead>
                                  ));
                                }
                                return null;
                              })()}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              const data = Array.isArray(previewData) ? previewData : previewData.data;
                              return data?.slice(0, 10).map((item: any, index: number) => (
                                <TableRow key={index}>
                                  {Object.values(item).map((value: any, valueIndex: number) => (
                                    <TableCell key={valueIndex} className="font-mono text-xs max-w-xs truncate">
                                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ));
                            })()}
                          </TableBody>
                        </Table>
                        {(() => {
                          const data = Array.isArray(previewData) ? previewData : previewData.data;
                          if (data && data.length > 10) {
                            return (
                              <div className="text-center py-4 text-sm text-gray-500">
                                Showing first 10 of {data.length} records. Download for full data.
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
                
                {/* Raw JSON View */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Raw JSON Response
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-auto">
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                        {JSON.stringify(previewData, null, 2)}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}