import { QueryPlugin, registerPlugin } from './plugin-manager';
import fetch from 'node-fetch';
// import { ExternalSystemInstance } from '@shared/schema'; // REMOVED - External system instances deprecated

function buildUrl(base: string, path: string) {
  if (path.startsWith('http')) return path;
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

// ---------------- Default Query Catalogue ----------------
interface SysdigQueryDef {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
}

export const sysdigDefaultQueries: SysdigQueryDef[] = [
  { id: 'listAgents',        method: 'GET',  path: '/api/agents',                  description: 'List Sysdig agents' },
  { id: 'listPolicies',      method: 'GET',  path: '/api/policies',                description: 'Security policies' },
  { id: 'policyEvents',      method: 'GET',  path: '/api/events/policies',         description: 'Policy events' },
  { id: 'hostSummary',       method: 'GET',  path: '/api/data/host',               description: 'Host metrics summary' },
  { id: 'containerSummary',  method: 'GET',  path: '/api/data/container',          description: 'Container metrics summary' },
  { id: 'topProcesses',      method: 'GET',  path: '/api/data/processes',          description: 'Top processes by CPU' },
  { id: 'captures',          method: 'GET',  path: '/api/captures',                description: 'Sysdig captures' },
  { id: 'alerts',            method: 'GET',  path: '/api/alerts',                  description: 'Active alerts' },
  { id: 'teams',             method: 'GET',  path: '/api/teams',                   description: 'Teams configured' },
  { id: 'licenseUsage',      method: 'GET',  path: '/api/license/usage',           description: 'License usage' },
];

// ---------------------------------------------------------

const sysdigPlugin: QueryPlugin = {
  systemName: 'sysdig',
  async executeQuery(query: string, method = 'GET', instance: any, opts) {
    const base = instance.baseUrl || instance.host || '';
    const url = buildUrl(base, query);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const cfg: any = instance.authConfig || {};
    if (cfg.token) {
      headers['Authorization'] = `Bearer ${cfg.token}`;
    }

    const res = await fetch(url, {
      method: method.toUpperCase(),
      headers,
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      throw new Error(`Sysdig API ${res.status}: ${typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data).slice(0, 200)}`);
    }
    return data;
  },
};

(sysdigPlugin as any).defaultQueries = sysdigDefaultQueries;

registerPlugin(sysdigPlugin);

export { sysdigPlugin }; 