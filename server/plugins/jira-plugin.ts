import { QueryPlugin, registerPlugin, PluginInstance, PluginConfig } from './plugin-manager';
import { buildBasicHeaders, buildFetchOptions } from './plugin-utils';
import fetch from 'node-fetch';

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
        password: authType === 'basic' ? (process.env.JIRA_API_TOKEN || '0541887111Ysm!!!!!!!') : undefined,
        token: authType === 'bearer' ? (process.env.JIRA_API_TOKEN || '0541887111Ysm!!!!!!') : undefined
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

    // Basic JQL syntax validation
    const trimmedQuery = query.trim();
    if (trimmedQuery !== '__health_check__') {
      // Check for common JQL syntax issues
      if (trimmedQuery.endsWith('=') || trimmedQuery.endsWith('AND') || trimmedQuery.endsWith('OR')) {
        throw new Error('Invalid JQL syntax: query ends with an incomplete operator');
      }
      
      // Check for unmatched quotes
      const singleQuotes = (trimmedQuery.match(/'/g) || []).length;
      const doubleQuotes = (trimmedQuery.match(/"/g) || []).length;
      if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
        throw new Error('Invalid JQL syntax: unmatched quotes');
      }
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
        console.error(`❌ Jira Health Check Error:`, error.message);
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
      
      return data;
      
    } catch (error) {
      console.error(`❌ Jira Query Error for "${query}":`, error.message);
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