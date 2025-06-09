import { Request, Response } from 'express';
import { db } from '@/lib/db';
import { 
  clients, 
  contracts, 
  services, 
  licensePools, 
  hardwareAssets,
  serviceScopes,
  proposals,
  clientLicenses,
  financialTransactions,
  users,
  customFields,
  documents,
  serviceAuthorizationForms,
  certificatesOfCompliance,
  dataSources,
  integratedData,
  externalSystems,
  clientExternalMappings
} from '@/lib/schema';
import { sql, count, sum, avg, max, min, and, eq, like, gte, lte, ne, isNull, isNotNull } from 'drizzle-orm';

// Enhanced table mapping with all schema tables
const TABLE_MAP = {
  // Core business tables
  clients,
  contracts,
  services,
  license_pools: licensePools,
  hardware_assets: hardwareAssets,
  service_scopes: serviceScopes,
  proposals,
  client_licenses: clientLicenses,
  financial_transactions: financialTransactions,
  
  // Document and compliance tables
  documents,
  service_authorization_forms: serviceAuthorizationForms,
  certificates_of_compliance: certificatesOfCompliance,
  
  // User and system tables
  users,
  custom_fields: customFields,
  
  // Integration and external system tables
  data_sources: dataSources,
  integrated_data: integratedData,
  external_systems: externalSystems,
  client_external_mappings: clientExternalMappings,
};

// External data source integration
async function fetchExternalData(dataSourceId: number, aggregation: string, filters: Record<string, any>) {
  try {
    // Get data source configuration
    const dataSource = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, dataSourceId))
      .limit(1);
    
    if (!dataSource.length || !dataSource[0].isActive) {
      throw new Error('Data source not found or inactive');
    }

    // Get integrated data with aggregation
    const query = db
      .select()
      .from(integratedData)
      .where(eq(integratedData.dataSourceId, dataSourceId));

    const data = await query;
    
    // Apply aggregation to external data
    switch (aggregation) {
      case 'count':
        return data.length;
      case 'sum':
        // Extract numeric values from mapped data and sum them
        const numericValues = data
          .map(record => {
            const mappedData = record.mappedData as any;
            // Look for common numeric fields
            return mappedData?.value || mappedData?.amount || mappedData?.count || mappedData?.total || 0;
          })
          .filter(val => typeof val === 'number');
        return numericValues.reduce((sum, val) => sum + val, 0);
      case 'average':
        const avgValues = data
          .map(record => {
            const mappedData = record.mappedData as any;
            return mappedData?.value || mappedData?.amount || mappedData?.count || mappedData?.total || 0;
          })
          .filter(val => typeof val === 'number');
        return avgValues.length > 0 ? avgValues.reduce((sum, val) => sum + val, 0) / avgValues.length : 0;
      default:
        return data.length;
    }
  } catch (error) {
    console.error('External data fetch error:', error);
    return 0;
  }
}

// Comparison data processing
async function getComparisonData(comparisonConfig: any) {
  const results: Record<string, any> = {};
  
  for (const [key, config] of Object.entries(comparisonConfig)) {
    const { table, aggregation = 'count', filters = {} } = config as any;
    
    if (table === 'external' && config.dataSourceId) {
      // Handle external data source
      results[key] = await fetchExternalData(config.dataSourceId, aggregation, filters);
    } else {
      // Handle database table
      const tableSchema = TABLE_MAP[table as keyof typeof TABLE_MAP];
      if (tableSchema) {
        const whereConditions = buildWhereConditions(filters, tableSchema);
        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
        
        let result = 0;
        switch (aggregation) {
          case 'count':
            const countResult = await db
              .select({ count: count() })
              .from(tableSchema)
              .where(whereClause);
            result = countResult[0]?.count || 0;
            break;
          case 'sum':
            result = await performSumAggregation(table, tableSchema, whereClause);
            break;
          case 'average':
            result = await performAverageAggregation(table, tableSchema, whereClause);
            break;
          case 'max':
            result = await performMaxAggregation(table, tableSchema, whereClause);
            break;
          case 'min':
            result = await performMinAggregation(table, tableSchema, whereClause);
            break;
        }
        results[key] = result;
      }
    }
  }
  
  return results;
}

