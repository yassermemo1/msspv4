import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, BarChart3, Table, TrendingUp, List } from 'lucide-react';
import { WidgetWrapper } from './widget-wrapper';

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

interface DashboardGridProps {
  widgets: Widget[];
  onUpdatePositions: (widgets: Array<{ id: number; position: any }>) => void;
  onEditWidget: (widget: Widget) => void;
  onDeleteWidget: (widgetId: number) => void;
}

export function DashboardGrid({ 
  widgets, 
  onUpdatePositions, 
  onEditWidget, 
  onDeleteWidget 
}: DashboardGridProps) {
  const [gridLayout, setGridLayout] = useState<Widget[]>(widgets);

  useEffect(() => {
    setGridLayout(widgets);
  }, [widgets]);

  const getWidgetIcon = (type: string) => {
    switch (type) {
      case 'kpi':
        return <TrendingUp className="h-4 w-4" />;
      case 'bar_chart':
      case 'line_chart':
        return <BarChart3 className="h-4 w-4" />;
      case 'table':
        return <Table className="h-4 w-4" />;
      default:
        return <List className="h-4 w-4" />;
    }
  };

  // Simple grid layout - in a real implementation, you'd use a library like react-grid-layout
  const renderGrid = () => {
    if (widgets.length === 0) {
      return (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No widgets yet</h3>
          <p className="text-gray-600">Add your first widget to get started</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {widgets.map((widget) => (
          <div key={widget.id} className="relative group">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getWidgetIcon(widget.widgetType)}
                    <CardTitle className="text-sm font-medium truncate">
                      {widget.title}
                    </CardTitle>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditWidget(widget)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteWidget(widget.id)}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <WidgetWrapper widget={widget} />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderGrid()}
    </div>
  );
} 