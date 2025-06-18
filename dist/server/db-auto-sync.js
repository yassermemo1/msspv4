"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseAutoSync = void 0;
exports.setupDatabaseAutoSync = setupDatabaseAutoSync;
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema = __importStar(require("@shared/schema"));
const pg_1 = __importDefault(require("pg"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const drizzle_orm_1 = require("drizzle-orm");
class DatabaseAutoSync {
    constructor(options) {
        this.options = options;
        this.pool = new pg_1.default.Pool({
            connectionString: options.databaseUrl,
        });
        // Provide schema for typed queries
        this.db = (0, node_postgres_1.drizzle)(this.pool, { schema });
    }
    async initialize() {
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
            // Seed dev users if missing
            if (this.options.environment === 'development') {
                await this.seedDevUsers();
            }
        }
        catch (error) {
            console.error('❌ Database auto-sync failed:', error);
            // In development, we can be more forgiving
            if (this.options.environment === 'development') {
                console.warn('⚠️  Continuing despite migration errors (development mode)');
            }
            else {
                throw error;
            }
        }
    }
    async checkConnection() {
        console.log('🔌 Checking database connection...');
        try {
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            console.log('✅ Database connection successful');
        }
        catch (error) {
            throw new Error(`Database connection failed: ${error}`);
        }
    }
    async runMigrations() {
        console.log('📦 Running database migrations...');
        try {
            // Use drizzle-kit to push schema changes
            const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
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
        }
        catch (error) {
            // Try alternative migration approach
            console.warn('⚠️  Standard migration failed, trying alternative approach...');
            await this.runManualMigrations();
        }
    }
    async runManualMigrations() {
        console.log('🔧 Running manual migrations...');
        const migrationsDir = path_1.default.join(process.cwd(), 'migrations');
        if (!fs_1.default.existsSync(migrationsDir)) {
            console.log('📁 No migrations directory found, skipping...');
            return;
        }
        // Create schema_versions table if it doesn't exist
        await this.createSchemaVersionsTable();
        // Get applied migrations
        const appliedMigrations = await this.getAppliedMigrations();
        // Get all migration files
        const migrationFiles = fs_1.default.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .filter(file => !file.includes('meta')) // Skip meta files
            .sort();
        console.log(`📋 Found ${migrationFiles.length} migration files, ${appliedMigrations.length} already applied`);
        for (const file of migrationFiles) {
            if (!appliedMigrations.includes(file)) {
                await this.applyMigration(file);
            }
            else {
                console.log(`⏭️  Skipping already applied migration: ${file}`);
            }
        }
    }
    async createSchemaVersionsTable() {
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
    async getAppliedMigrations() {
        try {
            const result = await this.pool.query('SELECT migration_file FROM schema_versions WHERE migration_file IS NOT NULL');
            return result.rows.map(row => row.migration_file);
        }
        catch (error) {
            console.warn('⚠️  Could not get applied migrations, assuming fresh install');
            return [];
        }
    }
    async applyMigration(filename) {
        console.log(`🔄 Applying migration: ${filename}`);
        const migrationPath = path_1.default.join(process.cwd(), 'migrations', filename);
        try {
            const migrationSql = fs_1.default.readFileSync(migrationPath, 'utf8');
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
                await client.query('INSERT INTO schema_versions (script_version, schema_version, version, environment, migration_file, notes) VALUES ($1, $2, $3, $4, $5, $6)', ['auto-sync', '1.4.3', '1.4.3', this.options.environment, filename, `Auto-applied migration: ${filename}`]);
                await client.query('COMMIT');
                console.log(`✅ Migration applied: ${filename}`);
            }
            catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            console.error(`❌ Failed to apply migration ${filename}:`, error);
            // In development, continue with other migrations
            if (this.options.environment !== 'development') {
                throw error;
            }
        }
    }
    async updateSchemaVersion() {
        console.log('📝 Updating schema version...');
        try {
            // Get package.json version
            const packageJsonPath = path_1.default.join(process.cwd(), 'package.json');
            const packageJson = JSON.parse(fs_1.default.readFileSync(packageJsonPath, 'utf8'));
            const appVersion = packageJson.version;
            await this.pool.query(`INSERT INTO schema_versions (script_version, app_version, schema_version, version, environment, notes) 
         VALUES ($1, $2, $3, $4, $5, $6)`, ['auto-sync', appVersion, appVersion, appVersion, this.options.environment, 'Auto-sync schema update completed']);
            console.log(`✅ Schema version updated to ${appVersion}`);
        }
        catch (error) {
            console.warn('⚠️  Could not update schema version:', error);
        }
    }
    async seedDevUsers() {
        console.log('👥 Seeding development users (if missing)…');
        // Import test data generator to get consistent credentials
        const { testDataGenerator } = await Promise.resolve().then(() => __importStar(require('./lib/test-data-generator')));
        const testCredentials = testDataGenerator.getTestCredentials();
        const devUsers = [
            { username: 'admin', email: testCredentials.admin.email, role: 'admin', password: testCredentials.admin.password },
            { username: 'manager', email: testCredentials.manager.email, role: 'manager', password: testCredentials.manager.password },
            { username: 'engineer', email: testCredentials.engineer.email, role: 'engineer', password: testCredentials.engineer.password },
            { username: 'user', email: testCredentials.user.email, role: 'user', password: testCredentials.user.password },
        ];
        const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
        const saltRounds = 10;
        for (const u of devUsers) {
            try {
                const exists = await this.db
                    .select()
                    .from(schema.users)
                    .where((0, drizzle_orm_1.eq)(schema.users.email, u.email));
                if (exists.length === 0) {
                    const hash = await bcrypt.hash(u.password, saltRounds);
                    await this.db.insert(schema.users).values({
                        username: u.username,
                        email: u.email,
                        password: hash,
                        firstName: u.username.charAt(0).toUpperCase() + u.username.slice(1),
                        lastName: 'User',
                        role: u.role,
                    });
                    console.log(`✅ Seeded ${u.role} (${u.email})`);
                }
                else {
                    console.log(`⏭️  User already exists: ${u.role} (${u.email})`);
                }
            }
            catch (seedErr) {
                console.warn(`⚠️  Could not seed ${u.email}:`, seedErr.message);
            }
        }
    }
    async close() {
        await this.pool.end();
    }
}
exports.DatabaseAutoSync = DatabaseAutoSync;
async function setupDatabaseAutoSync(options) {
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
