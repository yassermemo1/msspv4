import express from 'express';
import { 
  listPlugins, 
  getPlugin, 
  getAllInstances, 
  updatePluginConfig,
  PluginInstance,
  PluginConfig
} from './plugins/plugin-manager';
import { db } from './db';
import * as schema from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

const { savedQueries, clients, contracts, services, users, proposals, serviceScopes } = schema;

const pluginRoutes = express.Router();

// JQL validation helper function
function validateJQLQuery(query: string): { warnings: string[], suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Check common field name issues
  if (/\bProject\s*=/i.test(query) && !/\bproject\s*=/i.test(query)) {
    warnings.push("Field names should be lowercase: 'Project' should be 'project'");
    suggestions.push(`Try: "${query.replace(/\bProject\s*=/gi, 'project =')}" instead`);
  }
  
  if (/\bStatus\s*=/i.test(query) && !/\bstatus\s*=/i.test(query)) {
    warnings.push("Field names should be lowercase: 'Status' should be 'status'");
    suggestions.push(`Try: "${query.replace(/\bStatus\s*=/gi, 'status =')}" instead`);
  }
  
  // Check for unquoted values
  if (/=\s*[A-Za-z][A-Za-z0-9_]*\s*(?![A-Za-z0-9_()])/g.test(query)) {
    warnings.push("String values should be quoted");
    suggestions.push("Try adding quotes around values: project = \"DEP\" instead of project = DEP");
  }
  
  // Check for invalid sort fields
  if (/ORDER\s+BY\s+priority/i.test(query)) {
    warnings.push("'priority' is not a valid sort field in Jira");
    suggestions.push("Use valid sort fields like 'created', 'updated', 'key', or 'status' instead");
  }
  
  // Check for project existence hints
  if (/project\s*=\s*["\']?(DEP|MD)["\']?/i.test(query)) {
    warnings.push("Projects 'DEP' and 'MD' may not exist in your Jira instance");
    suggestions.push("Use your actual project keys. Check /rest/api/2/project to see available projects");
  }
  
  // Check for common syntax patterns
  if (/project\s+in\s*\(/i.test(query) && !/project\s+in\s*\(\s*["\'][^"\']*["\']/.test(query)) {
    warnings.push("Values in IN clauses should be quoted");
    suggestions.push('Use: project in ("KEY1", "KEY2") instead of project in (KEY1, KEY2)');
  }
  
  return { warnings, suggestions };
}

// Middleware for authentication
function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Authentication required' });
}

// Get all available plugins
pluginRoutes.get('/', (req, res) => {
  try {
    const plugins = listPlugins().map(plugin => ({
      systemName: plugin.systemName,
      displayName: plugin.systemName.charAt(0).toUpperCase() + plugin.systemName.slice(1),
      instanceCount: plugin.config?.instances?.length || 0,
      config: plugin.config || { instances: [] },
      defaultQueries: plugin.defaultQueries || []
    }));
    
    res.json({ 
      success: true,
      plugins 
    });
  } catch (error) {
    console.error('Failed to list plugins:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to list plugins' 
    });
  }
});

// Get available plugins for widget creation (simplified format)
pluginRoutes.get('/available', (req, res) => {
  try {
    const plugins = listPlugins()
      .filter(plugin => plugin.config?.instances?.some(instance => instance.isActive))
      .map(plugin => ({
        systemName: plugin.systemName,
        displayName: plugin.systemName.charAt(0).toUpperCase() + plugin.systemName.slice(1),
        instanceCount: plugin.config?.instances?.filter(instance => instance.isActive).length || 0,
        defaultQueries: plugin.defaultQueries || []
      }));
    
    res.json(plugins);
  } catch (error) {
    console.error('Failed to list available plugins:', error);
    res.status(500).json({ message: 'Failed to list available plugins' });
  }
});

// Get all instances across all plugins
pluginRoutes.get('/instances', (req, res) => {
  try {
    const instances = getAllInstances();
    res.json({ instances });
  } catch (error) {
    res.status(500).json({ message: 'Failed to list instances' });
  }
});

// Get instances for a specific plugin
pluginRoutes.get('/:pluginName/instances', (req, res) => {
  try {
    const { pluginName } = req.params;
    const plugin = getPlugin(pluginName);
    
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin not found' });
    }
    
    const instances = plugin.getInstances();
    res.json({ instances });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get plugin instances' });
  }
});

// Test endpoint without authentication (for testing only)
pluginRoutes.post('/:pluginName/instances/:instanceId/test-query', async (req, res) => {
  try {
    const { pluginName, instanceId } = req.params;
    const { query = '__health_check__' } = req.body;
    console.log(`🔍 Testing query for plugin: ${pluginName}, instance: ${instanceId}, query: ${query}`);
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin not found' });
    }
    
    const instance = plugin.getInstance(instanceId);
    if (!instance) {
      return res.status(404).json({ message: 'Instance not found' });
    }
    
    const startTime = Date.now();
    const data = await plugin.executeQuery(query, 'GET', instanceId);
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data,
      metadata: {
        query,
        responseTime: `${responseTime}ms`,
        dataType: typeof data,
        recordCount: Array.isArray(data) ? data.length : (data && typeof data === 'object' && 'total' in data) ? (data as any).total : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error instanceof Error ? error.message : 'Query execution failed',
      error: error instanceof Error ? error.name : 'Unknown error'
    });
  }
});

