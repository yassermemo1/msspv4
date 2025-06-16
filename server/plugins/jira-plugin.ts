import { QueryPlugin, registerPlugin, PluginInstance, PluginConfig } from './plugin-manager';
import { buildBasicHeaders, buildFetchOptions } from './plugin-utils';
import fetch from 'node-fetch';

// Plugin Configuration - Self-Contained
const jiraConfig: PluginConfig = {
  instances: [
    {
      id: 'jira-main',
      name: 'Main Jira Instance',
      baseUrl: process.env.JIRA_URL || 'https://your-company.atlassian.net',
      authType: 'basic',
      authConfig: {
        username: process.env.JIRA_USERNAME || 'your-email@company.com',
        password: process.env.JIRA_API_TOKEN || 'your-api-token'
      },
      isActive: true,
      tags: ['tickets', 'project-management'],
      sslConfig: {
        rejectUnauthorized: true,
        allowSelfSigned: false,
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
      throw new Error(`Jira instance '${instanceId}' is not active`);
    }
    
    const base = instance.baseUrl.replace(/\/$/, '');
    
    // Handle special health check query
    if (query === '__health_check__') {
      const url = `${base}/rest/api/2/serverInfo`;
      const headers = buildBasicHeaders(instance);
      const fetchOptions = buildFetchOptions(instance, headers);

      console.log(`🏥 Jira Health Check: ${url}`);
      
      const res = await fetch(url, fetchOptions);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ Jira Health Check Failed ${res.status}: ${errorText}`);
        throw new Error(`Jira Health Check Failed ${res.status}: ${res.statusText}`);
      }
      
      const serverInfo = await res.json();
      console.log(`✅ Jira Health Check Success: ${serverInfo.serverTitle || 'Jira Server'}`);
      
      return {
        status: 'healthy',
        serverInfo: {
          version: serverInfo.version,
          title: serverInfo.serverTitle,
          baseUrl: serverInfo.baseUrl
        },
        timestamp: new Date().toISOString()
      };
    }
    
    // Regular JQL query
    const url = `${base}/rest/api/2/search?jql=${encodeURIComponent(query)}`;
    const headers = buildBasicHeaders(instance);
    const fetchOptions = buildFetchOptions(instance, headers);

    console.log(`🔍 Jira API Request: ${url}`);
    
    const res = await fetch(url, fetchOptions);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ Jira API Error ${res.status}: ${errorText}`);
      throw new Error(`Jira API ${res.status}: ${res.statusText} - ${errorText}`);
    }
    
    const data = await res.json();
    return data;
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