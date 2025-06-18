"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = require("./routes");
const auth_1 = require("./auth");
const email_1 = require("./email");
const scheduler_1 = require("./scheduler");
const vite_1 = require("./vite");
const environment_config_1 = require("./lib/environment-config");
const db_auto_sync_1 = require("./db-auto-sync");
// import { initializeDefaultIntegrations } from "./startup-integrations"; // TODO: Create this module
const startup_page_permissions_1 = require("./startup-page-permissions");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// External system instance routes removed - using plugin system instead
// Register all stub plugins (phase-1)
// import "./plugins/stub-plugins"; // Skip stub plugins for now
// Phase-2: real plugin implementations (override stubs)
require("./plugins/jira-plugin");
require("./plugins/qradar-plugin");
require("./plugins/splunk-plugin");
require("./plugins/elastic-plugin");
require("./plugins/grafana-plugin");
require("./plugins/fortigate-plugin");
// Skip problematic plugins for now
// import "./plugins/paloalto-plugin";
// import "./plugins/carbonblack-plugin";
// import "./plugins/sysdig-plugin";
// import "./plugins/vmware-plugin";
// import "./plugins/veeam-plugin";
// import "./plugins/confluence-plugin";
const app = (0, express_1.default)();
// Load environment configuration
const config = environment_config_1.environmentConfig.loadConfig();
environment_config_1.environmentConfig.logConfigSummary();
// Configure CORS with environment-specific origins
app.use((0, cors_1.default)({
    origin: config.server.corsOrigin,
    credentials: true
}));
// Trust proxy if configured
if (config.server.trustProxy) {
    app.set('trust proxy', 1);
}
app.use(express_1.default.json({ limit: `${Math.floor(config.security.maxFileSize / 1024 / 1024)}mb` }));
app.use(express_1.default.urlencoded({ extended: false }));
// Ensure uploads directory exists
const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    try {
        fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        console.log('✅ Created uploads directory:', uploadsDir);
    }
    catch (error) {
        console.error('❌ Failed to create uploads directory:', error);
    }
}
else {
    console.log('✅ Uploads directory exists:', uploadsDir);
}
(async () => {
    // Setup database auto-sync first (before authentication and routes)
    const databaseUrl = process.env.DATABASE_URL ||
        `postgresql://${process.env.DB_USER || 'mssp_user'}:${process.env.DB_PASSWORD || '12345678'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'mssp_production'}`;
    await (0, db_auto_sync_1.setupDatabaseAutoSync)({
        databaseUrl,
        environment: config.server.environment,
        enableAutoSync: process.env.ENABLE_AUTO_SYNC === 'true' || config.server.environment === 'development'
    });
    // Initialize default integrations (Jira system, etc.)
    // await initializeDefaultIntegrations(); // TODO: Implement this function
    // Ensure page permission records are up to date (e.g. /bulk-import -> /comprehensive-bulk-import)
    await (0, startup_page_permissions_1.initializeDefaultPagePermissions)(databaseUrl);
    // Setup authentication after body parsing and before registering routes
    await (0, auth_1.setupAuth)(app);
    const server = await (0, routes_1.registerRoutes)(app);
    // External system instance routes removed - using plugin system instead
    app.use((err, _req, res, _next) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({ message });
        throw err;
    });
    // Setup Vite/static serving based on environment
    if (config.server.environment === "development") {
        await (0, vite_1.setupVite)(app, server);
    }
    else {
        (0, vite_1.serveStatic)(app);
    }
    // Start scheduled tasks
    scheduler_1.scheduler.start();
    console.log('Starting scheduled tasks...');
    // Initialize email service if configured
    if (config.email.enabled) {
        try {
            await email_1.emailService.initialize(config.email);
            console.log('Email service initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize email service:', error);
        }
    }
    else {
        console.log('No SMTP configuration found. Email notifications disabled.');
    }
    // Start the server
    const httpServer = server.listen(config.server.port, config.server.host, () => {
        const env = config.server.environment;
        const mode = env === 'development' ? 'vite' : 'express';
        console.log(`${new Date().toLocaleTimeString()} [${mode}] serving on http://${config.server.host}:${config.server.port}`);
    });
    // Graceful shutdown
    const shutdown = () => {
        console.log('SIGTERM received, shutting down gracefully...');
        // Stop scheduled tasks
        scheduler_1.scheduler.stop();
        console.log('Stopping scheduled tasks...');
        // Close the HTTP server
        httpServer.close(() => {
            console.log('HTTP server closed.');
            process.exit(0);
        });
        // Force close after timeout
        setTimeout(() => {
            console.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
})().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
