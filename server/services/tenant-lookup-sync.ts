import { db } from "../db";
import genericApiPlugin from "../plugins/generic-api-plugin";

export class TenantLookupSyncService {
  private static instance: TenantLookupSyncService;
  
  static getInstance(): TenantLookupSyncService {
    if (!this.instance) {
      this.instance = new TenantLookupSyncService();
    }
    return this.instance;
  }

  /**
   * Sync all tenants from MDR API to the database
   */
  async syncAllTenants(): Promise<void> {
    console.log('🔄 Starting MDR tenant sync...');
    
    try {
      // Step 1: Fetch all tenants from MDR API
      const tenantsQuery = {
        method: 'POST' as const,
        endpoint: '/tenant/filter',
        body: {
          paginationAndSorting: {
            currentPage: 1,
            pageSize: 500, // Get all tenants
            sortProperty: 'id',
            sortDirection: 'ASC'
          }
        }
      };

      const tenantsResult = await genericApiPlugin.executeQuery(
        JSON.stringify(tenantsQuery),
        undefined,
        'mdr-main'
      ) as any;
      
      if (!tenantsResult.data?.response) {
        throw new Error('No tenant data received from MDR API');
      }

      const tenants = tenantsResult.data.response;
      console.log(`📊 Found ${tenants.length} tenants to sync`);

      // Step 2: Get all tenant IDs for visibility data
      const tenantIds = tenants.map((t: any) => t.id);
      
      // Step 3: Fetch visibility data in batches (API might have limits)
      const batchSize = 50;
      const visibilityDataMap = new Map();
      
      for (let i = 0; i < tenantIds.length; i += batchSize) {
        const batchIds = tenantIds.slice(i, i + batchSize);
        
        const visibilityQuery = {
          method: 'POST' as const,
          endpoint: '/tenant-visibility/basic-data',
          body: {
            paginationAndSorting: {
              currentPage: 1,
              pageSize: batchSize,
              sortProperty: 'id',
              sortDirection: 'ASC'
            },
            command: {
              tenantId: batchIds
            }
          }
        };

        try {
          const visibilityResult = await genericApiPlugin.executeQuery(
            JSON.stringify(visibilityQuery),
            undefined,
            'mdr-main'
          ) as any;
          
          if (visibilityResult.data?.response) {
            visibilityResult.data.response.forEach((v: any) => {
              visibilityDataMap.set(v.tenantId, v);
            });
          }
        } catch (error) {
          console.error(`⚠️ Failed to fetch visibility data for batch ${i / batchSize + 1}:`, error);
        }
      }

      console.log(`📊 Fetched visibility data for ${visibilityDataMap.size} tenants`);

      // Step 4: Upsert all tenant data to database
      let successCount = 0;
      let errorCount = 0;

      for (const tenant of tenants) {
        try {
          const visibilityData = visibilityDataMap.get(tenant.id) || {};
          
          const query = {
            text: `
              INSERT INTO tenants_lookup (
                tenant_id,
                name,
                short_name,
                domain,
                response_hours,
                service_activation_date,
                service_expiration_date,
                contract_scope,
                current_scope_servers,
                current_scope_workstations,
                actual_scope_servers,
                actual_scope_workstations,
                online_server_endpoint_count,
                online_workstation_endpoint_count,
                server_count,
                workstation_count,
                last_endpoint_update,
                last_sync_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
              ON CONFLICT (tenant_id) DO UPDATE SET
                name = EXCLUDED.name,
                short_name = EXCLUDED.short_name,
                domain = EXCLUDED.domain,
                response_hours = EXCLUDED.response_hours,
                service_activation_date = EXCLUDED.service_activation_date,
                service_expiration_date = EXCLUDED.service_expiration_date,
                contract_scope = EXCLUDED.contract_scope,
                current_scope_servers = EXCLUDED.current_scope_servers,
                current_scope_workstations = EXCLUDED.current_scope_workstations,
                actual_scope_servers = EXCLUDED.actual_scope_servers,
                actual_scope_workstations = EXCLUDED.actual_scope_workstations,
                online_server_endpoint_count = EXCLUDED.online_server_endpoint_count,
                online_workstation_endpoint_count = EXCLUDED.online_workstation_endpoint_count,
                server_count = EXCLUDED.server_count,
                workstation_count = EXCLUDED.workstation_count,
                last_endpoint_update = EXCLUDED.last_endpoint_update,
                last_sync_at = CURRENT_TIMESTAMP
            `,
            values: [
              tenant.id,
              tenant.name,
              tenant.shortName,
              tenant.domain,
              tenant.responseHours,
              tenant.serviceActivationDate,
              tenant.serviceExpirationDate,
              visibilityData.contractScope,
              visibilityData.currentScopeServers || 0,
              visibilityData.currentScopeWorkstations || 0,
              visibilityData.actualScopeServers || 0,
              visibilityData.actualScopeWorkstations || 0,
              visibilityData.onlineServerEndpointCount || 0,
              visibilityData.onlineWorkstationEndpointCount || 0,
              visibilityData.serverCount || 0,
              visibilityData.workstationCount || 0,
              visibilityData.lastEndpointUpdate,
              new Date()
            ]
          };
          
          await (db as any).query(query.text, query.values);
          successCount++;
          
          // Log GASGI specifically for debugging
          if (tenant.shortName === 'GASGI') {
            console.log(`✅ Successfully synced GASGI tenant: ID ${tenant.id}`);
          }
        } catch (error) {
          console.error(`❌ Failed to sync tenant ${tenant.id} (${tenant.shortName}):`, error);
          errorCount++;
        }
      }

      console.log(`✅ Tenant sync completed: ${successCount} succeeded, ${errorCount} failed`);
      
      // Step 5: Clean up old tenants that no longer exist in MDR
      const currentTenantIds = tenants.map((t: any) => t.id);
      if (currentTenantIds.length > 0) {
        const placeholders = currentTenantIds.map((_: any, index: number) => `$${index + 1}`).join(', ');
        const deleteQuery = {
          text: `DELETE FROM tenants_lookup WHERE tenant_id NOT IN (${placeholders})`,
          values: currentTenantIds
        };
        await (db as any).query(deleteQuery.text, deleteQuery.values);
      }
      
    } catch (error) {
      console.error('❌ Tenant sync failed:', error);
      throw error;
    }
  }

