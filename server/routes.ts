import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailService } from "./email";
import { scheduler } from "./scheduler";
import { twoFAService } from "./twofa";
import passport from "passport";
import packageJson from "../package.json";
import { 
  insertClientSchema, insertClientContactSchema, insertServiceSchema,
  insertContractSchema, insertServiceScopeSchema, insertProposalSchema,
  insertLicensePoolSchema, insertClientLicenseSchema, insertHardwareAssetSchema,
  insertClientHardwareAssignmentSchema, insertFinancialTransactionSchema,
  insertClientTeamAssignmentSchema, insertCustomFieldSchema, insertCustomFieldValueSchema,
  insertDocumentSchema, insertDocumentVersionSchema, insertDocumentAccessSchema,
  insertUserDashboardSchema,
  validateSAFClientConsistency, validateProposalClientConsistency, validateContractClientConsistency,
  // Import all the table schemas needed for Drizzle queries
  users, userSettings, companySettings, clients, clientContacts, contracts, proposals, services, serviceScopes, financialTransactions,
  serviceAuthorizationForms, certificatesOfCompliance, hardwareAssets, licensePools, clientLicenses, individualLicenses,
  clientHardwareAssignments, auditLogs, changeHistory, securityEvents, dataAccessLogs, documents, documentVersions, documentAccess,
  dashboardWidgets, userDashboards, dashboardWidgetAssignments,

  pagePermissions, savedSearches, searchHistory,
  serviceScopeFields, scopeVariableValues
} from "@shared/schema";
import { z } from "zod";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { upload, getFileInfo, deleteFile } from "./fileUpload";
import path from "path";
import fs from "fs";
import { eq, and, or, desc, asc, sql, count, sum, avg, max, min, like, ilike, between, gte, lte, isNull, isNotNull, inArray } from "drizzle-orm";
import { db, pool } from "./db";
import * as schema from "@shared/schema";
// Duplicate imports removed - already imported above
import multer from "multer";
import fetch from 'node-fetch';
import { entityRelationsService } from "./entity-relations";
import { EntityType, RelationshipType, ENTITY_TYPES, RELATIONSHIP_TYPES } from "@shared/entity-relations";
import { type Client, type InsertClient, type User, 
  type Contract, type InsertContract, type Service, type InsertService,
  type Proposal, type InsertProposal, type FinancialTransaction, 
  type InsertFinancialTransaction, type LicensePool, type InsertLicensePool,
  type HardwareAsset, type InsertHardwareAsset, type ServiceScope,
  type InsertServiceScope, type Document, type InsertDocument,
  type ServiceAuthorizationForm, type InsertServiceAuthorizationForm,
  type CertificateOfCompliance, type InsertCertificateOfCompliance,
  type CustomField, type InsertCustomField, type DataSource, type InsertDataSource,
  type DataSourceMapping, type InsertDataSourceMapping, type IntegratedData,
  type InsertIntegratedData, type DashboardWidget, type InsertDashboardWidget,
  } from "@shared/schema";
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import csv from 'csv-parser';
// External widget routes removed - migrated to plugin system
import { integrationEngineWidgetRoutes } from './routes/integration-engine-widgets';
import { codebaseAnalyzer } from './services/codebase-analyzer';
import { pluginRoutes } from './plugins-routes';

