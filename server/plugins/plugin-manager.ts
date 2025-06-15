// Plugin registry for external query connectors - Self-Contained Architecture

export interface PluginConfig {
  instances: PluginInstance[];
  defaultRefreshInterval?: number;
  rateLimiting?: {
    requestsPerMinute: number;
    burstSize: number;
  };
}

export interface PluginInstance {
  id: string;
  name: string;
  baseUrl: string;
  authType: 'none' | 'basic' | 'bearer' | 'api_key';
  authConfig?: {
    username?: string;
    password?: string;
    token?: string;
    key?: string;
    header?: string;
  };
  isActive: boolean;
  tags?: string[];
}

export interface DefaultQueryDef {
  id: string;           // short identifier for UI widgets
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;         // raw REST path, may include {placeholders}
  description: string;  // human-readable label
}

export interface QueryPlugin {
  /** canonical system key – must match system name */
  systemName: string;
  
  /** Plugin configuration with instances */
  config: PluginConfig;
  
  /**
   * Execute a query against a specific instance.
   * @param query   Raw query text (JQL, AQL, SPL …)
   * @param method  Optional verb / method selector
   * @param instanceId Instance ID to use
   * @param opts    Additional parameters from frontend
   */
  executeQuery(
    query: string,
    method: string | undefined,
    instanceId: string,
    opts?: Record<string, any>
  ): Promise<unknown>;

  /** Optional catalogue of default queries exposed via the catalogue endpoint */
  defaultQueries?: DefaultQueryDef[];
  
  /** Get all instances for this plugin */
  getInstances(): PluginInstance[];
  
  /** Get specific instance by ID */
  getInstance(instanceId: string): PluginInstance | undefined;
}

const registry = new Map<string, QueryPlugin>();

export function registerPlugin(plugin: QueryPlugin) {
  // Ensure plugin has proper config structure
  if (!plugin.config) {
    plugin.config = { instances: [] };
  }
  if (!plugin.config.instances) {
    plugin.config.instances = [];
  }
  
  registry.set(plugin.systemName.toLowerCase(), plugin);
  const instanceCount = plugin.config.instances.length;
  console.log(`🔌 Registered plugin: ${plugin.systemName} with ${instanceCount} instances`);
}

export function getPlugin(systemName: string): QueryPlugin | undefined {
  return registry.get(systemName.toLowerCase());
}

export function listPlugins(): QueryPlugin[] {
  return Array.from(registry.values());
}

export function getAllInstances(): Array<{ pluginName: string; instance: PluginInstance }> {
  const allInstances: Array<{ pluginName: string; instance: PluginInstance }> = [];
  
  for (const plugin of registry.values()) {
    const instances = plugin.config?.instances || [];
    for (const instance of instances) {
      allInstances.push({
        pluginName: plugin.systemName,
        instance
      });
    }
  }
  
  return allInstances;
} 