// Test connection for a specific instance
pluginRoutes.post('/:pluginName/instances/:instanceId/test-connection', requireAuth, async (req, res) => {
  try {
    const { pluginName, instanceId } = req.params;
    console.log(`🔍 Testing connection for plugin: ${pluginName}, instance: ${instanceId}`);
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      console.log(`❌ Plugin not found: ${pluginName}`);
      return res.status(404).json({ 
        success: false,
        message: `Plugin '${pluginName}' not found`,
        error: 'PLUGIN_NOT_FOUND'
      });
    }
    
    const instance = plugin.getInstance(instanceId);
    if (!instance) {
      console.log(`❌ Instance not found: ${instanceId} for plugin ${pluginName}`);
      return res.status(404).json({ 
        success: false,
        message: `Instance '${instanceId}' not found in plugin '${pluginName}'`,
        error: 'INSTANCE_NOT_FOUND'
      });
    }
    
    if (!instance.isActive) {
      console.log(`⚠️ Instance is inactive: ${pluginName}/${instanceId}`);
      return res.json({
        success: false,
        status: 'inactive',
        message: `Instance '${instance.name}' is currently disabled`,
        instance: { id: instance.id, name: instance.name, isActive: false }
      });
    }
    
    // Try to execute a simple health check query
    let testResult;
    try {
      console.log(`🔄 Executing health check for ${pluginName}/${instanceId}`);
      
      if (plugin.defaultQueries && plugin.defaultQueries.length > 0) {
        // Use the first available query as a health check
        const testQuery = plugin.defaultQueries[0];
        const startTime = Date.now();
        
        console.log(`📊 Running test query: ${testQuery.description}`);
        const data = await plugin.executeQuery(testQuery.path, testQuery.method, instanceId);
        const responseTime = Date.now() - startTime;
        
        console.log(`✅ Health check successful for ${pluginName}/${instanceId} in ${responseTime}ms`);
        
        testResult = {
          success: true,
          status: 'healthy',
          message: `Connection successful - ${testQuery.description}`,
          responseTime: `${responseTime}ms`,
          testQuery: testQuery.description,
          dataPreview: typeof data === 'object' ? JSON.stringify(data).slice(0, 200) + '...' : String(data).slice(0, 200),
          recordCount: Array.isArray(data) ? data.length : null
        };
      } else {
        console.log(`⚠️ No test queries available for ${pluginName}/${instanceId}`);
        testResult = {
          success: true,
          status: 'configured',
          message: 'Instance is configured but no test queries available',
          responseTime: '0ms'
        };
      }
    } catch (error) {
      console.error(`❌ Health check failed for ${pluginName}/${instanceId}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      const errorType = error instanceof Error ? error.name : 'Unknown error';
      
      // Provide more specific error messages based on common issues
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('ECONNREFUSED')) {
        userFriendlyMessage = `Cannot connect to ${instance.baseUrl} - service may be down`;
      } else if (errorMessage.includes('ENOTFOUND')) {
        userFriendlyMessage = `Cannot resolve hostname: ${instance.baseUrl}`;
      } else if (errorMessage.includes('401')) {
        userFriendlyMessage = 'Authentication failed - check credentials';
      } else if (errorMessage.includes('403')) {
        userFriendlyMessage = 'Access denied - insufficient permissions';
      } else if (errorMessage.includes('timeout')) {
        userFriendlyMessage = 'Connection timeout - service may be slow or unreachable';
      }
      
      testResult = {
        success: false,
        status: 'error',
        message: userFriendlyMessage,
        error: errorType,
        details: errorMessage !== userFriendlyMessage ? errorMessage : undefined
      };
    }
    
    res.json({
      ...testResult,
      instance: {
        id: instance.id,
        name: instance.name,
        baseUrl: instance.baseUrl,
        authType: instance.authType,
        tags: instance.tags || [],
        isActive: instance.isActive
      },
      plugin: {
        name: pluginName,
        hasQueries: (plugin.defaultQueries || []).length > 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`💥 Test connection error for ${req.params.pluginName}/${req.params.instanceId}:`, error);
    res.status(500).json({ 
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error during connection test',
      error: 'INTERNAL_ERROR'
    });
  }
});

// Get default queries for a plugin
pluginRoutes.get('/:pluginName/queries', (req, res) => {
  try {
    const { pluginName } = req.params;
    const plugin = getPlugin(pluginName);
    
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin not found' });
    }
    
    res.json({ 
      queries: plugin.defaultQueries || [],
      systemName: plugin.systemName
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get plugin queries' });
  }
});

// Query builder - validate query syntax
pluginRoutes.post('/:pluginName/instances/:instanceId/validate-query', requireAuth, async (req, res) => {
  try {
    const { pluginName, instanceId } = req.params;
    const { query, method = 'GET' } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin not found' });
    }
    
    const instance = plugin.getInstance(instanceId);
    if (!instance) {
      return res.status(404).json({ message: 'Instance not found' });
    }
    
    // Basic validation (can be enhanced per plugin type)
    const validation = {
      isValid: true,
      warnings: [] as string[],
      suggestions: [] as string[]
    };
    
    // Plugin-specific validation
    if (pluginName === 'jira') {
      // Enhanced JQL validation with auto-fix suggestions
      const jqlIssues = validateJQLQuery(query);
      validation.warnings.push(...jqlIssues.warnings);
      validation.suggestions.push(...jqlIssues.suggestions);
      
      if (!query.includes('project') && !query.includes('assignee')) {
        validation.warnings.push('Consider adding project or assignee filters for better performance');
      }
      if (query.length > 500) {
        validation.warnings.push('Very long JQL query - consider breaking it down');
      }
    } else if (pluginName === 'splunk') {
      if (!query.includes('index=')) {
        validation.warnings.push('Consider specifying an index for better performance');
      }
      if (!query.includes('earliest=')) {
        validation.suggestions.push('Add time range with earliest= for faster results');
      }
    }
    
    res.json({
      query,
      method,
      validation,
      pluginName,
      instanceId
    });
  } catch (error) {
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Query validation failed'
    });
  }
});

// Execute a custom query with detailed results
pluginRoutes.post('/:pluginName/instances/:instanceId/query', requireAuth, async (req, res) => {
  try {
    const { pluginName, instanceId } = req.params;
    const { query, method = 'GET', parameters = {}, filters = [], opts = {}, saveAs, context = {}, chainedQuery, fieldSelection } = req.body;
    
    // Debug logging
    console.log(`📥 Received query request for ${pluginName}/${instanceId}:`, {
      query: query,
      method: method,
      parametersKeys: Object.keys(parameters),
      hasFilters: filters.length > 0,
      context: context
    });
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin not found' });
    }

    const instance = plugin.getInstance(instanceId);
    if (!instance) {
      return res.status(404).json({ message: 'Instance not found' });
    }

    // Enhanced parameter substitution with database and context resolution
    let processedQuery = query;
    const resolvedParameters: Record<string, string> = {};
    
    if (parameters && typeof parameters === 'object') {
      console.log(`🔧 Enhanced parameter resolution for ${pluginName}/${instanceId}:`);
      console.log(`   Original query: ${query}`);
      console.log(`   Parameters config: ${JSON.stringify(parameters)}`);
      console.log(`   Context: ${JSON.stringify(context)}`);
      
      // Build context object from request
      const resolutionContext = {
        userId: req.user?.id,
        clientId: context.clientId,
        contractId: context.contractId,
        clientShortName: context.clientShortName,
        clientName: context.clientName,
        clientDomain: context.clientDomain
      };
      
      // If we have a clientId but missing client details, fetch them
      if (resolutionContext.clientId && (!resolutionContext.clientShortName || !resolutionContext.clientName)) {
        try {
          const [client] = await db.select({
            shortName: clients.shortName,
            name: clients.name,
            domain: clients.domain
          })
          .from(clients)
          .where(eq(clients.id, resolutionContext.clientId));
          
          if (client) {
            resolutionContext.clientShortName = resolutionContext.clientShortName || client.shortName || '';
            resolutionContext.clientName = resolutionContext.clientName || client.name || '';
            resolutionContext.clientDomain = resolutionContext.clientDomain || client.domain || '';
            
            console.log(`   📋 Auto-fetched client details: ${client.name} (${client.shortName})`);
          }
        } catch (error) {
          console.warn('Failed to auto-fetch client details:', error);
        }
      }
      
      // Resolve each parameter value
      for (const [key, paramConfig] of Object.entries(parameters)) {
        const resolvedValue = await resolveParameterValue(paramConfig, resolutionContext);
        resolvedParameters[key] = resolvedValue;
        
        console.log(`   Parameter "${key}": ${JSON.stringify(paramConfig)} → "${resolvedValue}"`);
        
        // Replace in query
        const placeholder = `\${${key}}`;
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        processedQuery = processedQuery.replace(regex, resolvedValue);
      }
      
      console.log(`   Processed query: ${processedQuery}`);
    }

    // Process filters
    if (filters && Array.isArray(filters) && filters.length > 0) {
      console.log(`🔍 Processing ${filters.length} filters for ${pluginName}/${instanceId}:`);
      processedQuery = await processFilters(processedQuery, filters, pluginName);
      console.log(`   Query after filters: ${processedQuery}`);
    }
    
    // Pass widget configuration to plugin
    const enhancedOpts = {
      ...opts,
      parameters,
      context,
      chainedQuery,
      fieldSelection
    };
    
    const startTime = Date.now();
    const data = await plugin.executeQuery(processedQuery, method, instanceId, enhancedOpts);
    const responseTime = Date.now() - startTime;

    // Apply post-query filtering if needed (for APIs that don't support query-based filtering)
    let filteredData = data;
    if (filters && Array.isArray(filters) && filters.length > 0) {
      filteredData = await applyPostQueryFilters(data, filters);
    }
    
    // Save query if requested
    if (saveAs && req.user) {
      try {
        await db.insert(savedQueries).values({
          userId: req.user.id,
          pluginName,
          instanceId,
          name: saveAs,
          query: processedQuery, // Save the processed query
          method,
          description: `Saved query for ${pluginName}`,
          createdAt: new Date()
        });
      } catch (saveError) {
        console.warn('Failed to save query:', saveError);
      }
    }
    
    res.json({
      success: true,
      data: filteredData,
      metadata: {
        query: processedQuery,
        originalQuery: query,
        parameters: resolvedParameters,
        filters: filters.filter((f: any) => f.enabled),
        context: context,
        method,
        responseTime: `${responseTime}ms`,
        dataType: typeof filteredData,
        recordCount: Array.isArray(filteredData) ? filteredData.length : (filteredData && typeof filteredData === 'object' && 'total' in filteredData) ? (filteredData as any).total : null,
        instance: {
          id: instance.id,
          name: instance.name
        }
      },
      timestamp: new Date().toISOString(),
      saved: !!saveAs
    });
  } catch (error) {
    console.error(`❌ Enhanced query execution error:`, error);
    res.status(500).json({ 
      success: false,
      message: error instanceof Error ? error.message : 'Query execution failed',
      error: error instanceof Error ? error.name : 'Unknown error'
    });
  }
});

// Execute a default query by ID
pluginRoutes.post('/:pluginName/instances/:instanceId/default-query/:queryId', requireAuth, async (req, res) => {
  try {
    const { pluginName, instanceId, queryId } = req.params;
    const { opts = {} } = req.body;
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin not found' });
    }
    
    const queryDef = plugin.defaultQueries?.find(q => q.id === queryId);
    if (!queryDef) {
      return res.status(404).json({ message: 'Query not found' });
    }
    
    const startTime = Date.now();
    const data = await plugin.executeQuery(queryDef.path, queryDef.method, instanceId, opts);
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data,
      query: queryDef,
      metadata: {
        responseTime: `${responseTime}ms`,
        dataType: typeof data,
        recordCount: Array.isArray(data) ? data.length : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error instanceof Error ? error.message : 'Query execution failed'
    });
  }
});

// Get saved queries for a user
pluginRoutes.get('/saved-queries', requireAuth, async (req, res) => {
  try {
    const { pluginName, instanceId } = req.query;
    
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    let whereClause = eq(savedQueries.userId, req.user.id);
    
    if (pluginName) {
      whereClause = and(whereClause, eq(savedQueries.pluginName, pluginName as string))!;
    }
    
    if (instanceId) {
      whereClause = and(whereClause, eq(savedQueries.instanceId, instanceId as string))!;
    }
    
    const queries = await db.select().from(savedQueries).where(whereClause);
    
    res.json({ queries });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get saved queries' });
  }
});

// Execute a saved query
pluginRoutes.post('/saved-queries/:queryId/execute', requireAuth, async (req, res) => {
  try {
    const { queryId } = req.params;
    const { opts = {} } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const [savedQuery] = await db.select().from(savedQueries)
      .where(and(
        eq(savedQueries.id, parseInt(queryId)),
        eq(savedQueries.userId, req.user.id)
      ));
    
    if (!savedQuery) {
      return res.status(404).json({ message: 'Saved query not found' });
    }
    
    const plugin = getPlugin(savedQuery.pluginName);
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin not found' });
    }
    
    const startTime = Date.now();
    const data = await plugin.executeQuery(savedQuery.query, savedQuery.method, savedQuery.instanceId, opts);
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data,
      savedQuery: {
        id: savedQuery.id,
        name: savedQuery.name,
        description: savedQuery.description,
        query: savedQuery.query,
        method: savedQuery.method
      },
      metadata: {
        responseTime: `${responseTime}ms`,
        dataType: typeof data,
        recordCount: Array.isArray(data) ? data.length : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error instanceof Error ? error.message : 'Saved query execution failed'
    });
  }
});

// Health check for all plugin instances
pluginRoutes.get('/health', async (req, res) => {
  try {
    const results = [];
    const instances = getAllInstances();
    
    for (const { pluginName, instance } of instances) {
      if (!instance.isActive) {
        results.push({
          pluginName,
          instanceId: instance.id,
          instanceName: instance.name,
          status: 'inactive',
          message: 'Instance is disabled'
        });
        continue;
      }
      
      try {
        const plugin = getPlugin(pluginName);
        if (plugin && plugin.defaultQueries && plugin.defaultQueries.length > 0) {
          // Try the first available query as a health check
          const testQuery = plugin.defaultQueries[0];
          const startTime = Date.now();
          await plugin.executeQuery(testQuery.path, testQuery.method, instance.id);
          const responseTime = Date.now() - startTime;
          
          results.push({
            pluginName,
            instanceId: instance.id,
            instanceName: instance.name,
            status: 'healthy',
            message: 'Connection successful',
            responseTime: `${responseTime}ms`,
            baseUrl: instance.baseUrl
          });
        } else {
          results.push({
            pluginName,
            instanceId: instance.id,
            instanceName: instance.name,
            status: 'unknown',
            message: 'No health check queries available'
          });
        }
      } catch (error) {
        results.push({
          pluginName,
          instanceId: instance.id,
          instanceName: instance.name,
          status: 'error',
          message: error instanceof Error ? error.message : 'Connection failed',
          baseUrl: instance.baseUrl
        });
      }
    }
    
    res.json({ 
      results,
      summary: {
        total: results.length,
        healthy: results.filter(r => r.status === 'healthy').length,
        errors: results.filter(r => r.status === 'error').length,
        inactive: results.filter(r => r.status === 'inactive').length,
        unknown: results.filter(r => r.status === 'unknown').length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Health check failed' });
  }
});

// Update plugin instance configuration
pluginRoutes.put('/instances/:pluginName/:instanceId', (req, res) => {
  try {
    const { pluginName, instanceId } = req.params;
    const updateData = req.body;
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin not found' });
    }
    
    const instanceIndex = plugin.config.instances.findIndex(inst => inst.id === instanceId);
    if (instanceIndex === -1) {
      return res.status(404).json({ message: 'Instance not found' });
    }
    
    // Update the instance
    plugin.config.instances[instanceIndex] = {
      ...plugin.config.instances[instanceIndex],
      ...updateData,
      id: instanceId // Ensure ID doesn't change
    };
    
    // Save the updated configuration to file
    updatePluginConfig(pluginName, plugin.config);
    
    console.log(`🔧 Updated and saved plugin instance: ${pluginName}/${instanceId}`);
    
    res.json({ 
      success: true, 
      instance: plugin.config.instances[instanceIndex] 
    });
  } catch (error) {
    console.error('Failed to update plugin instance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update instance' 
    });
  }
});

// Test plugin instance connection
pluginRoutes.post('/instances/:pluginName/:instanceId/test', async (req, res) => {
  try {
    const { pluginName, instanceId } = req.params;
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin not found' });
    }
    
    const instance = plugin.getInstance(instanceId);
    if (!instance) {
      return res.status(404).json({ message: 'Instance not found' });
    }
    
    // Try to execute a simple test query
    try {
      // Use health check for Jira, simple test for others
      const testQuery = pluginName === 'jira' ? '__health_check__' : 'test';
      const testResult = await plugin.executeQuery(
        testQuery,
        'GET',
        instanceId,
        { test: true }
      );
      
      res.json({
        success: true,
        connected: true,
        message: 'Connection successful',
        testResult: testResult
      });
    } catch (testError) {
      res.json({
        success: false,
        connected: false,
        message: testError instanceof Error ? testError.message : 'Connection failed',
        error: testError instanceof Error ? testError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Failed to test plugin instance:', error);
    res.status(500).json({ message: 'Failed to test connection' });
  }
});

// Activate/deactivate plugin instance
pluginRoutes.post('/instances/:pluginName/:instanceId/toggle', (req, res) => {
  try {
    const { pluginName, instanceId } = req.params;
    const { isActive } = req.body;
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin not found' });
    }
    
    const instanceIndex = plugin.config.instances.findIndex(inst => inst.id === instanceId);
    if (instanceIndex === -1) {
      return res.status(404).json({ message: 'Instance not found' });
    }
    
    // Update the active status
    plugin.config.instances[instanceIndex].isActive = isActive;
    
    // Save the updated configuration to file
    updatePluginConfig(pluginName, plugin.config);
    
    console.log(`🔄 ${isActive ? 'Activated' : 'Deactivated'} and saved plugin instance: ${pluginName}/${instanceId}`);
    
    res.json({ 
      success: true, 
      instance: plugin.config.instances[instanceIndex] 
    });
  } catch (error) {
    console.error('Failed to toggle plugin instance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to toggle instance' 
    });
  }
});

// ========================================
// PLUGIN INSTANCE CREATION ENDPOINTS
// ========================================

// Create a new plugin instance
pluginRoutes.post('/instances/:pluginName', requireAuth, (req, res) => {
  try {
    const { pluginName } = req.params;
    const { name, baseUrl, authType, authConfig, tags, isActive = true } = req.body;
    
    // Validate required fields
    if (!name || !baseUrl) {
      return res.status(400).json({ 
        success: false,
        message: 'Name and baseUrl are required' 
      });
    }
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      return res.status(404).json({ 
        success: false,
        message: 'Plugin not found' 
      });
    }
    
    // Generate a unique instance ID
    const instanceId = `${pluginName}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
    
    // Check if instance with this name already exists
    const existingInstance = plugin.config.instances.find(inst => 
      inst.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingInstance) {
      return res.status(400).json({ 
        success: false,
        message: `Instance with name '${name}' already exists` 
      });
    }
    
    // Create new instance
    const newInstance = {
      id: instanceId,
      name,
      baseUrl: baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl, // Remove trailing slash
      authType: authType || 'none',
      authConfig: authConfig || {},
      isActive,
      tags: tags || []
    };
    
    // Add instance to plugin config
    plugin.config.instances.push(newInstance);
    
    // Save the updated configuration to file
    updatePluginConfig(pluginName, plugin.config);
    
    console.log(`✅ Created and saved new plugin instance: ${pluginName}/${instanceId}`);
    
    res.json({ 
      success: true, 
      message: `Instance '${name}' created successfully`,
      instance: newInstance 
    });
  } catch (error) {
    console.error('Failed to create plugin instance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create instance' 
    });
  }
});

