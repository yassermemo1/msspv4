import { QueryPlugin, registerPlugin, PluginInstance, PluginConfig } from './plugin-manager';
import fetch from 'node-fetch';

function buildUrl(base: string, path: string) {
  if (path.startsWith('http')) return path;
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

function buildHeaders(instance: PluginInstance): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const cfg = instance.authConfig || {};
  
  if (instance.authType === 'bearer' && cfg.token) {
    headers['Authorization'] = `Bearer ${cfg.token}`;
  } else if (instance.authType === 'api_key' && cfg.key) {
    headers[cfg.header || 'X-API-Key'] = cfg.key;
  } else if (instance.authType === 'basic' && cfg.username && cfg.password) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64');
  }
  return headers;
}

// ---------------- Default Query Catalogue ----------------
interface FortigateQueryDef {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
}

export const fortigateDefaultQueries: FortigateQueryDef[] = [
  { id: 'systemStatus',        method: 'GET',  path: '/api/v2/monitor/system/status',          description: 'System status and version' },
  { id: 'listPolicies',        method: 'GET',  path: '/api/v2/monitor/firewall/policy',        description: 'Firewall policies' },
  { id: 'listAddresses',       method: 'GET',  path: '/api/v2/monitor/firewall/address',       description: 'Address objects' },
  { id: 'listInterfaces',      method: 'GET',  path: '/api/v2/cmdb/system/interface',          description: 'Network interfaces' },
  { id: 'ipsecStatus',         method: 'GET',  path: '/api/v2/monitor/system/vpn/ipsec',       description: 'IPsec VPN status' },
  { id: 'haStatus',            method: 'GET',  path: '/api/v2/monitor/system/ha/status',       description: 'High Availability status' },
  { id: 'routeTable',          method: 'GET',  path: '/api/v2/monitor/router/ipv4',             description: 'Routing table (IPv4)' },
  { id: 'sessionCount',        method: 'GET',  path: '/api/v2/monitor/firewall/session',       description: 'Current session count' },
  { id: 'topSessions',         method: 'GET',  path: '/api/v2/monitor/firewall/top/sessions',   description: 'Top bandwidth sessions' },
  { id: 'licenseInfo',         method: 'GET',  path: '/api/v2/monitor/system/license/status',   description: 'License information' },
];

// Plugin Configuration - Self-Contained
const fortigateConfig: PluginConfig = {
  instances: [
    {
      id: 'fortigate-prod',
      name: 'Production FortiGate',
      baseUrl: process.env.FORTIGATE_PROD_URL || 'https://192.168.1.1',
      authType: 'api_key',
      authConfig: {
        key: process.env.FORTIGATE_PROD_KEY || 'your-api-key-here',
        header: 'Authorization'
      },
      isActive: true,
      tags: ['production', 'firewall']
    },
    {
      id: 'fortigate-test',
      name: 'Test FortiGate',
      baseUrl: process.env.FORTIGATE_TEST_URL || 'https://192.168.1.10',
      authType: 'api_key',
      authConfig: {
        key: process.env.FORTIGATE_TEST_KEY || 'your-test-api-key-here',
        header: 'Authorization'
      },
      isActive: true,
      tags: ['test', 'firewall']
    }
  ],
  defaultRefreshInterval: 30,
  rateLimiting: {
    requestsPerMinute: 60,
    burstSize: 10
  }
};

// ---------------------------------------------------------

const fortigatePlugin: QueryPlugin = {
  systemName: 'fortigate',
  config: fortigateConfig,
  
  async executeQuery(query: string, method = 'GET', instanceId: string, opts) {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new Error(`FortiGate instance '${instanceId}' not found`);
    }
    
    if (!instance.isActive) {
      throw new Error(`FortiGate instance '${instanceId}' is not active`);
    }
    
    const url = buildUrl(instance.baseUrl, query);
    const headers = buildHeaders(instance);

    const res = await fetch(url, {
      method: method.toUpperCase(),
      headers,
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      throw new Error(`FortiGate API ${res.status}: ${typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data).slice(0, 200)}`);
    }
    return data;
  },
  
  getInstances(): PluginInstance[] {
    return this.config.instances;
  },
  
  getInstance(instanceId: string): PluginInstance | undefined {
    return this.config.instances.find(instance => instance.id === instanceId);
  },
  
  defaultQueries: fortigateDefaultQueries
};

registerPlugin(fortigatePlugin); 