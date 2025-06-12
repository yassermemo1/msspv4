// Plugin registry for external query connectors

export interface QueryPlugin {
  /** canonical system key – must match external_systems.system_name */
  systemName: string;
  /**
   * Execute a query against a single instance.
   * @param query   Raw query text (JQL, AQL, SPL …)
   * @param method  Optional verb / method selector
   * @param instance External system instance row (dynamic shape)
   * @param opts    Additional parameters from frontend
   */
  executeQuery(
    query: string,
    method: string | undefined,
    instance: any,
    opts?: Record<string, any>
  ): Promise<unknown>;
}

const registry = new Map<string, QueryPlugin>();

export function registerPlugin(plugin: QueryPlugin) {
  registry.set(plugin.systemName.toLowerCase(), plugin);
}

export function getPlugin(systemName: string): QueryPlugin | undefined {
  return registry.get(systemName.toLowerCase());
}

export function listPlugins(): QueryPlugin[] {
  return Array.from(registry.values());
} 