import { PluginInstance } from './plugin-manager';
import https from 'https';

export function buildHttpsAgent(instance: PluginInstance): https.Agent | undefined {
  const sslConfig = instance.sslConfig || {};
  
  if (sslConfig.rejectUnauthorized === false || sslConfig.allowSelfSigned === true) {
    return new https.Agent({
      rejectUnauthorized: false
    });
  }
  
  return undefined;
}

export function buildFetchOptions(instance: PluginInstance, headers: Record<string, string>): any {
  const options: any = { headers };
  
  // Configure SSL/TLS options
  const agent = buildHttpsAgent(instance);
  if (agent) {
    options.agent = agent;
  }
  
  // Set timeout if specified
  const sslConfig = instance.sslConfig || {};
  if (sslConfig.timeout) {
    options.timeout = sslConfig.timeout;
  } else {
    options.timeout = 30000; // Default 30 second timeout
  }
  
  return options;
}

export function buildBasicHeaders(instance: PluginInstance, additionalHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { 'Accept': 'application/json', ...additionalHeaders };
  const cfg = instance.authConfig || {};
  
  if (instance.authType === 'basic' && cfg.username && cfg.password) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64');
  } else if (instance.authType === 'bearer' && cfg.token) {
    headers['Authorization'] = `Bearer ${cfg.token}`;
  } else if (instance.authType === 'api_key' && cfg.key) {
    const headerName = cfg.header || 'Authorization';
    headers[headerName] = cfg.key;
  }
  
  return headers;
} 