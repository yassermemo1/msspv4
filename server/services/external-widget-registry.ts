import { ExternalSystem } from '../types/external-systems.ts';

export interface ExternalWidgetDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  source: ExternalSystem;
  manifestUrl: string;
  widgetUrl: string;
  configSchema?: any;
  capabilities: WidgetCapabilities;
  dependencies: string[];
  security: SecurityPolicy;
  metadata: WidgetMetadata;
  defaultConfig?: any;
  thumbnailUrl?: string;
  documentationUrl?: string;
}

export interface WidgetCapabilities {
  realTime: boolean;
  interactive: boolean;
  configurable: boolean;
  responsive: boolean;
  themeable: boolean;
  exportable: boolean;
  sizes: Array<'small' | 'medium' | 'large' | 'xlarge'>;
}

export interface SecurityPolicy {
  sandbox: boolean;
  permissions: Permission[];
  csp: string;
  allowedDomains: string[];
  maxResourceUsage?: ResourceLimits;
}

export interface Permission {
  type: 'network' | 'storage' | 'notification' | 'location';
  scope: string;
  access: 'read' | 'write' | 'readwrite';
}

export interface ResourceLimits {
  maxMemory: number; // MB
  maxCpu: number; // percentage
  maxRequests: number; // per minute
}

export interface WidgetMetadata {
  category: string;
  tags: string[];
  featured: boolean;
  rating: number;
  downloads: number;
  lastUpdated: Date;
}

export interface WidgetManifest {
  widget: {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
  };
  runtime: {
    type: 'react' | 'vue' | 'vanilla';
    entry: string;
    styles?: string;
    dependencies: string[];
  };
  configuration?: {
    schema?: string;
    defaults?: string;
    ui?: string;
  };
  capabilities: WidgetCapabilities;
  security: SecurityPolicy;
  api?: {
    endpoints: Array<{
      name: string;
      url: string;
      method: string;
      auth: string;
    }>;
  };
}

export class ExternalWidgetRegistry {
  private widgets: Map<string, ExternalWidgetDefinition> = new Map();
  private manifests: Map<string, WidgetManifest> = new Map();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Discover widgets from an external system
   */
  async discoverWidgets(systemConfig: ExternalSystem): Promise<ExternalWidgetDefinition[]> {
    try {
      console.log(`🔍 Discovering widgets from ${systemConfig.displayName}`);
      
      // Try multiple manifest locations
      const manifestUrls = [
        `${systemConfig.baseUrl}/widgets/manifest.json`,
        `${systemConfig.baseUrl}/api/widgets/manifest`,
        `${systemConfig.baseUrl}/.well-known/widgets.json`
      ];

      let manifest: WidgetManifest | null = null;
      
      for (const manifestUrl of manifestUrls) {
        try {
          manifest = await this.fetchManifest(manifestUrl, systemConfig);
          if (manifest) break;
        } catch (error) {
          console.log(`   ❌ Failed to fetch from ${manifestUrl}`);
        }
      }

      if (!manifest) {
        console.log(`   ⚠️  No widget manifest found for ${systemConfig.displayName}`);
        return [];
      }

      // Parse and validate widgets
      const widgets = await this.parseManifest(manifest, systemConfig);
      
      // Register widgets
      widgets.forEach(widget => this.registerWidget(widget));
      
      console.log(`   ✅ Discovered ${widgets.length} widgets`);
      return widgets;

    } catch (error) {
      console.error(`Failed to discover widgets from ${systemConfig.displayName}:`, error);
      return [];
    }
  }

