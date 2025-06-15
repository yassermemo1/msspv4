import { Router } from "express";
import { IntegrationEngineAdapter } from "../services/integration-engine-adapter";
import { getPlugin, getAllInstances } from "../plugins/plugin-manager";
import { pluginCache } from "../services/plugin-cache";
import { requireAuth } from "../routes";

const router = Router();

/**
 * Test connection to integration engine for a specific plugin instance
 */
router.get("/:pluginName/:instanceId/test", requireAuth, async (req, res) => {
  try {
    const { pluginName, instanceId } = req.params;
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      return res.status(404).json({ message: "Plugin not found" });
    }

    const instance = plugin.getInstance(instanceId);
    if (!instance) {
      return res.status(404).json({ message: "Plugin instance not found" });
    }

    // Create adapter for this plugin instance
    const adapter = new IntegrationEngineAdapter(pluginName, instanceId);
    const result = await adapter.testConnection();
    
    res.json(result);
  } catch (error) {
    console.error("Integration engine test error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to test integration engine connection",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get all widgets from integration engine for a specific plugin
 */
router.get("/:pluginName/:instanceId/widgets", requireAuth, async (req, res) => {
  try {
    const { pluginName, instanceId } = req.params;
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      return res.status(404).json({ message: "Plugin not found" });
    }

    const instance = plugin.getInstance(instanceId);
    if (!instance) {
      return res.status(404).json({ message: "Plugin instance not found" });
    }

    // Create adapter for this plugin instance
    const adapter = new IntegrationEngineAdapter(pluginName, instanceId);
    const widgets = await adapter.getAvailableWidgets();
    
    res.json({
      pluginName,
      instanceId,
      instanceName: instance.name,
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
router.get("/:pluginName/:instanceId/widgets/:widgetId", requireAuth, async (req, res) => {
  try {
    const { pluginName, instanceId, widgetId } = req.params;
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      return res.status(404).json({ message: "Plugin not found" });
    }

    const instance = plugin.getInstance(instanceId);
    if (!instance) {
      return res.status(404).json({ message: "Plugin instance not found" });
    }

    const adapter = new IntegrationEngineAdapter(pluginName, instanceId);
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
router.get("/:pluginName/:instanceId/widgets/:widgetId/data", requireAuth, async (req, res) => {
  try {
    const { pluginName, instanceId, widgetId } = req.params;
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      return res.status(404).json({ message: "Plugin not found" });
    }

    const instance = plugin.getInstance(instanceId);
    if (!instance) {
      return res.status(404).json({ message: "Plugin instance not found" });
    }

    const adapter = new IntegrationEngineAdapter(pluginName, instanceId);
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
router.post("/:pluginName/:instanceId/widgets/:widgetId/render", requireAuth, async (req, res) => {
  try {
    const { pluginName, instanceId, widgetId } = req.params;
    const { config = {}, data } = req.body;
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      return res.status(404).json({ message: "Plugin not found" });
    }

    const instance = plugin.getInstance(instanceId);
    if (!instance) {
      return res.status(404).json({ message: "Plugin instance not found" });
    }

    const adapter = new IntegrationEngineAdapter(pluginName, instanceId);
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
 * Get all dashboards from integration engine for a specific plugin
 */
router.get("/:pluginName/:instanceId/dashboards", requireAuth, async (req, res) => {
  try {
    const { pluginName, instanceId } = req.params;
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      return res.status(404).json({ message: "Plugin not found" });
    }

    const instance = plugin.getInstance(instanceId);
    if (!instance) {
      return res.status(404).json({ message: "Plugin instance not found" });
    }

    const adapter = new IntegrationEngineAdapter(pluginName, instanceId);
    const dashboards = await adapter.getDashboards();
    
    res.json({
      pluginName,
      instanceId,
      instanceName: instance.name,
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
router.post("/:pluginName/:instanceId/dashboards/:dashboardId/import", requireAuth, async (req, res) => {
  try {
    const { pluginName, instanceId, dashboardId } = req.params;
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      return res.status(404).json({ message: "Plugin not found" });
    }

    const instance = plugin.getInstance(instanceId);
    if (!instance) {
      return res.status(404).json({ message: "Plugin instance not found" });
    }

    const adapter = new IntegrationEngineAdapter(pluginName, instanceId);
    const dashboards = await adapter.getDashboards();
    const dashboard = dashboards.find(d => d.id === dashboardId);
    
    if (!dashboard) {
      return res.status(404).json({ message: "Dashboard not found" });
    }

    // Convert widgets to external widget definitions
    const externalWidgets = dashboard.widgets.map((widget: any) => 
      adapter.convertToExternalWidgetDefinition(widget, instance)
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
router.post("/:pluginName/:instanceId/discover", requireAuth, async (req, res) => {
  try {
    const { pluginName, instanceId } = req.params;
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      return res.status(404).json({ message: "Plugin not found" });
    }

    const instance = plugin.getInstance(instanceId);
    if (!instance) {
      return res.status(404).json({ message: "Plugin instance not found" });
    }

    const adapter = new IntegrationEngineAdapter(pluginName, instanceId);

    // Get widgets and dashboards
    const [widgets, dashboards] = await Promise.all([
      adapter.getAvailableWidgets(),
      adapter.getDashboards()
    ]);

    // Extract widgets from dashboards if needed
    const allWidgets = [...widgets];
    dashboards.forEach((dashboard: any) => {
      dashboard.widgets.forEach((widget: any) => {
        if (!allWidgets.find(w => w.id === widget.id)) {
          allWidgets.push(widget);
        }
      });
    });

    // Convert to external widget definitions
    const externalWidgets = allWidgets.map(widget => 
      adapter.convertToExternalWidgetDefinition(widget, instance)
    );

    // Register with the external widget registry
    const { externalWidgetRegistry } = await import('../services/external-widget-registry.js');
    externalWidgets.forEach(widget => {
      externalWidgetRegistry.registerWidget(widget);
    });

    res.json({
      pluginName,
      instanceId,
      instanceName: instance.name,
      discovered: {
        widgets: widgets.length,
        dashboards: dashboards.length,
        totalWidgets: allWidgets.length
      },
      registered: externalWidgets.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Discover widgets error:", error);
    res.status(500).json({ message: "Failed to discover widgets" });
  }
});

/**
 * Get all available plugin instances for integration engine
 */
router.get("/instances", requireAuth, async (req, res) => {
  try {
    const instances = getAllInstances();
    
    const integrationInstances = instances.map(({ pluginName, instance }) => ({
      pluginName,
      instanceId: instance.id,
      instanceName: instance.name,
      baseUrl: instance.baseUrl,
      isActive: instance.isActive,
      tags: instance.tags || []
    }));

    res.json({
      instances: integrationInstances,
      count: integrationInstances.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Get integration instances error:", error);
    res.status(500).json({ message: "Failed to fetch integration instances" });
  }
});

/**
 * Cache management endpoints
 */

/**
 * Get cache statistics
 */
router.get("/cache/stats", requireAuth, async (req, res) => {
  try {
    const stats = pluginCache.getStats();
    res.json({
      cache: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Get cache stats error:", error);
    res.status(500).json({ message: "Failed to get cache statistics" });
  }
});

/**
 * Clear cache for specific plugin instance
 */
router.delete("/:pluginName/:instanceId/cache", requireAuth, async (req, res) => {
  try {
    const { pluginName, instanceId } = req.params;
    
    pluginCache.invalidatePlugin(pluginName, instanceId);
    
    res.json({
      message: `Cache cleared for plugin ${pluginName}:${instanceId}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Clear plugin cache error:", error);
    res.status(500).json({ message: "Failed to clear plugin cache" });
  }
});

/**
 * Clear cache for entire plugin
 */
router.delete("/:pluginName/cache", requireAuth, async (req, res) => {
  try {
    const { pluginName } = req.params;
    
    pluginCache.invalidatePlugin(pluginName);
    
    res.json({
      message: `Cache cleared for plugin ${pluginName}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Clear plugin cache error:", error);
    res.status(500).json({ message: "Failed to clear plugin cache" });
  }
});

/**
 * Clear all caches
 */
router.delete("/cache/all", requireAuth, async (req, res) => {
  try {
    pluginCache.clearAll();
    
    res.json({
      message: "All plugin caches cleared",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Clear all cache error:", error);
    res.status(500).json({ message: "Failed to clear all caches" });
  }
});

/**
 * Warm up cache for plugin instance
 */
router.post("/:pluginName/:instanceId/cache/warmup", requireAuth, async (req, res) => {
  try {
    const { pluginName, instanceId } = req.params;
    
    await pluginCache.warmUpPlugin(pluginName, instanceId);
    
    res.json({
      message: `Cache warmed up for plugin ${pluginName}:${instanceId}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Warm up cache error:", error);
    res.status(500).json({ message: "Failed to warm up cache" });
  }
});

export { router as integrationEngineWidgetRoutes }; 