import { ExternalWidgetDefinition, WidgetManifest } from './external-widget-registry';
import { getPlugin, PluginInstance } from '../plugins/plugin-manager';
import { pluginCache } from './plugin-cache';

export interface IntegrationEngineWidget {
  id: string;
  name: string;
  description: string;
  type: string;
  component: string;
  config: any;
  dataSource: string;
  apiEndpoint?: string;
  metadata: {
    author: string;
    version: string;
    category: string;
    tags: string[];
  };
}

export interface IntegrationEngineAuth {
  type: 'none' | 'basic' | 'bearer' | 'api_key';
  token?: string;
  key?: string;
  username?: string;
  password?: string;
  header?: string;
}

export class IntegrationEngineAdapter {
  private baseUrl: string;
  private auth?: IntegrationEngineAuth;
  private pluginName: string;
  private instanceId: string;

  constructor(pluginName: string, instanceId: string) {
    this.pluginName = pluginName;
    this.instanceId = instanceId;
    
    // Get the plugin instance configuration
    const plugin = getPlugin(pluginName);
    const instance = plugin?.getInstance(instanceId);
    
    if (!instance) {
      throw new Error(`Plugin instance not found: ${pluginName}/${instanceId}`);
    }
    
    this.baseUrl = instance.baseUrl;
    
    // Convert plugin auth to integration engine auth format
    if (instance.authType !== 'none' && instance.authConfig) {
      this.auth = {
        type: instance.authType,
        ...instance.authConfig
      };
    }
  }

  setAuth(auth: IntegrationEngineAuth) {
    this.auth = auth;
  }

  async testConnection(): Promise<{ success: boolean; message?: string; responseTime?: number }> {
    // Check cache first
    const cacheKey = { pluginName: this.pluginName, instanceId: this.instanceId };
    const cachedResult = pluginCache.getCachedConnectionStatus(cacheKey);
    
    if (cachedResult !== null) {
      return {
        success: cachedResult,
        message: cachedResult ? 'Connection successful (cached)' : 'Connection failed (cached)',
        responseTime: 0 // Cached result
      };
    }
    
    const startTime = Date.now();
    
    try {
      // Use the plugin's test connection functionality
      const plugin = getPlugin(this.pluginName);
      if (!plugin) {
        throw new Error(`Plugin not found: ${this.pluginName}`);
      }

      // For integration engine, we'll test with a simple health check query
      const result = await plugin.executeQuery('health_check', 'GET', this.instanceId);
      const responseTime = Date.now() - startTime;
      
      // Cache successful connection
      pluginCache.cacheConnectionStatus(cacheKey, true);
      
      return {
        success: true,
        message: 'Connection successful',
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Cache failed connection (shorter TTL)
      pluginCache.cacheConnectionStatus(cacheKey, false, 30000); // 30 seconds for failures
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
        responseTime
      };
    }
  }

  async getAvailableWidgets(): Promise<IntegrationEngineWidget[]> {
    try {
      const plugin = getPlugin(this.pluginName);
      if (!plugin) {
        throw new Error(`Plugin not found: ${this.pluginName}`);
      }

      // Get default queries and convert them to widgets
      const defaultQueries = plugin.defaultQueries || [];
      
      return defaultQueries.map(query => ({
        id: query.id,
        name: query.description,
        description: `Widget for ${query.description}`,
        type: 'data',
        component: 'generic-data-widget',
        config: {
          query: query.id,
          method: query.method,
          path: query.path
        },
        dataSource: this.pluginName,
        apiEndpoint: query.path,
        metadata: {
          author: 'Plugin System',
          version: '1.0.0',
          category: this.pluginName,
          tags: [this.pluginName, 'auto-generated']
        }
      }));
    } catch (error) {
      console.error('Failed to get available widgets:', error);
      return [];
    }
  }

  async getWidget(widgetId: string): Promise<IntegrationEngineWidget | null> {
    try {
      const widgets = await this.getAvailableWidgets();
      return widgets.find(w => w.id === widgetId) || null;
    } catch (error) {
      console.error('Failed to get widget:', error);
      return null;
    }
  }