  /**
   * Fetch widget manifest from external system
   */
  private async fetchManifest(manifestUrl: string, systemConfig: ExternalSystem): Promise<WidgetManifest | null> {
    const cacheKey = `manifest:${manifestUrl}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'MSSP-Widget-Registry/1.0'
      };

      // Add authentication headers
      if (systemConfig.authType === 'bearer' && systemConfig.authConfig?.token) {
        headers['Authorization'] = `Bearer ${systemConfig.authConfig.token}`;
      } else if (systemConfig.authType === 'api_key' && systemConfig.authConfig?.key) {
        const headerName = systemConfig.authConfig.header || 'X-API-Key';
        headers[headerName] = systemConfig.authConfig.key;
      } else if (systemConfig.authType === 'basic' && systemConfig.authConfig?.username) {
        const credentials = Buffer.from(
          `${systemConfig.authConfig.username}:${systemConfig.authConfig.password || ''}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const response = await fetch(manifestUrl, {
        method: 'GET',
        headers,
        timeout: 10000 // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const manifest = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, { data: manifest, timestamp: Date.now() });
      
      return manifest;

    } catch (error) {
      console.error(`Failed to fetch manifest from ${manifestUrl}:`, error.message);
      return null;
    }
  }

  /**
   * Parse manifest and create widget definitions
   */
  private async parseManifest(manifest: WidgetManifest, systemConfig: ExternalSystem): Promise<ExternalWidgetDefinition[]> {
    const widgets: ExternalWidgetDefinition[] = [];

    // Handle single widget manifest
    if (manifest.widget) {
      const widget = await this.createWidgetDefinition(manifest, systemConfig);
      if (widget) widgets.push(widget);
    }

    // Handle multiple widgets manifest
    if (Array.isArray(manifest)) {
      for (const widgetManifest of manifest) {
        const widget = await this.createWidgetDefinition(widgetManifest, systemConfig);
        if (widget) widgets.push(widget);
      }
    }

    return widgets;
  }

  /**
   * Create widget definition from manifest
   */
  private async createWidgetDefinition(
    manifest: WidgetManifest, 
    systemConfig: ExternalSystem
  ): Promise<ExternalWidgetDefinition | null> {
    try {
      const baseUrl = systemConfig.baseUrl.replace(/\/$/, '');
      
      return {
        id: `${systemConfig.systemName}.${manifest.widget.id}`,
        name: manifest.widget.name,
        description: manifest.widget.description,
        version: manifest.widget.version,
        author: manifest.widget.author,
        source: systemConfig,
        manifestUrl: `${baseUrl}/widgets/manifest.json`,
        widgetUrl: `${baseUrl}/widgets/${manifest.runtime.entry}`,
        configSchema: manifest.configuration?.schema ? 
          await this.fetchConfigSchema(`${baseUrl}/widgets/${manifest.configuration.schema}`, systemConfig) : 
          undefined,
        capabilities: manifest.capabilities,
        dependencies: manifest.runtime.dependencies || [],
        security: manifest.security,
        metadata: {
          category: 'external',
          tags: [],
          featured: false,
          rating: 0,
          downloads: 0,
          lastUpdated: new Date()
        },
        defaultConfig: manifest.configuration?.defaults ? 
          await this.fetchDefaultConfig(`${baseUrl}/widgets/${manifest.configuration.defaults}`, systemConfig) : 
          {},
        thumbnailUrl: `${baseUrl}/widgets/thumbnail.png`,
        documentationUrl: `${baseUrl}/widgets/docs`
      };
    } catch (error) {
      console.error('Failed to create widget definition:', error);
      return null;
    }
  }

  /**
   * Fetch widget configuration schema
   */
  private async fetchConfigSchema(schemaUrl: string, systemConfig: ExternalSystem): Promise<any> {
    try {
      const response = await this.authenticatedFetch(schemaUrl, systemConfig);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch config schema:', error);
      return {};
    }
  }

  /**
   * Fetch default configuration
   */
  private async fetchDefaultConfig(configUrl: string, systemConfig: ExternalSystem): Promise<any> {
    try {
      const response = await this.authenticatedFetch(configUrl, systemConfig);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch default config:', error);
      return {};
    }
  }

  /**
   * Make authenticated fetch request
   */
  private async authenticatedFetch(url: string, systemConfig: ExternalSystem): Promise<Response> {
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };

    // Add authentication
    if (systemConfig.authType === 'bearer' && systemConfig.authConfig?.token) {
      headers['Authorization'] = `Bearer ${systemConfig.authConfig.token}`;
    } else if (systemConfig.authType === 'api_key' && systemConfig.authConfig?.key) {
      const headerName = systemConfig.authConfig.header || 'X-API-Key';
      headers[headerName] = systemConfig.authConfig.key;
    } else if (systemConfig.authType === 'basic' && systemConfig.authConfig?.username) {
      const credentials = Buffer.from(
        `${systemConfig.authConfig.username}:${systemConfig.authConfig.password || ''}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return fetch(url, { headers, timeout: 5000 });
  }

  /**
   * Register a widget in the registry
   */
  registerWidget(widget: ExternalWidgetDefinition): void {
    this.widgets.set(widget.id, widget);
    console.log(`   📦 Registered widget: ${widget.name} (${widget.id})`);
  }

  /**
   * Get all registered widgets
   */
  getAllWidgets(): ExternalWidgetDefinition[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Get widgets by system
   */
  getWidgetsBySystem(systemId: number): ExternalWidgetDefinition[] {
    return Array.from(this.widgets.values()).filter(
      widget => widget.source.id === systemId
    );
  }

  /**
   * Get widget by ID
   */
  getWidget(widgetId: string): ExternalWidgetDefinition | undefined {
    return this.widgets.get(widgetId);
  }

  /**
   * Remove widgets for a system
   */
  removeWidgetsForSystem(systemId: number): void {
    for (const [id, widget] of this.widgets.entries()) {
      if (widget.source.id === systemId) {
        this.widgets.delete(id);
        console.log(`   🗑️  Removed widget: ${widget.name} (${id})`);
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Health check for external widgets
   */
  async healthCheck(): Promise<{ healthy: number; total: number; details: any[] }> {
    const widgets = this.getAllWidgets();
    const results = [];
    let healthy = 0;

    for (const widget of widgets) {
      try {
        const response = await fetch(widget.widgetUrl, { 
          method: 'HEAD',
          timeout: 5000 
        });
        
        const isHealthy = response.ok;
        if (isHealthy) healthy++;
        
        results.push({
          id: widget.id,
          name: widget.name,
          healthy: isHealthy,
          status: response.status,
          responseTime: Date.now() // Should measure actual response time
        });
      } catch (error) {
        results.push({
          id: widget.id,
          name: widget.name,
          healthy: false,
          error: error.message
        });
      }
    }

    return {
      healthy,
      total: widgets.length,
      details: results
    };
  }
}

// Global registry instance
export const externalWidgetRegistry = new ExternalWidgetRegistry(); 