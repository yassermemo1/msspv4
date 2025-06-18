import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Plus, X, Eye, Play, AlertCircle, CheckCircle } from 'lucide-react';

interface EnhancedDashboardCard {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'comparison' | 'pool-comparison' | 'widget';
  category: 'dashboard' | 'kpi' | 'comparison' | 'widget';
  dataSource: string;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  visible: boolean;
  position: number;
  config: {
    icon?: string;
    color?: string;
    format?: 'number' | 'currency' | 'percentage';
    aggregation?: 'count' | 'sum' | 'average' | 'max' | 'min' | {
      function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
      field?: string;
    };
    filters?: Record<string, any>;
    dynamicFilters?: Array<{
      field: string;
      operator: string;
      value: string;
    }>;
    // Chart configuration
    chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'radar' | 'scatter';
    xAxisField?: string;
    yAxisField?: string;
    groupBy?: string;
    // Comparison features
    compareWith?: string;
    comparisonType?: 'vs' | 'ratio' | 'diff' | 'trend';
    comparisonField?: string;
    timeRange?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    // Advanced options
    showLegend?: boolean;
    showDataLabels?: boolean;
    enableDrillDown?: boolean;
    trend?: boolean;
    refreshInterval?: number;
    [key: string]: any;
  };
  isBuiltIn: boolean;
  isRemovable: boolean;
}

interface TableSchema {
  tableName: string;
  columns: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
  }>;
  columnValues: Record<string, any[]>;
}

interface PreviewData {
  previewData: any[];
  metricValue: number;
  totalRows: number;
  sampleQuery: string;
  appliedFilters: {
    static: Record<string, any>;
    dynamic: Array<{ field: string; operator: string; value: string }>;
  };
}

interface EnhancedCardCreatorProps {
  card: Partial<EnhancedDashboardCard>;
  onCardChange: (card: Partial<EnhancedDashboardCard>) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export function EnhancedCardCreator({ 
  card, 
  onCardChange, 
  onSave, 
  onCancel, 
  isEditing = false 
}: EnhancedCardCreatorProps) {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Get schema and values for the selected table
  const { data: tableSchema, isLoading: schemaLoading, error: schemaError } = useQuery<TableSchema>({
    queryKey: ['dashboard-schema', card.dataSource],
    queryFn: async () => {
      if (!card.dataSource) return null;
      console.log(`🔍 FRONTEND: Fetching schema for data source: ${card.dataSource}`);
      const response = await apiRequest('GET', `/api/dashboard/schema/${card.dataSource}`);
      const data = await response.json();
      console.log(`🔍 FRONTEND: Schema response for ${card.dataSource}:`, data);
      return data;
    },
    enabled: !!card.dataSource,
    staleTime: 5 * 60 * 1000,
  });

  // Debug logging for schema state
  console.log(`🔍 FRONTEND Schema State:`, {
    dataSource: card.dataSource,
    isLoading: schemaLoading,
    hasError: !!schemaError,
    hasData: !!tableSchema,
    columnCount: tableSchema?.columns?.length || 0
  });

  const updateCard = (updates: Partial<EnhancedDashboardCard>) => {
    onCardChange({ ...card, ...updates });
    setValidationErrors([]);
  };

  const updateConfig = (configUpdates: Partial<EnhancedDashboardCard['config']>) => {
    updateCard({
      config: { ...card.config, ...configUpdates }
    });
  };

  const DATA_SOURCES = [
    { value: 'clients', label: 'Clients' },
    { value: 'contracts', label: 'Contracts' },
    { value: 'services', label: 'Services' },
    { value: 'license_pools', label: 'License Pools' },
    { value: 'proposals', label: 'Proposals' },
    { value: 'financial_transactions', label: 'Financial Transactions' },
    { value: 'users', label: 'Users' },
    { value: 'audit_logs', label: 'Audit Logs' }
  ];

  const OPERATORS = [
    { value: '=', label: 'Equals' },
    { value: '!=', label: 'Not equals' },
    { value: '>', label: 'Greater than' },
    { value: '<', label: 'Less than' },
    { value: '>=', label: 'Greater or equal' },
    { value: '<=', label: 'Less or equal' },
    { value: 'contains', label: 'Contains' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' }
  ];

  const COLORS = [
    { value: 'blue', label: 'Blue' },
    { value: 'green', label: 'Green' },
    { value: 'red', label: 'Red' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'purple', label: 'Purple' },
    { value: 'pink', label: 'Pink' },
    { value: 'indigo', label: 'Indigo' },
    { value: 'gray', label: 'Gray' }
  ];

  const addFilter = () => {
    const currentFilters = card.config?.dynamicFilters || [];
    updateConfig({
      dynamicFilters: [
        ...currentFilters,
        { field: '', operator: '=', value: '' }
      ]
    });
  };

  const updateFilter = (index: number, updates: Partial<{ field: string; operator: string; value: string }>) => {
    const currentFilters = card.config?.dynamicFilters || [];
    const newFilters = [...currentFilters];
    newFilters[index] = { ...newFilters[index], ...updates };
    updateConfig({ dynamicFilters: newFilters });
  };

  const removeFilter = (index: number) => {
    const currentFilters = card.config?.dynamicFilters || [];
    const newFilters = currentFilters.filter((_, i) => i !== index);
    updateConfig({ dynamicFilters: newFilters });
  };

  const validateCard = (): string[] => {
    const errors: string[] = [];
    
    if (!card.title?.trim()) {
      errors.push('Card title is required');
    }
    
    if (!card.dataSource) {
      errors.push('Data source is required');
    }
    
    if (card.config?.dynamicFilters) {
      card.config.dynamicFilters.forEach((filter, index) => {
        if (filter.field && !filter.value) {
          errors.push(`Filter ${index + 1}: Value is required when field is selected`);
        }
        if (filter.value && !filter.field) {
          errors.push(`Filter ${index + 1}: Field is required when value is provided`);
        }
      });
    }
    
    return errors;
  };

  const handlePreview = async () => {
    const errors = validateCard();
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Validation Error",
        description: "Please fix the validation errors before previewing",
        variant: "destructive",
      });
      return;
    }

