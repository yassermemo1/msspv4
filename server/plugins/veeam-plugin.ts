import type { QueryPlugin, PluginInstance, PluginConfig } from './plugin-manager';
import fetch from 'node-fetch';
// External system instances removed - deprecated

// Helper function to construct URLs
function buildUrl(base: string, path: string) {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

// Define query types specific to Veeam
interface VeeamQueryDef {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
}

const VEEAM_QUERIES: VeeamQueryDef[] = [
  { id: 'backup_jobs', method: 'GET', path: '/api/v1/backupJobs', description: 'Get backup jobs' },
  { id: 'backup_sessions', method: 'GET', path: '/api/v1/backupSessions', description: 'Get backup sessions' },
  { id: 'repositories', method: 'GET', path: '/api/v1/repositories', description: 'Get repositories' },
  { id: 'restore_points', method: 'GET', path: '/api/v1/restorePoints', description: 'Get restore points' },
  { id: 'vms', method: 'GET', path: '/api/v1/virtualMachines', description: 'Get virtual machines' },
];

// Plugin instances configuration
const VEEAM_INSTANCES: PluginInstance[] = [
  {
    id: 'veeam-main',
    name: 'Main Veeam Server',
    baseUrl: 'https://veeam.example.com:9419',
    authType: 'bearer',
    authConfig: {
      token: 'your-veeam-api-key'
    },
    isActive: true
  }
];

// ---------------------------------------------------------
// MAIN PLUGIN IMPLEMENTATION
// ---------------------------------------------------------

const veeamPlugin: QueryPlugin = {
  systemName: 'veeam',
  config: {
    instances: VEEAM_INSTANCES,
    defaultRefreshInterval: 30000
  },
  getInstances() {
    return VEEAM_INSTANCES;
  },
  getInstance(instanceId: string) {
    return VEEAM_INSTANCES.find(instance => instance.id === instanceId);
  },
  async executeQuery(query: string, method = 'GET', instanceId: string, opts?: Record<string, any>) {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new Error(`Veeam instance '${instanceId}' not found`);
    }

    const base = instance.baseUrl || '';
    if (!base) {
      throw new Error(`Veeam instance '${instanceId}' has no baseUrl configured`);
    }

    const queryDef = VEEAM_QUERIES.find(q => q.id === query);
    if (!queryDef) {
      throw new Error(`Unknown Veeam query: ${query}`);
    }

    const url = buildUrl(base, queryDef.path);
    
    try {
             const response = await fetch(url, {
         method: queryDef.method,
         headers: {
           'Authorization': `Bearer ${instance.authConfig?.token}`,
           'Content-Type': 'application/json',
           'Accept': 'application/json',
           ...opts?.headers
         },
        ...(queryDef.method === 'POST' && opts?.body && { body: JSON.stringify(opts.body) })
      });

      if (!response.ok) {
        throw new Error(`Veeam API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Veeam query '${query}' failed:`, error);
      throw error;
    }
  }
};

export default veeamPlugin; 