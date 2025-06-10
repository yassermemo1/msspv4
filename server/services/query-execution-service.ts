import { ExternalSystem } from '../types/external-systems.js';
import { db } from '../db.js';
import { externalSystems } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import {
  MethodConfig,
  TransformConfig,
  AuthConfig,
  QueryExecutionRequest,
  QueryExecutionResult,
  QueryExecutionError,
  ValidationError,
  TimeoutError
} from '../types/query-execution.js';
import {
  MethodConfig,
  TransformConfig,
  AuthConfig,
  QueryExecutionRequest,
  QueryExecutionResult,
  QueryExecutionError,
  ValidationError,
  TimeoutError
} from '../types/query-execution.js';

interface QueryRequest extends QueryExecutionRequest {
  query: string;
  format?: string; // Response format preference
  transformations?: string[]; // Data transformation steps
}

interface QueryResponse extends QueryExecutionResult {
  metadata: {
    executionTime: number;
    recordCount: number;
    systemName: string;
    method: string;
    transformationsApplied?: string[];
    cacheHit?: boolean;
    retryCount?: number;
    timestamp: string;
  };
}

interface SystemConfig {
  system: ExternalSystem;
  queryMethods: Record<string, MethodConfig>;
  authHeaders: Record<string, string>;
  connectionSettings: ConnectionSettings;
}

interface ConnectionSettings {
  timeout?: number;
  retries?: number;
  ssl?: boolean;
  poolSize?: number;
  keepAlive?: boolean;
  compression?: boolean;
}

export class DynamicQueryExecutionService {
  private static instance: DynamicQueryExecutionService;
  private systemConfigs: Map<number, SystemConfig> = new Map();

  static getInstance(): DynamicQueryExecutionService {
    if (!DynamicQueryExecutionService.instance) {
      DynamicQueryExecutionService.instance = new DynamicQueryExecutionService();
    }
    return DynamicQueryExecutionService.instance;
  }

