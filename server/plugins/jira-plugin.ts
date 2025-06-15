import { QueryPlugin, registerPlugin, PluginInstance, PluginConfig } from './plugin-manager';
import fetch from 'node-fetch';

function buildHeaders(instance: PluginInstance): Record<string, string> {
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  const cfg = instance.authConfig || {};
  
  if (instance.authType === 'basic' && cfg.username && cfg.password) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64');
  } else if (instance.authType === 'bearer' && cfg.token) {
    headers['Authorization'] = `Bearer ${cfg.token}`;
  }
  
  return headers;
}

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
      tags: ['tickets', 'project-management']
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
  
  async executeQuery(query: string, _method: string | undefined, instanceId: string) {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new Error(`Jira instance '${instanceId}' not found`);
    }
    
    if (!instance.isActive) {
      throw new Error(`Jira instance '${instanceId}' is not active`);
    }
    
    // Build JIRA search URL
    const base = instance.baseUrl;
    const url = `${base.replace(/\/$/, '')}/rest/api/2/search?jql=${encodeURIComponent(query)}`;
    const headers = buildHeaders(instance);

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Jira API ${res.status}: ${res.statusText}`);
    const data = await res.json();
    return data; // issues array etc.
  },
  
  getInstances(): PluginInstance[] {
    return this.config.instances;
  },
  
  getInstance(instanceId: string): PluginInstance | undefined {
    return this.config.instances.find(instance => instance.id === instanceId);
  },
  
  defaultQueries: [
    { id: 'recentIssues', method: 'GET', path: 'created >= -7d ORDER BY created DESC', description: 'Issues created in the last 7 days' },
    { id: 'openBugs', method: 'GET', path: 'type = Bug AND status != Done', description: 'Open bug tickets' },
    { id: 'myIssues', method: 'GET', path: 'assignee = currentUser() AND status != Done', description: 'My open issues' }
  ]
};

registerPlugin(jiraPlugin); 