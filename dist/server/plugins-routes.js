"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const plugin_manager_1 = require("./plugins/plugin-manager");
const db_1 = require("./db");
const schema_1 = require("@shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const pluginRoutes = express_1.default.Router();
// Middleware for authentication
function requireAuth(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({ message: 'Authentication required' });
}
// Get all available plugins
pluginRoutes.get('/', (req, res) => {
    try {
        const plugins = (0, plugin_manager_1.listPlugins)().map(plugin => ({
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
    }
    catch (error) {
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
        const plugins = (0, plugin_manager_1.listPlugins)()
            .filter(plugin => plugin.config?.instances?.some(instance => instance.isActive))
            .map(plugin => ({
            systemName: plugin.systemName,
            displayName: plugin.systemName.charAt(0).toUpperCase() + plugin.systemName.slice(1),
            instanceCount: plugin.config?.instances?.filter(instance => instance.isActive).length || 0,
            defaultQueries: plugin.defaultQueries || []
        }));
        res.json(plugins);
    }
    catch (error) {
        console.error('Failed to list available plugins:', error);
        res.status(500).json({ message: 'Failed to list available plugins' });
    }
});
// Get all instances across all plugins
pluginRoutes.get('/instances', (req, res) => {
    try {
        const instances = (0, plugin_manager_1.getAllInstances)();
        res.json({ instances });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to list instances' });
    }
});
// Get instances for a specific plugin
pluginRoutes.get('/:pluginName/instances', (req, res) => {
    try {
        const { pluginName } = req.params;
        const plugin = (0, plugin_manager_1.getPlugin)(pluginName);
        if (!plugin) {
            return res.status(404).json({ message: 'Plugin not found' });
        }
        const instances = plugin.getInstances();
        res.json({ instances });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to get plugin instances' });
    }
});
// Test connection for a specific instance
pluginRoutes.post('/:pluginName/instances/:instanceId/test-connection', requireAuth, async (req, res) => {
    try {
        const { pluginName, instanceId } = req.params;
        console.log(`🔍 Testing connection for plugin: ${pluginName}, instance: ${instanceId}`);
        const plugin = (0, plugin_manager_1.getPlugin)(pluginName);
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
            }
            else {
                console.log(`⚠️ No test queries available for ${pluginName}/${instanceId}`);
                testResult = {
                    success: true,
                    status: 'configured',
                    message: 'Instance is configured but no test queries available',
                    responseTime: '0ms'
                };
            }
        }
        catch (error) {
            console.error(`❌ Health check failed for ${pluginName}/${instanceId}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Connection failed';
            const errorType = error instanceof Error ? error.name : 'Unknown error';
            // Provide more specific error messages based on common issues
            let userFriendlyMessage = errorMessage;
            if (errorMessage.includes('ECONNREFUSED')) {
                userFriendlyMessage = `Cannot connect to ${instance.baseUrl} - service may be down`;
            }
            else if (errorMessage.includes('ENOTFOUND')) {
                userFriendlyMessage = `Cannot resolve hostname: ${instance.baseUrl}`;
            }
            else if (errorMessage.includes('401')) {
                userFriendlyMessage = 'Authentication failed - check credentials';
            }
            else if (errorMessage.includes('403')) {
                userFriendlyMessage = 'Access denied - insufficient permissions';
            }
            else if (errorMessage.includes('timeout')) {
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
    }
    catch (error) {
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
        const plugin = (0, plugin_manager_1.getPlugin)(pluginName);
        if (!plugin) {
            return res.status(404).json({ message: 'Plugin not found' });
        }
        res.json({
            queries: plugin.defaultQueries || [],
            systemName: plugin.systemName
        });
    }
    catch (error) {
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
        const plugin = (0, plugin_manager_1.getPlugin)(pluginName);
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
            warnings: [],
            suggestions: []
        };
        // Plugin-specific validation
        if (pluginName === 'jira') {
            if (!query.includes('project') && !query.includes('assignee')) {
                validation.warnings.push('Consider adding project or assignee filters for better performance');
            }
            if (query.length > 500) {
                validation.warnings.push('Very long JQL query - consider breaking it down');
            }
        }
        else if (pluginName === 'splunk') {
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
    }
    catch (error) {
        res.status(500).json({
            message: error instanceof Error ? error.message : 'Query validation failed'
        });
    }
});
// Execute a custom query with detailed results
pluginRoutes.post('/:pluginName/instances/:instanceId/query', requireAuth, async (req, res) => {
    try {
        const { pluginName, instanceId } = req.params;
        const { query, method = 'GET', opts = {}, saveAs } = req.body;
        const plugin = (0, plugin_manager_1.getPlugin)(pluginName);
        if (!plugin) {
            return res.status(404).json({ message: 'Plugin not found' });
        }
        const instance = plugin.getInstance(instanceId);
        if (!instance) {
            return res.status(404).json({ message: 'Instance not found' });
        }
        const startTime = Date.now();
        const data = await plugin.executeQuery(query, method, instanceId, opts);
        const responseTime = Date.now() - startTime;
        // Save query if requested
        if (saveAs && req.user) {
            try {
                await db_1.db.insert(schema_1.savedQueries).values({
                    userId: req.user.id,
                    pluginName,
                    instanceId,
                    name: saveAs,
                    query,
                    method,
                    description: `Saved query for ${pluginName}`,
                    createdAt: new Date()
                });
            }
            catch (saveError) {
                console.warn('Failed to save query:', saveError);
            }
        }
        res.json({
            success: true,
            data,
            metadata: {
                query,
                method,
                responseTime: `${responseTime}ms`,
                dataType: typeof data,
                recordCount: Array.isArray(data) ? data.length : (data && typeof data === 'object' && 'total' in data) ? data.total : null,
                instance: {
                    id: instance.id,
                    name: instance.name
                }
            },
            timestamp: new Date().toISOString(),
            saved: !!saveAs
        });
    }
    catch (error) {
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
        const plugin = (0, plugin_manager_1.getPlugin)(pluginName);
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
    }
    catch (error) {
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
        let whereClause = (0, drizzle_orm_1.eq)(schema_1.savedQueries.userId, req.user.id);
        if (pluginName) {
            whereClause = (0, drizzle_orm_1.and)(whereClause, (0, drizzle_orm_1.eq)(schema_1.savedQueries.pluginName, pluginName));
        }
        if (instanceId) {
            whereClause = (0, drizzle_orm_1.and)(whereClause, (0, drizzle_orm_1.eq)(schema_1.savedQueries.instanceId, instanceId));
        }
        const queries = await db_1.db.select().from(schema_1.savedQueries).where(whereClause);
        res.json({ queries });
    }
    catch (error) {
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
        const [savedQuery] = await db_1.db.select().from(schema_1.savedQueries)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.savedQueries.id, parseInt(queryId)), (0, drizzle_orm_1.eq)(schema_1.savedQueries.userId, req.user.id)));
        if (!savedQuery) {
            return res.status(404).json({ message: 'Saved query not found' });
        }
        const plugin = (0, plugin_manager_1.getPlugin)(savedQuery.pluginName);
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
    }
    catch (error) {
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
        const instances = (0, plugin_manager_1.getAllInstances)();
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
                const plugin = (0, plugin_manager_1.getPlugin)(pluginName);
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
                }
                else {
                    results.push({
                        pluginName,
                        instanceId: instance.id,
                        instanceName: instance.name,
                        status: 'unknown',
                        message: 'No health check queries available'
                    });
                }
            }
            catch (error) {
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
    }
    catch (error) {
        res.status(500).json({ message: 'Health check failed' });
    }
});
// Update plugin instance configuration
pluginRoutes.put('/instances/:pluginName/:instanceId', (req, res) => {
    try {
        const { pluginName, instanceId } = req.params;
        const updateData = req.body;
        const plugin = (0, plugin_manager_1.getPlugin)(pluginName);
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
        (0, plugin_manager_1.updatePluginConfig)(pluginName, plugin.config);
        console.log(`🔧 Updated and saved plugin instance: ${pluginName}/${instanceId}`);
        res.json({
            success: true,
            instance: plugin.config.instances[instanceIndex]
        });
    }
    catch (error) {
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
        const plugin = (0, plugin_manager_1.getPlugin)(pluginName);
        if (!plugin) {
            return res.status(404).json({ message: 'Plugin not found' });
        }
        const instance = plugin.getInstance(instanceId);
        if (!instance) {
            return res.status(404).json({ message: 'Instance not found' });
        }
        // Try to execute a simple test query
        try {
            const testResult = await plugin.executeQuery('test', // Simple test query
            'GET', instanceId, { test: true });
            res.json({
                success: true,
                connected: true,
                message: 'Connection successful',
                testResult: testResult
            });
        }
        catch (testError) {
            res.json({
                success: false,
                connected: false,
                message: testError instanceof Error ? testError.message : 'Connection failed',
                error: testError instanceof Error ? testError.message : 'Unknown error'
            });
        }
    }
    catch (error) {
        console.error('Failed to test plugin instance:', error);
        res.status(500).json({ message: 'Failed to test connection' });
    }
});
// Activate/deactivate plugin instance
pluginRoutes.post('/instances/:pluginName/:instanceId/toggle', (req, res) => {
    try {
        const { pluginName, instanceId } = req.params;
        const { isActive } = req.body;
        const plugin = (0, plugin_manager_1.getPlugin)(pluginName);
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
        (0, plugin_manager_1.updatePluginConfig)(pluginName, plugin.config);
        console.log(`🔄 ${isActive ? 'Activated' : 'Deactivated'} and saved plugin instance: ${pluginName}/${instanceId}`);
        res.json({
            success: true,
            instance: plugin.config.instances[instanceIndex]
        });
    }
    catch (error) {
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
        const plugin = (0, plugin_manager_1.getPlugin)(pluginName);
        if (!plugin) {
            return res.status(404).json({
                success: false,
                message: 'Plugin not found'
            });
        }
        // Generate a unique instance ID
        const instanceId = `${pluginName}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
        // Check if instance with this name already exists
        const existingInstance = plugin.config.instances.find(inst => inst.name.toLowerCase() === name.toLowerCase());
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
        (0, plugin_manager_1.updatePluginConfig)(pluginName, plugin.config);
        console.log(`✅ Created and saved new plugin instance: ${pluginName}/${instanceId}`);
        res.json({
            success: true,
            message: `Instance '${name}' created successfully`,
            instance: newInstance
        });
    }
    catch (error) {
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
        const plugin = (0, plugin_manager_1.getPlugin)(pluginName);
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
        (0, plugin_manager_1.updatePluginConfig)(pluginName, plugin.config);
        console.log(`🗑️ Deleted and saved plugin instance: ${pluginName}/${instanceId}`);
        res.json({
            success: true,
            message: `Instance '${instanceName}' deleted successfully`
        });
    }
    catch (error) {
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
        const plugins = (0, plugin_manager_1.listPlugins)();
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
    }
    catch (error) {
        console.error('Failed to list plugin types:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list plugin types'
        });
    }
});
exports.default = pluginRoutes;