// Delete a plugin instance
pluginRoutes.delete('/instances/:pluginName/:instanceId', requireAuth, (req, res) => {
  try {
    const { pluginName, instanceId } = req.params;
    
    const plugin = getPlugin(pluginName);
    if (!plugin) {
      return res.status(404).json({ 
        success: false,
        message: 'Plugin not found' 
      });
    }
    
    const instanceIndex = plugin.config.instances.findIndex(inst => inst.id === instanceId);
    if (instanceIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: 'Instance not found' 
      });
    }
    
    const instanceName = plugin.config.instances[instanceIndex].name;
    
    // Remove the instance
    plugin.config.instances.splice(instanceIndex, 1);
    
    // Save the updated configuration to file
    updatePluginConfig(pluginName, plugin.config);
    
    console.log(`🗑️ Deleted and saved plugin instance: ${pluginName}/${instanceId}`);
    
    res.json({ 
      success: true, 
      message: `Instance '${instanceName}' deleted successfully`
    });
  } catch (error) {
    console.error('Failed to delete plugin instance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete instance' 
    });
  }
});

// Get available plugin types for creating new instances
pluginRoutes.get('/types', (req, res) => {
  try {
    const plugins = listPlugins();
    const pluginTypes = plugins.map(plugin => ({
      systemName: plugin.systemName,
      displayName: plugin.systemName.charAt(0).toUpperCase() + plugin.systemName.slice(1),
      description: `${plugin.systemName} integration plugin`,
      supportedAuthTypes: ['none', 'basic', 'bearer', 'api_key'],
      defaultQueries: plugin.defaultQueries?.length || 0,
      currentInstances: plugin.config?.instances?.length || 0
    }));
    
    res.json({ 
      success: true,
      pluginTypes 
    });
  } catch (error) {
    console.error('Failed to list plugin types:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to list plugin types' 
    });
  }
});

