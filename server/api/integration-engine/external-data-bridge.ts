import { Request, Response, Router } from 'express';
import { db } from '../../db';
import { 
  dataSources,
  integratedData,
  externalSystems,
  clientExternalMappings,
  dataSourceMappings,
  dashboardWidgets
} from '../../../shared/schema';
import { sql, count, sum, avg, max, min, and, eq, like, gte, lte, desc, asc, or } from 'drizzle-orm';

const router = Router();

// Main route handler that switches based on action parameter
router.all('/', async (req: Request, res: Response) => {
  const { action } = req.query;

  try {
    switch (action) {
      // Data Source Management
      case 'list-sources':
        return await listDataSources(req, res);
      case 'source-details':
        return await getDataSourceDetails(req, res);
      case 'create-source':
        return await createDataSource(req, res);
      case 'update-source':
        return await updateDataSource(req, res);
      case 'test-source':
        return await testDataSource(req, res);
      case 'sync-source':
        return await syncDataSource(req, res);
      
      // External Data Management
      case 'external-data':
        return await getExternalData(req, res);
      case 'external-aggregation':
        return await getExternalAggregation(req, res);
      case 'external-metrics':
        return await getExternalMetrics(req, res);
      case 'external-time-series':
        return await getExternalTimeSeries(req, res);
      
      // Dashboard Integration
      case 'dashboard-data':
        return await getDashboardData(req, res);
      case 'widget-data':
        return await getWidgetData(req, res);
      case 'create-dashboard-card':
        return await createDashboardCard(req, res);
      case 'sync-dashboard':
        return await syncDashboardWithSources(req, res);
      
      // Comparison & Analytics
      case 'comparison-data':
        return await getComparisonData(req, res);
      case 'cross-source-analytics':
        return await getCrossSourceAnalytics(req, res);
      case 'data-quality-metrics':
        return await getDataQualityMetrics(req, res);
      
      // System Integration
      case 'external-system-status':
        return await getExternalSystemStatus(req, res);
      case 'integration-health':
        return await getIntegrationHealth(req, res);
      case 'connection-diagnostics':
        return await getConnectionDiagnostics(req, res);
      
      // Advanced Features
      case 'real-time-stream':
        return await getRealTimeStream(req, res);
      case 'batch-sync':
        return await performBatchSync(req, res);
      case 'data-transformation':
        return await performDataTransformation(req, res);
      
      default:
        return res.status(400).json({ error: 'Invalid action parameter' });
    }
  } catch (error) {
    console.error('External Data Bridge Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ====================
// DATA SOURCE MANAGEMENT
// ====================

async function listDataSources(req: Request, res: Response) {
  try {
    const { 
      type,
      status = 'active',
      includeStats = 'true'
    } = req.query;

    let query = db
      .select({
        id: dataSources.id,
        name: dataSources.name,
        description: dataSources.description,
        type: dataSources.type,
        apiEndpoint: dataSources.apiEndpoint,
        authType: dataSources.authType,
        syncFrequency: dataSources.syncFrequency,
        status: dataSources.status,
        isActive: dataSources.isActive,
        lastSyncAt: dataSources.lastSyncAt,
        lastConnected: dataSources.lastConnected,
        createdAt: dataSources.createdAt,
        updatedAt: dataSources.updatedAt
      })
      .from(dataSources);

    // Apply filters
    const conditions = [];
    if (status !== 'all') {
      conditions.push(eq(dataSources.status, status));
    }
    if (type) {
      conditions.push(eq(dataSources.type, type as string));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const sources = await query.orderBy(desc(dataSources.updatedAt));

    // Add statistics if requested
    if (includeStats === 'true') {
      for (let source of sources) {
        const stats = await db
          .select({
            recordCount: count(),
            lastSync: max(integratedData.syncedAt),
            avgSyncTime: avg(sql<number>`EXTRACT(epoch FROM (${integratedData.syncedAt} - ${integratedData.createdAt}))`),
          })
          .from(integratedData)
          .where(eq(integratedData.dataSourceId, source.id));

        source.stats = stats[0];
      }
    }

    res.json({
      sources,
      summary: {
        total: sources.length,
        active: sources.filter(s => s.isActive).length,
        byType: sources.reduce((acc, s) => {
          acc[s.type] = (acc[s.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byStatus: sources.reduce((acc, s) => {
          acc[s.status] = (acc[s.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    });

  } catch (error) {
    console.error('Error listing data sources:', error);
    res.status(500).json({ error: 'Failed to list data sources' });
  }
}

async function getDataSourceDetails(req: Request, res: Response) {
  try {
    const { dataSourceId } = req.query;

    if (!dataSourceId) {
      return res.status(400).json({ error: 'dataSourceId is required' });
    }

    // Get data source details
    const source = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, parseInt(dataSourceId as string)))
      .limit(1);

    if (!source.length) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    // Get field mappings
    const mappings = await db
      .select()
      .from(dataSourceMappings)
      .where(eq(dataSourceMappings.dataSourceId, parseInt(dataSourceId as string)));

    // Get recent data samples
    const recentData = await db
      .select()
      .from(integratedData)
      .where(eq(integratedData.dataSourceId, parseInt(dataSourceId as string)))
      .orderBy(desc(integratedData.syncedAt))
      .limit(5);

    // Get associated widgets
    const widgets = await db
      .select()
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.dataSourceId, parseInt(dataSourceId as string)));

    // Calculate metrics
    const metrics = await db
      .select({
        totalRecords: count(),
        lastSync: max(integratedData.syncedAt),
        firstSync: min(integratedData.syncedAt),
        avgRecordsPerSync: avg(sql<number>`1`)
      })
      .from(integratedData)
      .where(eq(integratedData.dataSourceId, parseInt(dataSourceId as string)));

    res.json({
      source: source[0],
      mappings,
      recentData: recentData.map(d => ({
        id: d.id,
        mappedData: d.mappedData,
        syncedAt: d.syncedAt,
        originalDataPreview: JSON.stringify(d.originalData).slice(0, 200)
      })),
      widgets,
      metrics: metrics[0],
      connectionStatus: {
        lastConnected: source[0].lastConnected,
        isHealthy: source[0].status === 'active',
        nextSync: calculateNextSync(source[0].syncFrequency, source[0].lastSyncAt)
      }
    });

  } catch (error) {
    console.error('Error getting data source details:', error);
    res.status(500).json({ error: 'Failed to get data source details' });
  }
}

async function createDataSource(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      name,
      description,
      type,
      apiEndpoint,
      authType,
      authConfig,
      syncFrequency = 'manual',
      config = {}
    } = req.body;

    if (!name || !type || !apiEndpoint) {
      return res.status(400).json({ error: 'Missing required fields: name, type, apiEndpoint' });
    }

    const newSource = await db
      .insert(dataSources)
      .values({
        name,
        description,
        type,
        apiEndpoint,
        authType,
        authConfig: authConfig || {},
        syncFrequency,
        config,
        status: 'active',
        isActive: true,
        createdBy: req.user?.id || 1
      })
      .returning();

    res.status(201).json({
      source: newSource[0],
      message: 'Data source created successfully'
    });

  } catch (error) {
    console.error('Error creating data source:', error);
    res.status(500).json({ error: 'Failed to create data source' });
  }
}

async function testDataSource(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { dataSourceId } = req.body;

    if (!dataSourceId) {
      return res.status(400).json({ error: 'dataSourceId is required' });
    }

    const source = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, dataSourceId))
      .limit(1);

    if (!source.length) {
      return res.status(404).json({ error: 'Data source not found' });
    }

    // Perform connection test based on source type
    const testResult = await performConnectionTest(source[0]);

    // Update last connected timestamp
    await db
      .update(dataSources)
      .set({ 
        lastConnected: new Date(),
        status: testResult.success ? 'active' : 'error'
      })
      .where(eq(dataSources.id, dataSourceId));

    res.json(testResult);

  } catch (error) {
    console.error('Error testing data source:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to test data source connection',
      details: error.message
    });
  }
}

// ====================
// EXTERNAL DATA MANAGEMENT
// ====================

async function getExternalData(req: Request, res: Response) {
  try {
    const {
      dataSourceId,
      limit = 100,
      offset = 0,
      filters = {},
      sortBy = 'syncedAt',
      sortOrder = 'desc',
      dateRange
    } = req.query;

    let query = db
      .select()
      .from(integratedData);

    const conditions = [];

    if (dataSourceId) {
      conditions.push(eq(integratedData.dataSourceId, parseInt(dataSourceId as string)));
    }

    // Date range filtering
    if (dateRange) {
      const range = JSON.parse(dateRange as string);
      if (range.start) {
        conditions.push(gte(integratedData.syncedAt, new Date(range.start)));
      }
      if (range.end) {
        conditions.push(lte(integratedData.syncedAt, new Date(range.end)));
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const sortColumn = sortBy === 'syncedAt' ? integratedData.syncedAt : integratedData.createdAt;
    query = query.orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn));

    // Apply pagination
    query = query.limit(parseInt(limit as string)).offset(parseInt(offset as string));

    const data = await query;

    // Get total count for pagination
    const totalCount = await db
      .select({ count: count() })
      .from(integratedData)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json({
      data: data.map(record => ({
        id: record.id,
        dataSourceId: record.dataSourceId,
        mappedData: record.mappedData,
        syncedAt: record.syncedAt,
        createdAt: record.createdAt,
        originalDataPreview: JSON.stringify(record.originalData).slice(0, 500)
      })),
      pagination: {
        total: totalCount[0].count,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: (parseInt(offset as string) + parseInt(limit as string)) < totalCount[0].count
      }
    });

  } catch (error) {
    console.error('Error getting external data:', error);
    res.status(500).json({ error: 'Failed to get external data' });
  }
}

async function getExternalAggregation(req: Request, res: Response) {
  try {
    const {
      dataSourceId,
      aggregationType = 'count',
      field,
      groupBy,
      timeRange = '24h',
      filters = {}
    } = req.query;

    if (!dataSourceId) {
      return res.status(400).json({ error: 'dataSourceId is required' });
    }

    // Build time range condition
    const timeRangeMs = parseTimeRange(timeRange as string);
    const startTime = new Date(Date.now() - timeRangeMs);

    let query = db
      .select()
      .from(integratedData)
      .where(and(
        eq(integratedData.dataSourceId, parseInt(dataSourceId as string)),
        gte(integratedData.syncedAt, startTime)
      ));

    const data = await query;

    // Process aggregation
    let result: any = {};

    switch (aggregationType) {
      case 'count':
        result.value = data.length;
        break;
      
      case 'sum':
        if (!field) {
          return res.status(400).json({ error: 'field is required for sum aggregation' });
        }
        result.value = data.reduce((sum, record) => {
          const mappedData = record.mappedData as any;
          const value = mappedData?.[field as string];
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);
        break;
      
      case 'average':
        if (!field) {
          return res.status(400).json({ error: 'field is required for average aggregation' });
        }
        const values = data
          .map(record => {
            const mappedData = record.mappedData as any;
            return mappedData?.[field as string];
          })
          .filter(val => typeof val === 'number');
        result.value = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
        break;
      
      case 'distinct':
        if (!field) {
          return res.status(400).json({ error: 'field is required for distinct aggregation' });
        }
        const distinctValues = new Set(
          data.map(record => {
            const mappedData = record.mappedData as any;
            return mappedData?.[field as string];
          }).filter(val => val !== undefined)
        );
        result.value = distinctValues.size;
        result.distinctValues = Array.from(distinctValues);
        break;
    }

    // Group by functionality
    if (groupBy && data.length > 0) {
      const grouped = data.reduce((groups: any, record) => {
        const mappedData = record.mappedData as any;
        let groupKey: string;
        
        if (groupBy === 'hour') {
          groupKey = new Date(record.syncedAt).toISOString().slice(0, 13) + ':00:00.000Z';
        } else if (groupBy === 'day') {
          groupKey = new Date(record.syncedAt).toISOString().slice(0, 10);
        } else if (groupBy === 'week') {
          const date = new Date(record.syncedAt);
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          groupKey = weekStart.toISOString().slice(0, 10);
        } else {
          groupKey = mappedData?.[groupBy as string] || 'unknown';
        }
        
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(record);
        return groups;
      }, {});

      result.groupedData = Object.entries(grouped).map(([key, records]: [string, any]) => ({
        group: key,
        count: records.length,
        value: aggregationType === 'sum' && field 
          ? records.reduce((sum: number, record: any) => {
              const mappedData = record.mappedData as any;
              const value = mappedData?.[field as string];
              return sum + (typeof value === 'number' ? value : 0);
            }, 0)
          : records.length
      })).sort((a, b) => a.group.localeCompare(b.group));
    }

    result.metadata = {
      dataSourceId: parseInt(dataSourceId as string),
      aggregationType,
      field,
      groupBy,
      timeRange,
      totalRecords: data.length,
      timestamp: new Date().toISOString()
    };

    res.json(result);

  } catch (error) {
    console.error('Error getting external aggregation:', error);
    res.status(500).json({ error: 'Failed to get external aggregation' });
  }
}

async function getExternalTimeSeries(req: Request, res: Response) {
  try {
    const {
      dataSourceId,
      field,
      interval = 'hour',
      timeRange = '24h',
      aggregation = 'count'
    } = req.query;

    if (!dataSourceId) {
      return res.status(400).json({ error: 'dataSourceId is required' });
    }

    const timeRangeMs = parseTimeRange(timeRange as string);
    const startTime = new Date(Date.now() - timeRangeMs);

    const data = await db
      .select()
      .from(integratedData)
      .where(and(
        eq(integratedData.dataSourceId, parseInt(dataSourceId as string)),
        gte(integratedData.syncedAt, startTime)
      ))
      .orderBy(asc(integratedData.syncedAt));

    // Group data by time intervals
    const timeSeries = data.reduce((series: any, record) => {
      let timeKey: string;
      const recordTime = new Date(record.syncedAt);
      
      switch (interval) {
        case 'minute':
          timeKey = recordTime.toISOString().slice(0, 16) + ':00.000Z';
          break;
        case 'hour':
          timeKey = recordTime.toISOString().slice(0, 13) + ':00:00.000Z';
          break;
        case 'day':
          timeKey = recordTime.toISOString().slice(0, 10) + 'T00:00:00.000Z';
          break;
        default:
          timeKey = recordTime.toISOString().slice(0, 13) + ':00:00.000Z';
      }
      
      if (!series[timeKey]) {
        series[timeKey] = [];
      }
      series[timeKey].push(record);
      return series;
    }, {});

    // Process aggregation for each time point
    const timeSeriesData = Object.entries(timeSeries).map(([timestamp, records]: [string, any]) => {
      let value: number;
      
      switch (aggregation) {
        case 'count':
          value = records.length;
          break;
        case 'sum':
          value = records.reduce((sum: number, record: any) => {
            const mappedData = record.mappedData as any;
            const fieldValue = mappedData?.[field as string];
            return sum + (typeof fieldValue === 'number' ? fieldValue : 0);
          }, 0);
          break;
        case 'average':
          const values = records
            .map((record: any) => {
              const mappedData = record.mappedData as any;
              return mappedData?.[field as string];
            })
            .filter((val: any) => typeof val === 'number');
          value = values.length > 0 ? values.reduce((sum: number, val: number) => sum + val, 0) / values.length : 0;
          break;
        default:
          value = records.length;
      }
      
      return {
        timestamp,
        value,
        recordCount: records.length
      };
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    res.json({
      timeSeries: timeSeriesData,
      metadata: {
        dataSourceId: parseInt(dataSourceId as string),
        field,
        interval,
        timeRange,
        aggregation,
        totalPoints: timeSeriesData.length,
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting external time series:', error);
    res.status(500).json({ error: 'Failed to get external time series' });
  }
}

// ====================
// DASHBOARD INTEGRATION
// ====================

async function getDashboardData(req: Request, res: Response) {
  try {
    const {
      cardType = 'all',
      includeExternal = 'true',
      refreshInterval
    } = req.query;

    // Get all active data sources with their latest data
    const sources = await db
      .select({
        id: dataSources.id,
        name: dataSources.name,
        type: dataSources.type,
        syncFrequency: dataSources.syncFrequency,
        lastSyncAt: dataSources.lastSyncAt,
        recordCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${integratedData} 
          WHERE ${integratedData.dataSourceId} = ${dataSources.id}
        )`
      })
      .from(dataSources)
      .where(eq(dataSources.isActive, true));

    // Get external systems status
    const externalSystems = await db
      .select({
        id: externalSystems.id,
        name: externalSystems.name,
        type: externalSystems.type,
        status: externalSystems.status,
        lastHealthCheck: externalSystems.lastHealthCheck
      })
      .from(externalSystems);

    // Get active widgets
    const widgets = await db
      .select()
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.isActive, true));

    // Calculate summary metrics
    const totalRecords = sources.reduce((sum, s) => sum + (s.recordCount || 0), 0);
    const healthySystems = externalSystems.filter(s => s.status === 'healthy').length;

    res.json({
      dataSources: sources,
      externalSystems: externalSystems,
      widgets: widgets,
      summary: {
        totalDataSources: sources.length,
        totalRecords: totalRecords,
        externalSystemsTotal: externalSystems.length,
        healthySystemsCount: healthySystems,
        systemHealthPercentage: externalSystems.length > 0 
          ? (healthySystems / externalSystems.length) * 100 
          : 100,
        lastUpdated: new Date().toISOString()
      },
      refreshMetadata: {
        recommendedInterval: calculateOptimalRefreshInterval(sources),
        lastDataSync: sources.reduce((latest, s) => {
          if (!latest || (s.lastSyncAt && new Date(s.lastSyncAt) > new Date(latest))) {
            return s.lastSyncAt;
          }
          return latest;
        }, null)
      }
    });

  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
}

async function getWidgetData(req: Request, res: Response) {
  try {
    const {
      widgetId,
      dataSourceId,
      aggregation = 'count',
      timeRange = '24h',
      format = 'number'
    } = req.query;

    if (!widgetId && !dataSourceId) {
      return res.status(400).json({ error: 'Either widgetId or dataSourceId is required' });
    }

    let widget = null;
    let sourceId = dataSourceId;

    // Get widget configuration if widgetId provided
    if (widgetId) {
      const widgets = await db
        .select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.id, parseInt(widgetId as string)))
        .limit(1);
      
      if (!widgets.length) {
        return res.status(404).json({ error: 'Widget not found' });
      }
      
      widget = widgets[0];
      sourceId = widget.dataSourceId;
    }

    if (!sourceId) {
      return res.status(400).json({ error: 'No data source associated with widget' });
    }

    // Get aggregated data based on configuration
    const timeRangeMs = parseTimeRange(timeRange as string);
    const startTime = new Date(Date.now() - timeRangeMs);

    const data = await db
      .select()
      .from(integratedData)
      .where(and(
        eq(integratedData.dataSourceId, parseInt(sourceId as string)),
        gte(integratedData.syncedAt, startTime)
      ));

    // Process data based on widget configuration or parameters
    const config = widget?.config || {};
    const aggType = config.aggregation || aggregation;
    const field = config.field || req.query.field;

    let result = {
      value: 0,
      formatted: '0',
      trend: null,
      metadata: {}
    };

    // Calculate main value
    switch (aggType) {
      case 'count':
        result.value = data.length;
        break;
      case 'sum':
        result.value = data.reduce((sum, record) => {
          const mappedData = record.mappedData as any;
          const value = mappedData?.[field as string];
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);
        break;
      case 'average':
        const values = data
          .map(record => {
            const mappedData = record.mappedData as any;
            return mappedData?.[field as string];
          })
          .filter(val => typeof val === 'number');
        result.value = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
        break;
    }

    // Format the value
    result.formatted = formatValue(result.value, format as string);

    // Calculate trend if requested
    if (config.showTrend || req.query.includeTrend === 'true') {
      result.trend = await calculateTrend(parseInt(sourceId as string), aggType, field as string, timeRange as string);
    }

    result.metadata = {
      widgetId: widgetId ? parseInt(widgetId as string) : null,
      dataSourceId: parseInt(sourceId as string),
      aggregation: aggType,
      timeRange,
      recordCount: data.length,
      lastUpdate: data.length > 0 ? Math.max(...data.map(r => new Date(r.syncedAt).getTime())) : null,
      timestamp: new Date().toISOString()
    };

    res.json(result);

  } catch (error) {
    console.error('Error getting widget data:', error);
    res.status(500).json({ error: 'Failed to get widget data' });
  }
}

// ====================
// UTILITY FUNCTIONS
// ====================

function parseTimeRange(timeRange: string): number {
  const ranges: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  
  return ranges[timeRange] || ranges['24h'];
}

function formatValue(value: number, format: string): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      }).format(value);
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'compact':
      return new Intl.NumberFormat('en-US', { 
        notation: 'compact' 
      }).format(value);
    default:
      return new Intl.NumberFormat('en-US').format(value);
  }
}

function calculateNextSync(syncFrequency: string, lastSync: Date | null): string | null {
  if (!lastSync || syncFrequency === 'manual') return null;
  
  const intervals: Record<string, number> = {
    'hourly': 60 * 60 * 1000,
    'daily': 24 * 60 * 60 * 1000,
    'weekly': 7 * 24 * 60 * 60 * 1000
  };
  
  const interval = intervals[syncFrequency];
  if (!interval) return null;
  
  return new Date(new Date(lastSync).getTime() + interval).toISOString();
}

function calculateOptimalRefreshInterval(sources: any[]): number {
  if (sources.length === 0) return 300000; // 5 minutes default
  
  const intervals = sources.map(s => {
    switch (s.syncFrequency) {
      case 'real-time': return 60000; // 1 minute
      case 'hourly': return 300000; // 5 minutes
      case 'daily': return 3600000; // 1 hour
      default: return 300000; // 5 minutes
    }
  });
  
  return Math.min(...intervals);
}

async function performConnectionTest(dataSource: any): Promise<any> {
  try {
    // Basic connection test implementation
    // This should be expanded based on data source type
    
    if (dataSource.type === 'api') {
      const response = await fetch(dataSource.apiEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(dataSource.authType === 'bearer' && dataSource.authConfig?.token ? {
            'Authorization': `Bearer ${dataSource.authConfig.token}`
          } : {}),
          ...(dataSource.authType === 'api_key' && dataSource.authConfig?.apiKey ? {
            'X-API-Key': dataSource.authConfig.apiKey
          } : {})
        }
      });

      const isSuccess = response.ok;
      const responseData = await response.text();

      return {
        success: isSuccess,
        status: response.status,
        message: isSuccess ? 'Connection successful' : `Connection failed: ${response.statusText}`,
        responseTime: Date.now(), // Should measure actual response time
        sampleData: isSuccess ? responseData.slice(0, 500) : null,
        timestamp: new Date().toISOString()
      };
    }

    // Add other connection test types as needed
    return {
      success: false,
      message: 'Connection test not implemented for this data source type'
    };

  } catch (error) {
    return {
      success: false,
      message: `Connection test failed: ${error.message}`,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

async function calculateTrend(dataSourceId: number, aggregation: string, field: string, currentTimeRange: string): Promise<any> {
  try {
    // Get current period data
    const currentRangeMs = parseTimeRange(currentTimeRange);
    const currentStartTime = new Date(Date.now() - currentRangeMs);
    
    // Get previous period data for comparison
    const previousStartTime = new Date(currentStartTime.getTime() - currentRangeMs);
    
    const [currentData, previousData] = await Promise.all([
      db.select().from(integratedData)
        .where(and(
          eq(integratedData.dataSourceId, dataSourceId),
          gte(integratedData.syncedAt, currentStartTime)
        )),
      db.select().from(integratedData)
        .where(and(
          eq(integratedData.dataSourceId, dataSourceId),
          gte(integratedData.syncedAt, previousStartTime),
          lte(integratedData.syncedAt, currentStartTime)
        ))
    ]);

    // Calculate values for both periods
    const currentValue = calculateAggregationValue(currentData, aggregation, field);
    const previousValue = calculateAggregationValue(previousData, aggregation, field);

    if (previousValue === 0) {
      return {
        direction: currentValue > 0 ? 'up' : 'flat',
        percentage: 0,
        value: currentValue - previousValue
      };
    }

    const percentageChange = ((currentValue - previousValue) / previousValue) * 100;
    
    return {
      direction: percentageChange > 0 ? 'up' : percentageChange < 0 ? 'down' : 'flat',
      percentage: Math.abs(percentageChange),
      value: currentValue - previousValue,
      currentValue,
      previousValue
    };

  } catch (error) {
    console.error('Error calculating trend:', error);
    return null;
  }
}

function calculateAggregationValue(data: any[], aggregation: string, field: string): number {
  switch (aggregation) {
    case 'count':
      return data.length;
    case 'sum':
      return data.reduce((sum, record) => {
        const mappedData = record.mappedData as any;
        const value = mappedData?.[field];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);
    case 'average':
      const values = data
        .map(record => {
          const mappedData = record.mappedData as any;
          return mappedData?.[field];
        })
        .filter(val => typeof val === 'number');
      return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    default:
      return data.length;
  }
}

// Placeholder functions for additional endpoints
async function updateDataSource(req: Request, res: Response) {
  // Implementation for updating data source
  res.status(501).json({ error: 'Not implemented yet' });
}

async function syncDataSource(req: Request, res: Response) {
  // Implementation for syncing data source
  res.status(501).json({ error: 'Not implemented yet' });
}

async function getExternalMetrics(req: Request, res: Response) {
  // Implementation for external metrics
  res.status(501).json({ error: 'Not implemented yet' });
}

async function createDashboardCard(req: Request, res: Response) {
  // Implementation for creating dashboard cards
  res.status(501).json({ error: 'Not implemented yet' });
}

async function syncDashboardWithSources(req: Request, res: Response) {
  // Implementation for syncing dashboard with sources
  res.status(501).json({ error: 'Not implemented yet' });
}

async function getComparisonData(req: Request, res: Response) {
  // Implementation for comparison data
  res.status(501).json({ error: 'Not implemented yet' });
}

async function getCrossSourceAnalytics(req: Request, res: Response) {
  // Implementation for cross-source analytics
  res.status(501).json({ error: 'Not implemented yet' });
}

async function getDataQualityMetrics(req: Request, res: Response) {
  // Implementation for data quality metrics
  res.status(501).json({ error: 'Not implemented yet' });
}

async function getExternalSystemStatus(req: Request, res: Response) {
  // Implementation for external system status
  res.status(501).json({ error: 'Not implemented yet' });
}

async function getIntegrationHealth(req: Request, res: Response) {
  // Implementation for integration health
  res.status(501).json({ error: 'Not implemented yet' });
}

async function getConnectionDiagnostics(req: Request, res: Response) {
  // Implementation for connection diagnostics
  res.status(501).json({ error: 'Not implemented yet' });
}

async function getRealTimeStream(req: Request, res: Response) {
  // Implementation for real-time streaming
  res.status(501).json({ error: 'Not implemented yet' });
}

async function performBatchSync(req: Request, res: Response) {
  // Implementation for batch sync
  res.status(501).json({ error: 'Not implemented yet' });
}

async function performDataTransformation(req: Request, res: Response) {
  // Implementation for data transformation
  res.status(501).json({ error: 'Not implemented yet' });
}

export default router; 