// Helper function to build where conditions
function buildWhereConditions(filters: Record<string, any>, tableSchema: any) {
  const whereConditions = [];
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      // Handle different filter types
      if (key.startsWith('filter_')) {
        const fieldName = key.replace('filter_', '');
        if (fieldName in tableSchema) {
          const field = tableSchema[fieldName as keyof typeof tableSchema];
          
          // Handle special filter values
          if (value === 'active') {
            whereConditions.push(eq(field, 'active'));
          } else if (value === 'inactive') {
            whereConditions.push(eq(field, 'inactive'));
          } else if (value === 'not_null') {
            whereConditions.push(isNotNull(field));
          } else if (value === 'null') {
            whereConditions.push(isNull(field));
          } else {
            whereConditions.push(eq(field, value));
          }
        }
      } else if (key === 'status') {
        if ('status' in tableSchema) {
          whereConditions.push(eq(tableSchema.status, value));
        }
      } else if (key === 'client_type') {
        // Custom filter for client types
        if (value === 'direct' && 'clientType' in tableSchema) {
          whereConditions.push(eq(tableSchema.clientType, 'direct'));
        } else if (value === 'non_direct' && 'clientType' in tableSchema) {
          whereConditions.push(ne(tableSchema.clientType, 'direct'));
        }
      } else if (key === 'date_range') {
        // Handle date range filters
        if (value.start && 'createdAt' in tableSchema) {
          whereConditions.push(gte(tableSchema.createdAt, new Date(value.start)));
        }
        if (value.end && 'createdAt' in tableSchema) {
          whereConditions.push(lte(tableSchema.createdAt, new Date(value.end)));
        }
      }
    }
  });
  
  // Handle soft deletion filter
  if ('deletedAt' in tableSchema) {
    whereConditions.push(isNull(tableSchema.deletedAt));
  }
  
  return whereConditions;
}

// Aggregation helper functions
async function performSumAggregation(table: string, tableSchema: any, whereClause: any) {
  let sumField = null;
  
  // Determine which field to sum based on table
  if (table === 'contracts' && 'totalValue' in tableSchema) {
    sumField = tableSchema.totalValue;
  } else if (table === 'financial_transactions' && 'amount' in tableSchema) {
    sumField = tableSchema.amount;
  } else if (table === 'license_pools' && 'totalLicenses' in tableSchema) {
    sumField = tableSchema.totalLicenses;
  } else if (table === 'hardware_assets' && 'purchasePrice' in tableSchema) {
    sumField = tableSchema.purchasePrice;
  }
  
  if (sumField) {
    const sumResult = await db
      .select({ sum: sum(sumField) })
      .from(tableSchema)
      .where(whereClause);
    return parseFloat(sumResult[0]?.sum || '0');
  }
  
  return 0;
}

async function performAverageAggregation(table: string, tableSchema: any, whereClause: any) {
  let avgField = null;
  
  if (table === 'contracts' && 'totalValue' in tableSchema) {
    avgField = tableSchema.totalValue;
  } else if (table === 'financial_transactions' && 'amount' in tableSchema) {
    avgField = tableSchema.amount;
  }
  
  if (avgField) {
    const avgResult = await db
      .select({ avg: avg(avgField) })
      .from(tableSchema)
      .where(whereClause);
    return parseFloat(avgResult[0]?.avg || '0');
  }
  
  return 0;
}

async function performMaxAggregation(table: string, tableSchema: any, whereClause: any) {
  let maxField = null;
  
  if (table === 'contracts' && 'totalValue' in tableSchema) {
    maxField = tableSchema.totalValue;
  } else if (table === 'financial_transactions' && 'amount' in tableSchema) {
    maxField = tableSchema.amount;
  }
  
  if (maxField) {
    const maxResult = await db
      .select({ max: max(maxField) })
      .from(tableSchema)
      .where(whereClause);
    return parseFloat(maxResult[0]?.max || '0');
  }
  
  return 0;
}

