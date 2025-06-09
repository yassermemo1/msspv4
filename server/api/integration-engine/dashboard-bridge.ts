import { Request, Response } from 'express';
import { db } from '@/lib/db';
import { 
  dataSources,
  integratedData,
  externalSystems,
  dashboardWidgets,
  dataSourceMappings
} from '@/lib/schema';
import { sql, count, sum, avg, max, min, and, eq, like, gte, lte, desc, asc, inArray } from 'drizzle-orm';

// Bridge API endpoint for dashboard integration
export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      action,
      dataSourceId,
      aggregation = 'count',
      filters = {},
      limit = 100
    } = req.query;

    switch (action) {
      case 'available-sources':
        return await getAvailableDataSources(req, res);
      
      case 'source-data':
        return await getDataSourceData(req, res);
        
      case 'external-systems-health':
        return await getExternalSystemsHealth(req, res);
        
      case 'sync-dashboard-cards':
        return await syncDashboardCards(req, res);
        
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Dashboard bridge error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get all available data sources for dashboard integration
async function getAvailableDataSources(req: Request, res: Response) {
  try {
    const sources = await db
      .select({
        id: dataSources.id,
        name: dataSources.name,
        description: dataSources.description,
        isActive: dataSources.isActive,
        lastSyncAt: dataSources.lastSyncAt,
        syncFrequency: dataSources.syncFrequency,
        recordCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${integratedData} 
          WHERE ${integratedData.dataSourceId} = ${dataSources.id}
        )`
      })
      .from(dataSources)
      .where(eq(dataSources.isActive, true))
      .orderBy(desc(dataSources.lastSyncAt));

    // Add external systems info
    const externalSystemsInfo = await db
      .select({
        id: externalSystems.id,
        name: externalSystems.name,
        type: externalSystems.type,
        status: externalSystems.status,
        lastHealthCheck: externalSystems.lastHealthCheck
      })
      .from(externalSystems)
      .orderBy(desc(externalSystems.lastHealthCheck));

    res.json({
      dataSources: sources,
      externalSystems: externalSystemsInfo,
      summary: {
        totalDataSources: sources.length,
        activeDataSources: sources.filter(s => s.isActive).length,
        totalRecords: sources.reduce((sum, s) => sum + (s.recordCount || 0), 0),
        externalSystemsCount: externalSystemsInfo.length,
        healthySystemsCount: externalSystemsInfo.filter(s => s.status === 'healthy').length
      }
    });

  } catch (error) {
    console.error('Error fetching available data sources:', error);
    res.status(500).json({ error: 'Failed to fetch data sources' });
  }
}

// Get data from a specific data source for dashboard cards
async function getDataSourceData(req: Request, res: Response) {
  try {
    const { 
      dataSourceId,
      aggregation = 'count',
      field,
      filters = {},
      timeRange,
      groupBy
    } = req.query;

    if (!dataSourceId) {
      return res.status(400).json({ error: 'dataSourceId is required' });
    }

    // Get data source info
    const dataSource = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, parseInt(dataSourceId as string)))
      .limit(1);

    if (!dataSource.length || !dataSource[0].isActive) {
      return res.status(404).json({ error: 'Data source not found or inactive' });
    }

    // Build base query
    let query = db
      .select()
      .from(integratedData)
      .where(eq(integratedData.dataSourceId, parseInt(dataSourceId as string)));

    // Apply time range filter
    if (timeRange) {
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'last_hour':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'last_24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'last_7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last_30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 24h
      }
      
      query = query.where(and(
        eq(integratedData.dataSourceId, parseInt(dataSourceId as string)),
        gte(integratedData.syncedAt, startDate)
      ));
    }

    const data = await query;

    // Process aggregation
    let result: any = {};

    switch (aggregation) {
      case 'count':
        result.value = data.length;
        break;
        
      case 'sum':
        if (field) {
          const numericValues = data
            .map(record => {
              const mappedData = record.mappedData as any;
              return mappedData?.[field as string] || 0;
            })
            .filter(val => typeof val === 'number');
          result.value = numericValues.reduce((sum, val) => sum + val, 0);
        } else {
          // Default sum behavior - look for common numeric fields
          const numericValues = data
            .map(record => {
              const mappedData = record.mappedData as any;
              return mappedData?.value || mappedData?.amount || mappedData?.count || mappedData?.total || 0;
            })
            .filter(val => typeof val === 'number');
          result.value = numericValues.reduce((sum, val) => sum + val, 0);
        }
        break;
        
      case 'average':
        if (field) {
          const numericValues = data
            .map(record => {
              const mappedData = record.mappedData as any;
              return mappedData?.[field as string] || 0;
            })
            .filter(val => typeof val === 'number');
          result.value = numericValues.length > 0 
            ? numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length 
            : 0;
        } else {
          result.value = data.length;
        }
        break;
        
      case 'latest':
        const latestRecord = data.sort((a, b) => 
          new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime()
        )[0];
        result.value = latestRecord ? (latestRecord.mappedData as any)?.[field as string] || 0 : 0;
        result.latestSync = latestRecord?.syncedAt;
        break;
        
      default:
        result.value = data.length;
    }

    // Add metadata
    result.metadata = {
      dataSourceName: dataSource[0].name,
      totalRecords: data.length,
      lastSync: data.length > 0 
        ? Math.max(...data.map(r => new Date(r.syncedAt).getTime()))
        : null,
      timeRange: timeRange || 'all',
      aggregation: aggregation
    };

    // Group by functionality for charts
    if (groupBy && data.length > 0) {
      const grouped = data.reduce((groups: any, record) => {
        const mappedData = record.mappedData as any;
        let groupKey: string;
        
        if (groupBy === 'hour') {
          groupKey = new Date(record.syncedAt).toISOString().slice(0, 13) + ':00:00.000Z';
        } else if (groupBy === 'day') {
          groupKey = new Date(record.syncedAt).toISOString().slice(0, 10);
        } else {
          groupKey = mappedData?.[groupBy as string] || 'unknown';
        }
        
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(record);
        return groups;
      }, {});

      result.grouped = Object.entries(grouped).map(([key, records]: [string, any]) => ({
        group: key,
        count: records.length,
        value: records.reduce((sum: number, record: any) => {
          const mappedData = record.mappedData as any;
          return sum + (mappedData?.value || mappedData?.amount || 1);
        }, 0)
      }));
    }

    res.json(result);

  } catch (error) {
    console.error('Error fetching data source data:', error);
    res.status(500).json({ error: 'Failed to fetch data source data' });
  }
}

// Get external systems health for dashboard monitoring
async function getExternalSystemsHealth(req: Request, res: Response) {
  try {
    const systems = await db
      .select()
      .from(externalSystems)
      .where(eq(externalSystems.isActive, true));

    const healthChecks = await Promise.all(
      systems.map(async (system) => {
        try {
          // Perform health check based on system type
          const healthResult = await performHealthCheck(system);
          
          // Update last health check timestamp
          await db
            .update(externalSystems)
            .set({ 
              lastHealthCheck: new Date(),
              status: healthResult.healthy ? 'healthy' : 'unhealthy'
            })
            .where(eq(externalSystems.id, system.id));

          return {
            id: system.id,
            name: system.name,
            type: system.type,
            status: healthResult.healthy ? 'healthy' : 'unhealthy',
            lastHealthCheck: new Date(),
            responseTime: healthResult.responseTime,
            statusMessage: healthResult.message,
            metrics: healthResult.metrics || {}
          };
        } catch (error) {
          return {
            id: system.id,
            name: system.name,
            type: system.type,
            status: 'error',
            lastHealthCheck: new Date(),
            responseTime: null,
            statusMessage: error.message,
            metrics: {}
          };
        }
      })
    );

    const summary = {
      total: systems.length,
      healthy: healthChecks.filter(h => h.status === 'healthy').length,
      unhealthy: healthChecks.filter(h => h.status === 'unhealthy').length,
      error: healthChecks.filter(h => h.status === 'error').length,
      averageResponseTime: healthChecks.reduce((sum, h) => sum + (h.responseTime || 0), 0) / healthChecks.length
    };

    res.json({
      systems: healthChecks,
      summary,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting external systems health:', error);
    res.status(500).json({ error: 'Failed to get external systems health' });
  }
}

async function performHealthCheck(system: any): Promise<any> {
  const startTime = Date.now();
  
  try {
    if (system.type === 'api' && system.healthCheckUrl) {
      const response = await fetch(system.healthCheckUrl, {
        method: 'GET',
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
          ...(system.authType === 'bearer' && system.authConfig?.token ? {
            'Authorization': `Bearer ${system.authConfig.token}`
          } : {}),
          ...(system.authType === 'api_key' && system.authConfig?.apiKey ? {
            'X-API-Key': system.authConfig.apiKey
          } : {})
        }
      });

      const responseTime = Date.now() - startTime;
      const healthy = response.ok;

      return {
        healthy,
        responseTime,
        message: healthy ? 'API responding normally' : `HTTP ${response.status}: ${response.statusText}`,
        metrics: {
          statusCode: response.status,
          contentType: response.headers.get('content-type')
        }
      };
    }

    // Default health check for other system types
    return {
      healthy: true,
      responseTime: Date.now() - startTime,
      message: 'System status unknown - no health check configured',
      metrics: {}
    };

  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime,
      message: `Health check failed: ${error.message}`,
      metrics: {}
    };
  }
}

// Sync dashboard cards with available external data sources
async function syncDashboardCards(req: Request, res: Response) {
  try {
    // Get all active data sources
    const dataSources = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.isActive, true));

    const suggestions = [];

    for (const source of dataSources) {
      // Generate card suggestions based on data source type and available data
      const cardSuggestions = await generateCardSuggestions(source);
      suggestions.push(...cardSuggestions);
    }

    // Auto-create recommended cards if user preference allows
    const { autoCreate = false } = req.query;
    let createdCards = [];
    
    if (autoCreate === 'true') {
      for (const suggestion of suggestions.filter(s => s.confidence > 0.8)) {
        try {
          const card = await createSuggestedCard(suggestion);
          createdCards.push(card);
        } catch (error) {
          console.error('Error creating suggested card:', error);
        }
      }
    }

    res.json({
      suggestions,
      createdCards,
      summary: {
        totalSuggestions: suggestions.length,
        highConfidenceSuggestions: suggestions.filter(s => s.confidence > 0.8).length,
        autoCreatedCards: createdCards.length,
        availableDataSources: dataSources.length
      }
    });

  } catch (error) {
    console.error('Error syncing dashboard cards:', error);
    res.status(500).json({ error: 'Failed to sync dashboard cards' });
  }
}

async function generateCardSuggestions(dataSource: any) {
  const suggestions = [];
  
  // Get sample data to understand structure
  const sampleData = await db
    .select()
    .from(integratedData)
    .where(eq(integratedData.dataSourceId, dataSource.id))
    .limit(10);

  if (sampleData.length === 0) return suggestions;

  // Analyze data structure and suggest appropriate cards
  const fields = Object.keys(sampleData[0].mappedData || {});
  
  // Suggest count cards
  suggestions.push({
    type: 'metric',
    title: `Total ${dataSource.name} Records`,
    config: {
      dataSource: 'external',
      externalDataSourceId: dataSource.id,
      aggregation: 'count',
      format: 'number',
      icon: 'Database',
      color: 'blue'
    },
    confidence: 0.9,
    reasoning: 'Count metrics are always useful for tracking data volume'
  });

  // Suggest numeric aggregations for numeric fields
  for (const field of fields) {
    const isNumeric = sampleData.some(record => {
      const value = record.mappedData?.[field];
      return typeof value === 'number' && !isNaN(value);
    });

    if (isNumeric) {
      suggestions.push({
        type: 'metric',
        title: `Total ${field.charAt(0).toUpperCase() + field.slice(1)}`,
        config: {
          dataSource: 'external',
          externalDataSourceId: dataSource.id,
          aggregation: 'sum',
          field: field,
          format: 'number',
          icon: 'TrendingUp',
          color: 'green'
        },
        confidence: 0.8,
        reasoning: `Numeric field "${field}" detected - sum aggregation suggested`
      });

      suggestions.push({
        type: 'metric',
        title: `Average ${field.charAt(0).toUpperCase() + field.slice(1)}`,
        config: {
          dataSource: 'external',
          externalDataSourceId: dataSource.id,
          aggregation: 'average',
          field: field,
          format: 'number',
          icon: 'BarChart3',
          color: 'purple'
        },
        confidence: 0.7,
        reasoning: `Numeric field "${field}" detected - average aggregation suggested`
      });
    }
  }

  // Suggest time series charts if timestamp fields exist
  const timeFields = fields.filter(field => 
    field.toLowerCase().includes('time') || 
    field.toLowerCase().includes('date') ||
    field.toLowerCase().includes('created') ||
    field.toLowerCase().includes('updated')
  );

  if (timeFields.length > 0) {
    suggestions.push({
      type: 'chart',
      title: `${dataSource.name} Trends Over Time`,
      config: {
        dataSource: 'external',
        externalDataSourceId: dataSource.id,
        chartType: 'line',
        aggregation: 'count',
        groupBy: 'day',
        timeRange: '30d',
        icon: 'TrendingUp',
        color: 'indigo'
      },
      confidence: 0.85,
      reasoning: 'Time-based fields detected - trend analysis suggested'
    });
  }

  return suggestions;
}

async function createSuggestedCard(suggestion: any) {
  // Create a dashboard card based on the suggestion
  const cardData = {
    title: suggestion.title,
    type: suggestion.type,
    config: suggestion.config,
    isActive: true,
    createdBy: 1, // System-generated
    layout: {
      x: 0,
      y: 0,
      w: suggestion.type === 'chart' ? 8 : 4,
      h: suggestion.type === 'chart' ? 6 : 4
    }
  };

  const result = await db
    .insert(dashboardWidgets)
    .values(cardData)
    .returning();

  return result[0];
}

// Helper function to convert sync frequency to refresh interval
function getRefreshInterval(syncFrequency: string): number {
  switch (syncFrequency) {
    case 'real-time':
    case 'every_minute':
      return 60000; // 1 minute
    case 'every_5_minutes':
      return 300000; // 5 minutes
    case 'every_15_minutes':
      return 900000; // 15 minutes
    case 'hourly':
      return 3600000; // 1 hour
    case 'daily':
      return 86400000; // 24 hours
    default:
      return 300000; // Default 5 minutes
  }
}

async function processAndStoreData(source: any, data: any): Promise<number> {
  // Get field mappings for this data source
  const mappings = await db
    .select()
    .from(dataSourceMappings)
    .where(eq(dataSourceMappings.dataSourceId, source.id));

  let recordsProcessed = 0;
  const dataArray = Array.isArray(data) ? data : [data];

  for (const record of dataArray) {
    try {
      // Apply field mappings
      const mappedData = {};
      for (const mapping of mappings) {
        const sourceValue = record[mapping.sourceField];
        if (sourceValue !== undefined) {
          mappedData[mapping.targetField] = sourceValue;
        }
      }

      // Store the integrated data
      await db
        .insert(integratedData)
        .values({
          dataSourceId: source.id,
          originalData: record,
          mappedData,
          syncedAt: new Date()
        });

      recordsProcessed++;
    } catch (error) {
      console.error('Error processing record:', error);
    }
  }

  return recordsProcessed;
} 