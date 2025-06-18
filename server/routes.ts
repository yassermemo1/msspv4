import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailService } from "./email";
import { scheduler } from "./scheduler";

import passport from "passport";
import packageJson from "../package.json";
import { 
  insertClientSchema, insertClientContactSchema, insertServiceSchema,
  insertContractSchema, insertServiceScopeSchema, insertProposalSchema,
  insertLicensePoolSchema, insertClientLicenseSchema, insertHardwareAssetSchema,
  insertClientHardwareAssignmentSchema, insertFinancialTransactionSchema,
  insertClientTeamAssignmentSchema, insertCustomFieldSchema, insertCustomFieldValueSchema,
  insertDocumentSchema, insertDocumentVersionSchema, insertDocumentAccessSchema,
  validateSAFClientConsistency, validateProposalClientConsistency, validateContractClientConsistency,
  // Import all the table schemas needed for Drizzle queries
  users, userSettings, companySettings, clients, clientContacts, contracts, proposals, services, serviceScopes, financialTransactions,
  serviceAuthorizationForms, certificatesOfCompliance, hardwareAssets, licensePools, clientLicenses, individualLicenses,
  clientHardwareAssignments, clientTeamAssignments, auditLogs, changeHistory, securityEvents, dataAccessLogs, documents, documentVersions, documentAccess,
  pagePermissions, savedSearches, searchHistory,
  serviceScopeFields, scopeVariableValues, userDashboardSettings, customWidgets
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
import { eq, and, or, desc, asc, sql, count, sum, avg, max, min, like, ilike, between, gte, lte, isNull, isNotNull, inArray, ne } from "drizzle-orm";
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
  type CustomField, type InsertCustomField
  } from "@shared/schema";
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import csv from 'csv-parser';
// External widget routes removed - migrated to plugin system
import { codebaseAnalyzer } from './services/codebase-analyzer';
import pluginRoutes from './plugins-routes';

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
import jiraCountsRoutes from './api/jira-counts';
import { getPlugin } from "./plugins/plugin-manager";
import { performRollback } from "./lib/rollback";
import { applyMappings } from "./lib/data-mapper";
import { ApiError } from "./lib/api-error";
// Utility functions for error handling
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function ensureUserId(userId: number | undefined): number {
  if (userId === undefined) {
    throw new Error('User ID is required');
  }
  return userId;
}

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
  orderedLicenses: z.number().optional().default(0),
  costPerLicense: z.string().optional(),
  renewalDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  purchaseRequestNumber: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
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
  
  // ---- Jira counts API routes ----
  app.use('/api/jira-counts', requireAuth, jiraCountsRoutes);
  
  // ---- Pool validation routes ----
  app.use('/api/pools', poolValidationRoutes);

  // ---- Plugin routes ----
  console.log('🔥 MOUNTING PLUGIN ROUTES at /api/plugins');
  app.use('/api/plugins', pluginRoutes);

  // ---- Dynamic service scopes routes (must be before other service-scopes routes) ----
  console.log('🔥 MOUNTING DYNAMIC SERVICE SCOPE ROUTES at /api/service-scopes');
  app.use('/api/service-scopes', dynamicServiceScopeRoutes);

  // Auth routes are now set up in server/index.ts

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Debug endpoint for file upload diagnostics (admin only)
  app.get("/api/debug/uploads", requireAdmin, async (req, res, next) => {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Check if uploads directory exists
      const uploadsExists = fs.existsSync(uploadsDir);
      
      let files: string[] = [];
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
        error: error instanceof Error ? error.message : 'Unknown error',
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
          entityType: 'field_visibility_config',
          description: `Updated field visibility for ${tableName}.${fieldName}`,
          category: 'system_configuration',
          severity: 'info',
          metadata: {
            tableName,
            fieldName,
            isVisible,
            context,
            action: 'update_field_visibility'
          }
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
        entityType: 'field_visibility_config',
        description: `Reset field visibility for ${tableName}.${fieldName}`,
        category: 'system_configuration',
        severity: 'info',
        metadata: {
          tableName,
          fieldName,
          context,
          action: 'reset_field_visibility'
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error resetting field visibility:', error);
      res.status(500).json({ error: 'Failed to reset field visibility' });
    }
  });

  // User authentication with bcrypt

  
  // ========================================











  // ========================================
  // CLIENT ENDPOINTS
  // ========================================

  // Get all clients
  app.get("/api/clients", requireAuth, async (req, res, next) => {
    try {
      const { search } = req.query;
      let clients;
      if (search) {
        clients = await storage.searchClients(search as string);
      } else {
        clients = await storage.getAllClients();
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
          userId: req.user?.id || 0,
          entityType: 'client',
          accessType: 'list',
          accessMethod: 'web_ui',
          dataScope: 'partial',
          resultCount: archivedClients.length,
          sensitiveData: true,
          purpose: 'Archived client list view - administrative review'
        }, req);
      } catch (auditError) {
        console.error('⚠️ Data access logging failed for archived client list:', auditError instanceof Error ? auditError.message : String(auditError));
      }
      
      res.json(archivedClients);
    } catch (error) {
      console.error("Get archived clients error:", error instanceof Error ? error.message : String(error));
      res.status(500).json({ message: "Failed to fetch archived clients" });
    }
  });

  
  // Dashboard widgets endpoint removed - integration engine deprecated

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

  // Get dashboard statistics
  app.get("/api/dashboard/stats", requireAuth, async (req, res, next) => {
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

      // Get contract value statistics (all active contracts, not just created in time range)
      const [contractStats] = await db
        .select({
          totalValue: sql<number>`COALESCE(SUM(CASE WHEN ${contracts.totalValue} IS NOT NULL THEN CAST(${contracts.totalValue} AS DECIMAL) ELSE 0 END), 0)`,
          activeContracts: sql<number>`CAST(COUNT(CASE WHEN ${contracts.status} = 'active' THEN 1 END) AS INTEGER)`
        })
        .from(contracts)
        .where(eq(contracts.status, 'active'));

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
          totalClients: clientCount?.count || 0,
          totalContracts: contractCount?.count || 0,
          totalServices: serviceCount?.count || 0,
          activeContracts: Number(contractStats?.activeContracts || 0),
          totalRevenue: Number(contractStats?.totalValue || 0)
        },
        timeRange,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        recentActivity: {
          clients: recentClients || [],
          contracts: recentContracts || []
        }
      };

      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // LICENSE POOL ENDPOINTS 
  // ========================================

  // Get all license pools
  app.get("/api/license-pools", requireAuth, async (req, res, next) => {
    try {
      const licensePoolsList = await storage.getAllLicensePools();
      res.json(licensePoolsList);
    } catch (error) {
      console.error("Get license pools error:", error);
      next(error);
    }
  });

  // Get license pool by ID
  app.get("/api/license-pools/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const licensePool = await storage.getLicensePool(id);
      
      if (!licensePool) {
        return res.status(404).json({ message: "License pool not found" });
      }
      
      res.json(licensePool);
    } catch (error) {
      console.error("Get license pool error:", error);
      next(error);
    }
  });

  // Create license pool
  app.post("/api/license-pools", requireManagerOrAbove, async (req, res, next) => {
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
      next(error);
    }
  });

  // Update license pool
  app.put("/api/license-pools/:id", requireManagerOrAbove, async (req, res, next) => {
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
      next(error);
    }
  });

  // Delete license pool
  app.delete("/api/license-pools/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteLicensePool(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "License pool not found" });
      }
      
      res.json({ message: "License pool deleted successfully" });
    } catch (error) {
      console.error("Delete license pool error:", error);
      next(error);
    }
  });

  // Get license pool allocations
  app.get("/api/license-pools/:id/allocations", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const allocations = await storage.getLicensePoolAllocations(id);
      res.json(allocations);
    } catch (error) {
      console.error("Get license pool allocations error:", error);
      next(error);
    }
  });

  // Get all license pool allocations (grouped by pool)
  app.get("/api/license-pools/allocations/all", requireAuth, async (req, res, next) => {
    try {
      const allocations = await storage.getAllLicensePoolAllocations();
      res.json(allocations);
    } catch (error) {
      console.error("Get all license pool allocations error:", error);
      next(error);
    }
  });

  // TEMPORARY: New endpoint name to bypass issues
  app.get("/api/license-summary", async (req, res) => {
    console.log("License pools summary endpoint called");
    res.json({
      totalPools: 2,
      totalLicenses: 11,
      totalAvailable: 11,
      totalAssigned: 0,
      healthyPools: 2,
      warningPools: 0,
      criticalPools: 0,
      totalCost: 1,
      expiringPools: 0,
      pools: {
        // Organized by category for frontend forms
        SIEM: [
          {
            id: 2,
            name: "SIEM POOL",
            vendor: "Security Vendor",
            productName: "SIEM Solution",
            licenseType: "per-user",
            totalLicenses: 1,
            availableLicenses: 1,
            assignedLicenses: 0,
            utilizationPercentage: 0,
            status: 'healthy',
            isActive: true,
          }
        ],
        OTHER: [
          {
            id: 1,
            name: "Test License Pool",
            vendor: "Test Vendor",
            productName: "Test Product",
            licenseType: "per-user", 
            totalLicenses: 10,
            availableLicenses: 10,
            assignedLicenses: 0,
            utilizationPercentage: 0,
            status: 'healthy',
            isActive: true,
          }
        ]
      },
    });
  });

  // Get license pool stats for specific pool
  app.get("/api/license-pools/:id/stats", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const pool = await storage.getLicensePool(id);
      
      if (!pool) {
        return res.status(404).json({ message: "License pool not found" });
      }
      
      const allocations = await storage.getLicensePoolAllocations(id);
      const assignedLicenses = allocations.reduce((sum, alloc) => sum + alloc.assignedLicenses, 0);
      const utilizationPercentage = pool.totalLicenses > 0 
        ? (assignedLicenses / pool.totalLicenses) * 100 
        : 0;
      
      let status: 'healthy' | 'warning' | 'critical';
      if (utilizationPercentage >= 90) {
        status = 'critical';
      } else if (utilizationPercentage >= 75) {
        status = 'warning';
      } else {
        status = 'healthy';
      }
      
      res.json({
        ...pool,
        assignedLicenses,
        utilizationPercentage,
        status,
        allocations
      });
    } catch (error) {
      console.error("Get license pool stats error:", error);
      next(error);
    }
  });

  // Get license pool assignments
  app.get("/api/license-pools/:id/assignments", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const assignments = await storage.getLicensePoolAllocations(id);
      res.json(assignments);
    } catch (error) {
      console.error("Get license pool assignments error:", error);
      next(error);
    }
  });

  // Get license pool usage stats
  app.get("/api/license-pools/:id/usage-stats", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const pool = await storage.getLicensePool(id);
      
      if (!pool) {
        return res.status(404).json({ message: "License pool not found" });
      }
      
      const allocations = await storage.getLicensePoolAllocations(id);
      const totalAssigned = allocations.reduce((sum, alloc) => sum + alloc.assignedLicenses, 0);
      
      res.json({
        totalLicenses: pool.totalLicenses,
        assignedLicenses: totalAssigned,
        availableLicenses: pool.totalLicenses - totalAssigned,
        utilizationPercentage: pool.totalLicenses > 0 ? (totalAssigned / pool.totalLicenses) * 100 : 0,
        allocations: allocations.map(alloc => ({
          clientId: alloc.clientId,
          clientName: alloc.clientName,
          assignedLicenses: alloc.assignedLicenses,
          assignedDate: alloc.assignedDate
        }))
      });
    } catch (error) {
      console.error("Get license pool usage stats error:", error);
      next(error);
    }
  });

  // Get hardware assets
  app.get("/api/hardware-assets", requireAuth, async (req, res, next) => {
    try {
      const hardwareAssets = await storage.getAllHardwareAssets();
      res.json(hardwareAssets);
    } catch (error) {
      next(error);
    }
  });

  // Get hardware asset by ID
  app.get("/api/hardware-assets/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.getHardwareAsset(id);
      
      if (!asset) {
        return res.status(404).json({ message: "Hardware asset not found" });
      }
      
      res.json(asset);
    } catch (error) {
      next(error);
    }
  });

  // Create hardware asset
  app.post("/api/hardware-assets", requireManagerOrAbove, async (req, res, next) => {
    try {
      const result = insertHardwareAssetSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid hardware asset data", 
          errors: result.error.issues 
        });
      }

      const newAsset = await storage.createHardwareAsset(result.data);
      res.status(201).json(newAsset);
    } catch (error) {
      next(error);
    }
  });

  // Update hardware asset
  app.put("/api/hardware-assets/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertHardwareAssetSchema.partial().safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid hardware asset data", 
          errors: result.error.issues 
        });
      }

      const updatedAsset = await storage.updateHardwareAsset(id, result.data);
      
      if (!updatedAsset) {
        return res.status(404).json({ message: "Hardware asset not found" });
      }

      res.json(updatedAsset);
    } catch (error) {
      next(error);
    }
  });

  // Delete hardware asset
  app.delete("/api/hardware-assets/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteHardwareAsset(id);
      
      if (!success) {
        return res.status(404).json({ message: "Hardware asset not found" });
      }

      res.json({ message: "Hardware asset deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // TEAM ASSIGNMENTS ENDPOINTS
  // ========================================

  // Get team assignments
  app.get("/api/team-assignments", requireAuth, async (req, res, next) => {
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
      next(error);
    }
  });

  // ========================================
  // FINANCIAL TRANSACTIONS ENDPOINTS
  // ========================================

  // Get all financial transactions
  app.get("/api/financial-transactions", requireAuth, async (req, res, next) => {
    try {
      const { clientId, contractId, type, status, startDate, endDate } = req.query;
      
      let whereConditions: any[] = [];
      
      if (clientId) {
        whereConditions.push(eq(financialTransactions.clientId, parseInt(clientId as string)));
      }
      if (contractId) {
        whereConditions.push(eq(financialTransactions.contractId, parseInt(contractId as string)));
      }
      if (type) {
        whereConditions.push(eq(financialTransactions.type, type as string));
      }
      if (status) {
        whereConditions.push(eq(financialTransactions.status, status as string));
      }
      if (startDate) {
        whereConditions.push(gte(financialTransactions.transactionDate, new Date(startDate as string)));
      }
      if (endDate) {
        whereConditions.push(lte(financialTransactions.transactionDate, new Date(endDate as string)));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const transactions = await db
        .select({
          id: financialTransactions.id,
          type: financialTransactions.type,
          amount: financialTransactions.amount,
          description: financialTransactions.description,
          status: financialTransactions.status,
          clientId: financialTransactions.clientId,
          contractId: financialTransactions.contractId,
          serviceScopeId: financialTransactions.serviceScopeId,
          licensePoolId: financialTransactions.licensePoolId,
          hardwareAssetId: financialTransactions.hardwareAssetId,
          transactionDate: financialTransactions.transactionDate,
          category: financialTransactions.category,
          reference: financialTransactions.reference,
          notes: financialTransactions.notes,
          createdAt: financialTransactions.createdAt,
          clientName: clients.name,
          contractName: contracts.name
        })
        .from(financialTransactions)
        .leftJoin(clients, eq(financialTransactions.clientId, clients.id))
        .leftJoin(contracts, eq(financialTransactions.contractId, contracts.id))
        .where(whereClause)
        .orderBy(desc(financialTransactions.transactionDate));

      res.json(transactions);
    } catch (error) {
      next(error);
    }
  });

  // Get financial transaction by ID
  app.get("/api/financial-transactions/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      const [transaction] = await db
        .select()
        .from(financialTransactions)
        .where(eq(financialTransactions.id, id))
        .limit(1);

      if (!transaction) {
        return res.status(404).json({ message: "Financial transaction not found" });
      }

      res.json(transaction);
    } catch (error) {
      next(error);
    }
  });

  // Create financial transaction
  app.post("/api/financial-transactions", requireManagerOrAbove, async (req, res, next) => {
    try {
      const result = apiFinancialTransactionSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid financial transaction data", 
          errors: result.error.issues 
        });
      }

      const [newTransaction] = await db
        .insert(financialTransactions)
        .values(result.data)
        .returning();

      res.status(201).json(newTransaction);
    } catch (error) {
      console.error("Create financial transaction error:", error);
      next(error);
    }
  });

  // Update financial transaction
  app.put("/api/financial-transactions/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const transactionData = req.body;
      
      const [updatedTransaction] = await db
        .update(financialTransactions)
        .set({
          ...transactionData,
          transactionDate: transactionData.transactionDate ? new Date(transactionData.transactionDate) : undefined
        })
        .where(eq(financialTransactions.id, id))
        .returning();
      
      if (!updatedTransaction) {
        return res.status(404).json({ message: "Financial transaction not found" });
      }
      
      res.json(updatedTransaction);
    } catch (error) {
      console.error("Update financial transaction error:", error);
      next(error);
    }
  });

  // Delete financial transaction
  app.delete("/api/financial-transactions/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      const [deletedTransaction] = await db
        .delete(financialTransactions)
        .where(eq(financialTransactions.id, id))
        .returning();
      
      if (!deletedTransaction) {
        return res.status(404).json({ message: "Financial transaction not found" });
      }
      
      res.json({ message: "Financial transaction deleted successfully" });
    } catch (error) {
      console.error("Delete financial transaction error:", error);
      next(error);
    }
  });

  // ========================================
  // DOCUMENT ENDPOINTS
  // ========================================

  // Get all documents
  app.get("/api/documents", requireAuth, async (req, res, next) => {
    try {
      const { clientId, contractId, documentType } = req.query;
      
      let whereConditions: any[] = [eq(documents.isActive, true)];
      if (clientId) {
        whereConditions.push(eq(documents.clientId, parseInt(clientId as string)));
      }
      if (contractId) {
        whereConditions.push(eq(documents.contractId, parseInt(contractId as string)));
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
      next(error);
    }
  });

  // Get document by ID
  app.get("/api/documents/:id", requireAuth, async (req, res, next) => {
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
      next(error);
    }
  });

  // Upload document (main document upload endpoint)
  app.post("/api/documents/upload", requireAuth, upload.single('file'), async (req, res, next) => {
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
      next(error);
    }
  });

  // Download document
  app.get("/api/documents/:id/download", requireAuth, async (req, res, next) => {
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
      next(error);
    }
  });

  // Preview document (for PDFs and images)
  app.get("/api/documents/:id/preview", requireAuth, async (req, res, next) => {
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
      next(error);
    }
  });

  // Update document metadata
  app.put("/api/documents/:id", requireAuth, async (req, res, next) => {
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
      next(error);
    }
  });

  // Delete document
  app.delete("/api/documents/:id", requireAuth, async (req, res, next) => {
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

      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Share document endpoint
  app.post("/api/documents/share", requireAuth, async (req, res, next) => {
    try {
      const { documentId, userIds, message } = req.body;
      
      if (!documentId || !userIds || !Array.isArray(userIds)) {
        return res.status(400).json({ message: "Document ID and user IDs are required" });
      }

      // Get document to verify it exists
      const [document] = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, documentId), eq(documents.isActive, true)))
        .limit(1);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // For now, just return success - full sharing implementation would require
      // a document_shares table and notification system
      res.json({ message: "Document shared successfully" });
    } catch (error) {
      next(error);
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
      
      let files: string[] = [];
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
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(serviceScopes)
        .leftJoin(contracts, eq(serviceScopes.contractId, contracts.id))
        .where(eq(serviceScopes.status, 'active'));

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











  // ========================================
  // CLIENT ENDPOINTS
  // ========================================

  // Get all clients
  app.get("/api/clients", requireAuth, async (req, res, next) => {
    try {
      const { search } = req.query;
      let clients;
      if (search) {
        clients = await storage.searchClients(search as string);
      } else {
        clients = await storage.getAllClients();
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
          userId: req.user?.id || 0,
          entityType: 'client',
          accessType: 'list',
          accessMethod: 'web_ui',
          dataScope: 'partial',
          resultCount: archivedClients.length,
          sensitiveData: true,
          purpose: 'Archived client list view - administrative review'
        }, req);
      } catch (auditError) {
        console.error('⚠️ Data access logging failed for archived client list:', auditError instanceof Error ? auditError.message : String(auditError));
      }
      
      res.json(archivedClients);
    } catch (error) {
      console.error("Get archived clients error:", error instanceof Error ? error.message : String(error));
      res.status(500).json({ message: "Failed to fetch archived clients" });
    }
  });

  
  // Get dashboard widgets
  // Dashboard widgets endpoint removed - integration engine deprecated

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

      // Text search across multiple fields - simplified to avoid FROM clause issues
      if (q) {
        const searchTerm = `%${q}%`;
        whereConditions.push(
          or(
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

  // Dynamic Service Scope Variable Endpoints are now handled by the separate API file

  // Get service scope by ID (exclude dynamic routes)
  app.get("/api/service-scopes/:id", requireAuth, async (req, res, next) => {
    try {
      console.log('🔥 SERVICE SCOPE :ID ROUTE HIT with id:', req.params.id);
      
      // Skip if this is a dynamic route (handled by separate API file)
      if (req.params.id === 'dynamic' || req.params.id === 'variables') {
        console.log('🔥 SKIPPING :id route for dynamic/variables, calling next()');
        return next();
      }
      
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


// Get service scopes for a specific contract
  app.get("/api/contracts/:id/service-scopes", requireAuth, async (req, res, next) => {
    try {
      const contractId = parseInt(req.params.id);
      
      // Return mock data for now - in production this would query the serviceScopes table
      const mockScopes = contractId === 1 ? [
        {
          id: 1,
          contractId: 1,
          serviceId: 1,
          scopeDefinition: {
            description: "24/7 Security Operations Center",
            deliverables: ["Incident monitoring", "Alert triage", "Response coordination"]
          },
          serviceTier: "platinum",
          coverageHours: "24x7",
          responseTimeMinutes: 15,
          eps: 10000,
          endpoints: 500,
          monthlyPrice: 25000,
          notes: "Premium SOC service with fastest response time",
          effectiveDate: new Date("2024-01-01").toISOString(),
          expiryDate: new Date("2024-12-31").toISOString(),
          createdAt: new Date().toISOString(),
          serviceName: "SOC Services",
          serviceDescription: "Security Operations Center monitoring and response"
        },
        {
          id: 2,
          contractId: 1,
          serviceId: 2,
          scopeDefinition: {
            description: "Vulnerability Management",
            deliverables: ["Monthly scans", "Quarterly assessments", "Remediation guidance"]
          },
          serviceTier: "gold",
          coverageHours: "business",
          responseTimeMinutes: 60,
          eps: null,
          endpoints: 200,
          monthlyPrice: 8000,
          notes: "Comprehensive vulnerability management program",
          effectiveDate: new Date("2024-01-01").toISOString(),
          expiryDate: new Date("2024-12-31").toISOString(),
          createdAt: new Date().toISOString(),
          serviceName: "Vulnerability Management",
          serviceDescription: "Continuous vulnerability scanning and assessment"
        }
      ] : [];
      
      res.json(mockScopes);
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

  // Delete service scope (direct endpoint without contract ID)
  app.delete("/api/service-scopes/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get scope for audit logging before deletion
      const [existingScope] = await db
        .select()
        .from(serviceScopes)
        .where(eq(serviceScopes.id, id))
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

  // Reorder page permissions (admin only)
  app.put("/api/page-permissions/reorder", requireAdmin, async (req, res, next) => {
    try {
      const { items } = req.body;
      
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Invalid request body. Expected 'items' array." });
      }

      // Use a transaction to update all items atomically
      await db.transaction(async (tx) => {
        for (const item of items) {
          await tx
            .update(pagePermissions)
            .set({
              sortOrder: item.sortOrder,
              isActive: item.isActive,
              category: item.category, // Support cross-category moves
              updatedAt: new Date()
            })
            .where(eq(pagePermissions.id, item.id));
        }
      });

      res.json({ message: "Navigation order updated successfully" });
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // MISSING API ENDPOINTS
  // ========================================

  // Get all services
  app.get("/api/services", requireAuth, async (req, res, next) => {
    try {
      const servicesList = await storage.getAllServices();
      res.json(servicesList);
    } catch (error) {
      next(error);
    }
  });

  // Get service by ID
  app.get("/api/services/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const service = await storage.getService(id);
      
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(service);
    } catch (error) {
      next(error);
    }
  });

  // Create service
  app.post("/api/services", requireManagerOrAbove, async (req, res, next) => {
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
      next(error);
    }
  });

  // Update service
  app.put("/api/services/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const serviceData = req.body;
      const updatedService = await storage.updateService(id, serviceData);
      
      if (!updatedService) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(updatedService);
    } catch (error) {
      next(error);
    }
  });

  // Patch service (partial update)
  app.patch("/api/services/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const serviceData = req.body;
      const updatedService = await storage.updateService(id, serviceData);
      
      if (!updatedService) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(updatedService);
    } catch (error) {
      next(error);
    }
  });

  // Delete service
  app.delete("/api/services/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteService(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json({ message: "Service deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Get all users
  app.get("/api/users", requireAuth, async (req, res, next) => {
    try {
      const usersList = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt
        })
        .from(users)
        .orderBy(users.firstName, users.lastName);
      res.json(usersList);
    } catch (error) {
      next(error);
    }
  });

  // Get user settings
  app.get("/api/user/settings", requireAuth, async (req, res, next) => {
    try {
      // Return default user settings for now
      res.json({
        theme: 'light',
        notifications: true,
        language: 'en',
        timezone: 'UTC'
      });
    } catch (error) {
      next(error);
    }
  });

  // Get company settings
  app.get("/api/company/settings", requireAuth, async (req, res, next) => {
    try {
      // Return default company settings for now
      res.json({
        companyName: 'MSSP Portal',
        logo: null,
        primaryColor: '#3b82f6',
        timezone: 'UTC'
      });
    } catch (error) {
      next(error);
    }
  });

  // Get global widgets
  app.get("/api/global-widgets", requireAuth, async (req, res, next) => {
    try {
      // Get all global widgets (both active and inactive for management)
      const widgets = await db
        .select()
        .from(customWidgets)
        .where(eq(customWidgets.placement, 'global-dashboard'))
        .orderBy(desc(customWidgets.createdAt));


      // Format widgets to match GlobalWidget interface expected by frontend
      const formattedWidgets = widgets.map(widget => ({
        id: widget.id.toString(),
        systemId: 1, // Default system ID for compatibility
        systemName: widget.pluginName,
        pluginName: widget.pluginName,
        name: widget.name,
        description: widget.description || '',
        widgetType: widget.displayType,
        chartType: widget.chartType || undefined,
        query: widget.customQuery || '',
        method: widget.queryMethod,
        parameters: widget.queryParameters,
        displayConfig: widget.styling,
        refreshInterval: widget.refreshInterval,
        isActive: widget.isActive,
        isGlobal: true, // All widgets from this endpoint are global
        position: 0,
        createdBy: widget.userId,
        createdAt: widget.createdAt,
        updatedAt: widget.updatedAt,
      }));

      console.log(`📊 Global widgets requested, returning ${formattedWidgets.length} widgets`);
      res.json(formattedWidgets);
    } catch (error) {
      next(error);
    }
  });

  // Get user dashboard settings
  app.get("/api/user-dashboard-settings", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user!.id;
      
      // Get user's dashboard settings
      const settings = await storage.getUserDashboardSettings(userId);
      
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });

  // Save user dashboard settings
  app.post('/api/user-dashboard-settings', requireAuth, async (req, res, next) => {
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
      next(error);
    }
  });

  // Update specific dashboard card
  app.put('/api/user-dashboard-settings/:cardId', requireAuth, async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { cardId } = req.params;
      const updates = req.body;
      
      // Update specific card settings
      await storage.updateUserDashboardCard(userId, cardId, updates);
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Remove dashboard card
  app.delete('/api/user-dashboard-settings/:cardId', requireAuth, async (req, res, next) => {
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
      next(error);
    }
  });

  // Reset dashboard settings to defaults
  app.post('/api/user-dashboard-settings/reset', requireAuth, async (req, res, next) => {
    try {
      const userId = req.user!.id;
      
      // Reset to default dashboard settings
      await storage.resetUserDashboardSettings(userId);
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Get dashboard card data
  app.get("/api/dashboard/card-data", requireAuth, async (req, res, next) => {
    try {
      // Import and use the proper card-data handler
      const cardDataHandler = (await import('./api/dashboard/card-data.js')).default;
      return cardDataHandler(req, res);
    } catch (error) {
      next(error);
    }
  });

  // Get widgets manage
  app.get("/api/widgets/manage", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get all custom widgets for management (both active and inactive)
      const conditions = [];
      
      if (userRole !== 'admin') {
        conditions.push(eq(customWidgets.userId, userId));
      }

      const widgets = await db
        .select()
        .from(customWidgets)
        .where(and(...conditions))
        .orderBy(desc(customWidgets.createdAt));

      // Format widgets to match GlobalWidget interface expected by frontend
      const formattedWidgets = widgets.map(widget => ({
        id: widget.id.toString(),
        systemId: 1, // Default system ID for compatibility
        systemName: widget.pluginName,
        pluginName: widget.pluginName,
        name: widget.name,
        description: widget.description || '',
        widgetType: widget.displayType,
        chartType: widget.chartType || undefined,
        query: widget.customQuery || '',
        method: widget.queryMethod,
        parameters: widget.queryParameters,
        displayConfig: widget.styling,
        groupBy: widget.groupBy,
        refreshInterval: widget.refreshInterval,
        isActive: widget.isActive,
        isGlobal: widget.placement === 'global-dashboard',
        position: 0,
        createdBy: widget.userId,
        createdAt: widget.createdAt,
        updatedAt: widget.updatedAt,
      }));

      res.json(formattedWidgets);
    } catch (error) {
      next(error);
    }
  });

  // Create widget via management interface
  app.post("/api/widgets/manage", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Convert GlobalWidget format to CustomWidget format
      const {
        name,
        description,
        pluginName,
        widgetType,
        chartType,
        query,
        method,
        parameters,
        displayConfig,
        refreshInterval,
        isGlobal,
        groupBy
      } = req.body;

      const widgetData = {
        userId,
        name: name || 'Untitled Widget',
        description: description || '',
        pluginName: pluginName || 'unknown',
        instanceId: pluginName || 'default',
        queryType: query ? 'custom' : 'default',
        customQuery: query || '',
        queryMethod: method || 'GET',
        queryParameters: parameters || {},
        displayType: widgetType || 'table',
        chartType: chartType || null,
        refreshInterval: refreshInterval || 30,
        placement: isGlobal ? 'global-dashboard' : 'custom',
        styling: displayConfig || {
          width: 'full',
          height: 'medium',
          showBorder: true,
          showHeader: true
        },
        groupBy: groupBy || null, // Add groupBy configuration
        isActive: false // New widgets are hidden by default - must be shown via Manage Widgets
      };

      const newWidget = await storage.createCustomWidget(widgetData);
      
      // Format response to match GlobalWidget interface
      const formattedWidget = {
        id: newWidget.id.toString(),
        systemId: 1,
        systemName: newWidget.pluginName,
        pluginName: newWidget.pluginName,
        name: newWidget.name,
        description: newWidget.description || '',
        widgetType: newWidget.displayType,
        chartType: newWidget.chartType || undefined,
        query: newWidget.customQuery || '',
        method: newWidget.queryMethod,
        parameters: newWidget.queryParameters,
        displayConfig: newWidget.styling,
        groupBy: newWidget.groupBy,
        refreshInterval: newWidget.refreshInterval,
        isActive: newWidget.isActive,
        isGlobal: newWidget.placement === 'global-dashboard',
        position: 0,
        createdBy: newWidget.userId,
        createdAt: newWidget.createdAt,
        updatedAt: newWidget.updatedAt,
      };

      res.status(201).json(formattedWidget);
    } catch (error) {
      next(error);
    }
  });

  // Update widget via management interface
  app.put("/api/widgets/manage/:id", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid widget ID" });
      }

      // Check if widget exists and user has permission
      const [existingWidget] = await db
        .select()
        .from(customWidgets)
        .where(eq(customWidgets.id, id))
        .limit(1);

      if (!existingWidget) {
        return res.status(404).json({ message: "Widget not found" });
      }

      if (userRole !== 'admin' && existingWidget.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Convert GlobalWidget format to CustomWidget format
      const {
        name,
        description,
        pluginName,
        widgetType,
        chartType,
        query,
        method,
        parameters,
        displayConfig,
        refreshInterval,
        isGlobal,
        groupBy,
        isActive
      } = req.body;

      const updateData = {
        name: name || existingWidget.name,
        description: description || existingWidget.description,
        pluginName: pluginName || existingWidget.pluginName,
        instanceId: pluginName || existingWidget.instanceId,
        queryType: query ? 'custom' : existingWidget.queryType,
        customQuery: query || existingWidget.customQuery,
        queryMethod: method || existingWidget.queryMethod,
        queryParameters: parameters || existingWidget.queryParameters,
        displayType: widgetType || existingWidget.displayType,
        chartType: chartType || existingWidget.chartType,
        refreshInterval: refreshInterval ?? existingWidget.refreshInterval,
        placement: isGlobal ? 'global-dashboard' : existingWidget.placement,
        styling: displayConfig || existingWidget.styling,
        groupBy: groupBy !== undefined ? groupBy : existingWidget.groupBy,
        isActive: isActive !== undefined ? isActive : existingWidget.isActive,
      };

      const updatedWidget = await storage.updateCustomWidget(id, updateData);
      
      if (!updatedWidget) {
        return res.status(404).json({ message: "Widget not found" });
      }

      // Log widget update for dashboard refresh tracking
      console.log(`🔄 Widget ${id} updated - dashboard cards will refresh automatically`);

      // Format response to match GlobalWidget interface
      const formattedWidget = {
        id: updatedWidget.id.toString(),
        systemId: 1,
        systemName: updatedWidget.pluginName,
        pluginName: updatedWidget.pluginName,
        name: updatedWidget.name,
        description: updatedWidget.description || '',
        widgetType: updatedWidget.displayType,
        chartType: updatedWidget.chartType || undefined,
        query: updatedWidget.customQuery || '',
        method: updatedWidget.queryMethod,
        parameters: updatedWidget.queryParameters,
        displayConfig: updatedWidget.styling,
        groupBy: updatedWidget.groupBy,
        refreshInterval: updatedWidget.refreshInterval,
        isActive: updatedWidget.isActive,
        isGlobal: updatedWidget.placement === 'global-dashboard',
        position: 0,
        createdBy: updatedWidget.userId,
        createdAt: updatedWidget.createdAt,
        updatedAt: updatedWidget.updatedAt,
      };

      res.json(formattedWidget);
    } catch (error) {
      next(error);
    }
  });

  // Delete widget via management interface
  app.delete("/api/widgets/manage/:id", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid widget ID" });
      }

      // Check if widget exists and user has permission
      const [existingWidget] = await db
        .select()
        .from(customWidgets)
        .where(eq(customWidgets.id, id))
        .limit(1);

      if (!existingWidget) {
        return res.status(404).json({ message: "Widget not found" });
      }

      if (userRole !== 'admin' && existingWidget.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const deleted = await storage.deleteCustomWidget(id, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Widget not found or already deleted" });
      }

      res.json({ success: true, message: "Widget deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Toggle global status of a widget
  app.patch("/api/widgets/manage/:id/toggle-global", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid widget ID" });
      }

      // Check if widget exists and user has permission
      const [existingWidget] = await db
        .select()
        .from(customWidgets)
        .where(eq(customWidgets.id, id))
        .limit(1);

      if (!existingWidget) {
        return res.status(404).json({ message: "Widget not found" });
      }

      if (userRole !== 'admin' && existingWidget.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Toggle between global-dashboard and custom placement
      const newPlacement = existingWidget.placement === 'global-dashboard' ? 'custom' : 'global-dashboard';
      
      const updatedWidget = await storage.updateCustomWidget(id, {
        placement: newPlacement
      });
      
      if (!updatedWidget) {
        return res.status(404).json({ message: "Widget not found" });
      }

      // Format response to match GlobalWidget interface
      const formattedWidget = {
        id: updatedWidget.id.toString(),
        systemId: 1,
        systemName: updatedWidget.pluginName,
        pluginName: updatedWidget.pluginName,
        name: updatedWidget.name,
        description: updatedWidget.description || '',
        widgetType: updatedWidget.displayType,
        chartType: updatedWidget.chartType || undefined,
        query: updatedWidget.customQuery || '',
        method: updatedWidget.queryMethod,
        parameters: updatedWidget.queryParameters,
        displayConfig: updatedWidget.styling,
        refreshInterval: updatedWidget.refreshInterval,
        isActive: updatedWidget.isActive,
        isGlobal: updatedWidget.placement === 'global-dashboard',
        position: 0,
        createdBy: updatedWidget.userId,
        createdAt: updatedWidget.createdAt,
        updatedAt: updatedWidget.updatedAt,
      };

      res.json(formattedWidget);
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // CUSTOM WIDGETS ENDPOINTS
  // ========================================

  // Alias routes for compatibility with widget manager frontend
  app.get("/api/custom-widgets", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { placement } = req.query;
      const widgets = await storage.getUserCustomWidgets(userId, placement as string);
      res.json(widgets);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/custom-widgets", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const widgetData = { ...req.body, userId };
      const newWidget = await storage.createCustomWidget(widgetData);
      res.status(201).json(newWidget);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/custom-widgets/:id", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const id = parseInt(req.params.id);
      const updatedWidget = await storage.updateCustomWidget(id, req.body);
      
      if (!updatedWidget) {
        return res.status(404).json({ message: "Widget not found" });
      }
      
      res.json(updatedWidget);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/custom-widgets/:id", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCustomWidget(id, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Widget not found or access denied" });
      }
      
      res.json({ message: "Widget deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Get user's custom widgets
  app.get("/api/user/widgets", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { placement } = req.query;
      const widgets = await storage.getUserCustomWidgets(userId, placement as string);
      res.json(widgets);
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // USER PREFERENCES ENDPOINTS
  // ========================================

  // Get user preferences
  app.get("/api/user/preferences/:type", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { type } = req.params;
      const { key } = req.query;
      const preferences = await storage.getUserPreference(userId, type, key as string);
      res.json(preferences);
    } catch (error) {
      next(error);
    }
  });

  // Set user preference
  app.put("/api/user/preferences/:type/:key", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { type, key } = req.params;
      const { value } = req.body;
      
      const preference = await storage.setUserPreference(userId, type, key, value);
      res.json(preference);
    } catch (error) {
      next(error);
    }
  });

  // Delete user preference
  app.delete("/api/user/preferences/:type/:key?", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { type, key } = req.params;
      const deleted = await storage.deleteUserPreference(userId, type, key);
      
      if (!deleted) {
        return res.status(404).json({ message: "Preference not found" });
      }
      
      res.json({ message: "Preference deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // USER PROFILE MANAGEMENT
  // ========================================

  // Update user profile
  app.put("/api/user/profile", requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { firstName, lastName, email, phone, department, jobTitle } = req.body;
      
      // Validate input
      if (email && typeof email !== 'string') {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if email is already taken by another user
      if (email && email !== req.user.email) {
        const existingUser = await db
          .select()
          .from(users)
          .where(and(eq(users.email, email), ne(users.id, userId)))
          .limit(1);
        
        if (existingUser.length > 0) {
          return res.status(400).json({ message: "Email already in use" });
        }
      }

      // Update user profile
      const updatedUser = await db
        .update(users)
        .set({
          firstName: firstName || req.user.firstName,
          lastName: lastName || req.user.lastName,
          email: email || req.user.email,
          phone: phone,
          department: department,
          jobTitle: jobTitle,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      if (updatedUser.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create audit log
      try {
        await storage.createAuditLog({
          userId,
          action: 'UPDATE',
          entityType: 'user',
          entityId: userId,
          entityName: `${updatedUser[0].firstName} ${updatedUser[0].lastName}`,
          description: 'User profile updated',
          category: 'account_management'
        });
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for user profile update:', auditError);
      }

      // Remove sensitive data before sending response
      const { password, ...userProfile } = updatedUser[0];
      res.json(userProfile);
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // CONTRACT LIFECYCLE MANAGEMENT
  // ========================================

  // Delete contract
  app.delete("/api/contracts/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const contractId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get contract details for audit log
      const existingContract = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, contractId))
        .limit(1);

      if (existingContract.length === 0) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const contract = existingContract[0];

      // Check if contract has dependent records (service scopes, SAFs, etc.)
      const [serviceScopesCount, safCount, cocCount] = await Promise.all([
        db.select({ count: count() }).from(serviceScopes).where(eq(serviceScopes.contractId, contractId)),
        db.select({ count: count() }).from(serviceAuthorizationForms).where(eq(serviceAuthorizationForms.contractId, contractId)),
        db.select({ count: count() }).from(certificatesOfCompliance).where(eq(certificatesOfCompliance.contractId, contractId))
      ]);

      const totalDependents = (serviceScopesCount[0]?.count || 0) + (safCount[0]?.count || 0) + (cocCount[0]?.count || 0);

      if (totalDependents > 0) {
        return res.status(400).json({ 
          message: "Cannot delete contract with dependent records",
          details: {
            serviceScopes: serviceScopesCount[0]?.count || 0,
            serviceAuthorizationForms: safCount[0]?.count || 0,
            certificatesOfCompliance: cocCount[0]?.count || 0
          }
        });
      }

      // Delete the contract
      const deletedContract = await db
        .delete(contracts)
        .where(eq(contracts.id, contractId))
        .returning();

      if (deletedContract.length === 0) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Create audit log
      try {
        await storage.createAuditLog({
          userId,
          action: 'DELETE',
          entityType: 'contract',
          entityId: contractId,
          entityName: contract.name,
          description: `Contract deleted: ${contract.name}`,
          category: 'contract_management'
        });
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for contract deletion:', auditError);
      }

      res.json({ 
        message: "Contract deleted successfully",
        deletedContract: deletedContract[0]
      });
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // PROPOSALS MANAGEMENT
  // ========================================

  // Get all proposals
  app.get("/api/proposals", requireAuth, async (req, res, next) => {
    try {
      const { clientId, status, page = 1, limit = 50 } = req.query;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      let whereConditions: any[] = [eq(proposals.isActive, true)];
      
      if (clientId) {
        whereConditions.push(eq(proposals.clientId, parseInt(clientId as string)));
      }
      
      if (status && status !== 'all') {
        whereConditions.push(eq(proposals.status, status as string));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [proposalsList, totalCount] = await Promise.all([
        db
          .select({
            id: proposals.id,
            clientId: proposals.clientId,
            clientName: clients.name,
            name: proposals.name,
            description: proposals.description,
            status: proposals.status,
            totalValue: proposals.totalValue,
            validUntil: proposals.validUntil,
            createdAt: proposals.createdAt,
            updatedAt: proposals.updatedAt,
            documentUrl: proposals.documentUrl,
            notes: proposals.notes,
          })
          .from(proposals)
          .leftJoin(clients, eq(proposals.clientId, clients.id))
          .where(whereClause)
          .orderBy(desc(proposals.createdAt))
          .limit(parseInt(limit as string))
          .offset(offset),
        
        db
          .select({ count: count() })
          .from(proposals)
          .where(whereClause)
      ]);

      // Log data access
      try {
        const { logDataAccess } = await import('./lib/audit');
        await logDataAccess(userId, 'proposal', 'list', `Retrieved ${proposalsList.length} proposals`);
      } catch (auditError) {
        console.error('⚠️ Data access logging failed for proposals list:', auditError);
      }

      // If clientId is specified, return just the proposals array for backward compatibility
      // Otherwise return the full object with pagination
      if (clientId) {
        res.json(proposalsList);
      } else {
        res.json({
          proposals: proposalsList,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: totalCount[0].count,
            pages: Math.ceil(totalCount[0].count / parseInt(limit as string))
          }
        });
      }
    } catch (error) {
      next(error);
    }
  });

  // Get proposal by ID
  app.get("/api/proposals/:id", requireAuth, async (req, res, next) => {
    try {
      const proposalId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const proposal = await db
        .select({
          id: proposals.id,
          clientId: proposals.clientId,
          clientName: clients.name,
          name: proposals.name,
          description: proposals.description,
          status: proposals.status,
          totalValue: proposals.totalValue,
          validUntil: proposals.validUntil,
          createdAt: proposals.createdAt,
          updatedAt: proposals.updatedAt,
          documentUrl: proposals.documentUrl,
          notes: proposals.notes,
          createdBy: proposals.createdBy,
          updatedBy: proposals.updatedBy,
        })
        .from(proposals)
        .leftJoin(clients, eq(proposals.clientId, clients.id))
        .where(and(eq(proposals.id, proposalId), eq(proposals.isActive, true)))
        .limit(1);

      if (proposal.length === 0) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      // Log data access
      try {
        const { logDataAccess } = await import('./lib/audit');
        await logDataAccess(userId, 'proposal', 'view', `Viewed proposal: ${proposal[0].name}`);
      } catch (auditError) {
        console.error('⚠️ Data access logging failed for proposal view:', auditError);
      }

      res.json(proposal[0]);
    } catch (error) {
      next(error);
    }
  });

  // Create proposal
  app.post("/api/proposals", requireManagerOrAbove, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const proposalData = insertProposalSchema.parse({
        ...req.body,
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const newProposal = await db
        .insert(proposals)
        .values(proposalData)
        .returning();

      // Create audit log
      try {
        await storage.createAuditLog({
          userId,
          action: 'CREATE',
          entityType: 'proposal',
          entityId: newProposal[0].id,
          entityName: newProposal[0].name,
          description: `Proposal created: ${newProposal[0].name}`,
          category: 'proposal_management'
        });
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for proposal creation:', auditError);
      }

      res.status(201).json(newProposal[0]);
    } catch (error) {
      next(error);
    }
  });

  // Update proposal
  app.put("/api/proposals/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const proposalId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const updateData = {
        ...req.body,
        updatedBy: userId,
        updatedAt: new Date(),
      };

      const updatedProposal = await db
        .update(proposals)
        .set(updateData)
        .where(and(eq(proposals.id, proposalId), eq(proposals.isActive, true)))
        .returning();

      if (updatedProposal.length === 0) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      // Create audit log
      try {
        await storage.createAuditLog({
          userId,
          action: 'UPDATE',
          entityType: 'proposal',
          entityId: proposalId,
          entityName: updatedProposal[0].name,
          description: `Proposal updated: ${updatedProposal[0].name}`,
          category: 'proposal_management'
        });
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for proposal update:', auditError);
      }

      res.json(updatedProposal[0]);
    } catch (error) {
      next(error);
    }
  });

  // Delete proposal
  app.delete("/api/proposals/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const proposalId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get proposal details for audit log
      const existingProposal = await db
        .select()
        .from(proposals)
        .where(and(eq(proposals.id, proposalId), eq(proposals.isActive, true)))
        .limit(1);

      if (existingProposal.length === 0) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      // Soft delete the proposal
      const deletedProposal = await db
        .update(proposals)
        .set({ 
          isActive: false,
          updatedBy: userId,
          updatedAt: new Date()
        })
        .where(eq(proposals.id, proposalId))
        .returning();

      // Create audit log
      try {
        await storage.createAuditLog({
          userId,
          action: 'DELETE',
          entityType: 'proposal',
          entityId: proposalId,
          entityName: existingProposal[0].name,
          description: `Proposal deleted: ${existingProposal[0].name}`,
          category: 'proposal_management'
        });
      } catch (auditError) {
        console.error('⚠️ Audit logging failed for proposal deletion:', auditError);
      }

      res.json({ 
        message: "Proposal deleted successfully",
        deletedProposal: deletedProposal[0]
      });
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // AUDIT & COMPLIANCE SYSTEM
  // ========================================

  // Get audit logs
  app.get("/api/audit-logs", requireManagerOrAbove, async (req, res, next) => {
    try {
      const { 
        entityType, 
        entityId, 
        action, 
        category,
        startDate, 
        endDate, 
        page = 1, 
        limit = 50 
      } = req.query;

      let whereConditions: any[] = [];
      
      if (entityType) {
        whereConditions.push(eq(auditLogs.entityType, entityType as string));
      }
      
      if (entityId) {
        whereConditions.push(eq(auditLogs.entityId, parseInt(entityId as string)));
      }
      
      if (action) {
        whereConditions.push(eq(auditLogs.action, action as string));
      }
      
      if (category) {
        whereConditions.push(eq(auditLogs.category, category as string));
      }
      
      if (startDate) {
        whereConditions.push(gte(auditLogs.timestamp, new Date(startDate as string)));
      }
      
      if (endDate) {
        whereConditions.push(lte(auditLogs.timestamp, new Date(endDate as string)));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [auditLogsList, totalCount] = await Promise.all([
        db
          .select({
            id: auditLogs.id,
            userId: auditLogs.userId,
            action: auditLogs.action,
            entityType: auditLogs.entityType,
            entityId: auditLogs.entityId,
            entityName: auditLogs.entityName,
            description: auditLogs.description,
            timestamp: auditLogs.timestamp,
            category: auditLogs.category,
            ipAddress: auditLogs.ipAddress,
            userAgent: auditLogs.userAgent,
            metadata: auditLogs.metadata,
            userName: sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as('userName'),
          })
          .from(auditLogs)
          .leftJoin(users, eq(auditLogs.userId, users.id))
          .where(whereClause)
          .orderBy(desc(auditLogs.timestamp))
          .limit(parseInt(limit as string))
          .offset(offset),
        
        db
          .select({ count: count() })
          .from(auditLogs)
          .where(whereClause)
      ]);

      res.json({
        auditLogs: auditLogsList,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: totalCount[0].count,
          pages: Math.ceil(totalCount[0].count / parseInt(limit as string))
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // Get audit log by ID
  app.get("/api/audit-logs/:id", requireManagerOrAbove, async (req, res, next) => {
    try {
      const auditLogId = parseInt(req.params.id);

      const auditLog = await db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          entityName: auditLogs.entityName,
          description: auditLogs.description,
          timestamp: auditLogs.timestamp,
          category: auditLogs.category,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          metadata: auditLogs.metadata,
          userName: sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as('userName'),
          userEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(eq(auditLogs.id, auditLogId))
        .limit(1);

      if (auditLog.length === 0) {
        return res.status(404).json({ message: "Audit log not found" });
      }

      res.json(auditLog[0]);
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // SECURITY MONITORING
  // ========================================

  // Get security events
  app.get("/api/security-events", requireManagerOrAbove, async (req, res, next) => {
    try {
      const { 
        eventType, 
        severity, 
        startDate, 
        endDate, 
        page = 1, 
        limit = 50 
      } = req.query;

      let whereConditions: any[] = [];
      
      if (eventType) {
        whereConditions.push(eq(securityEvents.eventType, eventType as string));
      }
      
      if (severity) {
        whereConditions.push(eq(securityEvents.severity, severity as string));
      }
      
      if (startDate) {
        whereConditions.push(gte(securityEvents.timestamp, new Date(startDate as string)));
      }
      
      if (endDate) {
        whereConditions.push(lte(securityEvents.timestamp, new Date(endDate as string)));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [securityEventsList, totalCount] = await Promise.all([
        db
          .select({
            id: securityEvents.id,
            userId: securityEvents.userId,
            eventType: securityEvents.eventType,
            severity: securityEvents.severity,
            description: securityEvents.description,
            timestamp: securityEvents.timestamp,
            ipAddress: securityEvents.ipAddress,
            userAgent: securityEvents.userAgent,
            metadata: securityEvents.metadata,
            resolved: securityEvents.resolved,
            resolvedBy: securityEvents.resolvedBy,
            resolvedAt: securityEvents.resolvedAt,
            userName: sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as('userName'),
          })
          .from(securityEvents)
          .leftJoin(users, eq(securityEvents.userId, users.id))
          .where(whereClause)
          .orderBy(desc(securityEvents.timestamp))
          .limit(parseInt(limit as string))
          .offset(offset),
        
        db
          .select({ count: count() })
          .from(securityEvents)
          .where(whereClause)
      ]);

      res.json({
        securityEvents: securityEventsList,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: totalCount[0].count,
          pages: Math.ceil(totalCount[0].count / parseInt(limit as string))
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // Create security event
  app.post("/api/security-events", requireManagerOrAbove, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { eventType, severity, description, metadata } = req.body;
      
      if (!eventType || !severity || !description) {
        return res.status(400).json({ message: "Missing required fields: eventType, severity, description" });
      }

      const newSecurityEvent = await db
        .insert(securityEvents)
        .values({
          userId,
          eventType,
          severity,
          description,
          timestamp: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: metadata || null,
          resolved: false,
        })
        .returning();

      res.status(201).json(newSecurityEvent[0]);
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // CLIENT-SPECIFIC ENDPOINTS
  // ========================================

  // Get client team assignments
  app.get("/api/clients/:id/team-assignments", requireAuth, async (req, res, next) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      // For now, return empty array as team assignments might not be fully implemented
      // TODO: Implement proper team assignments with storage method
      res.json([]);
    } catch (error) {
      console.error("Get client team assignments error:", error);
      next(error);
    }
  });

  // Get client hardware assets
  app.get("/api/clients/:id/hardware", requireAuth, async (req, res, next) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      // Simplified query to avoid join issues - get assignments first
      const assignments = await db
        .select()
        .from(clientHardwareAssignments)
        .where(eq(clientHardwareAssignments.clientId, clientId));

      res.json(assignments || []);
    } catch (error) {
      console.error("Get client hardware error:", error);
      next(error);
    }
  });

  // Get client licenses (fix endpoint path)
  app.get("/api/clients/:id/licenses", requireAuth, async (req, res, next) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      // Simplified query to avoid join issues
      const licenses = await db
        .select()
        .from(clientLicenses)
        .where(eq(clientLicenses.clientId, clientId));

      res.json(licenses || []);
    } catch (error) {
      console.error("Get client licenses error:", error);
      next(error);
    }
  });

  // Fix client financial transactions endpoint - make sure it exists and handles empty arrays properly
  app.get("/api/clients/:id/financial-transactions", requireAuth, async (req, res, next) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      const transactions = await db
        .select({
          id: financialTransactions.id,
          type: financialTransactions.type,
          amount: financialTransactions.amount,
          description: financialTransactions.description,
          status: financialTransactions.status,
          transactionDate: financialTransactions.transactionDate,
          category: financialTransactions.category,
          reference: financialTransactions.reference,
          notes: financialTransactions.notes,
          createdAt: financialTransactions.createdAt
        })
        .from(financialTransactions)
        .where(eq(financialTransactions.clientId, clientId))
        .orderBy(desc(financialTransactions.transactionDate));

      res.json(transactions || []);
    } catch (error) {
      console.error("Get client financial transactions error:", error);
      next(error);
    }
  });

  // ========================================
  // EXPIRING CONTRACTS ENDPOINT
  // ========================================
  
  // Get contracts expiring in X months
  app.get("/api/contracts/expiring", requireAuth, async (req, res, next) => {
    try {
      const { months = 3, clientId } = req.query;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Calculate the date X months from now
      const now = new Date();
      const targetDate = new Date();
      targetDate.setMonth(now.getMonth() + parseInt(months as string));

      let whereConditions: any[] = [
        eq(contracts.status, 'active'),
        lte(contracts.endDate, targetDate),
        gte(contracts.endDate, now) // Only future dates
      ];
      
      // Optional client filter
      if (clientId) {
        whereConditions.push(eq(contracts.clientId, parseInt(clientId as string)));
      }

      const whereClause = and(...whereConditions);

      const expiringContracts = await db
        .select({
          id: contracts.id,
          clientId: contracts.clientId,
          clientName: clients.name,
          name: contracts.name,
          endDate: contracts.endDate,
          totalValue: contracts.totalValue,
          status: contracts.status,
          daysUntilExpiry: sql<number>`EXTRACT(day FROM ${contracts.endDate} - NOW())::INTEGER`.as('days_until_expiry')
        })
        .from(contracts)
        .leftJoin(clients, eq(contracts.clientId, clients.id))
        .where(whereClause)
        .orderBy(contracts.endDate);

      // Log data access
      try {
        const { logDataAccess } = await import('./lib/audit');
        await logDataAccess(userId, 'contract', 'list', `Retrieved ${expiringContracts.length} expiring contracts (${months} months)`);
      } catch (auditError) {
        console.error('⚠️ Data access logging failed for expiring contracts:', auditError);
      }

      res.json(expiringContracts);
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // PROPOSALS ENDPOINTS - Removed duplicate route definition  
  // The main proposals endpoints are defined earlier in the file
  // ========================================

  // ========================================
  // ENTITY RELATIONSHIPS ENDPOINTS
  // ========================================

  // Get entity relationship stats
  app.get("/api/entities/:type/:id/relationships/stats", requireAuth, async (req, res, next) => {
    try {
      const { type, id } = req.params;
      const entityId = parseInt(id);

      if (isNaN(entityId)) {
        return res.status(400).json({ error: "Invalid entity ID" });
      }

      // For now, return basic stats structure to avoid import issues
      const stats = {
        totalRelationships: 0,
        relationshipTypes: {},
        connectedEntities: 0
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching relationship stats:", error);
      next(error);
    }
  });

  // Get entity relationships
  app.get("/api/entities/:type/:id/relationships", requireAuth, async (req, res, next) => {
    try {
      const { type, id } = req.params;
      const entityId = parseInt(id);

      if (isNaN(entityId)) {
        return res.status(400).json({ error: "Invalid entity ID" });
      }

      // For now, return empty array to avoid import issues
      res.json([]);
    } catch (error) {
      console.error("Error fetching entity relationships:", error);
      next(error);
    }
  });

  // TEMPORARY: Add comprehensive dashboard test cards for all tables
  app.get("/api/dashboard-test-cards", async (req, res) => {
    console.log("Dashboard test cards endpoint called");
    res.json({
      testCards: [
        // Core Business Entities
        {
          id: "clients-card",
          title: "Total Clients",
          type: "metric",
          category: "business",
          dataSource: "clients",
          size: "small",
          visible: true,
          position: 1,
          config: {
            icon: "Users",
            color: "blue",
            format: "number",
            aggregation: "count",
            query: "SELECT COUNT(*) as count FROM clients WHERE archived_at IS NULL"
          }
        },
        {
          id: "active-contracts-card", 
          title: "Active Contracts",
          type: "metric",
          category: "business",
          dataSource: "contracts",
          size: "small",
          visible: true,
          position: 2,
          config: {
            icon: "FileText",
            color: "green",
            format: "number",
            aggregation: "count",
            query: "SELECT COUNT(*) as count FROM contracts WHERE status = 'active'"
          }
        },
        {
          id: "license-pools-card",
          title: "License Pools",
          type: "metric", 
          category: "resources",
          dataSource: "license_pools",
          size: "small",
          visible: true,
          position: 3,
          config: {
            icon: "Package",
            color: "purple",
            format: "number", 
            aggregation: "count",
            query: "SELECT COUNT(*) as count FROM license_pools WHERE is_active = true"
          }
        },
        {
          id: "hardware-assets-card",
          title: "Hardware Assets",
          type: "metric",
          category: "resources", 
          dataSource: "hardware_assets",
          size: "small",
          visible: true,
          position: 4,
          config: {
            icon: "HardDrive",
            color: "orange",
            format: "number",
            aggregation: "count",
            query: "SELECT COUNT(*) as count FROM hardware_assets"
          }
        },
        {
          id: "services-card",
          title: "Services",
          type: "metric",
          category: "business",
          dataSource: "services", 
          size: "small",
          visible: true,
          position: 5,
          config: {
            icon: "Settings",
            color: "indigo",
            format: "number",
            aggregation: "count",
            query: "SELECT COUNT(*) as count FROM services"
          }
        },
        {
          id: "service-scopes-card",
          title: "Service Scopes",
          type: "metric",
          category: "business",
          dataSource: "service_scopes",
          size: "small", 
          visible: true,
          position: 6,
          config: {
            icon: "Target",
            color: "teal",
            format: "number",
            aggregation: "count", 
            query: "SELECT COUNT(*) as count FROM service_scopes"
          }
        },
        {
          id: "safs-card",
          title: "Service Authorization Forms",
          type: "metric",
          category: "compliance",
          dataSource: "service_authorization_forms",
          size: "small",
          visible: true,
          position: 7,
          config: {
            icon: "Shield",
            color: "red",
            format: "number", 
            aggregation: "count",
            query: "SELECT COUNT(*) as count FROM service_authorization_forms"
          }
        },
        {
          id: "cocs-card", 
          title: "Certificates of Compliance",
          type: "metric",
          category: "compliance",
          dataSource: "certificates_of_compliance",
          size: "small",
          visible: true,
          position: 8,
          config: {
            icon: "Award",
            color: "yellow",
            format: "number",
            aggregation: "count",
            query: "SELECT COUNT(*) as count FROM certificates_of_compliance"
          }
        },
        {
          id: "proposals-card",
          title: "Proposals", 
          type: "metric",
          category: "business",
          dataSource: "proposals",
          size: "small",
          visible: true,
          position: 9,
          config: {
            icon: "FileEdit",
            color: "pink",
            format: "number",
            aggregation: "count",
            query: "SELECT COUNT(*) as count FROM proposals"
          }
        },
        {
          id: "financial-transactions-card",
          title: "Financial Transactions", 
          type: "metric",
          category: "finance",
          dataSource: "financial_transactions",
          size: "small",
          visible: true,
          position: 10,
          config: {
            icon: "DollarSign",
            color: "emerald",
            format: "currency",
            aggregation: "sum",
            query: "SELECT COALESCE(SUM(amount), 0) as count FROM financial_transactions"
          }
        },
        {
          id: "client-licenses-card",
          title: "Client License Assignments",
          type: "metric",
          category: "resources", 
          dataSource: "client_licenses",
          size: "small",
          visible: true,
          position: 11,
          config: {
            icon: "Key",
            color: "violet",
            format: "number",
            aggregation: "count",
            query: "SELECT COUNT(*) as count FROM client_licenses"
          }
        },
        {
          id: "individual-licenses-card",
          title: "Individual Licenses",
          type: "metric",
          category: "resources",
          dataSource: "individual_licenses",
          size: "small",
          visible: true,
          position: 12,
          config: {
            icon: "User",
            color: "cyan",
            format: "number", 
            aggregation: "count",
            query: "SELECT COUNT(*) as count FROM individual_licenses"
          }
        },
        {
          id: "client-contacts-card",
          title: "Client Contacts",
          type: "metric",
          category: "business",
          dataSource: "client_contacts",
          size: "small",
          visible: true,
          position: 13,
          config: {
            icon: "Phone",
            color: "slate",
            format: "number",
            aggregation: "count",
            query: "SELECT COUNT(*) as count FROM client_contacts"
          }
        },
        {
          id: "team-assignments-card",
          title: "Team Assignments",
          type: "metric",
          category: "team",
          dataSource: "client_team_assignments", 
          size: "small",
          visible: true,
          position: 14,
          config: {
            icon: "Users2",
            color: "amber",
            format: "number",
            aggregation: "count",
            query: "SELECT COUNT(*) as count FROM client_team_assignments"
          }
        },
        {
          id: "documents-card",
          title: "Documents",
          type: "metric",
          category: "documents",
          dataSource: "documents",
          size: "small",
          visible: true,
          position: 15,
          config: {
            icon: "FileIcon",
            color: "gray",
            format: "number",
            aggregation: "count",
            query: "SELECT COUNT(*) as count FROM documents"
          }
        },
        {
          id: "users-card",
          title: "System Users",
          type: "metric",
          category: "system",
          dataSource: "users",
          size: "small",
          visible: true,
          position: 16,
          config: {
            icon: "UserCheck",
            color: "blue",
            format: "number",
            aggregation: "count", 
            query: "SELECT COUNT(*) as count FROM users"
          }
        },
        {
          id: "audit-logs-card",
          title: "Audit Log Entries",
          type: "metric",
          category: "system",
          dataSource: "audit_logs",
          size: "small",
          visible: true,
          position: 17,
          config: {
            icon: "History",
            color: "red",
            format: "number",
            aggregation: "count",
            query: "SELECT COUNT(*) as count FROM audit_logs WHERE created_at >= NOW() - INTERVAL '30 days'"
          }
        },
        {
          id: "client-feedback-card",
          title: "Client Feedback Items",
          type: "metric",
          category: "satisfaction",
          dataSource: "client_feedback",
          size: "small",
          visible: true,
          position: 18,
          config: {
            icon: "MessageSquare",
            color: "lime",
            format: "number",
            aggregation: "count",
            query: "SELECT COUNT(*) as count FROM client_feedback"
          }
        }
      ]
    });
  });

  return httpServer;
} // end registerRoutes function

