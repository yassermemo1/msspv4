import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface DataSource {
  id: number;
  name: string;
  description?: string;
  apiEndpoint: string;
  authType: string;
  isActive: boolean;
  lastSyncAt?: string;
  syncFrequency: string;
}

interface IntegratedData {
  id: number;
  dataSourceId: number;
  rawData: any;
  mappedData: any;
  syncedAt: string;
  recordIdentifier?: string;
}

interface DashboardWidget {
  id: number;
  name: string;
  type: string;
  dataSourceId?: number;
  config: any;
  isActive: boolean;
}

export function useIntegratedData() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch all data sources
  const fetchDataSources = async () => {
    try {
      const response = await fetch('/api/data-sources');
      if (response.ok) {
        const data = await response.json();
        setDataSources(data);
        return data;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data sources",
        variant: "destructive"
      });
    }
    return [];
  };

  // Fetch integrated data for a specific data source
  const fetchIntegratedData = async (dataSourceId: number): Promise<IntegratedData[]> => {
    try {
      const response = await fetch(`/api/data-sources/${dataSourceId}/data`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch integrated data",
        variant: "destructive"
      });
    }
    return [];
  };

  // Fetch all dashboard widgets
  const fetchWidgets = async () => {
    try {
      const response = await fetch('/api/dashboard-widgets');
      if (response.ok) {
        const data = await response.json();
        setWidgets(data);
        return data;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch widgets",
        variant: "destructive"
      });
    }
    return [];
  };

  // Get data for a specific widget
  const getWidgetData = async (widget: DashboardWidget): Promise<any[]> => {
    if (!widget.dataSourceId) return [];
    
    try {
      const integratedData = await fetchIntegratedData(widget.dataSourceId);
      
      console.log(`🔍 Widget "${widget.name}" data debug:`, {
        widgetId: widget.id,
        dataSourceId: widget.dataSourceId,
        totalRecords: integratedData.length,
        sampleRecord: integratedData[0],
        widgetConfig: widget.config
      });
      
      // Filter to only include records with mapped data
      let mappedRecords = integratedData.filter(record => 
        record.mappedData && Object.keys(record.mappedData).length > 0
      );
      
      // If no mapped data but raw data exists, use raw data as fallback
      if (mappedRecords.length === 0 && integratedData.length > 0) {
        console.log(`⚠️ No mapped data found for widget "${widget.name}", using raw data as fallback`);
        mappedRecords = integratedData.filter(record => 
          record.rawData && Object.keys(record.rawData).length > 0
        );
        
        // Transform raw data to use rawData instead of mappedData
        return mappedRecords.map(record => {
          const data = record.rawData;
          
          console.log(`📊 Using raw data for widget "${widget.name}":`, data);
          
          // Add metadata
          return {
            ...data,
            _id: record.id,
            _syncedAt: record.syncedAt,
            _recordIdentifier: record.recordIdentifier,
            _usingRawData: true // Flag to indicate we're using raw data
          };
        });
      }
      
      // Transform the mapped data
      const transformedData = mappedRecords.map(record => {
        // Use mapped data (we know it exists due to filter above)
        const data = record.mappedData;
        
        // Add metadata
        return {
          ...data,
          _id: record.id,
          _syncedAt: record.syncedAt,
          _recordIdentifier: record.recordIdentifier
        };
      });
      
      console.log(`✅ Widget "${widget.name}" returning ${transformedData.length} records:`, transformedData[0]);
      
      return transformedData;
    } catch (error) {
      console.error(`❌ Error loading data for widget "${widget.name}":`, error);
      toast({
        title: "Error",
        description: `Failed to fetch data for widget: ${widget.name}`,
        variant: "destructive"
      });
      return [];
    }
  };

  // Sync data for a specific data source
  const syncDataSource = async (dataSourceId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/data-sources/${dataSourceId}/sync`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Synced ${result.recordsProcessed} records`
        });
        return result;
      } else {
        toast({
          title: "Sync Failed",
          description: result.error,
          variant: "destructive"
        });
        return null;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync data",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get data sources by name or filter
  const getDataSourceByName = (name: string): DataSource | undefined => {
    return dataSources.find(ds => ds.name.toLowerCase().includes(name.toLowerCase()));
  };

  // Get active data sources only
  const getActiveDataSources = (): DataSource[] => {
    return dataSources.filter(ds => ds.isActive);
  };

  // Get widgets by type
  const getWidgetsByType = (type: string): DashboardWidget[] => {
    return widgets.filter(w => w.type === type && w.isActive);
  };

  // Get widgets for a specific data source
  const getWidgetsForDataSource = (dataSourceId: number): DashboardWidget[] => {
    return widgets.filter(w => w.dataSourceId === dataSourceId && w.isActive);
  };

  // Initialize data on mount
  useEffect(() => {
    fetchDataSources();
    fetchWidgets();
  }, []);

  return {
    // State
    dataSources,
    widgets,
    loading,
    
    // Actions
    fetchDataSources,
    fetchIntegratedData,
    fetchWidgets,
    getWidgetData,
    syncDataSource,
    
    // Helpers
    getDataSourceByName,
    getActiveDataSources,
    getWidgetsByType,
    getWidgetsForDataSource,
  };
}

