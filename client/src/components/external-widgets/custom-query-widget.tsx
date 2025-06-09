import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { AlertCircle, Play, Settings, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface QueryRequest {
  systemId: number;
  query: string;
  parameters?: Record<string, any>;
  method?: string; // Which query method to use
  format?: string; // Response format preference
  timeout?: number;
  transformations?: string[]; // Data transformation steps
}

interface QueryResponse {
  success: boolean;
  data?: any;
  metadata?: {
    executionTime: number;
    recordCount: number;
    systemName: string;
    method: string;
    transformationsApplied?: string[];
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
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

interface CustomQueryWidgetProps {
  systemId?: number;
  defaultQuery?: string;
  widgetType?: 'table' | 'chart' | 'metric' | 'list' | 'gauge';
  title?: string;
  autoRefresh?: number; // seconds
  config?: any;
}

export const CustomQueryWidget: React.FC<CustomQueryWidgetProps> = ({
  systemId: initialSystemId,
  defaultQuery = '',
  widgetType = 'table',
  title = 'Custom Query',
  autoRefresh,
  config = {}
}) => {
  const [systems, setSystems] = useState<ExternalSystem[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(initialSystemId || null);
  const [selectedSystem, setSelectedSystem] = useState<ExternalSystem | null>(null);
  const [query, setQuery] = useState(defaultQuery);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [transformations, setTransformations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [queryResponse, setQueryResponse] = useState<QueryResponse | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Load external systems
  useEffect(() => {
    loadSystems();
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !selectedSystemId || !query) return;

    const interval = setInterval(() => {
      executeQuery();
    }, autoRefresh * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedSystemId, query, selectedMethod, parameters, transformations]);

  // Update selected system when systemId changes
  useEffect(() => {
    if (selectedSystemId && systems.length > 0) {
      const system = systems.find(s => s.id === selectedSystemId);
      setSelectedSystem(system || null);
      if (system?.queryMethods) {
        const methodNames = Object.keys(system.queryMethods);
        if (methodNames.length > 0 && !selectedMethod) {
          setSelectedMethod(methodNames[0]);
        }
      }
    }
  }, [selectedSystemId, systems]);

  const loadSystems = async () => {
    try {
      const response = await fetch('/api/external-systems');
      if (response.ok) {
        const systemsData = await response.json();
        setSystems(systemsData.filter((s: ExternalSystem) => s.isActive));
      }
    } catch (error) {
      console.error('Failed to load systems:', error);
    }
  };

  const executeQuery = async () => {
    if (!selectedSystemId || !query.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      const queryRequest: QueryRequest = {
        systemId: selectedSystemId,
        query: query.trim(),
        method: selectedMethod || undefined,
        parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
        transformations: transformations.length > 0 ? transformations : undefined,
        timeout: config.timeout || 30000
      };

      const response = await fetch('/api/external-systems/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryRequest),
      });

      const result: QueryResponse = await response.json();
      setQueryResponse(result);
      
      if (result.success) {
        setData(result.data);
      } else {
        setData(null);
      }
    } catch (error) {
      console.error('Query execution failed:', error);
      setQueryResponse({
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Failed to execute query',
          details: error
        }
      });
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    if (!selectedSystemId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/external-systems/${selectedSystemId}/test-connection`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      alert('❌ Connection test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const addParameter = () => {
    const key = prompt('Parameter name:');
    if (key && !parameters[key]) {
      const value = prompt('Parameter value:');
      if (value !== null) {
        setParameters(prev => ({ ...prev, [key]: value }));
      }
    }
  };

  const removeParameter = (key: string) => {
    setParameters(prev => {
      const newParams = { ...prev };
      delete newParams[key];
      return newParams;
    });
  };

  const addTransformation = () => {
    const transformation = prompt('Transformation name:');
    if (transformation && !transformations.includes(transformation)) {
      setTransformations(prev => [...prev, transformation]);
    }
  };

  const removeTransformation = (transformation: string) => {
    setTransformations(prev => prev.filter(t => t !== transformation));
  };

  const renderContent = () => {
    if (!data) return null;

    const chartData = Array.isArray(data) ? data : 
                     data.results || data.items || data.data || [data];

    switch (widgetType) {
      case 'chart':
        return renderChart(chartData);
      case 'table':
        return renderTable(chartData);
      case 'metric':
        return renderMetric(chartData);
      case 'list':
        return renderList(chartData);
      case 'gauge':
        return renderGauge(chartData);
      default:
        return <div className="text-muted-foreground">Unknown widget type: {widgetType}</div>;
    }
  };

  const renderChart = (chartData: any[]) => {
    if (!Array.isArray(chartData) || chartData.length === 0) {
      return <div className="text-muted-foreground">No data to display</div>;
    }

    const chartType = config.chartType || 'bar';
    const height = config.height || 300;

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xField || Object.keys(chartData[0])[0]} />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey={config.yField || Object.keys(chartData[0])[1]} 
                stroke="#8884d8" 
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey={config.valueField || Object.keys(chartData[0])[1]}
                nameKey={config.nameField || Object.keys(chartData[0])[0]}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default: // bar
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xField || Object.keys(chartData[0])[0]} />
              <YAxis />
              <Tooltip />
              <Bar 
                dataKey={config.yField || Object.keys(chartData[0])[1]} 
                fill="#8884d8" 
              />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  const renderTable = (tableData: any[]) => {
    if (!Array.isArray(tableData) || tableData.length === 0) {
      return <div className="text-muted-foreground">No data to display</div>;
    }

    const columns = Object.keys(tableData[0]);
    const maxRows = config.maxRows || 100;

    return (
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {columns.map(col => (
                <th key={col} className="text-left p-2 font-medium">
                  {formatFieldName(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.slice(0, maxRows).map((row, idx) => (
              <tr key={idx} className="border-b hover:bg-muted/50">
                {columns.map(col => (
                  <td key={col} className="p-2">
                    {formatValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {tableData.length > maxRows && (
          <div className="text-xs text-muted-foreground mt-2">
            Showing {maxRows} of {tableData.length} rows
          </div>
        )}
      </div>
    );
  };

  const renderMetric = (metricData: any[]) => {
    if (!Array.isArray(metricData) || metricData.length === 0) {
      return <div className="text-muted-foreground">No data to display</div>;
    }

    const record = metricData[0];
    const metricField = config.metricField || Object.keys(record)[0];
    const value = record[metricField];

    return (
      <div className="text-center">
        <div className="text-3xl font-bold mb-2">{formatValue(value)}</div>
        <div className="text-sm text-muted-foreground">{formatFieldName(metricField)}</div>
        {config.subtitle && (
          <div className="text-xs text-muted-foreground mt-1">{config.subtitle}</div>
        )}
      </div>
    );
  };

  const renderList = (listData: any[]) => {
    if (!Array.isArray(listData) || listData.length === 0) {
      return <div className="text-muted-foreground">No data to display</div>;
    }

    const titleField = config.titleField || Object.keys(listData[0])[0];
    const subtitleField = config.subtitleField || Object.keys(listData[0])[1];
    const maxItems = config.maxItems || 10;

    return (
      <div className="space-y-2">
        {listData.slice(0, maxItems).map((item, idx) => (
          <div key={idx} className="p-3 border rounded-lg hover:bg-muted/50">
            <div className="font-medium">{formatValue(item[titleField])}</div>
            {subtitleField && (
              <div className="text-sm text-muted-foreground">{formatValue(item[subtitleField])}</div>
            )}
          </div>
        ))}
        {listData.length > maxItems && (
          <div className="text-xs text-muted-foreground">
            Showing {maxItems} of {listData.length} items
          </div>
        )}
      </div>
    );
  };

  const renderGauge = (gaugeData: any[]) => {
    if (!Array.isArray(gaugeData) || gaugeData.length === 0) {
      return <div className="text-muted-foreground">No data to display</div>;
    }

    const record = gaugeData[0];
    const valueField = config.valueField || Object.keys(record)[0];
    const value = Number(record[valueField]) || 0;
    const max = config.maxValue || 100;
    const percentage = Math.min((value / max) * 100, 100);

    return (
      <div className="text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${percentage}, 100`}
              className="text-primary"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold">{Math.round(percentage)}%</span>
          </div>
        </div>
        <div className="text-lg font-medium">{formatValue(value)}</div>
        <div className="text-sm text-muted-foreground">{formatFieldName(valueField)}</div>
      </div>
    );
  };

  const formatValue = (value: any): string => {
    if (value == null) return 'N/A';
    if (typeof value === 'number') {
      if (Number.isInteger(value)) return value.toLocaleString();
      return value.toFixed(2);
    }
    return String(value);
  };

  const formatFieldName = (fieldName: string): string => {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {queryResponse?.metadata && (
            <Badge variant="outline" className="text-xs">
              {queryResponse.metadata.executionTime}ms
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfig(!showConfig)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showConfig && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="system">External System</Label>
                <Select
                  value={selectedSystemId?.toString() || ''}
                  onValueChange={(value) => setSelectedSystemId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select system..." />
                  </SelectTrigger>
                  <SelectContent>
                    {systems.map(system => (
                      <SelectItem key={system.id} value={system.id.toString()}>
                        {system.displayName} ({system.systemType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSystem?.queryMethods && (
                <div>
                  <Label htmlFor="method">Query Method</Label>
                  <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(selectedSystem.queryMethods).map(method => (
                        <SelectItem key={method} value={method}>
                          {method} ({selectedSystem.queryMethods![method].type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="query">Query</Label>
              <Textarea
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your query..."
                rows={4}
              />
            </div>

            {Object.keys(parameters).length > 0 && (
              <div>
                <Label>Parameters</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(parameters).map(([key, value]) => (
                    <Badge
                      key={key}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeParameter(key)}
                    >
                      {key}: {String(value)} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {transformations.length > 0 && (
              <div>
                <Label>Transformations</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {transformations.map(transformation => (
                    <Badge
                      key={transformation}
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => removeTransformation(transformation)}
                    >
                      {transformation} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={executeQuery}
                disabled={isLoading || !selectedSystemId || !query.trim()}
                size="sm"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Execute Query
              </Button>
              <Button onClick={addParameter} variant="outline" size="sm">
                Add Parameter
              </Button>
              <Button onClick={addTransformation} variant="outline" size="sm">
                Add Transformation
              </Button>
              <Button onClick={testConnection} variant="outline" size="sm" disabled={!selectedSystemId}>
                Test Connection
              </Button>
            </div>
          </div>
        )}

        {queryResponse?.error && (
          <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">{queryResponse.error.code}</span>
            </div>
            <div className="text-sm mt-1">{queryResponse.error.message}</div>
          </div>
        )}

        {queryResponse?.success && queryResponse.metadata && (
          <div className="text-xs text-muted-foreground">
            Executed on {queryResponse.metadata.systemName} using {queryResponse.metadata.method} method 
            • {queryResponse.metadata.recordCount} records 
            • {queryResponse.metadata.executionTime}ms
          </div>
        )}

        <div className="min-h-[200px]">
          {renderContent()}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomQueryWidget; 