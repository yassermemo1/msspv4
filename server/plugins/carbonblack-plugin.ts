import { QueryPlugin, registerPlugin, PluginInstance, PluginConfig } from './plugin-manager';
import fetch from 'node-fetch';

function buildUrl(base: string, path: string) {
  if (path.startsWith('http')) return path;
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

// ---------------- Default Query Catalogue ----------------
interface CbQueryDef {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
}

export const carbonBlackDefaultQueries: CbQueryDef[] = [
  { id: 'listDevices',      method: 'GET',  path: '/appservices/v6/orgs/{orgKey}/devices/_search', description: 'List all devices' },
  { id: 'deviceSummary',    method: 'GET',  path: '/appservices/v6/orgs/{orgKey}/devices/{deviceId}', description: 'Device summary info' },
  { id: 'listAlerts',       method: 'GET',  path: '/appservices/v6/orgs/{orgKey}/alerts/_search',    description: 'Security alerts' },
  { id: 'listPolicies',     method: 'GET',  path: '/appservices/v6/orgs/{orgKey}/policies',         description: 'Prevention policies' },
  { id: 'policyDetails',    method: 'GET',  path: '/appservices/v6/orgs/{orgKey}/policies/{policyId}', description: 'Policy details' },
  { id: 'topThreats',       method: 'GET',  path: '/threathunter/v2/orgs/{orgKey}/threats/_search', description: 'Top threats' },
  { id: 'eventSearch',      method: 'POST', path: '/enterprise-response/v2/orgs/{orgKey}/events/_search', description: 'Search events' },
  { id: 'queryProcess',     method: 'POST', path: '/enterprise-response/v2/orgs/{orgKey}/processes/_search', description: 'Search processes' },
  { id: 'liveResponse',     method: 'POST', path: '/live-response',                                   description: 'Initiate Live Response session' },
  { id: 'licenseInfo',      method: 'GET',  path: '/appservices/v6/orgs/{orgKey}/license',           description: 'License usage' },
];

// Plugin Configuration
const carbonBlackConfig: PluginConfig = {
  instances: [
    {
      id: 'carbonblack-prod',
      name: 'Production CarbonBlack',
      baseUrl: process.env.CARBONBLACK_PROD_URL || 'https://api-prod05.conferdeploy.net',
      authType: 'api_key',
      authConfig: {
        token: process.env.CARBONBLACK_PROD_TOKEN || 'your-api-token-here'
      },
      isActive: true,
      tags: ['production', 'endpoint-security']
    }
  ],
  defaultRefreshInterval: 60,
  rateLimiting: {
    requestsPerMinute: 30,
    burstSize: 5
  }
};

// ---------------------------------------------------------

const carbonBlackPlugin: QueryPlugin = {
  systemName: 'carbonblack',
  config: carbonBlackConfig,
  
  async executeQuery(query: string, method = 'GET', instanceId: string, opts) {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new Error(`CarbonBlack instance '${instanceId}' not found`);
    }
    
    if (!instance.isActive) {
      throw new Error(`CarbonBlack instance '${instanceId}' is not active`);
    }
    
    const url = buildUrl(instance.baseUrl, query);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const cfg = instance.authConfig || {};
    if (cfg.token) {
      headers['X-Auth-Token'] = cfg.token;
    }

    const res = await fetch(url, {
      method: method.toUpperCase(),
      headers,
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      throw new Error(`CarbonBlack API ${res.status}: ${typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data).slice(0, 200)}`);
    }
    return data;
  },
  
  getInstances(): PluginInstance[] {
    return this.config.instances;
  },
  
  getInstance(instanceId: string): PluginInstance | undefined {
    return this.config.instances.find(instance => instance.id === instanceId);
  },
  
  defaultQueries: carbonBlackDefaultQueries
};

registerPlugin(carbonBlackPlugin); 