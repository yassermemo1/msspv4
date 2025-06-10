import { Router } from 'express';
import { db } from '../db.ts';
import { customQueries, customQueryWidgets, externalSystems, widgetExecutionCache } from '../../shared/schema.ts';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { DynamicQueryExecutionService } from '../services/query-execution-service.ts';
import crypto from 'crypto';

const router = Router();

/**
 * GET /api/custom-queries - Get all custom queries for the current user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const queries = await db
      .select({
        id: customQueries.id,
        name: customQueries.name,
        description: customQueries.description,
        systemId: customQueries.systemId,
        method: customQueries.method,
        query: customQueries.query,
        parameters: customQueries.parameters,
        transformations: customQueries.transformations,
        dataMapping: customQueries.dataMapping,
        refreshInterval: customQueries.refreshInterval,
        cacheEnabled: customQueries.cacheEnabled,
        isActive: customQueries.isActive,
        isPublic: customQueries.isPublic,
        tags: customQueries.tags,
        createdAt: customQueries.createdAt,
        updatedAt: customQueries.updatedAt,
        systemName: externalSystems.systemName,
        systemDisplayName: externalSystems.displayName,
      })
      .from(customQueries)
      .leftJoin(externalSystems, eq(customQueries.systemId, externalSystems.id))
      .where(
        and(
          customQueries.isActive,
          or(
            eq(customQueries.createdBy, userId),
            eq(customQueries.isPublic, true)
          )
        )
      )
      .orderBy(desc(customQueries.updatedAt));

    res.json(queries);
  } catch (error) {
    console.error('Error fetching custom queries:', error);
    res.status(500).json({ message: 'Failed to fetch custom queries' });
  }
});

/**
 * POST /api/custom-queries - Create a new custom query
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const queryData = {
      ...req.body,
      createdBy: userId
    };

    const [newQuery] = await db
      .insert(customQueries)
      .values(queryData)
      .returning();

    res.status(201).json(newQuery);
  } catch (error) {
    console.error('Error creating custom query:', error);
    res.status(500).json({ message: 'Failed to create custom query' });
  }
});

/**
 * PUT /api/custom-queries/:id - Update a custom query
 */
router.put('/:id', async (req, res) => {
  try {
    const queryId = parseInt(req.params.id);
    const userId = req.user.id;

    // Check if user owns the query or has permission to edit
    const existingQuery = await db
      .select()
      .from(customQueries)
      .where(eq(customQueries.id, queryId))
      .limit(1);

    if (!existingQuery.length) {
      return res.status(404).json({ message: 'Query not found' });
    }

    if (existingQuery[0].createdBy !== userId) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const [updatedQuery] = await db
      .update(customQueries)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(customQueries.id, queryId))
      .returning();

    // Invalidate cache for this query
    await db
      .update(widgetExecutionCache)
      .set({ isValid: false })
      .where(
        sql`widget_id IN (
          SELECT id FROM custom_query_widgets 
          WHERE custom_query_id = ${queryId}
        )`
      );

    res.json(updatedQuery);
  } catch (error) {
    console.error('Error updating custom query:', error);
    res.status(500).json({ message: 'Failed to update custom query' });
  }
});

/**
 * DELETE /api/custom-queries/:id - Delete a custom query
 */
router.delete('/:id', async (req, res) => {
  try {
    const queryId = parseInt(req.params.id);
    const userId = req.user.id;

    // Check if user owns the query
    const existingQuery = await db
      .select()
      .from(customQueries)
      .where(eq(customQueries.id, queryId))
      .limit(1);

    if (!existingQuery.length) {
      return res.status(404).json({ message: 'Query not found' });
    }

    if (existingQuery[0].createdBy !== userId) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    await db
      .delete(customQueries)
      .where(eq(customQueries.id, queryId));

    res.json({ message: 'Query deleted successfully' });
  } catch (error) {
    console.error('Error deleting custom query:', error);
    res.status(500).json({ message: 'Failed to delete custom query' });
  }
});

