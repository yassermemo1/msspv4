import { QueryPlugin, registerPlugin, PluginInstance, PluginConfig } from './plugin-manager';
import fetch from 'node-fetch';

// Plugin Configuration - Self-Contained
const grafanaConfig: PluginConfig = {
  instances: [
    {
      id: 'grafana-main',
      name: 'Main Grafana Instance',
      baseUrl: process.env.GRAFANA_URL || 'https://grafana.company.com',
      authType: 'bearer',
      authConfig: {
        token: process.env.GRAFANA_TOKEN || 'your-service-account-token'
      },
      isActive: false, // Disabled by default
      tags: ['monitoring', 'dashboards', 'metrics']
    }
  ],
  defaultRefreshInterval: 30,
  rateLimiting: {
    requestsPerMinute: 60,
    burstSize: 10
  }
};

const grafanaPlugin: QueryPlugin = {
  systemName: 'grafana',
  config: grafanaConfig,
  
  async executeQuery(query: string, _method: string | undefined, instanceId: string) {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new Error(`Grafana instance '${instanceId}' not found`);
    }
    
    if (!instance.isActive) {
      throw new Error(`Grafana instance '${instanceId}' is not active`);
    }
    
    // Placeholder - would need actual Grafana API implementation
    return { message: 'Grafana plugin not fully implemented', query, instanceId };
  },
  
  getInstances(): PluginInstance[] {
    return this.config.instances;
  },
  
  getInstance(instanceId: string): PluginInstance | undefined {
    return this.config.instances.find(instance => instance.id === instanceId);
  },
  
  defaultQueries: [
    { id: 'dashboards', method: 'GET', path: '/api/search?type=dash-db', description: 'List all dashboards' },
    { id: 'datasources', method: 'GET', path: '/api/datasources', description: 'List all data sources' },
    { id: 'health', method: 'GET', path: '/api/health', description: 'Health check' }
  ]
};

registerPlugin(grafanaPlugin); 