  /**
   * Get tenant by short name from the database
   */
  async getTenantByShortName(shortName: string): Promise<any> {
    const query = {
      text: 'SELECT * FROM tenants_lookup WHERE LOWER(short_name) = LOWER($1) LIMIT 1',
      values: [shortName]
    };
    
    const result = await (db as any).query(query.text, query.values);
    return result.rows[0];
  }

  /**
   * Get tenant by ID from the database
   */
  async getTenantById(tenantId: number): Promise<any> {
    const query = {
      text: 'SELECT * FROM tenants_lookup WHERE tenant_id = $1 LIMIT 1',
      values: [tenantId]
    };
    
    const result = await (db as any).query(query.text, query.values);
    return result.rows[0];
  }

  /**
   * Check if sync is needed (last sync > 24 hours ago)
   */
  async isSyncNeeded(): Promise<boolean> {
    const query = {
      text: 'SELECT COUNT(*) as count, MIN(last_sync_at) as oldest_sync FROM tenants_lookup'
    };
    
    const result = await (db as any).query(query.text, []);
    
    if (result.rows[0].count === 0) {
      return true; // No data, sync needed
    }
    
    const oldestSync = new Date(result.rows[0].oldest_sync);
    const hoursSinceSync = (Date.now() - oldestSync.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceSync > 24;
  }
}

export const tenantLookupSync = TenantLookupSyncService.getInstance(); 