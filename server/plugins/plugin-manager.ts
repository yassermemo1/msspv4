// Plugin registry for external query connectors - Self-Contained Architecture

import fs from 'fs';
import path from 'path';

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
  sslConfig?: {
    rejectUnauthorized?: boolean;
    allowSelfSigned?: boolean;
    timeout?: number;
  };
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
const CONFIG_DIR = path.join(process.cwd(), 'server', 'plugins', 'configs');

// Ensure configuration directory exists
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    console.log(`📁 Created plugin config directory: ${CONFIG_DIR}`);
  }
}

// Load plugin configuration from file
function loadPluginConfig(pluginName: string): PluginConfig | null {
  try {
    const configPath = path.join(CONFIG_DIR, `${pluginName}.json`);
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      console.log(`📋 Loaded config for plugin: ${pluginName}`);
      return config;
    }
  } catch (error) {
    console.warn(`⚠️ Failed to load config for plugin ${pluginName}:`, error);
  }
  return null;
}

// Save plugin configuration to file
export function savePluginConfig(pluginName: string, config: PluginConfig): void {
  try {
    ensureConfigDir();
    const configPath = path.join(CONFIG_DIR, `${pluginName}.json`);
    const configData = JSON.stringify(config, null, 2);
    fs.writeFileSync(configPath, configData, 'utf8');
    console.log(`💾 Saved config for plugin: ${pluginName}`);
  } catch (error) {
    console.error(`❌ Failed to save config for plugin ${pluginName}:`, error);
    throw error;
  }
}

export function registerPlugin(plugin: QueryPlugin) {
  // Ensure plugin has proper config structure
  if (!plugin.config) {
    plugin.config = { instances: [] };
  }
  if (!plugin.config.instances) {
    plugin.config.instances = [];
  }
  
  // Try to load saved configuration
  const savedConfig = loadPluginConfig(plugin.systemName);
  if (savedConfig) {
    // Merge saved config with default config, preserving saved instances
    plugin.config = {
      ...plugin.config,
      ...savedConfig,
      instances: savedConfig.instances || []
    };
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

// Update plugin configuration and persist to file
export function updatePluginConfig(pluginName: string, config: PluginConfig): void {
  const plugin = getPlugin(pluginName);
  if (!plugin) {
    throw new Error(`Plugin '${pluginName}' not found`);
  }
  
  // Update in-memory configuration
  plugin.config = config;
  
  // Persist to file
  savePluginConfig(pluginName, config);
} 