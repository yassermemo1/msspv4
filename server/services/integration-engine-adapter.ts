import { ExternalWidgetDefinition, WidgetManifest } from './external-widget-registry.js';
import { ExternalSystem } from '../types/external-systems.js';

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

export interface IntegrationEngineDashboard {
  id: string;
  name: string;
  widgets: IntegrationEngineWidget[];
  layout: any;
}

export class IntegrationEngineAdapter {
  private baseUrl: string;
  private authHeaders: Record<string, string> = {};

  constructor(baseUrl: string = 'http://localhost:5001/integration-engine') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Set authentication for the integration engine
   */
  setAuth(authConfig: { type: 'bearer' | 'api_key' | 'basic'; token?: string; key?: string; username?: string; password?: string }) {
    this.authHeaders = {};
    
    switch (authConfig.type) {
      case 'bearer':
        if (authConfig.token) {
          this.authHeaders['Authorization'] = `Bearer ${authConfig.token}`;
        }
        break;
      case 'api_key':
        if (authConfig.key) {
          this.authHeaders['X-API-Key'] = authConfig.key;
        }
        break;
      case 'basic':
        if (authConfig.username && authConfig.password) {
          const credentials = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
          this.authHeaders['Authorization'] = `Basic ${credentials}`;
        }
        break;
    }
  }

  /**
   * Test connection to the integration engine
   */
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const response = await this.makeRequest('/health');
      return {
        success: true,
        message: 'Connection successful',
        data: response
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  /**
   * Get all available widgets from the integration engine
   */
  async getAvailableWidgets(): Promise<IntegrationEngineWidget[]> {
    try {
      // Try multiple possible endpoints for widgets
      const endpoints = [
        '/api/widgets',
        '/widgets',
        '/api/v1/widgets',
        '/dashboard/widgets'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await this.makeRequest(endpoint);
          let widgets = response;
          
          // Handle different response formats
          if (Array.isArray(response)) {
            widgets = response;
          } else if (response && Array.isArray(response.widgets)) {
            widgets = response.widgets;
          } else {
            console.log(`❌ No widgets found at ${endpoint} (unexpected format)`);
            continue;
          }
          
            console.log(`✅ Found widgets at ${endpoint}:`, widgets.length);
            return widgets;
        } catch (error) {
          console.log(`❌ No widgets found at ${endpoint}: ${error.message}`);
        }
      }

      // If no widgets endpoint found, try to get dashboards and extract widgets
      const dashboards = await this.getDashboards();
      const allWidgets: IntegrationEngineWidget[] = [];
      
      dashboards.forEach(dashboard => {
        if (dashboard.widgets) {
          allWidgets.push(...dashboard.widgets);
        }
      });

      return allWidgets;
    } catch (error) {
      console.error('Failed to get available widgets:', error);
      return [];
    }
  }