/**
 * POST /api/custom-queries/:id/test - Test execute a custom query
 */
router.post('/:id/test', async (req, res) => {
  try {
    const queryId = parseInt(req.params.id);

    const query = await db
      .select()
      .from(customQueries)
      .where(eq(customQueries.id, queryId))
      .limit(1);

    if (!query.length) {
      return res.status(404).json({ message: 'Query not found' });
    }

    const queryConfig = query[0];
    const queryService = DynamicQueryExecutionService.getInstance();

    const result = await queryService.executeQuery({
      systemId: queryConfig.systemId,
      query: queryConfig.query,
      method: queryConfig.method,
      parameters: queryConfig.parameters,
      transformations: queryConfig.transformations,
      timeout: 30000
    });

    res.json(result);
  } catch (error) {
    console.error('Error testing custom query:', error);
    res.status(500).json({ message: 'Failed to test custom query' });
  }
});

/**
 * POST /api/custom-queries/:id/add-to-dashboard - Add query as widget to dashboard
 */
router.post('/:id/add-to-dashboard', async (req, res) => {
  try {
    const queryId = parseInt(req.params.id);
    const userId = req.user.id;
    const { 
      dashboardId, 
      legacyDashboardId, 
      title, 
      widgetType = 'chart', 
      chartType = 'bar',
      position = { x: 0, y: 0, w: 4, h: 3 },
      config = {}
    } = req.body;

    // Validate that the query exists and user has access
    const query = await db
      .select()
      .from(customQueries)
      .where(
        and(
          eq(customQueries.id, queryId),
          or(
            eq(customQueries.createdBy, userId),
            eq(customQueries.isPublic, true)
          )
        )
      )
      .limit(1);

    if (!query.length) {
      return res.status(404).json({ message: 'Query not found or access denied' });
    }

    // Create the widget
    const [newWidget] = await db
      .insert(customQueryWidgets)
      .values({
        customQueryId: queryId,
        dashboardId,
        legacyDashboardId,
        title: title || query[0].name,
        widgetType,
        chartType,
        config,
        position,
        createdBy: userId
      })
      .returning();

    res.status(201).json(newWidget);
  } catch (error) {
    console.error('Error adding query to dashboard:', error);
    res.status(500).json({ message: 'Failed to add query to dashboard' });
  }
});

/**
 * GET /api/custom-queries/systems - Get available external systems for queries
 */
router.get('/systems', async (req, res) => {
  try {
    const systems = await db
      .select()
      .from(externalSystems)
      .where(eq(externalSystems.isActive, true))
      .orderBy(externalSystems.displayName);

    res.json(systems);
  } catch (error) {
    console.error('Error fetching external systems:', error);
    res.status(500).json({ message: 'Failed to fetch systems' });
  }
});

/**
 * GET /api/custom-queries/widgets/:dashboardId - Get widgets for a dashboard
 */
router.get('/widgets/:dashboardId', async (req, res) => {
  try {
    const dashboardId = parseInt(req.params.dashboardId);
    const { type = 'new' } = req.query; // 'new' or 'legacy'

    const whereCondition = type === 'legacy' 
      ? eq(customQueryWidgets.legacyDashboardId, dashboardId)
      : eq(customQueryWidgets.dashboardId, dashboardId);

    const widgets = await db
      .select({
        id: customQueryWidgets.id,
        title: customQueryWidgets.title,
        widgetType: customQueryWidgets.widgetType,
        chartType: customQueryWidgets.chartType,
        config: customQueryWidgets.config,
        position: customQueryWidgets.position,
        isVisible: customQueryWidgets.isVisible,
        createdAt: customQueryWidgets.createdAt,
        query: {
          id: customQueries.id,
          name: customQueries.name,
          systemId: customQueries.systemId,
          method: customQueries.method,
          query: customQueries.query,
          parameters: customQueries.parameters,
          refreshInterval: customQueries.refreshInterval,
          cacheEnabled: customQueries.cacheEnabled,
        },
        system: {
          id: externalSystems.id,
          systemName: externalSystems.systemName,
          displayName: externalSystems.displayName,
        }
      })
      .from(customQueryWidgets)
      .leftJoin(customQueries, eq(customQueryWidgets.customQueryId, customQueries.id))
      .leftJoin(externalSystems, eq(customQueries.systemId, externalSystems.id))
      .where(
        and(
          whereCondition,
          eq(customQueryWidgets.isVisible, true)
        )
      )
      .orderBy(customQueryWidgets.createdAt);

    res.json(widgets);
  } catch (error) {
    console.error('Error fetching dashboard widgets:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard widgets' });
  }
});