// Hook for a specific data source
export function useDataSource(dataSourceId: number) {
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [integratedData, setIntegratedData] = useState<IntegratedData[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    if (!dataSourceId) return;
    
    setLoading(true);
    try {
      // Fetch data source details
      const dsResponse = await fetch(`/api/data-sources/${dataSourceId}`);
      if (dsResponse.ok) {
        const dsData = await dsResponse.json();
        setDataSource(dsData);
      }

      // Fetch integrated data
      const dataResponse = await fetch(`/api/data-sources/${dataSourceId}/data`);
      if (dataResponse.ok) {
        const data = await dataResponse.json();
        setIntegratedData(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data source information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dataSourceId]);

  return {
    dataSource,
    integratedData,
    loading,
    refetch: fetchData
  };
}

// Hook for dashboard widgets with data
export function useDashboardWidgets() {
  const [widgetsWithData, setWidgetsWithData] = useState<Array<{
    widget: DashboardWidget;
    data: any[];
    loading: boolean;
  }>>([]);
  const { widgets, getWidgetData, fetchWidgets } = useIntegratedData();
  const { toast } = useToast();

  const loadWidgetData = async (widgetsToLoad = widgets) => {
    const widgetPromises = widgetsToLoad.map(async (widget) => {
      try {
        const data = await getWidgetData(widget);
        return { widget, data, loading: false };
      } catch (error) {
        console.error(`Error loading data for widget ${widget.name}:`, error);
        return { widget, data: [], loading: false };
      }
    });

    const results = await Promise.all(widgetPromises);
    setWidgetsWithData(results);
  };

  const refetchAll = async () => {
    try {
      console.log('🔄 Refreshing widgets and data...');
      
      // First refresh the widgets list from the API
      const updatedWidgets = await fetchWidgets();
      console.log('📋 Fetched widgets:', updatedWidgets?.length || 0);
      
      // Then reload the data for the updated widgets
      if (updatedWidgets && updatedWidgets.length > 0) {
        await loadWidgetData(updatedWidgets);
        console.log('✅ Widget data refresh complete');
        
        // Count total records across all widgets
        const totalRecords = widgetsWithData.reduce((sum, { data }) => sum + data.length, 0);
        
        toast({
          title: "Data Refreshed",
          description: `Successfully refreshed ${updatedWidgets.length} widgets with ${totalRecords} total records`,
        });
      } else {
        setWidgetsWithData([]);
        console.log('📭 No widgets found');
        
        toast({
          title: "No Widgets",
          description: "No active widgets found to refresh",
        });
      }
    } catch (error) {
      console.error('❌ Error during refresh:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh widget data. Please try again.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (widgets.length > 0) {
      loadWidgetData();
    }
  }, [widgets]);

  return {
    widgetsWithData,
    refetch: refetchAll
  };
} 