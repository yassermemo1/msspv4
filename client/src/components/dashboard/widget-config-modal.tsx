import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';

interface Widget {
  id: number;
  dashboardId: number;
  title: string;
  widgetType: string;
  dataSource: string;
  config: any;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface DataSource {
  id: number;
  name: string;
  description?: string;
  apiEndpoint: string;
  authType: string;
  isActive: boolean;
  lastSyncAt?: string;
  syncFrequency: string;
  columns?: string[];
}

interface WidgetConfig {
  aggregation?: {
    function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
    field?: string;
  };
  groupBy?: string;
  label?: string;
  [key: string]: any;
}

interface WidgetConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataSources: DataSource[];
  widget?: Widget | null;
  onSave: (widgetData: any) => void;
  onCancel: () => void;
}

export function WidgetConfigModal({
  open,
  onOpenChange,
  dataSources,
  widget,
  onSave,
  onCancel
}: WidgetConfigModalProps) {
  const [formData, setFormData] = useState<{
    title: string;
    widgetType: string;
    dataSource: string;
    config: WidgetConfig;
  }>({
    title: '',
    widgetType: 'kpi',
    dataSource: '',
    config: {}
  });

  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [fieldLoadError, setFieldLoadError] = useState<string | null>(null);

  // Initialize form data when widget changes
  useEffect(() => {
    if (widget) {
      setFormData({
        title: widget.title || '',
        widgetType: widget.widgetType || 'kpi',
        dataSource: widget.dataSource || '',
        config: widget.config || {}
      });
      
      const ds = dataSources.find(ds => ds.name === (widget.dataSource || ''));
      setSelectedDataSource(ds || null);
    } else {
      setFormData({
        title: '',
        widgetType: 'kpi',
        dataSource: '',
        config: {}
      });
      setSelectedDataSource(null);
    }
  }, [widget, dataSources]);

  const handleDataSourceChange = (dataSourceName: string) => {
    const ds = dataSources.find(ds => ds.name === dataSourceName);
    setSelectedDataSource(ds || null);
    setFormData(prev => ({
      ...prev,
      dataSource: dataSourceName,
      config: {} // Reset config when data source changes
    }));
    setFieldLoadError(null); // Clear any previous error
  };

  const loadFieldsFromSystem = async () => {
    if (!selectedDataSource) return;
    
    setIsLoadingFields(true);
    setFieldLoadError(null);
    
    try {
      // Call the API to fetch fields for the selected data source
      const response = await fetch(`/api/data-sources/${selectedDataSource.id}/fields`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch fields: ${response.statusText}`);
      }
      
      const fieldsData = await response.json();
      
      // Update the selected data source with new fields
      const updatedDataSource = {
        ...selectedDataSource,
        columns: fieldsData.fields || []
      };
      
      setSelectedDataSource(updatedDataSource);
      
      // Also update the dataSources array with the new fields
      // Note: This is a local update only, for persistence you'd need to update the parent component
      
    } catch (error) {
      console.error('Error loading fields:', error);
      setFieldLoadError(error instanceof Error ? error.message : 'Failed to load fields');
    } finally {
      setIsLoadingFields(false);
    }
  };

  const handleSave = () => {
    if (!formData.title?.trim() || !formData.dataSource) {
      return;
    }

    // Find the dataSourceId from the selected dataSource name
    const selectedDs = dataSources.find(ds => ds.name === formData.dataSource);
    
    const widgetData = {
      name: formData.title.trim(),  // Server expects 'name' not 'title'
      widgetType: formData.widgetType,
      dataSourceId: selectedDs?.id,  // Server expects 'dataSourceId' (number) not 'dataSource' (string)
      config: formData.config,
      position: widget?.position || { x: 0, y: 0, w: 1, h: 1 }
    };

    onSave(widgetData);
  };

  const renderConfigForm = () => {
    switch (formData.widgetType) {
      case 'kpi':
        return renderKPIConfig();
      case 'table':
        return renderTableConfig();
      case 'bar_chart':
      case 'line_chart':
        return renderChartConfig();
      default:
        return null;
    }
  };

  const renderKPIConfig = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">KPI Configuration</CardTitle>
        <CardDescription>Configure your key performance indicator</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="aggregationFunction">Aggregation Function</Label>
          <Select
            value={(formData.config as any).aggregation?.function || 'COUNT'}
            onValueChange={(value) => setFormData(prev => ({
              ...prev,
              config: {
                ...prev.config,
                aggregation: { ...(prev.config as any).aggregation, function: value }
              }
            }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COUNT">Count</SelectItem>
              <SelectItem value="SUM">Sum</SelectItem>
              <SelectItem value="AVG">Average</SelectItem>
              <SelectItem value="MIN">Minimum</SelectItem>
              <SelectItem value="MAX">Maximum</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {(formData.config as any).aggregation?.function !== 'COUNT' && (
          <div>
            <Label htmlFor="aggregationField">Field to Aggregate</Label>
            <Select
              value={(formData.config as any).aggregation?.field || ''}
              onValueChange={(value) => setFormData(prev => ({
                ...prev,
                config: {
                  ...prev.config,
                  aggregation: { ...(prev.config as any).aggregation, field: value }
                }
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {selectedDataSource?.columns?.map(column => (
                  <SelectItem key={column} value={column}>{column}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="kpiLabel">Label</Label>
          <Input
            id="kpiLabel"
            value={(formData.config as any).label || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              config: { ...prev.config, label: e.target.value }
            }))}
            placeholder="e.g., Total Clients"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderTableConfig = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Table Configuration</CardTitle>
        <CardDescription>Select which fields to display</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Fields to Display</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {selectedDataSource?.columns?.map(column => (
              <label key={column} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(formData.config as any).fields?.includes(column) || false}
                  onChange={(e) => {
                    const fields = (formData.config as any).fields || [];
                    const newFields = e.target.checked
                      ? [...fields, column]
                      : fields.filter((f: string) => f !== column);
                    
                    setFormData(prev => ({
                      ...prev,
                      config: { ...prev.config, fields: newFields }
                    }));
                  }}
                />
                <span className="text-sm">{column}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="tableLimit">Row Limit</Label>
          <Input
            id="tableLimit"
            type="number"
            value={(formData.config as any).limit || 10}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              config: { ...prev.config, limit: parseInt(e.target.value) || 10 }
            }))}
            min="1"
            max="100"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderChartConfig = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Chart Configuration</CardTitle>
        <CardDescription>Configure your chart display</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="groupByField">Group By</Label>
          <Select
            value={(formData.config as any).groupBy || ''}
            onValueChange={(value) => setFormData(prev => ({
              ...prev,
              config: { ...prev.config, groupBy: value }
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select field to group by" />
            </SelectTrigger>
            <SelectContent>
              {selectedDataSource?.columns?.map(column => (
                <SelectItem key={column} value={column}>{column}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="aggregationFunction">Aggregation Function</Label>
          <Select
            value={(formData.config as any).aggregation?.function || 'COUNT'}
            onValueChange={(value) => setFormData(prev => ({
              ...prev,
              config: {
                ...prev.config,
                aggregation: { ...(prev.config as any).aggregation, function: value }
              }
            }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COUNT">Count</SelectItem>
              <SelectItem value="SUM">Sum</SelectItem>
              <SelectItem value="AVG">Average</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.config.aggregation?.function !== 'COUNT' && (
          <div>
            <Label htmlFor="valueField">Value Field</Label>
            <Select
              value={formData.config.aggregation?.field || ''}
              onValueChange={(value) => setFormData(prev => ({
                ...prev,
                config: {
                  ...prev.config,
                  aggregation: { ...prev.config.aggregation, field: value }
                }
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {selectedDataSource?.columns?.map(column => (
                  <SelectItem key={column} value={column}>{column}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {widget ? 'Edit Widget' : 'Create New Widget'}
          </DialogTitle>
          <DialogDescription>
            Configure your widget to display data from your selected data source
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="widgetTitle">Widget Title</Label>
              <Input
                id="widgetTitle"
                value={formData.title || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Client Overview"
              />
            </div>
            <div>
              <Label htmlFor="widgetType">Widget Type</Label>
              <Select
                value={formData.widgetType}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  widgetType: value,
                  config: {} // Reset config when type changes
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kpi">KPI</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                  <SelectItem value="bar_chart">Bar Chart</SelectItem>
                  <SelectItem value="line_chart">Line Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="dataSource">Data Source</Label>
            <Select
              value={formData.dataSource}
              onValueChange={handleDataSourceChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select data source" />
              </SelectTrigger>
              <SelectContent>
                {dataSources?.map(ds => (
                  <SelectItem key={ds.name} value={ds.name}>
                    {ds.name} ({ds.columns?.length || 0} columns)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Load Fields Button */}
            {selectedDataSource && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadFieldsFromSystem}
                  disabled={isLoadingFields}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {isLoadingFields ? (
                    <>
                      <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Load Fields
                    </>
                  )}
                </button>
                
                {fieldLoadError && (
                  <span className="text-sm text-red-500">
                    {fieldLoadError}
                  </span>
                )}
                
                {selectedDataSource.columns && selectedDataSource.columns.length > 0 && (
                  <span className="text-sm text-green-600">
                    ✓ {selectedDataSource.columns.length} fields loaded
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Available Columns */}
          {selectedDataSource && selectedDataSource.columns && selectedDataSource.columns.length > 0 && (
            <div>
              <Label>Available Columns</Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedDataSource.columns.map(column => (
                  <Badge key={column} variant="outline" className="text-xs">
                    {column}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Widget-specific Configuration */}
          {selectedDataSource && renderConfigForm()}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.title?.trim() || !formData.dataSource}
            >
              {widget ? 'Update Widget' : 'Create Widget'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 