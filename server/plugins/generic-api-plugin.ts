import { QueryPlugin, registerPlugin, PluginInstance, PluginConfig } from './plugin-manager';
import fetch, { RequestInit } from 'node-fetch';
import https from 'https';

export interface GenericAPIQuery {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  endpoint: string;
  headers?: Record<string, any>;
  body?: any;
  queryParams?: Record<string, any>;
  timeout?: number;
  verifySsl?: boolean;
}

// Helper to parse query from string or object
function parseQuery(query: string | GenericAPIQuery): GenericAPIQuery {
  if (typeof query === 'string') {
    try {
      return JSON.parse(query);
    } catch (e) {
      throw new Error('Query must be a valid JSON object with method, endpoint, and optional headers/body');
    }
  }
  return query;
}

// Helper to build full URL with query parameters
function buildUrl(baseUrl: string, endpoint: string, queryParams?: Record<string, any>): string {
  const base = baseUrl.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${base}${path}`;
  
  if (queryParams && Object.keys(queryParams).length > 0) {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    url += `?${params.toString()}`;
  }
  
  return url;
}

// MDR API Configuration
const mdrApiConfig: PluginConfig = {
  instances: [
    {
      id: 'mdr-main',
      name: 'MDR Portal API',
      baseUrl: 'https://ry1-pub-mdr-front.sic.sitco.sa/site-mdr-external/api',
      authType: 'api_key',
      authConfig: {
        key: 'cc658af2-dafb-4481-8961-81ce813e8a60',
        username: 'MSSP',
        header: 'mdr-api-key'
      },
      isActive: true,
      tags: ['mdr', 'security', 'tenant-visibility'],
      sslConfig: {
        rejectUnauthorized: false,
        allowSelfSigned: true,
        timeout: 30000
      }
    }
  ],
  defaultRefreshInterval: 300,
  rateLimiting: {
    requestsPerMinute: 60,
    burstSize: 10
  }
};

const genericApiPlugin: QueryPlugin = {
  systemName: 'generic-api',
  config: mdrApiConfig,
  
  async executeQuery(query: string, method: string | undefined, instanceId: string, opts?: Record<string, any>) {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new Error(`Generic API instance '${instanceId}' not found`);
    }
    
    if (!instance.isActive) {
      throw new Error(`Generic API instance '${instanceId}' is not active`);
    }

    // Parse the query
    let queryObj = parseQuery(query);

    // Handle chained queries if configured
    if (opts?.chainedQuery?.enabled) {
      console.log('🔗 Processing chained query...');
      
      // First, execute the lookup query
      const lookupQuery = parseQuery(opts.chainedQuery.lookupQuery);
      const lookupUrl = buildUrl(instance.baseUrl, lookupQuery.endpoint, lookupQuery.queryParams);
      
      console.log(`🔍 Lookup query: ${lookupQuery.method} ${lookupUrl}`);
      
      // Build lookup headers
      const lookupHeaders: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...lookupQuery.headers
      };
      
      // Add authentication headers for lookup
      if (instance.authType === 'api_key' && instance.authConfig) {
        const mdrHeader: Record<string, string> = {
          [instance.authConfig.header || 'api-key']: instance.authConfig.key || '',
          'mdr-api-username': instance.authConfig.username || '',
          'accept': 'application/json'
        };
        Object.entries(mdrHeader).forEach(([key, value]) => {
          lookupHeaders[key] = value;
        });
      }
      
      const lookupOptions: RequestInit = {
        method: lookupQuery.method,
        headers: lookupHeaders,
        timeout: 30000
      };
      
      if (lookupQuery.body && ['POST', 'PUT', 'PATCH'].includes(lookupQuery.method)) {
        lookupOptions.body = JSON.stringify(lookupQuery.body);
      }
      
      // Always disable SSL verification for MDR API
      lookupOptions.agent = new https.Agent({ rejectUnauthorized: false });
      
      try {
        const lookupRes = await fetch(lookupUrl, lookupOptions);
        const lookupData = await lookupRes.json();
        
        console.log('🔍 Lookup response:', JSON.stringify(lookupData, null, 2).substring(0, 500));
        
        // Extract the value from lookup based on clientShortName
        const clientShortName = opts.parameters?.clientShortName?.value || opts.context?.clientShortName;
        
        if (clientShortName && lookupData.response && Array.isArray(lookupData.response)) {
          const tenant = lookupData.response.find((t: any) => 
            t.shortName === clientShortName || 
            t.name === clientShortName
          );
          
          if (tenant && tenant[opts.chainedQuery.lookupField]) {
            const lookupValue = tenant[opts.chainedQuery.lookupField];
            console.log(`✅ Found tenant ID ${lookupValue} for client ${clientShortName}`);
            
            // Update the main query with the looked up value
            if (queryObj.body && opts.chainedQuery.targetField) {
              // Navigate to the target field and update it
              const updateNestedField = (obj: any, path: string, value: any) => {
                const keys = path.split('.');
                let current = obj;
                
                for (let i = 0; i < keys.length - 1; i++) {
                  if (!current[keys[i]]) current[keys[i]] = {};
                  current = current[keys[i]];
                }
                
                // Handle array values
                if (Array.isArray(current[keys[keys.length - 1]])) {
                  current[keys[keys.length - 1]] = [value];
                } else {
                  current[keys[keys.length - 1]] = value;
                }
              };
              
              // For the specific case of tenantId in command
              if (opts.chainedQuery.targetField === 'tenantId' && 
                  queryObj.body.command && 
                  Array.isArray(queryObj.body.command.tenantId)) {
                queryObj.body.command.tenantId = [lookupValue];
              } else {
                updateNestedField(queryObj.body, opts.chainedQuery.targetField, lookupValue);
              }
              
              console.log('📝 Updated query body:', JSON.stringify(queryObj.body, null, 2));
            }
          } else {
            console.warn(`⚠️ No tenant found for client ${clientShortName}`);
          }
        }
      } catch (error) {
        console.error('❌ Lookup query failed:', error);
        // Continue with original query even if lookup fails
      }
    }
    
    // Build the full URL
    const url = buildUrl(instance.baseUrl, queryObj.endpoint, queryObj.queryParams);
    
    // Build headers
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...queryObj.headers
    };
    
    // Add instance-specific authentication headers
    if (instance.authType === 'api_key' && instance.authConfig) {
      // For MDR API style authentication
      const mdrHeader: Record<string, string> = {
        [instance.authConfig.header || 'api-key']: instance.authConfig.key || '',
        'mdr-api-username': instance.authConfig.username || '',
        'accept': 'application/json'
      };
      
      // Merge MDR headers
      Object.entries(mdrHeader).forEach(([key, value]) => {
        headers[key] = value;
      });
    } else if (instance.authType === 'bearer' && instance.authConfig?.token) {
      headers['Authorization'] = `Bearer ${instance.authConfig.token}`;
    } else if (instance.authType === 'basic' && instance.authConfig) {
      const auth = Buffer.from(`${instance.authConfig.username}:${instance.authConfig.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: queryObj.method,
      headers,
      timeout: queryObj.timeout || instance.sslConfig?.timeout || 30000
    };
    
    // Add body for non-GET requests
    if (queryObj.body && ['POST', 'PUT', 'PATCH'].includes(queryObj.method)) {
      fetchOptions.body = typeof queryObj.body === 'string' 
        ? queryObj.body 
        : JSON.stringify(queryObj.body);
    }
    
    // Handle SSL verification
    const verifySsl = queryObj.verifySsl !== undefined 
      ? queryObj.verifySsl 
      : instance.sslConfig?.rejectUnauthorized !== false;
    
    if (!verifySsl) {
      fetchOptions.agent = new https.Agent({
        rejectUnauthorized: false
      });
    }

    console.log(`🌐 Generic API Request: ${queryObj.method} ${url}`);
    console.log(`🔑 Headers:`, JSON.stringify(headers, null, 2));
    if (queryObj.body) {
      console.log(`📦 Body:`, JSON.stringify(queryObj.body, null, 2));
    }
    
    try {
      const res = await fetch(url, fetchOptions);
      
      const contentType = res.headers.get('content-type') || '';
      const responseText = await res.text();
      
      console.log(`📊 Response Status: ${res.status} ${res.statusText}`);
      console.log(`📄 Content-Type: ${contentType}`);
      
      if (!res.ok) {
        console.error(`❌ API Error ${res.status}: ${responseText}`);
        throw new Error(`API Error ${res.status}: ${res.statusText} - ${responseText}`);
      }
      
      // Try to parse as JSON, fallback to text
      try {
        const data = JSON.parse(responseText);
        console.log(`✅ API Response:`, JSON.stringify(data, null, 2).substring(0, 500) + '...');
        return {
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          data,
          timestamp: new Date().toISOString()
        };
      } catch (e) {
        // If not JSON, return as text
        return {
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          data: responseText,
          timestamp: new Date().toISOString()
        };
      }
      
    } catch (error) {
      console.error(`❌ Generic API Error:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  },
  
  getInstances(): PluginInstance[] {
    return this.config.instances;
  },
  
  getInstance(instanceId: string): PluginInstance | undefined {
    return this.config.instances.find(instance => instance.id === instanceId);
  },
  
  defaultQueries: [
    {
      id: 'mdr-tenant-basic-data',
      method: 'POST',
      path: JSON.stringify({
        method: 'POST',
        endpoint: '/tenant-visibility/basic-data',
        body: {
          paginationAndSorting: {
            currentPage: 1,
            pageSize: 10,
            sortProperty: 'id',
            sortDirection: 'ASC'
          },
          command: {
            tenantId: [60]
          }
        }
      }),
      description: 'MDR Tenant Basic Data'
    },
    {
      id: 'health-check',
      method: 'GET',
      path: JSON.stringify({
        method: 'GET',
        endpoint: '/health'
      }),
      description: 'API Health Check'
    }
  ]
};

registerPlugin(genericApiPlugin);

// Export for external use
export default genericApiPlugin; 