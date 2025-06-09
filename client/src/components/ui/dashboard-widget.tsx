import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, TrendingUp, TrendingDown, Activity, Database } from 'lucide-react';

interface DashboardWidgetProps {
  widget: {
    id: number;
    name: string;
    type: string;
    config: any;
  };
  data: any[];
  className?: string;
}

export function DashboardWidget({ widget, data, className }: DashboardWidgetProps) {
  const renderContent = () => {
    switch (widget.type) {
      case 'metric':
        return renderMetric();
      case 'table':
        return renderTable();
      case 'list':
        return renderList();
      case 'chart':
        return renderChart();
      default:
        return <div className="text-gray-500">Unsupported widget type</div>;
    }
  };

  const renderMetric = () => {
    const { valueField, labelField, trendField } = widget.config;
    
    // Debug information in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Metric Widget Debug:', {
        widgetId: widget.id,
        widgetName: widget.name,
        config: widget.config,
        valueField: valueField,
        dataLength: data.length,
        sampleData: data[0],
        availableFields: data[0] ? Object.keys(data[0]) : []
      });
    }
    
    // Check if valueField exists in data
    const hasValueField = data.length > 0 && data[0] && valueField && data[0].hasOwnProperty(valueField);
    const value = hasValueField ? data[0][valueField] : data.length;
    const label = widget.config.label || widget.name;
    const trend = data.length > 1 ? calculateTrend(data, valueField) : null;

    // Show debug info if valueField is missing
    if (process.env.NODE_ENV === 'development' && valueField && !hasValueField && data.length > 0) {
      console.warn(`⚠️ Metric widget "${widget.name}" looking for field "${valueField}" but it doesn't exist in data. Available fields:`, Object.keys(data[0]));
    }

    return (
      <div className="text-center">
        <div className="text-3xl font-bold text-gray-900">{formatValue(value)}</div>
        <div className="text-sm text-gray-600 mt-1">{label}</div>
        {trend && (
          <div className={`flex items-center justify-center mt-2 text-sm ${
            trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : 
             trend < 0 ? <TrendingDown className="w-4 h-4 mr-1" /> : 
             <Activity className="w-4 h-4 mr-1" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-3 text-xs text-left">
            <strong>Debug Info:</strong>
            <br />Value Field: {valueField || 'not set'}
            <br />Value: {value}
            <br />Data Count: {data.length}
            <br />Available Fields: {data[0] ? Object.keys(data[0]).join(', ') : 'No data'}
            {data[0]?._usingRawData && <><br />⚠️ Using raw data (no field mappings)</>}
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    const { columns } = widget.config;
    
    // Debug information in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Table Widget Debug:', {
        widgetId: widget.id,
        widgetName: widget.name,
        config: widget.config,
        columns: columns,
        columnsType: typeof columns,
        isArray: Array.isArray(columns),
        dataLength: data.length,
        sampleData: data[0]
      });
    }
    
    // Auto-detect columns if not configured
    let effectiveColumns = columns;
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      if (data.length > 0) {
        const sampleRecord = data[0];
        effectiveColumns = Object.keys(sampleRecord)
          .filter(key => !key.startsWith('_')) // Exclude metadata fields
          .map(key => ({
            field: key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            type: typeof sampleRecord[key] === 'number' ? 'number' : 'string'
          }));
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Auto-detected columns:', effectiveColumns);
        }
      }
    }
    
    if (!effectiveColumns || !Array.isArray(effectiveColumns) || effectiveColumns.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-4">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No columns configured</p>
            <p className="text-sm">Configure table columns in the Integration Engine</p>
            <p className="text-xs text-blue-600 mt-2">
              💡 Tip: Use the "Quick Setup" buttons when creating table widgets
            </p>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-left">
              <strong>Debug Info:</strong>
              <br />Widget Config: {JSON.stringify(widget.config, null, 2)}
              <br />Data Sample: {JSON.stringify(data[0] || {}, null, 2)}
              <br />Data Keys: {data[0] ? Object.keys(data[0]).join(', ') : 'No data'}
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        {/* Show auto-detection notice in development */}
        {process.env.NODE_ENV === 'development' && effectiveColumns !== columns && (
          <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3 text-xs">
            <strong>Auto-detected columns:</strong> No configuration found, using data structure
          </div>
        )}
        
        <Table>
          <TableHeader>
            <TableRow>
              {effectiveColumns.map((col: any) => (
                <TableHead key={col.field}>{col.label || col.field}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 10).map((row, index) => (
              <TableRow key={index}>
                {effectiveColumns.map((col: any) => (
                  <TableCell key={col.field}>
                    {formatCellValue(row[col.field], col.type)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderList = () => {
    const { titleField, subtitleField, badgeField } = widget.config;
    
    return (
      <div className="space-y-3">
        {data.slice(0, 8).map((item, index) => (
          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">
                {item[titleField] || `Item ${index + 1}`}
              </div>
              {subtitleField && (
                <div className="text-sm text-gray-600">
                  {item[subtitleField]}
                </div>
              )}
            </div>
            {badgeField && item[badgeField] && (
              <Badge variant="secondary">
                {item[badgeField]}
              </Badge>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderChart = () => {
    // Simple bar chart representation
    const { xField, yField } = widget.config;
    if (!xField || !yField) {
      return <div className="text-gray-500">Chart fields not configured</div>;
    }

    const maxValue = Math.max(...data.map(item => Number(item[yField]) || 0));
    
    return (
      <div className="space-y-2">
        {data.slice(0, 6).map((item, index) => {
          const value = Number(item[yField]) || 0;
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          
          return (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-20 text-sm text-gray-600 truncate">
                {item[xField]}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="w-12 text-sm font-medium text-right">
                {formatValue(value)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const calculateTrend = (data: any[], field: string): number => {
    if (data.length < 2) return 0;
    const current = Number(data[0]?.[field]) || 0;
    const previous = Number(data[1]?.[field]) || 0;
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toLocaleString();
    }
    return String(value);
  };

  const formatCellValue = (value: any, type?: string): string => {
    if (value === null || value === undefined) return '-';
    
    switch (type) {
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'datetime':
        return new Date(value).toLocaleString();
      case 'number':
        return formatValue(value);
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(Number(value) || 0);
      default:
        return String(value);
    }
  };

  const getIcon = () => {
    switch (widget.type) {
      case 'metric':
        return <Activity className="w-5 h-5" />;
      case 'table':
        return <Database className="w-5 h-5" />;
      case 'chart':
        return <BarChart3 className="w-5 h-5" />;
      default:
        return <Database className="w-5 h-5" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getIcon()}
          {widget.name}
        </CardTitle>
        {widget.config.description && (
          <CardDescription>{widget.config.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          renderContent()
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 