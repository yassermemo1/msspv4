import express from 'express';
import { storage } from '../storage';
import { QueryExecutionService } from '../services/query-execution-service';
import { requireAuth } from '../auth';

const router = express.Router();
const queryExecutionService = QueryExecutionService.getInstance();

// Apply authentication to all routes
router.use(requireAuth);

/**
 * GET /api/custom-queries - List all custom queries for the user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { systemId, queryType, tags, isPublic } = req.query;

    const filters: any = {};
    if (systemId) filters.systemId = parseInt(systemId as string);
    if (queryType) filters.queryType = queryType;
    if (tags) filters.tags = (tags as string).split(',');
    if (isPublic !== undefined) filters.isPublic = isPublic === 'true';

    const queries = await storage.getCustomQueries(userId, filters);
    res.json(queries);
  } catch (error) {
    console.error('Error fetching custom queries:', error);
    res.status(500).json({ message: 'Failed to fetch queries' });
  }
});

/**
 * GET /api/custom-queries/:id - Get a specific query
 */
router.get('/:id', async (req, res) => {
  try {
    const queryId = parseInt(req.params.id);
    const query = await storage.getCustomQuery(queryId);
    
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    // Check if user has access to this query
    if (!query.isPublic && query.createdBy !== req.user?.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(query);
  } catch (error) {
    console.error('Error fetching query:', error);
    res.status(500).json({ message: 'Failed to fetch query' });
  }
});

/**
 * POST /api/custom-queries - Create a new custom query
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const queryData = {
      ...req.body,
      createdBy: userId
    };

    // Validate required fields
    if (!queryData.name || !queryData.systemId || !queryData.query || !queryData.queryType) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, systemId, query, queryType' 
      });
    }

    const queryId = await storage.createCustomQuery(queryData);
    const query = await storage.getCustomQuery(queryId);
    
    res.status(201).json(query);
  } catch (error) {
    console.error('Error creating query:', error);
    res.status(500).json({ message: 'Failed to create query' });
  }
});

/**
 * PUT /api/custom-queries/:id - Update a custom query
 */
router.put('/:id', async (req, res) => {
  try {
    const queryId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    const existingQuery = await storage.getCustomQuery(queryId);
    if (!existingQuery) {
      return res.status(404).json({ message: 'Query not found' });
    }

    // Check if user owns this query
    if (existingQuery.createdBy !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await storage.updateCustomQuery(queryId, req.body);
    
    // Clear cache for this query
    queryExecutionService.clearCache(queryId);
    
    const updatedQuery = await storage.getCustomQuery(queryId);
    res.json(updatedQuery);
  } catch (error) {
    console.error('Error updating query:', error);
    res.status(500).json({ message: 'Failed to update query' });
  }
});

/**
 * DELETE /api/custom-queries/:id - Delete a custom query
 */
router.delete('/:id', async (req, res) => {
  try {
    const queryId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    const existingQuery = await storage.getCustomQuery(queryId);
    if (!existingQuery) {
      return res.status(404).json({ message: 'Query not found' });
    }

    // Check if user owns this query
    if (existingQuery.createdBy !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await storage.deleteCustomQuery(queryId);
    
    // Clear cache for this query
    queryExecutionService.clearCache(queryId);
    
    res.json({ message: 'Query deleted successfully' });
  } catch (error) {
    console.error('Error deleting query:', error);
    res.status(500).json({ message: 'Failed to delete query' });
  }
});

/**
 * POST /api/custom-queries/:id/execute - Execute a custom query
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const queryId = parseInt(req.params.id);
    const userId = req.user?.id;
    const { forceRefresh = false } = req.body;

    const query = await storage.getCustomQuery(queryId);
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    // Check if user has access to this query
    if (!query.isPublic && query.createdBy !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await queryExecutionService.executeQuery(queryId, userId, forceRefresh);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        executionTime: result.executionTime,
        recordCount: result.recordCount,
        cached: !forceRefresh && result.executionTime < 100 // Likely cached if very fast
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        executionTime: result.executionTime
      });
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to execute query' 
    });
  }
});

/**
 * GET /api/custom-queries/:id/executions - Get execution history for a query
 */
router.get('/:id/executions', async (req, res) => {
  try {
    const queryId = parseInt(req.params.id);
    const { page = 1, limit = 50 } = req.query;

    const query = await storage.getCustomQuery(queryId);
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    // Check if user has access to this query
    if (!query.isPublic && query.createdBy !== req.user?.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const executions = await storage.getQueryExecutions(queryId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    res.json(executions);
  } catch (error) {
    console.error('Error fetching query executions:', error);
    res.status(500).json({ message: 'Failed to fetch executions' });
  }
});

/**
 * POST /api/custom-queries/:id/test - Test a query without saving execution
 */
router.post('/:id/test', async (req, res) => {
  try {
    const queryId = parseInt(req.params.id);
    const userId = req.user?.id;

    const query = await storage.getCustomQuery(queryId);
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    // Check if user has access to this query
    if (!query.isPublic && query.createdBy !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Execute without logging (test mode)
    const result = await queryExecutionService.executeQuery(queryId, undefined, true);
    
    // Limit data for testing (first 10 records)
    if (result.success && Array.isArray(result.data)) {
      result.data = result.data.slice(0, 10);
    }
    
    res.json({
      success: result.success,
      data: result.data,
      error: result.error,
      executionTime: result.executionTime,
      recordCount: result.recordCount,
      isTest: true
    });
  } catch (error) {
    console.error('Error testing query:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to test query' 
    });
  }
});

/**
 * GET /api/custom-queries/systems - Get available external systems for queries
 */
router.get('/systems', async (req, res) => {
  try {
    const systems = await storage.getAllExternalSystems();
    res.json(systems);
  } catch (error) {
    console.error('Error fetching external systems:', error);
    res.status(500).json({ message: 'Failed to fetch systems' });
  }
});

/**
 * POST /api/custom-queries/validate - Validate a query without executing
 */
router.post('/validate', async (req, res) => {
  try {
    const { query, queryType, systemId } = req.body;

    if (!query || !queryType || !systemId) {
      return res.status(400).json({ 
        valid: false,
        error: 'Missing required fields: query, queryType, systemId' 
      });
    }

    // Basic validation based on query type
    let validationResult = { valid: true, error: null };

    switch (queryType.toLowerCase()) {
      case 'jql':
        // Basic JQL validation (could be enhanced)
        if (!query.trim()) {
          validationResult = { valid: false, error: 'JQL query cannot be empty' };
        }
        break;
      case 'rest':
        // Validate REST endpoint
        if (!query.startsWith('/')) {
          validationResult = { valid: false, error: 'REST endpoint must start with /' };
        }
        break;
      case 'graphql':
        // Basic GraphQL validation
        if (!query.includes('{') || !query.includes('}')) {
          validationResult = { valid: false, error: 'GraphQL query must contain valid syntax' };
        }
        break;
      case 'sql':
        // Basic SQL validation
        if (!query.toLowerCase().includes('select')) {
          validationResult = { valid: false, error: 'SQL query must contain SELECT statement' };
        }
        break;
    }

    res.json(validationResult);
  } catch (error) {
    console.error('Error validating query:', error);
    res.status(500).json({ 
      valid: false,
      error: 'Failed to validate query' 
    });
  }
});

export { router as customQueriesRouter }; 