import { QueryPlugin, registerPlugin, PluginInstance, PluginConfig } from './plugin-manager';
import fetch from 'node-fetch';
import { ExternalSystemInstance } from '@shared/schema';

function buildUrl(base: string, path: string) {
  if (path.startsWith('http')) return path;
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

// ---------------- Default Query Catalogue ----------------
interface PaloAltoQueryDef {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
}

export const paloAltoDefaultQueries: PaloAltoQueryDef[] = [
  { id: 'systemInfo',        method: 'GET',  path: '/restapi/9.0/system',                description: 'System info & version' },
  { id: 'listPolicies',      method: 'GET',  path: '/restapi/9.0/Policies/SecurityRules', description: 'Security policies' },
  { id: 'sessionCount',      method: 'GET',  path: '/restapi/9.0/Operational/GetSessions',description: 'Current session stats' },
  { id: 'threatSummary',     method: 'GET',  path: '/restapi/9.0/Operational/GetThreats', description: 'Threat log summary' },
  { id: 'interfaceStats',    method: 'GET',  path: '/restapi/9.0/Operational/GetInterfaces',description: 'Interface statistics' },
  { id: 'routingTable',      method: 'GET',  path: '/restapi/9.0/Operational/GetRouting',  description: 'Routing table' },
  { id: 'listAddresses',     method: 'GET',  path: '/restapi/9.0/Objects/Addresses',      description: 'Address objects' },
  { id: 'listAddressGroups', method: 'GET',  path: '/restapi/9.0/Objects/AddressGroups',  description: 'Address groups' },
  { id: 'listServices',      method: 'GET',  path: '/restapi/9.0/Objects/Services',       description: 'Service objects' },
  { id: 'licenseInfo',       method: 'GET',  path: '/api/?type=op&cmd=<request><license><info></info></license></request>', description: 'License information' },
];

// ---------------------------------------------------------

// Plugin Configuration - Self-Contained
const paloaltoConfig: PluginConfig = {
  instances: [
    {
      id: 'paloalto-main',
      name: 'Main Palo Alto Firewall',
      baseUrl: process.env.PALOALTO_URL || 'https://paloalto.company.com',
      authType: 'api_key',
      authConfig: {
        key: process.env.PALOALTO_KEY || 'your-api-key-here'
      },
      isActive: false, // Disabled by default
      tags: ['firewall', 'security', 'paloalto']
    }
  ],
  defaultRefreshInterval: 30,
  rateLimiting: {
    requestsPerMinute: 60,
    burstSize: 10
  }
};

const paloaltoPlugin: QueryPlugin = {
  systemName: 'paloalto',
  config: paloaltoConfig,
  
  async executeQuery(query: string, _method: string | undefined, instanceId: string) {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new Error(`Palo Alto instance '${instanceId}' not found`);
    }
    
    if (!instance.isActive) {
      throw new Error(`Palo Alto instance '${instanceId}' is not active`);
    }
    
    // Placeholder - would need actual Palo Alto API implementation
    return { message: 'Palo Alto plugin not fully implemented', query, instanceId };
  },
  
  getInstances(): PluginInstance[] {
    return this.config.instances;
  },
  
  getInstance(instanceId: string): PluginInstance | undefined {
    return this.config.instances.find(instance => instance.id === instanceId);
  },
  
  defaultQueries: [
    { id: 'systemInfo', method: 'GET', path: '/api/?type=op&cmd=<show><system><info></info></system></show>', description: 'System information' },
    { id: 'sessions', method: 'GET', path: '/api/?type=op&cmd=<show><session><all></all></session></show>', description: 'Active sessions' }
  ]
};

// Attach default catalogue
(paloaltoPlugin as any).defaultQueries = paloAltoDefaultQueries;

registerPlugin(paloaltoPlugin); 