  /**
   * Execute a query against any configured external system
   */
  async executeQuery(queryRequest: QueryRequest): Promise<QueryResponse> {
    const startTime = Date.now();
    
    try {
      // Get system configuration
      const systemConfig = await this.getSystemConfig(queryRequest.systemId);
      
      // Validate query method
      const method = this.validateAndGetMethod(queryRequest, systemConfig);
      
      // Execute the query using the system's configuration
      const result = await this.performQuery(queryRequest, systemConfig, method);
      
      // Apply transformations if specified
      const transformedResult = await this.applyTransformations(
        result, 
        queryRequest.transformations || [],
        systemConfig
      );

      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        data: transformedResult,
        metadata: {
          executionTime,
          recordCount: this.getRecordCount(transformedResult),
          systemName: systemConfig.system.displayName,
          method: method.name,
          transformationsApplied: queryRequest.transformations
        }
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        metadata: {
          executionTime,
          recordCount: 0,
          systemName: 'Unknown',
          method: 'Unknown'
        },
        error: {
          code: error.code || 'QUERY_EXECUTION_ERROR',
          message: error.message || 'Query execution failed',
          details: {
            systemId: queryRequest.systemId,
            originalError: error
          }
        }
      };
    }
  }

  /**
   * Get and cache system configuration
   */
  private async getSystemConfig(systemId: number): Promise<SystemConfig> {
    // Check cache first
    if (this.systemConfigs.has(systemId)) {
      return this.systemConfigs.get(systemId)!;
    }

    // Fetch from database
    const systems = await db
      .select()
      .from(externalSystems)
      .where(eq(externalSystems.id, systemId));

    if (systems.length === 0) {
      throw new Error(`System with ID ${systemId} not found`);
    }

    const system = systems[0];
    
    if (!system.isActive) {
      throw new Error(`System ${system.displayName} is not active`);
    }

    // Build configuration
    const config: SystemConfig = {
      system,
      queryMethods: system.queryMethods as Record<string, any> || {},
      authHeaders: this.buildAuthHeaders(system),
      connectionSettings: system.connectionConfig as any || {}
    };

    // Cache the configuration
    this.systemConfigs.set(systemId, config);
    
    return config;
  }

  /**
   * Build authentication headers based on system configuration
   */
  private buildAuthHeaders(system: ExternalSystem): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'MSSP-Integration-Engine/1.0'
    };

    const authConfig = system.authConfig as any || {};

    switch (system.authType) {
      case 'basic':
        if (authConfig.username && authConfig.password) {
          const credentials = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
        
      case 'bearer':
        if (authConfig.token) {
          headers['Authorization'] = `Bearer ${authConfig.token}`;
        }
        break;
        
      case 'api_key':
        if (authConfig.key && authConfig.header) {
          headers[authConfig.header] = authConfig.key;
        } else if (authConfig.key) {
          headers['X-API-Key'] = authConfig.key;
        }
        break;
        
      case 'oauth':
        if (authConfig.accessToken) {
          headers['Authorization'] = `Bearer ${authConfig.accessToken}`;
        }
        break;
        
      case 'custom':
        // Apply custom headers from authConfig
        if (authConfig.customHeaders) {
          Object.assign(headers, authConfig.customHeaders);
        }
        break;
        
      case 'none':
      default:
        // No authentication required
        break;
    }

    // Add any additional headers from connection config
    const connectionConfig = system.connectionConfig as any;
    if (connectionConfig?.additionalHeaders) {
      Object.assign(headers, connectionConfig.additionalHeaders);
    }

    return headers;
  }

  /**
   * Validate and get the query method to use
   */
  private validateAndGetMethod(queryRequest: QueryRequest, systemConfig: SystemConfig): { name: string; config: MethodConfig } {
    const availableMethods = systemConfig.queryMethods;
    
    if (!availableMethods || Object.keys(availableMethods).length === 0) {
      throw new ValidationError('queryMethods', 'empty', 'non-empty object');
    }

    // Use specified method or default to first available method
    const methodName = queryRequest.methodName || Object.keys(availableMethods)[0];
    const method = availableMethods[methodName];
    
    if (!method) {
      throw new ValidationError('methodName', methodName, `one of: ${Object.keys(availableMethods).join(', ')}`);
    }

    return { name: methodName, config: method };
  }

  /**
   * Perform the actual query execution
   */
  private async performQuery(
    queryRequest: QueryRequest, 
    systemConfig: SystemConfig, 
    method: { name: string; config: MethodConfig }
  ): Promise<unknown> {
    const { system } = systemConfig;
    const methodConfig = method.config;
    const timeout = queryRequest.timeout || methodConfig.timeout || 30000;

    // Build the request based on method type
    switch (methodConfig.type) {
      case 'http_get':
        return this.executeHttpGet(queryRequest, systemConfig, methodConfig, timeout);
        
      case 'http_post':
        return this.executeHttpPost(queryRequest, systemConfig, methodConfig, timeout);
        
      case 'graphql':
        return this.executeGraphQL(queryRequest, systemConfig, methodConfig, timeout);
        
      case 'rest':
        return this.executeRest(queryRequest, systemConfig, methodConfig, timeout);
        
      case 'sql':
        return this.executeSQL(queryRequest, systemConfig, methodConfig, timeout);
        
      case 'custom':
        return this.executeCustom(queryRequest, systemConfig, methodConfig, timeout);
        
      default:
        throw new Error(`Unsupported query method type: ${methodConfig.type}`);
    }
  }

  /**
   * Execute HTTP GET request
   */
  private async executeHttpGet(
    queryRequest: QueryRequest,
    systemConfig: SystemConfig,
    methodConfig: MethodConfig,
    timeout: number
  ): Promise<unknown> {
    const { system, authHeaders } = systemConfig;
    
    // Build URL with query parameters
    const url = new URL(methodConfig.endpoint || '', system.baseUrl);
    
    // Add query parameters
    if (queryRequest.parameters) {
      Object.entries(queryRequest.parameters).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    
    // Add the main query if configured
    if (methodConfig.queryParam && queryRequest.query) {
      url.searchParams.append(methodConfig.queryParam, queryRequest.query);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: authHeaders,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return this.extractDataFromResponse(data, methodConfig);
      
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Execute HTTP POST request
   */
  private async executeHttpPost(
    queryRequest: QueryRequest,
    systemConfig: SystemConfig,
    methodConfig: MethodConfig,
    timeout: number
  ): Promise<unknown> {
    const { system, authHeaders } = systemConfig;
    
    const url = new URL(methodConfig.endpoint || '', system.baseUrl);
    
    // Build payload
    const payload = this.buildPostPayload(queryRequest, methodConfig);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': methodConfig.contentType || 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return this.extractDataFromResponse(data, methodConfig);
      
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Execute GraphQL query
   */
  private async executeGraphQL(
    queryRequest: QueryRequest,
    systemConfig: SystemConfig,
    methodConfig: MethodConfig,
    timeout: number
  ): Promise<unknown> {
    const { system, authHeaders } = systemConfig;
    
    const url = new URL(methodConfig.endpoint || '/graphql', system.baseUrl);
    
    const payload = {
      query: queryRequest.query,
      variables: queryRequest.parameters || {}
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(data.errors)}`);
      }

      return data.data;
      
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Execute REST API call
   */
  private async executeRest(
    queryRequest: QueryRequest,
    systemConfig: SystemConfig,
    methodConfig: any,
    timeout: number
  ): Promise<any> {
    const httpMethod = methodConfig.httpMethod || 'GET';
    
    if (httpMethod.toLowerCase() === 'get') {
      return this.executeHttpGet(queryRequest, systemConfig, methodConfig, timeout);
    } else {
      return this.executeHttpPost(queryRequest, systemConfig, methodConfig, timeout);
    }
  }

  /**
   * Execute SQL query (for database systems)
   */
  private async executeSQL(
    queryRequest: QueryRequest,
    systemConfig: SystemConfig,
    methodConfig: any,
    timeout: number
  ): Promise<any> {
    // This would require a database-specific driver
    // For now, we'll throw an error suggesting configuration
    throw new Error('SQL query execution requires database-specific configuration. Please configure the system with appropriate database driver settings.');
  }

  /**
   * Execute custom query method
   */
  private async executeCustom(
    queryRequest: QueryRequest,
    systemConfig: SystemConfig,
    methodConfig: any,
    timeout: number
  ): Promise<any> {
    // Custom execution logic based on methodConfig.customLogic
    if (methodConfig.customEndpoint) {
      // Use custom endpoint configuration
      return this.executeHttpPost(queryRequest, systemConfig, {
        ...methodConfig,
        endpoint: methodConfig.customEndpoint
      }, timeout);
    }
    
    throw new Error('Custom query method requires specific configuration in methodConfig.customLogic');
  }

  /**
   * Build POST payload based on method configuration
   */
  private buildPostPayload(queryRequest: QueryRequest, methodConfig: MethodConfig): unknown {
    const payload: any = {};
    
    // Add the main query
    if (methodConfig.queryField) {
      payload[methodConfig.queryField] = queryRequest.query;
    } else {
      payload.query = queryRequest.query;
    }
    
    // Add parameters
    if (queryRequest.parameters) {
      if (methodConfig.parametersField) {
        payload[methodConfig.parametersField] = queryRequest.parameters;
      } else {
        Object.assign(payload, queryRequest.parameters);
      }
    }
    
    // Add any default payload from method config
    if (methodConfig.defaultPayload) {
      Object.assign(payload, methodConfig.defaultPayload);
    }
    
    return payload;
  }

  /**
   * Extract data from response based on method configuration
   */
  private extractDataFromResponse(data: unknown, methodConfig: MethodConfig): unknown {
    if (methodConfig.dataPath) {
      // Navigate to the data using the specified path
      return this.getNestedValue(data, methodConfig.dataPath);
    }
    
    return data;
  }

  /**
   * Apply data transformations
   */
  private async applyTransformations(
    data: any,
    transformations: string[],
    systemConfig: SystemConfig
  ): Promise<any> {
    let result = data;
    
    const transformConfig = systemConfig.system.dataTransforms as any || {};
    
    for (const transformName of transformations) {
      const transform = transformConfig[transformName];
      if (transform) {
        result = this.applyTransformation(result, transform);
      }
    }
    
    return result;
  }

  /**
   * Apply a single transformation
   */
  private applyTransformation(data: any, transform: any): any {
    switch (transform.type) {
      case 'filter':
        return this.filterData(data, transform.config);
        
      case 'map':
        return this.mapData(data, transform.config);
        
      case 'aggregate':
        return this.aggregateData(data, transform.config);
        
      case 'sort':
        return this.sortData(data, transform.config);
        
      default:
        return data;
    }
  }

  /**
   * Filter data based on criteria
   */
  private filterData(data: any, config: any): any {
    if (!Array.isArray(data)) return data;
    
    return data.filter(item => {
      return config.criteria.every((criterion: any) => {
        const value = this.getNestedValue(item, criterion.field);
        return this.evaluateCondition(value, criterion.operator, criterion.value);
      });
    });
  }

  /**
   * Map/transform data fields
   */
  private mapData(data: any, config: any): any {
    if (!Array.isArray(data)) return data;
    
    return data.map(item => {
      const mapped: any = {};
      Object.entries(config.fieldMappings).forEach(([newField, oldField]) => {
        mapped[newField] = this.getNestedValue(item, oldField as string);
      });
      return mapped;
    });
  }

  /**
   * Aggregate data
   */
  private aggregateData(data: any, config: any): any {
    if (!Array.isArray(data)) return data;
    
    // Simple aggregation implementation
    const result: any = {};
    
    if (config.count) {
      result.count = data.length;
    }
    
    if (config.sum && config.sum.length > 0) {
      config.sum.forEach((field: string) => {
        result[`${field}_sum`] = data.reduce((sum, item) => {
          return sum + (Number(this.getNestedValue(item, field)) || 0);
        }, 0);
      });
    }
    
    if (config.avg && config.avg.length > 0) {
      config.avg.forEach((field: string) => {
        const sum = data.reduce((sum, item) => {
          return sum + (Number(this.getNestedValue(item, field)) || 0);
        }, 0);
        result[`${field}_avg`] = data.length > 0 ? sum / data.length : 0;
      });
    }
    
    return result;
  }

  /**
   * Sort data
   */
  private sortData(data: any, config: any): any {
    if (!Array.isArray(data)) return data;
    
    return data.sort((a, b) => {
      for (const sort of config.fields) {
        const aVal = this.getNestedValue(a, sort.field);
        const bVal = this.getNestedValue(b, sort.field);
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;
        
        if (sort.direction === 'desc') comparison *= -1;
        
        if (comparison !== 0) return comparison;
      }
      return 0;
    });
  }

  /**
   * Evaluate a condition for filtering
   */
  private evaluateCondition(value: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
      case '=':
        return value == expected;
      case 'not_equals':
      case '!=':
        return value != expected;
      case 'greater_than':
      case '>':
        return Number(value) > Number(expected);
      case 'less_than':
      case '<':
        return Number(value) < Number(expected);
      case 'contains':
        return String(value).toLowerCase().includes(String(expected).toLowerCase());
      case 'starts_with':
        return String(value).toLowerCase().startsWith(String(expected).toLowerCase());
      case 'ends_with':
        return String(value).toLowerCase().endsWith(String(expected).toLowerCase());
      case 'in':
        return Array.isArray(expected) ? expected.includes(value) : false;
      default:
        return true;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Get record count from result data
   */
  private getRecordCount(data: any): number {
    if (Array.isArray(data)) {
      return data.length;
    }
    if (data && typeof data === 'object') {
      if (data.count !== undefined) return data.count;
      if (data.total !== undefined) return data.total;
      if (data.results && Array.isArray(data.results)) return data.results.length;
    }
    return 1;
  }

  /**
   * Test system connection
   */
  async testConnection(systemId: number): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const systemConfig = await this.getSystemConfig(systemId);
      const healthConfig = systemConfig.system.healthCheckConfig as any;
      
      if (!healthConfig || !healthConfig.endpoint) {
        return {
          success: false,
          message: 'No health check endpoint configured for this system'
        };
      }
      
      const url = new URL(healthConfig.endpoint, systemConfig.system.baseUrl);
      const response = await fetch(url.toString(), {
        method: healthConfig.method || 'GET',
        headers: systemConfig.authHeaders,
        signal: AbortSignal.timeout(healthConfig.timeout || 10000)
      });
      
      if (response.ok) {
        return {
          success: true,
          message: `Successfully connected to ${systemConfig.system.displayName}`,
          details: {
            status: response.status,
            statusText: response.statusText
          }
        };
      } else {
        return {
          success: false,
          message: `Connection failed: ${response.status} ${response.statusText}`,
          details: {
            status: response.status,
            statusText: response.statusText
          }
        };
      }
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Connection test failed',
        details: error
      };
    }
  }

  /**
   * Clear system configuration cache
   */
  clearCache(systemId?: number): void {
    if (systemId) {
      this.systemConfigs.delete(systemId);
    } else {
      this.systemConfigs.clear();
    }
  }
} 