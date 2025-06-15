import { QueryPlugin, registerPlugin } from './plugin-manager';
import fetch from 'node-fetch';
// External system instances removed - deprecated

function buildUrl(base: string, path: string) {
  if (path.startsWith('http')) return path;
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

// ---------------- Default Query Catalogue ----------------
interface VeeamQueryDef {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
}

export const veeamDefaultQueries: VeeamQueryDef[] = [
  { id: 'serverInfo',        method: 'GET',  path: '/api/serverInfo',              description: 'Server information' },
  { id: 'listJobs',          method: 'GET',  path: '/api/jobs',                    description: 'Backup jobs' },
  { id: 'jobSessions',       method: 'GET',  path: '/api/jobSessions',             description: 'Job sessions' },
  { id: 'repositories',      method: 'GET',  path: '/api/backupRepositories',      description: 'Backup repositories' },
  { id: 'restorePoints',     method: 'GET',  path: '/api/restorePoints',           description: 'Restore points' },
  { id: 'alarms',            method: 'GET',  path: '/api/alarms',                  description: 'Active alarms' },
  { id: 'protectedVMs',      method: 'GET',  path: '/api/protectedVMs',            description: 'Protected virtual machines' },
  { id: 'unprotectedVMs',    method: 'GET',  path: '/api/unprotectedVMs',          description: 'Unprotected virtual machines' },
  { id: 'capacityPlan',      method: 'GET',  path: '/api/capacityPlan',            description: 'Capacity planning' },
  { id: 'licenseInfo',       method: 'GET',  path: '/api/licenses',                description: 'License information' },
];

// ---------------------------------------------------------

const veeamPlugin: QueryPlugin = {
  systemName: 'veeam',
  async executeQuery(query: string, method = 'GET', instance: any, opts) {
    const base = instance.baseUrl || instance.host || '';
    const url = buildUrl(base, query);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const cfg: any = instance.authConfig || {};
    if (cfg.sessionId) {
      headers['X-RestSvcSessionId'] = cfg.sessionId;
    } else if (cfg.token) {
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
      throw new Error(`Veeam API ${res.status}: ${typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data).slice(0, 200)}`);
    }
    return data;
  },
};

(veeamPlugin as any).defaultQueries = veeamDefaultQueries;

registerPlugin(veeamPlugin); 