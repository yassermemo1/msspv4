import { QueryPlugin, registerPlugin } from './plugin-manager';
import fetch from 'node-fetch';
// External system instances removed - deprecated

function buildUrl(base: string, path: string) {
  if (path.startsWith('http')) return path;
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

const confluencePlugin: QueryPlugin = {
  systemName: 'confluence',
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
    // In Confluence Cloud the API base is /wiki/rest/api
    const base = instance.baseUrl || '';
    const url = buildUrl(base, query);

    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    const cfg: any = instance.authConfig || {};
    if (instance.authType === 'basic' && cfg.username && cfg.apiToken) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${cfg.username}:${cfg.apiToken}`).toString('base64');
    } else if (instance.authType === 'bearer' && cfg.token) {
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
      throw new Error(`Confluence API ${res.status}: ${typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data).slice(0, 200)}`);
    }
    return data;
  },
};

registerPlugin(confluencePlugin);

// ---------------- Default Query Catalogue ----------------
interface ConfluenceQueryDef {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
}

export const confluenceDefaultQueries: ConfluenceQueryDef[] = [
  { id: 'listSpaces',     method: 'GET',  path: '/wiki/rest/api/space',            description: 'List spaces' },
  { id: 'getSpace',       method: 'GET',  path: '/wiki/rest/api/space/{spaceKey}', description: 'Get space details' },
  { id: 'listPages',      method: 'GET',  path: '/wiki/rest/api/content?type=page&spaceKey={spaceKey}', description: 'Pages in a space' },
  { id: 'getPage',        method: 'GET',  path: '/wiki/rest/api/content/{pageId}', description: 'Page content' },
  { id: 'listBlogs',      method: 'GET',  path: '/wiki/rest/api/content?type=blogpost', description: 'Blog posts' },
  { id: 'searchContent',  method: 'GET',  path: '/wiki/rest/api/search?cql={cql}', description: 'CQL search' },
  { id: 'recentUpdates',  method: 'GET',  path: '/wiki/rest/api/audit?offset=0&limit=20', description: 'Recent updates audit' },
  { id: 'attachments',    method: 'GET',  path: '/wiki/rest/api/content/{pageId}/child/attachment', description: 'Page attachments' },
  { id: 'labels',         method: 'GET',  path: '/wiki/rest/api/content/{pageId}/label', description: 'Page labels' },
  { id: 'licenseInfo',    method: 'GET',  path: '/wiki/rest/api/license',           description: 'License information' },
];

// Attach the catalogue to the plugin for discovery
(confluencePlugin as any).defaultQueries = confluenceDefaultQueries;

// --------------------------------------------------------- 