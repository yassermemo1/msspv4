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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDefaultPagePermissions = initializeDefaultPagePermissions;
const postgres_js_1 = require("drizzle-orm/postgres-js");
const schema_1 = require("../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Ensures that the deprecated "/bulk-import" navigation entry is updated
 * to the new "/comprehensive-bulk-import" path. If the new entry does not
 * exist, it will be created. Should be run during server start-up after the
 * database auto-sync to keep navigation data consistent with the front-end.
 */
async function initializeDefaultPagePermissions(databaseUrl) {
    try {
        const postgres = (await Promise.resolve().then(() => __importStar(require('postgres')))).default;
        // Establish a temporary connection (will be closed before returning)
        const sql = postgres(databaseUrl);
        const db = (0, postgres_js_1.drizzle)(sql);
        // 1) Migrate existing /bulk-import entry if it exists
        const [legacyEntry] = await db
            .select()
            .from(schema_1.pagePermissions)
            .where((0, drizzle_orm_1.eq)(schema_1.pagePermissions.pageUrl, '/bulk-import'));
        if (legacyEntry) {
            await db
                .update(schema_1.pagePermissions)
                .set({
                pageUrl: '/comprehensive-bulk-import',
                pageName: 'comprehensive_bulk_import',
                displayName: 'Comprehensive Bulk Import',
                description: legacyEntry.description || 'Import comprehensive client data with multiple entities',
                icon: 'Upload',
                updatedAt: new Date(),
                isActive: true,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.pagePermissions.id, legacyEntry.id));
            console.log('✨ Migrated legacy /bulk-import page permission to /comprehensive-bulk-import');
        }
        // 2) Ensure the new entry exists (create it if missing)
        const [newEntry] = await db
            .select()
            .from(schema_1.pagePermissions)
            .where((0, drizzle_orm_1.eq)(schema_1.pagePermissions.pageUrl, '/comprehensive-bulk-import'));
        if (!newEntry) {
            // Determine sort order (append to end)
            const [{ max }] = await sql `SELECT COALESCE(MAX(sort_order), 0) AS max FROM page_permissions`;
            const nextSortOrder = max + 1;
            await db.insert(schema_1.pagePermissions).values({
                pageName: 'comprehensive_bulk_import',
                pageUrl: '/comprehensive-bulk-import',
                displayName: 'Comprehensive Bulk Import',
                description: 'Import comprehensive client data with multiple entities',
                category: 'main',
                icon: 'Upload',
                adminAccess: true,
                managerAccess: true,
                engineerAccess: false,
                userAccess: false,
                sortOrder: nextSortOrder,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            console.log('✅ Inserted /comprehensive-bulk-import page permission');
        }
        // 3) Deduplicate any accidental multiples of the same pageUrl
        const duplicates = await db
            .select()
            .from(schema_1.pagePermissions)
            .where((0, drizzle_orm_1.eq)(schema_1.pagePermissions.pageUrl, '/comprehensive-bulk-import'));
        if (duplicates.length > 1) {
            // Keep the row with the lowest id (earliest) and delete the rest
            const sorted = duplicates.sort((a, b) => a.id - b.id);
            const idsToDelete = sorted.slice(1).map((r) => r.id);
            await db
                .delete(schema_1.pagePermissions)
                .where((0, drizzle_orm_1.inArray)(schema_1.pagePermissions.id, idsToDelete));
            console.log(`🧹 Removed ${idsToDelete.length} duplicate /comprehensive-bulk-import page permission entries`);
        }
        await sql.end();
    }
    catch (error) {
        console.error('⚠️  Failed to initialize default page permissions:', error.message);
    }
}
