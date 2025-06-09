import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

interface WidgetWrapperProps {
  widget: Widget;
}

interface WidgetData {
  data: any[];
  widget: {
    id: number;
    title: string;
    type: string;
    dataSource: string;
  };
}

export function WidgetWrapper({ widget }: WidgetWrapperProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch widget data
  const fetchWidgetData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/widgets/${widget.id}/data`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch widget data');
      }
      
      const result: WidgetData = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgetData();
  }, [widget.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-24">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-red-600">{error}</p>
        <button 
          onClick={fetchWidgetData}
          className="text-xs text-blue-600 hover:underline mt-1"
        >
          Retry
        </button>
      </div>
    );
  }

  // Render different widget types
  const renderWidget = () => {
    switch (widget.widgetType) {
      case 'kpi':
        return renderKPI();
      case 'table':
        return renderTable();
      case 'bar_chart':
      case 'line_chart':
        return renderChart();
      default:
        return renderList();
    }
  };

  const renderKPI = () => {
    if (!data || data.length === 0) {
      return <div className="text-center text-gray-500 py-4">No data</div>;
    }

    const value = data[0]?.value || 0;
    const label = widget.config.label || 'Value';
    
    return (
      <div className="text-center py-4">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600">{label}</div>
      </div>
    );
  };

  const renderTable = () => {
    if (!data || data.length === 0) {
      return <div className="text-center text-gray-500 py-4">No data</div>;
    }

    const columns = widget.config.fields || Object.keys(data[0] || {});
    const displayData = data.slice(0, 5); // Limit to 5 rows for widget display

    return (
      <div className="max-h-48 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column: string) => (
                <TableHead key={column} className="text-xs">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column: string) => (
                  <TableCell key={column} className="text-xs">
                    {row[column]?.toString() || '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data.length > 5 && (
          <div className="text-xs text-gray-500 text-center mt-2">
            Showing 5 of {data.length} rows
          </div>
        )}
      </div>
    );
  };

  const renderChart = () => {
    if (!data || data.length === 0) {
      return <div className="text-center text-gray-500 py-4">No data</div>;
    }

    // Simple bar chart representation
    const maxValue = Math.max(...data.map(d => d.value || 0));
    
    return (
      <div className="space-y-2">
        {data.slice(0, 5).map((item, index) => {
          const value = item.value || 0;
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          
          return (
            <div key={index} className="flex items-center gap-2">
              <div className="text-xs w-16 truncate">{item.name || `Item ${index + 1}`}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="text-xs w-12 text-right">{value}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderList = () => {
    if (!data || data.length === 0) {
      return <div className="text-center text-gray-500 py-4">No data</div>;
    }

    return (
      <div className="space-y-2 max-h-48 overflow-auto">
        {data.slice(0, 10).map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <span className="truncate">{item.name || item.title || `Item ${index + 1}`}</span>
            {item.value && (
              <Badge variant="secondary" className="text-xs">
                {item.value}
              </Badge>
            )}
          </div>
        ))}
        {data.length > 10 && (
          <div className="text-xs text-gray-500 text-center">
            +{data.length - 10} more items
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-24">
      {renderWidget()}
    </div>
  );
} 