import { db } from "../db";
import { 
  auditLogs, 
  changeHistory, 
  securityEvents, 
  dataAccessLogs, 
  systemEvents,
  InsertAuditLog,
  InsertChangeHistory,
  InsertSecurityEvent,
  InsertDataAccessLog,
  InsertSystemEvent
} from "@shared/schema";
import { Request } from "express";

// Helper to extract client info from request
function getClientInfo(req: Request) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    sessionId: req.sessionID || null,
  };
}

// Helper to generate batch ID for grouped operations
export function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Main audit logging function
export async function logAudit(data: Partial<InsertAuditLog> & {
  action: string;
  entityType: string;
  description: string;
  category: string;
}, req?: Request) {
  const clientInfo = req ? getClientInfo(req) : {};
  
  try {
    await db.insert(auditLogs).values({
      severity: 'info',
      ...data,
      ...clientInfo,
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    // Don't throw - audit failures shouldn't break the main operation
  }
}

// Security event logging
export async function logSecurityEvent(data: Partial<InsertSecurityEvent> & {
  eventType: string;
  source: string;
  success: boolean;
}, req?: Request) {
  const clientInfo = req ? getClientInfo(req) : {};
  
  try {
    await db.insert(securityEvents).values({
      riskScore: 0,
      blocked: false,
      ...data,
      ...clientInfo,
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// Data access logging
export async function logDataAccess(data: Partial<InsertDataAccessLog> & {
  userId: number;
  entityType: string;
  accessType: string;
  accessMethod: string;
}, req?: Request) {
  const clientInfo = req ? getClientInfo(req) : {};
  
  try {
    await db.insert(dataAccessLogs).values({
      sensitiveData: false,
      resultCount: 1,
      ...data,
      ...clientInfo,
    });
  } catch (error) {
    console.error('Failed to log data access:', error);
  }
}

// Change history logging with rollback capability
export async function logChange(data: Partial<InsertChangeHistory> & {
  entityType: string;
  entityId: number;
  userId: number;
  action: string;
}, req?: Request) {
  const clientInfo = req ? getClientInfo(req) : {};
  
  try {
    await db.insert(changeHistory).values({
      automaticChange: false,
      ...data,
      ...clientInfo,
    });
  } catch (error) {
    console.error('Failed to log change history:', error);
  }
}

// System event logging
export async function logSystemEvent(data: Partial<InsertSystemEvent> & {
  eventType: string;
  source: string;
  severity: string;
  category: string;
  description: string;
}) {
  try {
    await db.insert(systemEvents).values(data);
  } catch (error) {
    console.error('Failed to log system event:', error);
  }
}

// Enhanced logging for specific operations
export class AuditLogger {
  private req?: Request;
  private userId?: number;
  private batchId?: string;

  constructor(req?: Request, userId?: number) {
    this.req = req;
    this.userId = userId;
  }

  setBatchId(batchId: string) {
    this.batchId = batchId;
    return this;
  }

  // Log user login
  async logLogin(success: boolean, failureReason?: string) {
    await logSecurityEvent({
      userId: this.userId,
      eventType: success ? 'login_success' : 'login_failure',
      source: 'web',
      success,
      failureReason,
      riskScore: success ? 0 : 25,
    }, this.req);

    if (success && this.userId) {
      await logAudit({
        userId: this.userId,
        action: 'login',
        entityType: 'user',
        entityId: this.userId,
        description: 'User logged in successfully',
        category: 'authentication',
        severity: 'info',
      }, this.req);
    }
  }

  // Log user logout
  async logLogout() {
    if (this.userId) {
      await logSecurityEvent({
        userId: this.userId,
        eventType: 'logout',
        source: 'web',
        success: true,
        riskScore: 0,
      }, this.req);

      await logAudit({
        userId: this.userId,
        action: 'logout',
        entityType: 'user',
        entityId: this.userId,
        description: 'User logged out',
        category: 'authentication',
        severity: 'info',
      }, this.req);
    }
  }

  // Log entity creation
  async logCreate(entityType: string, entityId: number, entityName: string, data?: any) {
    if (!this.userId) return;

    await logAudit({
      userId: this.userId,
      action: 'create',
      entityType,
      entityId,
      entityName,
      description: `Created ${entityType}: ${entityName}`,
      category: 'data_modification',
      severity: 'info',
      metadata: { createdData: data },
    }, this.req);

    await logChange({
      entityType,
      entityId,
      userId: this.userId,
      action: 'create',
      entityName,
      newValue: JSON.stringify(data),
      batchId: this.batchId,
      rollbackData: { action: 'delete', entityType, entityId },
    }, this.req);
  }

  // Log entity update with detailed field changes
  async logUpdate(entityType: string, entityId: number, entityName: string, changes: Array<{ field: string, oldValue: any, newValue: any }>, fullOldData?: any) {
    if (!this.userId) return;

    await logAudit({
      userId: this.userId,
      action: 'update',
      entityType,
      entityId,
      entityName,
      description: `Updated ${entityType}: ${entityName} (${changes.length} fields changed)`,
      category: 'data_modification',
      severity: 'info',
      metadata: { fieldsChanged: changes.map(c => c.field) },
    }, this.req);

    // Log each field change separately for granular tracking
    for (const change of changes) {
      await logChange({
        entityType,
        entityId,
        userId: this.userId,
        action: 'update',
        entityName,
        fieldName: change.field,
        oldValue: typeof change.oldValue === 'object' ? JSON.stringify(change.oldValue) : String(change.oldValue || ''),
        newValue: typeof change.newValue === 'object' ? JSON.stringify(change.newValue) : String(change.newValue || ''),
        batchId: this.batchId,
        rollbackData: { 
          action: 'update', 
          entityType, 
          entityId, 
          field: change.field, 
          value: change.oldValue,
          fullData: fullOldData 
        },
      }, this.req);
    }
  }

  // Log entity deletion
  async logDelete(entityType: string, entityId: number, entityName: string, deletedData?: any) {
    if (!this.userId) return;

    await logAudit({
      userId: this.userId,
      action: 'delete',
      entityType,
      entityId,
      entityName,
      description: `Deleted ${entityType}: ${entityName}`,
      category: 'data_modification',
      severity: 'medium',
      metadata: { deletedData },
    }, this.req);

    await logChange({
      entityType,
      entityId,
      userId: this.userId,
      action: 'delete',
      entityName,
      oldValue: JSON.stringify(deletedData),
      batchId: this.batchId,
      rollbackData: { 
        action: 'create', 
        entityType, 
        data: deletedData 
      },
    }, this.req);
  }

  // Log data viewing/access
  async logView(entityType: string, entityId?: number, entityName?: string, scope: 'full' | 'partial' | 'summary' = 'full', resultCount = 1) {
    if (!this.userId) return;

    await logDataAccess({
      userId: this.userId,
      entityType,
      entityId,
      entityName,
      accessType: 'view',
      accessMethod: 'web_ui',
      dataScope: scope,
      resultCount,
      sensitiveData: ['client', 'user', 'financial_transaction'].includes(entityType),
    }, this.req);
  }

  // Log bulk operations
  async logBulkOperation(operation: string, entityType: string, count: number, description: string) {
    if (!this.userId) return;

    await logAudit({
      userId: this.userId,
      action: operation,
      entityType,
      description: `${description} (${count} records)`,
      category: 'data_modification',
      severity: count > 10 ? 'medium' : 'info',
      metadata: { bulkOperation: true, recordCount: count, batchId: this.batchId },
    }, this.req);
  }

  // Log data export
  async logExport(entityType: string, format: string, count: number, filters?: any) {
    if (!this.userId) return;

    await logAudit({
      userId: this.userId,
      action: 'export',
      entityType,
      description: `Exported ${count} ${entityType} records to ${format}`,
      category: 'data_access',
      severity: 'medium',
      metadata: { exportFormat: format, recordCount: count, filters },
    }, this.req);

    await logDataAccess({
      userId: this.userId,
      entityType,
      accessType: 'export',
      accessMethod: 'bulk_export',
      dataScope: 'full',
      resultCount: count,
      filters,
      sensitiveData: true,
      purpose: 'Data export for business purposes',
    }, this.req);
  }

  // Log permission changes
  async logPermissionChange(targetUserId: number, permission: string, granted: boolean) {
    if (!this.userId) return;

    await logAudit({
      userId: this.userId,
      action: granted ? 'grant_permission' : 'revoke_permission',
      entityType: 'user',
      entityId: targetUserId,
      description: `${granted ? 'Granted' : 'Revoked'} permission: ${permission}`,
      category: 'security',
      severity: 'high',
      metadata: { permission, granted },
    }, this.req);
  }
}

// Utility function to compare objects and detect changes
export function detectChanges(oldObj: any, newObj: any): Array<{ field: string, oldValue: any, newValue: any }> {
  const changes: Array<{ field: string, oldValue: any, newValue: any }> = [];
  
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
  
  for (const key of allKeys) {
    // Skip timestamp fields and IDs
    if (key.includes('At') || key === 'id' || key === 'updatedAt') continue;
    
    const oldValue = oldObj?.[key];
    const newValue = newObj?.[key];
    
    // Deep comparison for objects
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: key,
        oldValue,
        newValue
      });
    }
  }
  
  return changes;
}

// Middleware to automatically log data access
export function auditMiddleware(entityType: string, accessType: string = 'view') {
  return (req: Request, res: any, next: any) => {
    const userId = (req as any).user?.id;
    if (userId) {
      const logger = new AuditLogger(req, userId);
      // Store logger in request for later use
      (req as any).auditLogger = logger;
      
      // Log the access when response is sent
      res.on('finish', () => {
        if (res.statusCode < 400) {
          logger.logView(entityType, undefined, undefined, 'partial');
        }
      });
    }
    next();
  };
} 