// Import plugins to register them (only working ones for now)
import './plugins/fortigate-plugin';
import './plugins/jira-plugin';
import './plugins/splunk-plugin';
import './plugins/elastic-plugin';
import './plugins/qradar-plugin';
import './plugins/grafana-plugin';
// import './plugins/stub-plugins'; // Skip stub plugins for now
import { router as dynamicServiceScopeRoutes } from './api/dynamic-service-scopes';
import poolValidationRoutes from './api/pool-validation';
import { mockJiraRoutes } from './routes/mock-jira.ts';
import { getPlugin } from "./plugins/plugin-manager";
import { performRollback } from "./lib/rollback";
import { applyMappings } from "./lib/data-mapper";
import { ApiError } from "./lib/api-error";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Custom contract schema that accepts date strings from JSON and converts them to Date objects
const apiContractSchema = z.object({
  clientId: z.number(),
  name: z.string(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  status: z.string().optional(),
  notes: z.string().nullable().optional(),
  autoRenewal: z.boolean().optional(),
  renewalTerms: z.string().nullable().optional(),
  totalValue: z.string().nullable().optional(),
  documentUrl: z.string().nullable().optional(),
});

// Custom license pool schema that accepts date strings from JSON and converts them to Date objects
const apiLicensePoolSchema = z.object({
  name: z.string(),
  vendor: z.string(),
  productName: z.string(),
  licenseType: z.string().optional(),
  totalLicenses: z.number(),
  availableLicenses: z.number(),
  costPerLicense: z.string().optional(),
  renewalDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Custom hardware asset schema that accepts date strings from JSON and converts them to Date objects
const apiHardwareAssetSchema = z.object({
  name: z.string(),
  category: z.string(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  purchaseCost: z.string().optional(),
  warrantyExpiry: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  status: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

// Custom individual license schema that accepts date strings from JSON and converts them to Date objects
const apiIndividualLicenseSchema = z.object({
  clientId: z.number(),
  serviceScopeId: z.number().optional(),
  name: z.string(),
  vendor: z.string(),
  productName: z.string(),
  licenseKey: z.string().optional(),
  licenseType: z.string().optional(),
  quantity: z.number().default(1),
  costPerLicense: z.string().optional(),
  purchaseDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  expiryDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  renewalDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  purchaseRequestNumber: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  documentUrl: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

// Custom SAF schema that accepts date strings from JSON and converts them to Date objects
const apiServiceAuthorizationFormSchema = z.object({
  clientId: z.number(),
  contractId: z.number(),
  serviceScopeId: z.number().optional(),
  safNumber: z.string(),
  title: z.string(),
  description: z.string().optional(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  status: z.string().optional(),
  documentUrl: z.string().optional(),
  approvedBy: z.number().optional(),
  approvedDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  value: z.string().optional(),
  notes: z.string().optional(),
});

// Custom COC schema that accepts date strings from JSON and converts them to Date objects
const apiCertificateOfComplianceSchema = z.object({
  clientId: z.number(),
  contractId: z.number().optional(),
  serviceScopeId: z.number().optional(),
  safId: z.number().optional(),
  cocNumber: z.string(),
  title: z.string(),
  description: z.string().optional(),
  complianceType: z.string(),
  issueDate: z.string().transform((str) => new Date(str)),
  expiryDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  status: z.string().optional(),
  documentUrl: z.string().optional(),
  issuedBy: z.number().optional(),
  auditDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  nextAuditDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  notes: z.string().optional(),
});

// Custom financial transaction schema that accepts date strings from JSON and converts them to Date objects
const apiFinancialTransactionSchema = z.object({
  type: z.string(),
  amount: z.string(),
  description: z.string(),
  status: z.string().optional(),
  clientId: z.number().optional(),
  contractId: z.number().optional(),
  serviceScopeId: z.number().optional(),
  licensePoolId: z.number().optional(),
  hardwareAssetId: z.number().optional(),
  transactionDate: z.string().transform((str) => new Date(str)),
  category: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Role-based authorization middleware
function requireRole(roles: string | string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userRole = req.user?.role;
    if (!userRole) {
      return res.status(403).json({ message: "User role not found" });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: "Insufficient permissions",
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
}

// Convenience function for admin-only endpoints
function requireAdmin(req: any, res: any, next: any) {
  return requireRole('admin')(req, res, next);
}

function requireManagerOrAbove(req: any, res: any, next: any) {
  return requireRole(['admin', 'manager'])(req, res, next);
}

function requireEngineerOrAbove(req: any, res: any, next: any) {
  return requireRole(['admin', 'manager', 'engineer'])(req, res, next);
}

// Export auth functions for use in other modules
export { requireAuth, requireRole, requireAdmin, requireManagerOrAbove, requireEngineerOrAbove };

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // ---- Mock data routes for Jira ticket widgets ----
  app.use('/api/mock-jira', mockJiraRoutes);

  // Auth routes are now set up in server/index.ts

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Debug endpoint for file upload diagnostics (admin only)
  app.get("/api/debug/uploads", requireAdmin, async (req, res, next) => {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Check if uploads directory exists
      const uploadsExists = fs.existsSync(uploadsDir);
      
      let files = [];
      let permissions = null;
      
      if (uploadsExists) {
        try {
          files = fs.readdirSync(uploadsDir).slice(0, 10); // Limit to first 10 files for safety
          const stats = fs.statSync(uploadsDir);
          permissions = {
            mode: stats.mode,
            uid: stats.uid,
            gid: stats.gid,
            isDirectory: stats.isDirectory(),
            isWritable: fs.constants.W_OK
          };
        } catch (error) {
          console.error('Error reading uploads directory:', error);
        }
      }

      // Get database document count
      const [{ count: documentCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(eq(documents.isActive, true));

      res.json({
        uploadsDirectory: uploadsDir,
        uploadsExists,
        fileCount: files.length,
        sampleFiles: files,
        permissions,
        documentCount: Number(documentCount),
        processUid: process.getuid ? process.getuid() : 'N/A',
        processGid: process.getgid ? process.getgid() : 'N/A',
        cwd: process.cwd(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Debug uploads error:", error);
      res.status(500).json({ 
        error: error.message,
        uploadsDirectory: path.join(process.cwd(), 'uploads'),
        cwd: process.cwd()
      });
    }
  });

  // ========================================
  // USER AUTHENTICATION ENDPOINTS
  // ========================================



  
  // Get entity relation types
  app.get("/api/entity-relations/types", requireAuth, async (req, res, next) => {
    try {
      res.json({
        entityTypes: Object.values(ENTITY_TYPES),
        relationshipTypes: Object.values(RELATIONSHIP_TYPES)
      });
    } catch (error) {
      console.error("Get entity relation types error:", error);
      res.status(500).json({ message: "Failed to fetch entity relation types" });
    }
  });


// Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      version: packageJson.version,
      uptime: process.uptime()
    });
  });

  // Version endpoint
  app.get("/api/version", (req, res) => {
    res.json({
      version: packageJson.version,
      name: "MSSP Client Manager",
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // ========================================
  // FIELD VISIBILITY CONFIGURATION ENDPOINTS
  // ========================================

  // Get all field visibility configurations
  app.get('/api/field-visibility', requireAuth, async (req, res, next) => {
    try {
      const configs = await storage.getFieldVisibilityConfigs();
      res.json(configs);
    } catch (error) {
      console.error('Error fetching field visibility configs:', error);
      res.status(500).json({ error: 'Failed to fetch field visibility configurations' });
    }
  });

  // Set field visibility
  app.post('/api/field-visibility', requireAuth, async (req, res, next) => {
    try {
      const { tableName, fieldName, isVisible, context } = req.body;
      
      if (!tableName || !fieldName || typeof isVisible !== 'boolean') {
        return res.status(400).json({ error: 'tableName, fieldName, and isVisible are required' });
      }

      const config = await storage.setFieldVisibility(tableName, fieldName, isVisible, context || 'form');
      
      // Log the change
      try {
        await storage.createAuditLog({
          userId: req.user!.id,
          action: 'field_visibility_update',
          tableName: 'field_visibility_config',
          recordId: null,
          oldValues: null,
          newValues: JSON.stringify({
            tableName,
            fieldName,
            isVisible,
            context,
            action: 'update_field_visibility'
          })
        });
      } catch (auditError) {
        console.error('Audit log failed (non-critical):', auditError);
        // Continue execution even if audit logging fails
      }

      res.json(config);
    } catch (error) {
      console.error('Error updating field visibility:', error);
      res.status(500).json({ error: 'Failed to update field visibility' });
    }
  });

  // Get field visibility for a specific table
  app.get('/api/field-visibility/:tableName', requireAuth, async (req, res, next) => {
    try {
      const { tableName } = req.params;
      const { context = 'form' } = req.query;
      
      const configs = await storage.getFieldVisibilityForTable(tableName, context as string);
      res.json(configs);
    } catch (error) {
      console.error('Error fetching field visibility for table:', error);
      res.status(500).json({ error: 'Failed to fetch field visibility for table' });
    }
  });

  // Reset field visibility (back to default visible)
  app.delete('/api/field-visibility/:tableName/:fieldName', requireAuth, async (req, res, next) => {
    try {
      const { tableName, fieldName } = req.params;
      const { context = 'form' } = req.query;
      
      await storage.resetFieldVisibility(tableName, fieldName, context as string);
      
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'field_visibility_reset',
        tableName: 'field_visibility_config',
        recordId: null,
        oldValues: null,
        newValues: JSON.stringify({
          tableName,
          fieldName,
          context,
          action: 'reset_field_visibility'
        })
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error resetting field visibility:', error);
      res.status(500).json({ error: 'Failed to reset field visibility' });
    }
  });

  // User authentication with bcrypt

  
  // ========================================
  // TWO-FACTOR AUTHENTICATION ENDPOINTS
  // ========================================

  // Get 2FA status for current user
  app.get("/api/user/2fa/status", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Since twoFactorSecret doesn't exist in our schema, always return disabled
      res.json({
        enabled: false,
        backupCodesRemaining: 0
      });
    } catch (error) {
      console.error("Get 2FA status error:", error);
      res.status(500).json({ message: "Failed to get 2FA status" });
    }
  });

  // Setup 2FA
  app.post("/api/user/2fa/setup", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate secret and QR code
      const { secret, qrCode } = await twoFAService.generateSecret(user.email);
      
      // Store the secret temporarily (not enabled yet)
      req.session.tempTwoFactorSecret = secret;

      res.json({
        secret,
        qrCode
      });
    } catch (error) {
      console.error("Setup 2FA error:", error);
      res.status(500).json({ message: "Failed to setup 2FA" });
    }
  });

  // Enable 2FA
  app.post("/api/user/2fa/enable", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const { token } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!req.session.tempTwoFactorSecret) {
        return res.status(400).json({ message: "No 2FA setup in progress" });
      }

      // Verify the token
      const isValid = twoFAService.verifyToken(req.session.tempTwoFactorSecret, token);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Generate backup codes
      const backupCodes = twoFAService.generateBackupCodes();

      // Update user with 2FA enabled
      await storage.updateUser(userId, {
        twoFactorSecret: req.session.tempTwoFactorSecret,
        twoFactorBackupCodes: JSON.stringify(backupCodes.map(code => ({ code, used: false })))
      });

      // Clear temp secret
      delete req.session.tempTwoFactorSecret;

      res.json({
        success: true,
        backupCodes
      });
    } catch (error) {
      console.error("Enable 2FA error:", error);
      res.status(500).json({ message: "Failed to enable 2FA" });
    }
  });

  // Disable 2FA
  app.post("/api/user/2fa/disable", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const { password } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Invalid password" });
      }

      // Disable 2FA
      await storage.updateUser(userId, {
        twoFactorSecret: null,
        twoFactorBackupCodes: null
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Disable 2FA error:", error);
      res.status(500).json({ message: "Failed to disable 2FA" });
    }
  });

  // Verify 2FA token
  app.post("/api/user/2fa/verify", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const { token } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUserById(userId);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ message: "2FA not enabled" });
      }

      const isValid = twoFAService.verifyToken(user.twoFactorSecret, token);
      
      res.json({ valid: isValid });
    } catch (error) {
      console.error("Verify 2FA error:", error);
      res.status(500).json({ message: "Failed to verify 2FA token" });
    }
  });


  // ========================================
  // CLIENT ENDPOINTS
  // ========================================

  // Get all clients
  app.get("/api/clients", requireAuth, async (req, res, next) => {
    try {
      const clients = await storage.getAllClients();
      
      // Add data access logging
      try {
        const { logDataAccess } = await import('./lib/audit');
        await logDataAccess({
          userId: req.user?.id,
          entityType: 'client',
          accessType: 'list',
          accessMethod: 'web_ui',
          dataScope: 'partial',
          resultCount: clients.length,
          sensitiveData: true,
          purpose: 'Client list view - dashboard/management interface'
        }, req);
      } catch (auditError) {
        console.error('⚠️ Data access logging failed for client list:', auditError.message);
      }
      
      res.json(clients);
    } catch (error) {
      next(error);
    }
  });

  // Get archived clients (MUST be before /:id route)
  app.get("/api/clients/archived", requireAuth, async (req, res, next) => {
    try {
      const archivedClients = await storage.getArchivedClients();
      
      // Add data access logging
      try {
        const { logDataAccess } = await import('./lib/audit');
        await logDataAccess({
          userId: req.user?.id,
          entityType: 'client',
          accessType: 'list',
          accessMethod: 'web_ui',
          dataScope: 'partial',
          resultCount: archivedClients.length,
          sensitiveData: true,
          purpose: 'Archived client list view - administrative review'
        }, req);
      } catch (auditError) {
        console.error('⚠️ Data access logging failed for archived client list:', auditError.message);
      }
      
      res.json(archivedClients);
    } catch (error) {
      console.error("Get archived clients error:", error);
      res.status(500).json({ message: "Failed to fetch archived clients" });
    }
  });

  
  // Get dashboard widgets
  app.get("/api/dashboard/widgets", requireAuth, async (req, res, next) => {
    try {
      const widgets = await db.select().from(dashboardWidgets);
      res.json(widgets);
    } catch (error) {
      console.error("Error fetching widgets:", error);
      res.status(500).json({ error: "Failed to fetch widgets" });
    }
  });

  // Get recent activity
  app.get("/api/dashboard/recent-activity", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get recent audit logs
      const recentActivity = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          entityName: auditLogs.entityName,
          description: auditLogs.description,
          timestamp: auditLogs.timestamp,
          category: auditLogs.category
        })
        .from(auditLogs)
        .orderBy(desc(auditLogs.timestamp))
        .limit(10);

      res.json(recentActivity);
    } catch (error) {
      console.error("Get recent activity error:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });



// Get client by ID
  app.get("/api/clients/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Add data access logging
      try {
        const { logDataAccess } = await import('./lib/audit');
        await logDataAccess({
          userId: req.user?.id,
          entityType: 'client',
          entityId: id,
          entityName: client.name,
          accessType: 'view',
          accessMethod: 'web_ui',
          dataScope: 'full',
          resultCount: 1,
          sensitiveData: true,
          purpose: 'Client detail view - comprehensive client information access'
        }, req);
      } catch (auditError) {
        console.error('⚠️ Data access logging failed for client detail view:', auditError.message);
      }
      
      res.json(client);
    } catch (error) {
      next(error);
    }
  });

  // Get client individual licenses
  app.get("/api/clients/:id/individual-licenses", requireAuth, async (req, res, next) => {
    try {
      const clientId = parseInt(req.params.id);
      // Return empty array for now - individual licenses would need to be implemented
      res.json([]);
    } catch (error) {
      next(error);
    }
  });

  // Get client service authorization forms
  app.get("/api/clients/:id/service-authorization-forms", requireAuth, async (req, res, next) => {
    try {
      const clientId = parseInt(req.params.id);
      const safs = await storage.getClientServiceAuthorizationForms(clientId);
      res.json(safs);
    } catch (error) {
      next(error);
    }
  });

  // Get client certificates of compliance
  app.get("/api/clients/:id/certificates-of-compliance", requireAuth, async (req, res, next) => {
    try {
      const clientId = parseInt(req.params.id);
      // Return empty array for now - certificates would need to be implemented
      res.json([]);
    } catch (error) {
      next(error);
    }
  });

  // Get client service scopes
  app.get("/api/clients/:id/service-scopes", requireAuth, async (req, res, next) => {
    try {
      const clientId = parseInt(req.params.id);
      const serviceScopes = await storage.getServiceScopesByClientId(clientId);
      res.json(serviceScopes);
    } catch (error) {
      next(error);
    }
  });

  // Create client
  app.post("/api/clients", requireManagerOrAbove, async (req, res, next) => {
    try {
      const result = insertClientSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid client data", 
          errors: result.error.issues 
        });
      }

      const newClient = await storage.createClient(result.data);
      
      // Enhanced audit logging with AuditLogger
      try {
        const { AuditLogger } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        
        await auditLogger.logCreate(
          'client',
          newClient.id,
          newClient.name,
          {
            industry: result.data.industry,
            domain: result.data.domain,
            contactEmail: result.data.contactEmail,
            contactPhone: result.data.contactPhone,
            address: result.data.address,
            status: result.data.status || 'active'
          }
        );
        
        console.log('✅ Enhanced audit logging completed for client creation');
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for client creation:', auditError.message);
      }
      
      res.status(201).json(newClient);
    } catch (error) {
      next(error);
    }
  });

  // Update client
  app.put("/api/clients/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertClientSchema.partial().safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid client data", 
          errors: result.error.issues 
        });
      }

      const updatedClient = await storage.updateClient(id, result.data);
      
      if (!updatedClient) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Enhanced audit logging with change detection
      try {
        // Get original client data for change detection
        const originalClient = await storage.getClient(id);
        
        const { AuditLogger, detectChanges } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        
        // Detect what actually changed
        const changes = detectChanges(originalClient, updatedClient);
        
        if (changes.length > 0) {
          await auditLogger.logUpdate(
            'client',
            updatedClient.id,
            updatedClient.name,
            changes,
            originalClient
          );
          console.log(`✅ Enhanced audit logging completed for client update (${changes.length} changes detected)`);
        } else {
          console.log('ℹ️ No changes detected in client update - skipping detailed audit logging');
        }
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for client update:', auditError.message);
      }

      res.json(updatedClient);
    } catch (error) {
      next(error);
    }
  });

  // Delete client (soft delete)
  app.delete("/api/clients/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Check deletion impact first
      const impact = await storage.getClientDeletionImpact(id);
      if (!impact.canDelete) {
        return res.status(400).json({ 
          message: "Cannot archive client", 
          blockers: impact.blockers,
          dependencies: impact.dependencies
        });
      }

      const success = await storage.deleteClient(id);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to archive client" });
      }

      // Create audit log
      try {
        await storage.createAuditLog({
          userId: req.user?.id || null,
          action: 'ARCHIVE',
          entityType: 'client',
          entityId: id,
          entityName: client.name,
          description: `Archived client: ${client.name}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || null,
          severity: 'warning',
          category: 'client_management'
        });
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for client archival:', auditError.message);
      }

      res.json({ success: true, message: "Client archived successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Check client deletion impact
  app.get("/api/clients/:id/deletion-impact", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const impact = await storage.getClientDeletionImpact(id);
      res.json(impact);
    } catch (error) {
      next(error);
    }
  });

  // Archive client (explicit)
  app.post("/api/clients/:id/archive", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Check deletion impact first
      const impact = await storage.getClientDeletionImpact(id);
      if (!impact.canDelete) {
        return res.status(400).json({ 
          message: "Cannot archive client", 
          blockers: impact.blockers,
          dependencies: impact.dependencies
        });
      }

      const archivedClient = await storage.archiveClient(id);
      
      if (!archivedClient) {
        return res.status(500).json({ message: "Failed to archive client" });
      }

      // Create audit log
      try {
        await storage.createAuditLog({
          userId: req.user?.id || null,
          action: 'ARCHIVE',
          entityType: 'client',
          entityId: id,
          entityName: client.name,
          description: `Archived client: ${client.name}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || null,
          severity: 'warning',
          category: 'client_management'
        });
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for client archival:', auditError.message);
      }

      res.json(archivedClient);
    } catch (error) {
      next(error);
    }
  });

  // Restore archived client
  app.post("/api/clients/:id/restore", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      const restoredClient = await storage.restoreClient(id);
      
      if (!restoredClient) {
        return res.status(404).json({ message: "Archived client not found" });
      }

      // Create audit log
      try {
        await storage.createAuditLog({
          userId: req.user?.id || null,
          action: 'RESTORE',
          entityType: 'client',
          entityId: id,
          entityName: restoredClient.name,
          description: `Restored client: ${restoredClient.name}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || null,
          severity: 'info',
          category: 'client_management'
        });
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for client restoration:', auditError.message);
      }

      res.json(restoredClient);
    } catch (error) {
      next(error);
    }
  });

  // Contracts endpoints
  app.get("/api/contracts", requireAuth, async (req, res, next) => {
    try {
      const { clientId } = req.query;
      
      let contracts;
      if (clientId) {
        // Filter contracts by client ID
        const clientIdNum = parseInt(clientId as string);
        if (isNaN(clientIdNum)) {
          return res.status(400).json({ message: "Invalid client ID provided" });
        }
        contracts = await storage.getClientContracts(clientIdNum);
      } else {
        // Get all contracts
        contracts = await storage.getAllContracts();
      }
      
      res.json(contracts);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/contracts/:id", requireAuth, async (req, res, next) => {
    try {
      const contract = await storage.getContract(parseInt(req.params.id));
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/contracts", requireManagerOrAbove, async (req, res, next) => {
    try {
      // Validate client exists
      const clients = await storage.getAllClients();
      validateContractClientConsistency(
        { clientId: req.body.clientId },
        clients.map(c => ({ id: c.id }))
      );

      const { services: contractServices, ...contractData } = req.body;

      const finalContractData = {
        ...contractData,
        totalValue: contractData.totalValue ? parseFloat(contractData.totalValue) : 0,
        startDate: new Date(contractData.startDate),
        endDate: new Date(contractData.endDate),
      };
      
      const contract = await storage.createContract(finalContractData);
      
      // If services are provided, create service scopes
      if (contractServices && Array.isArray(contractServices) && contractServices.length > 0) {
        console.log('Creating service scopes for contract:', contract.id, 'Services:', contractServices);
        
        for (const serviceData of contractServices) {
          try {
            const scopeData = {
              contractId: contract.id,
              serviceId: serviceData.serviceId,
              scopeDefinition: serviceData.scopeData || {},
              startDate: contract.startDate,
              endDate: contract.endDate,
              status: 'active',
              monthlyValue: null,
              notes: `Service scope for ${serviceData.serviceName}`,
            };

            const [newScope] = await db
              .insert(serviceScopes)
              .values(scopeData)
              .returning();

            console.log('✅ Created service scope:', newScope.id, 'for service:', serviceData.serviceId);
          } catch (scopeError) {
            console.error('❌ Failed to create service scope for service:', serviceData.serviceId, scopeError);
            // Continue with other services even if one fails
          }
        }
      }
      
      // Add audit logging for contract creation
      try {
        const { AuditLogger } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        const client = clients.find(c => c.id === req.body.clientId);
        
        // Log for the contract entity
        await auditLogger.logCreate(
          'contract',
          contract.id,
          contract.name,
          {
            clientId: req.body.clientId,
            clientName: client?.name || 'Unknown Client',
            contractValue: finalContractData.totalValue,
            contractDuration: `${finalContractData.startDate} to ${finalContractData.endDate}`,
            servicesCount: contractServices?.length || 0
          }
        );
        
        // Also log as a client-related activity
        const { logAudit } = await import('./lib/audit');
        await logAudit({
          userId: req.user?.id,
          action: 'contract_created',
          entityType: 'client',
          entityId: req.body.clientId,
          entityName: client?.name || 'Unknown Client',
          description: `Contract "${contract.name}" was created for this client${contractServices?.length ? ` with ${contractServices.length} services` : ''}`,
          category: 'contract_management',
          severity: 'info',
          metadata: {
            contractId: contract.id,
            contractName: contract.name,
            contractValue: finalContractData.totalValue,
            contractDuration: `${finalContractData.startDate} to ${finalContractData.endDate}`,
            servicesCount: contractServices?.length || 0
          }
        }, req);

        console.log('✅ Audit logging completed for contract creation');
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for contract creation:', auditError.message);
      }

      res.status(201).json(contract);
    } catch (error) {
      next(error);
    }
  });

  // Update contract
  app.put("/api/contracts/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const contractId = parseInt(req.params.id);
      
      // Get existing contract for audit comparison
      const [existingContract] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, contractId))
        .limit(1);

      if (!existingContract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const { services: contractServices, ...contractData } = req.body;
      
      // Transform date strings to Date objects if provided
      if (contractData.startDate) contractData.startDate = new Date(contractData.startDate);
      if (contractData.endDate) contractData.endDate = new Date(contractData.endDate);
      if (contractData.totalValue) contractData.totalValue = parseFloat(contractData.totalValue);

      const [updatedContract] = await db
        .update(contracts)
        .set({ ...contractData, updatedAt: new Date() })
        .where(eq(contracts.id, contractId))
        .returning();

      if (!updatedContract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Handle services update - if services are provided, update service scopes
      if (contractServices && Array.isArray(contractServices)) {
        console.log('Updating service scopes for contract:', contractId, 'Services:', contractServices);
        
        // Get existing service scopes for this contract
        const existingScopes = await db
          .select()
          .from(serviceScopes)
          .where(eq(serviceScopes.contractId, contractId));

        // Create a set of service IDs from the new services list
        const newServiceIds = new Set(contractServices.map(s => s.serviceId));
        
        // Remove service scopes that are no longer in the services list
        const scopesToRemove = existingScopes.filter(scope => !newServiceIds.has(scope.serviceId));
        for (const scope of scopesToRemove) {
          await db
            .delete(serviceScopes)
            .where(eq(serviceScopes.id, scope.id));
          console.log('🗑️ Removed service scope:', scope.id, 'for service:', scope.serviceId);
        }
        
        // Add or update service scopes for new services
        for (const serviceData of contractServices) {
          try {
            const existingScope = existingScopes.find(s => s.serviceId === serviceData.serviceId);
            
            if (existingScope) {
              // Update existing service scope
              const [updatedScope] = await db
                .update(serviceScopes)
                .set({
                  scopeDefinition: serviceData.scopeData || {},
                  startDate: updatedContract.startDate,
                  endDate: updatedContract.endDate,
                  notes: `Service scope for ${serviceData.serviceName}`,
                  updatedAt: new Date()
                })
                .where(eq(serviceScopes.id, existingScope.id))
                .returning();
              console.log('✅ Updated service scope:', updatedScope.id, 'for service:', serviceData.serviceId);
            } else {
              // Create new service scope
              const scopeData = {
                contractId: contractId,
                serviceId: serviceData.serviceId,
                scopeDefinition: serviceData.scopeData || {},
                startDate: updatedContract.startDate,
                endDate: updatedContract.endDate,
                status: 'active',
                monthlyValue: null,
                notes: `Service scope for ${serviceData.serviceName}`,
              };

              const [newScope] = await db
                .insert(serviceScopes)
                .values(scopeData)
                .returning();
              console.log('✅ Created service scope:', newScope.id, 'for service:', serviceData.serviceId);
            }
          } catch (scopeError) {
            console.error('❌ Failed to update/create service scope for service:', serviceData.serviceId, scopeError);
            // Continue with other services even if one fails
          }
        }
      }

      // Add audit logging for contract update
      try {
        const { AuditLogger, detectChanges } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        const changes = detectChanges(existingContract, updatedContract);
        
        if (changes.length > 0) {
          await auditLogger.logUpdate(
            'contract',
            updatedContract.id,
            updatedContract.name,
            changes,
            existingContract
          );
          console.log(`✅ Audit logging completed for contract update (${changes.length} changes)`);
        }
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for contract update:', auditError.message);
      }

      res.json(updatedContract);
    } catch (error) {
      next(error);
    }
  });

  // Delete SAF
  app.delete("/api/service-authorization-forms/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get SAF for audit logging before deletion
      const [existingSAF] = await db
        .select()
        .from(serviceAuthorizationForms)
        .where(eq(serviceAuthorizationForms.id, id))
        .limit(1);

      if (!existingSAF) {
        return res.status(404).json({ message: "Service Authorization Form not found" });
      }

      const [deleted] = await db
        .delete(serviceAuthorizationForms)
        .where(eq(serviceAuthorizationForms.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Service Authorization Form not found" });
      }

      // Add audit logging for SAF deletion
      try {
        const { AuditLogger } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        await auditLogger.logDelete(
          'service_authorization_form',
          id,
          existingSAF.safNumber,
          existingSAF
        );
        console.log('✅ Audit logging completed for SAF deletion');
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for SAF deletion:', auditError.message);
      }

      res.json({ message: "Service Authorization Form deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // CERTIFICATES OF COMPLIANCE (COC) ENDPOINTS
  // ========================================

  // Get all COCs
  app.get("/api/certificates-of-compliance", requireAuth, async (req, res, next) => {
    try {
      const { clientId } = req.query;
      
      let whereConditions: any[] = [];
      if (clientId) {
        whereConditions.push(eq(certificatesOfCompliance.clientId, parseInt(clientId as string)));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const cocs = await db
        .select({
          id: certificatesOfCompliance.id,
          clientId: certificatesOfCompliance.clientId,
          contractId: certificatesOfCompliance.contractId,
          serviceScopeId: certificatesOfCompliance.serviceScopeId,
          safId: certificatesOfCompliance.safId,
          cocNumber: certificatesOfCompliance.cocNumber,
          title: certificatesOfCompliance.title,
          description: certificatesOfCompliance.description,
          complianceType: certificatesOfCompliance.complianceType,
          issueDate: certificatesOfCompliance.issueDate,
          expiryDate: certificatesOfCompliance.expiryDate,
          status: certificatesOfCompliance.status,
          documentUrl: certificatesOfCompliance.documentUrl,
          issuedBy: certificatesOfCompliance.issuedBy,
          auditDate: certificatesOfCompliance.auditDate,
          nextAuditDate: certificatesOfCompliance.nextAuditDate,
          notes: certificatesOfCompliance.notes,
          createdAt: certificatesOfCompliance.createdAt,
          updatedAt: certificatesOfCompliance.updatedAt,
          clientName: clients.name,
          contractName: contracts.name
        })
        .from(certificatesOfCompliance)
        .leftJoin(clients, eq(certificatesOfCompliance.clientId, clients.id))
        .leftJoin(contracts, eq(certificatesOfCompliance.contractId, contracts.id))
        .where(whereClause)
        .orderBy(desc(certificatesOfCompliance.createdAt));

      res.json(cocs);
    } catch (error) {
      next(error);
    }
  });

  // Create COC
  app.post("/api/certificates-of-compliance", requireManagerOrAbove, async (req, res, next) => {
    try {
      const cocData = apiCertificateOfComplianceSchema.parse(req.body);
      
      const [newCOC] = await db
        .insert(certificatesOfCompliance)
        .values(cocData)
        .returning();

      // Add audit logging for COC creation
      try {
        const { AuditLogger } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        
        // Get client info for audit context
        const [client] = await db
          .select({ name: clients.name })
          .from(clients)
          .where(eq(clients.id, cocData.clientId))
          .limit(1);

        await auditLogger.logCreate(
          'certificate_of_compliance',
          newCOC.id,
          newCOC.cocNumber,
          {
            ...cocData,
            clientName: client?.name
          }
        );

        // Also log as client activity
        const { logAudit } = await import('./lib/audit');
        await logAudit({
          userId: req.user?.id,
          action: 'coc_created',
          entityType: 'client',
          entityId: cocData.clientId,
          entityName: client?.name || 'Unknown Client',
          description: `Certificate of Compliance "${newCOC.cocNumber}" was created for this client`,
          category: 'compliance_management',
          severity: 'info',
          metadata: {
            cocId: newCOC.id,
            cocNumber: newCOC.cocNumber,
            complianceType: cocData.complianceType,
            issueDate: cocData.issueDate,
            expiryDate: cocData.expiryDate
          }
        }, req);

        console.log('✅ Audit logging completed for COC creation');
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for COC creation:', auditError.message);
      }

      res.status(201).json(newCOC);
    } catch (error) {
      next(error);
    }
  });

  // Delete COC
  app.delete("/api/certificates-of-compliance/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get COC for audit logging before deletion
      const [existingCOC] = await db
        .select()
        .from(certificatesOfCompliance)
        .where(eq(certificatesOfCompliance.id, id))
        .limit(1);

      if (!existingCOC) {
        return res.status(404).json({ message: "Certificate of Compliance not found" });
      }

      const [deleted] = await db
        .delete(certificatesOfCompliance)
        .where(eq(certificatesOfCompliance.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Certificate of Compliance not found" });
      }

      // Add audit logging for COC deletion
      try {
        const { AuditLogger } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        await auditLogger.logDelete(
          'certificate_of_compliance',
          id,
          existingCOC.cocNumber,
          existingCOC
        );
        console.log('✅ Audit logging completed for COC deletion');
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for COC deletion:', auditError.message);
      }

      res.json({ message: "Certificate of Compliance deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // SERVICE SCOPES ENDPOINTS
  // ========================================

  // SERVICE SCOPES ENDPOINTS
  // ========================================

  // Get all service scopes with filtering support
  
  // ---- Mock data routes for Jira ticket widgets ----
  app.use('/api/mock-jira', mockJiraRoutes);

  // Auth routes are now set up in server/index.ts

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Debug endpoint for file upload diagnostics (admin only)
  app.get("/api/debug/uploads", requireAdmin, async (req, res, next) => {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Check if uploads directory exists
      const uploadsExists = fs.existsSync(uploadsDir);
      
      let files = [];
      let permissions = null;
      
      if (uploadsExists) {
        try {
          files = fs.readdirSync(uploadsDir).slice(0, 10); // Limit to first 10 files for safety
          const stats = fs.statSync(uploadsDir);
          permissions = {
            mode: stats.mode,
            uid: stats.uid,
            gid: stats.gid,
            isDirectory: stats.isDirectory(),
            isWritable: fs.constants.W_OK
          };
        } catch (error) {
          console.error('Error reading uploads directory:', error);
        }
      }

      // Get database document count
      const [{ count: documentCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(eq(documents.isActive, true));

      res.json({
        uploadsDirectory: uploadsDir,
        uploadsExists,
        fileCount: files.length,
        sampleFiles: files,
        permissions,
        documentCount: Number(documentCount),
        processUid: process.getuid ? process.getuid() : 'N/A',
        processGid: process.getgid ? process.getgid() : 'N/A',
        cwd: process.cwd(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Debug uploads error:", error);
      res.status(500).json({ 
        error: error.message,
        uploadsDirectory: path.join(process.cwd(), 'uploads'),
        cwd: process.cwd()
      });
    }
  });

  // ========================================
  // USER AUTHENTICATION ENDPOINTS
  // ========================================

  // Get entity relation types
  app.get("/api/entity-relations/types", requireAuth, async (req, res, next) => {
    try {
      res.json({
        entityTypes: Object.values(ENTITY_TYPES),
        relationshipTypes: Object.values(RELATIONSHIP_TYPES)
      });
    } catch (error) {
      console.error("Get entity relation types error:", error);
      res.status(500).json({ message: "Failed to fetch entity relation types" });
    }
  });


// Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      version: packageJson.version,
      uptime: process.uptime()
    });
  });

  // Version endpoint
  app.get("/api/version", (req, res) => {
    res.json({
      version: packageJson.version,
      name: "MSSP Client Manager",
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // ========================================
  // FIELD VISIBILITY CONFIGURATION ENDPOINTS
  // ========================================

  // Get all field visibility configurations
  app.get('/api/field-visibility', requireAuth, async (req, res, next) => {
    try {
      const configs = await storage.getFieldVisibilityConfigs();
      res.json(configs);
    } catch (error) {
      console.error('Error fetching field visibility configs:', error);
      res.status(500).json({ error: 'Failed to fetch field visibility configurations' });
    }
  });

  // Set field visibility
  app.post('/api/field-visibility', requireAuth, async (req, res, next) => {
    try {
      const { tableName, fieldName, isVisible, context } = req.body;
      
      if (!tableName || !fieldName || typeof isVisible !== 'boolean') {
        return res.status(400).json({ error: 'tableName, fieldName, and isVisible are required' });
      }

      const config = await storage.setFieldVisibility(tableName, fieldName, isVisible, context || 'form');
      
      // Log the change
      try {
        await storage.createAuditLog({
          userId: req.user!.id,
          action: 'field_visibility_update',
          tableName: 'field_visibility_config',
          recordId: null,
          oldValues: null,
          newValues: JSON.stringify({
            tableName,
            fieldName,
            isVisible,
            context,
            action: 'update_field_visibility'
          })
        });
      } catch (auditError) {
        console.error('Audit log failed (non-critical):', auditError);
        // Continue execution even if audit logging fails
      }

      res.json(config);
    } catch (error) {
      console.error('Error updating field visibility:', error);
      res.status(500).json({ error: 'Failed to update field visibility' });
    }
  });

  // Get field visibility for a specific table
  app.get('/api/field-visibility/:tableName', requireAuth, async (req, res, next) => {
    try {
      const { tableName } = req.params;
      const { context = 'form' } = req.query;
      
      const configs = await storage.getFieldVisibilityForTable(tableName, context as string);
      res.json(configs);
    } catch (error) {
      console.error('Error fetching field visibility for table:', error);
      res.status(500).json({ error: 'Failed to fetch field visibility for table' });
    }
  });

  // Reset field visibility (back to default visible)
  app.delete('/api/field-visibility/:tableName/:fieldName', requireAuth, async (req, res, next) => {
    try {
      const { tableName, fieldName } = req.params;
      const { context = 'form' } = req.query;
      
      await storage.resetFieldVisibility(tableName, fieldName, context as string);
      
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'field_visibility_reset',
        tableName: 'field_visibility_config',
        recordId: null,
        oldValues: null,
        newValues: JSON.stringify({
          tableName,
          fieldName,
          context,
          action: 'reset_field_visibility'
        })
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error resetting field visibility:', error);
      res.status(500).json({ error: 'Failed to reset field visibility' });
    }
  });

  // User authentication with bcrypt

  
  // ========================================
  // TWO-FACTOR AUTHENTICATION ENDPOINTS
  // ========================================

  // Get 2FA status for current user
  app.get("/api/user/2fa/status", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Since twoFactorSecret doesn't exist in our schema, always return disabled
      res.json({
        enabled: false,
        backupCodesRemaining: 0
      });
    } catch (error) {
      console.error("Get 2FA status error:", error);
      res.status(500).json({ message: "Failed to get 2FA status" });
    }
  });

  // Setup 2FA
  app.post("/api/user/2fa/setup", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate secret and QR code
      const { secret, qrCode } = await twoFAService.generateSecret(user.email);
      
      // Store the secret temporarily (not enabled yet)
      req.session.tempTwoFactorSecret = secret;

      res.json({
        secret,
        qrCode
      });
    } catch (error) {
      console.error("Setup 2FA error:", error);
      res.status(500).json({ message: "Failed to setup 2FA" });
    }
  });

  // Enable 2FA
  app.post("/api/user/2fa/enable", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const { token } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!req.session.tempTwoFactorSecret) {
        return res.status(400).json({ message: "No 2FA setup in progress" });
      }

      // Verify the token
      const isValid = twoFAService.verifyToken(req.session.tempTwoFactorSecret, token);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Generate backup codes
      const backupCodes = twoFAService.generateBackupCodes();

      // Update user with 2FA enabled
      await storage.updateUser(userId, {
        twoFactorSecret: req.session.tempTwoFactorSecret,
        twoFactorBackupCodes: JSON.stringify(backupCodes.map(code => ({ code, used: false })))
      });

      // Clear temp secret
      delete req.session.tempTwoFactorSecret;

      res.json({
        success: true,
        backupCodes
      });
    } catch (error) {
      console.error("Enable 2FA error:", error);
      res.status(500).json({ message: "Failed to enable 2FA" });
    }
  });

  // Disable 2FA
  app.post("/api/user/2fa/disable", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const { password } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Invalid password" });
      }

      // Disable 2FA
      await storage.updateUser(userId, {
        twoFactorSecret: null,
        twoFactorBackupCodes: null
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Disable 2FA error:", error);
      res.status(500).json({ message: "Failed to disable 2FA" });
    }
  });

  // Verify 2FA token
  app.post("/api/user/2fa/verify", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const { token } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUserById(userId);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ message: "2FA not enabled" });
      }

      const isValid = twoFAService.verifyToken(user.twoFactorSecret, token);
      
      res.json({ valid: isValid });
    } catch (error) {
      console.error("Verify 2FA error:", error);
      res.status(500).json({ message: "Failed to verify 2FA token" });
    }
  });


  // ========================================
  // CLIENT ENDPOINTS
  // ========================================

  // Get all clients
  app.get("/api/clients", requireAuth, async (req, res, next) => {
    try {
      const clients = await storage.getAllClients();
      
      // Add data access logging
      try {
        const { logDataAccess } = await import('./lib/audit');
        await logDataAccess({
          userId: req.user?.id,
          entityType: 'client',
          accessType: 'list',
          accessMethod: 'web_ui',
          dataScope: 'partial',
          resultCount: clients.length,
          sensitiveData: true,
          purpose: 'Client list view - dashboard/management interface'
        }, req);
      } catch (auditError) {
        console.error('⚠️ Data access logging failed for client list:', auditError.message);
      }
      
      res.json(clients);
    } catch (error) {
      next(error);
    }
  });

  // Get archived clients (MUST be before /:id route)
  app.get("/api/clients/archived", requireAuth, async (req, res, next) => {
    try {
      const archivedClients = await storage.getArchivedClients();
      
      // Add data access logging
      try {
        const { logDataAccess } = await import('./lib/audit');
        await logDataAccess({
          userId: req.user?.id,
          entityType: 'client',
          accessType: 'list',
          accessMethod: 'web_ui',
          dataScope: 'partial',
          resultCount: archivedClients.length,
          sensitiveData: true,
          purpose: 'Archived client list view - administrative review'
        }, req);
      } catch (auditError) {
        console.error('⚠️ Data access logging failed for archived client list:', auditError.message);
      }
      
      res.json(archivedClients);
    } catch (error) {
      console.error("Get archived clients error:", error);
      res.status(500).json({ message: "Failed to fetch archived clients" });
    }
  });

  
  // Get dashboard widgets
  app.get("/api/dashboard/widgets", requireAuth, async (req, res, next) => {
    try {
      const widgets = await db.select().from(dashboardWidgets);
      res.json(widgets);
    } catch (error) {
      console.error("Error fetching widgets:", error);
      res.status(500).json({ error: "Failed to fetch widgets" });
    }
  });

  // Get recent activity
  app.get("/api/dashboard/recent-activity", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get recent audit logs
      const recentActivity = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          entityName: auditLogs.entityName,
          description: auditLogs.description,
          timestamp: auditLogs.timestamp,
          category: auditLogs.category
        })
        .from(auditLogs)
        .orderBy(desc(auditLogs.timestamp))
        .limit(10);

      res.json(recentActivity);
    } catch (error) {
      console.error("Get recent activity error:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });



// Get client by ID
  app.get("/api/clients/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Add data access logging
      try {
        const { logDataAccess } = await import('./lib/audit');
        await logDataAccess({
          userId: req.user?.id,
          entityType: 'client',
          entityId: id,
          entityName: client.name,
          accessType: 'view',
          accessMethod: 'web_ui',
          dataScope: 'full',
          resultCount: 1,
          sensitiveData: true,
          purpose: 'Client detail view - comprehensive client information access'
        }, req);
      } catch (auditError) {
        console.error('⚠️ Data access logging failed for client detail view:', auditError.message);
      }
      
      res.json(client);
    } catch (error) {
      next(error);
    }
  });

  // Get client individual licenses
  app.get("/api/clients/:id/individual-licenses", requireAuth, async (req, res, next) => {
    try {
      const clientId = parseInt(req.params.id);
      // Return empty array for now - individual licenses would need to be implemented
      res.json([]);
    } catch (error) {
      next(error);
    }
  });

  // Get client service authorization forms
  app.get("/api/clients/:id/service-authorization-forms", requireAuth, async (req, res, next) => {
    try {
      const clientId = parseInt(req.params.id);
      const safs = await storage.getClientServiceAuthorizationForms(clientId);
      res.json(safs);
    } catch (error) {
      next(error);
    }
  });

  // Get client certificates of compliance
  app.get("/api/clients/:id/certificates-of-compliance", requireAuth, async (req, res, next) => {
    try {
      const clientId = parseInt(req.params.id);
      // Return empty array for now - certificates would need to be implemented
      res.json([]);
    } catch (error) {
      next(error);
    }
  });

  // Get client service scopes
  app.get("/api/clients/:id/service-scopes", requireAuth, async (req, res, next) => {
    try {
      const clientId = parseInt(req.params.id);
      const serviceScopes = await storage.getServiceScopesByClientId(clientId);
      res.json(serviceScopes);
    } catch (error) {
      next(error);
    }
  });

  // Create client
  app.post("/api/clients", requireManagerOrAbove, async (req, res, next) => {
    try {
      const result = insertClientSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid client data", 
          errors: result.error.issues 
        });
      }

      const newClient = await storage.createClient(result.data);
      
      // Enhanced audit logging with AuditLogger
      try {
        const { AuditLogger } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        
        await auditLogger.logCreate(
          'client',
          newClient.id,
          newClient.name,
          {
            industry: result.data.industry,
            domain: result.data.domain,
            contactEmail: result.data.contactEmail,
            contactPhone: result.data.contactPhone,
            address: result.data.address,
            status: result.data.status || 'active'
          }
        );
        
        console.log('✅ Enhanced audit logging completed for client creation');
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for client creation:', auditError.message);
      }
      
      res.status(201).json(newClient);
    } catch (error) {
      next(error);
    }
  });

  // Update client
  app.put("/api/clients/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertClientSchema.partial().safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid client data", 
          errors: result.error.issues 
        });
      }

      const updatedClient = await storage.updateClient(id, result.data);
      
      if (!updatedClient) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Enhanced audit logging with change detection
      try {
        // Get original client data for change detection
        const originalClient = await storage.getClient(id);
        
        const { AuditLogger, detectChanges } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        
        // Detect what actually changed
        const changes = detectChanges(originalClient, updatedClient);
        
        if (changes.length > 0) {
          await auditLogger.logUpdate(
            'client',
            updatedClient.id,
            updatedClient.name,
            changes,
            originalClient
          );
          console.log(`✅ Enhanced audit logging completed for client update (${changes.length} changes detected)`);
        } else {
          console.log('ℹ️ No changes detected in client update - skipping detailed audit logging');
        }
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for client update:', auditError.message);
      }

      res.json(updatedClient);
    } catch (error) {
      next(error);
    }
  });

  // Delete client (soft delete)
  app.delete("/api/clients/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Check deletion impact first
      const impact = await storage.getClientDeletionImpact(id);
      if (!impact.canDelete) {
        return res.status(400).json({ 
          message: "Cannot archive client", 
          blockers: impact.blockers,
          dependencies: impact.dependencies
        });
      }

      const success = await storage.deleteClient(id);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to archive client" });
      }

      // Create audit log
      try {
        await storage.createAuditLog({
          userId: req.user?.id || null,
          action: 'ARCHIVE',
          entityType: 'client',
          entityId: id,
          entityName: client.name,
          description: `Archived client: ${client.name}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || null,
          severity: 'warning',
          category: 'client_management'
        });
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for client archival:', auditError.message);
      }

      res.json({ success: true, message: "Client archived successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Check client deletion impact
  app.get("/api/clients/:id/deletion-impact", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const impact = await storage.getClientDeletionImpact(id);
      res.json(impact);
    } catch (error) {
      next(error);
    }
  });

  // Archive client (explicit)
  app.post("/api/clients/:id/archive", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Check deletion impact first
      const impact = await storage.getClientDeletionImpact(id);
      if (!impact.canDelete) {
        return res.status(400).json({ 
          message: "Cannot archive client", 
          blockers: impact.blockers,
          dependencies: impact.dependencies
        });
      }

      const archivedClient = await storage.archiveClient(id);
      
      if (!archivedClient) {
        return res.status(500).json({ message: "Failed to archive client" });
      }

      // Create audit log
      try {
        await storage.createAuditLog({
          userId: req.user?.id || null,
          action: 'ARCHIVE',
          entityType: 'client',
          entityId: id,
          entityName: client.name,
          description: `Archived client: ${client.name}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || null,
          severity: 'warning',
          category: 'client_management'
        });
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for client archival:', auditError.message);
      }

      res.json(archivedClient);
    } catch (error) {
      next(error);
    }
  });

  // Restore archived client
  app.post("/api/clients/:id/restore", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      const restoredClient = await storage.restoreClient(id);
      
      if (!restoredClient) {
        return res.status(404).json({ message: "Archived client not found" });
      }

      // Create audit log
      try {
        await storage.createAuditLog({
          userId: req.user?.id || null,
          action: 'RESTORE',
          entityType: 'client',
          entityId: id,
          entityName: restoredClient.name,
          description: `Restored client: ${restoredClient.name}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || null,
          severity: 'info',
          category: 'client_management'
        });
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for client restoration:', auditError.message);
      }

      res.json(restoredClient);
    } catch (error) {
      next(error);
    }
  });

  // Contracts endpoints
  app.get("/api/contracts", requireAuth, async (req, res, next) => {
    try {
      const { clientId } = req.query;
      
      let contracts;
      if (clientId) {
        // Filter contracts by client ID
        const clientIdNum = parseInt(clientId as string);
        if (isNaN(clientIdNum)) {
          return res.status(400).json({ message: "Invalid client ID provided" });
        }
        contracts = await storage.getClientContracts(clientIdNum);
      } else {
        // Get all contracts
        contracts = await storage.getAllContracts();
      }
      
      res.json(contracts);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/contracts/:id", requireAuth, async (req, res, next) => {
    try {
      const contract = await storage.getContract(parseInt(req.params.id));
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/contracts", requireManagerOrAbove, async (req, res, next) => {
    try {
      // Validate client exists
      const clients = await storage.getAllClients();
      validateContractClientConsistency(
        { clientId: req.body.clientId },
        clients.map(c => ({ id: c.id }))
      );

      const { services: contractServices, ...contractData } = req.body;

      const finalContractData = {
        ...contractData,
        totalValue: contractData.totalValue ? parseFloat(contractData.totalValue) : 0,
        startDate: new Date(contractData.startDate),
        endDate: new Date(contractData.endDate),
      };
      
      const contract = await storage.createContract(finalContractData);
      
      // If services are provided, create service scopes
      if (contractServices && Array.isArray(contractServices) && contractServices.length > 0) {
        console.log('Creating service scopes for contract:', contract.id, 'Services:', contractServices);
        
        for (const serviceData of contractServices) {
          try {
            const scopeData = {
              contractId: contract.id,
              serviceId: serviceData.serviceId,
              scopeDefinition: serviceData.scopeData || {},
              startDate: contract.startDate,
              endDate: contract.endDate,
              status: 'active',
              monthlyValue: null,
              notes: `Service scope for ${serviceData.serviceName}`,
            };

            const [newScope] = await db
              .insert(serviceScopes)
              .values(scopeData)
              .returning();

            console.log('✅ Created service scope:', newScope.id, 'for service:', serviceData.serviceId);
          } catch (scopeError) {
            console.error('❌ Failed to create service scope for service:', serviceData.serviceId, scopeError);
            // Continue with other services even if one fails
          }
        }
      }
      
      // Add audit logging for contract creation
      try {
        const { AuditLogger } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        const client = clients.find(c => c.id === req.body.clientId);
        
        // Log for the contract entity
        await auditLogger.logCreate(
          'contract',
          contract.id,
          contract.name,
          {
            clientId: req.body.clientId,
            clientName: client?.name || 'Unknown Client',
            contractValue: finalContractData.totalValue,
            contractDuration: `${finalContractData.startDate} to ${finalContractData.endDate}`,
            servicesCount: contractServices?.length || 0
          }
        );
        
        // Also log as a client-related activity
        const { logAudit } = await import('./lib/audit');
        await logAudit({
          userId: req.user?.id,
          action: 'contract_created',
          entityType: 'client',
          entityId: req.body.clientId,
          entityName: client?.name || 'Unknown Client',
          description: `Contract "${contract.name}" was created for this client${contractServices?.length ? ` with ${contractServices.length} services` : ''}`,
          category: 'contract_management',
          severity: 'info',
          metadata: {
            contractId: contract.id,
            contractName: contract.name,
            contractValue: finalContractData.totalValue,
            contractDuration: `${finalContractData.startDate} to ${finalContractData.endDate}`,
            servicesCount: contractServices?.length || 0
          }
        }, req);

        console.log('✅ Audit logging completed for contract creation');
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for contract creation:', auditError.message);
      }

      res.status(201).json(contract);
    } catch (error) {
      next(error);
    }
  });

  // Update contract
  app.put("/api/contracts/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const contractId = parseInt(req.params.id);
      
      // Get existing contract for audit comparison
      const [existingContract] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, contractId))
        .limit(1);

      if (!existingContract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const { services: contractServices, ...contractData } = req.body;
      
      // Transform date strings to Date objects if provided
      if (contractData.startDate) contractData.startDate = new Date(contractData.startDate);
      if (contractData.endDate) contractData.endDate = new Date(contractData.endDate);
      if (contractData.totalValue) contractData.totalValue = parseFloat(contractData.totalValue);

      const [updatedContract] = await db
        .update(contracts)
        .set({ ...contractData, updatedAt: new Date() })
        .where(eq(contracts.id, contractId))
        .returning();

      if (!updatedContract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Handle services update - if services are provided, update service scopes
      if (contractServices && Array.isArray(contractServices)) {
        console.log('Updating service scopes for contract:', contractId, 'Services:', contractServices);
        
        // Get existing service scopes for this contract
        const existingScopes = await db
          .select()
          .from(serviceScopes)
          .where(eq(serviceScopes.contractId, contractId));

        // Create a set of service IDs from the new services list
        const newServiceIds = new Set(contractServices.map(s => s.serviceId));
        
        // Remove service scopes that are no longer in the services list
        const scopesToRemove = existingScopes.filter(scope => !newServiceIds.has(scope.serviceId));
        for (const scope of scopesToRemove) {
          await db
            .delete(serviceScopes)
            .where(eq(serviceScopes.id, scope.id));
          console.log('🗑️ Removed service scope:', scope.id, 'for service:', scope.serviceId);
        }
        
        // Add or update service scopes for new services
        for (const serviceData of contractServices) {
          try {
            const existingScope = existingScopes.find(s => s.serviceId === serviceData.serviceId);
            
            if (existingScope) {
              // Update existing service scope
              const [updatedScope] = await db
                .update(serviceScopes)
                .set({
                  scopeDefinition: serviceData.scopeData || {},
                  startDate: updatedContract.startDate,
                  endDate: updatedContract.endDate,
                  notes: `Service scope for ${serviceData.serviceName}`,
                  updatedAt: new Date()
                })
                .where(eq(serviceScopes.id, existingScope.id))
                .returning();
              console.log('✅ Updated service scope:', updatedScope.id, 'for service:', serviceData.serviceId);
            } else {
              // Create new service scope
              const scopeData = {
                contractId: contractId,
                serviceId: serviceData.serviceId,
                scopeDefinition: serviceData.scopeData || {},
                startDate: updatedContract.startDate,
                endDate: updatedContract.endDate,
                status: 'active',
                monthlyValue: null,
                notes: `Service scope for ${serviceData.serviceName}`,
              };

              const [newScope] = await db
                .insert(serviceScopes)
                .values(scopeData)
                .returning();
              console.log('✅ Created service scope:', newScope.id, 'for service:', serviceData.serviceId);
            }
          } catch (scopeError) {
            console.error('❌ Failed to update/create service scope for service:', serviceData.serviceId, scopeError);
            // Continue with other services even if one fails
          }
        }
      }

      // Add audit logging for contract update
      try {
        const { AuditLogger, detectChanges } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        const changes = detectChanges(existingContract, updatedContract);
        
        if (changes.length > 0) {
          await auditLogger.logUpdate(
            'contract',
            updatedContract.id,
            updatedContract.name,
            changes,
            existingContract
          );
          console.log(`✅ Audit logging completed for contract update (${changes.length} changes)`);
        }
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for contract update:', auditError.message);
      }

      res.json(updatedContract);
    } catch (error) {
      next(error);
    }
  });

  // Delete SAF
  app.delete("/api/service-authorization-forms/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get SAF for audit logging before deletion
      const [existingSAF] = await db
        .select()
        .from(serviceAuthorizationForms)
        .where(eq(serviceAuthorizationForms.id, id))
        .limit(1);

      if (!existingSAF) {
        return res.status(404).json({ message: "Service Authorization Form not found" });
      }

      const [deleted] = await db
        .delete(serviceAuthorizationForms)
        .where(eq(serviceAuthorizationForms.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Service Authorization Form not found" });
      }

      // Add audit logging for SAF deletion
      try {
        const { AuditLogger } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        await auditLogger.logDelete(
          'service_authorization_form',
          id,
          existingSAF.safNumber,
          existingSAF
        );
        console.log('✅ Audit logging completed for SAF deletion');
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for SAF deletion:', auditError.message);
      }

      res.json({ message: "Service Authorization Form deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // CERTIFICATES OF COMPLIANCE (COC) ENDPOINTS
  // ========================================

  // Get all COCs
  app.get("/api/certificates-of-compliance", requireAuth, async (req, res, next) => {
    try {
      const { clientId } = req.query;
      
      let whereConditions: any[] = [];
      if (clientId) {
        whereConditions.push(eq(certificatesOfCompliance.clientId, parseInt(clientId as string)));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const cocs = await db
        .select({
          id: certificatesOfCompliance.id,
          clientId: certificatesOfCompliance.clientId,
          contractId: certificatesOfCompliance.contractId,
          serviceScopeId: certificatesOfCompliance.serviceScopeId,
          safId: certificatesOfCompliance.safId,
          cocNumber: certificatesOfCompliance.cocNumber,
          title: certificatesOfCompliance.title,
          description: certificatesOfCompliance.description,
          complianceType: certificatesOfCompliance.complianceType,
          issueDate: certificatesOfCompliance.issueDate,
          expiryDate: certificatesOfCompliance.expiryDate,
          status: certificatesOfCompliance.status,
          documentUrl: certificatesOfCompliance.documentUrl,
          issuedBy: certificatesOfCompliance.issuedBy,
          auditDate: certificatesOfCompliance.auditDate,
          nextAuditDate: certificatesOfCompliance.nextAuditDate,
          notes: certificatesOfCompliance.notes,
          createdAt: certificatesOfCompliance.createdAt,
          updatedAt: certificatesOfCompliance.updatedAt,
          clientName: clients.name,
          contractName: contracts.name
        })
        .from(certificatesOfCompliance)
        .leftJoin(clients, eq(certificatesOfCompliance.clientId, clients.id))
        .leftJoin(contracts, eq(certificatesOfCompliance.contractId, contracts.id))
        .where(whereClause)
        .orderBy(desc(certificatesOfCompliance.createdAt));

      res.json(cocs);
    } catch (error) {
      next(error);
    }
  });

  // Create COC
  app.post("/api/certificates-of-compliance", requireManagerOrAbove, async (req, res, next) => {
    try {
      const cocData = apiCertificateOfComplianceSchema.parse(req.body);
      
      const [newCOC] = await db
        .insert(certificatesOfCompliance)
        .values(cocData)
        .returning();

      // Add audit logging for COC creation
      try {
        const { AuditLogger } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        
        // Get client info for audit context
        const [client] = await db
          .select({ name: clients.name })
          .from(clients)
          .where(eq(clients.id, cocData.clientId))
          .limit(1);

        await auditLogger.logCreate(
          'certificate_of_compliance',
          newCOC.id,
          newCOC.cocNumber,
          {
            ...cocData,
            clientName: client?.name
          }
        );

        // Also log as client activity
        const { logAudit } = await import('./lib/audit');
        await logAudit({
          userId: req.user?.id,
          action: 'coc_created',
          entityType: 'client',
          entityId: cocData.clientId,
          entityName: client?.name || 'Unknown Client',
          description: `Certificate of Compliance "${newCOC.cocNumber}" was created for this client`,
          category: 'compliance_management',
          severity: 'info',
          metadata: {
            cocId: newCOC.id,
            cocNumber: newCOC.cocNumber,
            complianceType: cocData.complianceType,
            issueDate: cocData.issueDate,
            expiryDate: cocData.expiryDate
          }
        }, req);

        console.log('✅ Audit logging completed for COC creation');
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for COC creation:', auditError.message);
      }

      res.status(201).json(newCOC);
    } catch (error) {
      next(error);
    }
  });

  // Delete COC
  app.delete("/api/certificates-of-compliance/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get COC for audit logging before deletion
      const [existingCOC] = await db
        .select()
        .from(certificatesOfCompliance)
        .where(eq(certificatesOfCompliance.id, id))
        .limit(1);

      if (!existingCOC) {
        return res.status(404).json({ message: "Certificate of Compliance not found" });
      }

      const [deleted] = await db
        .delete(certificatesOfCompliance)
        .where(eq(certificatesOfCompliance.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Certificate of Compliance not found" });
      }

      // Add audit logging for COC deletion
      try {
        const { AuditLogger } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        await auditLogger.logDelete(
          'certificate_of_compliance',
          id,
          existingCOC.cocNumber,
          existingCOC
        );
        console.log('✅ Audit logging completed for COC deletion');
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for COC deletion:', auditError.message);
      }

      res.json({ message: "Certificate of Compliance deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // SERVICE SCOPES ENDPOINTS
  // ========================================

  // Get all service scopes with filtering support
  app.get("/api/service-scopes", requireAuth, async (req, res, next) => {
    try {
      const { 
        clientId, 
        contractId, 
        serviceId,
        serviceTier,
        coverageHours,
        epsMin,
        epsMax,
        endpointsMin,
        endpointsMax,
        responseTimeMin,
        responseTimeMax,
        page = '1',
        limit = '50',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;
      
      let whereConditions: any[] = [];
      
      // Basic filters
      if (clientId) {
        whereConditions.push(eq(contracts.clientId, parseInt(clientId as string)));
      }
      if (contractId) {
        whereConditions.push(eq(serviceScopes.contractId, parseInt(contractId as string)));
      }
      if (serviceId) {
        whereConditions.push(eq(serviceScopes.serviceId, parseInt(serviceId as string)));
      }
      
      // Scope variable filters
      if (serviceTier) {
        whereConditions.push(eq(serviceScopes.serviceTier, serviceTier as string));
      }
      if (coverageHours) {
        whereConditions.push(eq(serviceScopes.coverageHours, coverageHours as string));
      }
      if (epsMin) {
        whereConditions.push(gte(serviceScopes.eps, parseInt(epsMin as string)));
      }
      if (epsMax) {
        whereConditions.push(lte(serviceScopes.eps, parseInt(epsMax as string)));
      }
      if (endpointsMin) {
        whereConditions.push(gte(serviceScopes.endpoints, parseInt(endpointsMin as string)));
      }
      if (endpointsMax) {
        whereConditions.push(lte(serviceScopes.endpoints, parseInt(endpointsMax as string)));
      }
      if (responseTimeMin) {
        whereConditions.push(gte(serviceScopes.responseTimeMinutes, parseInt(responseTimeMin as string)));
      }
      if (responseTimeMax) {
        whereConditions.push(lte(serviceScopes.responseTimeMinutes, parseInt(responseTimeMax as string)));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Calculate pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Determine sort column and order
      const sortColumn = sortBy === 'eps' ? serviceScopes.eps :
                        sortBy === 'endpoints' ? serviceScopes.endpoints :
                        sortBy === 'serviceTier' ? serviceScopes.serviceTier :
                        sortBy === 'coverageHours' ? serviceScopes.coverageHours :
                        sortBy === 'responseTimeMinutes' ? serviceScopes.responseTimeMinutes :
                        sortBy === 'serviceName' ? services.name :
                        sortBy === 'clientName' ? clients.name :
                        serviceScopes.createdAt;

      const orderDirection = sortOrder === 'asc' ? asc : desc;

      const scopes = await db
        .select({
          id: serviceScopes.id,
          contractId: serviceScopes.contractId,
          serviceId: serviceScopes.serviceId,
          scopeDefinition: serviceScopes.scopeDefinition,
          startDate: serviceScopes.startDate,
          endDate: serviceScopes.endDate,
          status: serviceScopes.status,
          monthlyValue: serviceScopes.monthlyValue,
          notes: serviceScopes.notes,
          // Include indexed scope variables
          eps: serviceScopes.eps,
          endpoints: serviceScopes.endpoints,
          dataVolumeGb: serviceScopes.dataVolumeGb,
          logSources: serviceScopes.logSources,
          firewallDevices: serviceScopes.firewallDevices,
          pamUsers: serviceScopes.pamUsers,
          responseTimeMinutes: serviceScopes.responseTimeMinutes,
          coverageHours: serviceScopes.coverageHours,
          serviceTier: serviceScopes.serviceTier,
          createdAt: serviceScopes.createdAt,
          contractName: contracts.name,
          clientId: contracts.clientId,
          clientName: clients.name,
          serviceName: services.name
        })
        .from(serviceScopes)
        .leftJoin(contracts, eq(serviceScopes.contractId, contracts.id))
        .leftJoin(clients, eq(contracts.clientId, clients.id))
        .leftJoin(services, eq(serviceScopes.serviceId, services.id))
        .where(whereClause)
        .orderBy(orderDirection(sortColumn))
        .limit(limitNum)
        .offset(offset);

      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(serviceScopes)
        .leftJoin(contracts, eq(serviceScopes.contractId, contracts.id))
        .where(whereClause);

      const totalPages = Math.ceil(count / limitNum);

      res.json({
        data: scopes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // Advanced service scope search with filters
  app.get("/api/service-scopes/search", requireAuth, async (req, res, next) => {
    try {
      const {
        q, // search query for text search
        serviceId,
        serviceTier,
        coverageHours,
        epsMin,
        epsMax,
        endpointsMin,
        endpointsMax,
        responseTimeMin,
        responseTimeMax,
        dataVolumeMin,
        dataVolumeMax,
        logSourcesMin,
        logSourcesMax,
        firewallDevicesMin,
        firewallDevicesMax,
        pamUsersMin,
        pamUsersMax,
        clientIds, // comma-separated list
        serviceIds, // comma-separated list
        page = '1',
        limit = '50',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      let whereConditions: any[] = [];

      // Text search across multiple fields
      if (q) {
        const searchTerm = `%${q}%`;
        whereConditions.push(
          or(
            ilike(clients.name, searchTerm),
            ilike(services.name, searchTerm),
            ilike(contracts.name, searchTerm),
            ilike(serviceScopes.notes, searchTerm),
            sql`${serviceScopes.scopeDefinition}->>'description' ILIKE ${searchTerm}`
          )
        );
      }

      // Multiple client filter
      if (clientIds) {
        const clientIdArray = (clientIds as string).split(',').map(id => parseInt(id.trim()));
        whereConditions.push(inArray(contracts.clientId, clientIdArray));
      }

      // Multiple service filter
      if (serviceIds) {
        const serviceIdArray = (serviceIds as string).split(',').map(id => parseInt(id.trim()));
        whereConditions.push(inArray(serviceScopes.serviceId, serviceIdArray));
      }

      // Service tier filter
      if (serviceTier && serviceTier !== 'all') {
        whereConditions.push(eq(serviceScopes.serviceTier, serviceTier as string));
      }

      // Coverage hours filter
      if (coverageHours && coverageHours !== 'all') {
        whereConditions.push(eq(serviceScopes.coverageHours, coverageHours as string));
      }

      // EPS range filter
      if (epsMin || epsMax) {
        if (epsMin && epsMax) {
          whereConditions.push(between(serviceScopes.eps, parseInt(epsMin as string), parseInt(epsMax as string)));
        } else if (epsMin) {
          whereConditions.push(gte(serviceScopes.eps, parseInt(epsMin as string)));
        } else if (epsMax) {
          whereConditions.push(lte(serviceScopes.eps, parseInt(epsMax as string)));
        }
      }

      // Endpoints range filter
      if (endpointsMin || endpointsMax) {
        if (endpointsMin && endpointsMax) {
          whereConditions.push(between(serviceScopes.endpoints, parseInt(endpointsMin as string), parseInt(endpointsMax as string)));
        } else if (endpointsMin) {
          whereConditions.push(gte(serviceScopes.endpoints, parseInt(endpointsMin as string)));
        } else if (endpointsMax) {
          whereConditions.push(lte(serviceScopes.endpoints, parseInt(endpointsMax as string)));
        }
      }

      // Response time range filter
      if (responseTimeMin || responseTimeMax) {
        if (responseTimeMin && responseTimeMax) {
          whereConditions.push(between(serviceScopes.responseTimeMinutes, parseInt(responseTimeMin as string), parseInt(responseTimeMax as string)));
        } else if (responseTimeMin) {
          whereConditions.push(gte(serviceScopes.responseTimeMinutes, parseInt(responseTimeMin as string)));
        } else if (responseTimeMax) {
          whereConditions.push(lte(serviceScopes.responseTimeMinutes, parseInt(responseTimeMax as string)));
        }
      }

      // Data volume range filter
      if (dataVolumeMin || dataVolumeMax) {
        if (dataVolumeMin && dataVolumeMax) {
          whereConditions.push(between(serviceScopes.dataVolumeGb, parseFloat(dataVolumeMin as string), parseFloat(dataVolumeMax as string)));
        } else if (dataVolumeMin) {
          whereConditions.push(gte(serviceScopes.dataVolumeGb, parseFloat(dataVolumeMin as string)));
        } else if (dataVolumeMax) {
          whereConditions.push(lte(serviceScopes.dataVolumeGb, parseFloat(dataVolumeMax as string)));
        }
      }

      // Additional filters for other scope variables...
      if (logSourcesMin) {
        whereConditions.push(gte(serviceScopes.logSources, parseInt(logSourcesMin as string)));
      }
      if (logSourcesMax) {
        whereConditions.push(lte(serviceScopes.logSources, parseInt(logSourcesMax as string)));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Calculate pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Determine sort column and order
      const sortColumn = sortBy === 'eps' ? serviceScopes.eps :
                        sortBy === 'endpoints' ? serviceScopes.endpoints :
                        sortBy === 'serviceTier' ? serviceScopes.serviceTier :
                        sortBy === 'coverageHours' ? serviceScopes.coverageHours :
                        sortBy === 'responseTimeMinutes' ? serviceScopes.responseTimeMinutes :
                        sortBy === 'serviceName' ? services.name :
                        sortBy === 'clientName' ? clients.name :
                        serviceScopes.createdAt;

      const orderDirection = sortOrder === 'asc' ? asc : desc;

      const scopes = await db
        .select({
          id: serviceScopes.id,
          contractId: serviceScopes.contractId,
          serviceId: serviceScopes.serviceId,
          scopeDefinition: serviceScopes.scopeDefinition,
          startDate: serviceScopes.startDate,
          endDate: serviceScopes.endDate,
          status: serviceScopes.status,
          monthlyValue: serviceScopes.monthlyValue,
          notes: serviceScopes.notes,
          // Include all indexed scope variables
          eps: serviceScopes.eps,
          endpoints: serviceScopes.endpoints,
          dataVolumeGb: serviceScopes.dataVolumeGb,
          logSources: serviceScopes.logSources,
          firewallDevices: serviceScopes.firewallDevices,
          pamUsers: serviceScopes.pamUsers,
          responseTimeMinutes: serviceScopes.responseTimeMinutes,
          coverageHours: serviceScopes.coverageHours,
          serviceTier: serviceScopes.serviceTier,
          createdAt: serviceScopes.createdAt,
          contractName: contracts.name,
          clientId: contracts.clientId,
          clientName: clients.name,
          serviceName: services.name
        })
        .from(serviceScopes)
        .leftJoin(contracts, eq(serviceScopes.contractId, contracts.id))
        .leftJoin(clients, eq(contracts.clientId, clients.id))
        .leftJoin(services, eq(serviceScopes.serviceId, services.id))
        .where(whereClause)
        .orderBy(orderDirection(sortColumn))
        .limit(limitNum)
        .offset(offset);

      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(serviceScopes)
        .leftJoin(contracts, eq(serviceScopes.contractId, contracts.id))
        .leftJoin(clients, eq(contracts.clientId, clients.id))
        .where(whereClause);

      const totalPages = Math.ceil(count / limitNum);

      res.json({
        data: scopes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        },
        filters: {
          serviceTier: serviceTier || 'all',
          coverageHours: coverageHours || 'all',
          epsRange: { min: epsMin, max: epsMax },
          endpointsRange: { min: endpointsMin, max: endpointsMax },
          responseTimeRange: { min: responseTimeMin, max: responseTimeMax }
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // Dynamic Service Scope Variable Endpoints
  
  // Get variable definitions for dynamic filtering
  app.get("/api/service-scopes/variables/definitions", requireAuth, async (req, res, next) => {
    try {
      const definitions = await db.execute(sql`
        SELECT 
          variable_name as name,
          variable_type as "variableType",
          display_name as "displayName",
          description,
          filter_component as "filterComponent",
          unit,
          is_filterable as "isFilterable"
        FROM scope_variable_definitions
        WHERE is_filterable = true
        ORDER BY display_name
      `);

      res.json(definitions.rows);
    } catch (error) {
      next(error);
    }
  });

  // Dynamic search endpoint that can handle any scope variable filters
  app.get("/api/service-scopes/dynamic", requireAuth, async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'created_at',
        sortOrder = 'desc',
        ...filters
      } = req.query;

      // Build dynamic filter query
      const filterConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Process each filter
      for (const [key, value] of Object.entries(filters)) {
        if (!value || value === '') continue;

        // Handle range filters (key_min, key_max)
        if (key.endsWith('_min')) {
          const variableName = key.replace('_min', '');
          filterConditions.push(`
            EXISTS (
              SELECT 1 FROM scope_variable_values svv 
              WHERE svv.service_scope_id = service_scopes.id 
              AND svv.variable_name = $${paramIndex++}
              AND (svv.value_integer >= $${paramIndex} OR svv.value_decimal >= $${paramIndex})
            )
          `);
          queryParams.push(variableName, Number(value), Number(value));
          paramIndex++;
        } else if (key.endsWith('_max')) {
          const variableName = key.replace('_max', '');
          filterConditions.push(`
            EXISTS (
              SELECT 1 FROM scope_variable_values svv 
              WHERE svv.service_scope_id = service_scopes.id 
              AND svv.variable_name = $${paramIndex++}
              AND (svv.value_integer <= $${paramIndex} OR svv.value_decimal <= $${paramIndex})
            )
          `);
          queryParams.push(variableName, Number(value), Number(value));
          paramIndex++;
        } else {
          // Exact match or text search
          if (typeof value === 'string' && value.includes('*')) {
            // Wildcard search
            const searchPattern = value.replace(/\*/g, '%');
            filterConditions.push(`
              EXISTS (
                SELECT 1 FROM scope_variable_values svv 
                WHERE svv.service_scope_id = service_scopes.id 
                AND svv.variable_name = $${paramIndex++}
                AND svv.value_text ILIKE $${paramIndex++}
              )
            `);
            queryParams.push(key, searchPattern);
          } else {
            // Exact match
            filterConditions.push(`
              EXISTS (
                SELECT 1 FROM scope_variable_values svv 
                WHERE svv.service_scope_id = service_scopes.id 
                AND svv.variable_name = $${paramIndex++}
                AND (
                  svv.value_text = $${paramIndex} OR
                  svv.value_integer = $${paramIndex} OR
                  svv.value_decimal = $${paramIndex}
                )
              )
            `);
            queryParams.push(key, String(value), Number(value), Number(value));
            paramIndex += 3;
          }
        }
      }

      // Calculate pagination
      const offset = (Number(page) - 1) * Number(limit);

      // Build the main query
      let query = `
        SELECT 
          ss.id,
          ss.contract_id as "contractId",
          ss.service_id as "serviceId",
          ss.scope_definition as "scopeDefinition",
          ss.created_at as "createdAt",
          ss.updated_at as "updatedAt"
        FROM service_scopes ss
      `;

      // Apply filters
      if (filterConditions.length > 0) {
        query += ` WHERE ${filterConditions.join(' AND ')}`;
      }

      // Apply sorting and pagination
      const validSortColumns = ['created_at', 'updated_at', 'id'];
      const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy as string : 'created_at';
      const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
      
      query += ` ORDER BY ${sortColumn} ${order} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      queryParams.push(Number(limit), offset);

      const results = await db.execute(sql.raw(query, queryParams));

      // Get variable values for each scope
      const scopeIds = results.rows.map((r: any) => r.id);
      let variables: any[] = [];
      
      if (scopeIds.length > 0) {
        const variableQuery = `
          SELECT 
            service_scope_id as "serviceScopeId",
            variable_name as "variableName",
            value_text as "valueText",
            value_integer as "valueInteger",
            value_decimal as "valueDecimal",
            value_boolean as "valueBoolean"
          FROM scope_variable_values
          WHERE service_scope_id = ANY($1)
        `;
        const variableResults = await db.execute(sql.raw(variableQuery, [scopeIds]));
        variables = variableResults.rows;
      }

      // Group variables by scope ID
      const variablesByScope = variables.reduce((acc: any, variable: any) => {
        const scopeId = variable.serviceScopeId;
        if (!acc[scopeId]) acc[scopeId] = {};
        
        const value = variable.valueInteger ?? variable.valueDecimal ?? variable.valueBoolean ?? variable.valueText;
        acc[scopeId][variable.variableName] = value;
        
        return acc;
      }, {});

      // Combine results with variables
      const enrichedResults = results.rows.map((scope: any) => ({
        ...scope,
        variables: variablesByScope[scope.id] || {}
      }));

      // Get total count for pagination
      let countQuery = `SELECT count(*) FROM service_scopes ss`;
      let countParams = queryParams.slice(0, -2); // Remove limit and offset params

      if (filterConditions.length > 0) {
        countQuery += ` WHERE ${filterConditions.join(' AND ')}`;
      }

      const [{ count }] = (await db.execute(sql.raw(countQuery, countParams))).rows;
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
      next(error);
    }
  });

  // Add a new scope variable to an existing scope
  app.post("/api/service-scopes/:scopeId/variables", requireManagerOrAbove, async (req, res, next) => {
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
      next(error);
    }
  });

  // Get statistics about variable usage
  app.get("/api/service-scopes/variables/stats", requireAuth, async (req, res, next) => {
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
      next(error);
    }
  });

  // Discover new variables from scope definitions
  app.get("/api/service-scopes/variables/discover", requireManagerOrAbove, async (req, res, next) => {
    try {
      const discovered = await db.execute(sql`SELECT * FROM auto_discover_variables()`);
      
      res.json({
        newVariables: discovered.rows,
        message: `Found ${discovered.rows.length} potential new variables`
      });
    } catch (error) {
      next(error);
    }
  });

  // Get service scope by ID
  app.get("/api/service-scopes/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      const [scope] = await db
        .select({
          id: serviceScopes.id,
          contractId: serviceScopes.contractId,
          serviceId: serviceScopes.serviceId,
          scopeDefinition: serviceScopes.scopeDefinition,
          startDate: serviceScopes.startDate,
          endDate: serviceScopes.endDate,
          status: serviceScopes.status,
          monthlyValue: serviceScopes.monthlyValue,
          notes: serviceScopes.notes,
          createdAt: serviceScopes.createdAt,
          contractName: contracts.name,
          clientId: contracts.clientId,
          clientName: clients.name,
          serviceName: services.name
        })
        .from(serviceScopes)
        .leftJoin(contracts, eq(serviceScopes.contractId, contracts.id))
        .leftJoin(clients, eq(contracts.clientId, clients.id))
        .leftJoin(services, eq(serviceScopes.serviceId, services.id))
        .where(eq(serviceScopes.id, id))
        .limit(1);

      if (!scope) {
        return res.status(404).json({ message: "Service scope not found" });
      }

      res.json(scope);
    } catch (error) {
      next(error);
    }
  });

  
  // Get service categories
  app.get("/api/services/categories", requireAuth, async (req, res, next) => {
    try {
      // Get distinct categories from services
      const categories = await db
        .selectDistinct({ category: services.category })
        .from(services)
        .where(eq(services.isActive, true))
        .orderBy(services.category);

      const categoryList = categories.map(c => c.category).filter(Boolean);
      
      // If no categories found, return default categories
      if (categoryList.length === 0) {
        return res.json([
          'Security Operations',
          'Security Assessment',
          'Network Security',
          'Compliance & Governance',
          'Identity Management'
        ]);
      }

      res.json(categoryList);
    } catch (error) {
      next(error);
    }
  });


// Create service scope
  app.post("/api/contracts/:contractId/service-scopes", requireManagerOrAbove, async (req, res, next) => {
    try {
      const contractId = parseInt(req.params.contractId);
      const { serviceId, description, deliverables, monthlyValue, startDate, endDate, status, variables = {} } = req.body;

      // Validate contract exists
      const [contract] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, contractId))
        .limit(1);

      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const scopeData = {
        contractId,
        serviceId: parseInt(serviceId),
        scopeDefinition: {
          description: description || "",
          deliverables: Array.isArray(deliverables) ? deliverables : [],
        },
        startDate: startDate ? new Date(startDate) : contract.startDate,
        endDate: endDate ? new Date(endDate) : contract.endDate,
        status: status || "active",
        monthlyValue: monthlyValue ? parseFloat(monthlyValue) : null,
        notes: description || null
      };

      const [newScope] = await db
        .insert(serviceScopes)
        .values(scopeData)
        .returning();

      // Add audit logging for service scope creation
      try {
        const { AuditLogger } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        
        // Get client info for audit context
        const [client] = await db
          .select({ name: clients.name })
          .from(clients)
          .where(eq(clients.id, contract.clientId))
          .limit(1);

        await auditLogger.logCreate(
          'service_scope',
          newScope.id,
          `Service Scope #${newScope.id}`,
          {
            contractId,
            contractName: contract.name,
            serviceId: scopeData.serviceId,
            clientName: client?.name,
            description: scopeData.scopeDefinition.description,
            deliverables: scopeData.scopeDefinition.deliverables
          }
        );

        // Also log as contract activity
        const { logAudit } = await import('./lib/audit');
        await logAudit({
          userId: req.user?.id,
          action: 'service_scope_created',
          entityType: 'contract',
          entityId: contractId,
          entityName: contract.name,
          description: `Service scope was created for this contract`,
          category: 'service_management',
          severity: 'info',
          metadata: {
            scopeId: newScope.id,
            serviceId: scopeData.serviceId,
            description: scopeData.scopeDefinition.description
          }
        }, req);

        console.log('✅ Audit logging completed for service scope creation');
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for service scope creation:', auditError.message);
      }

      res.status(201).json(newScope);

      // After scope is created, store dynamic variable values (if provided)
      try {
        const variableEntries = Object.entries(variables as Record<string, any>);
        for (const [variableName, value] of variableEntries) {
          const insertData: any = {
            serviceScopeId: newScope.id,
            variableName,
          };

          if (typeof value === 'number') {
            if (Number.isInteger(value)) {
              insertData.valueInteger = value;
            } else {
              insertData.valueDecimal = value;
            }
          } else if (typeof value === 'boolean') {
            insertData.valueBoolean = value;
          } else {
            insertData.valueText = String(value);
          }

          await db.insert(scopeVariableValues).values(insertData);
        }
      } catch (varErr) {
        console.error('Failed saving scope variables:', varErr);
      }
    } catch (error) {
      next(error);
    }
  });

  // Update service scope
  app.put("/api/contracts/:contractId/service-scopes/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const contractId = parseInt(req.params.contractId);
      const id = parseInt(req.params.id);
      const { serviceId, description, deliverables, monthlyValue, startDate, endDate, status, variables = {} } = req.body;

      // Get existing scope for audit logging before deletion
      const [existingScope] = await db
        .select()
        .from(serviceScopes)
        .where(and(
          eq(serviceScopes.id, id),
          eq(serviceScopes.contractId, contractId)
        ))
        .limit(1);

      if (!existingScope) {
        return res.status(404).json({ message: "Service scope not found" });
      }

      const updateData: any = {};
      
      if (serviceId !== undefined) updateData.serviceId = parseInt(serviceId);
      if (description !== undefined || deliverables !== undefined) {
        updateData.scopeDefinition = {
          description: description || "",
          deliverables: Array.isArray(deliverables) ? deliverables : [],
        };
      }
      if (monthlyValue !== undefined) updateData.monthlyValue = monthlyValue ? parseFloat(monthlyValue) : null;
      if (startDate !== undefined) updateData.startDate = new Date(startDate);
      if (endDate !== undefined) updateData.endDate = new Date(endDate);
      if (status !== undefined) updateData.status = status;
      if (description !== undefined) updateData.notes = description;

      const [updatedScope] = await db
        .update(serviceScopes)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(serviceScopes.id, id))
        .returning();

      if (!updatedScope) {
        return res.status(404).json({ message: "Service scope not found" });
      }

      // Add audit logging for service scope update
      try {
        const { AuditLogger, detectChanges } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        const changes = detectChanges(existingScope, updatedScope);
        
        if (changes.length > 0) {
          await auditLogger.logUpdate(
            'service_scope',
            updatedScope.id,
            `Service Scope #${updatedScope.id}`,
            changes,
            existingScope
          );
          console.log(`✅ Audit logging completed for service scope update (${changes.length} changes)`);
        }
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for service scope update:', auditError.message);
      }

      res.json(updatedScope);

      // Upsert dynamic variables if provided
      try {
        const variableEntries = Object.entries(variables as Record<string, any>);
        for (const [variableName, value] of variableEntries) {
          const insertData: any = {
            serviceScopeId: updatedScope.id,
            variableName,
          };

          if (typeof value === 'number') {
            if (Number.isInteger(value)) {
              insertData.valueInteger = value;
            } else {
              insertData.valueDecimal = value;
            }
          } else if (typeof value === 'boolean') {
            insertData.valueBoolean = value;
          } else {
            insertData.valueText = String(value);
          }

          // Upsert logic – if the record exists update, else insert
          await db
            .insert(scopeVariableValues)
            .values(insertData)
            .onConflictDoUpdate({
              target: [scopeVariableValues.serviceScopeId, scopeVariableValues.variableName],
              set: insertData,
            });
        }
      } catch (varErr) {
        console.error('Failed updating scope variables:', varErr);
      }
    } catch (error) {
      next(error);
    }
  });

  // Delete service scope
  app.delete("/api/contracts/:contractId/service-scopes/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const contractId = parseInt(req.params.contractId);
      const id = parseInt(req.params.id);
      
      // Get scope for audit logging before deletion
      const [existingScope] = await db
        .select()
        .from(serviceScopes)
        .where(and(
          eq(serviceScopes.id, id),
          eq(serviceScopes.contractId, contractId)
        ))
        .limit(1);

      if (!existingScope) {
        return res.status(404).json({ message: "Service scope not found" });
      }

      const [deleted] = await db
        .delete(serviceScopes)
        .where(eq(serviceScopes.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Service scope not found" });
      }

      // Add audit logging for service scope deletion
      try {
        const { AuditLogger } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        await auditLogger.logDelete(
          'service_scope',
          id,
          `Service Scope #${id}`,
          existingScope
        );
        console.log('✅ Audit logging completed for service scope deletion');
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for service scope deletion:', auditError.message);
      }

      res.json({ message: "Service scope deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // INDIVIDUAL LICENSE ENDPOINTS 
  // ========================================

  // Get all individual licenses
  app.get("/api/individual-licenses", requireAuth, async (req, res, next) => {
    try {
      const { clientId } = req.query;
      
      let whereConditions: any[] = [];
      if (clientId) {
        whereConditions.push(eq(individualLicenses.clientId, parseInt(clientId as string)));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const licenses = await db
        .select()
        .from(individualLicenses)
        .where(whereClause)
        .orderBy(desc(individualLicenses.createdAt));

      res.json(licenses);
    } catch (error) {
      next(error);
    }
  });

  // Create individual license
  app.post("/api/individual-licenses", requireManagerOrAbove, async (req, res, next) => {
    try {
      const licenseData = apiIndividualLicenseSchema.parse(req.body);
      
      const [newLicense] = await db
        .insert(individualLicenses)
        .values(licenseData)
        .returning();

      // Add audit logging for individual license creation
      try {
        const { AuditLogger } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        
        // Get client info for audit context
        const [client] = await db
          .select({ name: clients.name })
          .from(clients)
          .where(eq(clients.id, licenseData.clientId))
          .limit(1);

        await auditLogger.logCreate(
          'individual_license',
          newLicense.id,
          newLicense.name,
          {
            ...licenseData,
            clientName: client?.name
          }
        );

        // Also log as client activity
        const { logAudit } = await import('./lib/audit');
        await logAudit({
          userId: req.user?.id,
          action: 'license_assigned',
          entityType: 'client',
          entityId: licenseData.clientId,
          entityName: client?.name || 'Unknown Client',
          description: `Individual license "${newLicense.name}" was assigned to this client`,
          category: 'license_management',
          severity: 'info',
          metadata: {
            licenseId: newLicense.id,
            licenseName: newLicense.name,
            vendor: newLicense.vendor,
            productName: newLicense.productName,
            quantity: newLicense.quantity,
            costPerLicense: licenseData.costPerLicense
          }
        }, req);

        console.log('✅ Audit logging completed for individual license creation');
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for individual license creation:', auditError.message);
      }
      
      res.status(201).json(newLicense);
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // GLOBAL SEARCH ENDPOINTS
  // ========================================

  // Execute search
  app.post("/api/search/execute", requireAuth, async (req, res, next) => {
    try {
      const { globalQuery, conditions = [], entityTypes = [], sortBy = 'relevance', sortOrder = 'desc', limit = 50 } = req.body;
      
      // Validate and sanitize inputs
      const safeLimit = Math.max(1, Math.min(parseInt(limit) || 50, 1000)); // Limit between 1 and 1000
      const safeEntityTypes = Array.isArray(entityTypes) ? entityTypes.filter(Boolean) : [];
      
      // Define actualEntityTypes at function scope to avoid scoping issues in logging
      const defaultEntityTypes = ['clients', 'contracts', 'services', 'users'];
      const actualEntityTypes = safeEntityTypes.length > 0 ? safeEntityTypes : defaultEntityTypes;
      
      if (!globalQuery && conditions.length === 0) {
        return res.json([]);
      }

      const results: any[] = [];

      // If we have a global query, search across all selected entity types
      if (globalQuery && typeof globalQuery === 'string' && globalQuery.length >= 2) {
        const searchTerm = `%${globalQuery.toLowerCase()}%`;
        
        // Calculate per-entity limit more safely - always ensure we have a valid number
        const perEntityLimit = Math.max(1, Math.floor(safeLimit / actualEntityTypes.length));

        // Search clients
        if (actualEntityTypes.includes('clients')) {
          try {
            const clientResults = await db
              .select({
                id: clients.id,
                entityType: sql<string>`'clients'`,
                entityId: clients.id,
                title: clients.name,
                subtitle: clients.industry,
                description: sql<string>`COALESCE(${clients.notes}, '')`,
                relevanceScore: sql<number>`
                  CASE 
                    WHEN LOWER(${clients.name}) = ${globalQuery.toLowerCase()} THEN 1.0
                    WHEN LOWER(${clients.shortName}) = ${globalQuery.toLowerCase()} THEN 0.95
                    WHEN LOWER(${clients.domain}) = ${globalQuery.toLowerCase()} THEN 0.9
                    WHEN LOWER(${clients.name}) LIKE ${globalQuery.toLowerCase() + '%'} THEN 0.9
                    WHEN LOWER(${clients.shortName}) LIKE ${globalQuery.toLowerCase() + '%'} THEN 0.85
                    WHEN LOWER(${clients.domain}) LIKE ${globalQuery.toLowerCase() + '%'} THEN 0.8
                    WHEN LOWER(${clients.name}) LIKE ${searchTerm} THEN 0.7
                    WHEN LOWER(${clients.shortName}) LIKE ${searchTerm} THEN 0.65
                    WHEN LOWER(${clients.domain}) LIKE ${searchTerm} THEN 0.6
                    WHEN LOWER(${clients.industry}) LIKE ${searchTerm} THEN 0.5
                    WHEN LOWER(COALESCE(${clients.notes}, '')) LIKE ${searchTerm} THEN 0.3
                    ELSE 0.1
                  END
                `
              })
              .from(clients)
              .where(
                or(
                  like(sql`LOWER(${clients.name})`, searchTerm),
                  like(sql`LOWER(COALESCE(${clients.shortName}, ''))`, searchTerm),
                  like(sql`LOWER(COALESCE(${clients.domain}, ''))`, searchTerm),
                  like(sql`LOWER(${clients.industry})`, searchTerm),
                  like(sql`LOWER(COALESCE(${clients.notes}, ''))`, searchTerm)
                )
              )
              .limit(perEntityLimit);
            
            results.push(...clientResults);
    } catch (error) {
            console.error('Error searching clients:', error);
          }
        }

        // Search contracts
        if (actualEntityTypes.includes('contracts')) {
          try {
            const contractResults = await db
              .select({
                id: contracts.id,
                entityType: sql<string>`'contracts'`,
                entityId: contracts.id,
                title: contracts.name,
                subtitle: sql<string>`CONCAT('Contract - ', COALESCE(${clients.name}, 'Unknown Client'))`,
                description: sql<string>`COALESCE(${contracts.notes}, '')`,
                relevanceScore: sql<number>`
                  CASE 
                    WHEN LOWER(${contracts.name}) = ${globalQuery.toLowerCase()} THEN 1.0
                    WHEN LOWER(${contracts.name}) LIKE ${globalQuery.toLowerCase() + '%'} THEN 0.9
                    WHEN LOWER(${contracts.name}) LIKE ${searchTerm} THEN 0.7
                    WHEN LOWER(COALESCE(${contracts.notes}, '')) LIKE ${searchTerm} THEN 0.3
                    ELSE 0.1
                  END
                `
              })
              .from(contracts)
              .leftJoin(clients, eq(contracts.clientId, clients.id))
              .where(
                or(
                  like(sql`LOWER(${contracts.name})`, searchTerm),
                  like(sql`LOWER(COALESCE(${contracts.notes}, ''))`, searchTerm)
                )
              )
              .limit(perEntityLimit);
            
            results.push(...contractResults);
    } catch (error) {
            console.error('Error searching contracts:', error);
          }
        }

        // Search services
        if (actualEntityTypes.includes('services')) {
          try {
            const serviceResults = await db
              .select({
                id: services.id,
                entityType: sql<string>`'services'`,
                entityId: services.id,
                title: services.name,
                subtitle: sql<string>`CONCAT('Service - ', ${services.category})`,
                description: sql<string>`COALESCE(${services.description}, '')`,
                relevanceScore: sql<number>`
                  CASE 
                    WHEN LOWER(${services.name}) = ${globalQuery.toLowerCase()} THEN 1.0
                    WHEN LOWER(${services.name}) LIKE ${globalQuery.toLowerCase() + '%'} THEN 0.9
                    WHEN LOWER(${services.name}) LIKE ${searchTerm} THEN 0.7
                    WHEN LOWER(${services.category}) LIKE ${searchTerm} THEN 0.5
                    WHEN LOWER(COALESCE(${services.description}, '')) LIKE ${searchTerm} THEN 0.3
                    ELSE 0.1
                  END
                `
              })
              .from(services)
              .where(
                or(
                  like(sql`LOWER(${services.name})`, searchTerm),
                  like(sql`LOWER(${services.category})`, searchTerm),
                  like(sql`LOWER(COALESCE(${services.description}, ''))`, searchTerm)
                )
              )
              .limit(perEntityLimit);
            
            results.push(...serviceResults);
    } catch (error) {
            console.error('Error searching services:', error);
          }
        }

        // Search users
        if (actualEntityTypes.includes('users')) {
          try {
            const userResults = await db
              .select({
                id: users.id,
                entityType: sql<string>`'users'`,
                entityId: users.id,
                title: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
                subtitle: sql<string>`CONCAT(${users.email}, ' - ', ${users.role})`,
                description: sql<string>`''`,
                relevanceScore: sql<number>`
                  CASE 
                    WHEN LOWER(CONCAT(${users.firstName}, ' ', ${users.lastName})) = ${globalQuery.toLowerCase()} THEN 1.0
                    WHEN LOWER(${users.email}) = ${globalQuery.toLowerCase()} THEN 1.0
                    WHEN LOWER(CONCAT(${users.firstName}, ' ', ${users.lastName})) LIKE ${searchTerm} THEN 0.8
                    WHEN LOWER(${users.email}) LIKE ${searchTerm} THEN 0.6
                    WHEN LOWER(${users.role}) LIKE ${searchTerm} THEN 0.4
                    ELSE 0.1
                  END
                `
              })
              .from(users)
              .where(
                or(
                  like(sql`LOWER(CONCAT(${users.firstName}, ' ', ${users.lastName}))`, searchTerm),
                  like(sql`LOWER(${users.email})`, searchTerm),
                  like(sql`LOWER(${users.role})`, searchTerm)
                )
              )
              .limit(perEntityLimit);
            
            results.push(...userResults);
    } catch (error) {
            console.error('Error searching users:', error);
          }
        }
      }

      // Sort results by relevance score
      results.sort((a, b) => {
        if (sortBy === 'relevance') {
          return sortOrder === 'desc' ? b.relevanceScore - a.relevanceScore : a.relevanceScore - b.relevanceScore;
        }
        return 0;
      });

      // Apply global limit
      const limitedResults = results.slice(0, safeLimit);

      // Log search in history (try-catch to prevent search failure if logging fails)
      try {
        if (req.user?.id && globalQuery) {
          await db.insert(searchHistory).values({
            userId: req.user.id,
            searchQuery: globalQuery || '',
            entityTypes: actualEntityTypes,
            resultsCount: limitedResults.length,
            executionTime: Date.now() - (req.startTime || Date.now())
          });
        }
      } catch (logError) {
        console.log("Log search error (non-critical):", logError.message);
        // Continue with returning results even if logging fails
      }

      res.json(limitedResults);
    } catch (error) {
      next(error);
    }
  });

  // Get search history
  app.get("/api/search/history", requireAuth, async (req, res, next) => {
    try {
      const { limit = 10 } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const history = await db
        .select()
        .from(searchHistory)
        .where(eq(searchHistory.userId, userId))
        .orderBy(desc(searchHistory.createdAt))
        .limit(parseInt(limit as string));

      res.json(history);
    } catch (error) {
      next(error);
    }
  });

  // Get saved searches
  app.get("/api/search/saved", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const saved = await db
        .select()
        .from(savedSearches)
        .where(
          or(
            eq(savedSearches.userId, userId),
            eq(savedSearches.isPublic, true)
          )
        )
        .orderBy(desc(savedSearches.createdAt));

      res.json(saved);
    } catch (error) {
      next(error);
    }
  });

  // Save a search
  app.post("/api/search/save", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { name, description, searchConfig, entityTypes, isPublic = false, isQuickFilter = false, tags = [] } = req.body;

      if (!name || !searchConfig) {
        return res.status(400).json({ message: "Name and search configuration are required" });
      }

      const [savedSearch] = await db
        .insert(savedSearches)
        .values({
          userId,
          name,
          description,
          searchConfig: JSON.stringify(searchConfig),
          entityTypes: entityTypes || [],
          isPublic,
          isQuickFilter,
          tags,
          useCount: 0
        })
        .returning();

      res.status(201).json(savedSearch);
    } catch (error) {
      next(error);
    }
  });

  // Log search activity (for analytics)
  app.post("/api/search/log", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { searchQuery, searchConfig, entityTypes, resultsCount, executionTime } = req.body;

      await db
        .insert(searchHistory)
        .values({
          userId,
          searchQuery,
          searchConfig: searchConfig ? JSON.stringify(searchConfig) : null,
          entityTypes: entityTypes || [],
          resultsCount: resultsCount || 0,
          executionTime: executionTime || null
        });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Get user's accessible pages based on role
  app.get("/api/user/accessible-pages", requireAuth, async (req, res, next) => {
    try {
      const userRole = req.user?.role;
      if (!userRole) {
        return res.status(403).json({ message: "User role not found" });
      }

      // Map role to snake_case column names
      const roleColumnMap: Record<string, string> = {
        admin: 'admin_access',
        manager: 'manager_access',
        engineer: 'engineer_access',
        user: 'user_access'
      };
      
      const roleColumn = roleColumnMap[userRole];
      if (!roleColumn) {
        return res.status(403).json({ message: "Invalid user role" });
      }
      
      // Use raw SQL for dynamic column access
      const query = `
        SELECT 
          page_name as "pageName",
          page_url as "pageUrl", 
          display_name as "displayName",
          description,
          category,
          icon,
          sort_order as "sortOrder"
        FROM page_permissions
        WHERE is_active = true 
          AND ${roleColumn} = true
        ORDER BY sort_order
      `;
      
      const result = await db.execute(sql.raw(query));
      const accessiblePages = result.rows;

      res.json(accessiblePages);
    } catch (error) {
      next(error);
    }
  });

  // Get page permissions (admin only)
  app.get("/api/page-permissions", requireAdmin, async (req, res, next) => {
    try {
      const permissions = await db
        .select()
        .from(pagePermissions)
        .orderBy(pagePermissions.category, pagePermissions.sortOrder);

      res.json(permissions);
    } catch (error) {
      next(error);
    }
  });

  // Reorder page permissions (admin only) - MUST come before the :id route

// Custom contract schema that accepts date strings from JSON and converts them to Date objects
const apiContractSchema = z.object({
  clientId: z.number(),
  name: z.string(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  status: z.string().optional(),
  notes: z.string().nullable().optional(),
  autoRenewal: z.boolean().optional(),
  renewalTerms: z.string().nullable().optional(),
  totalValue: z.string().nullable().optional(),
  documentUrl: z.string().nullable().optional(),
});

// Custom license pool schema that accepts date strings from JSON and converts them to Date objects
const apiLicensePoolSchema = z.object({
  name: z.string(),
  vendor: z.string(),
  productName: z.string(),
  licenseType: z.string().optional(),
  totalLicenses: z.number(),
  availableLicenses: z.number(),
  costPerLicense: z.string().optional(),
  renewalDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Custom hardware asset schema that accepts date strings from JSON and converts them to Date objects
const apiHardwareAssetSchema = z.object({
  name: z.string(),
  category: z.string(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  purchaseCost: z.string().optional(),
  warrantyExpiry: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  status: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

// Custom individual license schema that accepts date strings from JSON and converts them to Date objects
const apiIndividualLicenseSchema = z.object({
  clientId: z.number(),
  serviceScopeId: z.number().optional(),
  name: z.string(),
  vendor: z.string(),
  productName: z.string(),
  licenseKey: z.string().optional(),
  licenseType: z.string().optional(),
  quantity: z.number().default(1),
  costPerLicense: z.string().optional(),
  purchaseDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  expiryDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  renewalDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  purchaseRequestNumber: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  documentUrl: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

// Custom SAF schema that accepts date strings from JSON and converts them to Date objects
const apiServiceAuthorizationFormSchema = z.object({
  clientId: z.number(),
  contractId: z.number(),
  serviceScopeId: z.number().optional(),
  safNumber: z.string(),
  title: z.string(),
  description: z.string().optional(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  status: z.string().optional(),
  documentUrl: z.string().optional(),
  approvedBy: z.number().optional(),
  approvedDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  value: z.string().optional(),
  notes: z.string().optional(),
});

// Custom COC schema that accepts date strings from JSON and converts them to Date objects
const apiCertificateOfComplianceSchema = z.object({
  clientId: z.number(),
  contractId: z.number().optional(),
  serviceScopeId: z.number().optional(),
  safId: z.number().optional(),
  cocNumber: z.string(),
  title: z.string(),
  description: z.string().optional(),
  complianceType: z.string(),
  issueDate: z.string().transform((str) => new Date(str)),
  expiryDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  status: z.string().optional(),
  documentUrl: z.string().optional(),
  issuedBy: z.number().optional(),
  auditDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  nextAuditDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  notes: z.string().optional(),
});

  return httpServer;
} // end registerRoutes function