/**
 * GET /api/custom-queries/widgets/:widgetId/data - Get cached or fresh data for a widget
 */
router.get('/widgets/:widgetId/data', async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);
    const { forceRefresh = false } = req.query;

    // Get widget details
    const widget = await db
      .select({
        widget: customQueryWidgets,
        query: customQueries,
        system: externalSystems,
      })
      .from(customQueryWidgets)
      .leftJoin(customQueries, eq(customQueryWidgets.customQueryId, customQueries.id))
      .leftJoin(externalSystems, eq(customQueries.systemId, externalSystems.id))
      .where(eq(customQueryWidgets.id, widgetId))
      .limit(1);

    if (!widget.length) {
      return res.status(404).json({ message: 'Widget not found' });
    }

    const { widget: widgetData, query: queryData, system: systemData } = widget[0];

    // Check cache if not forcing refresh and cache is enabled
    if (!forceRefresh && queryData.cacheEnabled) {
      const queryHash = crypto
        .createHash('md5')
        .update(JSON.stringify({
          query: queryData.query,
          parameters: queryData.parameters,
          method: queryData.method
        }))
        .digest('hex');

      const cachedResult = await db
        .select()
        .from(widgetExecutionCache)
        .where(
          and(
            eq(widgetExecutionCache.widgetId, widgetId),
            eq(widgetExecutionCache.queryHash, queryHash),
            eq(widgetExecutionCache.isValid, true),
            sql`expires_at > NOW()`
          )
        )
        .limit(1);

      if (cachedResult.length) {
        return res.json({
          success: true,
          data: cachedResult[0].resultData,
          metadata: {
            ...cachedResult[0].metadata,
            cached: true,
            cacheCreatedAt: cachedResult[0].createdAt
          }
        });
      }
    }

    // Execute query
    const queryService = DynamicQueryExecutionService.getInstance();
    const result = await queryService.executeQuery({
      systemId: queryData.systemId,
      query: queryData.query,
      method: queryData.method,
      parameters: queryData.parameters,
      transformations: queryData.transformations,
      timeout: 30000
    });

    // Cache the result if cache is enabled and query succeeded
    if (queryData.cacheEnabled && result.success) {
      const queryHash = crypto
        .createHash('md5')
        .update(JSON.stringify({
          query: queryData.query,
          parameters: queryData.parameters,
          method: queryData.method
        }))
        .digest('hex');

      const expiresAt = new Date(Date.now() + (queryData.refreshInterval * 1000));

      await db
        .insert(widgetExecutionCache)
        .values({
          widgetId,
          queryHash,
          resultData: result.data,
          metadata: result.metadata || {},
          executionTime: result.metadata?.executionTime,
          expiresAt
        })
        .onConflictDoUpdate({
          target: [widgetExecutionCache.widgetId, widgetExecutionCache.queryHash],
          set: {
            resultData: result.data,
            metadata: result.metadata || {},
            executionTime: result.metadata?.executionTime,
            isValid: true,
            expiresAt,
            createdAt: new Date()
          }
        });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching widget data:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'WIDGET_DATA_ERROR',
        message: 'Failed to fetch widget data'
      }
    });
  }
});

export { router as customQueryRoutes }; 