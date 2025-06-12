import { QueryPlugin, registerPlugin } from './plugin-manager';
import fetch from 'node-fetch';
import { ExternalSystemInstance } from '@shared/schema';

const jiraPlugin: QueryPlugin = {
  systemName: 'jira',
  async executeQuery(query: string, _method: string | undefined, instance: ExternalSystemInstance) {
    // Build JIRA search URL
    const base = instance.baseUrl || instance.host || '';
    const url = `${base.replace(/\/$/, '')}/rest/api/2/search?jql=${encodeURIComponent(query)}`;

    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };

    // Auth header
    const cfg: any = instance.authConfig || {};
    if (instance.authType === 'basic' && cfg.username && cfg.password) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64');
    } else if (instance.authType === 'bearer' && cfg.token) {
      headers['Authorization'] = `Bearer ${cfg.token}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Jira API ${res.status}`);
    const data = await res.json();
    return data; // issues array etc.
  }
};

registerPlugin(jiraPlugin); 