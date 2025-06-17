import { QueryPlugin, registerPlugin, PluginInstance, PluginConfig } from './plugin-manager';
import { buildBasicHeaders, buildFetchOptions } from './plugin-utils';
import fetch from 'node-fetch';

// Helper function to auto-fix common JQL formatting issues
function autoFixJQLQuery(query: string): string {
  let fixed = query;
  
  // Fix 1: Ensure field names are lowercase
  fixed = fixed.replace(/\bProject\s*=/gi, 'project =');
  fixed = fixed.replace(/\bProject\s+in\s*\(/gi, 'project in (');
  fixed = fixed.replace(/\bStatus\s*=/gi, 'status =');
  fixed = fixed.replace(/\bAssignee\s*=/gi, 'assignee =');
  fixed = fixed.replace(/\bReporter\s*=/gi, 'reporter =');
  fixed = fixed.replace(/\bPriority\s*=/gi, 'priority =');
  fixed = fixed.replace(/\bType\s*=/gi, 'type =');
  fixed = fixed.replace(/\bResolution\s*=/gi, 'resolution =');
  
  // Fix 2: Add quotes around unquoted string values (but not for functions/operators)
  fixed = fixed.replace(/=\s*([A-Za-z][A-Za-z0-9_]*)\s*(?![A-Za-z0-9_()])/g, '= "$1"');
  fixed = fixed.replace(/!=\s*([A-Za-z][A-Za-z0-9_]*)\s*(?![A-Za-z0-9_()])/g, '!= "$1"');
  
  // Fix 3: Fix IN clauses - properly quote unquoted values
  fixed = fixed.replace(/\s+in\s+\(/gi, ' in (');
  
  // Fix IN clause values - quote individual unquoted values
  fixed = fixed.replace(/in\s*\(\s*([^)]+)\s*\)/gi, (match, values) => {
    // Split values and quote unquoted ones
    const fixedValues = values.split(',').map((value: string) => {
      const trimmed = value.trim();
      // If already quoted, keep as is
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
          (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed;
      }
      // Quote unquoted values (only if they're not empty and not functions)
      if (trimmed && !trimmed.includes('(') && !trimmed.includes(')')) {
        return `"${trimmed}"`;
      }
      return trimmed;
    }).join(', ');
    
    return `in (${fixedValues})`;
  });
  
  // Fix 4: Fix ORDER BY issues - replace invalid sort fields
  fixed = fixed.replace(/ORDER\s+BY\s+priority\s*(DESC|ASC)?/gi, 'ORDER BY created $1');
  fixed = fixed.replace(/ORDER\s+BY\s+([^"'\s]+)\s*(DESC|ASC)?/gi, (match, field, direction) => {
    const validSortFields = ['created', 'updated', 'key', 'priority', 'status', 'assignee'];
    const lowerField = field.toLowerCase();
    if (!validSortFields.includes(lowerField)) {
      return `ORDER BY created ${direction || ''}`;
    }
    return `ORDER BY ${lowerField} ${direction || ''}`;
  });
  
  // Fix 5: Clean up extra spaces
  fixed = fixed.replace(/\s+/g, ' ').trim();
  
  console.log(`🔧 JQL Auto-fix: "${query}" → "${fixed}"`);
  return fixed;
}

// Helper function to validate JQL syntax
function validateJQLSyntax(query: string): void {
  // Check for incomplete operators
  if (query.endsWith('=') || query.endsWith('AND') || query.endsWith('OR') || query.endsWith('!')) {
    throw new Error('Invalid JQL syntax: query ends with an incomplete operator');
  }
  
  // Check for unmatched quotes
  const singleQuotes = (query.match(/'/g) || []).length;
  const doubleQuotes = (query.match(/"/g) || []).length;
  if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
    throw new Error('Invalid JQL syntax: unmatched quotes');
  }
  
  // Check for unmatched parentheses
  const openParens = (query.match(/\(/g) || []).length;
  const closeParens = (query.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    throw new Error('Invalid JQL syntax: unmatched parentheses');
  }
  
  // Check for basic field validation
  const invalidPatterns = [
    { pattern: /\s=\s*$/, message: 'Empty value after equals sign' },
    { pattern: /\s(AND|OR)\s*$/, message: 'Query ends with logical operator' },
    { pattern: /^\s*(AND|OR)/, message: 'Query starts with logical operator' },
    { pattern: /\s(AND|OR)\s+(AND|OR)/, message: 'Consecutive logical operators' }
  ];
  
  for (const { pattern, message } of invalidPatterns) {
    if (pattern.test(query)) {
      throw new Error(`Invalid JQL syntax: ${message}`);
    }
  }
}

// Plugin Configuration - Self-Contained
console.log('🔧 Jira Plugin Environment Variables:');
console.log(`  JIRA_AUTH_TYPE: ${process.env.JIRA_AUTH_TYPE}`);
console.log(`  JIRA_USERNAME: ${process.env.JIRA_USERNAME}`);
console.log(`  JIRA_API_TOKEN: ${process.env.JIRA_API_TOKEN ? '[HIDDEN]' : 'NOT SET'}`);
console.log(`  JIRA_ENABLED: ${process.env.JIRA_ENABLED}`);

const authType = process.env.JIRA_AUTH_TYPE === 'bearer' ? 'bearer' : 'basic';
console.log(`  Computed Auth Type: ${authType}`);

const jiraConfig: PluginConfig = {
  instances: [
    {
      id: 'jira-main',
      name: 'Main Jira Instance',
      baseUrl: process.env.JIRA_URL || 'https://sd.sic.sitco.sa',
      authType: authType,
      authConfig: {
        username: process.env.JIRA_USERNAME || 'yalmohammed',
        password: authType === 'basic' ? process.env.JIRA_API_TOKEN : undefined,
        token: authType === 'bearer' ? process.env.JIRA_API_TOKEN : undefined
      },
      isActive: process.env.JIRA_ENABLED === 'true',
      tags: ['tickets', 'project-management'],
      sslConfig: {
        rejectUnauthorized: false,
        allowSelfSigned: true,
        timeout: 30000
      }
    }
  ],
  defaultRefreshInterval: 60,
  rateLimiting: {
    requestsPerMinute: 100,
    burstSize: 20
  }
};

const jiraPlugin: QueryPlugin = {
  systemName: 'jira',
  config: jiraConfig,
  
  async executeQuery(query: string, method: string | undefined, instanceId: string) {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new Error(`Jira instance '${instanceId}' not found`);
    }
    
    if (!instance.isActive) {
      throw new Error(`Jira instance '${instanceId}' is not active - check JIRA_ENABLED environment variable`);
    }

    // Validate query input
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    // Enhanced JQL syntax validation and formatting
    const trimmedQuery = query.trim();
    if (trimmedQuery !== '__health_check__') {
      // Step 1: Auto-fix common JQL formatting issues
      let fixedQuery = autoFixJQLQuery(trimmedQuery);
      
      // Step 2: Validate the fixed query
      validateJQLSyntax(fixedQuery);
      
      // Use the fixed query for execution
      query = fixedQuery;
    }
    
    const base = instance.baseUrl.replace(/\/$/, '');
    
    // Handle special health check query
    if (query === '__health_check__') {
      const url = `${base}/rest/api/2/serverInfo`;
      const headers = buildBasicHeaders(instance);
      const fetchOptions = buildFetchOptions(instance, headers);

      console.log(`🏥 Jira Health Check: ${url}`);
      console.log(`🔐 Using authentication: ${instance.authConfig?.username} / [TOKEN_HIDDEN]`);
      console.log(`🔑 Auth Type: ${instance.authType}`);
      console.log(`🎫 Token available: ${instance.authConfig?.token ? 'YES' : 'NO'}`);
      console.log(`🔐 Password available: ${instance.authConfig?.password ? 'YES' : 'NO'}`);
      
      try {
        const res = await fetch(url, fetchOptions);
        
        const contentType = res.headers.get('content-type') || '';
        const responseText = await res.text();
        
        console.log(`📊 Response Status: ${res.status} ${res.statusText}`);
        console.log(`📄 Content-Type: ${contentType}`);
        console.log(`📝 Response Preview: ${responseText.substring(0, 200)}`);
        
        // Check if we got HTML instead of JSON (authentication failure)
        if (contentType.includes('text/html') || responseText.includes('<html>')) {
          console.error(`❌ Jira returned HTML instead of JSON - Authentication failed`);
          if (res.status === 403) {
            throw new Error(`Jira Authentication Failed (403): Invalid API token or credentials. Please check JIRA_USERNAME and JIRA_API_TOKEN in your environment.`);
          } else if (res.status === 401) {
            throw new Error(`Jira Authentication Required (401): Please verify your API token and credentials.`);
          } else {
            throw new Error(`Jira returned web page instead of API response (${res.status}): Check if REST API is enabled and accessible.`);
          }
        }
        
        if (!res.ok) {
          console.error(`❌ Jira Health Check Failed ${res.status}: ${responseText}`);
          throw new Error(`Jira Health Check Failed ${res.status}: ${res.statusText} - ${responseText.substring(0, 200)}`);
        }
        
        let serverInfo;
        try {
          serverInfo = JSON.parse(responseText);
        } catch (e) {
          throw new Error(`Jira returned invalid JSON response: ${responseText.substring(0, 200)}`);
        }
        
        console.log(`✅ Jira Health Check Success: ${serverInfo.serverTitle || 'Jira Server'} v${serverInfo.version}`);
        
        return {
          status: 'healthy',
          serverInfo: {
            version: serverInfo.version,
            title: serverInfo.serverTitle,
            baseUrl: serverInfo.baseUrl,
            deploymentType: serverInfo.deploymentType
          },
          timestamp: new Date().toISOString()
        };
        
      } catch (error) {
        console.error(`❌ Jira Health Check Error:`, error instanceof Error ? error.message : String(error));
        throw error;
      }
    }
    
    // Regular JQL query
    const url = `${base}/rest/api/2/search?jql=${encodeURIComponent(query)}`;
    const headers = buildBasicHeaders(instance);
    const fetchOptions = buildFetchOptions(instance, headers);

    console.log(`🔍 Jira API Request: ${url}`);
    
    try {
      const res = await fetch(url, fetchOptions);
      
      const contentType = res.headers.get('content-type') || '';
      const responseText = await res.text();
      
      // Check if we got HTML instead of JSON (authentication failure)
      if (contentType.includes('text/html') || responseText.includes('<html>')) {
        console.error(`❌ Jira returned HTML instead of JSON for query: ${query}`);
        if (res.status === 403) {
          throw new Error(`Jira Authentication Failed (403): Invalid API token. Please generate a new API token in Jira settings.`);
        } else if (res.status === 401) {
          throw new Error(`Jira Authentication Required (401): Please check your credentials.`);
        } else {
          throw new Error(`Jira returned web page instead of API response (${res.status}): Cannot execute queries.`);
        }
      }
      
      if (!res.ok) {
        console.error(`❌ Jira API Error ${res.status}: ${responseText}`);
        throw new Error(`Jira API ${res.status}: ${res.statusText} - ${responseText}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Jira returned invalid JSON for query "${query}": ${responseText.substring(0, 200)}`);
      }
      
      // Add sample data for display purposes (limit to 10 issues for testing)
      if (data.issues && Array.isArray(data.issues)) {
        const sampleIssues = data.issues.slice(0, 10).map((issue: any) => ({
          key: issue.key,
          summary: issue.fields?.summary || 'No summary',
          status: issue.fields?.status?.name || 'Unknown',
          priority: issue.fields?.priority?.name || 'Unassigned',
          assignee: issue.fields?.assignee?.displayName || 'Unassigned',
          created: issue.fields?.created || null,
          updated: issue.fields?.updated || null,
          project: issue.fields?.project?.name || issue.fields?.project?.key || 'Unknown',
          issueType: issue.fields?.issuetype?.name || 'Unknown',
          reporter: issue.fields?.reporter?.displayName || 'Unknown'
        }));
        
        // Return enhanced data with sample for testing
        return {
          ...data,
          sampleData: sampleIssues,
          totalResults: data.total || 0,
          displayedSample: sampleIssues.length,
          query: query
        };
      }
      
      return data;
      
    } catch (error) {
      console.error(`❌ Jira Query Error for "${query}":`, error instanceof Error ? error.message : String(error));
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
    { id: 'healthCheck', method: 'GET', path: '__health_check__', description: 'Server health check' },
    { id: 'recentIssues', method: 'GET', path: 'created >= -1w ORDER BY created DESC', description: 'Issues created in the last week' },
    { id: 'openBugs', method: 'GET', path: 'type = Bug AND resolution = Unresolved', description: 'Open bug tickets' },
    { id: 'myIssues', method: 'GET', path: 'assignee = currentUser() AND resolution = Unresolved', description: 'My open issues' },
    { id: 'recentlyUpdated', method: 'GET', path: 'updated >= -3d ORDER BY updated DESC', description: 'Recently updated issues' }
  ]
};

registerPlugin(jiraPlugin); 