  async getWidgetData(widget: IntegrationEngineWidget, params: any = {}): Promise<any> {
    // Check cache first
    const cacheKey = {
      pluginName: this.pluginName,
      instanceId: this.instanceId,
      queryId: widget.config.query,
      parameters: params
    };
    
    const cachedResult = pluginCache.getCachedQueryResult(cacheKey);
    if (cachedResult) {
      return {
        ...cachedResult,
        cached: true,
        timestamp: new Date().toISOString()
      };
    }
    
    try {
      const plugin = getPlugin(this.pluginName);
      if (!plugin) {
        throw new Error(`Plugin not found: ${this.pluginName}`);
      }

      // Execute the widget's query
      const result = await plugin.executeQuery(
        widget.config.query,
        widget.config.method,
        this.instanceId,
        params
      );

      const response = {
        success: true,
        data: result,
        widget: widget.name,
        timestamp: new Date().toISOString(),
        metadata: {
          pluginName: this.pluginName,
          instanceId: this.instanceId,
          queryId: widget.config.query
        }
      };
      
      // Cache successful result
      pluginCache.cacheQueryResult(cacheKey, response);
      
      return response;
    } catch (error) {
      const errorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        widget: widget.name,
        timestamp: new Date().toISOString()
      };
      
      // Cache error result with shorter TTL
      pluginCache.cacheQueryResult(cacheKey, errorResponse, 60000); // 1 minute for errors
      
      return errorResponse;
    }
  }

  async renderWidget(widget: IntegrationEngineWidget, config: any = {}): Promise<string> {
    try {
      const data = await this.getWidgetData(widget, config);
      
      // Generate basic HTML for the widget
      const html = `
        <div class="integration-engine-widget" data-widget-id="${widget.id}">
          <div class="widget-header">
            <h3>${widget.name}</h3>
            <span class="widget-type">${widget.type}</span>
          </div>
          <div class="widget-content">
            ${data.success ? 
              `<pre>${JSON.stringify(data.data, null, 2)}</pre>` : 
              `<div class="error">Error: ${data.error}</div>`
            }
          </div>
          <div class="widget-footer">
            <small>Last updated: ${data.timestamp}</small>
          </div>
        </div>
      `;
      
      return html;
    } catch (error) {
      return `<div class="widget-error">Failed to render widget: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
    }
  }

  async getDashboards(): Promise<any[]> {
    try {
      const widgets = await this.getAvailableWidgets();
      
      // Create a default dashboard with all available widgets
      return [{
        id: `${this.pluginName}-default`,
        name: `${this.pluginName} Dashboard`,
        description: `Auto-generated dashboard for ${this.pluginName} plugin`,
        layout: {
          columns: 2,
          rows: Math.ceil(widgets.length / 2)
        },
        widgets: widgets.map((widget, index) => ({
          ...widget,
          position: {
            x: index % 2,
            y: Math.floor(index / 2),
            width: 1,
            height: 1
          }
        }))
      }];
    } catch (error) {
      console.error('Failed to get dashboards:', error);
      return [];
    }
  }

  /**
   * Convert integration engine widget to external widget definition
   */
  convertToExternalWidgetDefinition(
    widget: IntegrationEngineWidget, 
    pluginInstance: PluginInstance
  ): ExternalWidgetDefinition {
    return {
      id: `${this.pluginName}.${widget.id}`,
      name: widget.name,
      description: widget.description,
      version: widget.metadata?.version || '1.0.0',
      author: widget.metadata?.author || 'Plugin System',
      source: {
        systemName: this.pluginName,
        displayName: this.pluginName,
        baseUrl: pluginInstance.baseUrl,
        authType: pluginInstance.authType,
        isActive: pluginInstance.isActive
      },
      manifestUrl: `${this.baseUrl}/api/widgets/${widget.id}/manifest`,
      widgetUrl: `${this.baseUrl}/api/widgets/${widget.id}/component`,
      configSchema: widget.config || {},
      capabilities: {
        realTime: widget.type === 'realtime' || widget.dataSource === 'realtime',
        interactive: true,
        configurable: !!widget.config,
        responsive: true,
        themeable: true,
        exportable: true,
        sizes: ['small', 'medium', 'large', 'xlarge']
      },
      dependencies: [],
      security: {
        sandbox: true,
        permissions: ['network'],
        csp: "default-src 'self'",
        allowedDomains: [new URL(this.baseUrl).hostname]
      },
      metadata: {
        category: widget.metadata?.category || 'plugin',
        tags: widget.metadata?.tags || [],
        featured: false,
        rating: 0,
        downloads: 0,
        lastUpdated: new Date()
      },
      defaultConfig: widget.config || {},
      thumbnailUrl: `${this.baseUrl}/api/widgets/${widget.id}/thumbnail`,
      documentationUrl: `${this.baseUrl}/api/widgets/${widget.id}/docs`
    };
  }

  /**
   * Create adapter from plugin name and instance ID
   */
  static fromPlugin(pluginName: string, instanceId: string): IntegrationEngineAdapter {
    return new IntegrationEngineAdapter(pluginName, instanceId);
  }

  /**
   * Get all available adapters from registered plugins
   */
  static getAllAdapters(): IntegrationEngineAdapter[] {
    const { getAllInstances } = require('../plugins/plugin-manager');
    const instances = getAllInstances();
    
    return instances.map(({ pluginName, instance }) => 
      new IntegrationEngineAdapter(pluginName, instance.id)
    );
  }
}

// No global instance needed - create instances as needed with specific plugin/instance IDs 