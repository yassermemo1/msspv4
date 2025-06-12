import { QueryPlugin, registerPlugin } from './plugin-manager';
import fetch from 'node-fetch';
import { ExternalSystemInstance } from '@shared/schema';

const elasticPlugin: QueryPlugin = {
  systemName: 'elastic',
  async executeQuery(query: string, _method: string | undefined, instance: ExternalSystemInstance) {
    const base = instance.baseUrl || instance.host || '';
    const url = `${base.replace(/\/$/, '')}/_search`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const cfg: any = instance.authConfig || {};
    if (instance.authType === 'basic' && cfg.username && cfg.password) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64');
    }

    // If user passed raw text assume JSON string, else wrap as query_string
    let body: any;
    try {
      body = JSON.parse(query);
    } catch {
      body = {
        query: { query_string: { query } }
      };
    }

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Elastic API ${res.status}`);
    return await res.json();
  }
};

registerPlugin(elasticPlugin); 