async function performMinAggregation(table: string, tableSchema: any, whereClause: any) {
  let minField = null;
  
  if (table === 'contracts' && 'totalValue' in tableSchema) {
    minField = tableSchema.totalValue;
  } else if (table === 'financial_transactions' && 'amount' in tableSchema) {
    minField = tableSchema.amount;
  }
  
  if (minField) {
    const minResult = await db
      .select({ min: min(minField) })
      .from(tableSchema)
      .where(whereClause);
    return parseFloat(minResult[0]?.min || '0');
  }
  
  return 0;
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      table, 
      aggregation = 'count',
      comparison,
      dataSourceId,
      ...filters 
    } = req.query;

    // Handle comparison requests
    if (comparison && typeof comparison === 'string') {
      try {
        const comparisonConfig = JSON.parse(comparison);
        const comparisonResults = await getComparisonData(comparisonConfig);
        
        return res.json({
          type: 'comparison',
          data: comparisonResults,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Comparison parsing error:', error);
        return res.status(400).json({ error: 'Invalid comparison configuration' });
      }
    }

    // Handle external data source requests
    if (dataSourceId && typeof dataSourceId === 'string') {
      const result = await fetchExternalData(parseInt(dataSourceId), aggregation as string, filters as Record<string, any>);
      
      return res.json({
        value: result,
        metadata: { 
          source: 'external',
          dataSourceId: parseInt(dataSourceId)
        },
        timestamp: new Date().toISOString()
      });
    }

    // Handle standard database table requests
    if (!table || typeof table !== 'string') {
      return res.status(400).json({ error: 'Table parameter is required' });
    }

    const tableSchema = TABLE_MAP[table as keyof typeof TABLE_MAP];
    
    if (!tableSchema) {
      // For unknown tables, return mock data
      const mockData = getMockData(table as string, aggregation as string, filters as Record<string, any>);
      return res.json(mockData);
    }

    // Build filters
    const whereConditions = buildWhereConditions(filters as Record<string, any>, tableSchema);
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    let result;
    let metadata: Record<string, any> = {};

    // Perform aggregation
    switch (aggregation) {
      case 'count':
        const countResult = await db
          .select({ count: count() })
          .from(tableSchema)
          .where(whereClause);
        result = countResult[0]?.count || 0;
        break;

      case 'sum':
        result = await performSumAggregation(table, tableSchema, whereClause);
        break;

      case 'average':
        result = await performAverageAggregation(table, tableSchema, whereClause);
        break;

      case 'max':
        result = await performMaxAggregation(table, tableSchema, whereClause);
        break;

      case 'min':
        result = await performMinAggregation(table, tableSchema, whereClause);
        break;

      default:
        result = 0;
    }

    // Add enhanced metadata based on table type
    metadata = await getEnhancedMetadata(table, tableSchema, whereClause);

    res.json({
      value: result,
      metadata,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard card data error:', error);
    res.status(500).json({ error: 'Failed to fetch card data' });
  }
}

// Enhanced metadata generation
async function getEnhancedMetadata(table: string, tableSchema: any, whereClause: any) {
  const metadata: Record<string, any> = {};

  try {
    switch (table) {
      case 'clients':
        // Client distribution by status
        const clientStatusCounts = await db
          .select({ 
            status: clients.status,
            count: count() 
          })
          .from(clients)
          .where(isNull(clients.deletedAt))
          .groupBy(clients.status);
        
        metadata.statusBreakdown = clientStatusCounts.reduce((acc, { status, count }) => {
          acc[status] = count;
          return acc;
        }, {} as Record<string, number>);

        // Recent clients
        const recentClients = await db
          .select({ count: count() })
          .from(clients)
          .where(and(
            gte(clients.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
            isNull(clients.deletedAt)
          ));
        
        metadata.recentlyAdded = recentClients[0]?.count || 0;

        // Industry distribution
        const industryDistribution = await db
          .select({ 
            industry: clients.industry,
            count: count() 
          })
          .from(clients)
          .where(and(isNotNull(clients.industry), isNull(clients.deletedAt)))
          .groupBy(clients.industry);
        
        metadata.industryBreakdown = industryDistribution.reduce((acc, { industry, count }) => {
          acc[industry || 'Unknown'] = count;
          return acc;
        }, {} as Record<string, number>);
        break;

      case 'contracts':
        // Contract status breakdown
        const statusCounts = await db
          .select({ 
            status: contracts.status,
            count: count() 
          })
          .from(contracts)
          .groupBy(contracts.status);
        
        metadata.statusBreakdown = statusCounts.reduce((acc, { status, count }) => {
          acc[status] = count;
          return acc;
        }, {} as Record<string, number>);

        // Revenue trends
        const revenueByMonth = await db
          .select({
            month: sql<string>`to_char(${contracts.startDate}, 'YYYY-MM')`,
            revenue: sum(contracts.totalValue)
          })
          .from(contracts)
          .where(gte(contracts.startDate, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)))
          .groupBy(sql`to_char(${contracts.startDate}, 'YYYY-MM')`)
          .orderBy(sql`to_char(${contracts.startDate}, 'YYYY-MM')`);
        
        metadata.revenueByMonth = revenueByMonth;
        break;

      case 'license_pools':
        // License utilization
        const utilizationData = await db
          .select({
            poolType: licensePools.poolType,
            totalLicenses: sum(licensePools.totalLicenses),
            usedLicenses: sum(licensePools.usedLicenses)
          })
          .from(licensePools)
          .groupBy(licensePools.poolType);
        
        metadata.utilizationByType = utilizationData.map(pool => ({
          type: pool.poolType,
          total: pool.totalLicenses,
          used: pool.usedLicenses,
          utilization: pool.totalLicenses ? ((pool.usedLicenses / pool.totalLicenses) * 100).toFixed(1) : '0'
        }));
        break;

      case 'external_systems':
        // External system health
        const systemStatus = await db
          .select({
            status: externalSystems.status,
            count: count()
          })
          .from(externalSystems)
          .groupBy(externalSystems.status);
        
        metadata.systemStatusBreakdown = systemStatus.reduce((acc, { status, count }) => {
          acc[status] = count;
          return acc;
        }, {} as Record<string, number>);
        break;

      case 'integrated_data':
        // Data freshness
        const dataFreshness = await db
          .select({
            dataSourceId: integratedData.dataSourceId,
            lastSync: max(integratedData.syncedAt),
            recordCount: count()
          })
          .from(integratedData)
          .groupBy(integratedData.dataSourceId);
        
        metadata.dataFreshness = dataFreshness;
        break;
    }
  } catch (error) {
    console.error('Metadata generation error:', error);
  }

  return metadata;
}

function getMockData(table: string, aggregation: string, filters: Record<string, any>) {
  // Generate realistic mock data for placeholder tables
  const mockValues: Record<string, number> = {
    tasks: Math.floor(Math.random() * 50) + 10,
    users: Math.floor(Math.random() * 20) + 5,
    service_authorization_forms: Math.floor(Math.random() * 15) + 3,
    certificates_of_compliance: Math.floor(Math.random() * 25) + 8,
    technical_proposals: Math.floor(Math.random() * 12) + 2,
    financial_proposals: Math.floor(Math.random() * 8) + 1,
  };

  let baseValue = mockValues[table] || Math.floor(Math.random() * 100) + 1;

  // Adjust for aggregation type
  if (aggregation === 'sum' || aggregation === 'average') {
    baseValue *= 1000; // Make it larger for financial values
  }

  // Apply filter adjustments
  Object.entries(filters).forEach(([key, value]) => {
    if (key.startsWith('filter_') && value === 'active') {
      baseValue = Math.floor(baseValue * 0.7); // Active items are typically 70% of total
    }
    if (key.startsWith('filter_') && value === 'pending') {
      baseValue = Math.floor(baseValue * 0.2); // Pending items are typically 20% of total
    }
  });

  const metadata: Record<string, any> = {};
  
  // Add relevant metadata based on table
  if (table === 'tasks') {
    metadata.priority = {
      high: Math.floor(baseValue * 0.3),
      medium: Math.floor(baseValue * 0.5),
      low: Math.floor(baseValue * 0.2)
    };
  }

  return {
    value: baseValue,
    metadata,
    timestamp: new Date().toISOString()
  };
} 