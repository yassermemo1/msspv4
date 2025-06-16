import { QueryPlugin, registerPlugin } from './plugin-manager';
import fetch from 'node-fetch';
// External system instances removed - deprecated

function buildUrl(base: string, path: string) {
  if (path.startsWith('http')) return path;
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

const vmwarePlugin: QueryPlugin = {
  systemName: 'vmware',
  config: { instances: [] },
  
  getInstances() {
    return this.config.instances;
  },
  
  getInstance(instanceId: string) {
    return this.config.instances.find(instance => instance.id === instanceId);
  },
  
  async executeQuery(query: string, method = 'GET', instanceId: string, opts) {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }
    const base = instance.baseUrl || '';
    const url = buildUrl(base, query);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const cfg: any = instance.authConfig || {};
    if (cfg.token) {
      headers['vmware-api-session-id'] = cfg.token; // common for vCenter REST
      headers['Authorization'] = `Bearer ${cfg.token}`; // fallback
    }

    const res = await fetch(url, {
      method: method.toUpperCase(),
      headers,
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      throw new Error(`VMware API ${res.status}: ${typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data).slice(0, 200)}`);
    }
    return data;
  },
};

registerPlugin(vmwarePlugin);

// ---------------- Default Query Catalogue ----------------
export interface VmwareQueryDef {
  id: string;           // short key used by frontend / dashboards
  method: 'GET' | 'POST';
  path: string;         // REST endpoint path (may contain {placeholders})
  description: string;  // human-friendly text shown in UI
}

export const vmwareDefaultQueries: VmwareQueryDef[] = [
  { id: 'listVms',         method: 'GET',  path: '/rest/vcenter/vm',                       description: 'List all virtual machines' },
  { id: 'getVm',           method: 'GET',  path: '/rest/vcenter/vm/{vmId}',               description: 'Get details for a specific VM' },
  { id: 'listHosts',       method: 'GET',  path: '/rest/vcenter/host',                    description: 'List all ESXi hosts' },
  { id: 'getVmPower',      method: 'GET',  path: '/rest/vcenter/vm/{vmId}/power',         description: 'Get power status of a VM' },
  { id: 'powerOnVm',       method: 'POST', path: '/rest/vcenter/vm/{vmId}/power/start',   description: 'Power on a VM' },
  { id: 'powerOffVm',      method: 'POST', path: '/rest/vcenter/vm/{vmId}/power/stop',    description: 'Power off a VM' },
  { id: 'listDatastores',  method: 'GET',  path: '/rest/vcenter/datastore',               description: 'List all datastores' },
  { id: 'listClusters',    method: 'GET',  path: '/rest/vcenter/cluster',                 description: 'List all clusters' },
  { id: 'getVmHardware',   method: 'GET',  path: '/rest/vcenter/vm/{vmId}/hardware',      description: 'Get hardware info for a VM' },
  { id: 'listTasks',       method: 'GET',  path: '/rest/com/vmware/cis/task',             description: 'List recent tasks / events' },
];

// Attach catalogue to plugin so that the universal route can expose it
(vmwarePlugin as any).defaultQueries = vmwareDefaultQueries;

// Helper for the UI to discover queries locally
export function listVmwareQueries() {
  return vmwareDefaultQueries;
}
// --------------------------------------------------------- 