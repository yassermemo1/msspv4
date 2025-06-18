"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
exports.generateBatchId = generateBatchId;
exports.logAudit = logAudit;
exports.logSecurityEvent = logSecurityEvent;
exports.logDataAccess = logDataAccess;
exports.logChange = logChange;
exports.logSystemEvent = logSystemEvent;
exports.detectChanges = detectChanges;
exports.auditMiddleware = auditMiddleware;
const db_1 = require("../db");
const schema_1 = require("@shared/schema");
// Helper to extract client info from request
function getClientInfo(req) {
    return {
        ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        sessionId: req.sessionID || null,
    };
}
// Helper to generate batch ID for grouped operations
function generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
// Main audit logging function
async function logAudit(data, req) {
    const clientInfo = req ? getClientInfo(req) : {};
    try {
        await db_1.db.insert(schema_1.auditLogs).values({
            severity: 'info',
            ...data,
            ...clientInfo,
        });
    }
    catch (error) {
        console.error('Failed to log audit entry:', error);
        // Don't throw - audit failures shouldn't break the main operation
    }
}
// Security event logging
async function logSecurityEvent(data, req) {
    const clientInfo = req ? getClientInfo(req) : {};
    try {
        await db_1.db.insert(schema_1.securityEvents).values({
            riskScore: 0,
            blocked: false,
            ...data,
            ...clientInfo,
        });
    }
    catch (error) {
        console.error('Failed to log security event:', error);
    }
}
// Data access logging
async function logDataAccess(data, req) {
    const clientInfo = req ? getClientInfo(req) : {};
    try {
        await db_1.db.insert(schema_1.dataAccessLogs).values({
            sensitiveData: false,
            resultCount: 1,
            ...data,
            ...clientInfo,
        });
    }
    catch (error) {
        console.error('Failed to log data access:', error);
    }
}
// Change history logging with rollback capability
async function logChange(data, req) {
    const clientInfo = req ? getClientInfo(req) : {};
    try {
        await db_1.db.insert(schema_1.changeHistory).values({
            automaticChange: false,
            ...data,
            ...clientInfo,
        });
    }
    catch (error) {
        console.error('Failed to log change history:', error);
    }
}
// System event logging
async function logSystemEvent(data) {
    try {
        await db_1.db.insert(schema_1.systemEvents).values(data);
    }
    catch (error) {
        console.error('Failed to log system event:', error);
    }
}
// Enhanced logging for specific operations
class AuditLogger {
    constructor(req, userId) {
        this.req = req;
        this.userId = userId;
    }
    setBatchId(batchId) {
        this.batchId = batchId;
        return this;
    }
    // Log user login
    async logLogin(success, failureReason) {
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
    async logCreate(entityType, entityId, entityName, data) {
        if (!this.userId)
            return;
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
    async logUpdate(entityType, entityId, entityName, changes, fullOldData) {
        if (!this.userId)
            return;
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
    async logDelete(entityType, entityId, entityName, deletedData) {
        if (!this.userId)
            return;
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
    async logView(entityType, entityId, entityName, scope = 'full', resultCount = 1) {
        if (!this.userId)
            return;
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
    async logBulkOperation(operation, entityType, count, description) {
        if (!this.userId)
            return;
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
    async logExport(entityType, format, count, filters) {
        if (!this.userId)
            return;
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
    async logPermissionChange(targetUserId, permission, granted) {
        if (!this.userId)
            return;
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
exports.AuditLogger = AuditLogger;
// Utility function to compare objects and detect changes
function detectChanges(oldObj, newObj) {
    const changes = [];
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
    for (const key of allKeys) {
        // Skip timestamp fields and IDs
        if (key.includes('At') || key === 'id' || key === 'updatedAt')
            continue;
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
function auditMiddleware(entityType, accessType = 'view') {
    return (req, res, next) => {
        const userId = req.user?.id;
        if (userId) {
            const logger = new AuditLogger(req, userId);
            // Store logger in request for later use
            req.auditLogger = logger;
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
