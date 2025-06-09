import { Router } from 'express';
import { storage } from '../storage.js';
import { integrationEngineAdapter } from '../services/integration-engine-adapter.js';

// Authentication middleware - temporarily disabled for testing
function requireAuth(req: any, res: any, next: any) {
  // Temporarily bypass authentication for testing
  next();
}

const router = Router();

/**
 * Test connection to integration engine for a specific system
 */
router.get("/:systemId/test", requireAuth, async (req, res) => {
  try {
    const systemId = parseInt(req.params.systemId);
    const system = await storage.getExternalSystem(systemId);
    
    if (!system) {
      return res.status(404).json({ message: "External system not found" });
    }

    // Configure the adapter for this system
    const adapter = new (await import('../services/integration-engine-adapter.js')).IntegrationEngineAdapter(system.baseUrl);
    
    if (system.authType !== 'none' && system.authConfig) {
      adapter.setAuth({
        type: system.authType as any,
        token: system.authConfig.token,
        key: system.authConfig.key,
        username: system.authConfig.username,
        password: system.authConfig.password
      });
    }

    const result = await adapter.testConnection();
    res.json(result);
  } catch (error) {
    console.error("Integration engine test error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to test integration engine connection",
      error: error.message 
    });
  }
});

/**
 * Get all widgets from integration engine
 */