// Parameter resolution function
async function resolveParameterValue(
  paramConfig: any, 
  context: { 
    clientId?: number, 
    contractId?: number, 
    userId?: number,
    clientShortName?: string,
    clientName?: string,
    clientDomain?: string 
  }
): Promise<string> {
  if (!paramConfig || typeof paramConfig === 'string') {
    return String(paramConfig || '');
  }

  const { source, value, dbTable, dbColumn, contextVar } = paramConfig;

  switch (source) {
    case 'static':
      return String(value || '');
      
    case 'context':
      switch (contextVar) {
        case 'clientId': return String(context.clientId || '');
        case 'clientShortName': return String(context.clientShortName || '');
        case 'clientName': return String(context.clientName || '');
        case 'clientDomain': return String(context.clientDomain || '');
        case 'contractId': return String(context.contractId || '');
        case 'userId': return String(context.userId || '');
        default: return '';
      }
      
    case 'database':
      if (!dbTable || !dbColumn) return '';
      
      try {
        let result: any = null;
        
        switch (dbTable) {
          case 'clients':
            if (context.clientId) {
              const [client] = await db.select({ [dbColumn]: (clients as any)[dbColumn] })
                .from(clients)
                .where(eq(clients.id, context.clientId));
              result = client?.[dbColumn];
            }
            break;
            
          case 'contracts':
            if (context.contractId) {
              const [contract] = await db.select({ [dbColumn]: (contracts as any)[dbColumn] })
                .from(contracts)
                .where(eq(contracts.id, context.contractId));
              result = contract?.[dbColumn];
            } else if (context.clientId) {
              // Get most recent contract for client
              const [contract] = await db.select({ [dbColumn]: (contracts as any)[dbColumn] })
                .from(contracts)
                .where(eq(contracts.clientId, context.clientId))
                .orderBy(contracts.startDate)
                .limit(1);
              result = contract?.[dbColumn];
            }
            break;
            
          case 'users':
            if (context.userId) {
              const [user] = await db.select({ [dbColumn]: (users as any)[dbColumn] })
                .from(users)
                .where(eq(users.id, context.userId));
              result = user?.[dbColumn];
            }
            break;
        }
        
        return String(result || '');
      } catch (error) {
        console.error(`Error resolving database parameter ${dbTable}.${dbColumn}:`, error);
        return '';
      }
      
    default:
      return String(value || '');
  }
}

