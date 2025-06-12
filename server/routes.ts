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
  externalSystems, clientExternalMappings, externalWidgetTemplates, widgetExecutionCache,
  pagePermissions, savedSearches, searchHistory
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
import { ExternalApiService } from './external-api-service';
import { DynamicQueryExecutionService } from './services/query-execution-service.ts';
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
  type ExternalSystem, type InsertExternalSystem, type ClientExternalMapping,
  type InsertClientExternalMapping } from "@shared/schema";
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import csv from 'csv-parser';
import dashboardBridge from './api/integration-engine/dashboard-bridge';
import externalDataBridge from './api/integration-engine/external-data-bridge';
import { externalWidgetRoutes } from './routes/external-widgets.ts';
import { integrationEngineWidgetRoutes } from './routes/integration-engine-widgets.ts';
import { codebaseAnalyzer } from './services/codebase-analyzer';
import { router as dynamicServiceScopeRoutes } from './api/dynamic-service-scopes';
import poolValidationRoutes from './api/pool-validation';
import { mockJiraRoutes } from './routes/mock-jira.ts';
import { getPlugin } from "./plugins/plugin-manager";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // ---- Mock data routes for Jira ticket widgets ----
  app.use('/api/mock-jira', mockJiraRoutes);

  // Auth routes are now set up in server/index.ts

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Debug endpoint for file upload diagnostics (admin only)
  app.get("/api/debug/uploads", requireAdmin, async (req, res) => {
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

  // Import external API service
  const { externalApiService } = await import("./external-api-service");

  
  // Get entity relation types
  app.get("/api/entity-relations/types", requireAuth, async (req, res) => {
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
  app.get('/api/field-visibility', requireAuth, async (req, res) => {
    try {
      const configs = await storage.getFieldVisibilityConfigs();
      res.json(configs);
    } catch (error) {
      console.error('Error fetching field visibility configs:', error);
      res.status(500).json({ error: 'Failed to fetch field visibility configurations' });
    }
  });

  // Set field visibility
  app.post('/api/field-visibility', requireAuth, async (req, res) => {
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
  app.get('/api/field-visibility/:tableName', requireAuth, async (req, res) => {
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
  app.delete('/api/field-visibility/:tableName/:fieldName', requireAuth, async (req, res) => {
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
  app.get("/api/user/2fa/status", requireAuth, async (req, res) => {
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
  app.post("/api/user/2fa/setup", requireAuth, async (req, res) => {
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
  app.post("/api/user/2fa/enable", requireAuth, async (req, res) => {
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
  app.post("/api/user/2fa/disable", requireAuth, async (req, res) => {
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
  app.post("/api/user/2fa/verify", requireAuth, async (req, res) => {
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
  app.get("/api/clients", requireAuth, async (req, res) => {
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
      console.error("Get clients error:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // Get archived clients (MUST be before /:id route)
  app.get("/api/clients/archived", requireAuth, async (req, res) => {
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
  app.get("/api/dashboard/widgets", requireAuth, async (req, res) => {
    try {
      const widgets = await db.select().from(dashboardWidgets);
      res.json(widgets);
    } catch (error) {
      console.error("Error fetching widgets:", error);
      res.status(500).json({ error: "Failed to fetch widgets" });
    }
  });

  // Get recent activity
  app.get("/api/dashboard/recent-activity", requireAuth, async (req, res) => {
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
  app.get("/api/clients/:id", requireAuth, async (req, res) => {
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
      console.error("Get client error:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  // Get client individual licenses
  app.get("/api/clients/:id/individual-licenses", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      // Return empty array for now - individual licenses would need to be implemented
      res.json([]);
    } catch (error) {
      console.error("Get client individual licenses error:", error);
      res.status(500).json({ message: "Failed to fetch client individual licenses" });
    }
  });

  // Get client service authorization forms
  app.get("/api/clients/:id/service-authorization-forms", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      // Return empty array for now - SAFs would need to be implemented
      res.json([]);
    } catch (error) {
      console.error("Get client SAFs error:", error);
      res.status(500).json({ message: "Failed to fetch client service authorization forms" });
    }
  });

  // Get client certificates of compliance
  app.get("/api/clients/:id/certificates-of-compliance", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      // Return empty array for now - certificates would need to be implemented
      res.json([]);
    } catch (error) {
      console.error("Get client certificates error:", error);
      res.status(500).json({ message: "Failed to fetch client certificates of compliance" });
    }
  });

  // Get client service scopes
  app.get("/api/clients/:id/service-scopes", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const serviceScopes = await storage.getServiceScopesByClientId(clientId);
      res.json(serviceScopes);
    } catch (error) {
      console.error("Get client service scopes error:", error);
      res.status(500).json({ message: "Failed to fetch client service scopes" });
    }
  });

  // Create client
  app.post("/api/clients", requireManagerOrAbove, async (req, res) => {
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
      console.error("Create client error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create client" 
      });
    }
  });

  // Update client
  app.put("/api/clients/:id", requireManagerOrAbove, async (req, res) => {
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
      console.error("Update client error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to update client" 
      });
    }
  });

  // Delete client (soft delete)
  app.delete("/api/clients/:id", requireManagerOrAbove, async (req, res) => {
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
      console.error("Archive client error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to archive client" 
      });
    }
  });

  // Check client deletion impact
  app.get("/api/clients/:id/deletion-impact", requireManagerOrAbove, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const impact = await storage.getClientDeletionImpact(id);
      res.json(impact);
    } catch (error) {
      console.error("Get client deletion impact error:", error);
      res.status(500).json({ message: "Failed to check deletion impact" });
    }
  });

  // Archive client (explicit)
  app.post("/api/clients/:id/archive", requireManagerOrAbove, async (req, res) => {
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
      console.error("Archive client error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to archive client" 
      });
    }
  });

  // Restore archived client
  app.post("/api/clients/:id/restore", requireManagerOrAbove, async (req, res) => {
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
      console.error("Restore client error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to restore client" 
      });
    }
  });

  // Contracts endpoints
  app.get("/api/contracts", requireAuth, async (req, res) => {
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
      console.error("Get contracts error:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.get("/api/contracts/:id", requireAuth, async (req, res) => {
    try {
      const contract = await storage.getContract(parseInt(req.params.id));
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      console.error("Get contract error:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  app.post("/api/contracts", requireManagerOrAbove, async (req, res) => {
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
      console.error("Create contract error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create contract" 
      });
    }
  });

  // Update contract
  app.put("/api/contracts/:id", requireManagerOrAbove, async (req, res) => {
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
      console.error("Update contract error:", error);
      res.status(500).json({ message: "Failed to update contract" });
    }
  });

  // Delete SAF
  app.delete("/api/service-authorization-forms/:id", requireManagerOrAbove, async (req, res) => {
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
      console.error("Delete SAF error:", error);
      res.status(500).json({ message: "Failed to delete Service Authorization Form" });
    }
  });

  // ========================================
  // CERTIFICATES OF COMPLIANCE (COC) ENDPOINTS
  // ========================================

  // Get all COCs
  app.get("/api/certificates-of-compliance", requireAuth, async (req, res) => {
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
      console.error("Get COCs error:", error);
      res.status(500).json({ message: "Failed to fetch Certificates of Compliance" });
    }
  });

  // Create COC
  app.post("/api/certificates-of-compliance", requireManagerOrAbove, async (req, res) => {
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
      console.error("Create COC error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create Certificate of Compliance" 
      });
    }
  });

  // Delete COC
  app.delete("/api/certificates-of-compliance/:id", requireManagerOrAbove, async (req, res) => {
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
      console.error("Delete COC error:", error);
      res.status(500).json({ message: "Failed to delete Certificate of Compliance" });
    }
  });

  // ========================================
  // SERVICE SCOPES ENDPOINTS
  // ========================================

  // Get all service scopes with filtering support
  app.get("/api/service-scopes", requireAuth, async (req, res) => {
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
      console.error("Get service scopes error:", error);
      res.status(500).json({ message: "Failed to fetch service scopes" });
    }
  });

  // Advanced service scope search with filters
  app.get("/api/service-scopes/search", requireAuth, async (req, res) => {
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
      console.error("Service scope search error:", error);
      res.status(500).json({ message: "Failed to search service scopes" });
    }
  });

  // Dynamic Service Scope Variable Endpoints
  
  // Get variable definitions for dynamic filtering
  app.get("/api/service-scopes/variables/definitions", requireAuth, async (req, res) => {
    try {
      const definitions = await db.execute(sql`
        SELECT 
          variable_name as name,
          variable_type as type,
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
      console.error('Error fetching variable definitions:', error);
      res.status(500).json({ error: 'Failed to fetch variable definitions' });
    }
  });

  // Dynamic search endpoint that can handle any scope variable filters
  app.get("/api/service-scopes/dynamic", requireAuth, async (req, res) => {
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
      console.error('Error in dynamic search:', error);
      res.status(500).json({ error: 'Failed to search service scopes' });
    }
  });

  // Add a new scope variable to an existing scope
  app.post("/api/service-scopes/:scopeId/variables", requireManagerOrAbove, async (req, res) => {
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
      console.error('Error adding scope variable:', error);
      res.status(500).json({ error: 'Failed to add scope variable' });
    }
  });

  // Get statistics about variable usage
  app.get("/api/service-scopes/variables/stats", requireAuth, async (req, res) => {
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
      console.error('Error fetching variable stats:', error);
      res.status(500).json({ error: 'Failed to fetch variable statistics' });
    }
  });

  // Discover new variables from scope definitions
  app.get("/api/service-scopes/variables/discover", requireManagerOrAbove, async (req, res) => {
    try {
      const discovered = await db.execute(sql`SELECT * FROM auto_discover_variables()`);
      
      res.json({
        newVariables: discovered.rows,
        message: `Found ${discovered.rows.length} potential new variables`
      });
    } catch (error) {
      console.error('Error discovering variables:', error);
      res.status(500).json({ error: 'Failed to discover variables' });
    }
  });

  // Get service scope by ID
  app.get("/api/service-scopes/:id", requireAuth, async (req, res) => {
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
      console.error("Get service scope error:", error);
      res.status(500).json({ message: "Failed to fetch service scope" });
    }
  });

  
  // Get service categories
  app.get("/api/services/categories", requireAuth, async (req, res) => {
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
      console.error("Get service categories error:", error);
      res.status(500).json({ message: "Failed to fetch service categories" });
    }
  });


// Create service scope for a contract
  app.post("/api/contracts/:contractId/service-scopes", requireManagerOrAbove, async (req, res) => {
    try {
      const contractId = parseInt(req.params.contractId);
      const { serviceId, description, deliverables, monthlyValue, startDate, endDate, status } = req.body;

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
    } catch (error) {
      console.error("Create service scope error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create service scope" 
      });
    }
  });

  // Update service scope
  app.put("/api/contracts/:contractId/service-scopes/:id", requireManagerOrAbove, async (req, res) => {
    try {
      const contractId = parseInt(req.params.contractId);
      const id = parseInt(req.params.id);
      const { serviceId, description, deliverables, monthlyValue, startDate, endDate, status } = req.body;

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
    } catch (error) {
      console.error("Update service scope error:", error);
      res.status(500).json({ message: "Failed to update service scope" });
    }
  });

  // Delete service scope
  app.delete("/api/contracts/:contractId/service-scopes/:id", requireManagerOrAbove, async (req, res) => {
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
      console.error("Delete service scope error:", error);
      res.status(500).json({ message: "Failed to delete service scope" });
    }
  });

  // ========================================
  // INDIVIDUAL LICENSE ENDPOINTS 
  // ========================================

  // Get all individual licenses
  app.get("/api/individual-licenses", requireAuth, async (req, res) => {
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
      console.error("Get individual licenses error:", error);
      res.status(500).json({ message: "Failed to fetch individual licenses" });
    }
  });

  // Create individual license
  app.post("/api/individual-licenses", requireManagerOrAbove, async (req, res) => {
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
      console.error("Create individual license error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create individual license" 
      });
    }
  });

  // ========================================
  // GLOBAL SEARCH ENDPOINTS
  // ========================================

  // Execute search
  app.post("/api/search/execute", requireAuth, async (req, res) => {
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
      console.error("Search execute error:", error);
      res.status(500).json({ message: "Failed to execute search" });
    }
  });

  // Get search history
  app.get("/api/search/history", requireAuth, async (req, res) => {
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
      console.error("Get search history error:", error);
      res.status(500).json({ message: "Failed to fetch search history" });
    }
  });

  // Get saved searches
  app.get("/api/search/saved", requireAuth, async (req, res) => {
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
      console.error("Get saved searches error:", error);
      res.status(500).json({ message: "Failed to fetch saved searches" });
    }
  });

  // Save a search
  app.post("/api/search/save", requireAuth, async (req, res) => {
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
      console.error("Save search error:", error);
      res.status(500).json({ message: "Failed to save search" });
    }
  });

  // Log search activity (for analytics)
  app.post("/api/search/log", requireAuth, async (req, res) => {
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
      console.error("Log search error:", error);
      res.status(500).json({ message: "Failed to log search" });
    }
  });

  // Get user's accessible pages based on role
  app.get("/api/user/accessible-pages", requireAuth, async (req, res) => {
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
      console.error("Get accessible pages error:", error);
      res.status(500).json({ message: "Failed to fetch accessible pages" });
    }
  });

  // Get page permissions (admin only)
  app.get("/api/page-permissions", requireAdmin, async (req, res) => {
    try {
      const permissions = await db
        .select()
        .from(pagePermissions)
        .orderBy(pagePermissions.category, pagePermissions.sortOrder);

      res.json(permissions);
    } catch (error) {
      console.error("Get page permissions error:", error);
      res.status(500).json({ message: "Failed to fetch page permissions" });
    }
  });

  // Reorder page permissions (admin only) - MUST come before the :id route
  app.put("/api/page-permissions/reorder", requireAdmin, async (req, res) => {
    try {
      const { items } = req.body;
      
      console.log("Reorder request received:", JSON.stringify(items, null, 2));
      
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: "Items must be an array" });
      }

      // Start a transaction to ensure all updates succeed or fail together
      await db.transaction(async (tx) => {
        for (const item of items) {
          console.log("Processing item:", item);
          
          if (!item.id || typeof item.sortOrder !== 'number') {
            throw new Error("Each item must have id and sortOrder");
          }

          // Ensure proper types
          const updateData: any = {
            sortOrder: parseInt(item.sortOrder),
            updatedAt: new Date()
          };
          
          // Only update isActive if it's explicitly provided
          if (item.isActive !== undefined) {
            updateData.isActive = Boolean(item.isActive);
          }
          
          // Update category if it's provided (for cross-category moves)
          if (item.category !== undefined) {
            updateData.category = String(item.category);
          }

          console.log("Update data:", updateData);
          
          await tx
            .update(pagePermissions)
            .set(updateData)
            .where(eq(pagePermissions.id, parseInt(item.id)));
        }
      });

      res.json({ message: "Navigation order updated successfully" });
    } catch (error) {
      console.error("Reorder page permissions error:", error);
      res.status(500).json({ message: "Failed to update navigation order" });
    }
  });

  // Update page permission (admin only) - MUST come after the /reorder route
  app.put("/api/page-permissions/:id", requireAdmin, async (req, res) => {
    try {
      const permissionId = parseInt(req.params.id);
      const { adminAccess, managerAccess, engineerAccess, userAccess, isActive } = req.body;

      const [updatedPermission] = await db
        .update(pagePermissions)
        .set({
          adminAccess,
          managerAccess,
          engineerAccess,
          userAccess,
          isActive,
          updatedAt: new Date()
        })
        .where(eq(pagePermissions.id, permissionId))
        .returning();

      if (!updatedPermission) {
        return res.status(404).json({ message: "Permission not found" });
      }

      res.json(updatedPermission);
    } catch (error) {
      console.error("Update page permission error:", error);
      res.status(500).json({ message: "Failed to update page permission" });
    }
  });

  // ========================================
  // USER SETTINGS ENDPOINTS
  // ========================================

  // Get user settings
  app.get("/api/user/settings", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const [userSettingsData] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      if (!userSettingsData) {
        // Return default settings if none exist
        const defaultSettings = {
          userId,
          theme: 'light',
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            push: true,
            contractReminders: true,
            systemAlerts: true
          },
          dashboard: {
            layout: 'default',
            widgets: []
          }
        };
        res.json(defaultSettings);
      } else {
        res.json(userSettingsData);
      }
    } catch (error) {
      console.error("Get user settings error:", error);
      res.status(500).json({ message: "Failed to fetch user settings" });
    }
  });

  // Update user settings
  app.put("/api/user/settings", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const settingsData = req.body;

      // Check if settings exist
      const [existingSettings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      let updatedSettings;
      if (existingSettings) {
        [updatedSettings] = await db
          .update(userSettings)
          .set({ ...settingsData, updatedAt: new Date() })
          .where(eq(userSettings.userId, userId))
          .returning();
      } else {
        [updatedSettings] = await db
          .insert(userSettings)
          .values({ userId, ...settingsData })
          .returning();
      }

      res.json(updatedSettings);
    } catch (error) {
      console.error("Update user settings error:", error);
      res.status(500).json({ message: "Failed to update user settings" });
    }
  });

  // ========================================
  // COMPANY SETTINGS ENDPOINTS
  // ========================================

  // Get company settings (admin only)
  app.get("/api/company/settings", requireAuth, async (req, res) => {
    try {
      const [companySettingsData] = await db
        .select()
        .from(companySettings)
        .limit(1);

      if (!companySettingsData) {
        // Return default company settings
        const defaultSettings = {
          companyName: 'MSSP Client Manager',
          companyLogo: null,
          businessAddress: null,
          businessPhone: null,
          businessEmail: null,
          businessWebsite: null,
          fiscalYearStart: 'january',
          currency: 'USD',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          emailSettings: {
            smtpHost: null,
            smtpPort: 587,
            smtpSecure: true,
            smtpUser: null,
            smtpPassword: null
          }
        };
        res.json(defaultSettings);
      } else {
        res.json(companySettingsData);
      }
    } catch (error) {
      console.error("Get company settings error:", error);
      res.status(500).json({ message: "Failed to fetch company settings" });
    }
  });

  // Create multer instance specifically for logo uploads (images only)
  const logoUpload = multer({
    storage: multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const filename = `logo-${timestamp}-${random}${extension}`;
        cb(null, filename);
      }
    }),
    fileFilter: (req, file, cb) => {
      // Only allow image files for logos
      const allowedImageTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/svg+xml',
        'image/webp'
      ];
      
      if (allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files (JPEG, PNG, GIF, SVG, WebP) are allowed for logos'));
      }
    },
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB limit for logos
      files: 1
    }
  });

  // Update company settings (admin only)
  app.put("/api/company/settings", requireAdmin, logoUpload.single('logo'), async (req, res) => {
    try {
      const settingsData: any = {};
      
      // Handle file upload if present
      if (req.file) {
        // Create the logo URL from the uploaded file
        const logoUrl = `/uploads/${req.file.filename}`;
        settingsData.logoUrl = logoUrl;
        console.log('Logo uploaded successfully:', logoUrl);
      }
      
      // Handle form data fields
      if (req.body.companyName) {
        settingsData.companyName = req.body.companyName;
        console.log('Company name updated to:', req.body.companyName);
      }
      
      // Handle other settings fields if present
      Object.keys(req.body).forEach(key => {
        if (key !== 'companyName' && req.body[key] !== undefined) {
          // Convert string values to appropriate types
          if (key.includes('Enabled') || key.includes('Required') || key.includes('Verification')) {
            settingsData[key] = req.body[key] === 'true' || req.body[key] === true;
          } else if (key.includes('Timeout') || key.includes('Attempts') || key.includes('Days') || key.includes('Limit')) {
            settingsData[key] = parseInt(req.body[key]) || 0;
          } else {
            settingsData[key] = req.body[key];
          }
        }
      });

      // Ensure we have something to update
      if (Object.keys(settingsData).length === 0) {
        return res.status(400).json({ 
          message: "No valid settings provided to update",
          success: false 
        });
      }

      // Check if settings exist
      const [existingSettings] = await db
        .select()
        .from(companySettings)
        .limit(1);

      // Safely handle updatedBy field - convert to integer if it's a UUID/string
      let updatedById: number | null = null;
      if (req.user?.id) {
        const userId = req.user.id;
        // Check if it's already a number
        if (typeof userId === 'number') {
          updatedById = userId;
        } else if (typeof userId === 'string') {
          // Try to parse as integer, if it fails, look up the user by UUID/other identifier
          const parsedId = parseInt(userId);
          if (!isNaN(parsedId)) {
            updatedById = parsedId;
          } else {
            // If it's a UUID or other string, try to find the user by that identifier
            console.warn('User ID is not an integer, attempting to resolve:', userId);
            // For now, set to null to avoid the error
            updatedById = null;
          }
        }
      }

      let updatedSettings;
      if (existingSettings) {
        [updatedSettings] = await db
          .update(companySettings)
          .set({ 
            ...settingsData, 
            updatedAt: new Date(),
            updatedBy: updatedById
          })
          .where(eq(companySettings.id, existingSettings.id))
          .returning();
      } else {
        [updatedSettings] = await db
          .insert(companySettings)
          .values({
            companyName: settingsData.companyName || 'MSSP Client Manager',
            updatedBy: updatedById,
            ...settingsData
          })
          .returning();
      }

      console.log('Company settings updated successfully:', updatedSettings);
      res.json({ 
        success: true,
        message: "Company settings updated successfully",
        settings: updatedSettings 
      });
    } catch (error) {
      console.error("Update company settings error:", error);
      
      // Handle multer errors
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            message: "Logo file is too large. Please select an image smaller than 2MB.",
            success: false 
          });
        }
        return res.status(400).json({ 
          message: error.message,
          success: false 
        });
      }
      
      // Handle file filter errors
      if (error.message && error.message.includes('image files')) {
        return res.status(400).json({ 
          message: error.message,
          success: false 
        });
      }

      // Handle specific PostgreSQL errors
      if (error.code === '22P02') {
        return res.status(400).json({ 
          message: "Invalid data format in request. Please refresh the page and try again.",
          success: false 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to update company settings",
        success: false 
      });
    }
  });

  // Test LDAP connection (admin only)
  app.post("/api/company/settings/ldap/test", requireAdmin, async (req, res) => {
    try {
      const { ldapUrl, ldapBindDn, ldapBindPassword, ldapSearchBase } = req.body;

      if (!ldapUrl || !ldapSearchBase) {
        return res.status(400).json({
          success: false,
          message: "LDAP URL and Search Base are required for testing"
        });
      }

      console.log("=== LDAP CONNECTION TEST ===");
      console.log("LDAP URL:", ldapUrl);
      console.log("Search Base:", ldapSearchBase);
      console.log("Bind DN:", ldapBindDn || 'Anonymous');

      try {
        // Import the LDAP library
        const ldapjs = require('ldapjs');
        
        const client = ldapjs.createClient({
          url: ldapUrl,
          timeout: 10000,
          connectTimeout: 5000,
          tlsOptions: {
            rejectUnauthorized: false
          }
        });

        // Wrap LDAP operations in promises
        const bindAsync = (client: any, dn?: string, password?: string) => {
          return new Promise((resolve, reject) => {
            client.bind(dn || '', password || '', (err: any) => {
              if (err) reject(err);
              else resolve(true);
            });
          });
        };

        const searchAsync = (client: any, base: string, options: any) => {
          return new Promise((resolve, reject) => {
            client.search(base, options, (err: any, searchRes: any) => {
              if (err) return reject(err);
              
              const entries: any[] = [];
              searchRes.on('searchEntry', (entry: any) => {
                entries.push(entry.pojo);
              });
              
              searchRes.on('end', (result: any) => {
                resolve({ entries, status: result.status });
              });
              
              searchRes.on('error', (err: any) => {
                reject(err);
              });
            });
          });
        };

        // Test binding
        const startTime = Date.now();
        await bindAsync(client, ldapBindDn, ldapBindPassword);
        console.log("LDAP bind successful");

        // Test search
        const searchOptions = {
          scope: 'sub',
          filter: '(objectClass=*)',
          sizeLimit: 1,
          timeLimit: 10
        };

        const searchResult = await searchAsync(client, ldapSearchBase, searchOptions) as any;
        const responseTime = Date.now() - startTime;
        
        console.log("LDAP search successful, entries found:", searchResult.entries.length);
        console.log("Response time:", responseTime, "ms");

        client.unbind();

        res.json({
          success: true,
          message: `LDAP connection successful! Found ${searchResult.entries.length} entries in search base.`,
          data: {
            responseTime: `${responseTime}ms`,
            entriesFound: searchResult.entries.length,
            searchBase: ldapSearchBase,
            status: 'Connected'
          }
        });

      } catch (ldapError: any) {
        console.error("LDAP operation failed:", ldapError);
        
        // If ldapjs is not available or fails, provide a basic connectivity test
        if (ldapError.code === 'MODULE_NOT_FOUND' || ldapError.message?.includes('cannot find module')) {
          console.log("LDAP package not available, performing basic connectivity test");
          
          // Basic URL validation
          const urlPattern = /^ldaps?:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/;
          if (!urlPattern.test(ldapUrl)) {
            return res.json({
              success: false,
              message: "Invalid LDAP URL format. Expected format: ldap://hostname:port or ldaps://hostname:port"
            });
          }

          // Extract hostname and port for basic connectivity test
          const url = new URL(ldapUrl);
          const hostname = url.hostname;
          const port = url.port || (url.protocol === 'ldaps:' ? '636' : '389');

          // Basic connectivity test using net module
          const net = require('net');
          const socket = new net.Socket();
          const timeout = 5000;

          return new Promise((resolve) => {
            const timer = setTimeout(() => {
              socket.destroy();
              res.json({
                success: false,
                message: `Connection timeout: Unable to connect to ${hostname}:${port} within ${timeout}ms`,
                data: {
                  hostname,
                  port,
                  timeout: `${timeout}ms`,
                  status: 'Timeout'
                }
              });
            }, timeout);

            socket.on('connect', () => {
              clearTimeout(timer);
              socket.destroy();
              res.json({
                success: true,
                message: `Basic connectivity test successful! Can reach LDAP server at ${hostname}:${port}`,
                data: {
                  hostname,
                  port,
                  status: 'Reachable',
                  note: 'Basic connectivity only - LDAP protocol not tested'
                }
              });
            });

            socket.on('error', (err: any) => {
              clearTimeout(timer);
              res.json({
                success: false,
                message: `Connection failed: ${err.message}`,
                data: {
                  hostname,
                  port,
                  error: err.message,
                  status: 'Connection Failed'
                }
              });
            });

            socket.connect(parseInt(port), hostname);
          });
        }
        
        res.json({
          success: false,
          message: `LDAP connection failed: ${ldapError.message || 'Unknown error'}`,
          data: {
            error: ldapError.message,
            code: ldapError.code || 'UNKNOWN'
          }
        });
      }

    } catch (error: any) {
      console.error("LDAP test error:", error);
      res.status(500).json({
        success: false,
        message: `LDAP test failed: ${error.message || 'Internal server error'}`
      });
    }
  });

  // ========================================
  // DASHBOARD STATISTICS ENDPOINTS
  // ========================================

  // Get dashboard statistics
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const { timeRange = 'ytd' } = req.query;
      
      // Calculate date range based on timeRange parameter
      let startDate = new Date();
      const endDate = new Date();
      
      switch (timeRange) {
        case 'mtd':
          startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          break;
        case 'qtd':
          const quarter = Math.floor(endDate.getMonth() / 3);
          startDate = new Date(endDate.getFullYear(), quarter * 3, 1);
          break;
        case 'ytd':
        default:
          startDate = new Date(endDate.getFullYear(), 0, 1);
          break;
      }

      // Get basic statistics
      const [clientCount] = await db
        .select({ count: count() })
        .from(clients);

      const [contractCount] = await db
        .select({ count: count() })
        .from(contracts);

      const [serviceCount] = await db
        .select({ count: count() })
        .from(services);

      // Get contract value statistics
      const [contractStats] = await db
        .select({
          totalValue: sql<number>`COALESCE(SUM(CAST(${contracts.totalValue} AS DECIMAL)), 0)`,
          activeContracts: sql<number>`COUNT(CASE WHEN ${contracts.status} = 'active' THEN 1 END)`
        })
        .from(contracts)
        .where(
          and(
            gte(contracts.createdAt, startDate),
            lte(contracts.createdAt, endDate)
          )
        );

      // Get recent activity (simplified)
      const recentClients = await db
        .select({
          id: clients.id,
          name: clients.name,
          createdAt: clients.createdAt
        })
        .from(clients)
        .orderBy(desc(clients.createdAt))
        .limit(5);

      const recentContracts = await db
        .select({
          id: contracts.id,
          name: contracts.name,
          clientName: clients.name,
          createdAt: contracts.createdAt
        })
        .from(contracts)
        .leftJoin(clients, eq(contracts.clientId, clients.id))
        .orderBy(desc(contracts.createdAt))
        .limit(5);

      const stats = {
        overview: {
          totalClients: clientCount.count,
          totalContracts: contractCount.count,
          totalServices: serviceCount.count,
          activeContracts: contractStats?.activeContracts || 0,
          totalRevenue: contractStats?.totalValue || 0
        },
        timeRange,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        recentActivity: {
          clients: recentClients,
          contracts: recentContracts
        }
      };

      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Get dashboard card data
  app.get("/api/dashboard/card-data", requireAuth, async (req, res) => {
    try {
      const { 
        table, 
        aggregation = 'count',
        ...filters 
      } = req.query;

      if (!table || typeof table !== 'string') {
        return res.status(400).json({ error: 'Table parameter is required' });
      }

      // Map of table names to actual Drizzle schema tables
      const TABLE_MAP = {
        clients,
        contracts,
        services,
        license_pools: licensePools,
        hardware_assets: hardwareAssets,
        service_scopes: serviceScopes,
        // Add more tables as needed
        tasks: null, // Placeholder for future tasks table
        users: null, // Placeholder for future users table
        service_authorization_forms: null, // Placeholder
        certificates_of_compliance: null, // Placeholder
        technical_proposals: null, // Placeholder
        financial_proposals: null, // Placeholder
      };

      const tableSchema = TABLE_MAP[table as keyof typeof TABLE_MAP];
      
      if (!tableSchema) {
        // For placeholder tables, return mock data
        const mockValues: Record<string, number> = {
          tasks: Math.floor(Math.random() * 50) + 10,
          users: Math.floor(Math.random() * 20) + 5,
          service_authorization_forms: Math.floor(Math.random() * 15) + 3,
          certificates_of_compliance: Math.floor(Math.random() * 25) + 8,
          technical_proposals: Math.floor(Math.random() * 12) + 2,
          financial_proposals: Math.floor(Math.random() * 8) + 1,
        };

        let baseValue = mockValues[table] || Math.floor(Math.random() * 100) + 1;

        // Adjust for aggregation type
        if (aggregation === 'sum' || aggregation === 'average') {
          baseValue *= 1000; // Make it larger for financial values
        }

        return res.json({
          value: baseValue,
          metadata: {
            trend: Math.floor(Math.random() * 40) - 20, // Random trend between -20 and +20
            previousPeriod: baseValue - Math.floor(Math.random() * 20) + 10
          },
          timestamp: new Date().toISOString()
        });
      }

      // Build filters
      const whereConditions = [];
      Object.entries(filters).forEach(([key, value]) => {
        if (key.startsWith('filter_') && value) {
          const fieldName = key.replace('filter_', '');
          if (fieldName in tableSchema) {
            const field = tableSchema[fieldName as keyof typeof tableSchema];
            whereConditions.push(eq(field, value as string));
          }
        }
      });

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      let result;
      let metadata: Record<string, any> = {};

      switch (aggregation) {
        case 'count':
          const countResult = await db
            .select({ count: count() })
            .from(tableSchema)
            .where(whereClause);
          result = countResult[0]?.count || 0;
          break;

        case 'sum':
          // For sum, we need to determine which field to sum
          // For contracts, sum total_value
          if (table === 'contracts') {
            const sumResult = await db
              .select({ sum: sum(contracts.totalValue) })
              .from(tableSchema)
              .where(whereClause);
            result = parseFloat(sumResult[0]?.sum || '0');
          } else {
            result = 0;
          }
          break;

        case 'average':
          if (table === 'contracts') {
            const avgResult = await db
              .select({ avg: avg(contracts.totalValue) })
              .from(tableSchema)
              .where(whereClause);
            result = parseFloat(avgResult[0]?.avg || '0');
          } else {
            result = 0;
          }
          break;

        case 'max':
          if (table === 'contracts') {
            const maxResult = await db
              .select({ max: max(contracts.totalValue) })
              .from(tableSchema)
              .where(whereClause);
            result = parseFloat(maxResult[0]?.max || '0');
          } else {
            result = 0;
          }
          break;

        case 'min':
          if (table === 'contracts') {
            const minResult = await db
              .select({ min: min(contracts.totalValue) })
              .from(tableSchema)
              .where(whereClause);
            result = parseFloat(minResult[0]?.min || '0');
          } else {
            result = 0;
          }
          break;

        default:
          result = 0;
      }

      // Add metadata based on table type
      if (table === 'contracts') {
        const statusCounts = await db
          .select({ 
            status: contracts.status,
            count: count() 
          })
          .from(contracts)
          .groupBy(contracts.status);
        
        metadata.statusBreakdown = statusCounts.reduce((acc, { status, count }) => {
          acc[status] = count;
          return acc;
        }, {} as Record<string, number>);
      }

      if (table === 'clients') {
        const recentClients = await db
          .select({ count: count() })
          .from(clients)
          .where(gte(clients.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))); // Last 30 days
        
        metadata.recentlyAdded = recentClients[0]?.count || 0;
      }

      if (table === 'license_pools') {
        const utilizationData = await db
          .select({
            totalLicenses: sum(licensePools.totalLicenses),
            availableLicenses: sum(licensePools.availableLicenses)
          })
          .from(licensePools);
        
        const data = utilizationData[0];
        if (data?.totalLicenses && data?.availableLicenses) {
          const usedLicenses = data.totalLicenses - data.availableLicenses;
          metadata.utilization = ((usedLicenses / data.totalLicenses) * 100).toFixed(1);
          metadata.totalLicenses = data.totalLicenses;
          metadata.availableLicenses = data.availableLicenses;
          metadata.usedLicenses = usedLicenses;
        }
      }

      res.json({
        value: result,
        metadata,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Dashboard card data error:', error);
      res.status(500).json({ error: 'Failed to fetch card data' });
    }
  });

  // ========================================
  // DASHBOARDS ENDPOINTS
  // ========================================
  
  // Get all dashboards for authenticated user
  app.get("/api/dashboards", requireAuth, async (req, res) => {
    try {
      const userDashboardsList = await db.select()
        .from(userDashboards)
        .where(eq(userDashboards.userId, req.user.id));
      res.json(userDashboardsList);
    } catch (error) {
      console.error("Get dashboards error:", error);
      res.status(500).json({ message: "Failed to fetch dashboards" });
    }
  });

    // Get single dashboard with widgets
  app.get("/api/dashboards/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log("Getting dashboard with ID:", id, "for user:", req.user.id);
      
      // Get dashboard
      const dashboards = await db.select()
        .from(userDashboards)
        .where(eq(userDashboards.id, id));
      
      console.log("Found dashboards:", dashboards.length);
      if (dashboards.length > 0) {
        console.log("First dashboard:", JSON.stringify(dashboards[0], null, 2));
      }
      const dashboard = dashboards[0];
      
      if (!dashboard) {
        console.log("Dashboard not found");
        return res.status(404).json({ message: "Dashboard not found" });
      }
      
      console.log("Dashboard found:", dashboard.name, "owned by:", dashboard.userId);
      
      // Check if user owns this dashboard
      if (dashboard.userId !== req.user.id) {
        console.log("Access denied - user", req.user.id, "trying to access dashboard owned by", dashboard.userId);
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get widgets for this dashboard
      const widgets = await db
        .select({
          id: dashboardWidgets.id,
          name: dashboardWidgets.name,
          title: dashboardWidgets.name, // Map name to title for frontend compatibility
          widgetType: dashboardWidgets.widgetType,
          config: dashboardWidgets.config,
          dataSourceId: dashboardWidgets.dataSourceId,
          refreshInterval: dashboardWidgets.refreshInterval,
          isActive: dashboardWidgets.isActive,
          createdAt: dashboardWidgets.createdAt,
          updatedAt: dashboardWidgets.updatedAt,
          position: dashboardWidgetAssignments.position,
          dashboardId: sql<number>`${id}` // Add dashboardId for compatibility
        })
        .from(dashboardWidgets)
        .innerJoin(dashboardWidgetAssignments, eq(dashboardWidgets.id, dashboardWidgetAssignments.widgetId))
        .where(eq(dashboardWidgetAssignments.dashboardId, id))
        .orderBy(dashboardWidgets.createdAt);
      
      console.log(`Found ${widgets.length} widgets for dashboard ${id}`);
      
      res.json({
        ...dashboard,
        widgets
      });
    } catch (error) {
      console.error("Get dashboard error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard" });
    }
  });

  // Create new dashboard
  app.post("/api/dashboards", requireAuth, async (req, res) => {
    try {
      // Validate input using schema
      const validatedData = insertUserDashboardSchema.parse({
        name: req.body.name,
        userId: req.user.id,
        description: req.body.description || null,
        layout: req.body.layout || {},
        isDefault: req.body.isDefault || false,
        isPublic: req.body.isPublic || false
      });
      
      const [newDashboard] = await db.insert(userDashboards)
        .values(validatedData)
        .returning();
      
      res.status(201).json(newDashboard);
    } catch (error) {
      console.error("Create dashboard error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create dashboard" });
    }
  });

  // Update dashboard
  app.put("/api/dashboards/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if dashboard exists and user owns it
      const [existingDashboard] = await db.select()
        .from(userDashboards)
        .where(eq(userDashboards.id, id));
      
      if (!existingDashboard) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      
      if (existingDashboard.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updateData = {
        name: req.body.name,
        description: req.body.description,
        layout: req.body.layout,
        isDefault: req.body.isDefault,
        isPublic: req.body.isPublic
      };
      
      const [updatedDashboard] = await db.update(userDashboards)
        .set(updateData)
        .where(eq(userDashboards.id, id))
        .returning();
      
      res.json(updatedDashboard);
    } catch (error) {
      console.error("Update dashboard error:", error);
      res.status(500).json({ message: "Failed to update dashboard" });
    }
  });

  // Delete dashboard
  app.delete("/api/dashboards/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if dashboard exists and user owns it
      const [existingDashboard] = await db.select()
        .from(userDashboards)
        .where(eq(userDashboards.id, id));
      
      if (!existingDashboard) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      
      if (existingDashboard.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete all widget assignments first (cascade delete)
      await db.delete(dashboardWidgetAssignments)
        .where(eq(dashboardWidgetAssignments.dashboardId, id));
      
      // Delete dashboard
      await db.delete(userDashboards)
        .where(eq(userDashboards.id, id));
      
      res.json({ message: "Dashboard deleted successfully" });
    } catch (error) {
      console.error("Delete dashboard error:", error);
      res.status(500).json({ message: "Failed to delete dashboard" });
    }
  });

  // ========================================
  // WIDGETS ENDPOINTS (for dashboard widgets)
  // ========================================
  
  // Get widgets for a specific dashboard
  app.get("/api/dashboards/:dashboardId/widgets", requireAuth, async (req, res) => {
    try {
      const dashboardId = parseInt(req.params.dashboardId);
      
      // Check if dashboard exists and user owns it
      const [dashboard] = await db.select()
        .from(userDashboards)
        .where(eq(userDashboards.id, dashboardId));
      
      if (!dashboard) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      
      if (dashboard.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get widgets assigned to this dashboard with their positions
      const dashboardWidgetsList = await db
        .select({
          id: dashboardWidgets.id,
          name: dashboardWidgets.name,
          title: dashboardWidgets.name, // Map name to title for frontend compatibility
          widgetType: dashboardWidgets.widgetType,
          config: dashboardWidgets.config,
          dataSourceId: dashboardWidgets.dataSourceId,
          refreshInterval: dashboardWidgets.refreshInterval,
          isActive: dashboardWidgets.isActive,
          createdAt: dashboardWidgets.createdAt,
          updatedAt: dashboardWidgets.updatedAt,
          position: dashboardWidgetAssignments.position,
          dashboardId: sql<number>`${dashboardId}` // Add dashboardId for compatibility
        })
        .from(dashboardWidgets)
        .innerJoin(dashboardWidgetAssignments, eq(dashboardWidgets.id, dashboardWidgetAssignments.widgetId))
        .where(eq(dashboardWidgetAssignments.dashboardId, dashboardId))
        .orderBy(dashboardWidgets.createdAt);
      
      console.log(`Found ${dashboardWidgetsList.length} widgets for dashboard ${dashboardId}`);
      res.json(dashboardWidgetsList);
    } catch (error) {
      console.error("Get dashboard widgets error:", error);
      res.status(500).json({ message: "Failed to fetch widgets" });
    }
  });

  // Create widget for dashboard
  app.post("/api/dashboards/:dashboardId/widgets", requireAuth, async (req, res) => {
    try {
      console.log("=== CREATE WIDGET REQUEST ===");
      console.log("Dashboard ID:", req.params.dashboardId);
      console.log("Request body:", req.body);
      console.log("User:", req.user?.email);
      
      const dashboardId = parseInt(req.params.dashboardId);
      const { name, widgetType, config, dataSourceId, refreshInterval, position } = req.body;
      
      console.log("Parsed values:", { name, widgetType, config, dataSourceId, refreshInterval, position });
      
      // Check if dashboard exists and user owns it
      const [dashboard] = await db.select()
        .from(userDashboards)
        .where(eq(userDashboards.id, dashboardId));
      
      if (!dashboard) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      
      if (dashboard.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Validate required fields
      if (!name || !widgetType || !config) {
        return res.status(400).json({ message: "Missing required fields: name, widgetType, config" });
      }
      
      // Create the widget
      const [newWidget] = await db.insert(dashboardWidgets)
        .values({
          name,
          widgetType,
          config,
          dataSourceId: dataSourceId || null,
          refreshInterval: refreshInterval || 300, // Default 5 minutes
          createdBy: req.user.id,
        })
        .returning();
      
      // Create widget assignment to dashboard with position
      const defaultPosition = position || { x: 0, y: 0, width: 4, height: 3 };
      await db.insert(dashboardWidgetAssignments)
        .values({
          dashboardId,
          widgetId: newWidget.id,
          position: defaultPosition,
        });
      
      // Return the created widget with assignment info
      const widgetWithAssignment = {
        ...newWidget,
        position: defaultPosition,
        dashboardId
      };
      
      console.log("Widget created successfully:", widgetWithAssignment);
      console.log("==========================");
      
      res.status(201).json(widgetWithAssignment);
    } catch (error) {
      console.error("=== CREATE WIDGET ERROR ===");
      console.error("Error details:", error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("===========================");
      res.status(500).json({ message: "Failed to create widget", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Update widget
  app.put("/api/widgets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`=== UPDATE WIDGET ${id} ===`);
      console.log("User:", req.user?.email, "ID:", req.user?.id);
      
      // Get widget and check ownership through dashboard assignment
      const [widget] = await db.select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.id, id));
      
      if (!widget) {
        return res.status(404).json({ message: "Widget not found" });
      }
      console.log("Widget found:", widget.name);
      
      // Get dashboard ownership through widget assignment
      const [assignment] = await db.select({
        dashboardId: dashboardWidgetAssignments.dashboardId
      })
        .from(dashboardWidgetAssignments)
        .where(eq(dashboardWidgetAssignments.widgetId, id));
      
      if (!assignment) {
        console.log("No assignment found for widget", id);
        return res.status(404).json({ message: "Widget assignment not found for widget " + id });
      }
      console.log("Assignment found, dashboard ID:", assignment.dashboardId);
      
      // Check dashboard ownership
      const [dashboard] = await db.select()
        .from(userDashboards)
        .where(eq(userDashboards.id, assignment.dashboardId));
      
      if (!dashboard) {
        console.log("Dashboard not found:", assignment.dashboardId);
        return res.status(404).json({ message: "Dashboard not found: " + assignment.dashboardId });
      }
      
                    console.log("Dashboard owner:", dashboard.userId, "Current user:", req.user.id);
      console.log("Type check - dashboard.userId:", typeof dashboard.userId, "req.user.id:", typeof req.user.id);
      console.log("Authorization check result:", dashboard.userId == req.user.id);
      
      if (dashboard.userId != req.user.id) {
        console.log("❌ Authorization failed - Access denied");
        return res.status(403).json({ message: "Access denied - user does not own dashboard" });
      }
      
      console.log("✅ Authorization passed - proceeding with update");
      
      const updateData: any = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.widgetType !== undefined) updateData.widgetType = req.body.widgetType;
      if (req.body.config !== undefined) updateData.config = req.body.config;
      if (req.body.dataSourceId !== undefined) updateData.dataSourceId = req.body.dataSourceId;
      if (req.body.refreshInterval !== undefined) updateData.refreshInterval = req.body.refreshInterval;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
      updateData.updatedAt = new Date();
      
      const [updatedWidget] = await db.update(dashboardWidgets)
        .set(updateData)
        .where(eq(dashboardWidgets.id, id))
        .returning();
      
      res.json(updatedWidget);
    } catch (error) {
      console.error("Update widget error:", error);
      res.status(500).json({ message: "Failed to update widget" });
    }
  });

  // Delete widget
  app.delete("/api/widgets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get widget and check ownership through dashboard
      const [widget] = await db.select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.id, id));
      
      if (!widget) {
        return res.status(404).json({ message: "Widget not found" });
      }
      
      // Get dashboard ownership through widget assignment
      const [assignment] = await db.select({
        dashboardId: dashboardWidgetAssignments.dashboardId
      })
        .from(dashboardWidgetAssignments)
        .where(eq(dashboardWidgetAssignments.widgetId, id));
      
      if (!assignment) {
        return res.status(404).json({ message: "Widget assignment not found" });
      }
      
      // Check dashboard ownership
      const [dashboard] = await db.select()
        .from(userDashboards)
        .where(eq(userDashboards.id, assignment.dashboardId));
      
      if (!dashboard || dashboard.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await db.delete(dashboardWidgets)
        .where(eq(dashboardWidgets.id, id));
      
      res.json({ message: "Widget deleted successfully" });
    } catch (error) {
      console.error("Delete widget error:", error);
      res.status(500).json({ message: "Failed to delete widget" });
    }
        });

  // ========================================
  // AUDIT ENDPOINTS
  // ========================================
  
  // Get audit logs
  app.get("/api/audit-logs", requireAdmin, async (req, res) => {
    try {
      const { dateRange = '7d', actionFilter = 'all', searchTerm = '' } = req.query;
      
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (dateRange) {
        case '1d':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }
      
      let query = db.select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        username: users.username,
        userEmail: users.email,
        action: auditLogs.action,
        resourceType: auditLogs.entityType,
        resourceId: auditLogs.entityId,
        resourceName: auditLogs.entityName,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        timestamp: auditLogs.timestamp,
        details: auditLogs.metadata,
        status: sql<'success' | 'failure'>`'success'` // Default to success since we don't have this field
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(
        and(
          gte(auditLogs.timestamp, startDate),
          actionFilter !== 'all' ? eq(auditLogs.action, actionFilter as string) : undefined,
          searchTerm ? 
            or(
              ilike(auditLogs.action, `%${searchTerm}%`),
              ilike(auditLogs.entityType, `%${searchTerm}%`),
              ilike(auditLogs.entityName, `%${searchTerm}%`),
              ilike(users.username, `%${searchTerm}%`),
              ilike(users.email, `%${searchTerm}%`)
            ) : undefined
        )
      )
      .orderBy(desc(auditLogs.timestamp))
      .limit(1000);
      
      const logs = await query;
      
      res.json(logs);
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });
  
  // Get security events
  app.get("/api/security-events", requireAdmin, async (req, res) => {
    try {
      const { dateRange = '7d', severityFilter = 'all', searchTerm = '' } = req.query;
      
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (dateRange) {
        case '1d':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }
      
      let query = db.select({
        id: securityEvents.id,
        eventType: securityEvents.eventType,
        severity: sql<'medium'>`'medium'`, // Default severity since field doesn't exist
        description: sql<string>`COALESCE(${securityEvents.failureReason}, ${securityEvents.eventType})`,
        ipAddress: securityEvents.ipAddress,
        userAgent: securityEvents.userAgent,
        timestamp: securityEvents.timestamp,
        userId: securityEvents.userId,
        resolved: securityEvents.success, // Map success to resolved
        metadata: securityEvents.metadata
      })
        .from(securityEvents)
        .where(
          and(
            gte(securityEvents.timestamp, startDate),
            searchTerm ? 
              or(
                ilike(securityEvents.eventType, `%${searchTerm}%`),
                ilike(securityEvents.failureReason, `%${searchTerm}%`),
                ilike(securityEvents.ipAddress, `%${searchTerm}%`)
              ) : undefined
          )
        )
        .orderBy(desc(securityEvents.timestamp))
        .limit(1000);
      
      const events = await query;
      
      res.json(events);
    } catch (error) {
      console.error("Get security events error:", error);
      res.status(500).json({ message: "Failed to fetch security events" });
    }
  });
  
  // Get data access logs
  app.get("/api/data-access-logs", requireAdmin, async (req, res) => {
    try {
      const { dateRange = '7d', searchTerm = '' } = req.query;
      
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (dateRange) {
        case '1d':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }
      
      let query = db.select({
        id: dataAccessLogs.id,
        userId: dataAccessLogs.userId,
        username: users.username,
        accessType: dataAccessLogs.accessType,
        resourceType: dataAccessLogs.entityType,
        resourceId: dataAccessLogs.entityId,
        ipAddress: dataAccessLogs.ipAddress,
        timestamp: dataAccessLogs.timestamp,
        success: sql<boolean>`true` // Default to true since field doesn't exist
      })
      .from(dataAccessLogs)
      .leftJoin(users, eq(dataAccessLogs.userId, users.id))
      .where(
        and(
          gte(dataAccessLogs.timestamp, startDate),
          searchTerm ? 
            or(
              ilike(dataAccessLogs.accessType, `%${searchTerm}%`),
              ilike(dataAccessLogs.entityType, `%${searchTerm}%`),
              ilike(users.username, `%${searchTerm}%`)
            ) : undefined
        )
      )
      .orderBy(desc(dataAccessLogs.timestamp))
      .limit(1000);
      
      const logs = await query;
      
      res.json(logs);
    } catch (error) {
      console.error("Get data access logs error:", error);
      res.status(500).json({ message: "Failed to fetch data access logs" });
    }
  });
  
  // Get change history
  app.get("/api/change-history", requireAdmin, async (req, res) => {
    try {
      const { dateRange = '7d', searchTerm = '' } = req.query;
      
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (dateRange) {
        case '1d':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }
      
      let query = db.select({
        id: changeHistory.id,
        userId: changeHistory.userId,
        username: users.username,
        resourceType: changeHistory.entityType,
        resourceId: changeHistory.entityId,
        action: changeHistory.action,
        oldValues: changeHistory.oldValue,
        newValues: changeHistory.newValue,
        timestamp: changeHistory.timestamp
      })
      .from(changeHistory)
      .leftJoin(users, eq(changeHistory.userId, users.id))
      .where(
        and(
          gte(changeHistory.timestamp, startDate),
          searchTerm ? 
            or(
              ilike(changeHistory.action, `%${searchTerm}%`),
              ilike(changeHistory.entityType, `%${searchTerm}%`),
              ilike(users.username, `%${searchTerm}%`)
            ) : undefined
        )
      )
      .orderBy(desc(changeHistory.timestamp))
      .limit(1000);
      
      const history = await query;
      
      res.json(history);
    } catch (error) {
      console.error("Get change history error:", error);
      res.status(500).json({ message: "Failed to fetch change history" });
    }
  });

  // Alternative audit endpoints for HistoryTimeline component
  app.get("/api/audit/logs", requireAuth, async (req, res) => {
    try {
      const { entityType, entityId } = req.query;
      
      let query = db.select({
        id: auditLogs.id,
        user_id: auditLogs.userId,
        user_name: users.username,
        user_role: users.role,
        session_id: auditLogs.sessionId,
        action: auditLogs.action,
        entity_type: auditLogs.entityType,
        entity_id: auditLogs.entityId,
        entity_name: auditLogs.entityName,
        description: auditLogs.description,
        ip_address: auditLogs.ipAddress,
        user_agent: auditLogs.userAgent,
        severity: auditLogs.severity,
        category: auditLogs.category,
        metadata: auditLogs.metadata,
        timestamp: auditLogs.timestamp
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id));

      // Apply filters
      if (entityType && entityId) {
        query = query.where(
          and(
            eq(auditLogs.entityType, entityType as string),
            eq(auditLogs.entityId, parseInt(entityId as string))
          )
        );
      } else if (entityType) {
        query = query.where(eq(auditLogs.entityType, entityType as string));
      }

      const logs = await query
        .orderBy(desc(auditLogs.timestamp))
        .limit(100);
      
      res.json(logs);
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.get("/api/audit/change-history", requireAuth, async (req, res) => {
    try {
      const { entityType, entityId } = req.query;
      
      let query = db.select({
        id: changeHistory.id,
        entity_type: changeHistory.entityType,
        entity_id: changeHistory.entityId,
        entity_name: changeHistory.entityName,
        user_id: changeHistory.userId,
        user_name: users.username,
        user_role: users.role,
        action: changeHistory.action,
        field_name: changeHistory.fieldName,
        old_value: changeHistory.oldValue,
        new_value: changeHistory.newValue,
        change_reason: changeHistory.changeReason,
        automatic_change: changeHistory.automaticChange,
        batch_id: changeHistory.batchId,
        rollback_data: changeHistory.rollbackData,
        ip_address: changeHistory.ipAddress,
        user_agent: changeHistory.userAgent,
        timestamp: changeHistory.timestamp
      })
      .from(changeHistory)
      .leftJoin(users, eq(changeHistory.userId, users.id));

      // Apply filters
      if (entityType && entityId) {
        query = query.where(
          and(
            eq(changeHistory.entityType, entityType as string),
            eq(changeHistory.entityId, parseInt(entityId as string))
          )
        );
      } else if (entityType) {
        query = query.where(eq(changeHistory.entityType, entityType as string));
      }

      const changes = await query
        .orderBy(desc(changeHistory.timestamp))
        .limit(100);
      
      res.json(changes);
    } catch (error) {
      console.error("Get change history error:", error);
      res.status(500).json({ message: "Failed to fetch change history" });
    }
  });

  app.get("/api/audit/security-events", requireAuth, async (req, res) => {
    try {
      const { entityType, entityId } = req.query;
      
      let query = db.select({
        id: securityEvents.id,
        user_id: securityEvents.userId,
        user_name: users.username,
        user_role: users.role,
        event_type: securityEvents.eventType,
        source: securityEvents.source,
        ip_address: securityEvents.ipAddress,
        user_agent: securityEvents.userAgent,
        location: securityEvents.location,
        success: securityEvents.success,
        failure_reason: securityEvents.failureReason,
        risk_score: securityEvents.riskScore,
        blocked: securityEvents.blocked,
        timestamp: securityEvents.timestamp
      })
      .from(securityEvents)
      .leftJoin(users, eq(securityEvents.userId, users.id));

      const events = await query
        .orderBy(desc(securityEvents.timestamp))
        .limit(100);
      
      res.json(events);
    } catch (error) {
      console.error("Get security events error:", error);
      res.status(500).json({ message: "Failed to fetch security events" });
    }
  });

  app.get("/api/audit/data-access", requireAuth, async (req, res) => {
    try {
      const { entityType, entityId } = req.query;
      
      let query = db.select({
        id: dataAccessLogs.id,
        user_id: dataAccessLogs.userId,
        user_name: users.username,
        user_role: users.role,
        entity_type: dataAccessLogs.entityType,
        entity_id: dataAccessLogs.entityId,
        entity_name: dataAccessLogs.entityName,
        access_type: dataAccessLogs.accessType,
        access_method: dataAccessLogs.accessMethod,
        data_scope: dataAccessLogs.dataScope,
        result_count: dataAccessLogs.resultCount,
        sensitive_data: dataAccessLogs.sensitiveData,
        purpose: dataAccessLogs.purpose,
        session_duration: dataAccessLogs.sessionDuration,
        timestamp: dataAccessLogs.timestamp
      })
      .from(dataAccessLogs)
      .leftJoin(users, eq(dataAccessLogs.userId, users.id));

      // Apply filters
      if (entityType && entityId) {
        query = query.where(
          and(
            eq(dataAccessLogs.entityType, entityType as string),
            eq(dataAccessLogs.entityId, parseInt(entityId as string))
          )
        );
      } else if (entityType) {
        query = query.where(eq(dataAccessLogs.entityType, entityType as string));
      }

      const logs = await query
        .orderBy(desc(dataAccessLogs.timestamp))
        .limit(100);
      
      res.json(logs);
    } catch (error) {
      console.error("Get data access logs error:", error);
      res.status(500).json({ message: "Failed to fetch data access logs" });
    }
  });

  // Rollback endpoint for change history
  app.post("/api/audit/rollback/:id", requireAdmin, async (req, res) => {
    try {
      const changeId = parseInt(req.params.id);
      
      // Get the change record
      const [change] = await db.select()
        .from(changeHistory)
        .where(eq(changeHistory.id, changeId))
        .limit(1);

      if (!change) {
        return res.status(404).json({ message: "Change record not found" });
      }

      if (!change.rollbackData) {
        return res.status(400).json({ message: "This change cannot be rolled back" });
      }

      // TODO: Implement actual rollback logic based on rollback_data
      // This would need to be implemented based on the specific rollback requirements
      
      res.json({ message: "Rollback functionality not yet implemented" });
  } catch (error) {
      console.error("Rollback error:", error);
      res.status(500).json({ message: "Failed to rollback change" });
  }
  });

  // ========================================
  // DOCUMENT ENDPOINTS
  // ========================================

  // Get all documents
  app.get("/api/documents", requireAuth, async (req, res) => {
    try {
      const { clientId, documentType } = req.query;
      
      let whereConditions: any[] = [eq(documents.isActive, true)];
      if (clientId) {
        whereConditions.push(eq(documents.clientId, parseInt(clientId as string)));
      }
      if (documentType && documentType !== 'all') {
        whereConditions.push(eq(documents.documentType, documentType as string));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const docs = await db
            .select({
          id: documents.id,
          name: documents.name,
          description: documents.description,
          documentType: documents.documentType,
          fileName: documents.fileName,
          filePath: documents.filePath,
          fileSize: documents.fileSize,
          mimeType: documents.mimeType,
          version: documents.version,
          isActive: documents.isActive,
          clientId: documents.clientId,
          contractId: documents.contractId,
          tags: documents.tags,
          expirationDate: documents.expirationDate,
          complianceType: documents.complianceType,
          uploadedBy: documents.uploadedBy,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
          clientName: clients.name,
          contractName: contracts.name
        })
        .from(documents)
        .leftJoin(clients, eq(documents.clientId, clients.id))
        .leftJoin(contracts, eq(documents.contractId, contracts.id))
        .where(whereClause)
        .orderBy(desc(documents.createdAt));

      res.json(docs);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Get document by ID
  app.get("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const [document] = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, id), eq(documents.isActive, true)))
        .limit(1);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.json(document);
    } catch (error) {
      console.error("Get document error:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  // Upload document (main document upload endpoint)
  app.post("/api/documents/upload", requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { name, documentType = 'general', clientId, contractId, description, tags } = req.body;
      
      const documentData = {
        name: name || req.file.originalname,
        description: description || null,
        documentType,
        fileName: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        version: 1,
        isActive: true,
        clientId: clientId ? parseInt(clientId) : null,
        contractId: contractId ? parseInt(contractId) : null,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : null,
        uploadedBy: req.user?.id || 1,
      };

      const [newDocument] = await db
        .insert(documents)
        .values(documentData)
        .returning();

      // Add audit logging for document creation
      try {
        const { AuditLogger } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        
        await auditLogger.logCreate(
          'document',
          newDocument.id,
          newDocument.name,
          {
            documentType: newDocument.documentType,
            fileName: newDocument.fileName,
            fileSize: newDocument.fileSize,
            clientId: newDocument.clientId,
            contractId: newDocument.contractId
          }
        );
        console.log('✅ Audit logging completed for document upload');
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for document upload:', auditError.message);
      }

      res.status(201).json({
        id: newDocument.id,
        fileName: newDocument.fileName,
        fileUrl: `/uploads/${newDocument.fileName}`,
        fileSize: newDocument.fileSize,
        message: "Document uploaded successfully"
      });
    } catch (error) {
      console.error("Document upload error:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Upload contract document
  app.post("/api/upload/contract-document", requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { name, description, clientId, contractId } = req.body;
      
      const documentData = {
        name: name || req.file.originalname,
        description: description || null,
        documentType: 'contract',
        fileName: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        version: 1,
        isActive: true,
        clientId: clientId ? parseInt(clientId) : null,
        contractId: contractId ? parseInt(contractId) : null,
        uploadedBy: req.user?.id || 1,
      };

      const [newDocument] = await db
        .insert(documents)
        .values(documentData)
        .returning();

      res.status(201).json({
        id: newDocument.id,
        fileName: newDocument.fileName,
        fileUrl: `/uploads/${newDocument.fileName}`,
        fileSize: newDocument.fileSize,
        message: "Contract document uploaded successfully"
      });
    } catch (error) {
      console.error("Contract document upload error:", error);
      res.status(500).json({ message: "Failed to upload contract document" });
    }
  });

  // Upload proposal document
  app.post("/api/upload/proposal-document", requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { name, description, clientId, contractId } = req.body;
      
      const documentData = {
        name: name || req.file.originalname,
        description: description || null,
        documentType: 'proposal',
        fileName: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        version: 1,
        isActive: true,
        clientId: clientId ? parseInt(clientId) : null,
        contractId: contractId ? parseInt(contractId) : null,
        uploadedBy: req.user?.id || 1,
      };

      const [newDocument] = await db
        .insert(documents)
        .values(documentData)
        .returning();

      res.status(201).json({
        id: newDocument.id,
        fileName: newDocument.fileName,
        fileUrl: `/uploads/${newDocument.fileName}`,
        fileSize: newDocument.fileSize,
        message: "Proposal document uploaded successfully"
      });
    } catch (error) {
      console.error("Proposal document upload error:", error);
      res.status(500).json({ message: "Failed to upload proposal document" });
    }
  });

  // Download document
  app.get("/api/documents/:id/download", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const [document] = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, id), eq(documents.isActive, true)))
        .limit(1);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const filePath = path.join(process.cwd(), 'uploads', document.fileName);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error('File not found on disk:', filePath);
        return res.status(404).json({ message: "File not found on server" });
      }

      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${document.name}"`);
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Length', document.fileSize.toString());

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: "Error reading file" });
        }
      });


    } catch (error) {
      console.error("Document download error:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  // Preview document (for PDFs and images)
  app.get("/api/documents/:id/preview", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const [document] = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, id), eq(documents.isActive, true)))
        .limit(1);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const filePath = path.join(process.cwd(), 'uploads', document.fileName);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on server" });
      }

      // Only allow preview for certain file types
      const previewableTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'text/plain'
      ];

      if (!previewableTypes.includes(document.mimeType)) {
        return res.status(400).json({ message: "File type not previewable" });
      }

      // Set appropriate headers for inline display
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${document.name}"`);

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error("Document preview error:", error);
      res.status(500).json({ message: "Failed to preview document" });
    }
  });

  // Update document metadata
  app.put("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, documentType, tags, expirationDate, complianceType } = req.body;

      // Get existing document to check ownership/permissions
      const [existingDocument] = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, id), eq(documents.isActive, true)))
        .limit(1);

      if (!existingDocument) {
        return res.status(404).json({ message: "Document not found" });
      }

      const updateData: any = {
        updatedAt: new Date()
      };

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (documentType !== undefined) updateData.documentType = documentType;
      if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [tags];
      if (expirationDate !== undefined) updateData.expirationDate = expirationDate ? new Date(expirationDate) : null;
      if (complianceType !== undefined) updateData.complianceType = complianceType;

      const [updatedDocument] = await db
        .update(documents)
        .set(updateData)
        .where(eq(documents.id, id))
        .returning();

      if (!updatedDocument) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.json(updatedDocument);
    } catch (error) {
      console.error("Update document error:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get document info before deleting
      const [document] = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, id), eq(documents.isActive, true)))
        .limit(1);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Soft delete - mark as inactive
      const [deletedDocument] = await db
        .update(documents)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(documents.id, id))
        .returning();

      if (!deletedDocument) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Optionally delete physical file (be careful in production)
      // const filePath = path.join(process.cwd(), 'uploads', document.fileName);
      // if (fs.existsSync(filePath)) {
      //   fs.unlinkSync(filePath);
      // }

      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // ========================================
  // DASHBOARD STATISTICS ENDPOINTS
  // ========================================

  // ========================================
  // INTEGRATION ENGINE ENDPOINTS
  // ========================================
  
  // Data Sources endpoints
  app.get("/api/data-sources", requireAuth, async (req, res) => {
    try {
      const dataSources = await storage.getAllDataSources();
      
      // Enhance data sources with available columns from mappings
      const enhancedDataSources = await Promise.all(
        dataSources.map(async (dataSource) => {
          const mappings = await storage.getDataSourceMappings(dataSource.id);
          const columns = mappings.map(mapping => mapping.targetField);
          
          // Also add some predefined columns for internal data sources
          const predefinedColumns = [];
          if (dataSource.name.toLowerCase().includes('client')) {
            predefinedColumns.push('name', 'status', 'created_at', 'industry', 'contact_email');
          } else if (dataSource.name.toLowerCase().includes('contract')) {
            predefinedColumns.push('name', 'total_value', 'status', 'start_date', 'end_date');
          } else if (dataSource.name.toLowerCase().includes('license')) {
            predefinedColumns.push('name', 'total_licenses', 'available_licenses', 'cost_per_license');
          }
          
          // Combine mapping columns with predefined ones
          const allColumns = [...new Set([...columns, ...predefinedColumns])];
          
          return {
            ...dataSource,
            columns: allColumns.length > 0 ? allColumns : ['id', 'name', 'status', 'created_at'] // Fallback columns
          };
        })
      );
      
      res.json(enhancedDataSources);
    } catch (error) {
      console.error("Get data sources error:", error);
      res.status(500).json({ message: "Failed to fetch data sources" });
    }
  });

  app.post("/api/data-sources", requireAuth, async (req, res) => {
    try {
      const dataSource = await storage.createDataSource({
        ...req.body,
        createdBy: req.user.id
      });
      res.status(201).json(dataSource);
    } catch (error) {
      console.error("Create data source error:", error);
      res.status(500).json({ message: "Failed to create data source" });
    }
  });

  app.put("/api/data-sources/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataSource = await storage.updateDataSource(id, req.body);
      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }
      res.json(dataSource);
    } catch (error) {
      console.error("Update data source error:", error);
      res.status(500).json({ message: "Failed to update data source" });
    }
  });

  app.delete("/api/data-sources/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDataSource(id);
      if (!deleted) {
        return res.status(404).json({ message: "Data source not found" });
      }
      res.json({ message: "Data source deleted successfully" });
    } catch (error) {
      console.error("Delete data source error:", error);
      res.status(500).json({ message: "Failed to delete data source" });
    }
  });

  // Data source testing endpoint
  app.post("/api/data-sources/:id/test", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataSource = await storage.getDataSource(id);
      
      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }

      // Perform connection test (basic implementation)
      try {
        const testResponse = await fetch(dataSource.apiEndpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(dataSource.authType === 'api_key' && dataSource.authConfig.apiKey ? {
              'Authorization': `Bearer ${dataSource.authConfig.apiKey}`
            } : {}),
            ...(dataSource.authType === 'bearer' && dataSource.authConfig.token ? {
              'Authorization': `Bearer ${dataSource.authConfig.token}`
            } : {})
          }
        });

        if (testResponse.ok) {
          const data = await testResponse.json();
          
          // Detect field schema
          const fields = [];
          if (data && typeof data === 'object') {
            for (const [key, value] of Object.entries(data)) {
              fields.push({
                name: key,
                type: typeof value,
                sample: value
              });
            }
          }

          res.json({
            success: true,
            message: "Connection successful",
            fields,
            sampleData: data
          });
        } else {
          res.status(400).json({
            success: false,
            message: `Connection failed: ${testResponse.status} ${testResponse.statusText}`
          });
        }
      } catch (fetchError) {
        res.status(400).json({
          success: false,
          message: `Connection failed: ${fetchError.message}`
        });
      }
    } catch (error) {
      console.error("Test data source error:", error);
      res.status(500).json({ message: "Failed to test data source" });
    }
  });

  // Load fields from external system
  app.get("/api/data-sources/:id/fields", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataSource = await storage.getDataSource(id);
      
      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }

      let fields = [];
      
      try {
        // Try to fetch sample data to detect fields
        const response = await fetch(dataSource.apiEndpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(dataSource.authType === 'api_key' && dataSource.authConfig?.apiKey ? {
              'Authorization': `Bearer ${dataSource.authConfig.apiKey}`
            } : {}),
            ...(dataSource.authType === 'bearer' && dataSource.authConfig?.token ? {
              'Authorization': `Bearer ${dataSource.authConfig.token}`
            } : {}),
            ...(dataSource.authType === 'basic' && dataSource.authConfig?.username && dataSource.authConfig?.password ? {
              'Authorization': `Basic ${Buffer.from(`${dataSource.authConfig.username}:${dataSource.authConfig.password}`).toString('base64')}`
            } : {})
          },
          timeout: 10000 // 10 second timeout
        });

        if (response.ok) {
          const data = await response.json();
          
          // Extract fields from the response
          if (Array.isArray(data) && data.length > 0) {
            // If it's an array, analyze the first object
            const sampleObject = data[0];
            fields = Object.keys(sampleObject);
          } else if (data && typeof data === 'object') {
            // If it's a single object, get its keys
            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
              // Handle wrapped responses like { data: [...] }
              fields = Object.keys(data.data[0]);
            } else if (data.items && Array.isArray(data.items) && data.items.length > 0) {
              // Handle wrapped responses like { items: [...] }
              fields = Object.keys(data.items[0]);
            } else {
              // Direct object fields
              fields = Object.keys(data);
            }
          }
        } else {
          console.warn(`Failed to fetch data from ${dataSource.apiEndpoint}: ${response.status}`);
        }
      } catch (fetchError) {
        console.warn(`Error fetching from external system: ${fetchError.message}`);
      }
      
      // If no fields were detected from API, try to get them from existing mappings
      if (fields.length === 0) {
        try {
          const mappings = await storage.getDataSourceMappings(id);
          fields = mappings.map(mapping => mapping.targetField);
        } catch (mappingError) {
          console.warn('Failed to get fields from mappings:', mappingError);
        }
      }
      
      // If still no fields, provide default fields based on data source type/name
      if (fields.length === 0) {
        if (dataSource.name.toLowerCase().includes('client')) {
          fields = ['id', 'name', 'email', 'status', 'industry', 'created_at', 'updated_at'];
        } else if (dataSource.name.toLowerCase().includes('contract')) {
          fields = ['id', 'name', 'client_id', 'total_value', 'status', 'start_date', 'end_date'];
        } else if (dataSource.name.toLowerCase().includes('license')) {
          fields = ['id', 'name', 'vendor', 'total_licenses', 'available_licenses', 'cost_per_license'];
        } else if (dataSource.name.toLowerCase().includes('service')) {
          fields = ['id', 'name', 'description', 'price', 'status', 'category'];
        } else {
          fields = ['id', 'name', 'description', 'status', 'created_at', 'updated_at'];
        }
      }
      
      res.json({
        success: true,
        fields: fields,
        source: fields.length > 0 ? 'api' : 'default',
        dataSourceName: dataSource.name
      });
      
    } catch (error) {
      console.error("Load fields error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to load fields",
        fields: ['id', 'name', 'status'] // Minimal fallback
      });
    }
  });

  // Data source sync endpoint
  app.post("/api/data-sources/:id/sync", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataSource = await storage.getDataSource(id);
      
      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }

      // Perform data sync (basic implementation)
      try {
        const syncResponse = await fetch(dataSource.apiEndpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(dataSource.authType === 'api_key' && dataSource.authConfig.apiKey ? {
              'Authorization': `Bearer ${dataSource.authConfig.apiKey}`
            } : {}),
            ...(dataSource.authType === 'bearer' && dataSource.authConfig.token ? {
              'Authorization': `Bearer ${dataSource.authConfig.token}`
            } : {})
          }
        });

        if (syncResponse.ok) {
          const data = await syncResponse.json();
          
          // Store integrated data
          const integratedData = await storage.createIntegratedData({
            dataSourceId: id,
            originalData: data,
            mappedData: data, // TODO: Apply field mappings
            recordIdentifier: data.id || `sync_${Date.now()}`
          });

          res.json({
            success: true,
            message: "Data synchronized successfully",
            recordId: integratedData.id
          });
        } else {
          res.status(400).json({
            success: false,
            message: `Sync failed: ${syncResponse.status} ${syncResponse.statusText}`
          });
        }
      } catch (fetchError) {
        res.status(400).json({
          success: false,
          message: `Sync failed: ${fetchError.message}`
        });
      }
    } catch (error) {
      console.error("Sync data source error:", error);
      res.status(500).json({ message: "Failed to sync data source" });
    }
  });

  // Data source mappings endpoints
  app.get("/api/data-sources/:id/mappings", requireAuth, async (req, res) => {
    try {
      const dataSourceId = parseInt(req.params.id);
      const mappings = await storage.getDataSourceMappings(dataSourceId);
      res.json(mappings);
    } catch (error) {
      console.error("Get mappings error:", error);
      res.status(500).json({ message: "Failed to fetch mappings" });
    }
  });

  app.post("/api/data-source-mappings", requireAuth, async (req, res) => {
    try {
      const mapping = await storage.createDataSourceMapping(req.body);
      res.status(201).json(mapping);
    } catch (error) {
      console.error("Create mapping error:", error);
      res.status(500).json({ message: "Failed to create mapping" });
    }
  });

  app.put("/api/data-source-mappings/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mapping = await storage.updateDataSourceMapping(id, req.body);
      if (!mapping) {
        return res.status(404).json({ message: "Mapping not found" });
      }
      res.json(mapping);
    } catch (error) {
      console.error("Update mapping error:", error);
      res.status(500).json({ message: "Failed to update mapping" });
    }
  });

  app.delete("/api/data-source-mappings/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDataSourceMapping(id);
      if (!deleted) {
        return res.status(404).json({ message: "Mapping not found" });
      }
      res.json({ message: "Mapping deleted successfully" });
    } catch (error) {
      console.error("Delete mapping error:", error);
      res.status(500).json({ message: "Failed to delete mapping" });
    }
  });

  // Integration Engine Dashboard Widgets endpoints
  app.get("/api/dashboard-widgets", requireAuth, async (req, res) => {
    try {
      const widgets = await storage.getAllDashboardWidgets();
      res.json(widgets);
    } catch (error) {
      console.error("Get dashboard widgets error:", error);
      res.status(500).json({ message: "Failed to fetch widgets" });
    }
  });

  app.post("/api/dashboard-widgets", requireAuth, async (req, res) => {
    try {
      // Extract only the fields we want to save (exclude timestamps as they're auto-generated)
      const { name, widgetType, config, dataSourceId, refreshInterval } = req.body;
      
      const widget = await storage.createDashboardWidget({
        name,
        widgetType,
        config,
        dataSourceId: dataSourceId ? parseInt(dataSourceId) : null,
        refreshInterval: refreshInterval || null,
        createdBy: req.user.id
      });
      res.status(201).json(widget);
    } catch (error) {
      console.error("Create dashboard widget error:", error);
      res.status(500).json({ message: "Failed to create widget" });
    }
  });

  app.put("/api/dashboard-widgets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`=== UPDATE DASHBOARD WIDGET ${id} ===`);
      console.log("User:", req.user?.email, "ID:", req.user?.id);
      
      // Get widget and check ownership through dashboard assignment
      const [widget] = await db.select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.id, id));
      
      if (!widget) {
        return res.status(404).json({ message: "Widget not found" });
      }
      console.log("Widget found:", widget.name);
      
      // Get dashboard ownership through widget assignment
      const [assignment] = await db.select({
        dashboardId: dashboardWidgetAssignments.dashboardId
      })
        .from(dashboardWidgetAssignments)
        .where(eq(dashboardWidgetAssignments.widgetId, id));
      
      if (!assignment) {
        console.log("No assignment found for widget", id);
        return res.status(404).json({ message: "Widget assignment not found for widget " + id });
      }
      console.log("Assignment found, dashboard ID:", assignment.dashboardId);
      
      // Check dashboard ownership
      const [dashboard] = await db.select()
        .from(userDashboards)
        .where(eq(userDashboards.id, assignment.dashboardId));
      
      if (!dashboard) {
        console.log("Dashboard not found:", assignment.dashboardId);
        return res.status(404).json({ message: "Dashboard not found: " + assignment.dashboardId });
      }
      
      console.log("Dashboard owner:", dashboard.userId, "Current user:", req.user.id);
      console.log("Authorization check result:", dashboard.userId == req.user.id);
      
      if (dashboard.userId != req.user.id) {
        console.log("❌ Authorization failed - Access denied");
        return res.status(403).json({ message: "Access denied - user does not own dashboard" });
      }
      
      console.log("✅ Authorization passed - proceeding with update");
      
      // Extract only the fields we want to update (exclude timestamps as they're auto-generated)
      const { name, widgetType, config, dataSourceId, refreshInterval, isActive } = req.body;
      
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (widgetType !== undefined) updateData.widgetType = widgetType;
      if (config !== undefined) updateData.config = config;
      if (dataSourceId !== undefined) updateData.dataSourceId = dataSourceId ? parseInt(dataSourceId) : null;
      if (refreshInterval !== undefined) updateData.refreshInterval = refreshInterval || null;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      const updatedWidget = await storage.updateDashboardWidget(id, updateData);
      if (!updatedWidget) {
        return res.status(404).json({ message: "Widget not found" });
      }
      console.log("✅ Widget updated successfully");
      res.json(updatedWidget);
    } catch (error) {
      console.error("Update dashboard widget error:", error);
      res.status(500).json({ message: "Failed to update widget" });
    }
  });

  app.delete("/api/dashboard-widgets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDashboardWidget(id);
      if (!deleted) {
        return res.status(404).json({ message: "Widget not found" });
      }
      res.json({ message: "Widget deleted successfully" });
    } catch (error) {
      console.error("Delete dashboard widget error:", error);
      res.status(500).json({ message: "Failed to delete widget" });
    }
  });

  // Get widget data endpoint (for dashboard widgets)
  app.get("/api/widgets/:id/data", requireAuth, async (req, res) => {
    try {
      console.log(`🔍 Fetching widget data for widget ID: ${req.params.id}`);
      const widgetId = parseInt(req.params.id);
      
      // First, find the widget in dashboardWidgets table
      const widgets = await db.select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.id, widgetId))
        .limit(1);
      
      if (!widgets.length) {
        console.log(`❌ Widget ${widgetId} not found`);
        return res.status(404).json({ message: "Widget not found" });
      }
      
      const widget = widgets[0];
      console.log(`✅ Found widget: ${widget.name}, type: ${widget.widgetType}, config:`, widget.config);
      
      if (!widget.dataSourceId) {
        console.log(`⚠️ Widget ${widgetId} has no data source`);
        return res.json({ data: [] });
      }

      // Get raw data from the data source
      const integratedData = await storage.getIntegratedData(widget.dataSourceId, {
        limit: 1000, // Increased limit for aggregations
        page: 1
      });
      
      console.log(`📊 Raw data count: ${integratedData.data.length}`);
      const rawData = integratedData.data.map(item => item.mappedData);
      
      // Apply aggregations based on widget configuration
      const aggregatedData = await applyWidgetAggregations(widget, rawData);
      console.log(`🔄 Aggregated data:`, aggregatedData);

      res.json({
        data: aggregatedData,
        widget: {
          id: widget.id,
          title: widget.name,
          type: widget.widgetType,
          dataSource: widget.dataSourceId?.toString()
        }
      });
    } catch (error) {
      console.error("Get widget data error:", error);
      res.status(500).json({ message: "Failed to fetch widget data" });
    }
  });

  // Helper function to apply aggregations
  async function applyWidgetAggregations(widget: any, rawData: any[]): Promise<any[]> {
    const config = widget.config || {};
    console.log(`🧮 Applying aggregations for widget type: ${widget.widgetType}, config:`, config);
    
    if (!rawData || rawData.length === 0) {
      console.log(`⚠️ No raw data to aggregate`);
      return [];
    }

    switch (widget.widgetType) {
      case 'kpi': {
        const aggregation = config.aggregation || {};
        const field = aggregation.field;
        const func = aggregation.function || 'count';
        
        console.log(`📈 KPI aggregation - function: ${func}, field: ${field}`);
        
        let value = 0;
        
        switch (func) {
          case 'count':
            value = rawData.length;
            break;
          case 'sum':
            if (field) {
              value = rawData.reduce((sum, item) => {
                const val = item[field];
                return sum + (typeof val === 'number' ? val : 0);
              }, 0);
            } else {
              value = rawData.length;
            }
            break;
          case 'average':
            if (field) {
              const values = rawData
                .map(item => item[field])
                .filter(val => typeof val === 'number');
              value = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
            } else {
              value = rawData.length;
            }
            break;
          case 'min':
            if (field) {
              const values = rawData
                .map(item => item[field])
                .filter(val => typeof val === 'number');
              value = values.length > 0 ? Math.min(...values) : 0;
            } else {
              value = 0;
            }
            break;
          case 'max':
            if (field) {
              const values = rawData
                .map(item => item[field])
                .filter(val => typeof val === 'number');
              value = values.length > 0 ? Math.max(...values) : 0;
            } else {
              value = rawData.length;
            }
            break;
          default:
            value = rawData.length;
        }
        
        console.log(`📊 KPI result: ${value}`);
        return [{ value, label: config.label || widget.name }];
      }
      
      case 'table': {
        // For tables, apply filtering and limiting
        const fields = config.fields;
        const limit = config.limit || 10;
        
        let filteredData = rawData;
        
        // Apply field filtering if specified
        if (fields && Array.isArray(fields) && fields.length > 0) {
          filteredData = rawData.map(item => {
            const filtered: any = {};
            fields.forEach(field => {
              if (item.hasOwnProperty(field)) {
                filtered[field] = item[field];
              }
            });
            return filtered;
          });
        }
        
        console.log(`📋 Table data filtered, showing ${Math.min(limit, filteredData.length)} of ${filteredData.length} records`);
        return filteredData.slice(0, limit);
      }
      
      case 'bar_chart':
      case 'line_chart': {
        // For charts, group and aggregate data
        const groupBy = config.groupBy;
        const aggregation = config.aggregation || {};
        const func = aggregation.function || 'count';
        const field = aggregation.field;
        
        if (!groupBy) {
          console.log(`⚠️ Chart widget missing groupBy field, returning raw data`);
          return rawData.slice(0, 20); // Limit for performance
        }
        
        // Group data by the specified field
        const groups: Record<string, any[]> = {};
        rawData.forEach(item => {
          const groupValue = item[groupBy] || 'Unknown';
          if (!groups[groupValue]) {
            groups[groupValue] = [];
          }
          groups[groupValue].push(item);
        });
        
        // Calculate aggregated values for each group
        const chartData = Object.keys(groups).map(groupKey => {
          const groupItems = groups[groupKey];
          let value = 0;
          
          switch (func) {
            case 'count':
              value = groupItems.length;
              break;
            case 'sum':
              if (field) {
                value = groupItems.reduce((sum, item) => {
                  const val = item[field];
                  return sum + (typeof val === 'number' ? val : 0);
                }, 0);
              } else {
                value = groupItems.length;
              }
              break;
            case 'average':
              if (field) {
                const values = groupItems
                  .map(item => item[field])
                  .filter(val => typeof val === 'number');
                value = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
              } else {
                value = groupItems.length;
              }
              break;
            default:
              value = groupItems.length;
          }
          
          return {
            name: groupKey,
            value: value
          };
        });
        
        console.log(`📊 Chart data aggregated into ${chartData.length} groups`);
        return chartData.sort((a, b) => b.value - a.value).slice(0, 10); // Top 10
      }
      
      default: {
        // For other widget types, return raw data with limit
        console.log(`📄 Default widget type, returning limited raw data`);
        return rawData.slice(0, 50);
      }
    }
  }

  // Legacy endpoint for backward compatibility
  app.get("/api/dashboard-widgets/:id/data", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const widget = await storage.getDashboardWidget(id);
      
      if (!widget) {
        return res.json({ data: [] });
      }

      if (!widget.dataSourceId) {
        return res.json({ data: [] });
      }

      // Get integrated data for the widget's data source
      const integratedData = await storage.getIntegratedData(widget.dataSourceId, {
        limit: 100,
        page: 1
      });

      res.json({
        data: integratedData.data.map(item => item.mappedData)
      });
    } catch (error) {
      console.error("Get widget data error:", error);
      res.status(500).json({ message: "Failed to fetch widget data" });
    }
  });

  // Integrated data endpoints
  app.get("/api/data-sources/:id/data", requireAuth, async (req, res) => {
    try {
      const dataSourceId = parseInt(req.params.id);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      
      const result = await storage.getIntegratedData(dataSourceId, {
        page,
        limit
      });
      
      res.json(result);
    } catch (error) {
      console.error("Get integrated data error:", error);
      res.status(500).json({ message: "Failed to fetch integrated data" });
    }
  });

  app.delete("/api/integrated-data/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteIntegratedData(id);
      if (!deleted) {
        return res.status(404).json({ message: "Data record not found" });
      }
      res.json({ message: "Data record deleted successfully" });
    } catch (error) {
      console.error("Delete integrated data error:", error);
      res.status(500).json({ message: "Failed to delete data record" });
    }
  });

  // Health check for Integration Engine
  app.get("/api/integration-engine/health", requireAuth, async (req, res) => {
    try {
      const dataSources = await storage.getAllDataSources();
      const widgets = await storage.getAllDashboardWidgets();
      
      res.json({
        status: "healthy",
        dataSourcesCount: dataSources.length,
        widgetsCount: widgets.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Integration Engine health check error:", error);
      res.status(500).json({ 
        status: "unhealthy",
        error: error.message 
      });
    }
  });

  // External Data Integration Bridge
  app.use("/api/integration-engine/external-data", requireAuth, externalDataBridge);



  // Integration Engine Widget Routes (more specific, register first)
  app.use("/api/external-widgets/integration-engine", integrationEngineWidgetRoutes);
  
  // External Widget Routes (general, register after specific routes)
  app.use("/api/external-widgets", externalWidgetRoutes);

  // Dynamic Service Scope Variable Routes
  app.use("/api/service-scopes", dynamicServiceScopeRoutes);

  // Pool Validation Routes for Onboarding
  app.use("/api/pools", poolValidationRoutes);

  // Widget Query Testing Endpoint
  app.post("/api/integration-engine/test-query", async (req, res) => {
    try {
      console.log('🧪 Integration Engine test request received:', {
        body: req.body,
        user: req.user?.id,
        headers: {
          'content-type': req.headers['content-type'],
          'authorization': req.headers['authorization'] ? 'present' : 'missing'
        }
      });

      const { systemId, endpoint, method = 'GET', params = {} } = req.body;

      if (!systemId || !endpoint) {
        console.log('❌ Missing required fields:', { systemId, endpoint });
        return res.status(400).json({ error: 'systemId and endpoint are required' });
      }

      // Get the external system
      console.log(`🔍 Looking for external system with ID: ${systemId}`);
      const system = await storage.getExternalSystem(systemId);
      if (!system) {
        console.log(`❌ External system ${systemId} not found`);
        return res.status(404).json({ error: 'External system not found' });
      }

      console.log('🌐 Found external system:', {
        id: system.id,
        systemName: system.systemName,
        baseUrl: system.baseUrl,
        authType: system.authType
      });

      // Construct the full URL
      let fullUrl = system.baseUrl.replace(/\/$/, '') + endpoint;
      
      // Add query parameters for GET requests
      if (method === 'GET' && Object.keys(params).length > 0) {
        const queryString = new URLSearchParams(params).toString();
        fullUrl += `?${queryString}`;
      }

      console.log(`🧪 Testing endpoint: ${fullUrl}`);

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'MSSP-Client-Manager/1.0'
      };

      // Add authentication headers
      if (system.authType === 'bearer' && system.authConfig?.token) {
        headers['Authorization'] = `Bearer ${system.authConfig.token}`;
      } else if (system.authType === 'basic' && system.authConfig?.username && system.authConfig?.password) {
        const credentials = Buffer.from(`${system.authConfig.username}:${system.authConfig.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      } else if (system.authType === 'api_key' && system.authConfig?.apiKey) {
        headers['X-API-Key'] = system.authConfig.apiKey;
      }

      // Make the request
      const response = await fetch(fullUrl, {
        method,
        headers,
        body: method !== 'GET' ? JSON.stringify(params) : undefined,
      });

      // Handle the response
      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Test failed: ${response.statusText}`,
          details: responseData,
          status: response.status
        });
      }

      // Return successful response
      res.json(responseData);

    } catch (error) {
      console.error('Widget test query error:', error);
      res.status(500).json({ 
        error: 'Test failed: Network error',
        details: error.message 
      });
    }
  });

  // Add Integration Engine endpoints before the WebSocket setup
  const httpServer = createServer(app);

  // ========================================
  // EXTERNAL SYSTEMS ENDPOINTS
  // ========================================
  
  // Get all external systems
  app.get("/api/external-systems", requireAuth, async (req, res) => {
    try {
      const systems = await storage.getAllExternalSystems();
      res.json(systems);
    } catch (error) {
      console.error("Get external systems error:", error);
      res.status(500).json({ message: "Failed to fetch external systems" });
    }
  });


  // Enhanced query testing endpoint
  app.post("/api/external-systems/test-query", requireAuth, async (req, res) => {
    try {
      const { 
        systemId, 
        method, 
        endpoint, 
        params = {}, 
        headers = {}, 
        body, 
        limit = 100, 
        timeout = 30000 
      } = req.body;

      if (!systemId || !endpoint) {
        return res.status(400).json({ 
          success: false, 
          message: "System ID and endpoint are required" 
        });
      }

      // Get the external system configuration
      const system = await storage.getExternalSystem(systemId);
      if (!system) {
        return res.status(404).json({ 
          success: false, 
          message: "External system not found" 
        });
      }

      // Build the full URL - handle both relative paths and full URLs
      let finalUrl;
      if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        // Full URL provided - use it directly
        finalUrl = endpoint;
        if (Object.keys(params).length > 0) {
          const urlParams = new URLSearchParams(params);
          const separator = endpoint.includes('?') ? '&' : '?';
          finalUrl = `${endpoint}${separator}${urlParams.toString()}`;
        }
      } else {
        // Relative path - combine with base URL
        const baseUrl = system.baseUrl.replace(/\/$/, ''); // Remove trailing slash
        const fullUrl = `${baseUrl}${endpoint}`;
        
        // Build query parameters
        const urlParams = new URLSearchParams(params);
        finalUrl = Object.keys(params).length > 0 ? 
          `${fullUrl}?${urlParams.toString()}` : fullUrl;
      }

      // Build headers with authentication
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers
      };

      // Add authentication headers based on system configuration
      if (system.authType === 'basic' && system.authConfig?.username && system.authConfig?.password) {
        const auth = Buffer.from(`${system.authConfig.username}:${system.authConfig.password}`).toString('base64');
        requestHeaders['Authorization'] = `Basic ${auth}`;
      } else if (system.authType === 'bearer' && system.authConfig?.token) {
        requestHeaders['Authorization'] = `Bearer ${system.authConfig.token}`;
      } else if (system.authType === 'api_key' && system.authConfig?.key) {
        const headerName = system.authConfig.header || 'X-API-Key';
        requestHeaders[headerName] = system.authConfig.key;
      } else if (system.authType === 'custom' && system.authConfig?.customHeaders) {
        Object.assign(requestHeaders, system.authConfig.customHeaders);
      }

      // Prepare fetch options
      const fetchOptions: any = {
        method: method.toUpperCase(),
        headers: requestHeaders,
        timeout: timeout
      };

      // Add body for POST/PUT requests
      if ((method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT') && body) {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const startTime = Date.now();
      
      try {
        const response = await fetch(finalUrl, fetchOptions);
        const executionTime = Date.now() - startTime;
        
        let responseData;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }

        // Apply result limiting if data is an array
        if (Array.isArray(responseData) && limit > 0) {
          responseData = responseData.slice(0, limit);
        } else if (responseData && typeof responseData === 'object') {
          // Try to limit nested arrays
          ['results', 'data', 'items', 'records'].forEach(key => {
            if (responseData[key] && Array.isArray(responseData[key]) && limit > 0) {
              responseData[key] = responseData[key].slice(0, limit);
            }
          });
        }

        const result = {
          success: response.ok,
          data: responseData,
          statusCode: response.status,
          metadata: {
            executionTime,
            method: method.toUpperCase(),
            systemName: system.displayName,
            url: finalUrl,
            responseSize: JSON.stringify(responseData).length,
            recordCount: Array.isArray(responseData) ? responseData.length : 
                        (responseData?.results?.length || responseData?.data?.length || 1)
          }
        };

        if (!response.ok) {
          result.success = false;
          res.status(response.status).json(result);
        } else {
          res.json(result);
        }

      } catch (fetchError: any) {
        const executionTime = Date.now() - startTime;
        
        res.status(500).json({
          success: false,
          message: fetchError.message || 'Request failed',
          code: 'FETCH_ERROR',
          metadata: {
            executionTime,
            method: method.toUpperCase(),
            systemName: system.displayName,
            url: finalUrl
          }
        });
      }

    } catch (error: any) {
      console.error("Query test error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to execute query test",
        code: 'INTERNAL_ERROR'
      });
    }
  });

  // Get external system by ID
  app.get("/api/external-systems/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const system = await storage.getExternalSystem(id);
      
      if (!system) {
        return res.status(404).json({ message: "External system not found" });
      }
      
      res.json(system);
    } catch (error) {
      console.error("Get external system error:", error);
      res.status(500).json({ message: "Failed to fetch external system" });
    }
  });

  // Create external system
  app.post("/api/external-systems", requireManagerOrAbove, async (req, res) => {
    try {
      const system = await storage.createExternalSystem({
        ...req.body,
        createdBy: req.user.id
      });
      res.status(201).json(system);
    } catch (error) {
      console.error("Create external system error:", error);
      res.status(500).json({ message: "Failed to create external system" });
    }
  });

  // Update external system
  app.put("/api/external-systems/:id", requireManagerOrAbove, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const system = await storage.updateExternalSystem(id, req.body);
      
      if (!system) {
        return res.status(404).json({ message: "External system not found" });
      }
      
      res.json(system);
    } catch (error) {
      console.error("Update external system error:", error);
      res.status(500).json({ message: "Failed to update external system" });
    }
  });

  // Delete external system
  app.delete("/api/external-systems/:id", requireManagerOrAbove, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteExternalSystem(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "External system not found" });
      }
      
      res.json({ message: "External system deleted successfully" });
    } catch (error) {
      console.error("Delete external system error:", error);
      res.status(500).json({ message: "Failed to delete external system" });
    }
  });

  // Get Integration Engine widget templates from database
  app.get("/api/integration-engine/widget-templates", async (req, res) => {
    try {
      console.log('🔌 Fetching Integration Engine widget templates...');
      // Use the actual externalWidgetTemplates table
      const templates = await db.select()
        .from(externalWidgetTemplates)
        .innerJoin(externalSystems, eq(externalWidgetTemplates.systemId, externalSystems.id))
        .where(eq(externalWidgetTemplates.isActive, true));
      
      console.log(`🔌 Found ${templates.length} Integration Engine widget templates`);
      
      // Format the response to match expected structure
      const widgets = templates.map(row => ({
        id: row.externalWidgetTemplates.id,
        systemId: row.externalWidgetTemplates.systemId,
        name: row.externalWidgetTemplates.name,
        description: row.externalWidgetTemplates.description,
        widgetType: row.externalWidgetTemplates.widgetType,
        query: row.externalWidgetTemplates.query,
        variables: row.externalWidgetTemplates.variables,
        displayConfig: row.externalWidgetTemplates.displayConfig,
        isActive: row.externalWidgetTemplates.isActive,
        isGlobal: row.externalWidgetTemplates.isGlobal,
        position: row.externalWidgetTemplates.position,
        createdBy: row.externalWidgetTemplates.createdBy,
        createdAt: row.externalWidgetTemplates.createdAt,
        updatedAt: row.externalWidgetTemplates.updatedAt,
        systemName: row.external_systems.systemName,
        systemDisplayName: row.external_systems.displayName
      }));
      
      res.json({
        widgets,
        count: widgets.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Get Integration Engine widget templates error:", error);
      res.status(500).json({ message: "Failed to fetch Integration Engine widget templates" });
    }
  });

  // Get all external mappings (for external systems management)
  app.get("/api/external-mappings/all", requireAuth, async (req, res) => {
    try {
      const mappings = await storage.getAllClientExternalMappings();
      res.json(mappings);
    } catch (error) {
      console.error("Get all external mappings error:", error);
      res.status(500).json({ message: "Failed to fetch external mappings" });
    }
  });

  // Get client external mappings
  app.get("/api/clients/:id/external-mappings", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const mappings = await storage.getClientExternalMappings(clientId);
      res.json(mappings);
    } catch (error) {
      console.error("Get client external mappings error:", error);
      res.status(500).json({ message: "Failed to fetch client external mappings" });
    }
  });

  // Create client external mapping
  app.post("/api/clients/:id/external-mappings", requireManagerOrAbove, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const mapping = await storage.createClientExternalMapping({
        ...req.body,
        clientId
      });
      res.status(201).json(mapping);
    } catch (error) {
      console.error("Create client external mapping error:", error);
      res.status(500).json({ message: "Failed to create client external mapping" });
    }
  });

  // Update external mapping
  app.put("/api/external-mappings/:id", requireManagerOrAbove, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mapping = await storage.updateClientExternalMapping(id, req.body);
      
      if (!mapping) {
        return res.status(404).json({ message: "External mapping not found" });
      }
      
      res.json(mapping);
    } catch (error) {
      console.error("Update external mapping error:", error);
      res.status(500).json({ message: "Failed to update external mapping" });
    }
  });

  // Delete external mapping
  app.delete("/api/external-mappings/:id", requireManagerOrAbove, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteClientExternalMapping(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "External mapping not found" });
      }
      
      res.json({ message: "External mapping deleted successfully" });
    } catch (error) {
      console.error("Delete external mapping error:", error);
      res.status(500).json({ message: "Failed to delete external mapping" });
    }
  });

  // Get aggregated data for client
  app.get("/api/clients/:id/aggregated-data", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      
      // Get client's external mappings
      const mappings = await storage.getClientExternalMappings(clientId);
      
      if (mappings.length === 0) {
        return res.json({
          clientId,
          timestamp: new Date().toISOString(),
          systems: {},
            summary: {
            totalSystems: 0,
            successfulSystems: 0,
            failedSystems: 0,
            totalResponseTime: 0
          }
        });
      }
      
      // Get external systems configurations
      const systemNames = [...new Set(mappings.map(m => m.systemName))];
      const systems = await Promise.all(
        systemNames.map(name => storage.getExternalSystemByName(name))
      );
      const validSystems = systems.filter(Boolean);
      
      // Import external API service and aggregate data
      const { externalApiService } = await import("./external-api-service");
      const aggregatedResponse = await externalApiService.aggregateClientData(mappings, validSystems);
      
      res.json({
        clientId,
        timestamp: aggregatedResponse.last_updated,
        systems: aggregatedResponse.data,
        summary: {
          totalSystems: Object.keys(aggregatedResponse.data).length,
          successfulSystems: Object.values(aggregatedResponse.data).filter(s => s.status === 'success').length,
          failedSystems: Object.values(aggregatedResponse.data).filter(s => s.status === 'error').length,
          totalResponseTime: 0 // TODO: Add response time tracking
        }
      });
    } catch (error) {
      console.error("Get aggregated data error:", error);
      res.status(500).json({ message: "Failed to fetch aggregated data" });
    }
  });

  // Test external system connection
  app.post("/api/external-systems/:id/test-connection", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const queryService = DynamicQueryExecutionService.getInstance();
      const testResult = await queryService.testConnection(id);
      
      // Log the test for audit purposes
      console.log(`External system connection test: ${id} - ${testResult.success}`, {
        userId: req.user.id,
        systemId: id,
        result: testResult.success
      });

      res.json(testResult);
    } catch (error) {
      console.error("Test external system connection error:", error);
      res.status(500).json({ message: "Failed to test external system connection" });
    }
  });

  // Execute dynamic query on external system
  app.post("/api/external-systems/query", requireAuth, async (req, res) => {
    try {
      const queryRequest = req.body;
      
      // Validate required fields
      if (!queryRequest.systemId || !queryRequest.query) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'systemId and query are required'
          }
        });
      }

      const queryService = DynamicQueryExecutionService.getInstance();
      const result = await queryService.executeQuery(queryRequest);
      
      // Log the query execution for audit purposes
      console.log(`Dynamic query executed: ${queryRequest.systemId}`, {
        userId: req.user.id,
        systemId: queryRequest.systemId,
        method: queryRequest.method,
        success: result.success,
        executionTime: result.metadata?.executionTime
      });

      res.json(result);
    } catch (error) {
      console.error("Dynamic query execution error:", error);
      res.status(500).json({ 
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: 'Failed to execute query'
        }
      });
    }
  });

  // Legacy test endpoint (for backward compatibility)
  app.post("/api/external-systems/:id/test", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const testConfig = req.body; // Optional test configuration (JQL, custom endpoint, etc.)
      
      const system = await storage.getExternalSystem(id);
      if (!system) {
        return res.status(404).json({ message: "External system not found" });
      }

      const externalApiService = new ExternalApiService();
      const testResult = await externalApiService.testConnection(system, testConfig);
      
      // Log the test for audit purposes
      console.log(`External system connection test: ${system.systemName} - ${testResult.status}`, {
        userId: req.user.id,
        systemId: id,
        testConfig: testConfig,
        result: testResult.status
      });

      res.json(testResult);
    } catch (error) {
      console.error("Test external system connection error:", error);
      res.status(500).json({ message: "Failed to test external system connection" });
    }
  });

  // Test external system configuration (before saving)
  app.post("/api/external-systems/test-config", requireAuth, async (req, res) => {
    try {
      const testSystemConfig = req.body; // Temporary system configuration for testing
      
      // Validate required fields
      if (!testSystemConfig.systemName || !testSystemConfig.baseUrl || !testSystemConfig.authType) {
        return res.status(400).json({ 
          message: "Missing required fields: systemName, baseUrl, authType" 
        });
      }

      // Create temporary system object for testing
      const tempSystem = {
        id: 0, // Temporary ID
        systemName: testSystemConfig.systemName,
        displayName: testSystemConfig.displayName || testSystemConfig.systemName,
        baseUrl: testSystemConfig.baseUrl,
        authType: testSystemConfig.authType,
        authConfig: testSystemConfig.authConfig || {},
        apiEndpoints: testSystemConfig.apiEndpoints || {},
        isActive: true,
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const externalApiService = new ExternalApiService();
      const testResult = await externalApiService.testConnection(tempSystem, testSystemConfig.testConfig);
      
      // Log the test for audit purposes
      console.log(`External system config test: ${testSystemConfig.systemName} - ${testResult.status}`, {
        userId: req.user.id,
        systemName: testSystemConfig.systemName,
        baseUrl: testSystemConfig.baseUrl,
        authType: testSystemConfig.authType,
        result: testResult.status
      });

      res.json(testResult);
    } catch (error) {
      console.error("Test external system configuration error:", error);
      
      // Enhanced error response with detailed information
      const errorResponse: any = {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Failed to test external system configuration',
        timestamp: new Date().toISOString()
      };

      // Add detailed error information for development
      if (process.env.NODE_ENV === 'development') {
        errorResponse.details = {
          requestDetails: {
            method: 'POST',
            url: req.url,
            baseUrl: testSystemConfig.baseUrl,
            authType: testSystemConfig.authType,
            systemName: testSystemConfig.systemName
          }
        };

        if (error instanceof Error) {
          errorResponse.details.error = {
            name: error.name,
            message: error.message,
            stack: error.stack
          };

          // Add any additional error properties
          Object.keys(error).forEach(key => {
            if (!['name', 'message', 'stack'].includes(key)) {
              errorResponse.details.error[key] = (error as any)[key];
            }
          });
        }
      }
      
      res.status(500).json(errorResponse);
    }
  });

  // External widget templates management
  app.get("/api/external-widgets", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      
      const widgets = await db
        .select()
        .from(externalWidgetTemplates)
        .where(
          userRole === 'admin' 
            ? undefined 
            : or(
                eq(externalWidgetTemplates.createdBy, userId),
                eq(externalWidgetTemplates.isPublic, true)
              )
        )
        .orderBy(desc(externalWidgetTemplates.createdAt));
      
      res.json(widgets);
    } catch (error) {
      console.error('Failed to fetch external widgets:', error);
      res.status(500).json({ message: "Failed to fetch widgets" });
    }
  });

  app.post("/api/external-widgets", requireAuth, async (req, res) => {
    try {
      const widgetData = {
        ...req.body,
        createdBy: req.user.id
      };
      
      const [widget] = await db
        .insert(externalWidgetTemplates)
        .values(widgetData)
        .returning();
      
      res.status(201).json(widget);
    } catch (error) {
      console.error('Failed to create external widget:', error);
      res.status(500).json({ message: "Failed to create widget" });
    }
  });

  app.put("/api/external-widgets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Check ownership or admin privileges
      const existingWidget = await db
        .select()
        .from(externalWidgetTemplates)
        .where(eq(externalWidgetTemplates.id, id))
        .limit(1);
      
      if (!existingWidget.length) {
        return res.status(404).json({ message: "Widget not found" });
      }
      
      if (userRole !== 'admin' && existingWidget[0].createdBy !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const [updatedWidget] = await db
        .update(externalWidgetTemplates)
        .set({
          ...req.body,
          updatedAt: new Date()
        })
        .where(eq(externalWidgetTemplates.id, id))
        .returning();
      
      res.json(updatedWidget);
    } catch (error) {
      console.error('Failed to update external widget:', error);
      res.status(500).json({ message: "Failed to update widget" });
    }
  });

  app.delete("/api/external-widgets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Check ownership or admin privileges
      const existingWidget = await db
        .select()
        .from(externalWidgetTemplates)
        .where(eq(externalWidgetTemplates.id, id))
        .limit(1);
      
      if (!existingWidget.length) {
        return res.status(404).json({ message: "Widget not found" });
      }
      
      if (userRole !== 'admin' && existingWidget[0].createdBy !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      await db
        .delete(externalWidgetTemplates)
        .where(eq(externalWidgetTemplates.id, id));
      
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete external widget:', error);
      res.status(500).json({ message: "Failed to delete widget" });
    }
  });

  // Execute external widget query with caching
  app.post("/api/external-widgets/:id/execute", requireAuth, async (req, res) => {
    try {
      const widgetId = parseInt(req.params.id);
      const { parameters = {}, forceRefresh = false } = req.body;
      
      // Get widget configuration
      const widget = await db
        .select()
        .from(externalWidgetTemplates)
        .where(eq(externalWidgetTemplates.id, widgetId))
        .limit(1);
      
      if (!widget.length) {
        return res.status(404).json({ message: "Widget not found" });
      }
      
      const widgetConfig = widget[0];
      
      // Check cache first (if enabled and not force refresh)
      if (widgetConfig.cacheEnabled && !forceRefresh) {
        const cached = await db
          .select()
          .from(widgetExecutionCache)
          .where(
            and(
              eq(widgetExecutionCache.widgetId, widgetId),
              eq(widgetExecutionCache.isValid, true),
              sql`${widgetExecutionCache.expiresAt} > NOW()`
            )
          )
          .limit(1);
        
        if (cached.length) {
          return res.json({
            success: true,
            data: cached[0].resultData,
            metadata: {
              ...cached[0].metadata,
              cached: true,
              cacheAge: Date.now() - new Date(cached[0].createdAt).getTime()
            }
          });
        }
      }
      
      // Execute query
      const queryService = DynamicQueryExecutionService.getInstance();
      const queryRequest = {
        systemId: widgetConfig.systemId,
        query: widgetConfig.query,
        method: widgetConfig.method,
        parameters: { ...widgetConfig.parameters, ...parameters },
        transformations: widgetConfig.transformations || [],
        timeout: 30000
      };
      
      const result = await queryService.executeQuery(queryRequest);
      
      // Cache result if successful and caching is enabled
      if (result.success && widgetConfig.cacheEnabled) {
        const expiresAt = new Date(Date.now() + (widgetConfig.refreshInterval * 1000));
        const crypto = await import('crypto');
        const queryHash = crypto.createHash('md5')
          .update(JSON.stringify(queryRequest))
          .digest('hex');
        
        await db
          .insert(widgetExecutionCache)
          .values({
            widgetId,
            queryHash,
            resultData: result.data,
            metadata: result.metadata || {},
            executionTime: result.metadata?.executionTime || null,
            expiresAt,
            isValid: true
          })
          .onConflictDoUpdate({
            target: [widgetExecutionCache.widgetId, widgetExecutionCache.queryHash],
            set: {
              resultData: result.data,
              metadata: result.metadata || {},
              executionTime: result.metadata?.executionTime || null,
              expiresAt,
              isValid: true,
              createdAt: sql`NOW()`
            }
          });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Failed to execute widget query:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Widget execution failed'
      });
    }
  });

  // Get all financial transactions
  app.get("/api/financial-transactions", requireAuth, requireManagerOrAbove, async (req, res) => {
    try {
      const transactions = await storage.getAllFinancialTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Get financial transactions error:", error);
      res.status(500).json({ message: "Failed to fetch financial transactions" });
    }
  });

  // Get client financial transactions  
  app.get("/api/clients/:id/financial-transactions", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      const transactions = await storage.getClientFinancialTransactions(clientId);
      res.json(transactions);
    } catch (error) {
      console.error("Get client financial transactions error:", error);
      res.status(500).json({ message: "Failed to fetch client financial transactions" });
    }
  });

  // Create financial transaction
  app.post("/api/financial-transactions", requireAuth, requireManagerOrAbove, async (req, res) => {
    try {
      const validatedData = apiFinancialTransactionSchema.parse(req.body);
      const transaction = await storage.createFinancialTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      }
      console.error("Create financial transaction error:", error);
      res.status(500).json({ message: "Failed to create financial transaction" });
    }
  });

  // Get client team assignments
  app.get("/api/clients/:id/team-assignments", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        console.log(`[TEAM ASSIGNMENTS] Invalid client ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      console.log(`[TEAM ASSIGNMENTS] Fetching team assignments for client ${clientId}`);
      
      // First check if client exists
      const client = await storage.getClient(clientId);
      if (!client) {
        console.log(`[TEAM ASSIGNMENTS] Client ${clientId} not found`);
        return res.status(404).json({ message: "Client not found" });
      }
      
      const assignments = await storage.getClientTeamAssignments(clientId);
      console.log(`[TEAM ASSIGNMENTS] Found ${assignments.length} assignments for client ${clientId}`);
      res.json(assignments);
    } catch (error) {
      console.error(`[TEAM ASSIGNMENTS] Error fetching assignments:`, error);
      res.status(500).json({ 
        message: "Failed to fetch client team assignments",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // ============================================================================
  // ENTITY RELATIONSHIPS API
  // ============================================================================

  /**
   * Get entity by type and ID
   * GET /api/entities/:type/:id
   */
  app.get("/api/entities/:type/:id", async (req: Request, res: Response) => {
    try {
      const { type, id } = req.params;
      const entityId = parseInt(id);

      if (isNaN(entityId)) {
        return res.status(400).json({ error: "Invalid entity ID" });
      }

      if (!Object.values(ENTITY_TYPES).includes(type as EntityType)) {
        return res.status(400).json({ error: "Invalid entity type" });
      }

      const entity = await entityRelationsService.getEntity(type as EntityType, entityId);
      
      if (!entity) {
        return res.status(404).json({ error: "Entity not found" });
      }

      res.json(entity);
    } catch (error) {
      console.error("Error fetching entity:", error);
      res.status(500).json({ error: "Failed to fetch entity" });
    }
  });

  /**
   * Get all relationships for an entity
   * GET /api/entities/:type/:id/relationships
   */
  app.get("/api/entities/:type/:id/relationships", async (req: Request, res: Response) => {
    try {
      const { type, id } = req.params;
      const entityId = parseInt(id);
      const { includeTypes, excludeTypes, limit } = req.query;

      if (isNaN(entityId)) {
        return res.status(400).json({ error: "Invalid entity ID" });
      }

      if (!Object.values(ENTITY_TYPES).includes(type as EntityType)) {
        return res.status(400).json({ error: "Invalid entity type" });
      }

      const options: any = {};

      if (includeTypes && typeof includeTypes === 'string') {
        options.includeTypes = includeTypes.split(',').filter(t => 
          Object.values(RELATIONSHIP_TYPES).includes(t as RelationshipType)
        );
      }

      if (excludeTypes && typeof excludeTypes === 'string') {
        options.excludeTypes = excludeTypes.split(',').filter(t => 
          Object.values(RELATIONSHIP_TYPES).includes(t as RelationshipType)
        );
      }

      if (limit && !isNaN(parseInt(limit as string))) {
        options.limit = parseInt(limit as string);
      }

      const relationships = await entityRelationsService.getEntityRelationships(
        type as EntityType, 
        entityId, 
        options
      );

      res.json(relationships);
    } catch (error) {
      console.error("Error fetching entity relationships:", error);
      res.status(500).json({ error: "Failed to fetch relationships" });
    }
  });

  /**
   * Get relationship statistics for an entity
   * GET /api/entities/:type/:id/relationships/stats
   */
  app.get("/api/entities/:type/:id/relationships/stats", async (req: Request, res: Response) => {
    try {
      const { type, id } = req.params;
      const entityId = parseInt(id);

      if (isNaN(entityId)) {
        return res.status(400).json({ error: "Invalid entity ID" });
      }

      if (!Object.values(ENTITY_TYPES).includes(type as EntityType)) {
        return res.status(400).json({ error: "Invalid entity type" });
      }

      const stats = await entityRelationsService.getRelationshipStats(
        type as EntityType, 
        entityId
      );

      res.json(stats);
    } catch (error) {
      console.error("Error fetching relationship stats:", error);
      res.status(500).json({ error: "Failed to fetch relationship statistics" });
    }
  });

  /**
   * Get related entities of a specific type
   * GET /api/entities/:type/:id/related/:relatedType
   */
  app.get("/api/entities/:type/:id/related/:relatedType", async (req: Request, res: Response) => {
    try {
      const { type, id, relatedType } = req.params;
      const { relationshipType } = req.query;
      const entityId = parseInt(id);

      if (isNaN(entityId)) {
        return res.status(400).json({ error: "Invalid entity ID" });
      }

      if (!Object.values(ENTITY_TYPES).includes(type as EntityType)) {
        return res.status(400).json({ error: "Invalid entity type" });
      }

      if (!Object.values(ENTITY_TYPES).includes(relatedType as EntityType)) {
        return res.status(400).json({ error: "Invalid related entity type" });
      }

      const relatedEntities = await entityRelationsService.getRelatedEntities(
        type as EntityType,
        entityId,
        relatedType as EntityType,
        relationshipType as RelationshipType
      );

      res.json(relatedEntities);
    } catch (error) {
      console.error("Error fetching related entities:", error);
      res.status(500).json({ error: "Failed to fetch related entities" });
    }
  });

  /**
   * Search entities across all types
   * GET /api/entities/search
   */
  app.get("/api/entities/search", async (req: Request, res: Response) => {
    try {
      const { 
        query, 
        entityTypes, 
        relationshipTypes, 
        limit = "20", 
        offset = "0" 
      } = req.query;

      const searchParams: any = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      if (query && typeof query === 'string') {
        searchParams.query = query;
      }

      if (entityTypes && typeof entityTypes === 'string') {
        searchParams.entityTypes = entityTypes.split(',').filter(t => 
          Object.values(ENTITY_TYPES).includes(t as EntityType)
        );
      }

      if (relationshipTypes && typeof relationshipTypes === 'string') {
        searchParams.relationshipTypes = relationshipTypes.split(',').filter(t => 
          Object.values(RELATIONSHIP_TYPES).includes(t as RelationshipType)
        );
      }

      const results = await entityRelationsService.searchEntities(searchParams);

      res.json(results);
    } catch (error) {
      console.error("Error searching entities:", error);
      res.status(500).json({ error: "Failed to search entities" });
    }
  });

  /**
   * Get entity definitions (metadata about entity types)
   * GET /api/entities/definitions
   */
  app.get("/api/entities/definitions", async (req: Request, res: Response) => {
    try {
      const { ENTITY_DEFINITIONS, RELATIONSHIP_MAPPINGS } = await import("@shared/entity-relations");
      
      res.json({
        entityTypes: ENTITY_DEFINITIONS,
        relationshipMappings: RELATIONSHIP_MAPPINGS,
        availableTypes: Object.values(ENTITY_TYPES),
        availableRelationshipTypes: Object.values(RELATIONSHIP_TYPES)
      });
    } catch (error) {
      console.error("Error fetching entity definitions:", error);
      res.status(500).json({ error: "Failed to fetch entity definitions" });
    }
  });

  // ========================================
  // SERVICE ENDPOINTS 
  // ========================================

  // Get all services
  app.get("/api/services", requireAuth, async (req, res) => {
    try {
      const services = await storage.getAllServices();
      res.json(services);
    } catch (error) {
      console.error("Get services error:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  // Get service by ID
  app.get("/api/services/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const service = await storage.getService(id);
      
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(service);
    } catch (error) {
      console.error("Get service error:", error);
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  // Create service
  app.post("/api/services", requireManagerOrAbove, async (req, res) => {
    try {
      const result = insertServiceSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid service data", 
          errors: result.error.issues 
        });
      }
      
      const newService = await storage.createService(result.data);
      res.status(201).json(newService);
    } catch (error) {
      console.error("Create service error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create service" 
      });
    }
  });

  // Update service
  app.put("/api/services/:id", requireManagerOrAbove, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const serviceData = req.body;
      const updatedService = await storage.updateService(id, serviceData);
      
      if (!updatedService) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(updatedService);
    } catch (error) {
      console.error("Update service error:", error);
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  // Patch service (partial update)
  app.patch("/api/services/:id", requireManagerOrAbove, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const serviceData = req.body;
      const updatedService = await storage.updateService(id, serviceData);
      
      if (!updatedService) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(updatedService);
    } catch (error) {
      console.error("Patch service error:", error);
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  // Delete service
  app.delete("/api/services/:id", requireManagerOrAbove, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteService(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json({ message: "Service deleted successfully" });
    } catch (error) {
      console.error("Delete service error:", error);
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  // Get service scope template
  app.get("/api/services/:id/scope-template", requireAdmin, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      
      // First verify the service exists
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      // Get the scope template (stored as JSON in the service record)
      const template = service.scopeDefinitionTemplate || null;
      
      res.json({
        template,
        serviceName: service.name,
        category: service.category,
        deliveryModel: service.deliveryModel
      });
    } catch (error) {
      console.error("Get scope template error:", error);
      res.status(500).json({ message: "Failed to fetch scope template" });
    }
  });

  // Update service scope template
  app.put("/api/services/:id/scope-template", requireAdmin, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { template } = req.body;
      
      // First verify the service exists
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      // Update the service with the new scope template
      const updatedService = await storage.updateService(serviceId, {
        scopeDefinitionTemplate: template
      });
      
      if (!updatedService) {
        return res.status(404).json({ message: "Failed to update service template" });
      }
      
      res.json({
        template: updatedService.scopeDefinitionTemplate,
        serviceName: updatedService.name,
        category: updatedService.category,
        deliveryModel: updatedService.deliveryModel
      });
    } catch (error) {
      console.error("Update scope template error:", error);
      res.status(500).json({ message: "Failed to update scope template" });
    }
  });

  // ========================================
  // USER MANAGEMENT ENDPOINTS 
  // ========================================

  // Get all users
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove sensitive data
      const sanitizedUsers = users.map(user => ({
        ...user,
        twoFactorSecret: undefined,
        twoFactorBackupCodes: undefined
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get user by ID
  app.get("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUserById(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove sensitive data
      const sanitizedUser = {
        ...user,
        twoFactorSecret: undefined,
        twoFactorBackupCodes: undefined
      };
      
      res.json(sanitizedUser);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ========================================
  // HARDWARE ASSET ENDPOINTS 
  // ========================================

  // Get all hardware assets
  app.get("/api/hardware-assets", requireAuth, async (req, res) => {
    try {
      const hardwareAssets = await storage.getAllHardwareAssets();
      res.json(hardwareAssets);
    } catch (error) {
      console.error("Get hardware assets error:", error);
      res.status(500).json({ message: "Failed to fetch hardware assets" });
    }
  });

  // Get hardware asset by ID
  app.get("/api/hardware-assets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.getHardwareAsset(id);
      
      if (!asset) {
        return res.status(404).json({ message: "Hardware asset not found" });
      }
      
      res.json(asset);
    } catch (error) {
      console.error("Get hardware asset error:", error);
      res.status(500).json({ message: "Failed to fetch hardware asset" });
    }
  });

  // Create hardware asset (supports bulk creation)
  app.post("/api/hardware-assets", requireManagerOrAbove, async (req, res) => {
    try {
      const { quantity = 1, ...assetData } = req.body;
      const result = apiHardwareAssetSchema.safeParse(assetData);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid hardware asset data", 
          errors: result.error.issues 
        });
      }
      
      const parsedAssetData = result.data;
      
      if (quantity === 1) {
        // Single asset creation
        const newAsset = await storage.createHardwareAsset(parsedAssetData);
        res.status(201).json(newAsset);
      } else {
        // Bulk asset creation
        if (quantity > 100) {
          return res.status(400).json({ message: "Maximum 100 assets can be created at once" });
        }
        
        const createdAssets = [];
        const baseSerialNumber = parsedAssetData.serialNumber || "";
        
        for (let i = 1; i <= quantity; i++) {
          const assetToCreate = {
            ...parsedAssetData,
            name: quantity > 1 ? `${parsedAssetData.name} #${i}` : parsedAssetData.name,
            serialNumber: baseSerialNumber 
              ? `${baseSerialNumber}-${i.toString().padStart(3, '0')}` 
              : undefined,
          };
          
          const newAsset = await storage.createHardwareAsset(assetToCreate);
          createdAssets.push(newAsset);
        }
        
        res.status(201).json({
          message: `${quantity} assets created successfully`,
          assets: createdAssets,
          count: createdAssets.length
        });
      }
    } catch (error) {
      console.error("Create hardware asset error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create hardware asset" 
      });
    }
  });

  // Update hardware asset
  app.put("/api/hardware-assets/:id", requireManagerOrAbove, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const assetData = req.body;
      const updatedAsset = await storage.updateHardwareAsset(id, assetData);
      
      if (!updatedAsset) {
        return res.status(404).json({ message: "Hardware asset not found" });
      }
      
      res.json(updatedAsset);
    } catch (error) {
      console.error("Update hardware asset error:", error);
      res.status(500).json({ message: "Failed to update hardware asset" });
    }
  });

  // Delete hardware asset
  app.delete("/api/hardware-assets/:id", requireManagerOrAbove, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteHardwareAsset(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Hardware asset not found" });
      }
      
      res.json({ message: "Hardware asset deleted successfully" });
    } catch (error) {
      console.error("Delete hardware asset error:", error);
      res.status(500).json({ message: "Failed to delete hardware asset" });
    }
  });

  // ========================================
  // LICENSE POOL ENDPOINTS 
  // ========================================

  // Get all license pools
  app.get("/api/license-pools", requireAuth, async (req, res) => {
    try {
      const licensePoolsList = await storage.getAllLicensePools();
      res.json(licensePoolsList);
    } catch (error) {
      console.error("Get license pools error:", error);
      res.status(500).json({ message: "Failed to fetch license pools" });
    }
  });

  // Get license pool by ID
  app.get("/api/license-pools/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const licensePool = await storage.getLicensePool(id);
      
      if (!licensePool) {
        return res.status(404).json({ message: "License pool not found" });
      }
      
      res.json(licensePool);
    } catch (error) {
      console.error("Get license pool error:", error);
      res.status(500).json({ message: "Failed to fetch license pool" });
    }
  });

  // Create license pool
  app.post("/api/license-pools", requireManagerOrAbove, async (req, res) => {
    try {
      const result = apiLicensePoolSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid license pool data", 
          errors: result.error.issues 
        });
      }
      
      const newLicensePool = await storage.createLicensePool(result.data);
      res.status(201).json(newLicensePool);
    } catch (error) {
      console.error("Create license pool error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create license pool" 
      });
    }
  });

  // Update license pool
  app.put("/api/license-pools/:id", requireManagerOrAbove, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const licenseData = req.body;
      const updatedLicensePool = await storage.updateLicensePool(id, licenseData);
      
      if (!updatedLicensePool) {
        return res.status(404).json({ message: "License pool not found" });
      }
      
      res.json(updatedLicensePool);
    } catch (error) {
      console.error("Update license pool error:", error);
      res.status(500).json({ message: "Failed to update license pool" });
    }
  });

  // Delete license pool
  app.delete("/api/license-pools/:id", requireManagerOrAbove, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteLicensePool(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "License pool not found" });
      }
      
      res.json({ message: "License pool deleted successfully" });
    } catch (error) {
      console.error("Delete license pool error:", error);
      res.status(500).json({ message: "Failed to delete license pool" });
    }
  });

  // Get license pool allocations
  app.get("/api/license-pools/:id/allocations", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const allocations = await storage.getLicensePoolAllocations(id);
      res.json(allocations);
    } catch (error) {
      console.error("Get license pool allocations error:", error);
      res.status(500).json({ message: "Failed to fetch license pool allocations" });
    }
  });

  // Get all license pool allocations (grouped by pool)
  app.get("/api/license-pools/allocations/all", requireAuth, async (req, res) => {
    try {
      const allocations = await storage.getAllLicensePoolAllocations();
      res.json(allocations);
    } catch (error) {
      console.error("Get all license pool allocations error:", error);
      res.status(500).json({ message: "Failed to fetch license pool allocations" });
    }
  });

  // Get license pools summary for dashboard
  app.get("/api/license-pools/summary", requireAuth, async (req, res) => {
    try {
      // Get all license pools
      const pools = await storage.getAllLicensePools();
      
      // Get all allocations to calculate utilization
      const allocations = await storage.getAllLicensePoolAllocations();
      
      // Calculate summary statistics
      let totalPools = pools.length;
      let totalLicenses = 0;
      let totalAvailable = 0;
      let totalAssigned = 0;
      let totalCost = 0;
      let healthyPools = 0;
      let warningPools = 0;
      let criticalPools = 0;
      let expiringPools = 0;
      
      const now = new Date();
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(now.getMonth() + 3);
      
      const poolsWithStats = pools.map(pool => {
        const poolAllocations = allocations[pool.id] || [];
        const assignedLicenses = poolAllocations.reduce((sum, alloc) => sum + alloc.assignedLicenses, 0);
        const utilizationPercentage = pool.totalLicenses > 0 
          ? (assignedLicenses / pool.totalLicenses) * 100 
          : 0;
        
        // Calculate status based on utilization
        let status: 'healthy' | 'warning' | 'critical';
        if (utilizationPercentage >= 90) {
          status = 'critical';
          criticalPools++;
        } else if (utilizationPercentage >= 75) {
          status = 'warning';
          warningPools++;
        } else {
          status = 'healthy';
          healthyPools++;
        }
        
        // Check if expiring soon
        if (pool.renewalDate && new Date(pool.renewalDate) <= threeMonthsFromNow) {
          expiringPools++;
        }
        
        // Add to totals
        totalLicenses += pool.totalLicenses;
        totalAvailable += pool.availableLicenses;
        totalAssigned += assignedLicenses;
        
        if (pool.costPerLicense) {
          totalCost += parseFloat(pool.costPerLicense.toString()) * pool.totalLicenses;
        }
        
        return {
          id: pool.id,
          name: pool.name,
          vendor: pool.vendor,
          productName: pool.productName,
          licenseType: pool.licenseType,
          totalLicenses: pool.totalLicenses,
          availableLicenses: pool.availableLicenses,
          assignedLicenses,
          utilizationPercentage,
          status,
          renewalDate: pool.renewalDate?.toISOString(),
          costPerLicense: pool.costPerLicense ? parseFloat(pool.costPerLicense.toString()) : undefined,
          isActive: pool.isActive,
        };
      });
      
      // Sort pools by utilization percentage (highest first) for dashboard preview
      poolsWithStats.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);
      
      const summary = {
        totalPools,
        totalLicenses,
        totalAvailable,
        totalAssigned,
        healthyPools,
        warningPools,
        criticalPools,
        totalCost,
        expiringPools,
        pools: poolsWithStats,
      };
      
      res.json(summary);
    } catch (error) {
      console.error("Get license pools summary error:", error);
      res.status(500).json({ message: "Failed to fetch license pools summary" });
    }
  });

  // Get individual license pool statistics
  app.get("/api/license-pools/:id/stats", requireAuth, async (req, res) => {
    try {
      const poolId = parseInt(req.params.id);
      
      // Get the specific license pool
      const pool = await storage.getLicensePool(poolId);
      if (!pool) {
        return res.status(404).json({ message: "License pool not found" });
      }
      
      // Get allocations for this pool
      const allocations = await storage.getAllLicensePoolAllocations();
      const poolAllocations = allocations[poolId] || [];
      const assignedLicenses = poolAllocations.reduce((sum, alloc) => sum + alloc.assignedLicenses, 0);
      
      // Calculate utilization percentage
      const utilizationPercentage = pool.totalLicenses > 0 
        ? (assignedLicenses / pool.totalLicenses) * 100 
        : 0;
      
      // Calculate status based on utilization
      let status: 'healthy' | 'warning' | 'critical';
      if (utilizationPercentage >= 90) {
        status = 'critical';
      } else if (utilizationPercentage >= 75) {
        status = 'warning';
      } else {
        status = 'healthy';
      }
      
      // Calculate total cost for this pool
      const totalCost = pool.costPerLicense 
        ? parseFloat(pool.costPerLicense.toString()) * pool.totalLicenses 
        : undefined;
      
      const poolStats = {
        id: pool.id,
        name: pool.name,
        vendor: pool.vendor,
        productName: pool.productName,
        licenseType: pool.licenseType,
        totalLicenses: pool.totalLicenses,
        orderedLicenses: pool.orderedLicenses || pool.totalLicenses,
        availableLicenses: pool.availableLicenses,
        assignedLicenses,
        utilizationPercentage,
        status,
        renewalDate: pool.renewalDate?.toISOString(),
        costPerLicense: pool.costPerLicense ? parseFloat(pool.costPerLicense.toString()) : undefined,
        totalCost,
        isActive: pool.isActive,
        purchaseRequestNumber: pool.purchaseRequestNumber,
        purchaseOrderNumber: pool.purchaseOrderNumber,
        notes: pool.notes,
        createdAt: pool.createdAt?.toISOString(),
        updatedAt: pool.updatedAt?.toISOString(),
      };
      
      res.json(poolStats);
    } catch (error) {
      console.error("Get license pool stats error:", error);
      res.status(500).json({ message: "Failed to fetch license pool statistics" });
    }
  });

  // Get license pool assignments
  app.get("/api/license-pools/:id/assignments", requireAuth, async (req, res) => {
    try {
      const poolId = parseInt(req.params.id);
      
      // Get the specific license pool to verify it exists
      const pool = await storage.getLicensePool(poolId);
      if (!pool) {
        return res.status(404).json({ message: "License pool not found" });
      }
      
      // Get all client licenses for this pool
      const clientLicenseData = await db
            .select({
          id: clientLicenses.id,
          clientId: clientLicenses.clientId,
          assignedLicenses: clientLicenses.assignedLicenses,
          assignedDate: clientLicenses.assignedDate,
          notes: clientLicenses.notes,
          clientName: clients.name,
        })
        .from(clientLicenses)
        .leftJoin(clients, eq(clientLicenses.clientId, clients.id))
        .where(eq(clientLicenses.licensePoolId, poolId))
        .orderBy(desc(clientLicenses.assignedDate));
      
      res.json(clientLicenseData);
    } catch (error) {
      console.error("Get license pool assignments error:", error);
      res.status(500).json({ message: "Failed to fetch license pool assignments" });
    }
  });

  // Get license pool usage statistics
  app.get("/api/license-pools/:id/usage-stats", requireAuth, async (req, res) => {
    try {
      const poolId = parseInt(req.params.id);
      
      // Get the specific license pool to verify it exists
      const pool = await storage.getLicensePool(poolId);
      if (!pool) {
        return res.status(404).json({ message: "License pool not found" });
      }
      
      // For now, return mock data for usage statistics
      // In a real implementation, this would query historical data
      const currentDate = new Date();
      const daily = [];
      const monthly = [];
      
      // Generate mock daily data for the past 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        
        // Mock some variation in usage
        const baseAssigned = pool.totalLicenses - pool.availableLicenses;
        const variation = Math.floor(Math.random() * 10) - 5; // ±5 variation
        const assigned = Math.max(0, Math.min(pool.totalLicenses, baseAssigned + variation));
        
        daily.push({
          date: date.toISOString().split('T')[0],
          assigned,
          available: pool.totalLicenses - assigned
        });
      }
      
      // Generate mock monthly data for the past 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        
        // Mock some variation in usage
        const baseAssigned = pool.totalLicenses - pool.availableLicenses;
        const variation = Math.floor(Math.random() * 20) - 10; // ±10 variation
        const assigned = Math.max(0, Math.min(pool.totalLicenses, baseAssigned + variation));
        
        monthly.push({
          month: date.toISOString().substring(0, 7), // YYYY-MM format
          assigned,
          available: pool.totalLicenses - assigned
        });
      }
      
      // Determine trend based on recent data
      const recentAssigned = daily.slice(-7).reduce((sum, day) => sum + day.assigned, 0) / 7;
      const olderAssigned = daily.slice(-14, -7).reduce((sum, day) => sum + day.assigned, 0) / 7;
      
      let trend: 'increasing' | 'decreasing' | 'stable';
      const difference = recentAssigned - olderAssigned;
      if (difference > 2) {
        trend = 'increasing';
      } else if (difference < -2) {
        trend = 'decreasing';
      } else {
        trend = 'stable';
      }
      
      const usageStats = {
        daily,
        monthly,
        trend
      };
      
      res.json(usageStats);
    } catch (error) {
      console.error("Get license pool usage stats error:", error);
      res.status(500).json({ message: "Failed to fetch license pool usage statistics" });
    }
  });

  // ========================================
  // REPORTS ENDPOINTS
  // ========================================

  // Get dashboard reports
  app.get("/api/reports/dashboard", requireAuth, async (req, res) => {
    try {
      const reports = {
        clientSummary: await storage.getClientSummaryReport(),
        financialSummary: await storage.getFinancialSummaryReport(),
        licenseSummary: await storage.getLicenseSummaryReport(),
        contractSummary: await storage.getContractSummaryReport()
      };
      res.json(reports);
    } catch (error) {
      console.error("Get dashboard reports error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard reports" });
    }
  });

  // Get client reports
  app.get("/api/reports/clients", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate, status } = req.query;
      const reports = await storage.getClientReports({
        startDate: startDate as string,
        endDate: endDate as string,
        status: status as string
      });
      res.json(reports);
    } catch (error) {
      console.error("Get client reports error:", error);
      res.status(500).json({ message: "Failed to fetch client reports" });
    }
  });

  // Get financial reports
  app.get("/api/reports/financial", requireManagerOrAbove, async (req, res) => {
    try {
      const { startDate, endDate, clientId } = req.query;
      const reports = await storage.getFinancialReports({
        startDate: startDate as string,
        endDate: endDate as string,
        clientId: clientId ? parseInt(clientId as string) : undefined
      });
      res.json(reports);
    } catch (error) {
      console.error("Get financial reports error:", error);
      res.status(500).json({ message: "Failed to fetch financial reports" });
    }
  });

  // Get license utilization reports
  app.get("/api/reports/licenses", requireAuth, async (req, res) => {
    try {
      const reports = await storage.getLicenseUtilizationReports();
      res.json(reports);
    } catch (error) {
      console.error("Get license reports error:", error);
      res.status(500).json({ message: "Failed to fetch license reports" });
    }
  });

  // Generate custom report
  app.post("/api/reports/custom", requireAuth, async (req, res) => {
    try {
      const reportConfig = req.body;
      const report = await storage.generateCustomReport(reportConfig);
      res.json(report);
    } catch (error) {
      console.error("Generate custom report error:", error);
      res.status(500).json({ message: "Failed to generate custom report" });
    }
  });

  // Export report
  app.post("/api/reports/export", requireAuth, async (req, res) => {
    try {
      const { reportType, format, data } = req.body;
      const exportData = await storage.exportReport(reportType, format, data);
      
      res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="report.${format}"`);
      res.send(exportData);
    } catch (error) {
      console.error("Export report error:", error);
      res.status(500).json({ message: "Failed to export report" });
    }
  });

  // ========================================
  // PROPOSAL ENDPOINTS 
  // ========================================

  // Get all proposals
  app.get("/api/proposals", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.query;
      
      let whereConditions: any[] = [];
      if (clientId) {
        // We'll need to join with contracts table to get clientId
        const contractsWithClient = await db
          .select({ id: contracts.id })
            .from(contracts)
          .where(eq(contracts.clientId, parseInt(clientId as string)));
        
        const contractIds = contractsWithClient.map(c => c.id);
        if (contractIds.length > 0) {
          whereConditions.push(inArray(proposals.contractId, contractIds));
        } else {
          // No contracts for this client, return empty array
          return res.json([]);
        }
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const proposalsData = await db
        .select({
          id: proposals.id,
          contractId: proposals.contractId,
          type: proposals.type,
          version: proposals.version,
          status: proposals.status,
          documentUrl: proposals.documentUrl,
          proposedValue: proposals.proposedValue,
          notes: proposals.notes,
          createdAt: proposals.createdAt,
          updatedAt: proposals.updatedAt,
          contractName: contracts.name,
          clientId: contracts.clientId,
          clientName: clients.name,
        })
        .from(proposals)
        .leftJoin(contracts, eq(proposals.contractId, contracts.id))
        .leftJoin(clients, eq(contracts.clientId, clients.id))
        .where(whereClause)
        .orderBy(desc(proposals.createdAt));

      res.json(proposalsData);
    } catch (error) {
      console.error("Get proposals error:", error);
      res.status(500).json({ message: "Failed to fetch proposals" });
    }
  });

  // Get proposal by ID
  app.get("/api/proposals/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const [proposalData] = await db
        .select({
          id: proposals.id,
          contractId: proposals.contractId,
          type: proposals.type,
          version: proposals.version,
          status: proposals.status,
          documentUrl: proposals.documentUrl,
          proposedValue: proposals.proposedValue,
          notes: proposals.notes,
          createdAt: proposals.createdAt,
          updatedAt: proposals.updatedAt,
          contractName: contracts.name,
          clientId: contracts.clientId,
          clientName: clients.name,
        })
        .from(proposals)
        .leftJoin(contracts, eq(proposals.contractId, contracts.id))
        .leftJoin(clients, eq(contracts.clientId, clients.id))
        .where(eq(proposals.id, id))
        .limit(1);

      if (!proposalData) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      res.json(proposalData);
    } catch (error) {
      console.error("Get proposal error:", error);
      res.status(500).json({ message: "Failed to fetch proposal" });
    }
  });

  // Get client licenses
  app.get("/api/clients/:id/licenses", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const licenses = await storage.getClientLicenses(clientId);
      res.json(licenses);
    } catch (error) {
      console.error("Get client licenses error:", error);
      res.status(500).json({ message: "Failed to fetch client licenses" });
    }
  });

  // ========================================
  // LICENSE POOLS ENDPOINTS
  // ========================================

  // Get all license pools

  // Get license pool by ID

  // Create license pool

  // Update license pool

  // Delete license pool

  // Create client license assignment
  app.post("/api/clients/:id/licenses", requireManagerOrAbove, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const licenseData = {
        ...req.body,
        clientId,
        assignedDate: new Date(),
      };
      
      const newLicense = await storage.createClientLicense(licenseData);
      res.status(201).json(newLicense);
    } catch (error) {
      console.error("Create client license error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to assign license to client" 
      });
    }
  });

  // Get client hardware
  app.get("/api/clients/:id/hardware", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        console.log(`[CLIENT HARDWARE] Invalid client ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      console.log(`[CLIENT HARDWARE] Fetching hardware assignments for client ${clientId}`);
      
      // First check if client exists
      const client = await storage.getClient(clientId);
      if (!client) {
        console.log(`[CLIENT HARDWARE] Client ${clientId} not found`);
        return res.status(404).json({ message: "Client not found" });
      }
      
      const hardware = await storage.getClientHardwareAssignments(clientId);
      console.log(`[CLIENT HARDWARE] Found ${hardware.length} hardware assignments for client ${clientId}`);
      res.json(hardware);
    } catch (error) {
      console.error("[CLIENT HARDWARE] Error fetching client hardware:", error);
      console.error("[CLIENT HARDWARE] Stack trace:", error.stack);
      res.status(500).json({ 
        message: "Failed to fetch client hardware",
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Get contract service scopes
  app.get("/api/contracts/:id/service-scopes", requireAuth, async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      if (isNaN(contractId)) {
        console.log(`[SERVICE SCOPES] Invalid contract ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid contract ID" });
      }
      
      console.log(`[SERVICE SCOPES] Fetching service scopes for contract ${contractId}`);
      
      // First check if contract exists
      const contract = await storage.getContract(contractId);
      if (!contract) {
        console.log(`[SERVICE SCOPES] Contract ${contractId} not found`);
        return res.status(404).json({ message: "Contract not found" });
      }
      
      const serviceScopes = await storage.getContractServiceScopes(contractId);
      console.log(`[SERVICE SCOPES] Found ${serviceScopes.length} service scopes for contract ${contractId}`);
      res.json(serviceScopes);
    } catch (error) {
      console.error(`[SERVICE SCOPES] Error fetching service scopes:`, error);
      res.status(500).json({ 
        message: "Failed to fetch contract service scopes",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Get service authorization forms
  app.get("/api/service-audit-forms", requireAuth, async (req, res) => {
    try {
      const { contractId } = req.query;
      
      let whereConditions: any[] = [];
      if (contractId) {
        whereConditions.push(eq(serviceAuthorizationForms.contractId, parseInt(contractId as string)));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const safs = await db
            .select({
          id: serviceAuthorizationForms.id,
          clientId: serviceAuthorizationForms.clientId,
          contractId: serviceAuthorizationForms.contractId,
          serviceScopeId: serviceAuthorizationForms.serviceScopeId,
          safNumber: serviceAuthorizationForms.safNumber,
          title: serviceAuthorizationForms.title,
          description: serviceAuthorizationForms.description,
          startDate: serviceAuthorizationForms.startDate,
          endDate: serviceAuthorizationForms.endDate,
          status: serviceAuthorizationForms.status,
          documentUrl: serviceAuthorizationForms.documentUrl,
          approvedBy: serviceAuthorizationForms.approvedBy,
          approvedDate: serviceAuthorizationForms.approvedDate,
          value: serviceAuthorizationForms.value,
          notes: serviceAuthorizationForms.notes,
          createdAt: serviceAuthorizationForms.createdAt,
          updatedAt: serviceAuthorizationForms.updatedAt,
          clientName: clients.name,
          contractName: contracts.name,
        })
        .from(serviceAuthorizationForms)
        .leftJoin(clients, eq(serviceAuthorizationForms.clientId, clients.id))
        .leftJoin(contracts, eq(serviceAuthorizationForms.contractId, contracts.id))
        .where(whereClause)
        .orderBy(desc(serviceAuthorizationForms.createdAt));

      res.json(safs);
    } catch (error) {
      console.error("Get service authorization forms error:", error);
      res.status(500).json({ message: "Failed to fetch service authorization forms" });
    }
  });

  // ========================================
  // SERVICE SCOPE FIELDS ENDPOINTS (New Table-Based Approach)
  // ========================================

  // Get service scope fields
  app.get("/api/services/:id/scope-fields", requireAdmin, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      
      // First verify the service exists
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      const scopeFields = await storage.getServiceScopeFields(serviceId);
      
      res.json({
        fields: scopeFields,
        serviceName: service.name,
        category: service.category,
        deliveryModel: service.deliveryModel
      });
    } catch (error) {
      console.error("Get scope fields error:", error);
      res.status(500).json({ message: "Failed to fetch scope fields" });
    }
  });

  // Create service scope field
  app.post("/api/services/:id/scope-fields", requireAdmin, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const fieldData = req.body;
      
      // First verify the service exists
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      const newField = await storage.createServiceScopeField({
        ...fieldData,
        serviceId
      });
      
      res.status(201).json(newField);
    } catch (error) {
      console.error("Create scope field error:", error);
      res.status(500).json({ message: "Failed to create scope field" });
    }
  });

  // Update service scope field
  app.put("/api/services/:serviceId/scope-fields/:fieldId", requireAdmin, async (req, res) => {
    try {
      const fieldId = parseInt(req.params.fieldId);
      const fieldData = req.body;
      
      const updatedField = await storage.updateServiceScopeField(fieldId, fieldData);
      
      if (!updatedField) {
        return res.status(404).json({ message: "Scope field not found" });
      }
      
      res.json(updatedField);
    } catch (error) {
      console.error("Update scope field error:", error);
      res.status(500).json({ message: "Failed to update scope field" });
    }
  });

  // Delete service scope field
  app.delete("/api/services/:serviceId/scope-fields/:fieldId", requireAdmin, async (req, res) => {
    try {
      const fieldId = parseInt(req.params.fieldId);
      
      const deleted = await storage.deleteServiceScopeField(fieldId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Scope field not found" });
      }
      
      res.json({ message: "Scope field deleted successfully" });
    } catch (error) {
      console.error("Delete scope field error:", error);
      res.status(500).json({ message: "Failed to delete scope field" });
    }
  });

  // ========================================
  // CERTIFICATES OF COMPLIANCE ENDPOINTS
  // ========================================

  // Get all certificates of compliance

  // Create certificate of compliance

  // Get certificate of compliance by ID
  app.get("/api/certificates-of-compliance/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const [coc] = await db
        .select()
        .from(certificatesOfCompliance)
        .where(eq(certificatesOfCompliance.id, id))
        .limit(1);

      if (!coc) {
        return res.status(404).json({ message: "Certificate of compliance not found" });
      }

      res.json(coc);
    } catch (error) {
      console.error("Get certificate of compliance error:", error);
      res.status(500).json({ message: "Failed to fetch certificate of compliance" });
    }
  });

  // Update certificate of compliance
  app.put("/api/certificates-of-compliance/:id", requireManagerOrAbove, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Handle date fields
      if (updateData.issueDate) {
        updateData.issueDate = new Date(updateData.issueDate);
      }
      if (updateData.expiryDate) {
        updateData.expiryDate = new Date(updateData.expiryDate);
      }
      if (updateData.auditDate) {
        updateData.auditDate = new Date(updateData.auditDate);
      }
      if (updateData.nextAuditDate) {
        updateData.nextAuditDate = new Date(updateData.nextAuditDate);
      }

      const [updatedCOC] = await db
        .update(certificatesOfCompliance)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(certificatesOfCompliance.id, id))
        .returning();

      if (!updatedCOC) {
        return res.status(404).json({ message: "Certificate of compliance not found" });
      }

      res.json(updatedCOC);
    } catch (error) {
      console.error("Update certificate of compliance error:", error);
      res.status(500).json({ message: "Failed to update certificate of compliance" });
    }
  });

  // Delete certificate of compliance

  // ========================================
  // SERVICE AUTHORIZATION FORMS (SAF) ENDPOINTS
  // ========================================

  // Get team assignments
  app.get("/api/team-assignments", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.query;
      
      let whereConditions: any[] = [];
      
      if (clientId) {
        whereConditions.push(eq(clientTeamAssignments.clientId, parseInt(clientId as string)));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const assignments = await db
        .select()
        .from(clientTeamAssignments)
        .where(whereClause)
        .orderBy(desc(clientTeamAssignments.assignedDate));

      res.json(assignments);
    } catch (error) {
      console.error("Get team assignments error:", error);
      res.status(500).json({ message: "Failed to fetch team assignments" });
    }
  });

  // Get all SAFs
  app.get("/api/service-authorization-forms", requireAuth, async (req, res) => {
    try {
      const { contractId, clientId } = req.query;
      
      let whereConditions: any[] = [];
      
      if (contractId) {
        whereConditions.push(eq(serviceAuthorizationForms.contractId, parseInt(contractId as string)));
      }
      
      if (clientId) {
        whereConditions.push(eq(serviceAuthorizationForms.clientId, parseInt(clientId as string)));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const safs = await db
        .select()
        .from(serviceAuthorizationForms)
        .where(whereClause)
        .orderBy(desc(serviceAuthorizationForms.createdAt));

      res.json(safs);
    } catch (error) {
      console.error("Get service authorization forms error:", error);
      res.status(500).json({ message: "Failed to fetch service authorization forms" });
    }
  });

  // Get all SAFs for a specific client

  // Update SAF
  app.put("/api/service-authorization-forms/:id", requireManagerOrAbove, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get existing SAF for audit comparison
      const [existingSAF] = await db
        .select()
        .from(serviceAuthorizationForms)
        .where(eq(serviceAuthorizationForms.id, id))
        .limit(1);

      if (!existingSAF) {
        return res.status(404).json({ message: "Service Authorization Form not found" });
      }

      const updateData = { ...req.body };
      if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
      if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
      if (updateData.approvedDate) updateData.approvedDate = new Date(updateData.approvedDate);

      const [updatedSAF] = await db
        .update(serviceAuthorizationForms)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(serviceAuthorizationForms.id, id))
        .returning();

      if (!updatedSAF) {
        return res.status(404).json({ message: "Service Authorization Form not found" });
      }

      // Add audit logging for SAF update
      try {
        const { AuditLogger, detectChanges } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        const changes = detectChanges(existingSAF, updatedSAF);
        
        if (changes.length > 0) {
          await auditLogger.logUpdate(
            'service_authorization_form',
            updatedSAF.id,
            updatedSAF.safNumber,
            changes,
            existingSAF
          );
          console.log(`✅ Audit logging completed for SAF update (${changes.length} changes)`);
        }
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for SAF update:', auditError.message);
      }

      res.json(updatedSAF);
    } catch (error) {
      console.error("Update SAF error:", error);
      res.status(500).json({ message: "Failed to update Service Authorization Form" });
    }
  });

  // Dashboard drill-down endpoints
  app.get("/api/dashboard/drilldown/:metric", requireAuth, async (req, res) => {
    try {
      const { metric } = req.params;
      const { timeRange = 'this_month' } = req.query;

      // Calculate date range based on timeRange parameter
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'this_week':
          const dayOfWeek = now.getDay();
          startDate = new Date(now.getTime() - (dayOfWeek * 24 * 60 * 60 * 1000));
          break;
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'this_quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'this_year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'last_30_days':
        default:
          startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      }

      let drilldownData: any = {};

      switch (metric) {
        case 'client-satisfaction':
          // Mock client satisfaction data
          drilldownData = {
            title: 'Client Satisfaction Analysis',
            chartType: 'bar',
            data: [
              { name: 'Very Satisfied', value: 35, percentage: 35 },
              { name: 'Satisfied', value: 40, percentage: 40 },
              { name: 'Neutral', value: 15, percentage: 15 },
              { name: 'Unsatisfied', value: 7, percentage: 7 },
              { name: 'Very Unsatisfied', value: 3, percentage: 3 },
            ],
            summary: {
              totalResponses: 100,
              averageRating: 4.2,
              trend: '+5.2%',
              trendDirection: 'up'
            },
            details: [
              { client: 'TechCorp Inc.', rating: 5, feedback: 'Excellent service delivery' },
              { client: 'GlobalSoft LLC', rating: 4, feedback: 'Good response time' },
              { client: 'DataFlow Systems', rating: 3, feedback: 'Room for improvement' },
            ]
          };
          break;

        case 'clients-industry':
          // Get real client industry distribution
          const industryData = await db
            .select({
              industry: clients.industry,
              count: count()
            })
            .from(clients)
            .where(gte(clients.createdAt, startDate))
            .groupBy(clients.industry);

          drilldownData = {
            title: 'Clients by Industry',
            chartType: 'pie',
            data: industryData.map(item => ({
              name: item.industry || 'Other',
              value: item.count,
              percentage: 0 // Will be calculated below
            })),
            summary: {
              totalClients: industryData.reduce((sum, item) => sum + item.count, 0),
              topIndustry: industryData.length > 0 ? industryData[0].industry : 'N/A',
              diversityIndex: industryData.length
            }
          };
          break;

        case 'revenue-trends':
          // Get revenue trends from contracts
          const revenueData = await db
            .select({
              month: sql<string>`to_char(${contracts.createdAt}, 'YYYY-MM')`,
              revenue: sum(contracts.totalValue)
            })
            .from(contracts)
            .where(gte(contracts.createdAt, startDate))
            .groupBy(sql`to_char(${contracts.createdAt}, 'YYYY-MM')`)
            .orderBy(sql`to_char(${contracts.createdAt}, 'YYYY-MM')`);

          drilldownData = {
            title: 'Revenue Trends',
            chartType: 'line',
            data: revenueData.map(item => ({
              name: item.month,
              value: parseFloat(item.revenue || '0'),
              date: item.month
            })),
            summary: {
              totalRevenue: revenueData.reduce((sum, item) => sum + parseFloat(item.revenue || '0'), 0),
              averageMonthly: revenueData.length > 0 ? 
                revenueData.reduce((sum, item) => sum + parseFloat(item.revenue || '0'), 0) / revenueData.length : 0,
              trend: revenueData.length >= 2 ? 
                ((parseFloat(revenueData[revenueData.length - 1].revenue || '0') - 
                  parseFloat(revenueData[0].revenue || '0')) / parseFloat(revenueData[0].revenue || '1') * 100).toFixed(1) : '0'
            }
          };
          break;

        case 'contract-status':
          // Get contract status distribution
          const statusData = await db
            .select({
              status: contracts.status,
              count: count(),
              totalValue: sum(contracts.totalValue)
            })
            .from(contracts)
            .where(gte(contracts.createdAt, startDate))
            .groupBy(contracts.status);

          drilldownData = {
            title: 'Contract Status Distribution',
            chartType: 'doughnut',
            data: statusData.map(item => ({
              name: item.status,
              value: item.count,
              totalValue: parseFloat(item.totalValue || '0'),
              percentage: 0 // Will be calculated below
            })),
            summary: {
              totalContracts: statusData.reduce((sum, item) => sum + item.count, 0),
              totalValue: statusData.reduce((sum, item) => sum + parseFloat(item.totalValue || '0'), 0),
              activeContracts: statusData.find(item => item.status === 'active')?.count || 0
            }
          };
          break;

        case 'service-utilization':
          // Get service utilization data
          const serviceData = await db
            .select({
              name: services.name,
              contractCount: count()
            })
            .from(services)
            .leftJoin(contracts, eq(services.id, contracts.serviceId))
            .where(gte(contracts.createdAt, startDate))
            .groupBy(services.id, services.name)
            .orderBy(desc(count()));

          drilldownData = {
            title: 'Service Utilization',
            chartType: 'bar',
            data: serviceData.map(item => ({
              name: item.name,
              value: item.contractCount,
              percentage: 0 // Will be calculated below
            })),
            summary: {
              totalServices: serviceData.length,
              mostPopularService: serviceData.length > 0 ? serviceData[0].name : 'N/A',
              averageUtilization: serviceData.length > 0 ? 
                serviceData.reduce((sum, item) => sum + item.contractCount, 0) / serviceData.length : 0
            }
          };
          break;

        case 'license-utilization':
          // Get license pool utilization
          const licenseData = await storage.getAllLicensePools();
          const allocations = await storage.getAllLicensePoolAllocations();
          
          const licenseUtilization = licenseData.map(pool => {
            const poolAllocations = allocations[pool.id] || [];
            const assignedLicenses = poolAllocations.reduce((sum, alloc) => sum + alloc.assignedLicenses, 0);
            const utilizationPercentage = pool.totalLicenses > 0 ? (assignedLicenses / pool.totalLicenses) * 100 : 0;
            
            return {
              name: `${pool.vendor} ${pool.productName}`,
              value: utilizationPercentage,
              assigned: assignedLicenses,
              total: pool.totalLicenses,
              available: pool.availableLicenses
            };
          });

          drilldownData = {
            title: 'License Pool Utilization',
            chartType: 'horizontal-bar',
            data: licenseUtilization,
            summary: {
              totalPools: licenseData.length,
              averageUtilization: licenseUtilization.length > 0 ? 
                licenseUtilization.reduce((sum, item) => sum + item.value, 0) / licenseUtilization.length : 0,
              fullyUtilized: licenseUtilization.filter(item => item.value >= 90).length,
              underUtilized: licenseUtilization.filter(item => item.value < 50).length
            }
          };
          break;

        case 'hardware-assets':
          // Get hardware asset distribution
          const hardwareData = await db
            .select({
              category: hardwareAssets.category,
              count: count()
            })
            .from(hardwareAssets)
            .where(gte(hardwareAssets.createdAt, startDate))
            .groupBy(hardwareAssets.category);

          drilldownData = {
            title: 'Hardware Assets by Category',
            chartType: 'pie',
            data: hardwareData.map(item => ({
              name: item.category || 'Other',
              value: item.count,
              percentage: 0
            })),
            summary: {
              totalAssets: hardwareData.reduce((sum, item) => sum + item.count, 0),
              categories: hardwareData.length,
              topCategory: hardwareData.length > 0 ? hardwareData[0].category : 'N/A'
            }
          };
          break;

        default:
          // Default fallback with mock data
          drilldownData = {
            title: `${metric.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Analysis`,
            chartType: 'bar',
            data: [
              { name: 'Category A', value: Math.floor(Math.random() * 100), percentage: 0 },
              { name: 'Category B', value: Math.floor(Math.random() * 100), percentage: 0 },
              { name: 'Category C', value: Math.floor(Math.random() * 100), percentage: 0 },
            ],
            summary: {
              total: Math.floor(Math.random() * 1000),
              trend: `${Math.floor(Math.random() * 20) - 10}%`,
              period: timeRange
            }
          };
      }

      // Calculate percentages for data arrays
      if (drilldownData.data && Array.isArray(drilldownData.data)) {
        const total = drilldownData.data.reduce((sum: number, item: any) => sum + item.value, 0);
        drilldownData.data = drilldownData.data.map((item: any) => ({
          ...item,
          percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
        }));
      }

      res.json({
        metric,
        timeRange,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        ...drilldownData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Dashboard drill-down error:', error);
      res.status(500).json({ error: 'Failed to fetch drill-down data' });
    }
  });

  // User Dashboard Settings API
  app.get('/api/user-dashboard-settings', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Get user's dashboard settings
      const settings = await storage.getUserDashboardSettings(userId);
      
      res.json(settings);
    } catch (error) {
      console.error('Error fetching user dashboard settings:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard settings' });
    }
  });

  app.post('/api/user-dashboard-settings', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { cards } = req.body;
      
      if (!Array.isArray(cards)) {
        return res.status(400).json({ error: 'Invalid cards format' });
      }
      
      // Save user's dashboard settings
      await storage.saveUserDashboardSettings(userId, cards);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving user dashboard settings:', error);
      res.status(500).json({ error: 'Failed to save dashboard settings' });
    }
  });

  app.put('/api/user-dashboard-settings/:cardId', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { cardId } = req.params;
      const updates = req.body;
      
      // Update specific card settings
      await storage.updateUserDashboardCard(userId, cardId, updates);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating dashboard card:', error);
      res.status(500).json({ error: 'Failed to update dashboard card' });
    }
  });

  app.delete('/api/user-dashboard-settings/:cardId', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { cardId } = req.params;
      
      console.log(`=== DELETE DASHBOARD CARD ===`);
      console.log(`User ID: ${userId}, Card ID: ${cardId}`);
      console.log(`Request URL: ${req.url}`);
      console.log(`Request params:`, req.params);
      
      // Remove card from user's dashboard
      await storage.removeUserDashboardCard(userId, cardId);
      
      console.log(`Successfully removed card: ${cardId}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing dashboard card:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ error: 'Failed to remove dashboard card' });
    }
  });

  app.post('/api/user-dashboard-settings/reset', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Reset to default dashboard settings
      await storage.resetUserDashboardSettings(userId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error resetting dashboard settings:', error);
      res.status(500).json({ error: 'Failed to reset dashboard settings' });
    }
  });

  // ========================================
  // BULK IMPORT ENDPOINTS
  // ========================================

  // Comprehensive paste import endpoint
  app.post("/api/bulk-import/comprehensive-paste", requireManagerOrAbove, async (req, res) => {
    try {
      const { z } = await import('zod');
      
      // Validation schemas
      const columnMappingSchema = z.object({
        sourceColumn: z.string(),
        targetField: z.string(),
        entityType: z.enum(['clients', 'contacts', 'contracts', 'licenses', 'hardware']),
        required: z.boolean(),
        dataType: z.string()
      });

      const importDataSchema = z.object({
        headers: z.array(z.string()),
        rows: z.array(z.array(z.string())),
        mappings: z.array(columnMappingSchema),
        duplicateHandling: z.enum(['update', 'skip', 'create_new']).optional().default('update'),
        clientMatchStrategy: z.enum(['name_only', 'name_and_domain', 'email', 'custom']).optional().default('name_only')
      });

      // Helper function to parse values based on data type
      function parseValue(value: string, dataType: string): any {
        if (!value || value.trim() === '') return null;
        
        const trimmedValue = value.trim();
        
        switch (dataType) {
          case 'number':
            const num = parseFloat(trimmedValue);
            return isNaN(num) ? null : num;
          case 'integer':
            const int = parseInt(trimmedValue);
            return isNaN(int) ? null : int;
          case 'boolean':
            const lower = trimmedValue.toLowerCase();
            return lower === 'true' || lower === 'yes' || lower === '1';
          case 'date':
            const date = new Date(trimmedValue);
            return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
          case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(trimmedValue) ? trimmedValue : null;
          case 'text':
          default:
            return trimmedValue;
        }
      }

      // Helper function to group mappings by entity type
      function groupMappingsByEntity(mappings: any[], headers: string[]) {
        const entityMappings: Record<string, Record<string, number>> = {};
        
        mappings.forEach((mapping, index) => {
          if (!mapping.targetField || !mapping.entityType) return;
          
          if (!entityMappings[mapping.entityType]) {
            entityMappings[mapping.entityType] = {};
          }
          
          const headerIndex = headers.indexOf(mapping.sourceColumn);
          if (headerIndex !== -1) {
            entityMappings[mapping.entityType][mapping.targetField] = headerIndex;
          }
        });
        
        return entityMappings;
      }

      // Helper function to extract entity data from a row
      function extractEntityData(row: string[], entityMappings: Record<string, number>, mappings: any[]) {
        const data: Record<string, any> = {};
        
        Object.entries(entityMappings).forEach(([field, columnIndex]) => {
          const mapping = mappings.find(m => m.targetField === field);
          if (mapping && row[columnIndex] !== undefined) {
            const value = parseValue(row[columnIndex], mapping.dataType);
            if (value !== null) {
              data[field] = value;
            }
          }
        });
        
        return data;
      }

      // Helper function to find existing client based on matching strategy
      async function findExistingClient(tx: any, clientData: any, strategy: string) {
        switch (strategy) {
          case 'name_only':
            if (!clientData.name) return null;
            return await tx.select().from(clients)
              .where(eq(clients.name, clientData.name)).limit(1);
          
          case 'name_and_domain':
            if (!clientData.name) return null;
            if (clientData.domain) {
              return await tx.select().from(clients)
                .where(and(
                  eq(clients.name, clientData.name),
                  eq(clients.domain, clientData.domain)
                )).limit(1);
            } else {
              return await tx.select().from(clients)
                .where(eq(clients.name, clientData.name)).limit(1);
            }
          
          case 'email':
            // Find by contact email if available
            if (clientData.email) {
              const clientWithEmail = await tx.select({
                id: clients.id,
                name: clients.name,
                domain: clients.domain
              })
              .from(clients)
              .leftJoin(clientContacts, eq(clients.id, clientContacts.clientId))
              .where(eq(clientContacts.email, clientData.email))
              .limit(1);
              
              return clientWithEmail.length > 0 ? [clientWithEmail[0]] : [];
            }
            // Fallback to name matching
            return await tx.select().from(clients)
              .where(eq(clients.name, clientData.name)).limit(1);
          
          default:
            return await tx.select().from(clients)
              .where(eq(clients.name, clientData.name)).limit(1);
        }
      }

      // Validate request body
      const { headers, rows, mappings, duplicateHandling, clientMatchStrategy } = importDataSchema.parse(req.body);
      
      if (!headers.length || !rows.length || !mappings.length) {
        return res.status(400).json({
          success: false,
          message: 'Invalid data: headers, rows, and mappings are required'
        });
      }

      // Group mappings by entity type
      const entityMappings = groupMappingsByEntity(mappings, headers);
      
      // Track import results
      const results = {
        success: true,
        message: '',
        recordsProcessed: rows.length,
        recordsSuccessful: 0,
        recordsFailed: 0,
        recordsSkipped: 0,
        errors: [] as string[],
        warnings: [] as string[],
                  details: {
            clients: { created: 0, updated: 0, skipped: 0 },
            contacts: { created: 0, updated: 0 },
            contracts: { created: 0, updated: 0 },
            services: { created: 0, updated: 0 },
            serviceScopes: { created: 0, updated: 0 },
            licenseAssignments: { created: 0, updated: 0 },
            hardwareAssignments: { created: 0, updated: 0 }
          }
      };

      // Begin transaction
      await db.transaction(async (tx) => {
        // Ensure default license pool exists
        let defaultLicensePool = await tx.select().from(licensePools).where(eq(licensePools.name, 'SIEM EPS Pool')).limit(1);
        if (defaultLicensePool.length === 0) {
          await tx.insert(licensePools).values({
            name: 'SIEM EPS Pool',
            vendor: 'IBM QRadar',
            productName: 'QRadar SIEM',
            licenseType: 'EPS-based',
            totalLicenses: 1000000,
            availableLicenses: 1000000,
            orderedLicenses: 1000000,
            costPerLicense: 2.50,
            isActive: true
          });
          defaultLicensePool = await tx.select().from(licensePools).where(eq(licensePools.name, 'SIEM EPS Pool')).limit(1);
        }
        const licensePoolId = defaultLicensePool[0].id;

        // Ensure default service exists
        let defaultService = await tx.select().from(services).where(eq(services.name, '24/7 SIEM Monitoring')).limit(1);
        if (defaultService.length === 0) {
          await tx.insert(services).values({
            name: '24/7 SIEM Monitoring',
            category: 'Security Operations',
            description: 'Continuous security information and event monitoring with real-time threat detection',
            deliveryModel: 'Hybrid',
            basePrice: 15000.00,
            pricingUnit: 'per month',
            isActive: true
          });
          defaultService = await tx.select().from(services).where(eq(services.name, '24/7 SIEM Monitoring')).limit(1);
        }
        const defaultServiceId = defaultService[0].id;

        // Process each row
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          let rowSuccessful = true;
          let clientId: number | null = null;
          let contractId: number | null = null;

          try {
            // 1. Process Client data (required)
            if (entityMappings.clients) {
              const clientData = extractEntityData(row, entityMappings.clients, mappings);
              
              if (!clientData.name) {
                results.errors.push(`Row ${i + 1}: Client name is required`);
                results.recordsFailed++;
                continue;
              }

              // Check if client exists using the specified matching strategy
              const existingClient = await findExistingClient(tx, clientData, clientMatchStrategy);
              
              if (existingClient && existingClient.length > 0) {
                // Handle duplicate based on strategy
                switch (duplicateHandling) {
                  case 'update':
                    await tx.update(clients)
                      .set({
                        name: clientData.name,
                        shortName: clientData.shortName || existingClient[0].shortName,
                        domain: clientData.domain || existingClient[0].domain,
                        industry: clientData.industry || existingClient[0].industry,
                        companySize: clientData.companySize || existingClient[0].companySize,
                        status: clientData.status || existingClient[0].status,
                        source: clientData.source || existingClient[0].source,
                        address: clientData.address || existingClient[0].address,
                        website: clientData.website || existingClient[0].website,
                        notes: clientData.notes || existingClient[0].notes,
                        updatedAt: new Date()
                      })
                      .where(eq(clients.id, existingClient[0].id));
                    
                    clientId = existingClient[0].id;
                    results.details.clients.updated++;
                    break;
                  
                  case 'skip':
                    clientId = existingClient[0].id;
                    results.details.clients.skipped++;
                    results.warnings.push(`Row ${i + 1}: Client "${clientData.name}" already exists, skipping`);
                    break;
                  
                  case 'create_new':
                    // Create with modified name
                    const timestamp = new Date().getTime();
                    const modifiedName = `${clientData.name} (${timestamp})`;
                    
                    const [newClient] = await tx.insert(clients)
                      .values({
                        ...modifiedClientData,
                        status: clientData.status || 'prospect'
                      })
                      .returning({ id: clients.id });
                    
                    clientId = newClient.id;
                    results.details.clients.created++;
                    results.warnings.push(`Row ${i + 1}: Created new client with modified name "${modifiedClientData.name}" to avoid duplicate`);
                    break;
                }
              } else {
                // Create new client
                const [newClient] = await tx.insert(clients)
                  .values({
                    ...clientData,
                    status: clientData.status || 'prospect'
                  })
                  .returning({ id: clients.id });
                
                clientId = newClient.id;
                results.details.clients.created++;
              }
            }

            if (!clientId) {
              results.errors.push(`Row ${i + 1}: Could not create or find client`);
              results.recordsFailed++;
              continue;
            }

            // 2. Process Contact data
            if (entityMappings.contacts) {
              const contactData = extractEntityData(row, entityMappings.contacts, mappings);
              
              // Validate required fields for contacts
              if (contactData.name && contactData.email) {
                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(contactData.email)) {
                  results.warnings.push(`Row ${i + 1}: Invalid email format for contact: ${contactData.email}`);
                } else {
                  const existingContact = await tx.select()
                    .from(clientContacts)
                    .where(and(
                      eq(clientContacts.clientId, clientId),
                      eq(clientContacts.email, contactData.email)
                    ))
                    .limit(1);

                  if (existingContact.length > 0) {
                    // Update existing contact
                    await tx.update(clientContacts)
                      .set({
                        name: contactData.name,
                        phone: contactData.phone || existingContact[0].phone,
                        title: contactData.title || existingContact[0].title,
                        isPrimary: contactData.isPrimary || existingContact[0].isPrimary,
                        isActive: contactData.isActive !== undefined ? contactData.isActive : existingContact[0].isActive
                      })
                      .where(eq(clientContacts.id, existingContact[0].id));
                    
                    results.details.contacts.updated++;
                  } else {
                    // Create new contact
                    await tx.insert(clientContacts).values({
                      clientId,
                      name: contactData.name,
                      email: contactData.email,
                      phone: contactData.phone || null,
                      title: contactData.title || null,
                      isPrimary: contactData.isPrimary || false,
                      isActive: contactData.isActive !== undefined ? contactData.isActive : true
                    });
                    
                    results.details.contacts.created++;
                  }
                }
              } else {
                // Log missing required fields
                const missingFields = [];
                if (!contactData.name) missingFields.push('name');
                if (!contactData.email) missingFields.push('email');
                
                if (missingFields.length > 0) {
                  results.warnings.push(`Row ${i + 1}: Skipping contact creation - missing required fields: ${missingFields.join(', ')}`);
                }
              }
            }

            // 3. Process Contract data
            if (entityMappings.contracts) {
              const contractData = extractEntityData(row, entityMappings.contracts, mappings);
              
              // Validate required fields for contracts
              if (contractData.name && contractData.startDate && contractData.endDate) {
                
                const existingContract = await tx.select()
                  .from(contracts)
                  .where(and(
                    eq(contracts.clientId, clientId),
                    eq(contracts.name, contractData.name)
                  ))
                  .limit(1);

                if (existingContract.length > 0) {
                  // Update existing contract
                  await tx.update(contracts)
                    .set({
                      name: contractData.name,
                      startDate: new Date(contractData.startDate),
                      endDate: new Date(contractData.endDate),
                      autoRenewal: contractData.autoRenewal || existingContract[0].autoRenewal,
                      renewalTerms: contractData.renewalTerms || existingContract[0].renewalTerms,
                      totalValue: contractData.totalValue || existingContract[0].totalValue,
                      status: contractData.status || existingContract[0].status,
                      documentUrl: contractData.documentUrl || existingContract[0].documentUrl,
                      notes: contractData.notes || existingContract[0].notes,
                      updatedAt: new Date()
                    })
                    .where(eq(contracts.id, existingContract[0].id));
                  
                  contractId = existingContract[0].id;
                  results.details.contracts.updated++;
                } else {
                  // Create new contract
                  const [newContract] = await tx.insert(contracts)
                    .values({
                      clientId,
                      name: contractData.name,
                      startDate: new Date(contractData.startDate),
                      endDate: new Date(contractData.endDate),
                      autoRenewal: contractData.autoRenewal || false,
                      renewalTerms: contractData.renewalTerms || null,
                      totalValue: contractData.totalValue || null,
                      status: contractData.status || 'draft',
                      documentUrl: contractData.documentUrl || null,
                      notes: contractData.notes || null
                    })
                    .returning({ id: contracts.id });
                  
                  contractId = newContract.id;
                  results.details.contracts.created++;
                }

                // Create default service scope for the contract
                const existingScope = await tx.select()
                  .from(serviceScopes)
                  .where(and(
                    eq(serviceScopes.contractId, contractId),
                    eq(serviceScopes.serviceId, defaultServiceId)
                  ))
                  .limit(1);

                if (existingScope.length === 0) {
                  await tx.insert(serviceScopes).values({
                    contractId,
                    serviceId: defaultServiceId,
                    scopeDefinition: JSON.stringify({
                      service_level: 'Standard',
                      monitoring_hours: '24/7',
                      response_time: '30 minutes',
                      escalation_levels: 2
                    }),
                    status: 'active',
                    monthlyValue: contractData.totalValue ? Math.round(contractData.totalValue / 12) : 15000,
                    startDate: contractData.startDate ? new Date(contractData.startDate) : null,
                    endDate: contractData.endDate ? new Date(contractData.endDate) : null
                  });
                  
                  results.details.serviceScopes.created++;
                }
              } else {
                // Log missing required fields
                const missingFields = [];
                if (!contractData.name) missingFields.push('name');
                if (!contractData.startDate) missingFields.push('startDate');
                if (!contractData.endDate) missingFields.push('endDate');
                
                if (missingFields.length > 0) {
                  results.warnings.push(`Row ${i + 1}: Skipping contract creation - missing required fields: ${missingFields.join(', ')}`);
                }
              }
            }

            // 4. Process Service data
            let serviceId: number | null = null;
            if (entityMappings.services) {
              const serviceData = extractEntityData(row, entityMappings.services, mappings);
              
              // Validate required fields for services
              if (serviceData.name && serviceData.category && serviceData.deliveryModel) {
                // Check if service exists
                const existingService = await tx.select()
                  .from(services)
                  .where(eq(services.name, serviceData.name))
                  .limit(1);

                if (existingService.length > 0) {
                  // Update existing service
                  await tx.update(services)
                    .set({
                      name: serviceData.name,
                      category: serviceData.category,
                      description: serviceData.description || existingService[0].description,
                      deliveryModel: serviceData.deliveryModel,
                      basePrice: serviceData.basePrice || existingService[0].basePrice,
                      pricingUnit: serviceData.pricingUnit || existingService[0].pricingUnit,
                      isActive: serviceData.isActive !== undefined ? serviceData.isActive : existingService[0].isActive
                    })
                    .where(eq(services.id, existingService[0].id));
                  
                  serviceId = existingService[0].id;
                  results.details.services.updated++;
                } else {
                  // Create new service
                  const [newService] = await tx.insert(services)
                    .values({
                      name: serviceData.name,
                      category: serviceData.category,
                      description: serviceData.description || null,
                      deliveryModel: serviceData.deliveryModel,
                      basePrice: serviceData.basePrice || null,
                      pricingUnit: serviceData.pricingUnit || null,
                      isActive: serviceData.isActive !== undefined ? serviceData.isActive : true
                    })
                    .returning({ id: services.id });
                  
                  serviceId = newService.id;
                  results.details.services.created++;
                }
              } else {
                // Log missing required fields
                const missingFields = [];
                if (!serviceData.name) missingFields.push('name');
                if (!serviceData.category) missingFields.push('category');
                if (!serviceData.deliveryModel) missingFields.push('deliveryModel');
                
                if (missingFields.length > 0) {
                  results.warnings.push(`Row ${i + 1}: Skipping service creation - missing required fields: ${missingFields.join(', ')}`);
                }
              }
            }

            // 5. Process Service Scope data
            if (entityMappings.serviceScopes && (serviceId || defaultServiceId)) {
              const serviceScopeData = extractEntityData(row, entityMappings.serviceScopes, mappings);
              const currentServiceId = serviceId || defaultServiceId;
              
              // We need a contract to create service scopes
              if (contractId) {
                // Check if service scope exists for this contract and service
                const existingScope = await tx.select()
                  .from(serviceScopes)
                  .where(and(
                    eq(serviceScopes.contractId, contractId),
                    eq(serviceScopes.serviceId, currentServiceId)
                  ))
                  .limit(1);

                if (existingScope.length > 0) {
                  // Update existing service scope
                  await tx.update(serviceScopes)
                    .set({
                      scopeDefinition: serviceScopeData.scopeDefinition ? serviceScopeData.scopeDefinition : existingScope[0].scopeDefinition,
                      startDate: serviceScopeData.startDate ? new Date(serviceScopeData.startDate) : existingScope[0].startDate,
                      endDate: serviceScopeData.endDate ? new Date(serviceScopeData.endDate) : existingScope[0].endDate,
                      status: serviceScopeData.status || existingScope[0].status,
                      monthlyValue: serviceScopeData.monthlyValue || existingScope[0].monthlyValue,
                      notes: serviceScopeData.notes || existingScope[0].notes
                    })
                    .where(eq(serviceScopes.id, existingScope[0].id));
                  
                  results.details.serviceScopes.updated++;
                } else {
                  // Create new service scope
                  await tx.insert(serviceScopes).values({
                    contractId,
                    serviceId: currentServiceId,
                    scopeDefinition: serviceScopeData.scopeDefinition || JSON.stringify({
                      service_level: 'Standard',
                      monitoring_hours: '24/7',
                      response_time: '30 minutes',
                      escalation_levels: 2
                    }),
                    startDate: serviceScopeData.startDate ? new Date(serviceScopeData.startDate) : null,
                    endDate: serviceScopeData.endDate ? new Date(serviceScopeData.endDate) : null,
                    status: serviceScopeData.status || 'active',
                    monthlyValue: serviceScopeData.monthlyValue || 15000,
                    notes: serviceScopeData.notes || null
                  });
                  
                  results.details.serviceScopes.created++;
                }
              } else {
                results.warnings.push(`Row ${i + 1}: Cannot create service scope without a contract`);
              }
            }

            // 6. Process License assignments
            if (entityMappings.licenses) {
              const licenseData = extractEntityData(row, entityMappings.licenses, mappings);
              
              // Validate required fields for licenses
              if (licenseData.assignedLicenses && Number(licenseData.assignedLicenses) > 0) {
                const assignedCount = Number(licenseData.assignedLicenses);
                
                // Check if license assignment exists
                const existingAssignment = await tx.select()
                  .from(clientLicenses)
                  .where(and(
                    eq(clientLicenses.clientId, clientId),
                    eq(clientLicenses.licensePoolId, licensePoolId)
                  ))
                  .limit(1);

                if (existingAssignment.length > 0) {
                  // Update existing assignment
                  await tx.update(clientLicenses)
                    .set({
                      assignedLicenses: assignedCount,
                      notes: licenseData.notes || `Updated license assignment for ${assignedCount} licenses`
                    })
                    .where(eq(clientLicenses.id, existingAssignment[0].id));
                  
                  results.details.licenseAssignments.updated++;
                } else {
                  // Create new assignment
                  await tx.insert(clientLicenses).values({
                    clientId,
                    licensePoolId,
                    assignedLicenses: assignedCount,
                    assignedDate: new Date(),
                    notes: licenseData.notes || `Assigned ${assignedCount} SIEM EPS licenses`
                  });
                  
                  results.details.licenseAssignments.created++;
                }
              } else {
                if (licenseData.assignedLicenses !== undefined) {
                  results.warnings.push(`Row ${i + 1}: Skipping license assignment - invalid or missing assigned licenses count`);
                }
              }
            }

            // 5. Process Hardware assignments
            if (entityMappings.hardware) {
              const hardwareData = extractEntityData(row, entityMappings.hardware, mappings);
              
              // Validate required fields for hardware
              if (hardwareData.name && hardwareData.serialNumber) {
                // Check if hardware asset exists
                let existingAsset = await tx.select()
                  .from(hardwareAssets)
                  .where(eq(hardwareAssets.serialNumber, hardwareData.serialNumber))
                  .limit(1);

                let assetId: number;

                if (existingAsset.length > 0) {
                  // Update existing asset
                  await tx.update(hardwareAssets)
                    .set({
                      name: hardwareData.name,
                      manufacturer: hardwareData.manufacturer || existingAsset[0].manufacturer,
                      model: hardwareData.model || existingAsset[0].model,
                      category: hardwareData.category || existingAsset[0].category,
                      purchaseDate: hardwareData.purchaseDate ? new Date(hardwareData.purchaseDate) : existingAsset[0].purchaseDate,
                      warrantyExpiryDate: hardwareData.warrantyExpiryDate ? new Date(hardwareData.warrantyExpiryDate) : existingAsset[0].warrantyExpiryDate,
                      status: hardwareData.status || existingAsset[0].status,
                      notes: hardwareData.notes || existingAsset[0].notes
                    })
                    .where(eq(hardwareAssets.id, existingAsset[0].id));
                  
                  assetId = existingAsset[0].id;
                } else {
                  // Create new asset
                  const [newAsset] = await tx.insert(hardwareAssets)
                    .values({
                      name: hardwareData.name,
                      serialNumber: hardwareData.serialNumber,
                      manufacturer: hardwareData.manufacturer || null,
                      model: hardwareData.model || null,
                      category: hardwareData.category || 'Other',
                      purchaseDate: hardwareData.purchaseDate ? new Date(hardwareData.purchaseDate) : null,
                      warrantyExpiryDate: hardwareData.warrantyExpiryDate ? new Date(hardwareData.warrantyExpiryDate) : null,
                      status: hardwareData.status || 'active',
                      notes: hardwareData.notes || `Hardware asset for client`
                    })
                    .returning({ id: hardwareAssets.id });
                  
                  assetId = newAsset.id;
                }

                // Check if assignment exists
                const existingAssignment = await tx.select()
                  .from(clientHardwareAssignments)
                  .where(and(
                    eq(clientHardwareAssignments.clientId, clientId),
                    eq(clientHardwareAssignments.hardwareAssetId, assetId)
                  ))
                  .limit(1);

                if (existingAssignment.length > 0) {
                  // Update existing assignment
                  await tx.update(clientHardwareAssignments)
                    .set({
                      installationLocation: hardwareData.installationLocation || hardwareData.location,
                      status: hardwareData.status || 'active',
                      notes: `Hardware assignment updated`
                    })
                    .where(eq(clientHardwareAssignments.id, existingAssignment[0].id));
                  
                  results.details.hardwareAssignments.updated++;
                } else {
                  // Create new assignment
                  await tx.insert(clientHardwareAssignments).values({
                    clientId,
                    hardwareAssetId: assetId,
                    assignedDate: new Date(),
                    installationLocation: hardwareData.installationLocation || hardwareData.location,
                    status: hardwareData.status || 'active',
                    notes: `Hardware assignment created via bulk import`
                  });
                  
                  results.details.hardwareAssignments.created++;
                }
              } else {
                // Log missing required fields
                const missingFields = [];
                if (!hardwareData.name) missingFields.push('name');
                if (!hardwareData.serialNumber) missingFields.push('serialNumber');
                
                if (missingFields.length > 0) {
                  results.warnings.push(`Row ${i + 1}: Skipping hardware assignment - missing required fields: ${missingFields.join(', ')}`);
                }
              }
            }

            if (rowSuccessful) {
              results.recordsSuccessful++;
            }

          } catch (error) {
            console.error(`Error processing row ${i + 1}:`, error);
            results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            results.recordsFailed++;
          }
        }
      });

      // Set final message
      if (results.recordsFailed === 0) {
        results.message = `Successfully imported all ${results.recordsSuccessful} records`;
      } else if (results.recordsSuccessful === 0) {
        results.success = false;
        results.message = `Failed to import any records. ${results.recordsFailed} errors occurred.`;
      } else {
        results.message = `Partially successful: ${results.recordsSuccessful} imported, ${results.recordsFailed} failed`;
      }

      // Add comprehensive audit logging for bulk import operation
      try {
        const { AuditLogger, logAudit } = await import('./lib/audit');
        const auditLogger = new AuditLogger(req, req.user?.id);
        
        // Generate batch ID for grouping all related changes
        const batchId = `bulk_import_${Date.now()}_${req.user?.id}`;
        auditLogger.setBatchId(batchId);

        // Log the overall bulk import operation
        await logAudit({
          userId: req.user?.id,
          action: 'bulk_import',
          entityType: 'system',
          description: `Bulk import operation completed: ${results.recordsSuccessful} successful, ${results.recordsFailed} failed, ${results.recordsSkipped} skipped`,
          category: 'data_modification',
          severity: results.recordsFailed > 0 ? 'medium' : 'info',
          metadata: {
            batchId,
            totalRecords: results.recordsProcessed,
            successful: results.recordsSuccessful,
            failed: results.recordsFailed,
            skipped: results.recordsSkipped,
            details: results.details,
            mappingStrategy: clientMatchStrategy,
            duplicateHandling,
            errors: results.errors.slice(0, 10), // Limit errors in metadata
            warnings: results.warnings.slice(0, 10) // Limit warnings in metadata
          }
        }, req);

        // Log summary for different entity types that were processed
        const summaryPromises = [];

        if (results.details.clients.created > 0 || results.details.clients.updated > 0) {
          summaryPromises.push(
            logAudit({
              userId: req.user?.id,
              action: 'bulk_import_clients',
              entityType: 'client',
              description: `Bulk import processed ${results.details.clients.created + results.details.clients.updated} clients: ${results.details.clients.created} created, ${results.details.clients.updated} updated`,
              category: 'client_management',
              severity: 'info',
              metadata: {
                batchId,
                created: results.details.clients.created,
                updated: results.details.clients.updated,
                skipped: results.details.clients.skipped
              }
            }, req)
          );
        }

        if (results.details.contacts.created > 0 || results.details.contacts.updated > 0) {
          summaryPromises.push(
            logAudit({
              userId: req.user?.id,
              action: 'bulk_import_contacts',
              entityType: 'client_contact',
              description: `Bulk import processed ${results.details.contacts.created + results.details.contacts.updated} contacts: ${results.details.contacts.created} created, ${results.details.contacts.updated} updated`,
              category: 'contact_management',
              severity: 'info',
              metadata: {
                batchId,
                created: results.details.contacts.created,
                updated: results.details.contacts.updated
              }
            }, req)
          );
        }

        if (results.details.contracts.created > 0 || results.details.contracts.updated > 0) {
          summaryPromises.push(
            logAudit({
              userId: req.user?.id,
              action: 'bulk_import_contracts',
              entityType: 'contract',
              description: `Bulk import processed ${results.details.contracts.created + results.details.contracts.updated} contracts: ${results.details.contracts.created} created, ${results.details.contracts.updated} updated`,
              category: 'contract_management',
              severity: 'info',
              metadata: {
                batchId,
                created: results.details.contracts.created,
                updated: results.details.contracts.updated
              }
            }, req)
          );
        }

        if (results.details.licenseAssignments.created > 0 || results.details.licenseAssignments.updated > 0) {
          summaryPromises.push(
            logAudit({
              userId: req.user?.id,
              action: 'bulk_import_licenses',
              entityType: 'client_license',
              description: `Bulk import processed ${results.details.licenseAssignments.created + results.details.licenseAssignments.updated} license assignments: ${results.details.licenseAssignments.created} created, ${results.details.licenseAssignments.updated} updated`,
              category: 'license_management',
              severity: 'info',
              metadata: {
                batchId,
                created: results.details.licenseAssignments.created,
                updated: results.details.licenseAssignments.updated
              }
            }, req)
          );
        }

        if (results.details.hardwareAssignments.created > 0 || results.details.hardwareAssignments.updated > 0) {
          summaryPromises.push(
            logAudit({
              userId: req.user?.id,
              action: 'bulk_import_hardware',
              entityType: 'hardware_asset',
              description: `Bulk import processed ${results.details.hardwareAssignments.created + results.details.hardwareAssignments.updated} hardware assignments: ${results.details.hardwareAssignments.created} created, ${results.details.hardwareAssignments.updated} updated`,
              category: 'asset_management',
              severity: 'info',
              metadata: {
                batchId,
                created: results.details.hardwareAssignments.created,
                updated: results.details.hardwareAssignments.updated
              }
            }, req)
          );
        }

        // Execute all audit logging in parallel
        await Promise.all(summaryPromises);

        console.log(`✅ Comprehensive audit logging completed for bulk import operation (batch: ${batchId})`);
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for bulk import operation:', auditError.message);
      }

      res.json(results);

    } catch (error) {
      console.error('Comprehensive paste import error:', error);
      res.status(500).json({
        success: false,
        message: 'Import failed due to server error',
        recordsProcessed: 0,
        recordsSuccessful: 0,
        recordsFailed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown server error'],
        details: {
          clients: { created: 0, updated: 0 },
          contacts: { created: 0, updated: 0 },
          contracts: { created: 0, updated: 0 },
          serviceScopes: { created: 0, updated: 0 },
          licenseAssignments: { created: 0, updated: 0 },
          hardwareAssignments: { created: 0, updated: 0 }
        }
      });
    }
  });

  // ===== BUSINESS LOGIC & INTELLIGENCE ENDPOINTS =====
  
  // Contract Lifecycle Management
  app.get('/api/contracts/lifecycle/events', requireAuth, async (req, res) => {
    try {
      const { ContractLifecycleManager } = await import('./business-logic/contract-lifecycle');
      const manager = new ContractLifecycleManager();
      const events = await manager.getUpcomingEvents();
      res.json(events);
    } catch (error) {
      console.error('Error fetching contract lifecycle events:', error);
      res.status(500).json({ error: 'Failed to fetch contract lifecycle events' });
    }
  });

  app.get('/api/contracts/:id/performance', requireAuth, async (req, res) => {
    try {
      const { ContractLifecycleManager } = await import('./business-logic/contract-lifecycle');
      const manager = new ContractLifecycleManager();
      const performance = await manager.getContractMetrics(parseInt(req.params.id));
      res.json(performance);
    } catch (error) {
      console.error('Error fetching contract performance:', error);
      res.status(500).json({ error: 'Failed to fetch contract performance' });
    }
  });

  app.get('/api/contracts/:id/renewal-recommendation', requireAuth, async (req, res) => {
    try {
      const { ContractLifecycleManager } = await import('./business-logic/contract-lifecycle');
      const manager = new ContractLifecycleManager();
      const recommendation = await manager.generateRenewalRecommendations(parseInt(req.params.id));
      res.json(recommendation);
    } catch (error) {
      console.error('Error generating renewal recommendation:', error);
      res.status(500).json({ error: 'Failed to generate renewal recommendation' });
    }
  });

  app.post('/api/contracts/:id/process-renewal', requireManagerOrAbove, async (req, res) => {
    try {
      const { ContractLifecycleManager } = await import('./business-logic/contract-lifecycle');
      const manager = new ContractLifecycleManager();
      const result = await manager.processAutomaticRenewal(parseInt(req.params.id), req.user.id);
      res.json({ success: result });
    } catch (error) {
      console.error('Error processing contract renewal:', error);
      res.status(500).json({ error: 'Failed to process contract renewal' });
    }
  });

  app.get('/api/contracts/:id/health-score', requireAuth, async (req, res) => {
    try {
      const { ContractLifecycleManager } = await import('./business-logic/contract-lifecycle');
      const manager = new ContractLifecycleManager();
      const healthScore = await manager.calculateContractHealth(parseInt(req.params.id));
      res.json(healthScore);
    } catch (error) {
      console.error('Error calculating contract health score:', error);
      res.status(500).json({ error: 'Failed to calculate contract health score' });
    }
  });

  app.get('/api/contracts/:id/termination-analysis', requireManagerOrAbove, async (req, res) => {
    try {
      const { ContractLifecycleManager } = await import('./business-logic/contract-lifecycle');
      const manager = new ContractLifecycleManager();
      const analysis = await manager.analyzeTermination(parseInt(req.params.id));
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing contract termination:', error);
      res.status(500).json({ error: 'Failed to analyze contract termination' });
    }
  });

  // Financial Intelligence
  app.get('/api/financial/revenue-analytics', requireManagerOrAbove, async (req, res) => {
    try {
      const { FinancialIntelligenceEngine } = await import('./business-logic/financial-intelligence');
      const engine = new FinancialIntelligenceEngine();
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const analytics = await engine.getRevenueMetrics(startOfMonth, today);
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      res.status(500).json({ error: 'Failed to fetch revenue analytics' });
    }
  });

  app.get('/api/financial/cash-flow-forecast', requireManagerOrAbove, async (req, res) => {
    try {
      const { FinancialIntelligenceEngine } = await import('./business-logic/financial-intelligence');
      const engine = new FinancialIntelligenceEngine();
      const forecast = await engine.generateCashFlowForecast();
      res.json(forecast);
    } catch (error) {
      console.error('Error generating cash flow forecast:', error);
      res.status(500).json({ error: 'Failed to generate cash flow forecast' });
    }
  });

  app.get('/api/financial/client-profitability', requireManagerOrAbove, async (req, res) => {
    try {
      const { FinancialIntelligenceEngine } = await import('./business-logic/financial-intelligence');
      const engine = new FinancialIntelligenceEngine();
      const profitability = await engine.analyzeClientProfitability();
      res.json(profitability);
    } catch (error) {
      console.error('Error analyzing client profitability:', error);
      res.status(500).json({ error: 'Failed to analyze client profitability' });
    }
  });

  app.get('/api/financial/service-performance', requireManagerOrAbove, async (req, res) => {
    try {
      const { FinancialIntelligenceEngine } = await import('./business-logic/financial-intelligence');
      const engine = new FinancialIntelligenceEngine();
      const performance = await engine.analyzeServicePerformance();
      res.json(performance);
    } catch (error) {
      console.error('Error analyzing service performance:', error);
      res.status(500).json({ error: 'Failed to analyze service performance' });
    }
  });

  app.get('/api/financial/alerts', requireManagerOrAbove, async (req, res) => {
    try {
      const { FinancialIntelligenceEngine } = await import('./business-logic/financial-intelligence');
      const engine = new FinancialIntelligenceEngine();
      const alerts = await engine.generateFinancialAlerts();
      res.json(alerts);
    } catch (error) {
      console.error('Error generating financial alerts:', error);
      res.status(500).json({ error: 'Failed to generate financial alerts' });
    }
  });

  app.get('/api/financial/executive-summary', requireManagerOrAbove, async (req, res) => {
    try {
      const { FinancialIntelligenceEngine } = await import('./business-logic/financial-intelligence');
      const engine = new FinancialIntelligenceEngine();
      const summary = await engine.generateExecutiveSummary();
      res.json(summary);
    } catch (error) {
      console.error('Error generating executive summary:', error);
      res.status(500).json({ error: 'Failed to generate executive summary' });
    }
  });

  // Business Intelligence Dashboard
  app.get('/api/dashboard/business-intelligence', requireManagerOrAbove, async (req, res) => {
    try {
      const { ContractLifecycleManager } = await import('./business-logic/contract-lifecycle');
      const { FinancialIntelligenceEngine } = await import('./business-logic/financial-intelligence');
      
      const contractManager = new ContractLifecycleManager();
      const financialEngine = new FinancialIntelligenceEngine();

      // Fetch all business intelligence data in parallel
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const [
        upcomingEvents,
        revenueAnalytics,
        financialAlerts,
        executiveSummary
      ] = await Promise.all([
        contractManager.getUpcomingEvents(),
        financialEngine.getRevenueMetrics(startOfMonth, today),
        financialEngine.generateFinancialAlerts(),
        financialEngine.generateExecutiveSummary()
      ]);

      const dashboard = {
        contractEvents: upcomingEvents,
        revenue: revenueAnalytics,
        alerts: financialAlerts,
        summary: executiveSummary,
        lastUpdated: new Date().toISOString()
      };

      res.json(dashboard);
    } catch (error) {
      console.error('Error generating business intelligence dashboard:', error);
      res.status(500).json({ error: 'Failed to generate business intelligence dashboard' });
    }
  });

  // Health check for business logic services
  app.get('/api/business-logic/health', requireAuth, async (req, res) => {
    try {
      const health = {
        status: 'healthy',
        services: {
          contractLifecycle: 'operational',
          financialIntelligence: 'operational'
        },
        timestamp: new Date().toISOString()
      };
      res.json(health);
    } catch (error) {
      console.error('Business logic health check failed:', error);
      res.status(500).json({ 
        status: 'unhealthy',
        error: 'Business logic services unavailable',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Temporary debugging route for external widgets
  app.get("/api/debug/external-widgets", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const settings = await storage.getUserDashboardSettings(userId);
      
      const externalWidgets = settings.filter(setting => 
        setting.type === 'custom' && 
        setting.category === 'custom' &&
        setting.config?.integrationEngineId
      );
      
      res.json({
        totalCards: settings.length,
        externalWidgets: externalWidgets.length,
        externalWidgetDetails: externalWidgets.map(widget => ({
          id: widget.cardId,
          title: widget.title,
          integrationEngineId: widget.config?.integrationEngineId,
          refreshInterval: widget.config?.refreshInterval
        }))
      });
    } catch (error) {
      console.error("Debug external widgets error:", error);
      res.status(500).json({ error: 'Failed to get external widget debug info' });
    }
  });

  // Temporary route to remove problematic external widgets
  app.delete("/api/debug/external-widgets/:cardId", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const cardId = req.params.cardId;
      
      console.log(`🗑️ Removing external widget card: ${cardId} for user: ${userId}`);
      
      // Remove the specific card
      await db.delete(userDashboardSettings)
        .where(and(
          eq(userDashboardSettings.userId, userId),
          eq(userDashboardSettings.cardId, cardId)
        ));
      
      res.json({ success: true, message: `External widget ${cardId} removed` });
    } catch (error) {
      console.error("Remove external widget error:", error);
      res.status(500).json({ error: 'Failed to remove external widget' });
    }
  });

  // External Data Integration Bridge
  app.use("/api/integration-engine/external-data", requireAuth, externalDataBridge);

  // Get clients with stats
  app.get("/api/clients/with-stats", requireAuth, async (req, res) => {
    try {
      const clients = await storage.getClientsWithStats();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients with stats:", error);
      res.status(500).json({ error: "Failed to fetch clients with stats" });
    }
  });

  return httpServer;
}
      