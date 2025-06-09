import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface DataSource {
  id: number;
  name: string;
  description?: string;
  type: string;
  apiEndpoint: string;
  authType?: string;
  syncFrequency: string;
  status: string;
  isActive: boolean;
  lastSyncAt?: string;
  lastConnected?: string;
  stats?: {
    recordCount: number;
    lastSync?: string;
    avgSyncTime?: number;
  };
}

interface ExternalDataRecord {
  id: number;
  dataSourceId: number;
  mappedData: any;
  syncedAt: string;
  createdAt: string;
  originalDataPreview: string;
}

interface WidgetData {
  value: number;
  formatted: string;
  trend?: {
    direction: 'up' | 'down' | 'flat';
    percentage: number;
    value: number;
  };
  metadata: {
    widgetId?: number;
    dataSourceId: number;
    aggregation: string;
    timeRange: string;
    recordCount: number;
    lastUpdate?: number;
    timestamp: string;
  };
}

interface DashboardData {
  dataSources: DataSource[];
  externalSystems: any[];
  widgets: any[];
  summary: {
    totalDataSources: number;
    totalRecords: number;
    externalSystemsTotal: number;
    healthySystemsCount: number;
    systemHealthPercentage: number;
    lastUpdated: string;
  };
  refreshMetadata: {
    recommendedInterval: number;
    lastDataSync?: string;
  };
}

interface TimeSeriesData {
  timeSeries: Array<{
    timestamp: string;
    value: number;
    recordCount: number;
  }>;
  metadata: {
    dataSourceId: number;
    field?: string;
    interval: string;
    timeRange: string;
    aggregation: string;
    totalPoints: number;
    startTime: string;
    endTime: string;
  };
}

interface AggregationData {
  value: number;
  groupedData?: Array<{
    group: string;
    count: number;
    value: number;
  }>;
  distinctValues?: any[];
  metadata: {
    dataSourceId: number;
    aggregationType: string;
    field?: string;
    groupBy?: string;
    timeRange: string;
    totalRecords: number;
    timestamp: string;
  };
}

