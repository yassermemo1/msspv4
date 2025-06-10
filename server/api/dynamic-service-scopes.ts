import { Request, Response, Router } from 'express';
import { db } from '../db.ts';
import { serviceScopes, scopeVariableDefinitions, scopeVariableValues } from '../../shared/schema.ts';
import { eq, and, gte, lte, like, sql } from 'drizzle-orm';

// Get all available variable definitions for dynamic filtering UI
export async function getVariableDefinitions(req: Request, res: Response) {
  try {
    const definitions = await db
      .select({
        name: scopeVariableDefinitions.variableName,
        type: scopeVariableDefinitions.variableType,
        displayName: scopeVariableDefinitions.displayName,
        description: scopeVariableDefinitions.description,
        filterComponent: scopeVariableDefinitions.filterComponent,
        unit: scopeVariableDefinitions.unit,
        isFilterable: scopeVariableDefinitions.isFilterable
      })
      .from(scopeVariableDefinitions)
      .where(eq(scopeVariableDefinitions.isFilterable, true))
      .orderBy(scopeVariableDefinitions.displayName);

    res.json(definitions);
  } catch (error) {
    console.error('Error fetching variable definitions:', error);
    res.status(500).json({ error: 'Failed to fetch variable definitions' });
  }
}

// Dynamic search endpoint that can handle any scope variable filters
export async function searchServiceScopesDynamic(req: Request, res: Response) {
  try {
    const {
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'desc',
      ...filters
    } = req.query;

    // Build dynamic filter query
    const filterConditions: any[] = [];
    const filterParams: Record<string, any> = {};

    // Process each filter
    for (const [key, value] of Object.entries(filters)) {
      if (!value || value === '') continue;

      // Handle range filters (key_min, key_max)
      if (key.endsWith('_min')) {
        const variableName = key.replace('_min', '');
        filterConditions.push(sql`
          EXISTS (
            SELECT 1 FROM scope_variable_values svv 
            WHERE svv.service_scope_id = service_scopes.id 
            AND svv.variable_name = ${variableName}
            AND (svv.value_integer >= ${Number(value)} OR svv.value_decimal >= ${Number(value)})
          )
        `);
      } else if (key.endsWith('_max')) {
        const variableName = key.replace('_max', '');
        filterConditions.push(sql`
          EXISTS (
            SELECT 1 FROM scope_variable_values svv 
            WHERE svv.service_scope_id = service_scopes.id 
            AND svv.variable_name = ${variableName}
            AND (svv.value_integer <= ${Number(value)} OR svv.value_decimal <= ${Number(value)})
          )
        `);
      } else {
        // Exact match or text search
        if (typeof value === 'string' && value.includes('*')) {
          // Wildcard search
          const searchPattern = value.replace(/\*/g, '%');
          filterConditions.push(sql`
            EXISTS (
              SELECT 1 FROM scope_variable_values svv 
              WHERE svv.service_scope_id = service_scopes.id 
              AND svv.variable_name = ${key}
              AND svv.value_text ILIKE ${searchPattern}
            )
          `);
        } else {
          // Exact match
          filterConditions.push(sql`
            EXISTS (
              SELECT 1 FROM scope_variable_values svv 
              WHERE svv.service_scope_id = service_scopes.id 
              AND svv.variable_name = ${key}
              AND (
                svv.value_text = ${String(value)} OR
                svv.value_integer = ${Number(value)} OR
                svv.value_decimal = ${Number(value)}
              )
            )
          `);
        }
      }
    }

    // Build the main query
    let query = db
      .select({
        id: serviceScopes.id,
        contractId: serviceScopes.contractId,
        serviceId: serviceScopes.serviceId,
        scopeDefinition: serviceScopes.scopeDefinition,
        createdAt: serviceScopes.createdAt,
        updatedAt: serviceScopes.updatedAt
      })
      .from(serviceScopes);

    // Apply filters
    if (filterConditions.length > 0) {
      query = query.where(and(...filterConditions));
    }

    // Apply sorting
    const validSortColumns = ['created_at', 'updated_at', 'id'];
    const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy as string : 'created_at';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    
    if (order === 'asc') {
      query = query.orderBy(sql`${sql.identifier(sortColumn)} ASC`);
    } else {
      query = query.orderBy(sql`${sql.identifier(sortColumn)} DESC`);
    }

    // Apply pagination
    const offset = (Number(page) - 1) * Number(limit);
    query = query.limit(Number(limit)).offset(offset);

    const results = await query;

    // Get variable values for each scope
    const scopeIds = results.map(r => r.id);
    const variables = scopeIds.length > 0 ? await db
      .select({
        serviceScopeId: scopeVariableValues.serviceScopeId,
        variableName: scopeVariableValues.variableName,
        valueText: scopeVariableValues.valueText,
        valueInteger: scopeVariableValues.valueInteger,
        valueDecimal: scopeVariableValues.valueDecimal,
        valueBoolean: scopeVariableValues.valueBoolean
      })
      .from(scopeVariableValues)
      .where(sql`service_scope_id IN (${sql.join(scopeIds, sql`, `)})`) : [];

    // Group variables by scope ID
    const variablesByScope = variables.reduce((acc, variable) => {
      const scopeId = variable.serviceScopeId;
      if (!acc[scopeId]) acc[scopeId] = {};
      
      const value = variable.valueInteger ?? variable.valueDecimal ?? variable.valueBoolean ?? variable.valueText;
      acc[scopeId][variable.variableName] = value;
      
      return acc;
    }, {} as Record<number, Record<string, any>>);

    // Combine results with variables
    const enrichedResults = results.map(scope => ({
      ...scope,
      variables: variablesByScope[scope.id] || {}
    }));

    // Get total count for pagination
    let countQuery = db
      .select({ count: sql`count(*)` })
      .from(serviceScopes);

    if (filterConditions.length > 0) {
      countQuery = countQuery.where(and(...filterConditions));
    }

    const [{ count }] = await countQuery;
    const totalCount = Number(count);

    res.json({
      data: enrichedResults,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / Number(limit))
      },
      appliedFilters: filters
    });

  } catch (error) {
    console.error('Error in dynamic search:', error);
    res.status(500).json({ error: 'Failed to search service scopes' });
  }
}