    setPreviewLoading(true);
    setValidationErrors([]);
    
    try {
      const response = await apiRequest('POST', '/api/dashboard/preview', {
        dataSource: card.dataSource,
        config: card.config || {}
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Preview failed');
      }
      
      setPreviewData(data);
      setShowPreview(true);
      
      toast({
        title: "Preview Generated",
        description: `Found ${data.totalRows} records with metric value: ${data.metricValue}`,
      });
    } catch (error: any) {
      console.error('Preview error:', error);
      toast({
        title: "Preview Failed",
        description: error.message || "Failed to generate preview",
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = () => {
    const errors = validateCard();
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Validation Error",
        description: "Please fix the validation errors before saving",
        variant: "destructive",
      });
      return;
    }
    
    onSave();
  };

  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case 'siem-pool':
        updateCard({
          title: 'SIEM Pool Usage',
          type: 'metric',
          dataSource: 'license_pools',
          size: 'small',
          config: {
            icon: 'Shield',
            color: 'purple',
            format: 'number',
            aggregation: 'count',
            dynamicFilters: [
              { field: 'pool_type', operator: 'contains', value: 'SIEM' }
            ]
          }
        });
        break;
      case 'edr-pool':
        updateCard({
          title: 'EDR Pool Usage',
          type: 'metric',
          dataSource: 'license_pools',
          size: 'small',
          config: {
            icon: 'Shield',
            color: 'red',
            format: 'number',
            aggregation: 'count',
            dynamicFilters: [
              { field: 'pool_type', operator: 'contains', value: 'EDR' }
            ]
          }
        });
        break;
      case 'all-pools':
        updateCard({
          title: 'All License Pools',
          type: 'metric',
          dataSource: 'license_pools',
          size: 'small',
          config: {
            icon: 'Package',
            color: 'blue',
            format: 'number',
            aggregation: 'count'
          }
        });
        break;
      case 'pool-usage-chart':
        updateCard({
          title: 'Pool Usage by Type',
          type: 'chart',
          dataSource: 'license_pools',
          size: 'large',
          config: {
            icon: 'BarChart3',
            color: 'blue',
            format: 'number',
            aggregation: 'count',
            chartType: 'bar',
            xAxisField: 'pool_type',
            yAxisField: 'total_licenses',
            showLegend: true,
            showDataLabels: true,
            enableDrillDown: true
          }
        });
        break;
    }
    
