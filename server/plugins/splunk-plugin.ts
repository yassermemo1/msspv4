import { QueryPlugin, registerPlugin } from './plugin-manager';
import fetch from 'node-fetch';
import { ExternalSystemInstance } from '@shared/schema';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const splunkPlugin: QueryPlugin = {
  systemName: 'splunk',
  async executeQuery(query: string, _method: string | undefined, instance: ExternalSystemInstance) {
    const base = instance.baseUrl || instance.host || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    const cfg: any = instance.authConfig || {};
    if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`;

    // Step 1 create search job
    const searchUrl = `${base.replace(/\/$/, '')}/services/search/jobs`;
    const body = new URLSearchParams({ search: query }).toString();
    const createRes = await fetch(searchUrl, { method: 'POST', headers, body });
    if (!createRes.ok) throw new Error(`Splunk create job ${createRes.status}`);
    const xml = await createRes.text();
    const sidMatch = xml.match(/<sid>(.*?)<\/sid>/);
    if (!sidMatch) throw new Error('No sid returned');
    const sid = sidMatch[1];

    // Poll job status
    const statusUrl = `${searchUrl}/${sid}`;
    for (let i = 0; i < 20; i++) {
      await sleep(1000);
      const stat = await fetch(statusUrl, { headers });
      const statTxt = await stat.text();
      if (statTxt.includes('<s:key name="isDone">1</s:key>')) break;
      if (i === 19) throw new Error('Splunk job timeout');
    }

    // Fetch results
    const resUrl = `${statusUrl}/results?output_mode=json`;
    const res = await fetch(resUrl, { headers });
    if (!res.ok) throw new Error(`Splunk results ${res.status}`);
    return await res.json();
  }
};

registerPlugin(splunkPlugin); 