router.get("/:systemId/widgets", requireAuth, async (req, res) => {
  try {
    const systemId = parseInt(req.params.systemId);
    const system = await storage.getExternalSystem(systemId);
    
    if (!system) {
      return res.status(404).json({ message: "External system not found" });
    }

    // Configure the adapter for this system
    const adapter = new (await import('../services/integration-engine-adapter.js')).IntegrationEngineAdapter(system.baseUrl);
    
    if (system.authType !== 'none' && system.authConfig) {
      adapter.setAuth({
        type: system.authType as any,
        token: system.authConfig.token,
        key: system.authConfig.key,
        username: system.authConfig.username,
        password: system.authConfig.password
      });
    }

    const widgets = await adapter.getAvailableWidgets();
    
    res.json({
      systemId,
      systemName: system.displayName,
      widgets,
      count: widgets.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Get integration engine widgets error:", error);
    res.status(500).json({ message: "Failed to fetch widgets from integration engine" });
  }
});

/**
 * Get specific widget from integration engine
 */
router.get("/:systemId/widgets/:widgetId", requireAuth, async (req, res) => {
  try {
    const systemId = parseInt(req.params.systemId);
    const widgetId = req.params.widgetId;
    const system = await storage.getExternalSystem(systemId);
    
    if (!system) {
      return res.status(404).json({ message: "External system not found" });
    }

    const adapter = new (await import('../services/integration-engine-adapter.js')).IntegrationEngineAdapter(system.baseUrl);
    
    if (system.authType !== 'none' && system.authConfig) {
      adapter.setAuth({
        type: system.authType as any,
        token: system.authConfig.token,
        key: system.authConfig.key,
        username: system.authConfig.username,
        password: system.authConfig.password
      });
    }

    const widget = await adapter.getWidget(widgetId);
    
    if (!widget) {
      return res.status(404).json({ message: "Widget not found" });
    }
    
    res.json(widget);
  } catch (error) {
    console.error("Get integration engine widget error:", error);
    res.status(500).json({ message: "Failed to fetch widget from integration engine" });
  }
});

/**
 * Get widget data from integration engine
 */
router.get("/:systemId/widgets/:widgetId/data", requireAuth, async (req, res) => {
  try {
    const systemId = parseInt(req.params.systemId);
    const widgetId = req.params.widgetId;
    const system = await storage.getExternalSystem(systemId);
    
    if (!system) {
      return res.status(404).json({ message: "External system not found" });
    }

    const adapter = new (await import('../services/integration-engine-adapter.js')).IntegrationEngineAdapter(system.baseUrl);
    
    if (system.authType !== 'none' && system.authConfig) {
      adapter.setAuth({
        type: system.authType as any,
        token: system.authConfig.token,
        key: system.authConfig.key,
        username: system.authConfig.username,
        password: system.authConfig.password
      });
    }

    const widget = await adapter.getWidget(widgetId);
    
    if (!widget) {
      return res.status(404).json({ message: "Widget not found" });
    }

    const data = await adapter.getWidgetData(widget, req.query);
    
    res.json(data);
  } catch (error) {
    console.error("Get widget data error:", error);
    res.status(500).json({ message: "Failed to fetch widget data" });
  }
});

/**
 * Render widget HTML from integration engine
 */
router.post("/:systemId/widgets/:widgetId/render", requireAuth, async (req, res) => {
  try {
    const systemId = parseInt(req.params.systemId);
    const widgetId = req.params.widgetId;
    const { config = {}, data } = req.body;
    const system = await storage.getExternalSystem(systemId);
    
    if (!system) {
      return res.status(404).json({ message: "External system not found" });
    }

    const adapter = new (await import('../services/integration-engine-adapter.js')).IntegrationEngineAdapter(system.baseUrl);
    
    if (system.authType !== 'none' && system.authConfig) {
      adapter.setAuth({
        type: system.authType as any,
        token: system.authConfig.token,
        key: system.authConfig.key,
        username: system.authConfig.username,
        password: system.authConfig.password
      });
    }

    const widget = await adapter.getWidget(widgetId);
    
    if (!widget) {
      return res.status(404).json({ message: "Widget not found" });
    }

    const html = await adapter.renderWidget(widget, config);
    
    res.json({ 
      html, 
      widget: widget.name,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error("Render widget error:", error);
    res.status(500).json({ message: "Failed to render widget" });
  }
});

/**
 * Get all dashboards from integration engine
 */
router.get("/:systemId/dashboards", requireAuth, async (req, res) => {
  try {
    const systemId = parseInt(req.params.systemId);
    const system = await storage.getExternalSystem(systemId);
    
    if (!system) {
      return res.status(404).json({ message: "External system not found" });
    }

    const adapter = new (await import('../services/integration-engine-adapter.js')).IntegrationEngineAdapter(system.baseUrl);
    
    if (system.authType !== 'none' && system.authConfig) {
      adapter.setAuth({
        type: system.authType as any,
        token: system.authConfig.token,
        key: system.authConfig.key,
        username: system.authConfig.username,
        password: system.authConfig.password
      });
    }

    const dashboards = await adapter.getDashboards();
    
    res.json({
      systemId,
      systemName: system.displayName,
      dashboards,
      count: dashboards.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Get integration engine dashboards error:", error);
    res.status(500).json({ message: "Failed to fetch dashboards from integration engine" });
  }
});

/**
 * Import widgets from integration engine dashboard
 */
router.post("/:systemId/dashboards/:dashboardId/import", requireAuth, async (req, res) => {
  try {
    const systemId = parseInt(req.params.systemId);
    const dashboardId = req.params.dashboardId;
    const system = await storage.getExternalSystem(systemId);
    
    if (!system) {
      return res.status(404).json({ message: "External system not found" });
    }

    const adapter = new (await import('../services/integration-engine-adapter.js')).IntegrationEngineAdapter(system.baseUrl);
    
    if (system.authType !== 'none' && system.authConfig) {
      adapter.setAuth({
        type: system.authType as any,
        token: system.authConfig.token,
        key: system.authConfig.key,
        username: system.authConfig.username,
        password: system.authConfig.password
      });
    }

    const dashboards = await adapter.getDashboards();
    const dashboard = dashboards.find(d => d.id === dashboardId);
    
    if (!dashboard) {
      return res.status(404).json({ message: "Dashboard not found" });
    }

    // Convert widgets to external widget definitions
    const externalWidgets = dashboard.widgets.map(widget => 
      adapter.convertToExternalWidgetDefinition(widget, system)
    );

    res.json({
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        layout: dashboard.layout
      },
      widgets: externalWidgets,
      imported: externalWidgets.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Import dashboard widgets error:", error);
    res.status(500).json({ message: "Failed to import dashboard widgets" });
  }
});

/**
 * Discover and register all widgets from integration engine
 */
router.post("/:systemId/discover", requireAuth, async (req, res) => {
  try {
    const systemId = parseInt(req.params.systemId);
    const system = await storage.getExternalSystem(systemId);
    
    if (!system) {
      return res.status(404).json({ message: "External system not found" });
    }

    const adapter = new (await import('../services/integration-engine-adapter.js')).IntegrationEngineAdapter(system.baseUrl);
    
    if (system.authType !== 'none' && system.authConfig) {
      adapter.setAuth({
        type: system.authType as any,
        token: system.authConfig.token,
        key: system.authConfig.key,
        username: system.authConfig.username,
        password: system.authConfig.password
      });
    }

    // Get widgets and dashboards
    const [widgets, dashboards] = await Promise.all([
      adapter.getAvailableWidgets(),
      adapter.getDashboards()
    ]);

    // Extract widgets from dashboards if needed
    const allWidgets = [...widgets];
    dashboards.forEach(dashboard => {
      dashboard.widgets.forEach(widget => {
        if (!allWidgets.find(w => w.id === widget.id)) {
          allWidgets.push(widget);
        }
      });
    });

    // Convert to external widget definitions
    const externalWidgets = allWidgets.map(widget => 
      adapter.convertToExternalWidgetDefinition(widget, system)
    );

    // Register with the external widget registry
    const { externalWidgetRegistry } = await import('../services/external-widget-registry.js');
    externalWidgets.forEach(widget => {
      externalWidgetRegistry.registerWidget(widget);
    });

    res.json({
      systemId,
      systemName: system.displayName,
      discovered: {
        widgets: widgets.length,
        dashboards: dashboards.length,
        totalWidgets: allWidgets.length
      },
      registered: externalWidgets.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Discover integration engine widgets error:", error);
    res.status(500).json({ message: "Failed to discover widgets from integration engine" });
  }
});

export { router as integrationEngineWidgetRoutes }; 