import { QueryPlugin, registerPlugin } from './plugin-manager';
import fetch from 'node-fetch';
import { ExternalSystemInstance } from '@shared/schema';

const grafanaPlugin: QueryPlugin = {
  systemName: 'grafana',
  async executeQuery(query: string, method: string | undefined, instance: ExternalSystemInstance, opts) {
    // In Grafana, queries go to /api/ds/query with datasource id or UID
    const base = instance.baseUrl || instance.host || '';
    const url = `${base.replace(/\/$/, '')}/api/ds/query`;

    const cfg: any = instance.authConfig || {};
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`;

    const datasourceUid = opts?.datasourceUid || cfg.datasourceUid;
    if (!datasourceUid) throw new Error('Missing datasourceUid for Grafana query');

    const body = {
      queries: [
        {
          refId: 'A',
          datasource: { uid: datasourceUid },
          expr: query,
          // Additional method (eg, instant or range)
          ...(method ? { queryType: method } : {})
        }
      ],
      from: opts?.from || 'now-1h',
      to: opts?.to || 'now'
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Grafana API ${res.status}`);
    return await res.json();
  }
};

registerPlugin(grafanaPlugin); 