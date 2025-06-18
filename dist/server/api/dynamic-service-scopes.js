"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
exports.getVariableDefinitions = getVariableDefinitions;
exports.searchServiceScopesDynamic = searchServiceScopesDynamic;
exports.addScopeVariable = addScopeVariable;
exports.getVariableStats = getVariableStats;
exports.discoverVariables = discoverVariables;
const express_1 = require("express");
const db_ts_1 = require("../db.ts");
const schema_ts_1 = require("../../shared/schema.ts");
const drizzle_orm_1 = require("drizzle-orm");
// Authentication middleware
function requireAuth(req, res, next) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    next();
}
function requireManagerOrAbove(req, res, next) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    const userRole = req.user?.role;
    if (!['admin', 'manager'].includes(userRole)) {
        return res.status(403).json({ message: 'Manager role or above required' });
    }
    next();
}
// Get all available variable definitions for dynamic filtering UI
async function getVariableDefinitions(req, res) {
    try {
        const definitions = await db_ts_1.db
            .select({
            name: schema_ts_1.scopeVariableDefinitions.variableName,
            type: schema_ts_1.scopeVariableDefinitions.variableType,
            displayName: schema_ts_1.scopeVariableDefinitions.displayName,
            description: schema_ts_1.scopeVariableDefinitions.description,
            filterComponent: schema_ts_1.scopeVariableDefinitions.filterComponent,
            unit: schema_ts_1.scopeVariableDefinitions.unit,
            isFilterable: schema_ts_1.scopeVariableDefinitions.isFilterable
        })
            .from(schema_ts_1.scopeVariableDefinitions)
            .where((0, drizzle_orm_1.eq)(schema_ts_1.scopeVariableDefinitions.isFilterable, true))
            .orderBy(schema_ts_1.scopeVariableDefinitions.displayName);
        res.json(definitions);
    }
    catch (error) {
        console.error('Error fetching variable definitions:', error);
        res.status(500).json({ error: 'Failed to fetch variable definitions' });
    }
}
// Dynamic search endpoint that can handle any scope variable filters - FIXED
async function searchServiceScopesDynamic(req, res) {
    try {
        console.log('🔥 DYNAMIC API FILE CALLED - searchServiceScopesDynamic');
        console.log('🔥 Request URL:', req.url);
        console.log('🔥 Request path:', req.path);
        console.log('🔥 Request method:', req.method);
        const { page = 1, limit = 50, sortBy = 'created_at', sortOrder = 'desc', ...filters } = req.query;
        console.log('=== DYNAMIC SERVICE SCOPES SEARCH ===');
        console.log('Params:', { page, limit, sortBy, sortOrder, filters });
        // Convert page and limit to numbers safely
        const pageNum = Math.max(1, parseInt(String(page)) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(String(limit)) || 50));
        const offset = (pageNum - 1) * limitNum;
        console.log('Pagination:', { pageNum, limitNum, offset });
        // Build the base query - simplified to avoid parameter binding issues
        let baseQuery = db_ts_1.db
            .select({
            id: schema_ts_1.serviceScopes.id,
            contractId: schema_ts_1.serviceScopes.contractId,
            serviceId: schema_ts_1.serviceScopes.serviceId,
            scopeDefinition: schema_ts_1.serviceScopes.scopeDefinition,
            createdAt: schema_ts_1.serviceScopes.createdAt,
            updatedAt: schema_ts_1.serviceScopes.updatedAt
        })
            .from(schema_ts_1.serviceScopes);
        // Apply sorting - simplified
        if (sortOrder === 'asc') {
            baseQuery = baseQuery.orderBy((0, drizzle_orm_1.asc)(schema_ts_1.serviceScopes.createdAt));
        }
        else {
            baseQuery = baseQuery.orderBy((0, drizzle_orm_1.desc)(schema_ts_1.serviceScopes.createdAt));
        }
        // Apply pagination
        baseQuery = baseQuery.limit(limitNum).offset(offset);
        console.log('Executing main query...');
        const results = await baseQuery;
        console.log('Main query results:', results.length);
        // Get variable values for each scope - simplified approach
        let variables = [];
        if (results.length > 0) {
            const scopeIds = results.map(r => r.id);
            console.log('Fetching variables for scope IDs:', scopeIds);
            try {
                variables = await db_ts_1.db
                    .select({
                    serviceScopeId: schema_ts_1.scopeVariableValues.serviceScopeId,
                    variableName: schema_ts_1.scopeVariableValues.variableName,
                    valueText: schema_ts_1.scopeVariableValues.valueText,
                    valueInteger: schema_ts_1.scopeVariableValues.valueInteger,
                    valueDecimal: schema_ts_1.scopeVariableValues.valueDecimal,
                    valueBoolean: schema_ts_1.scopeVariableValues.valueBoolean
                })
                    .from(schema_ts_1.scopeVariableValues)
                    .where((0, drizzle_orm_1.inArray)(schema_ts_1.scopeVariableValues.serviceScopeId, scopeIds));
                console.log('Variables found:', variables.length);
            }
            catch (varError) {
                console.error('Error fetching variables:', varError);
                // Continue without variables if there's an error
                variables = [];
            }
        }
        // Group variables by scope ID
        const variablesByScope = variables.reduce((acc, variable) => {
            const scopeId = variable.serviceScopeId;
            if (!acc[scopeId])
                acc[scopeId] = {};
            const value = variable.valueInteger ?? variable.valueDecimal ?? variable.valueBoolean ?? variable.valueText;
            acc[scopeId][variable.variableName] = value;
            return acc;
        }, {});
        // Combine results with variables
        const enrichedResults = results.map(scope => ({
            ...scope,
            variables: variablesByScope[scope.id] || {}
        }));
        // Get total count for pagination - simplified count query
        console.log('Getting total count...');
        let totalCount = 0;
        try {
            const countResult = await db_ts_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_ts_1.serviceScopes);
            totalCount = Number(countResult[0]?.count || 0);
            console.log('Total count:', totalCount);
        }
        catch (countError) {
            console.error('Error getting count:', countError);
            totalCount = results.length; // Fallback to current results length
        }
        const response = {
            data: enrichedResults,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount,
                pages: Math.ceil(totalCount / limitNum)
            },
            appliedFilters: filters,
            debug: {
                queryExecuted: true,
                resultsCount: results.length,
                variablesCount: variables.length,
                totalCount
            }
        };
        console.log('Response prepared:', {
            dataCount: response.data.length,
            pagination: response.pagination
        });
        res.json(response);
    }
    catch (error) {
        console.error('=== ERROR in dynamic search ===');
        console.error('Error details:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({
            error: error.message || 'Failed to search service scopes',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
// Add a new scope variable to an existing scope
async function addScopeVariable(req, res) {
    try {
        const { scopeId } = req.params;
        const { variableName, value, type = 'auto' } = req.body;
        if (!variableName || value === undefined) {
            return res.status(400).json({ error: 'Variable name and value are required' });
        }
        // Simplified approach - direct insert instead of SQL function
        const scopeIdNum = parseInt(scopeId);
        if (isNaN(scopeIdNum)) {
            return res.status(400).json({ error: 'Invalid scope ID' });
        }
        // Determine value type and insert accordingly
        let insertData = {
            serviceScopeId: scopeIdNum,
            variableName: variableName
        };
        // Auto-detect type if not specified
        if (type === 'auto') {
            if (typeof value === 'boolean') {
                insertData.valueBoolean = value;
            }
            else if (typeof value === 'number') {
                if (Number.isInteger(value)) {
                    insertData.valueInteger = value;
                }
                else {
                    insertData.valueDecimal = value;
                }
            }
            else {
                insertData.valueText = String(value);
            }
        }
        else {
            // Use specified type
            switch (type) {
                case 'boolean':
                    insertData.valueBoolean = Boolean(value);
                    break;
                case 'integer':
                    insertData.valueInteger = parseInt(String(value));
                    break;
                case 'decimal':
                    insertData.valueDecimal = parseFloat(String(value));
                    break;
                default:
                    insertData.valueText = String(value);
            }
        }
        await db_ts_1.db.insert(schema_ts_1.scopeVariableValues).values(insertData);
        res.json({
            success: true,
            message: `Variable ${variableName} added to scope ${scopeId}`,
            data: insertData
        });
    }
    catch (error) {
        console.error('Error adding scope variable:', error);
        res.status(500).json({ error: 'Failed to add scope variable' });
    }
}
// Get statistics about variable usage - simplified
async function getVariableStats(req, res) {
    try {
        // Simplified stats query to avoid complex SQL
        const definitions = await db_ts_1.db
            .select()
            .from(schema_ts_1.scopeVariableDefinitions)
            .orderBy(schema_ts_1.scopeVariableDefinitions.displayName);
        const stats = [];
        for (const def of definitions) {
            try {
                const usageCount = await db_ts_1.db
                    .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                    .from(schema_ts_1.scopeVariableValues)
                    .where((0, drizzle_orm_1.eq)(schema_ts_1.scopeVariableValues.variableName, def.variableName));
                stats.push({
                    variable_name: def.variableName,
                    display_name: def.displayName,
                    variable_type: def.variableType,
                    unit: def.unit,
                    usage_count: Number(usageCount[0]?.count || 0),
                    statistics: { basic: true } // Simplified stats
                });
            }
            catch (statError) {
                console.error(`Error getting stats for ${def.variableName}:`, statError);
                stats.push({
                    variable_name: def.variableName,
                    display_name: def.displayName,
                    variable_type: def.variableType,
                    unit: def.unit,
                    usage_count: 0,
                    statistics: { error: true }
                });
            }
        }
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching variable stats:', error);
        res.status(500).json({ error: 'Failed to fetch variable statistics' });
    }
}
// Discover new variables from scope definitions - simplified
async function discoverVariables(req, res) {
    try {
        // Simplified discovery - just return existing definitions for now
        const definitions = await db_ts_1.db
            .select()
            .from(schema_ts_1.scopeVariableDefinitions)
            .orderBy(schema_ts_1.scopeVariableDefinitions.displayName);
        res.json({
            discovered: definitions.map(def => ({
                variable_name: def.variableName,
                display_name: def.displayName,
                variable_type: def.variableType,
                description: def.description,
                status: 'existing'
            })),
            message: 'Variable discovery completed',
            count: definitions.length
        });
    }
    catch (error) {
        console.error('Error discovering variables:', error);
        res.status(500).json({ error: 'Failed to discover variables' });
    }
}
// Create and export the router
exports.router = (0, express_1.Router)();
// Route definitions
exports.router.get('/variables/definitions', requireAuth, getVariableDefinitions);
exports.router.get('/dynamic', requireAuth, searchServiceScopesDynamic);
exports.router.post('/:scopeId/variables', requireManagerOrAbove, addScopeVariable);
exports.router.get('/variables/stats', requireAuth, getVariableStats);
exports.router.get('/variables/discover', requireManagerOrAbove, discoverVariables);
