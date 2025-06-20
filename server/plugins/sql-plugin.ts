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
      const trimmedQuery = sqlQuery.trim().toUpperCase();
      if (!trimmedQuery.startsWith('SELECT') && !trimmedQuery.startsWith('WITH')) {
        throw new Error('Only SELECT queries and CTEs (WITH clause) are allowed');
      }
      
      // Check for dangerous keywords - use word boundaries to avoid false positives
      const dangerousKeywords = ['DELETE', 'DROP', 'TRUNCATE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'EXEC', 'EXECUTE'];
      
      // Create a regex pattern that matches whole words only
      for (const keyword of dangerousKeywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(sqlQuery)) {
          // Check if it's a false positive (like CREATE in created_at or CREATED)
          const lowerQuery = sqlQuery.toLowerCase();
          const keywordLower = keyword.toLowerCase();
          
          // Skip if it's part of a column name like created_at, created_date, etc.
          if (keywordLower === 'create' && 
              (lowerQuery.includes('created_at') || 
               lowerQuery.includes('created_date') || 
               lowerQuery.includes('created_by') ||
               lowerQuery.includes('created'))) {
            continue;
          }
          
          throw new Error(`Query contains forbidden keyword: ${keyword}`);
        }
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