    toast({
      title: "Preset Applied",
      description: "Card configuration has been updated with preset values",
    });
  };

  const getColumnValues = (columnName: string): any[] => {
    return tableSchema?.columnValues[columnName] || [];
  };

  return (
    <div className="space-y-6">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validationErrors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
          <TabsTrigger value="data">Data Source & Schema</TabsTrigger>
          <TabsTrigger value="visualization">Visualization & Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4">
          {/* Quick Presets */}
          <div className="p-3 border rounded-lg bg-blue-50">
            <Label className="text-sm font-medium mb-2 block">Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset('siem-pool')}
                className="text-xs"
              >
                SIEM Pool
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset('edr-pool')}
                className="text-xs"
              >
                EDR Pool
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset('all-pools')}
                className="text-xs"
              >
                All Pools
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset('pool-usage-chart')}
                className="text-xs"
              >
                Pool Usage Chart (X/Y)
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="card-title">Card Title *</Label>
              <Input
                id="card-title"
                value={card.title || ''}
                onChange={(e) => updateCard({ title: e.target.value })}
                placeholder="e.g., SIEM Pool Usage"
                className={validationErrors.some(e => e.includes('title')) ? 'border-red-500' : ''}
              />
            </div>
            
            <div>
              <Label htmlFor="card-type">Card Type</Label>
              <Select 
                value={card.type || 'metric'} 
                onValueChange={(value: any) => updateCard({ type: value })}
              >
                <SelectTrigger id="card-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metric">Metric</SelectItem>
                  <SelectItem value="chart">Chart</SelectItem>
                  <SelectItem value="comparison">Comparison</SelectItem>
                  <SelectItem value="pool-comparison">Pool Comparison</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="data-source">Data Source *</Label>
              <Select 
                value={card.dataSource || ''} 
                onValueChange={(value) => updateCard({ dataSource: value })}
              >
                <SelectTrigger id="data-source" className={validationErrors.some(e => e.includes('source')) ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {DATA_SOURCES.map(source => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="card-size">Card Size</Label>
              <Select 
                value={card.size || 'small'} 
                onValueChange={(value: any) => updateCard({ size: value })}
              >
                <SelectTrigger id="card-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="xlarge">Extra Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="data" className="space-y-4">
          {/* Configuration Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="format">Value Format</Label>
              <Select 
                value={card.config?.format || 'number'} 
                onValueChange={(value) => updateConfig({ format: value as 'number' | 'currency' | 'percentage' })}
              >
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="aggregation">Aggregation</Label>
              <Select 
                value={typeof card.config?.aggregation === 'string' ? card.config.aggregation : 'count'} 
                onValueChange={(value) => updateConfig({ aggregation: value as any })}
              >
                <SelectTrigger id="aggregation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="max">Maximum</SelectItem>
                  <SelectItem value="min">Minimum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Table Schema and Data Section */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Data Source: {card.dataSource || 'None Selected'}</Label>
              <p className="text-sm text-gray-500">
                {card.dataSource ? 'Table schema and sample values are shown below' : 'Select a data source from Basic Settings to see table schema'}
              </p>
            </div>

            {schemaLoading && (
              <div className="flex items-center justify-center p-8">
                <div className="text-sm text-gray-500">Loading table schema and sample data...</div>
              </div>
            )}

            {schemaError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load table schema: {String(schemaError)}
                </AlertDescription>
              </Alert>
            )}

            {tableSchema && !schemaLoading && (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Table: {tableSchema.tableName}
                      <Badge variant="outline">{tableSchema.columns.length} columns</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Columns Overview */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Available Columns</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {tableSchema.columns.map(column => (
                            <div key={column.column_name} className="p-2 border rounded-lg bg-gray-50">
                              <div className="font-mono text-xs font-medium">{column.column_name}</div>
                              <div className="text-xs text-gray-500">{column.data_type}</div>
                              {column.is_nullable === 'YES' && (
                                <Badge variant="outline" className="text-xs">nullable</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Column Values Preview */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Sample Column Values</Label>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {tableSchema.columns.map(column => {
                            const values = getColumnValues(column.column_name);
                            return (
                              <div key={column.column_name} className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-mono text-sm font-medium">{column.column_name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {values.length} unique values
                                  </Badge>
                                </div>
                                {values.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {values.slice(0, 10).map((value, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {String(value).length > 20 ? `${String(value).substring(0, 20)}...` : String(value)}
                                      </Badge>
                                    ))}
                                    {values.length > 10 && (
                                      <Badge variant="outline" className="text-xs text-gray-500">
                                        +{values.length - 10} more
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500">No sample values available</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {!card.dataSource && (
              <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg">
                <div className="text-sm text-gray-500">Select a data source to view table schema and sample data</div>
              </div>
            )}
          </div>

          <Separator />

          {/* Optional Filters Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Optional Filters</Label>
                <p className="text-sm text-gray-500">Add filters to refine your data (not required)</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFilter}
                disabled={schemaLoading || !tableSchema}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Filter
              </Button>
            </div>

            {card.config?.dynamicFilters && card.config.dynamicFilters.length > 0 && (
              <div className="space-y-3">
                {card.config.dynamicFilters.map((filter, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 items-end p-3 border rounded-lg">
                    <div>
                      <Label className="text-xs">Field</Label>
                      <Select
                        value={filter.field || ''}
                        onValueChange={(value) => updateFilter(index, { field: value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {tableSchema?.columns.map(column => (
                            <SelectItem key={column.column_name} value={column.column_name}>
                              {column.column_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Operator</Label>
                      <Select
                        value={filter.operator || '='}
                        onValueChange={(value) => updateFilter(index, { operator: value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map(op => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Value</Label>
                      {filter.field && getColumnValues(filter.field).length > 0 ? (
                        <Select
                          value={filter.value || ''}
                          onValueChange={(value) => updateFilter(index, { value })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select value" />
                          </SelectTrigger>
                          <SelectContent>
                            {getColumnValues(filter.field).map((value, valueIndex) => (
                              <SelectItem key={valueIndex} value={String(value)}>
                                {String(value)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder="Enter value"
                          value={filter.value || ''}
                          onChange={(e) => updateFilter(index, { value: e.target.value })}
                          className="h-8"
                        />
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeFilter(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="visualization" className="space-y-4">
          {/* Preview Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-sm text-gray-700">Test Your Card</h5>
                <p className="text-xs text-gray-500">Preview the data and verify your configuration</p>
              </div>
              <Button 
                onClick={handlePreview}
                disabled={previewLoading || !card.dataSource}
                className="flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>{previewLoading ? 'Loading...' : 'Run Preview'}</span>
              </Button>
            </div>

            {previewData && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Metric Value: {previewData.metricValue}</strong> 
                    <br />
                    Found {previewData.totalRows} sample records
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Applied Filters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Object.keys(previewData.appliedFilters.static).length > 0 && (
                        <div>
                          <Label className="text-xs font-medium">Static Filters:</Label>
                          {Object.entries(previewData.appliedFilters.static).map(([key, value]) => (
                            <div key={key} className="text-xs">
                              {key}: {String(value)}
                            </div>
                          ))}
                        </div>
                      )}
                      {previewData.appliedFilters.dynamic.length > 0 && (
                        <div>
                          <Label className="text-xs font-medium">Dynamic Filters:</Label>
                          {previewData.appliedFilters.dynamic.map((filter, index) => (
                            <div key={index} className="text-xs">
                              {filter.field} {filter.operator} {filter.value}
                            </div>
                          ))}
                        </div>
                      )}
                      {Object.keys(previewData.appliedFilters.static).length === 0 && 
                       previewData.appliedFilters.dynamic.length === 0 && (
                        <div className="text-xs text-gray-500">No filters applied</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Sample Data ({Array.isArray(previewData.previewData) ? previewData.previewData.length : 0} records)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-32 overflow-y-auto">
                        {Array.isArray(previewData.previewData) && previewData.previewData.slice(0, 3).map((row, index) => (
                          <div key={index} className="text-xs border-b pb-1 mb-1">
                            ID: {row.id} | {Object.entries(row).slice(1, 3).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                          </div>
                        ))}
                        {Array.isArray(previewData.previewData) && previewData.previewData.length > 3 && (
                          <div className="text-xs text-gray-500">... and {previewData.previewData.length - 3} more</div>
                        )}
                        {!Array.isArray(previewData.previewData) && (
                          <div className="text-xs text-gray-500">No data available</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <details className="text-xs">
                  <summary className="cursor-pointer font-medium">Show Generated SQL Query</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                    {previewData.sampleQuery}
                  </pre>
                </details>
              </div>
            )}
          </div>

          <Separator />

          {/* Visualization Options */}
          {/* Chart Type Selection */}
          {(card.type === 'chart' || card.type === 'comparison') && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="chart-type">Chart Type</Label>
                <Select 
                  value={card.config?.chartType || 'bar'} 
                  onValueChange={(value) => updateConfig({ chartType: value as any })}
                >
                  <SelectTrigger id="chart-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="doughnut">Doughnut Chart</SelectItem>
                    <SelectItem value="area">Area Chart</SelectItem>
                    <SelectItem value="scatter">Scatter Plot</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* X/Y Axis Configuration for Charts */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="x-axis">X-Axis Field</Label>
                  <Select
                    value={card.config?.xAxisField || ''}
                    onValueChange={(value) => updateConfig({ xAxisField: value })}
                  >
                    <SelectTrigger id="x-axis">
                      <SelectValue placeholder="Select X field" />
                    </SelectTrigger>
                    <SelectContent>
                      {tableSchema?.columns.map(column => (
                        <SelectItem key={column.column_name} value={column.column_name}>
                          {column.column_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="y-axis">Y-Axis Field</Label>
                  <Select
                    value={card.config?.yAxisField || ''}
                    onValueChange={(value) => updateConfig({ yAxisField: value })}
                  >
                    <SelectTrigger id="y-axis">
                      <SelectValue placeholder="Select Y field" />
                    </SelectTrigger>
                    <SelectContent>
                      {tableSchema?.columns.map(column => (
                        <SelectItem key={column.column_name} value={column.column_name}>
                          {column.column_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Group By for Charts */}
              <div>
                <Label htmlFor="group-by">Group By Field (Optional)</Label>
                <Select 
                  value={card.config?.groupBy || 'none'} 
                  onValueChange={(value) => updateConfig({ groupBy: value === 'none' ? undefined : value })}
                >
                  <SelectTrigger id="group-by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Grouping</SelectItem>
                    {tableSchema?.columns.map(column => (
                      <SelectItem key={column.column_name} value={column.column_name}>
                        {column.column_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Comparison Configuration */}
          {card.type === 'comparison' && (
            <div className="space-y-4">
              <h5 className="font-medium text-sm text-gray-700">Comparison Settings</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="compare-with">Compare With Table</Label>
                  <Select 
                    value={card.config?.compareWith || ''} 
                    onValueChange={(value) => updateConfig({ compareWith: value })}
                  >
                    <SelectTrigger id="compare-with">
                      <SelectValue placeholder="Select table to compare" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_SOURCES.map(source => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="comparison-type">Comparison Type</Label>
                  <Select 
                    value={card.config?.comparisonType || 'vs'} 
                    onValueChange={(value) => updateConfig({ comparisonType: value as any })}
                  >
                    <SelectTrigger id="comparison-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vs">Side by Side</SelectItem>
                      <SelectItem value="ratio">Ratio</SelectItem>
                      <SelectItem value="diff">Difference</SelectItem>
                      <SelectItem value="trend">Trend Over Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h5 className="font-medium text-sm text-gray-700">Chart Options</h5>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enable-drill-down"
                  checked={card.config?.enableDrillDown === true}
                  onChange={(e) => updateConfig({ enableDrillDown: e.target.checked })}
                />
                <Label htmlFor="enable-drill-down" className="text-sm">Enable Drill Down</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="show-legend"
                  checked={card.config?.showLegend !== false}
                  onChange={(e) => updateConfig({ showLegend: e.target.checked })}
                />
                <Label htmlFor="show-legend" className="text-sm">Show Legend</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="show-data-labels"
                  checked={card.config?.showDataLabels === true}
                  onChange={(e) => updateConfig({ showDataLabels: e.target.checked })}
                />
                <Label htmlFor="show-data-labels" className="text-sm">Show Data Labels</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="show-trend"
                  checked={card.config?.trend === true}
                  onChange={(e) => updateConfig({ trend: e.target.checked })}
                />
                <Label htmlFor="show-trend" className="text-sm">Show Trend</Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h5 className="font-medium text-sm text-gray-700">Advanced Options</h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
                <Input
                  id="refresh-interval"
                  type="number"
                  min="30"
                  value={card.config?.refreshInterval || 300}
                  onChange={(e) => updateConfig({ refreshInterval: parseInt(e.target.value) || 300 })}
                  placeholder="300"
                />
              </div>

              <div>
                <Label htmlFor="time-range">Time Range</Label>
                <Select 
                  value={card.config?.timeRange || 'monthly'} 
                  onValueChange={(value) => updateConfig({ timeRange: value as any })}
                >
                  <SelectTrigger id="time-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>


      </Tabs>

      <Separator />

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handlePreview} variant="outline" disabled={previewLoading || !card.dataSource}>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <Button onClick={handleSave} disabled={!card.title || !card.dataSource}>
          {isEditing ? 'Update Card' : 'Add Card'}
        </Button>
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Card Preview: {card.title}</DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              {/* For Metric cards, show a focused metric view */}
              {card.type === 'metric' && (
                <div className="space-y-4">
                  {/* Large metric display */}
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-lg text-blue-700">{card.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="text-4xl font-bold text-blue-900 mb-2">
                        {card.config?.format === 'currency' ? `$${previewData.metricValue.toLocaleString()}` : 
                         card.config?.format === 'percentage' ? `${previewData.metricValue}%` : 
                         previewData.metricValue.toLocaleString()}
                      </div>
                      <div className="text-sm text-blue-600">
                        Based on {previewData.totalRows} records from {card.dataSource}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Data Source</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm font-medium">{card.dataSource}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Aggregation</CardTitle>
                      </CardHeader>
                                             <CardContent>
                         <div className="text-sm font-medium capitalize">
                           {typeof card.config?.aggregation === 'string' 
                             ? card.config.aggregation 
                             : card.config?.aggregation?.function?.toLowerCase() || 'count'}
                         </div>
                       </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Format</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm font-medium capitalize">{card.config?.format || 'number'}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Compact data sample (first 3 rows only) */}
                  {Array.isArray(previewData.previewData) && previewData.previewData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Sample Data (First 3 Records)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full border border-gray-200 text-xs">
                            <thead>
                              <tr className="bg-gray-50">
                                {Object.keys(previewData.previewData[0]).slice(0, 6).map(key => (
                                  <th key={key} className="border p-1 text-left">{key}</th>
                                ))}
                                {Object.keys(previewData.previewData[0]).length > 6 && (
                                  <th className="border p-1 text-left">...</th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.previewData.slice(0, 3).map((row, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  {Object.values(row).slice(0, 6).map((value, cellIndex) => (
                                    <td key={cellIndex} className="border p-1">
                                      {String(value).length > 15 ? `${String(value).substring(0, 15)}...` : String(value)}
                                    </td>
                                  ))}
                                  {Object.values(row).length > 6 && (
                                    <td className="border p-1 text-gray-400">...</td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* For non-metric cards, show the full data view */}
              {card.type !== 'metric' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Metric Value</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{previewData.metricValue}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Sample Records</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{previewData.totalRows}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Data Source</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm font-medium">{card.dataSource}</div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          {Array.isArray(previewData.previewData) && previewData.previewData.length > 0 && Object.keys(previewData.previewData[0]).map(key => (
                            <th key={key} className="border p-2 text-left">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(previewData.previewData) && previewData.previewData.slice(0, 10).map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {Object.values(row).map((value, cellIndex) => (
                              <td key={cellIndex} className="border p-2">
                                {String(value).length > 50 ? `${String(value).substring(0, 50)}...` : String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {!Array.isArray(previewData.previewData) && (
                          <tr>
                            <td className="border p-2 text-center text-gray-500">No data available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 