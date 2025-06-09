import { ClientExternalMapping, ExternalSystem } from "@shared/schema";

// Note: Using Node.js 18+ built-in fetch API
// No need for node-fetch or custom HTTPS agents

// Interface for external API response
export interface ExternalApiResponse {
  status: 'success' | 'error';
  data?: any;
  error_message?: string;
  link?: string;
}

// Interface for aggregated response
export interface AggregatedDataResponse {
  last_updated: string;
  data: Record<string, ExternalApiResponse>;
}

// External API Service Class
export class ExternalApiService {
  private static instance: ExternalApiService;
  
  private constructor() {}
  
  public static getInstance(): ExternalApiService {
    if (!ExternalApiService.instance) {
      ExternalApiService.instance = new ExternalApiService();
    }
    return ExternalApiService.instance;
  }

  /**
   * Helper method to create fetch options with SSL bypass for internal systems
   */
  private getFetchOptions(headers: Record<string, string>, timeout: number = 10000) {
    const options: any = {
      headers,
      signal: AbortSignal.timeout(timeout)
    };

    // Note: Removed custom agent for now due to compatibility issues with Node.js fetch API
    // The built-in fetch in Node.js 18+ handles HTTPS automatically
    // If SSL certificate issues arise, they should be handled at the system level
    
    console.log('[DEBUG] getFetchOptions called - no agent function added');
    return options;
  }

  /**
   * Main method to aggregate data from all external systems for a client
   */
  async aggregateClientData(
    mappings: ClientExternalMapping[],
    systems: ExternalSystem[]
  ): Promise<AggregatedDataResponse> {
    const systemsMap = new Map(systems.map(s => [s.systemName, s]));
    
    // Create promises for all external API calls
    const apiPromises = mappings.map(mapping => 
      this.fetchExternalData(mapping, systemsMap.get(mapping.systemName))
    );

    // Execute all API calls in parallel
    const results = await Promise.allSettled(apiPromises);
    
    // Process results
    const aggregatedData: Record<string, ExternalApiResponse> = {};
    
    results.forEach((result, index) => {
      const mapping = mappings[index];
      const systemName = mapping.systemName;
      
      if (result.status === 'fulfilled') {
        aggregatedData[systemName] = result.value;
      } else {
        aggregatedData[systemName] = {
          status: 'error',
          error_message: result.reason?.message || 'Unknown error occurred'
        };
      }
    });

    return {
      last_updated: new Date().toISOString(),
      data: aggregatedData
    };
  }

