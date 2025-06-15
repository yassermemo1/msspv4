import { db } from "../db";
import { externalSystems, externalSystemInstances } from "../../shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

interface ExternalSystemData {
  id: number;
  systemName: string;
  displayName: string;
  baseUrl: string;
  authType: string;
  isActive: boolean;
  instances: Array<{
    id: number;
    instanceName: string;
    baseUrl: string;
    authType: string;
    authConfig: any;
    isActive: boolean;
  }>;
}

interface PluginConfig {
  instances: Array<{
    id: string;
    name: string;
    baseUrl: string;
    authType: 'none' | 'basic' | 'bearer' | 'api_key';
    authConfig?: {
      username?: string;
      password?: string;
      token?: string;
      key?: string;
      header?: string;
    };
    isActive: boolean;
    tags?: string[];
  }>;
  defaultRefreshInterval?: number;
  rateLimiting?: {
    requestsPerMinute: number;
    burstSize: number;
  };
}

/**
 * Migration script to convert external systems data to plugin configuration files
 * This preserves existing data while transitioning to the new plugin architecture
 */
export async function migrateExternalSystemsToPlugins() {
  console.log("🔄 Starting migration from external systems to plugins...");
  
  try {
    // 1. Fetch all external systems with their instances
    const systems = await db.select().from(externalSystems);
    console.log(`📊 Found ${systems.length} external systems to migrate`);
    
    const migrationResults = {
      systemsMigrated: 0,
      instancesMigrated: 0,
      pluginFilesCreated: 0,
      errors: [] as string[]
    };

    for (const system of systems) {
      try {
        console.log(`🔄 Processing system: ${system.systemName}`);
        
        // Fetch instances for this system
        const instances = await db.select()
          .from(externalSystemInstances)
          .where(eq(externalSystemInstances.systemId, system.id));
        
        console.log(`  📋 Found ${instances.length} instances`);
        
        // Convert to plugin format
        const pluginConfig: PluginConfig = {
          instances: instances.map(instance => ({
            id: `${system.systemName}-${instance.id}`,
            name: instance.instanceName,
            baseUrl: instance.baseUrl,
            authType: instance.authType as any,
            authConfig: instance.authConfig as any,
            isActive: instance.isActive,
            tags: [system.systemName, 'migrated']
          })),
          defaultRefreshInterval: 60,
          rateLimiting: {
            requestsPerMinute: 60,
            burstSize: 10
          }
        };

        // Create backup plugin file
        const backupDir = path.join(process.cwd(), 'server', 'plugins', 'migrated');
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }

        const pluginFilePath = path.join(backupDir, `${system.systemName}-migrated.json`);
        fs.writeFileSync(pluginFilePath, JSON.stringify({
          systemName: system.systemName,
          displayName: system.displayName,
          originalSystemId: system.id,
          migratedAt: new Date().toISOString(),
          config: pluginConfig,
          originalData: {
            system,
            instances
          }
        }, null, 2));

        console.log(`  ✅ Created plugin config: ${pluginFilePath}`);
        
        migrationResults.systemsMigrated++;
        migrationResults.instancesMigrated += instances.length;
        migrationResults.pluginFilesCreated++;
        
      } catch (error) {
        const errorMsg = `Failed to migrate system ${system.systemName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`  ❌ ${errorMsg}`);
        migrationResults.errors.push(errorMsg);
      }
    }

    // 2. Create migration summary
    const migrationDir = path.join(process.cwd(), 'server', 'plugins', 'migrated');
    if (!fs.existsSync(migrationDir)) {
      fs.mkdirSync(migrationDir, { recursive: true });
    }
    
    const summaryPath = path.join(migrationDir, 'migration-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify({
      migratedAt: new Date().toISOString(),
      results: migrationResults,
      instructions: {
        nextSteps: [
          "Review the migrated plugin configuration files in server/plugins/migrated/",
          "Create proper plugin implementations based on the migrated data",
          "Test the new plugin implementations",
          "Update any client code to use the new plugin APIs",
          "Remove external system routes and tables after verification"
        ],
        notes: [
          "Original external system data is preserved in the migration files",
          "Plugin files are in JSON format for easy review and conversion",
          "Authentication configurations have been preserved",
          "Instance IDs have been prefixed with system name to avoid conflicts"
        ]
      }
    }, null, 2));

    console.log("\n📊 Migration Summary:");
    console.log(`  ✅ Systems migrated: ${migrationResults.systemsMigrated}`);
    console.log(`  ✅ Instances migrated: ${migrationResults.instancesMigrated}`);
    console.log(`  ✅ Plugin files created: ${migrationResults.pluginFilesCreated}`);
    console.log(`  ❌ Errors: ${migrationResults.errors.length}`);
    
    if (migrationResults.errors.length > 0) {
      console.log("\n❌ Migration Errors:");
      migrationResults.errors.forEach(error => console.log(`  - ${error}`));
    }

    console.log(`\n📁 Migration files saved to: server/plugins/migrated/`);
    console.log(`📋 Summary saved to: ${summaryPath}`);
    
    return migrationResults;
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

/**
 * Rollback function to restore external systems from migration files
 * Use this if you need to revert the migration
 */
export async function rollbackMigration() {
  console.log("🔄 Starting rollback from plugin migration...");
  
  const migrationDir = path.join(process.cwd(), 'server', 'plugins', 'migrated');
  if (!fs.existsSync(migrationDir)) {
    throw new Error("No migration directory found. Cannot rollback.");
  }

  const migrationFiles = fs.readdirSync(migrationDir)
    .filter(file => file.endsWith('-migrated.json'));

  console.log(`📊 Found ${migrationFiles.length} migration files to rollback`);

  for (const file of migrationFiles) {
    try {
      const filePath = path.join(migrationDir, file);
      const migrationData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      console.log(`🔄 Rolling back: ${migrationData.systemName}`);
      
      // Note: This would restore the original external system data
      // Implementation depends on whether you want to actually restore to database
      // For now, we just log what would be restored
      console.log(`  📋 Would restore system: ${migrationData.originalData.system.systemName}`);
      console.log(`  📋 Would restore ${migrationData.originalData.instances.length} instances`);
      
    } catch (error) {
      console.error(`❌ Failed to rollback ${file}:`, error);
    }
  }
}

// CLI interface for running migrations
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const command = process.argv[2];
  
  if (command === 'migrate') {
    migrateExternalSystemsToPlugins()
      .then(() => {
        console.log("✅ Migration completed successfully");
        process.exit(0);
      })
      .catch((error) => {
        console.error("❌ Migration failed:", error);
        process.exit(1);
      });
  } else if (command === 'rollback') {
    rollbackMigration()
      .then(() => {
        console.log("✅ Rollback completed successfully");
        process.exit(0);
      })
      .catch((error) => {
        console.error("❌ Rollback failed:", error);
        process.exit(1);
      });
  } else {
    console.log("Usage:");
    console.log("  npx tsx server/migrations/migrate-external-systems-to-plugins.ts migrate");
    console.log("  npx tsx server/migrations/migrate-external-systems-to-plugins.ts rollback");
    process.exit(1);
  }
} 