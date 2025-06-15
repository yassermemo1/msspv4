import { db } from "../db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

type RollbackData = {
  action: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: number;
  oldData?: any;
  field?: string;
  oldValue?: any;
};

const tableMapping: { [key: string]: any } = {
  client: schema.clients,
  contract: schema.contracts,
  service: schema.services,
  // Add other entity types and their corresponding table schemas here
};

export async function performRollback(rollbackData: RollbackData): Promise<void> {
  const { action, entityType, entityId, oldData, field, oldValue } = rollbackData;

  const table = tableMapping[entityType];
  if (!table) {
    throw new Error(`Invalid entity type for rollback: ${entityType}`);
  }

  switch (action) {
    case 'delete':
      // This is the rollback for a 'create' action.
      await db.delete(table).where(eq(table.id, entityId));
      break;
    case 'create':
      // This is the rollback for a 'delete' action.
      if (!oldData) {
        throw new Error("Cannot perform 'create' rollback without oldData.");
      }
      await db.insert(table).values(oldData);
      break;
    case 'update':
      // This is the rollback for an 'update' action.
      if (!field) {
        throw new Error("Cannot perform 'update' rollback without a field.");
      }
      const updateObject: { [key: string]: any } = {};
      updateObject[field] = oldValue;
      await db.update(table).set(updateObject).where(eq(table.id, entityId));
      break;
    default:
      throw new Error(`Unsupported rollback action: ${action}`);
  }
} 