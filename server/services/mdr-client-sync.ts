import { db } from "../db";
import { clients, clientLicenses, contracts, serviceScopes } from "@shared/schema";
import { eq, sql, and, inArray } from "drizzle-orm";
import genericApiPlugin from "../plugins/generic-api-plugin";
import { TenantLookupSyncService } from "./tenant-lookup-sync";

export class MDRClientSyncService {
  private static instance: MDRClientSyncService;
  private syncInterval: NodeJS.Timeout | null = null;
  private syncErrors: Array<{
    tenantId: number;
    tenantName: string;
    shortName: string | null;
    error: string;
    timestamp: string;
  }> = [];
  
  static getInstance(): MDRClientSyncService {
    if (!this.instance) {
      this.instance = new MDRClientSyncService();
    }
    return this.instance;
  }

  /**
   * Start the hourly sync scheduler
   */
  startScheduler() {
    console.log('🚀 Starting MDR Client Sync Scheduler (hourly)...');
    
    // Run initial sync after 1 minute
    setTimeout(() => {
      this.syncAllClients().catch(console.error);
    }, 60000);
    
    // Schedule hourly sync
    this.syncInterval = setInterval(async () => {
      try {
        console.log('⏰ Running scheduled MDR client sync...');
        await this.syncAllClients();
      } catch (error) {
        console.error('❌ Scheduled sync failed:', error);
      }
    }, 3600000); // 1 hour
  }