// Filter processing functions
async function processFilters(query: string, filters: any[], pluginName: string): Promise<string> {
  if (!filters || filters.length === 0) return query;
  
  const enabledFilters = filters.filter(f => f.enabled);
  if (enabledFilters.length === 0) return query;
  
  console.log(`   Processing ${enabledFilters.length} enabled filters:`);
  
  let processedQuery = query;
  
  for (const filter of enabledFilters) {
    console.log(`   Filter: ${filter.field} ${filter.operator} ${filter.value} (${filter.dataType})`);
    
    const filterClause = generateFilterClause(filter, pluginName);
    if (filterClause) {
      processedQuery = appendFilterToQuery(processedQuery, filterClause, pluginName);
    }
  }
  
  return processedQuery;
}

function generateFilterClause(filter: any, pluginName: string): string {
  const { field, operator, value, value2, dataType } = filter;
  
  if (!field || !operator) return '';
  
  switch (pluginName) {
    case 'jira':
      return generateJiraFilterClause(field, operator, value, value2, dataType);
    case 'splunk':
      return generateSplunkFilterClause(field, operator, value, value2, dataType);
    case 'elasticsearch':
      return generateElasticsearchFilterClause(field, operator, value, value2, dataType);
    default:
      // Generic SQL-like filter for database queries
      return generateSqlFilterClause(field, operator, value, value2, dataType);
  }
}