export function useExternalDataIntegration() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Data Source Management
  const fetchDataSources = useCallback(async (options?: {
    type?: string;
    status?: string;
    includeStats?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (options?.type) params.append('type', options.type);
      if (options?.status) params.append('status', options.status);
      if (options?.includeStats !== undefined) params.append('includeStats', String(options.includeStats));

      const response = await fetch(`/api/integration-engine/external-data?action=list-sources&${params}`);
      if (!response.ok) throw new Error('Failed to fetch data sources');
      
      const data = await response.json();
      setDataSources(data.sources);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch data sources';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const getDataSourceDetails = useCallback(async (dataSourceId: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/integration-engine/external-data?action=source-details&dataSourceId=${dataSourceId}`);
      if (!response.ok) throw new Error('Failed to fetch data source details');
      
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch data source details';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createDataSource = useCallback(async (dataSourceData: {
    name: string;
    description?: string;
    type: string;
    apiEndpoint: string;
    authType?: string;
    authConfig?: any;
    syncFrequency?: string;
    config?: any;
  }) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/integration-engine/external-data?action=create-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataSourceData)
      });
      
      if (!response.ok) throw new Error('Failed to create data source');
      
      const result = await response.json();
      toast({
        title: 'Success',
        description: 'Data source created successfully'
      });
      
      // Refresh data sources list
      await fetchDataSources();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create data source';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast, fetchDataSources]);

  const testDataSource = useCallback(async (dataSourceId: number) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/integration-engine/external-data?action=test-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataSourceId })
      });
      
      if (!response.ok) throw new Error('Failed to test data source');
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Connection Successful',
          description: result.message
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.message,
          variant: 'destructive'
        });
      }
      
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to test data source';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // External Data Management
  const getExternalData = useCallback(async (options?: {
    dataSourceId?: number;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    dateRange?: { start?: string; end?: string };
  }) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('action', 'external-data');
      if (options?.dataSourceId) params.append('dataSourceId', String(options.dataSourceId));
      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.offset) params.append('offset', String(options.offset));
      if (options?.sortBy) params.append('sortBy', options.sortBy);
      if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
      if (options?.dateRange) params.append('dateRange', JSON.stringify(options.dateRange));

      const response = await fetch(`/api/integration-engine/external-data?${params}`);
      if (!response.ok) throw new Error('Failed to fetch external data');
      
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch external data';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const getExternalAggregation = useCallback(async (options: {
    dataSourceId: number;
    aggregationType?: 'count' | 'sum' | 'average' | 'distinct';
    field?: string;
    groupBy?: string;
    timeRange?: string;
  }): Promise<AggregationData> => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('action', 'external-aggregation');
      params.append('dataSourceId', String(options.dataSourceId));
      if (options.aggregationType) params.append('aggregationType', options.aggregationType);
      if (options.field) params.append('field', options.field);
      if (options.groupBy) params.append('groupBy', options.groupBy);
      if (options.timeRange) params.append('timeRange', options.timeRange);

      const response = await fetch(`/api/integration-engine/external-data?${params}`);
      if (!response.ok) throw new Error('Failed to fetch external aggregation');
      
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch external aggregation';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const getExternalTimeSeries = useCallback(async (options: {
    dataSourceId: number;
    field?: string;
    interval?: 'minute' | 'hour' | 'day';
    timeRange?: string;
    aggregation?: 'count' | 'sum' | 'average';
  }): Promise<TimeSeriesData> => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('action', 'external-time-series');
      params.append('dataSourceId', String(options.dataSourceId));
      if (options.field) params.append('field', options.field);
      if (options.interval) params.append('interval', options.interval);
      if (options.timeRange) params.append('timeRange', options.timeRange);
      if (options.aggregation) params.append('aggregation', options.aggregation);

      const response = await fetch(`/api/integration-engine/external-data?${params}`);
      if (!response.ok) throw new Error('Failed to fetch external time series');
      
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch external time series';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Dashboard Integration
  const getDashboardData = useCallback(async (options?: {
    cardType?: string;
    includeExternal?: boolean;
    refreshInterval?: number;
  }): Promise<DashboardData> => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('action', 'dashboard-data');
      if (options?.cardType) params.append('cardType', options.cardType);
      if (options?.includeExternal !== undefined) params.append('includeExternal', String(options.includeExternal));
      if (options?.refreshInterval) params.append('refreshInterval', String(options.refreshInterval));

      const response = await fetch(`/api/integration-engine/external-data?${params}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch dashboard data';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const getWidgetData = useCallback(async (options: {
    widgetId?: number;
    dataSourceId?: number;
    aggregation?: string;
    timeRange?: string;
    format?: string;
    includeTrend?: boolean;
  }): Promise<WidgetData> => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('action', 'widget-data');
      if (options.widgetId) params.append('widgetId', String(options.widgetId));
      if (options.dataSourceId) params.append('dataSourceId', String(options.dataSourceId));
      if (options.aggregation) params.append('aggregation', options.aggregation);
      if (options.timeRange) params.append('timeRange', options.timeRange);
      if (options.format) params.append('format', options.format);
      if (options.includeTrend) params.append('includeTrend', 'true');

      const response = await fetch(`/api/integration-engine/external-data?${params}`);
      if (!response.ok) throw new Error('Failed to fetch widget data');
      
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch widget data';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Real-time data polling
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const startPolling = useCallback((callback: () => Promise<void>, interval: number = 30000) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    const intervalId = setInterval(async () => {
      try {
        await callback();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, interval);
    
    setPollingInterval(intervalId);
    
    return () => {
      clearInterval(intervalId);
      setPollingInterval(null);
    };
  }, [pollingInterval]);

  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  // Auto-refresh dashboard data
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (autoRefresh) {
      const cleanup = startPolling(async () => {
        await fetchDataSources({ includeStats: true });
      }, 60000); // 1 minute interval

      return cleanup;
    }
  }, [autoRefresh, startPolling, fetchDataSources]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  return {
    // State
    dataSources,
    isLoading,
    error,
    
    // Data Source Management
    fetchDataSources,
    getDataSourceDetails,
    createDataSource,
    testDataSource,
    
    // External Data Management
    getExternalData,
    getExternalAggregation,
    getExternalTimeSeries,
    
    // Dashboard Integration
    getDashboardData,
    getWidgetData,
    
    // Real-time Features
    startPolling,
    stopPolling,
    autoRefresh,
    setAutoRefresh,
    
    // Utils
    clearError: () => setError(null)
  };
} 