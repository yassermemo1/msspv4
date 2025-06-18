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
exports.performRollback = performRollback;
const db_1 = require("../db");
const schema = __importStar(require("@shared/schema"));
const drizzle_orm_1 = require("drizzle-orm");
const tableMapping = {
    client: schema.clients,
    contract: schema.contracts,
    service: schema.services,
    // Add other entity types and their corresponding table schemas here
};
async function performRollback(rollbackData) {
    const { action, entityType, entityId, oldData, field, oldValue } = rollbackData;
    const table = tableMapping[entityType];
    if (!table) {
        throw new Error(`Invalid entity type for rollback: ${entityType}`);
    }
    switch (action) {
        case 'delete':
            // This is the rollback for a 'create' action.
            await db_1.db.delete(table).where((0, drizzle_orm_1.eq)(table.id, entityId));
            break;
        case 'create':
            // This is the rollback for a 'delete' action.
            if (!oldData) {
                throw new Error("Cannot perform 'create' rollback without oldData.");
            }
            await db_1.db.insert(table).values(oldData);
            break;
        case 'update':
            // This is the rollback for an 'update' action.
            if (!field) {
                throw new Error("Cannot perform 'update' rollback without a field.");
            }
            const updateObject = {};
            updateObject[field] = oldValue;
            await db_1.db.update(table).set(updateObject).where((0, drizzle_orm_1.eq)(table.id, entityId));
            break;
        default:
            throw new Error(`Unsupported rollback action: ${action}`);
    }
}