function generateJiraFilterClause(field: string, operator: string, value: any, value2?: any, dataType?: string): string {
  switch (operator) {
    case 'equals':
      return `${field} = "${value}"`;
    case 'not_equals':
      return `${field} != "${value}"`;
    case 'contains':
      return `${field} ~ "${value}"`;
    case 'not_contains':
      return `${field} !~ "${value}"`;
    case 'in':
      const inValues = value.split(',').map((v: string) => `"${v.trim()}"`).join(', ');
      return `${field} IN (${inValues})`;
    case 'not_in':
      const notInValues = value.split(',').map((v: string) => `"${v.trim()}"`).join(', ');
      return `${field} NOT IN (${notInValues})`;
    case 'is_null':
      return `${field} IS EMPTY`;
    case 'is_not_null':
      return `${field} IS NOT EMPTY`;
    case 'greater_than':
      return `${field} > ${value}`;
    case 'greater_equal':
      return `${field} >= ${value}`;
    case 'less_than':
      return `${field} < ${value}`;
    case 'less_equal':
      return `${field} <= ${value}`;
    case 'date_before':
      return `${field} < "${value}"`;
    case 'date_after':
      return `${field} > "${value}"`;
    case 'date_equals':
      return `${field} = "${value}"`;
    default:
      return `${field} = "${value}"`;
  }
}

