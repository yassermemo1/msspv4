import { ExternalApiService } from '../external-api-service';
import { CustomQuery, QueryExecution, ExternalSystem } from '@shared/schema';
import { storage } from '../storage';

interface QueryResult {
  success: boolean;
  data: any;
  error?: string;
  executionTime: number;
  recordCount: number;
}

export class QueryExecutionService {
  private static instance: QueryExecutionService;
  private externalApiService: ExternalApiService;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  private constructor() {
    this.externalApiService = ExternalApiService.getInstance();
  }

  public static getInstance(): QueryExecutionService {
    if (!QueryExecutionService.instance) {
      QueryExecutionService.instance = new QueryExecutionService();
    }
    return QueryExecutionService.instance;
  }

  /**
   * Execute a custom query and return results
   */
  async executeQuery(queryId: number, userId?: number, forceRefresh = false): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      // Get query configuration
      const query = await storage.getCustomQuery(queryId);
      if (!query) {
        throw new Error('Query not found');
      }

      // Get external system configuration
      const system = await storage.getExternalSystem(query.systemId);
      if (!system) {
        throw new Error('External system not found');
      }

      // Check cache first
      const cacheKey = `query_${queryId}`;
      if (query.cacheEnabled && !forceRefresh && this.isCacheValid(cacheKey, query.refreshInterval)) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          await this.logExecution(queryId, userId, 'cached', cached.data, Date.now() - startTime, cached.data?.length || 0);
          return {
            success: true,
            data: cached.data,
            executionTime: Date.now() - startTime,
            recordCount: cached.data?.length || 0
          };
        }
      }

      // Execute query based on type
      let result: any;
      switch (query.queryType.toLowerCase()) {
        case 'jql':
          result = await this.executeJqlQuery(query, system);
          break;
        case 'rest':
          result = await this.executeRestQuery(query, system);
          break;
        case 'graphql':
          result = await this.executeGraphqlQuery(query, system);
          break;
        case 'sql':
          result = await this.executeSqlQuery(query, system);
          break;
        default:
          result = await this.executeCustomQuery(query, system);
      }

      // Apply data mapping if configured
      let mappedData = this.applyDataMapping(result, query.dataMapping);

      // Apply aggregations if configured
      if (query.dataMapping?.aggregations) {
        mappedData = this.applyAggregations(mappedData, query.dataMapping.aggregations);
      }

      // Cache the result
      if (query.cacheEnabled) {
        this.cache.set(cacheKey, {
          data: mappedData,
          timestamp: Date.now(),
          ttl: query.refreshInterval * 1000
        });
      }

      const executionTime = Date.now() - startTime;
      const recordCount = Array.isArray(mappedData) ? mappedData.length : 1;

      // Log successful execution
      await this.logExecution(queryId, userId, 'completed', mappedData, executionTime, recordCount);

      return {
        success: true,
        data: mappedData,
        executionTime,
        recordCount
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log failed execution
      await this.logExecution(queryId, userId, 'failed', null, executionTime, 0, errorMessage);

      return {
        success: false,
        data: null,
        error: errorMessage,
        executionTime,
        recordCount: 0
      };
    }
  }

  /**
   * Execute JQL query for Jira systems
   */
  private async executeJqlQuery(query: CustomQuery, system: ExternalSystem): Promise<any> {
    const jqlQuery = this.substituteParameters(query.query, query.parameters);
    
    const metadata = {
      customJql: jqlQuery,
      maxResults: query.parameters?.maxResults || 100,
      fields: query.parameters?.fields || 'key,summary,status,assignee,priority,created,updated'
    };

    // Create a mock mapping to use existing Jira fetch logic
    const mockMapping = {
      systemName: system.systemName,
      externalIdentifier: '', // Not needed for custom JQL
      metadata
    };

    // Use existing Jira fetch logic from ExternalApiService
    const response = await (this.externalApiService as any).fetchJiraData(mockMapping, system);
    
    if (response.status === 'error') {
      throw new Error(response.error_message || 'Jira query failed');
    }

    return response.data;
  }

  /**
   * Execute REST API query
   */
  private async executeRestQuery(query: CustomQuery, system: ExternalSystem): Promise<any> {
    const endpoint = this.substituteParameters(query.query, query.parameters);
    const method = query.parameters?.method || 'GET';
    const headers = this.getAuthHeaders(system);
    
    if (query.parameters?.headers) {
      Object.assign(headers, query.parameters.headers);
    }

    const url = `${system.baseUrl}${endpoint}`;
    const options: any = {
      method,
      headers,
      signal: AbortSignal.timeout(30000)
    };

    if (method !== 'GET' && query.parameters?.body) {
      options.body = JSON.stringify(query.parameters.body);
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`REST API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Execute GraphQL query
   */
  private async executeGraphqlQuery(query: CustomQuery, system: ExternalSystem): Promise<any> {
    const graphqlQuery = this.substituteParameters(query.query, query.parameters);
    const headers = this.getAuthHeaders(system);
    headers['Content-Type'] = 'application/json';

    const body = {
      query: graphqlQuery,
      variables: query.parameters?.variables || {}
    };

    const response = await fetch(`${system.baseUrl}/graphql`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`GraphQL error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }

    return result.data;
  }

  /**
   * Execute SQL query (for database systems)
   */
  private async executeSqlQuery(query: CustomQuery, system: ExternalSystem): Promise<any> {
    const sqlQuery = this.substituteParameters(query.query, query.parameters);
    
    // This would need to be implemented based on specific database drivers
    // For now, throw an error to indicate SQL queries need additional setup
    throw new Error('SQL query execution requires database driver configuration');
  }

  /**
   * Execute custom query type
   */
  private async executeCustomQuery(query: CustomQuery, system: ExternalSystem): Promise<any> {
    // For custom query types, execute as REST endpoint
    return await this.executeRestQuery(query, system);
  }

  /**
   * Apply data mapping configuration to transform query results
   */
  private applyDataMapping(data: any, mapping: any): any {
    if (!mapping || Object.keys(mapping).length === 0) {
      return data;
    }

    try {
      // Support different mapping strategies
      if (mapping.type === 'jq') {
        // Use jq-style mapping (would need jq library)
        return this.applyJqMapping(data, mapping.expression);
      } else if (mapping.type === 'jsonpath') {
        // Use JSONPath mapping
        return this.applyJsonPathMapping(data, mapping.expression);
      } else if (mapping.type === 'transform') {
        // Custom transformation
        return this.applyCustomTransform(data, mapping.transforms);
      }

      // Default: extract specific fields
      return this.extractFields(data, mapping.fields);
    } catch (error) {
      console.error('Data mapping error:', error);
      return data; // Return original data if mapping fails
    }
  }

  /**
   * Extract specific fields from data
   */
  private extractFields(data: any, fields: any): any {
    if (!fields || !data) return data;

    if (Array.isArray(data)) {
      return data.map(item => this.extractFieldsFromObject(item, fields));
    } else {
      return this.extractFieldsFromObject(data, fields);
    }
  }

  private extractFieldsFromObject(obj: any, fields: any): any {
    const result: any = {};
    
    for (const [key, path] of Object.entries(fields)) {
      result[key] = this.getNestedValue(obj, path as string);
    }
    
    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Apply JQ-style mapping (placeholder - would need jq library)
   */
  private applyJqMapping(data: any, expression: string): any {
    // Placeholder for jq mapping
    console.warn('JQ mapping not implemented yet');
    return data;
  }

  /**
   * Apply JSONPath mapping (placeholder - would need jsonpath library)
   */
  private applyJsonPathMapping(data: any, expression: string): any {
    // Placeholder for JSONPath mapping
    console.warn('JSONPath mapping not implemented yet');
    return data;
  }

  /**
   * Apply custom transformations
   */
  private applyCustomTransform(data: any, transforms: any[]): any {
    let result = data;
    
    for (const transform of transforms) {
      switch (transform.type) {
        case 'filter':
          if (Array.isArray(result)) {
            result = result.filter(item => this.evaluateCondition(item, transform.condition));
          }
          break;
        case 'map':
          if (Array.isArray(result)) {
            result = result.map(item => this.applyMapping(item, transform.mapping));
          }
          break;
        case 'sort':
          if (Array.isArray(result)) {
            result = result.sort((a, b) => this.compareValues(a, b, transform.field, transform.order));
          }
          break;
        case 'limit':
          if (Array.isArray(result)) {
            result = result.slice(0, transform.count);
          }
          break;
      }
    }
    
    return result;
  }

  private evaluateCondition(item: any, condition: any): boolean {
    // Simple condition evaluation
    const value = this.getNestedValue(item, condition.field);
    switch (condition.operator) {
      case 'equals': return value === condition.value;
      case 'not_equals': return value !== condition.value;
      case 'contains': return String(value).includes(condition.value);
      case 'greater_than': return Number(value) > Number(condition.value);
      case 'less_than': return Number(value) < Number(condition.value);
      default: return true;
    }
  }

  private applyMapping(item: any, mapping: any): any {
    const result: any = {};
    for (const [key, path] of Object.entries(mapping)) {
      result[key] = this.getNestedValue(item, path as string);
    }
    return result;
  }

  private compareValues(a: any, b: any, field: string, order: 'asc' | 'desc' = 'asc'): number {
    const aVal = this.getNestedValue(a, field);
    const bVal = this.getNestedValue(b, field);
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return order === 'desc' ? -comparison : comparison;
  }

  /**
   * Substitute parameters in query string
   */
  private substituteParameters(query: string, parameters: any): string {
    let result = query;
    
    for (const [key, value] of Object.entries(parameters || {})) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    return result;
  }

  /**
   * Get authentication headers for external system
   */
  private getAuthHeaders(system: ExternalSystem): Record<string, string> {
    // Reuse logic from ExternalApiService
    return (this.externalApiService as any).getAuthHeaders(system);
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cacheKey: string, refreshInterval: number): boolean {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    
    const age = Date.now() - cached.timestamp;
    return age < (refreshInterval * 1000);
  }

  /**
   * Log query execution
   */
  private async logExecution(
    queryId: number, 
    userId: number | undefined, 
    status: string, 
    resultData: any, 
    executionTime: number, 
    recordCount: number, 
    error?: string
  ): Promise<void> {
    try {
      await storage.logQueryExecution({
        queryId,
        executedBy: userId || null,
        status,
        resultData,
        executionTime,
        recordCount,
        error,
        completedAt: new Date()
      });
    } catch (logError) {
      console.error('Failed to log query execution:', logError);
    }
  }

  /**
   * Apply data aggregations to query results
   */
  private applyAggregations(data: any, aggregations: any): any {
    if (!aggregations) return data;

    // Handle both array and non-array data
    let dataArray: any[] = [];
    if (Array.isArray(data)) {
      dataArray = data;
    } else if (data?.aggregated_data) {
      // Already aggregated data
      return data;
    } else if (data?.results && Array.isArray(data.results)) {
      dataArray = data.results;
    } else if (data?.issues && Array.isArray(data.issues)) {
      // Jira-specific
      dataArray = data.issues;
    } else {
      // Single object to array
      dataArray = [data];
    }

    if (dataArray.length === 0) return data;

    const { 
      groupBy = [], 
      metrics = [], 
      filters = [], 
      sort = [],
      limit 
    } = aggregations;

    let processedData = [...dataArray];

    // Apply filters first
    if (filters.length > 0) {
      processedData = this.applyDataFilters(processedData, filters);
    }

    // Apply grouping and aggregation
    if (groupBy.length > 0) {
      processedData = this.performDataGrouping(processedData, groupBy, metrics);
    } else if (metrics.length > 0) {
      // Global aggregations without grouping
      processedData = [this.calculateDataMetrics(processedData, metrics)];
    }

    // Apply sorting
    if (sort.length > 0) {
      processedData = this.applyDataSorting(processedData, sort);
    }

    // Apply limit
    if (limit && limit > 0) {
      processedData = processedData.slice(0, limit);
    }

    return {
      aggregated_data: processedData,
      total_records: dataArray.length,
      processed_records: processedData.length,
      aggregation_summary: {
        grouped_by: groupBy,
        metrics_calculated: metrics.map((m: any) => `${m.function}(${m.field})`),
        filters_applied: filters.length,
        sorted_by: sort,
        limited_to: limit
      }
    };
  }

  /**
   * Apply filters to data for aggregation
   */
  private applyDataFilters(data: any[], filters: any[]): any[] {
    return data.filter(row => {
      return filters.every(filter => {
        const { field, operator, value } = filter;
        const fieldValue = this.getNestedValue(row, field);
        
        switch (operator) {
          case 'equals': case '=': return fieldValue == value;
          case 'not_equals': case '!=': return fieldValue != value;
          case 'greater_than': case '>': return Number(fieldValue) > Number(value);
          case 'less_than': case '<': return Number(fieldValue) < Number(value);
          case 'greater_equal': case '>=': return Number(fieldValue) >= Number(value);
          case 'less_equal': case '<=': return Number(fieldValue) <= Number(value);
          case 'contains': return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
          case 'not_contains': return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
          case 'starts_with': return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase());
          case 'ends_with': return String(fieldValue).toLowerCase().endsWith(String(value).toLowerCase());
          case 'in': return Array.isArray(value) ? value.includes(fieldValue) : false;
          case 'not_in': return Array.isArray(value) ? !value.includes(fieldValue) : true;
          case 'is_null': return fieldValue == null || fieldValue == undefined;
          case 'is_not_null': return fieldValue != null && fieldValue != undefined;
          default: return true;
        }
      });
    });
  }

  /**
   * Perform grouping and calculate metrics for aggregation
   */
  private performDataGrouping(data: any[], groupBy: string[], metrics: any[]): any[] {
    const groups = new Map<string, any[]>();
    
    data.forEach(row => {
      const groupKey = groupBy.map(field => String(this.getNestedValue(row, field) || '')).join('|');
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(row);
    });

    const result: any[] = [];
    groups.forEach((groupData, groupKey) => {
      const groupValues = groupKey.split('|');
      const groupRecord: any = {};
      
      // Add group fields
      groupBy.forEach((field, index) => {
        groupRecord[field] = groupValues[index];
      });
      
      // Calculate metrics
      const metricsResult = this.calculateDataMetrics(groupData, metrics);
      Object.assign(groupRecord, metricsResult);
      
      // Add group metadata
      groupRecord._group_size = groupData.length;
      
      result.push(groupRecord);
    });

    return result;
  }

  /**
   * Calculate metrics for aggregation
   */
  private calculateDataMetrics(data: any[], metrics: any[]): any {
    const result: any = {};

    metrics.forEach(metric => {
      const { field, function: func, alias } = metric;
      const outputField = alias || `${func}_${field}`;
      
      try {
        switch (func.toLowerCase()) {
          case 'count':
            result[outputField] = data.length;
            break;
          case 'count_distinct':
            const distinctValues = new Set(data.map(row => this.getNestedValue(row, field)));
            result[outputField] = distinctValues.size;
            break;
          case 'sum':
            result[outputField] = data.reduce((sum, row) => {
              const value = Number(this.getNestedValue(row, field)) || 0;
              return sum + value;
            }, 0);
            break;
          case 'avg': case 'average':
            const values = data.map(row => Number(this.getNestedValue(row, field))).filter(v => !isNaN(v));
            result[outputField] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            break;
          case 'min':
            const minValues = data.map(row => Number(this.getNestedValue(row, field))).filter(v => !isNaN(v));
            result[outputField] = minValues.length > 0 ? Math.min(...minValues) : null;
            break;
          case 'max':
            const maxValues = data.map(row => Number(this.getNestedValue(row, field))).filter(v => !isNaN(v));
            result[outputField] = maxValues.length > 0 ? Math.max(...maxValues) : null;
            break;
          case 'median':
            const sortedValues = data.map(row => Number(this.getNestedValue(row, field)))
              .filter(v => !isNaN(v)).sort((a, b) => a - b);
            if (sortedValues.length === 0) {
              result[outputField] = null;
            } else if (sortedValues.length % 2 === 0) {
              const mid = sortedValues.length / 2;
              result[outputField] = (sortedValues[mid - 1] + sortedValues[mid]) / 2;
            } else {
              result[outputField] = sortedValues[Math.floor(sortedValues.length / 2)];
            }
            break;
          case 'concat':
            const separator = metric.separator || ', ';
            result[outputField] = data.map(row => this.getNestedValue(row, field))
              .filter(v => v != null).join(separator);
            break;
          default:
            console.warn(`Unknown aggregation function: ${func}`);
            result[outputField] = null;
        }
      } catch (error) {
        console.error(`Error calculating ${func} for field ${field}:`, error);
        result[outputField] = null;
      }
    });

    return result;
  }

  /**
   * Apply sorting for aggregation
   */
  private applyDataSorting(data: any[], sortConfig: any[]): any[] {
    return data.sort((a, b) => {
      for (const { field, direction } of sortConfig) {
        const aVal = this.getNestedValue(a, field);
        const bVal = this.getNestedValue(b, field);
        
        if (aVal == null && bVal == null) continue;
        if (aVal == null) return direction === 'desc' ? 1 : -1;
        if (bVal == null) return direction === 'desc' ? -1 : 1;
        
        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        if (comparison !== 0) {
          return direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  /**
   * Clear cache for a specific query
   */
  clearCache(queryId: number): void {
    const cacheKey = `query_${queryId}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }
} 