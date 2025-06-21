import { QueryPlugin, registerPlugin } from './plugin-manager';
import { db } from "../db";
import { sql } from "drizzle-orm";

const sqlPlugin: QueryPlugin = {
  systemName: 'sql',
  config: {
    instances: [
      {
        id: 'sql-main',
        name: 'SQL Main Instance',
        baseUrl: 'local',
        authType: 'none',
        isActive: true,
        tags: ['database', 'sql', 'internal']
      }
    ]
  },
  
  async executeQuery(query: string, method: string | undefined, instanceId: string, opts?: Record<string, any>) {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new Error(`SQL instance '${instanceId}' not found`);
    }
    
    if (!instance.isActive) {
      throw new Error(`SQL instance '${instanceId}' is not active`);
    }

    let sqlQuery = "";
    
    try {
      console.log('🔍 SQL Plugin - Query:', query);
      console.log('🔍 SQL Plugin - Type of query:', typeof query);
      
      // Handle test connection queries
      if (query === 'test' || query === '__health_check__') {
        try {
          // Run a simple test query to verify database connection
          const testResult = await db.execute(sql`SELECT 1 as test_connection, NOW() as timestamp`);
          
          return {
            status: 200,
            statusText: 'OK',
            data: {
              rows: testResult.rows || [{ test_connection: 1, timestamp: new Date().toISOString() }],
              rowCount: 1,
              fields: testResult.fields || []
            },
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          console.error('❌ SQL Plugin Test Connection Failed:', error);
          throw new Error('Database connection test failed');
        }
      }
      
      // Parse the query - expecting a SQL string
      if (typeof query === 'string') {
        sqlQuery = query;
      } else if (query && typeof query === 'object') {
        // Handle object with query property
        const queryObj = query as any;
        if (queryObj.query) {
          sqlQuery = queryObj.query;
        } else {
          throw new Error('Invalid query format. Expected SQL string or object with query property.');
        }
      } else {
        throw new Error('Invalid query format. Expected SQL string or object with query property.');
      }
      
      // Basic security check - allow SELECT queries and CTEs (WITH clause)
      const trimmedQuery = sqlQuery.trim();
      const upperQuery = trimmedQuery.toUpperCase();
      
      // Check if it starts with SELECT or WITH (case-insensitive)
      if (!upperQuery.match(/^\s*(SELECT|WITH)\s/i)) {
        throw new Error('Only SELECT queries and CTEs (WITH clause) are allowed');
      }
      
      // Check for dangerous keywords - more precise checking to avoid false positives
      const dangerousPatterns = [
        // Match statements that actually modify data (not in strings or column names)
        /^\s*(DELETE|DROP|TRUNCATE|UPDATE|INSERT|ALTER|EXEC|EXECUTE)\s+/i,
        /;\s*(DELETE|DROP|TRUNCATE|UPDATE|INSERT|ALTER|CREATE|EXEC|EXECUTE)\s+/i,
        // Check for multiple statements (SQL injection risk)
        /;\s*SELECT/i
      ];
      
      // Check each pattern
      for (const pattern of dangerousPatterns) {
        if (pattern.test(sqlQuery)) {
          throw new Error('Query contains forbidden SQL statements');
        }
      }
      
      // Additional check for CREATE keyword specifically (but allow created_at, etc.)
      if (/\bCREATE\s+(TABLE|DATABASE|INDEX|VIEW|PROCEDURE|FUNCTION)\b/i.test(sqlQuery)) {
        throw new Error('Query contains forbidden DDL statements');
      }
      
      console.log('🔍 Executing SQL:', sqlQuery);
      
      // Execute the query using Drizzle's raw SQL
      const result = await db.execute(sql.raw(sqlQuery));
      
      // Format the response
      return {
        status: 200,
        statusText: 'OK',
        data: {
          rows: result.rows || [],
          rowCount: result.rowCount || 0,
          fields: result.fields || []
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ SQL Plugin Error:', error);
      console.error('❌ SQL Plugin Error Details:', {
        query: sqlQuery,
        instanceId,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      
      // Return a more detailed error response
      const errorMessage = error instanceof Error ? error.message : 'Unknown SQL error';
      throw new Error(`SQL execution failed: ${errorMessage}`);
    }
  },
  
  getInstances() {
    return this.config.instances;
  },
  
  getInstance(instanceId: string) {
    return this.config.instances.find(instance => instance.id === instanceId);
  }
};

registerPlugin(sqlPlugin);

export default sqlPlugin; 