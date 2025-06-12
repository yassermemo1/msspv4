import { QueryPlugin, registerPlugin } from './plugin-manager';
import fetch from 'node-fetch';
import { ExternalSystemInstance } from '@shared/schema';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const qradarPlugin: QueryPlugin = {
  systemName: 'qradar',
  async executeQuery(query: string, _method: string | undefined, instance: ExternalSystemInstance) {
    const base = instance.baseUrl || instance.host || '';

    const headers: Record<string, string> = {
      'SEC': (instance.authConfig as any)?.token || '',
      'Version': '12.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    // Step 1: create search
    const searchesUrl = `${base.replace(/\/$/, '')}/api/ariel/searches`; // API path
    const createRes = await fetch(searchesUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query_expression: query })
    });
    if (!createRes.ok) throw new Error(`QRadar create search ${createRes.status}`);
    const { search_id } = await createRes.json();

    // Poll status
    const statusUrl = `${searchesUrl}/${search_id}`;
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      const statRes = await fetch(statusUrl, { headers });
      const stat = await statRes.json();
      if (stat.status === 'COMPLETED') break;
      if (stat.status === 'ERROR') throw new Error('QRadar search error');
      if (i === 29) throw new Error('QRadar search timeout');
    }

    // Get results
    const resUrl = `${statusUrl}/results`; // default JSON
    const res = await fetch(resUrl, { headers });
    if (!res.ok) throw new Error(`QRadar results ${res.status}`);
    return await res.json();
  }
};

registerPlugin(qradarPlugin); 