function generateSplunkFilterClause(field: string, operator: string, value: any, value2?: any, dataType?: string): string {
  switch (operator) {
    case 'equals':
      return `${field}="${value}"`;
    case 'not_equals':
      return `NOT ${field}="${value}"`;
    case 'contains':
      return `${field}="*${value}*"`;
    case 'not_contains':
      return `NOT ${field}="*${value}*"`;
    case 'greater_than':
      return `${field}>${value}`;
    case 'less_than':
      return `${field}<${value}`;
    case 'in':
      const inValues = value.split(',').map((v: string) => `${field}="${v.trim()}"`).join(' OR ');
      return `(${inValues})`;
    case 'is_null':
      return `NOT ${field}=*`;
    case 'is_not_null':
      return `${field}=*`;
    default:
      return `${field}="${value}"`;
  }
}

function generateElasticsearchFilterClause(field: string, operator: string, value: any, value2?: any, dataType?: string): string {
  // Return Elasticsearch query DSL fragments (simplified)
  switch (operator) {
    case 'equals':
      return `{"term": {"${field}": "${value}"}}`;
    case 'contains':
      return `{"wildcard": {"${field}": "*${value}*"}}`;
    case 'greater_than':
      return `{"range": {"${field}": {"gt": ${dataType === 'number' ? value : `"${value}"`}}}}`;
    case 'less_than':
      return `{"range": {"${field}": {"lt": ${dataType === 'number' ? value : `"${value}"`}}}}`;
    case 'between':
      return `{"range": {"${field}": {"gte": ${dataType === 'number' ? value : `"${value}"`}, "lte": ${dataType === 'number' ? value2 : `"${value2}"`}}}}`;
    default:
      return `{"term": {"${field}": "${value}"}}`;
  }
}

function generateSqlFilterClause(field: string, operator: string, value: any, value2?: any, dataType?: string): string {
  const quotedValue = dataType === 'number' || dataType === 'boolean' ? value : `'${value}'`;
  const quotedValue2 = dataType === 'number' || dataType === 'boolean' ? value2 : `'${value2}'`;
  
  switch (operator) {
    case 'equals':
      return `${field} = ${quotedValue}`;
    case 'not_equals':
      return `${field} != ${quotedValue}`;
    case 'contains':
      return `${field} LIKE '%${value}%'`;
    case 'not_contains':
      return `${field} NOT LIKE '%${value}%'`;
    case 'starts_with':
      return `${field} LIKE '${value}%'`;
    case 'ends_with':
      return `${field} LIKE '%${value}'`;
    case 'greater_than':
      return `${field} > ${quotedValue}`;
    case 'greater_equal':
      return `${field} >= ${quotedValue}`;
    case 'less_than':
      return `${field} < ${quotedValue}`;
    case 'less_equal':
      return `${field} <= ${quotedValue}`;
    case 'between':
      return `${field} BETWEEN ${quotedValue} AND ${quotedValue2}`;
    case 'in':
      const inValues = value.split(',').map((v: string) => dataType === 'number' ? v.trim() : `'${v.trim()}'`).join(', ');
      return `${field} IN (${inValues})`;
    case 'not_in':
      const notInValues = value.split(',').map((v: string) => dataType === 'number' ? v.trim() : `'${v.trim()}'`).join(', ');
      return `${field} NOT IN (${notInValues})`;
    case 'is_null':
      return `${field} IS NULL`;
    case 'is_not_null':
      return `${field} IS NOT NULL`;
    default:
      return `${field} = ${quotedValue}`;
  }
}

