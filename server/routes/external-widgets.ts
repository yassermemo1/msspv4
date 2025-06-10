import { Router } from 'express';
import { externalWidgetRegistry } from '../services/external-widget-registry.js';
import { storage } from '../storage.js';

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

const router = Router();

/**
 * Get all available external widgets
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const widgets = externalWidgetRegistry.getAllWidgets();
    res.json({
      widgets,
      total: widgets.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Get external widgets error:", error);
    res.status(500).json({ message: "Failed to fetch external widgets" });
  }
});

/**
 * Discover widgets from a specific external system
 */
router.get("/:systemId/discover", requireAuth, async (req, res) => {
  try {
    const systemId = parseInt(req.params.systemId);
    
    if (isNaN(systemId)) {
      return res.status(400).json({ message: "Invalid system ID" });
    }
    
    const system = await storage.getExternalSystem(systemId);
    
    if (!system) {
      return res.status(404).json({ message: "External system not found" });
    }
    
    const widgets = await externalWidgetRegistry.discoverWidgets(system);
    
    res.json({
      systemId,
      systemName: system.displayName,
      widgets,
      discovered: widgets.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Discover widgets error:", error);
    res.status(500).json({ message: "Failed to discover widgets" });
  }
});

/**
 * Discover widgets from all active external systems
 */
router.post("/discover-all", requireAuth, async (req, res) => {
  try {
    const systems = await storage.getAllExternalSystems();
    const activeSystems = systems.filter(system => system.isActive);
    
    console.log(`🔍 Discovering widgets from ${activeSystems.length} active systems`);
    
    const results = [];
    let totalWidgets = 0;
    
    for (const system of activeSystems) {
      try {
        const widgets = await externalWidgetRegistry.discoverWidgets(system);
        results.push({
          systemId: system.id,
          systemName: system.displayName,
          widgets: widgets.length,
          success: true
        });
        totalWidgets += widgets.length;
      } catch (error) {
        results.push({
          systemId: system.id,
          systemName: system.displayName,
          widgets: 0,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({
      systems: results,
      totalWidgets,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Discover all widgets error:", error);
    res.status(500).json({ message: "Failed to discover widgets from external systems" });
  }
});

/**
 * Get widget by ID
 */
router.get("/:widgetId", requireAuth, async (req, res) => {
  try {
    const widgetId = req.params.widgetId;
    const widget = externalWidgetRegistry.getWidget(widgetId);
    
    if (!widget) {
      return res.status(404).json({ message: "Widget not found" });
    }
    
    res.json(widget);
  } catch (error) {
    console.error("Get widget error:", error);
    res.status(500).json({ message: "Failed to fetch widget" });
  }
});

/**
 * Load widget code and assets
 */
router.post("/:widgetId/load", requireAuth, async (req, res) => {
  try {
    const widgetId = req.params.widgetId;
    const widget = externalWidgetRegistry.getWidget(widgetId);
    
    if (!widget) {
      return res.status(404).json({ message: "Widget not found" });
    }
    
    // In a production environment, you might want to:
    // 1. Validate the widget code
    // 2. Serve through a CDN
    // 3. Apply security policies
    // 4. Cache the response
    
    const response = await fetch(widget.widgetUrl, {
      headers: {
        'User-Agent': 'MSSP-Widget-Loader/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load widget: ${response.statusText}`);
    }
    
    const widgetCode = await response.text();
    
    res.json({
      id: widget.id,
      definition: widget,
      code: widgetCode,
      contentType: response.headers.get('content-type') || 'text/javascript',
      size: widgetCode.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Load widget error:", error);
    res.status(500).json({ message: "Failed to load widget" });
  }
});

/**
 * Get widgets by system
 */
router.get("/system/:systemId", requireAuth, async (req, res) => {
  try {
    const systemId = parseInt(req.params.systemId);
    
    if (isNaN(systemId)) {
      return res.status(400).json({ message: "Invalid system ID" });
    }
    
    const widgets = externalWidgetRegistry.getWidgetsBySystem(systemId);
    
    res.json({
      systemId,
      widgets,
      count: widgets.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Get widgets by system error:", error);
    res.status(500).json({ message: "Failed to fetch widgets for system" });
  }
});

/**
 * Health check for external widgets
 */
router.get("/health/check", requireAuth, async (req, res) => {
  try {
    const healthStatus = await externalWidgetRegistry.healthCheck();
    
    res.json({
      ...healthStatus,
      timestamp: new Date().toISOString(),
      status: healthStatus.healthy === healthStatus.total ? 'healthy' : 'degraded'
    });
  } catch (error) {
    console.error("Widget health check error:", error);
    res.status(500).json({ message: "Failed to check widget health" });
  }
});

/**
 * Clear widget cache
 */
router.post("/cache/clear", requireAuth, async (req, res) => {
  try {
    externalWidgetRegistry.clearCache();
    
    res.json({
      message: "Widget cache cleared successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Clear cache error:", error);
    res.status(500).json({ message: "Failed to clear widget cache" });
  }
});

/**
 * Remove widgets for a specific system
 */
router.delete("/system/:systemId", requireAuth, async (req, res) => {
  try {
    const systemId = parseInt(req.params.systemId);
    
    if (isNaN(systemId)) {
      return res.status(400).json({ message: "Invalid system ID" });
    }
    
    externalWidgetRegistry.removeWidgetsForSystem(systemId);
    
    res.json({
      message: `Widgets removed for system ${systemId}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Remove widgets error:", error);
    res.status(500).json({ message: "Failed to remove widgets" });
  }
});

export { router as externalWidgetRoutes }; 