  /**
   * Get all dashboards from the integration engine
   */
  async getDashboards(): Promise<IntegrationEngineDashboard[]> {
    try {
      const endpoints = [
        '/api/dashboards',
        '/dashboards',
        '/api/v1/dashboards'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await this.makeRequest(endpoint);
          let dashboards = response;
          
          // Handle different response formats
          if (Array.isArray(response)) {
            dashboards = response;
          } else if (response && Array.isArray(response.dashboards)) {
            dashboards = response.dashboards;
          } else {
            console.log(`❌ No dashboards found at ${endpoint} (unexpected format)`);
            continue;
          }
          
            console.log(`✅ Found dashboards at ${endpoint}:`, dashboards.length);
            return dashboards;
        } catch (error) {
          console.log(`❌ No dashboards found at ${endpoint}: ${error.message}`);
        }
      }

      return [];
    } catch (error) {
      console.error('Failed to get dashboards:', error);
      return [];
    }
  }

  /**
   * Get a specific widget's configuration and data
   */
  async getWidget(widgetId: string): Promise<IntegrationEngineWidget | null> {
    try {
      const endpoints = [
        `/api/widgets/${widgetId}`,
        `/widgets/${widgetId}`,
        `/api/v1/widgets/${widgetId}`
      ];

      for (const endpoint of endpoints) {
        try {
          const widget = await this.makeRequest(endpoint);
          if (widget && widget.id) {
            return widget;
          }
        } catch (error) {
          // Continue to next endpoint
        }
      }

      return null;
    } catch (error) {
      console.error(`Failed to get widget ${widgetId}:`, error);
      return null;
    }
  }

  /**
   * Get widget data from its data source
   */
  async getWidgetData(widget: IntegrationEngineWidget, params: any = {}): Promise<any> {
    try {
      let endpoint = widget.apiEndpoint || `/api/widgets/${widget.id}/data`;
      
      // Add query parameters
      if (Object.keys(params).length > 0) {
        const queryString = new URLSearchParams(params).toString();
        endpoint += `?${queryString}`;
      }

      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error(`Failed to get data for widget ${widget.id}:`, error);
      throw error;
    }
  }

  /**
   * Render widget HTML/React component
   */
  async renderWidget(widget: IntegrationEngineWidget, config: any = {}): Promise<string> {
    try {
      const endpoint = `/api/widgets/${widget.id}/render`;
      const response = await this.makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ config })
      });

      if (typeof response === 'string') {
        return response;
      } else if (response.html) {
        return response.html;
      } else if (response.component) {
        return response.component;
      }

      return JSON.stringify(response);
    } catch (error) {
      console.error(`Failed to render widget ${widget.id}:`, error);
      // Return a fallback component
      return `
        <div class="widget-error">
          <h3>${widget.name}</h3>
          <p>Failed to load widget: ${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * Convert integration engine widget to external widget definition
   */
  convertToExternalWidgetDefinition(
    widget: IntegrationEngineWidget, 
    systemConfig: ExternalSystem
  ): ExternalWidgetDefinition {
    return {
      id: `${systemConfig.systemName}.${widget.id}`,
      name: widget.name,
      description: widget.description,
      version: widget.metadata?.version || '1.0.0',
      author: widget.metadata?.author || 'Integration Engine',
      source: systemConfig,
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
        category: widget.metadata?.category || 'external',
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
   * Make authenticated request to integration engine
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...this.authHeaders,
      ...options.headers
    };

    console.log(`🔗 Making request to: ${url}`);

    const response = await fetch(url, {
      ...options,
      headers,
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  }

  /**
   * Get widget manifest for external widget registry
   */
  async getWidgetManifest(widgetId: string): Promise<WidgetManifest | null> {
    try {
      const widget = await this.getWidget(widgetId);
      if (!widget) return null;

      // Convert integration engine widget to standard manifest format
      return {
        widget: {
          id: widget.id,
          name: widget.name,
          version: widget.metadata?.version || '1.0.0',
          description: widget.description,
          author: widget.metadata?.author || 'Integration Engine',
          license: 'MIT'
        },
        runtime: {
          type: 'react',
          entry: `./widgets/${widget.id}/component.js`,
          dependencies: []
        },
        configuration: {
          schema: `./widgets/${widget.id}/config-schema.json`,
          defaults: `./widgets/${widget.id}/default-config.json`
        },
        capabilities: {
          realTime: widget.type === 'realtime',
          interactive: true,
          configurable: !!widget.config,
          responsive: true,
          themeable: true,
          exportable: true,
          sizes: ['small', 'medium', 'large', 'xlarge']
        },
        security: {
          sandbox: true,
          permissions: ['network'],
          csp: "default-src 'self'",
          allowedDomains: [new URL(this.baseUrl).hostname]
        }
      };
    } catch (error) {
      console.error(`Failed to get widget manifest for ${widgetId}:`, error);
      return null;
    }
  }
}

// Global instance
export const integrationEngineAdapter = new IntegrationEngineAdapter(); 