function appendFilterToQuery(query: string, filterClause: string, pluginName: string): string {
  if (!filterClause) return query;
  
  switch (pluginName) {
    case 'jira':
      // Append to JQL query
      if (query.toLowerCase().includes(' where ') || query.toLowerCase().includes(' and ') || query.toLowerCase().includes(' or ')) {
        return `${query} AND ${filterClause}`;
      } else {
        return query.includes('ORDER BY') 
          ? query.replace(/ORDER BY/i, `AND ${filterClause} ORDER BY`)
          : `${query} AND ${filterClause}`;
      }
    
    case 'splunk':
      // Append to Splunk search
      return `${query} | search ${filterClause}`;
    
    case 'elasticsearch':
      // For Elasticsearch, we'd need to modify the query JSON structure
      // This is a simplified approach
      return query;
    
    default:
      // SQL-like queries
      if (query.toLowerCase().includes(' where ')) {
        return query.replace(/\s+where\s+/i, ` WHERE ${filterClause} AND `);
      } else if (query.toLowerCase().includes(' order by ')) {
        return query.replace(/\s+order\s+by/i, ` WHERE ${filterClause} ORDER BY`);
      } else {
        return `${query} WHERE ${filterClause}`;
      }
  }
}

// Post-query filtering for APIs that don't support query-based filtering
async function applyPostQueryFilters(data: any, filters: any[]): Promise<any> {
  if (!filters || filters.length === 0) return data;
  
  const enabledFilters = filters.filter(f => f.enabled);
  if (enabledFilters.length === 0) return data;
  
  console.log(`   Applying ${enabledFilters.length} post-query filters`);
  
  // Handle different data structures
  if (Array.isArray(data)) {
    return data.filter(item => matchesAllFilters(item, enabledFilters));
  } else if (data && typeof data === 'object') {
    // Handle paginated responses
    if (data.issues && Array.isArray(data.issues)) {
      const filteredIssues = data.issues.filter((item: any) => matchesAllFilters(item, enabledFilters));
      return {
        ...data,
        issues: filteredIssues,
        total: filteredIssues.length,
        startAt: 0,
        maxResults: filteredIssues.length
      };
    } else if (data.results && Array.isArray(data.results)) {
      const filteredResults = data.results.filter((item: any) => matchesAllFilters(item, enabledFilters));
      return {
        ...data,
        results: filteredResults,
        total: filteredResults.length
      };
    } else if (data.data && Array.isArray(data.data)) {
      const filteredData = data.data.filter((item: any) => matchesAllFilters(item, enabledFilters));
      return {
        ...data,
        data: filteredData,
        total: filteredData.length
      };
    }
  }
  
  return data;
}

function matchesAllFilters(item: any, filters: any[]): boolean {
  return filters.every(filter => matchesFilter(item, filter));
}

function matchesFilter(item: any, filter: any): boolean {
  const { field, operator, value, value2, dataType } = filter;
  
  // Get field value (support nested properties like 'fields.status.name')
  const fieldValue = getNestedValue(item, field);
  
  if (fieldValue === undefined || fieldValue === null) {
    return operator === 'is_null';
  }
  
  switch (operator) {
    case 'equals':
      return String(fieldValue).toLowerCase() === String(value).toLowerCase();
    case 'not_equals':
      return String(fieldValue).toLowerCase() !== String(value).toLowerCase();
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
    case 'not_contains':
      return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
    case 'starts_with':
      return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase());
    case 'ends_with':
      return String(fieldValue).toLowerCase().endsWith(String(value).toLowerCase());
    case 'greater_than':
      return Number(fieldValue) > Number(value);
    case 'greater_equal':
      return Number(fieldValue) >= Number(value);
    case 'less_than':
      return Number(fieldValue) < Number(value);
    case 'less_equal':
      return Number(fieldValue) <= Number(value);
    case 'between':
      return Number(fieldValue) >= Number(value) && Number(fieldValue) <= Number(value2);
    case 'in':
      const inValues = String(value).split(',').map(v => v.trim().toLowerCase());
      return inValues.includes(String(fieldValue).toLowerCase());
    case 'not_in':
      const notInValues = String(value).split(',').map(v => v.trim().toLowerCase());
      return !notInValues.includes(String(fieldValue).toLowerCase());
    case 'is_null':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    case 'is_not_null':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    default:
      return false;
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => {
    if (current && typeof current === 'object') {
      return current[prop];
    }
    return undefined;
  }, obj);
}

export default pluginRoutes;