  /**
   * Fetch data from a specific external system
   */
  private async fetchExternalData(
    mapping: ClientExternalMapping,
    system?: ExternalSystem
  ): Promise<ExternalApiResponse> {
    if (!system) {
      return {
        status: 'error',
        error_message: `System configuration not found for ${mapping.systemName}`
      };
    }

    try {
      switch (mapping.systemName.toLowerCase()) {
        case 'jira':
          return await this.fetchJiraData(mapping, system);
        case 'grafana':
          return await this.fetchGrafanaData(mapping, system);
        case 'servicenow':
          return await this.fetchServiceNowData(mapping, system);
        default:
          return await this.fetchGenericData(mapping, system);
      }
    } catch (error) {
      console.error(`Error fetching data from ${mapping.systemName}:`, error);
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Fetch data from Jira
   */
  private async fetchJiraData(
    mapping: ClientExternalMapping,
    system: ExternalSystem
  ): Promise<ExternalApiResponse> {
    try {
      // Get custom JQL from mapping metadata or use default
      const metadata = mapping.metadata as any;
      let jqlQuery: string;
      
      if (metadata?.customJql) {
        // Use custom JQL query provided in mapping
        jqlQuery = metadata.customJql;
      } else if (metadata?.defaultJql) {
        // Use default JQL with project substitution
        jqlQuery = metadata.defaultJql.replace('{projectKey}', mapping.externalIdentifier);
      } else {
        // Fallback to basic project query
        jqlQuery = `project = "${mapping.externalIdentifier}" AND status != "Done"`;
      }
      
      console.log(`Executing Jira JQL: ${jqlQuery}`);
      
      const encodedJql = encodeURIComponent(jqlQuery);
      const maxResults = metadata?.maxResults || 100;
      const fields = metadata?.fields || 'key,summary,status,assignee,priority,created,updated';
      
      // Use API v2 for broader compatibility with different Jira versions
      const url = `${system.baseUrl}/rest/api/2/search?jql=${encodedJql}&fields=${fields}&maxResults=${maxResults}`;
      
      const headers = this.getAuthHeaders(system);
      
      const response = await fetch(url, this.getFetchOptions(headers));

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jira API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // Process and format the response
      const issues = data.issues || [];
      const processedIssues = issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields?.summary || 'No summary',
        status: issue.fields?.status?.name || 'Unknown',
        assignee: issue.fields?.assignee?.displayName || 'Unassigned',
        assigneeEmail: issue.fields?.assignee?.emailAddress || null,
        priority: issue.fields?.priority?.name || 'Unknown',
        created: issue.fields?.created || null,
        updated: issue.fields?.updated || null,
        issueType: issue.fields?.issuetype?.name || 'Unknown'
      }));
      
      return {
        status: 'success',
        data: {
          total_issues: data.total || 0,
          returned_issues: issues.length,
          project_key: mapping.externalIdentifier,
          jql_query: jqlQuery,
          issues: processedIssues,
          // Summary stats
          open_tickets: issues.filter((i: any) => 
            !['Done', 'Closed', 'Resolved'].includes(i.fields?.status?.name)
          ).length,
          high_priority: issues.filter((i: any) => 
            ['High', 'Highest'].includes(i.fields?.priority?.name)
          ).length
        },
        link: `${system.baseUrl}/issues/?jql=${encodedJql}`
      };
    } catch (error) {
      console.error('Jira fetch error:', error);
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown Jira error occurred'
      };
    }
  }

  /**
   * Fetch data from Grafana
   */
  private async fetchGrafanaData(
    mapping: ClientExternalMapping,
    system: ExternalSystem
  ): Promise<ExternalApiResponse> {
    const url = `${system.baseUrl}/api/dashboards/uid/${mapping.externalIdentifier}`;
    
    const headers = this.getAuthHeaders(system);
    
    const response = await fetch(url, this.getFetchOptions(headers));

    if (!response.ok) {
      throw new Error(`Grafana API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract useful metrics from dashboard metadata
    const dashboard = data.dashboard;
    
    return {
      status: 'success',
      data: {
        dashboard_title: dashboard?.title || 'Unknown Dashboard',
        panel_count: dashboard?.panels?.length || 0,
        last_updated: data.meta?.updated || null
      },
      link: `${system.baseUrl}/d/${mapping.externalIdentifier}`
    };
  }

  /**
   * Fetch data from ServiceNow
   */
  private async fetchServiceNowData(
    mapping: ClientExternalMapping,
    system: ExternalSystem
  ): Promise<ExternalApiResponse> {
    // Example: Get incident count for a specific company/client
    const url = `${system.baseUrl}/api/now/table/incident?sysparm_query=company.name=${encodeURIComponent(mapping.externalIdentifier)}&sysparm_limit=1&sysparm_display_value=true`;
    
    const headers = this.getAuthHeaders(system);
    
    const response = await fetch(url, this.getFetchOptions(headers));

    if (!response.ok) {
      throw new Error(`ServiceNow API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      status: 'success',
      data: {
        open_incidents: data.result?.length || 0,
        company_name: mapping.externalIdentifier
      },
      link: `${system.baseUrl}/nav_to.do?uri=incident_list.do?sysparm_query=company.name=${encodeURIComponent(mapping.externalIdentifier)}`
    };
  }

  /**
   * Generic data fetcher for other systems
   */
  private async fetchGenericData(
    mapping: ClientExternalMapping,
    system: ExternalSystem
  ): Promise<ExternalApiResponse> {
    // Use the apiEndpoints configuration from the system
    const endpoints = system.apiEndpoints as any;
    if (!endpoints?.default) {
      throw new Error(`No default endpoint configured for ${system.systemName}`);
    }

    const url = endpoints.default.replace('{identifier}', mapping.externalIdentifier);
    const fullUrl = `${system.baseUrl}${url}`;
    
    const headers = this.getAuthHeaders(system);
    
    const response = await fetch(fullUrl, this.getFetchOptions(headers));

    if (!response.ok) {
      throw new Error(`${system.systemName} API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      status: 'success',
      data: data,
      link: `${system.baseUrl}${endpoints.webUrl?.replace('{identifier}', mapping.externalIdentifier) || ''}`
    };
  }

  /**
   * Get authentication headers based on system configuration
   */
  private getAuthHeaders(system: ExternalSystem): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'MSSP-Client-Manager/1.0',
      'Accept': 'application/json'
    };

    const authConfig = system.authConfig as any;
    
    console.log(`Building auth headers for ${system.systemName}:`, {
      authType: system.authType,
      hasAuthConfig: !!authConfig,
      authConfigKeys: authConfig ? Object.keys(authConfig) : [],
      authConfigValues: authConfig ? Object.fromEntries(
        Object.entries(authConfig).map(([key, value]) => [
          key, 
          typeof value === 'string' && value.length > 10 ? `${value.substring(0, 10)}...` : typeof value
        ])
      ) : {}
    });
    
    switch (system.authType) {
      case 'none':
        console.log(`No authentication required for ${system.systemName}`);
        break;
        
      case 'basic':
        if (authConfig?.username && authConfig?.password) {
          // Simple Basic Auth: username:password (no API key complexity)
          const credentials = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
          console.log(`Added Basic auth header for ${system.systemName}: ${authConfig.username}:[password]`);
          
          // Special handling for Jira - add common Jira headers
          if (system.systemName.toLowerCase() === 'jira') {
            // Note: Removed X-Atlassian-Token and other complex headers that might cause issues
            console.log('Applied Jira-specific simple auth configuration');
          }
        } else {
          console.warn('Basic auth selected but missing username or password');
        }
        break;
        
      case 'bearer':
        if (authConfig?.token) {
          headers['Authorization'] = `Bearer ${authConfig.token}`;
          console.log('Added Bearer token header');
        } else if (authConfig?.apiKey) {
          // Fallback: use API key as bearer token
          headers['Authorization'] = `Bearer ${authConfig.apiKey}`;
          console.log('Added Bearer token header using apiKey');
        } else {
          console.warn('Bearer auth selected but missing token in authConfig');
        }
        break;
        
      case 'api_key':
        if (authConfig?.key && authConfig?.header) {
          headers[authConfig.header] = authConfig.key;
          console.log(`Added API key header: ${authConfig.header}`);
        } else {
          console.warn('API key auth selected but missing key or header in authConfig');
        }
        break;
        
      default:
        console.warn(`Unknown auth type: ${system.authType}`);
    }

    return headers;
  }

  /**
   * Test connection to an external system
   */
  async testConnection(system: ExternalSystem, testConfig?: any): Promise<ExternalApiResponse> {
    console.log(`Testing connection to ${system.systemName} at ${system.baseUrl}`, {
      authType: system.authType,
      hasAuthConfig: !!system.authConfig,
      authConfigKeys: system.authConfig ? Object.keys(system.authConfig) : []
    });

    try {
      const startTime = Date.now();
      
      switch (system.systemName.toLowerCase()) {
        case 'jira':
          return await this.testJiraConnection(system, testConfig);
        case 'grafana':
          return await this.testGrafanaConnection(system, testConfig);
        case 'servicenow':
          return await this.testServiceNowConnection(system, testConfig);
        default:
          return await this.testGenericConnection(system, testConfig);
      }
    } catch (error) {
      console.error(`Connection test failed for ${system.systemName}:`, {
        error: error.message,
        stack: error.stack,
        systemName: system.systemName,
        baseUrl: system.baseUrl,
        authType: system.authType
      });
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  /**
   * Test Jira connection with JQL query
   */
  private async testJiraConnection(system: ExternalSystem, testConfig?: any): Promise<ExternalApiResponse> {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity first - use API v2 for broader compatibility
      const healthUrl = `${system.baseUrl}/rest/api/2/serverInfo`;
      const headers = this.getAuthHeaders(system);
      
      const healthResponse = await fetch(healthUrl, this.getFetchOptions(headers));

      if (!healthResponse.ok) {
        const errorText = await healthResponse.text();
        throw new Error(`Jira health check failed: ${healthResponse.status} ${healthResponse.statusText} - ${errorText}`);
      }

      const serverInfo = await healthResponse.json();
      
      // Test JQL query if provided - use API v2
      let jqlTestResult = null;
      if (testConfig?.testJql) {
        const jqlUrl = `${system.baseUrl}/rest/api/2/search?jql=${encodeURIComponent(testConfig.testJql)}&maxResults=1`;
        
        const jqlResponse = await fetch(jqlUrl, this.getFetchOptions(headers));

        if (!jqlResponse.ok) {
          const errorText = await jqlResponse.text();
          throw new Error(`JQL test failed: ${jqlResponse.status} ${jqlResponse.statusText} - ${errorText}`);
        }

        const jqlData = await jqlResponse.json();
        jqlTestResult = {
          query: testConfig.testJql,
          totalResults: jqlData.total,
          executionTime: `${Date.now() - startTime}ms`
        };
      }

      return {
        status: 'success',
        data: {
          connection: 'successful',
          server_info: {
            version: serverInfo.version,
            server_title: serverInfo.serverTitle,
            base_url: serverInfo.baseUrl,
            api_version: '2' // Indicate we're using API v2
          },
          jql_test: jqlTestResult,
          response_time: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Jira connection test failed'
      };
    }
  }

  /**
   * Test Grafana connection
   */
  private async testGrafanaConnection(system: ExternalSystem, testConfig?: any): Promise<ExternalApiResponse> {
    try {
      const startTime = Date.now();
      const healthUrl = `${system.baseUrl}/api/health`;
      const headers = this.getAuthHeaders(system);
      
      const response = await fetch(healthUrl, this.getFetchOptions(headers));

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Grafana health check failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const healthData = await response.json();
      
      // Test dashboard access
      const dashboardUrl = `${system.baseUrl}/api/search?type=dash-db&limit=1`;
      const dashResponse = await fetch(dashboardUrl, this.getFetchOptions(headers, 5000));

      let dashboardCount = 0;
      if (dashResponse.ok) {
        const dashData = await dashResponse.json();
        dashboardCount = dashData.length;
      }

      return {
        status: 'success',
        data: {
          connection: 'successful',
          health_status: healthData,
          dashboard_access: dashResponse.ok,
          dashboard_count: dashboardCount,
          response_time: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Grafana connection test failed'
      };
    }
  }

  /**
   * Test ServiceNow connection
   */
  private async testServiceNowConnection(system: ExternalSystem, testConfig?: any): Promise<ExternalApiResponse> {
    try {
      const startTime = Date.now();
      const testUrl = `${system.baseUrl}/api/now/table/sys_user?sysparm_limit=1`;
      const headers = this.getAuthHeaders(system);
      
      const response = await fetch(testUrl, this.getFetchOptions(headers));

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ServiceNow test failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      return {
        status: 'success',
        data: {
          connection: 'successful',
          api_access: true,
          test_query_results: data.result?.length || 0,
          response_time: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'ServiceNow connection test failed'
      };
    }
  }

  /**
   * Test generic system connection
   */
  private async testGenericConnection(system: ExternalSystem, testConfig?: any): Promise<ExternalApiResponse> {
    try {
      const startTime = Date.now();
      const endpoints = system.apiEndpoints as any;
      const testUrl = testConfig?.testEndpoint || endpoints?.health || endpoints?.default || system.baseUrl;
      
      console.log(`Testing generic connection to: ${testUrl}`, {
        systemName: system.systemName,
        authType: system.authType,
        hasAuthConfig: !!system.authConfig
      });
      
      const headers = this.getAuthHeaders(system);
      console.log(`Request headers (auth-sensitive info hidden):`, {
        'Content-Type': headers['Content-Type'],
        'User-Agent': headers['User-Agent'],
        hasAuthHeader: !!headers['Authorization'] || !!headers[Object.keys(headers).find(h => h.toLowerCase().includes('key'))]
      });
      
      const fetchOptions = this.getFetchOptions(headers);
      console.log('[DEBUG] About to call fetch with options:', JSON.stringify(fetchOptions, null, 2));
      
      const response = await fetch(testUrl, fetchOptions);

      const responseTime = Date.now() - startTime;
      let responseData = null;
      let responseText = '';
      
      try {
        const contentType = response.headers.get('content-type');
        console.log(`Response status: ${response.status} ${response.statusText}`, {
          contentType,
          responseTime: `${responseTime}ms`
        });
        
        if (contentType?.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseText = await response.text();
          responseData = responseText;
        }
      } catch (parseError) {
        console.error('Failed to parse response:', parseError.message);
        responseData = 'Unable to parse response';
      }

      if (!response.ok) {
        const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        console.error(`Connection test failed:`, {
          status: response.status,
          statusText: response.statusText,
          responseData: typeof responseData === 'string' && responseData.length > 200 
            ? responseData.substring(0, 200) + '...' 
            : responseData,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        return {
          status: 'error',
          error_message: errorMessage,
          data: {
            http_status: response.status,
            response_time: `${responseTime}ms`,
            error_details: responseData,
            timestamp: new Date().toISOString()
          }
        };
      }

      return {
        status: 'success',
        data: {
          connection: 'successful',
          http_status: response.status,
          response_time: `${responseTime}ms`,
          response_headers: Object.fromEntries(response.headers.entries()),
          sample_data: typeof responseData === 'string' && responseData.length > 500 
            ? responseData.substring(0, 500) + '...' 
            : responseData,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`Generic connection test error:`, {
        error: error.message,
        code: error.code,
        systemName: system.systemName,
        baseUrl: system.baseUrl
      });
      
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Generic connection test failed'
      };
    }
  }
}

export const externalApiService = ExternalApiService.getInstance(); 