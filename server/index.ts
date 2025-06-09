import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { emailService } from "./email";
import { scheduler } from "./scheduler";
import { setupVite, serveStatic } from "./vite";
import { environmentConfig } from "./lib/environment-config";
import { configureAuth } from "./auth";
import { setupDatabaseAutoSync } from "./db-auto-sync";
import { initializeDefaultIntegrations } from "./startup-integrations";
import compression from "compression";
import path from "path";
import fs from "fs";

const app = express();

// Load environment configuration
const config = environmentConfig.loadConfig();
environmentConfig.logConfigSummary();

// Configure CORS with environment-specific origins
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true
}));

// Trust proxy if configured
if (config.server.trustProxy) {
  app.set('trust proxy', 1);
}

app.use(express.json({ limit: `${Math.floor(config.security.maxFileSize / 1024 / 1024)}mb` }));
app.use(express.urlencoded({ extended: false }));

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created uploads directory:', uploadsDir);
  } catch (error) {
    console.error('❌ Failed to create uploads directory:', error);
  }
} else {
  console.log('✅ Uploads directory exists:', uploadsDir);
}

type WithError = {
  error?: string;
};

(async () => {
  // Setup database auto-sync first (before authentication and routes)
  const databaseUrl = process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER || 'mssp_user'}:${process.env.DB_PASSWORD || '12345678'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'mssp_production'}`;
  await setupDatabaseAutoSync({
    databaseUrl,
    environment: config.server.environment,
    enableAutoSync: process.env.ENABLE_AUTO_SYNC === 'true' || config.server.environment === 'development'
  });

  // Initialize default integrations (Jira system, etc.)
  await initializeDefaultIntegrations();

  // Setup authentication after body parsing and before registering routes
  await setupAuth(app);

  const server = await registerRoutes(app);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite/static serving based on environment
  if (config.server.environment === "development") {
    await setupVite(app);
  } else {
    serveStatic(app);
  }

  // Start scheduled tasks
  scheduler.start();
  console.log('Starting scheduled tasks...');
  
  // Initialize email service if configured
  if (config.email.enabled) {
    try {
      await emailService.initialize(config.email);
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  } else {
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
    scheduler.stop();
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
