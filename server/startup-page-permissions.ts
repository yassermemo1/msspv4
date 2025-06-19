import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@shared/schema';

const { pagePermissions } = schema;
import { eq, inArray } from 'drizzle-orm';

/**
 * Ensures that the deprecated "/bulk-import" navigation entry is updated
 * to the new "/comprehensive-bulk-import" path. If the new entry does not
 * exist, it will be created. Should be run during server start-up after the
 * database auto-sync to keep navigation data consistent with the front-end.
 */
export async function initializeDefaultPagePermissions(databaseUrl: string) {
  try {
    const postgres = (await import('postgres')).default;

    // Establish a temporary connection (will be closed before returning)
    const sql = postgres(databaseUrl);
    const db = drizzle(sql);

    // 1) Migrate existing /bulk-import entry if it exists
    const [legacyEntry] = await db
      .select()
      .from(pagePermissions)
      .where(eq(pagePermissions.pageUrl, '/bulk-import'));

    if (legacyEntry) {
      await db
        .update(pagePermissions)
        .set({
          pageUrl: '/comprehensive-bulk-import',
          pageName: 'comprehensive_bulk_import',
          displayName: 'Comprehensive Bulk Import',
          description: legacyEntry.description || 'Import comprehensive client data with multiple entities',
          icon: 'Upload',
          updatedAt: new Date(),
          isActive: true,
        })
        .where(eq(pagePermissions.id, legacyEntry.id));

      console.log('✨ Migrated legacy /bulk-import page permission to /comprehensive-bulk-import');
    }

    // 2) Ensure the new entry exists (create it if missing)
    const [newEntry] = await db
      .select()
      .from(pagePermissions)
      .where(eq(pagePermissions.pageUrl, '/comprehensive-bulk-import'));

    if (!newEntry) {
      // Determine sort order (append to end)
      const [{ max }] = await sql`SELECT COALESCE(MAX(sort_order), 0) AS max FROM page_permissions`;
      const nextSortOrder = (max as unknown as number) + 1;

      await db.insert(pagePermissions).values({
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
      .from(pagePermissions)
      .where(eq(pagePermissions.pageUrl, '/comprehensive-bulk-import'));

    if (duplicates.length > 1) {
      // Keep the row with the lowest id (earliest) and delete the rest
      const sorted = duplicates.sort((a: any, b: any) => a.id - b.id);
      const idsToDelete = sorted.slice(1).map((r: any) => r.id);

      await db
        .delete(pagePermissions)
        .where(inArray(pagePermissions.id, idsToDelete));

      console.log(`🧹 Removed ${idsToDelete.length} duplicate /comprehensive-bulk-import page permission entries`);
    }

    await sql.end();
  } catch (error) {
    console.error('⚠️  Failed to initialize default page permissions:', (error as Error).message);
  }
} 