// Add a new scope variable to an existing scope
export async function addScopeVariable(req: Request, res: Response) {
  try {
    const { scopeId } = req.params;
    const { variableName, value, type = 'auto' } = req.body;

    if (!variableName || value === undefined) {
      return res.status(400).json({ error: 'Variable name and value are required' });
    }

    // Use the SQL function to add the variable
    await db.execute(sql`
      SELECT add_scope_variable(${Number(scopeId)}, ${variableName}, ${String(value)}, ${type})
    `);

    res.json({ 
      success: true, 
      message: `Variable ${variableName} added to scope ${scopeId}` 
    });

  } catch (error) {
    console.error('Error adding scope variable:', error);
    res.status(500).json({ error: 'Failed to add scope variable' });
  }
}

// Get statistics about variable usage
export async function getVariableStats(req: Request, res: Response) {
  try {
    const stats = await db.execute(sql`
      SELECT 
        svd.variable_name,
        svd.display_name,
        svd.variable_type,
        svd.unit,
        COUNT(svv.id) as usage_count,
        CASE 
          WHEN svd.variable_type = 'integer' THEN 
            json_build_object(
              'min', MIN(svv.value_integer),
              'max', MAX(svv.value_integer),
              'avg', ROUND(AVG(svv.value_integer), 2)
            )
          WHEN svd.variable_type = 'decimal' THEN 
            json_build_object(
              'min', MIN(svv.value_decimal),
              'max', MAX(svv.value_decimal),
              'avg', ROUND(AVG(svv.value_decimal), 2)
            )
          ELSE 
            json_build_object(
              'unique_values', COUNT(DISTINCT svv.value_text)
            )
        END as statistics
      FROM scope_variable_definitions svd
      LEFT JOIN scope_variable_values svv ON svd.variable_name = svv.variable_name
      GROUP BY svd.variable_name, svd.display_name, svd.variable_type, svd.unit
      ORDER BY usage_count DESC, svd.display_name
    `);

    res.json(stats.rows);
  } catch (error) {
    console.error('Error fetching variable stats:', error);
    res.status(500).json({ error: 'Failed to fetch variable statistics' });
  }
}

// Discover new variables from scope definitions
export async function discoverVariables(req: Request, res: Response) {
  try {
    const discovered = await db.execute(sql`SELECT * FROM auto_discover_variables()`);
    
    res.json({
      newVariables: discovered.rows,
      message: `Found ${discovered.rows.length} potential new variables`
    });
  } catch (error) {
    console.error('Error discovering variables:', error);
    res.status(500).json({ error: 'Failed to discover variables' });
  }
}

// Create and export the router
export const router = Router();

// Route definitions
router.get('/variables/definitions', getVariableDefinitions);
router.get('/dynamic', searchServiceScopesDynamic);
router.post('/:scopeId/variables', addScopeVariable);
router.get('/variables/stats', getVariableStats);
router.get('/variables/discover', discoverVariables);