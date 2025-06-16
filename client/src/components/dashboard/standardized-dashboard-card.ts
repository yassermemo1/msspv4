export interface StandardizedDashboardCard {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'comparison' | 'pool-comparison' | 'kpi';
  category: 'dashboard' | 'kpi' | 'comparison';
  dataSource: string;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  visible: boolean;
  position: number;
  config: {
    icon?: string;
    color?: string;
    format?: 'number' | 'currency' | 'percentage';
    aggregation?: 
      | 'count'
      | 'sum' 
      | 'average'
      | 'max'
      | 'min'
      | {
          function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
          field?: string;
        };
    chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'radar' | 'scatter';
    filters?: Record<string, any>;
    trend?: boolean;
    compareWith?: string;
    comparisonType?: 'vs' | 'ratio' | 'diff' | 'trend';
    comparisonField?: string;
    timeRange?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    groupBy?: string;
    dataSource?: string;
    name?: string;
    customApiEndpoint?: string;
    refreshInterval?: number;
    showLegend?: boolean;
    showDataLabels?: boolean;
    enableDrillDown?: boolean;
    customColors?: string[];
    colors?: string[];
  };
  isBuiltIn: boolean;
  isRemovable: boolean;
} 