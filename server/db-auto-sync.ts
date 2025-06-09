import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import fs from "fs";
import path from "path";

interface DbSyncOptions {
  databaseUrl: string;
  environment: string;
  enableAutoSync?: boolean;
}

export class DatabaseAutoSync {
  private pool: pg.Pool;
  private db: any;
  private options: DbSyncOptions;

  constructor(options: DbSyncOptions) {
    this.options = options;
    this.pool = new pg.Pool({
      connectionString: options.databaseUrl,
    });
    this.db = drizzle(this.pool);
  }

  async initialize(): Promise<void> {
    console.log('🔄 Initializing database auto-sync...');
    
    // Only run auto-sync in development or if explicitly enabled
    if (this.options.environment !== 'development' && !this.options.enableAutoSync) {
      console.log('⏭️  Skipping auto-sync (production mode, set enableAutoSync=true to force)');
      return;
    }

    try {
      // Check database connection
      await this.checkConnection();
      
      // Run migrations
      await this.runMigrations();
      
      // Update schema version
      await this.updateSchemaVersion();
      
      console.log('✅ Database auto-sync completed successfully');
    } catch (error) {
      console.error('❌ Database auto-sync failed:', error);
      
      // In development, we can be more forgiving
      if (this.options.environment === 'development') {
        console.warn('⚠️  Continuing despite migration errors (development mode)');
      } else {
        throw error;
      }
    }
  }

  private async checkConnection(): Promise<void> {
    console.log('🔌 Checking database connection...');
    
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✅ Database connection successful');
    } catch (error) {
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  private async runMigrations(): Promise<void> {
    console.log('📦 Running database migrations...');
    
    try {
      // Use drizzle-kit to push schema changes
      const { execSync } = await import('child_process');
      
      // Check if DATABASE_URL is set
      if (!process.env.DATABASE_URL) {
        console.log('⚠️  DATABASE_URL not set, using provided database URL');
        process.env.DATABASE_URL = this.options.databaseUrl;
      }

      // Run drizzle-kit push to sync schema
      console.log('🚀 Pushing schema changes...');
      execSync('npx drizzle-kit push', { 
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: this.options.databaseUrl }
      });
      
      console.log('✅ Schema migrations completed');
    } catch (error) {
      // Try alternative migration approach
      console.warn('⚠️  Standard migration failed, trying alternative approach...');
      await this.runManualMigrations();
    }
  }

  private async runManualMigrations(): Promise<void> {
    console.log('🔧 Running manual migrations...');
    
    const migrationsDir = path.join(process.cwd(), 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('📁 No migrations directory found, skipping...');
      return;
    }

    // Create schema_versions table if it doesn't exist
    await this.createSchemaVersionsTable();

    // Get applied migrations
    const appliedMigrations = await this.getAppliedMigrations();
    
    // Get all migration files
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .filter(file => !file.includes('meta')) // Skip meta files
      .sort();

    console.log(`📋 Found ${migrationFiles.length} migration files, ${appliedMigrations.length} already applied`);

    for (const file of migrationFiles) {
      if (!appliedMigrations.includes(file)) {
        await this.applyMigration(file);
      } else {
        console.log(`⏭️  Skipping already applied migration: ${file}`);
      }
    }
  }

  private async createSchemaVersionsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_versions (
        id SERIAL PRIMARY KEY,
        script_version VARCHAR(20) NOT NULL,
        app_version VARCHAR(20),
        schema_version VARCHAR(20) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        environment VARCHAR(20),
        notes TEXT,
        migration_file VARCHAR(255)
      );
    `;
    
    await this.pool.query(query);
  }

  private async getAppliedMigrations(): Promise<string[]> {
    try {
      const result = await this.pool.query(
        'SELECT migration_file FROM schema_versions WHERE migration_file IS NOT NULL'
      );
      return result.rows.map(row => row.migration_file);
    } catch (error) {
      console.warn('⚠️  Could not get applied migrations, assuming fresh install');
      return [];
    }
  }

  private async applyMigration(filename: string): Promise<void> {
    console.log(`🔄 Applying migration: ${filename}`);
    
    const migrationPath = path.join(process.cwd(), 'migrations', filename);
    
    try {
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      
      // Skip empty or comment-only files
      const nonCommentLines = migrationSql
        .split('\n')
        .filter(line => line.trim() && !line.trim().startsWith('--'))
        .join('\n')
        .trim();
        
      if (!nonCommentLines) {
        console.log(`⏭️  Skipping empty migration: ${filename}`);
        return;
      }

      // Execute migration in a transaction
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');
        await client.query(migrationSql);
        
        // Record this migration as applied
        await client.query(
          'INSERT INTO schema_versions (script_version, schema_version, version, environment, migration_file, notes) VALUES ($1, $2, $3, $4, $5, $6)',
          ['auto-sync', '1.4.3', '1.4.3', this.options.environment, filename, `Auto-applied migration: ${filename}`]
        );
        
        await client.query('COMMIT');
        console.log(`✅ Migration applied: ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`❌ Failed to apply migration ${filename}:`, error);
      // In development, continue with other migrations
      if (this.options.environment !== 'development') {
        throw error;
      }
    }
  }

  private async updateSchemaVersion(): Promise<void> {
    console.log('📝 Updating schema version...');
    
    try {
      // Get package.json version
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const appVersion = packageJson.version;

      await this.pool.query(
        `INSERT INTO schema_versions (script_version, app_version, schema_version, version, environment, notes) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['auto-sync', appVersion, appVersion, appVersion, this.options.environment, 'Auto-sync schema update completed']
      );
      
      console.log(`✅ Schema version updated to ${appVersion}`);
    } catch (error) {
      console.warn('⚠️  Could not update schema version:', error);
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export async function setupDatabaseAutoSync(options: DbSyncOptions): Promise<void> {
  const dbSync = new DatabaseAutoSync(options);
  await dbSync.initialize();
  
  // Set up graceful shutdown
  process.on('SIGTERM', async () => {
    await dbSync.close();
  });
  
  process.on('SIGINT', async () => {
    await dbSync.close();
  });
} 