  /**
   * Stop the sync scheduler
   */
  stopScheduler() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🛑 MDR Client Sync Scheduler stopped');
    }
  }

  /**
   * Main sync function - syncs all client data from MDR API
   */
  async syncAllClients(): Promise<void> {
    console.log('🔄 Starting comprehensive MDR client sync...');
    const startTime = Date.now();
    
    // Clear previous errors
    this.syncErrors = [];
    
    try {
      // Step 1: Fetch all tenants from MDR API
      const tenantsQuery = {
        method: 'POST' as const,
        endpoint: '/tenant/filter',
        body: {
          paginationAndSorting: {
            currentPage: 1,
            pageSize: 1000, // Get all tenants
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
      console.log(`📊 Found ${tenants.length} tenants in MDR API`);

      // Step 2: Fetch visibility data for all tenants
      const visibilityDataMap = await this.fetchVisibilityData(tenants.map((t: any) => t.id));
      
      // Step 2.5: Fetch detailed tenant data including SIEM EPS
      const detailedTenantDataMap = await this.fetchDetailedTenantData(tenants.map((t: any) => t.id));
      
              // Step 3: Process each tenant and update/create client records
        let created = 0, updated = 0, errors = 0;
        let totalSiemEpsAssigned = 0;
        
        for (const tenant of tenants) {
          try {
            // Skip tenants without shortName
            if (!tenant.shortName) {
              console.warn(`⚠️ Skipping tenant ${tenant.id} - no shortName`);
              this.syncErrors.push({
                tenantId: tenant.id,
                tenantName: tenant.name || 'Unknown',
                shortName: null,
                error: 'Tenant has no shortName configured',
                timestamp: new Date().toISOString()
              });
              errors++;
              continue;
            }
            
            const visibilityData = visibilityDataMap.get(tenant.id) || {};
            const detailedData = detailedTenantDataMap.get(tenant.id) || {};
            
            // Check if client exists
            const existingClient = await db
              .select()
              .from(clients)
              .where(eq(clients.shortName, tenant.shortName))
              .limit(1);
          
                      const clientData = {
              name: tenant.name,
              shortName: tenant.shortName,
              email: tenant.email || `${tenant.shortName.toLowerCase()}@client.com`,
              domain: tenant.domain,
              status: this.getClientStatus(tenant, visibilityData),
              metadata: {
                mdrTenantId: tenant.id,
                responseHours: tenant.responseHours,
                serviceActivationDate: tenant.serviceActivationDate,
                serviceExpirationDate: tenant.serviceExpirationDate,
                contractScope: visibilityData.contractScope,
                siemEps: detailedData.siemEps || 0,
                lastSyncedAt: new Date().toISOString()
              }
            };
          
          let clientId: number;
          
          if (existingClient.length > 0) {
            // Update existing client
            await db
              .update(clients)
              .set(clientData)
              .where(eq(clients.id, existingClient[0].id));
            
            clientId = existingClient[0].id;
            updated++;
          } else {
            // Create new client
            const [newClient] = await db
              .insert(clients)
              .values({
                ...clientData,
                industry: 'Unknown', // Default, can be updated later
                createdAt: new Date()
              })
              .returning();
            
            clientId = newClient.id;
            created++;
          }
          
                      // Step 4: Update license assignments based on actual usage
            const siemEpsAssigned = await this.updateLicenseAssignments(clientId, tenant, visibilityData, detailedData);
            totalSiemEpsAssigned += siemEpsAssigned;
            
            // Step 5: Update or create service scope definitions
            await this.updateServiceScopes(clientId, tenant, visibilityData);
          
        } catch (error: any) {
          console.error(`❌ Failed to sync tenant ${tenant.id} (${tenant.shortName}):`, error);
          
          // Store detailed error information
          this.syncErrors.push({
            tenantId: tenant.id,
            tenantName: tenant.name || 'Unknown',
            shortName: tenant.shortName,
            error: this.formatErrorMessage(error),
            timestamp: new Date().toISOString()
          });
          
          errors++;
        }
      }
      
              const duration = Date.now() - startTime;
        console.log(`✅ MDR client sync completed in ${duration}ms: ${created} created, ${updated} updated, ${errors} errors`);
        console.log(`📊 Total SIEM EPS assigned: ${totalSiemEpsAssigned}`);
        
        // Show SIEM pool status after sync
        await this.showSiemPoolStatus(totalSiemEpsAssigned);
        
        // Update sync statistics with error details
        await this.updateSyncStats(created, updated, errors, duration);
      
    } catch (error) {
      console.error('❌ MDR client sync failed:', error);
      throw error;
    }
  }

  /**
   * Fetch visibility data for tenants in batches
   */
  private async fetchVisibilityData(tenantIds: number[]): Promise<Map<number, any>> {
    const visibilityDataMap = new Map();
    const batchSize = 50;
    
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
    
    return visibilityDataMap;
  }

  /**
   * Fetch detailed tenant data including SIEM EPS
   */
  private async fetchDetailedTenantData(tenantIds: number[]): Promise<Map<number, any>> {
    const detailedDataMap = new Map();
    
    // Fetch details for each tenant individually
    for (const tenantId of tenantIds) {
      try {
        const detailQuery = {
          method: 'GET' as const,
          endpoint: `/tenant/details/${tenantId}`
        };

        const detailResult = await genericApiPlugin.executeQuery(
          JSON.stringify(detailQuery),
          undefined,
          'mdr-main'
        ) as any;
        
        if (detailResult.data) {
          detailedDataMap.set(tenantId, detailResult.data);
          console.log(`📊 Tenant ${tenantId} SIEM EPS: ${detailResult.data.siemEps || 'N/A'}`);
        }
      } catch (error) {
        console.error(`⚠️ Failed to fetch detailed data for tenant ${tenantId}:`, error);
      }
    }
    
    console.log(`✅ Fetched detailed data for ${detailedDataMap.size} tenants`);
    return detailedDataMap;
  }

  /**
   * Update license assignments based on MDR visibility data and detailed tenant data
   * Returns the number of SIEM EPS assigned
   */
  private async updateLicenseAssignments(clientId: number, tenant: any, visibilityData: any, detailedData: any): Promise<number> {
    // Get license pools - use raw queries to avoid type issues
    const siemPoolQuery = "SELECT id FROM license_pools WHERE LOWER(name) LIKE '%siem%' LIMIT 1";
    const edrPoolQuery = "SELECT id FROM license_pools WHERE LOWER(name) LIKE '%edr%' LIMIT 1";
    
    const siemPoolResult = await (db as any).query(siemPoolQuery);
    const edrPoolResult = await (db as any).query(edrPoolQuery);
    
    const siemPoolId = siemPoolResult.rows[0]?.id;
    const edrPoolId = edrPoolResult.rows[0]?.id;
    
    let siemEpsAssigned = 0;
    
    // Update SIEM EPS license assignment
    if (siemPoolId) {
      // Use SIEM EPS from detailed data, fallback to contract scope
      const epsUsage = detailedData.siemEps || visibilityData.contractScope || 0;
      
      if (epsUsage > 0) {
        await this.upsertLicenseAssignment(clientId, siemPoolId, epsUsage, 
          `MDR Sync: ${epsUsage} EPS allocated from tenant details (API: /tenant/details/${tenant.id})`);
        
        console.log(`✅ Assigned ${epsUsage} SIEM EPS to client ${tenant.shortName}`);
        siemEpsAssigned = epsUsage;
      }
    }
    
    // Update EDR license assignment
    if (edrPoolId && visibilityData.actualScopeWorkstations != null) {
      const edrCount = visibilityData.actualScopeWorkstations + (visibilityData.actualScopeServers || 0);
      
      if (edrCount > 0) {
        await this.upsertLicenseAssignment(clientId, edrPoolId, edrCount,
          `MDR Sync: ${edrCount} endpoints (${visibilityData.actualScopeWorkstations} workstations + ${visibilityData.actualScopeServers || 0} servers)`);
      }
    }
    
    return siemEpsAssigned;
  }

  /**
   * Upsert a license assignment
   */
  private async upsertLicenseAssignment(
    clientId: number, 
    licensePoolId: number, 
    assignedLicenses: number, 
    notes: string
  ) {
    // Check if assignment exists
    const existing = await db
      .select()
      .from(clientLicenses)
      .where(and(
        eq(clientLicenses.clientId, clientId),
        eq(clientLicenses.licensePoolId, licensePoolId)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing
      await db
        .update(clientLicenses)
        .set({
          assignedLicenses,
          notes: notes + ` (Updated: ${new Date().toISOString()})`
        })
        .where(eq(clientLicenses.id, existing[0].id));
    } else {
      // Create new
      await db
        .insert(clientLicenses)
        .values({
          clientId,
          licensePoolId,
          assignedLicenses,
          assignedDate: new Date(),
          notes
        });
    }
  }

  /**
   * Update service scope definitions based on MDR data
   */
  private async updateServiceScopes(clientId: number, tenant: any, visibilityData: any) {
    // Find active contracts for the client
    const activeContracts = await db
      .select()
      .from(contracts)
      .where(and(
        eq(contracts.clientId, clientId),
        eq(contracts.status, 'active')
      ));
    
    for (const contract of activeContracts) {
      // Update service scope metadata with MDR data
      const mdrData = {
        contractScope: visibilityData.contractScope,
        currentScopeServers: visibilityData.currentScopeServers,
        currentScopeWorkstations: visibilityData.currentScopeWorkstations,
        actualScopeServers: visibilityData.actualScopeServers,
        actualScopeWorkstations: visibilityData.actualScopeWorkstations,
        onlineServerEndpointCount: visibilityData.onlineServerEndpointCount,
        onlineWorkstationEndpointCount: visibilityData.onlineWorkstationEndpointCount,
        lastEndpointUpdate: visibilityData.lastEndpointUpdate,
        lastSyncedAt: new Date().toISOString()
      };
      
      const updateQuery = `
        UPDATE service_scopes
        SET metadata = jsonb_set(
          COALESCE(metadata::jsonb, '{}'::jsonb),
          '{mdrData}',
          $1::jsonb
        )
        WHERE contract_id = $2
          AND service_id IN (
            SELECT id FROM services 
            WHERE LOWER(name) LIKE '%mdr%' 
               OR LOWER(category) = 'mdr'
          )
      `;
      
      await (db as any).query(updateQuery, [JSON.stringify(mdrData), contract.id]);
    }
  }

  /**
   * Determine client status based on MDR data
   */
  private getClientStatus(tenant: any, visibilityData: any): string {
    // Check if service is expired
    if (tenant.serviceExpirationDate && new Date(tenant.serviceExpirationDate) < new Date()) {
      return 'inactive';
    }
    
    // Check if endpoints are online
    const onlineEndpoints = (visibilityData.onlineServerEndpointCount || 0) + 
                           (visibilityData.onlineWorkstationEndpointCount || 0);
    
    if (onlineEndpoints === 0 && visibilityData.contractScope > 0) {
      return 'awaiting'; // Has contract but no active endpoints - use valid status
    }
    
    return 'active';
  }

  /**
   * Format error message for better readability
   */
  private formatErrorMessage(error: any): string {
    if (error.code === '42703' && error.message.includes('column "service_type"')) {
      return 'Database schema mismatch: service_type column not found (should use category)';
    }
    
    if (error.code === '23514' && error.constraint === 'clients_status_check') {
      return 'Invalid client status: "pending" is not a valid status. Valid statuses are: active, inactive, prospect, or awaiting';
    }
    
    if (error.message?.includes('Cannot read properties of null')) {
      return 'Null value error: Some required tenant data is missing';
    }
    
    return error.message || error.toString();
  }

  /**
   * Update sync statistics for monitoring
   */
  private async updateSyncStats(created: number, updated: number, errors: number, duration: number) {
    try {
      const statsData = JSON.stringify({
        lastSync: new Date().toISOString(),
        created,
        updated,
        errors,
        errorDetails: this.syncErrors,
        duration,
        status: errors === 0 ? 'success' : 'partial'
      });
      
      const statsQuery = `
        INSERT INTO system_settings (key, value, updated_at)
        VALUES ('mdr_sync_stats', $1::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value,
            updated_at = NOW()
      `;
      
      await (db as any).query(statsQuery, [statsData]);
    } catch (error) {
      console.error('Failed to update sync stats:', error);
    }
  }

  /**
   * Get sync status and statistics
   */
  async getSyncStatus() {
    const query = "SELECT value FROM system_settings WHERE key = 'mdr_sync_stats'";
    const result = await (db as any).query(query);
    
    return result.rows[0]?.value || null;
  }

  /**
   * Show SIEM pool status after sync
   */
  private async showSiemPoolStatus(totalAssigned: number) {
    try {
      const poolQuery = `
        SELECT 
          lp.name,
          lp.total_licenses,
          COALESCE(SUM(cl.assigned_licenses), 0) as assigned_licenses,
          lp.total_licenses - COALESCE(SUM(cl.assigned_licenses), 0) as available_licenses
        FROM license_pools lp
        LEFT JOIN client_licenses cl ON cl.license_pool_id = lp.id
        WHERE LOWER(lp.name) LIKE '%siem%'
        GROUP BY lp.id, lp.name, lp.total_licenses
      `;
      
      const result = await (db as any).query(poolQuery);
      
      if (result.rows.length > 0) {
        const pool = result.rows[0];
        console.log(`\n📊 SIEM EPS Pool Status:`);
        console.log(`   Pool: ${pool.name}`);
        console.log(`   Total Licenses: ${pool.total_licenses}`);
        console.log(`   Assigned: ${pool.assigned_licenses}`);
        console.log(`   Available: ${pool.available_licenses}`);
        console.log(`   Usage: ${Math.round((pool.assigned_licenses / pool.total_licenses) * 100)}%\n`);
      }
    } catch (error) {
      console.error('Failed to show SIEM pool status:', error);
    }
  }

  /**
   * Get detailed error information from the last sync
   */
  async getSyncErrors() {
    const status = await this.getSyncStatus();
    return status?.errorDetails || [];
  }
}

export const mdrClientSync = MDRClientSyncService.getInstance(); 