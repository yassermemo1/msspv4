#!/usr/bin/env tsx

/**
 * Navigation Sync Script
 * 
 * This script syncs the static navigation configuration to the database
 * page_permissions table, ensuring both systems stay in sync.
 * 
 * Usage: npm run sync-navigation
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pagePermissions } from '../shared/schema';
import { mainNavigation } from '../client/src/config/navigation';
import { eq, sql } from 'drizzle-orm';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://mssp_user:mssp_password@localhost:5432/mssp_database';

async function syncNavigationToDatabase() {
  console.log('🔄 Syncing static navigation config to database...');
  
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    // Get current max sort order
    const result = await db.execute(sql`SELECT COALESCE(MAX(sort_order), 0) AS max FROM page_permissions`);
    let currentSortOrder = (result.rows[0]?.max as number) || 0;

    for (const navItem of mainNavigation) {
      currentSortOrder += 10;

      // Check if page already exists
      const existing = await db
        .select()
        .from(pagePermissions)
        .where(eq(pagePermissions.pageUrl, navItem.href))
        .limit(1);

      const category = getCategoryFromNavItem(navItem);
      const iconName = getIconName(navItem.icon);

      if (existing.length === 0) {
        // Insert new page
        await db.insert(pagePermissions).values({
          pageName: navItem.name.toLowerCase().replace(/\s+/g, '_'),
          pageUrl: navItem.href,
          displayName: navItem.name,
          description: navItem.description || `${navItem.name} page`,
          category: category,
          icon: iconName,
          adminAccess: true,
          managerAccess: shouldHaveManagerAccess(navItem),
          engineerAccess: shouldHaveEngineerAccess(navItem),
          userAccess: shouldHaveUserAccess(navItem),
          isActive: true,
          sortOrder: currentSortOrder,
        });
        console.log(`✅ Added: ${navItem.name} (${navItem.href})`);
      } else {
        // Update existing page
        await db
          .update(pagePermissions)
          .set({
            displayName: navItem.name,
            description: navItem.description || `${navItem.name} page`,
            category: category,
            icon: iconName,
            // Don't override existing access permissions
          })
          .where(eq(pagePermissions.id, existing[0].id));
        console.log(`🔄 Updated: ${navItem.name} (${navItem.href})`);
      }
    }

    console.log('✅ Navigation sync completed successfully!');
    console.log('💡 You can now manage navigation through the Navigation Manager UI');
    
  } catch (error) {
    console.error('❌ Failed to sync navigation:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

function getCategoryFromNavItem(navItem: any): string {
  const name = navItem.name.toLowerCase();
  
  if (['dashboard', 'clients', 'contracts', 'services'].includes(name)) return 'main';
  if (['user management', 'role management', 'settings', 'audit logs'].includes(name)) return 'admin';
      if (['plugins', 'external systems'].includes(name)) return 'integration';
  if (['reports', 'analytics'].includes(name)) return 'reports';
  if (['dynamic dashboards', 'global widgets', 'widget manager'].includes(name)) return 'advanced';
  
  return 'main';
}

function getIconName(iconComponent: any): string {
  // Extract icon name from the component
  if (!iconComponent) return 'LayoutDashboard';
  
  const iconName = iconComponent.name || iconComponent.displayName || 'LayoutDashboard';
  return iconName;
}

function shouldHaveManagerAccess(navItem: any): boolean {
  const restrictedPages = ['user management', 'role management', 'audit logs', 'settings'];
  return !restrictedPages.includes(navItem.name.toLowerCase());
}

function shouldHaveEngineerAccess(navItem: any): boolean {
  const restrictedPages = ['user management', 'role management', 'financial'];
  return !restrictedPages.includes(navItem.name.toLowerCase());
}

function shouldHaveUserAccess(navItem: any): boolean {
  const allowedPages = ['dashboard', 'clients', 'reports'];
  return allowedPages.includes(navItem.name.toLowerCase());
}

// Run the sync
syncNavigationToDatabase().catch(console.error); 