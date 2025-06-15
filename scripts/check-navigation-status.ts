#!/usr/bin/env tsx

/**
 * Navigation Status Checker
 * 
 * This script checks the current state of your navigation system
 * and helps identify any issues or inconsistencies.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pagePermissions } from '../shared/schema';
import { mainNavigation } from '../client/src/config/navigation';
import { eq, sql } from 'drizzle-orm';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://mssp_user:mssp_password@localhost:5432/mssp_database';

async function checkNavigationStatus() {
  console.log('🔍 Checking Navigation System Status...\n');
  
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    // Check database navigation
    console.log('📊 DATABASE NAVIGATION (Active System)');
    console.log('=====================================');
    
    const dbNavItems = await db
      .select()
      .from(pagePermissions)
      .orderBy(pagePermissions.category, pagePermissions.sortOrder);

    if (dbNavItems.length === 0) {
      console.log('❌ No navigation items found in database!');
      console.log('💡 Run: npm run sync-navigation');
    } else {
      console.log(`✅ Found ${dbNavItems.length} navigation items in database`);
      
      // Group by category
      const byCategory = dbNavItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {} as Record<string, any[]>);

      Object.entries(byCategory).forEach(([category, items]) => {
        console.log(`\n📁 ${category.toUpperCase()} (${items.length} items)`);
        items.forEach(item => {
          const status = item.isActive ? '✅' : '❌';
          const access = [
            item.adminAccess && 'admin',
            item.managerAccess && 'manager', 
            item.engineerAccess && 'engineer',
            item.userAccess && 'user'
          ].filter(Boolean).join(', ') || 'none';
          
          console.log(`  ${status} ${item.displayName} (${item.pageUrl}) - Access: ${access}`);
        });
      });
    }

    // Check static navigation
    console.log('\n\n📄 STATIC NAVIGATION CONFIG (Legacy)');
    console.log('====================================');
    console.log(`✅ Found ${mainNavigation.length} items in static config`);
    
    // Compare static vs database
    console.log('\n\n🔄 SYNC STATUS');
    console.log('==============');
    
    const dbUrls = new Set(dbNavItems.map(item => item.pageUrl));
    const staticUrls = new Set(mainNavigation.map(item => item.href));
    
    const onlyInStatic = mainNavigation.filter(item => !dbUrls.has(item.href));
    const onlyInDb = dbNavItems.filter(item => !staticUrls.has(item.pageUrl));
    
    if (onlyInStatic.length > 0) {
      console.log('\n⚠️  Items in static config but NOT in database:');
      onlyInStatic.forEach(item => {
        console.log(`  - ${item.name} (${item.href})`);
      });
      console.log('💡 Run: npm run sync-navigation');
    }
    
    if (onlyInDb.length > 0) {
      console.log('\n⚠️  Items in database but NOT in static config:');
      onlyInDb.forEach(item => {
        console.log(`  - ${item.displayName} (${item.pageUrl})`);
      });
    }
    
    if (onlyInStatic.length === 0 && onlyInDb.length === 0) {
      console.log('✅ Static config and database are in sync!');
    }

    // Check for common issues
    console.log('\n\n🔧 ISSUE DETECTION');
    console.log('==================');
    
    const inactiveItems = dbNavItems.filter(item => !item.isActive);
    if (inactiveItems.length > 0) {
      console.log(`⚠️  ${inactiveItems.length} navigation items are inactive (hidden)`);
      inactiveItems.forEach(item => {
        console.log(`  - ${item.displayName} (${item.pageUrl})`);
      });
    }
    
    const noAccessItems = dbNavItems.filter(item => 
      !item.adminAccess && !item.managerAccess && !item.engineerAccess && !item.userAccess
    );
    if (noAccessItems.length > 0) {
      console.log(`❌ ${noAccessItems.length} items have NO role access (unreachable)`);
      noAccessItems.forEach(item => {
        console.log(`  - ${item.displayName} (${item.pageUrl})`);
      });
    }

    const duplicateUrls = dbNavItems.reduce((acc, item) => {
      acc[item.pageUrl] = (acc[item.pageUrl] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const duplicates = Object.entries(duplicateUrls).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log(`❌ Duplicate URLs found:`);
      duplicates.forEach(([url, count]) => {
        console.log(`  - ${url} (${count} times)`);
      });
    }

    // Summary and recommendations
    console.log('\n\n📋 SUMMARY & RECOMMENDATIONS');
    console.log('============================');
    
    if (dbNavItems.length === 0) {
      console.log('🚨 CRITICAL: No database navigation found!');
      console.log('   Action: Run `npm run sync-navigation` immediately');
    } else if (onlyInStatic.length > 0) {
      console.log('⚠️  Static config has newer items than database');
      console.log('   Action: Run `npm run sync-navigation` to sync');
    } else {
      console.log('✅ Navigation system is working correctly');
    }
    
    console.log('\n🛠️  To manage navigation:');
    console.log('   1. Use Navigation Manager UI (recommended)');
    console.log('   2. Edit static config + run sync script');
    console.log('   3. Direct database/API manipulation');
    
    console.log('\n📚 For more help, see: docs/NAVIGATION-SYSTEM.md');
    
  } catch (error) {
    console.error('❌ Failed to check navigation status:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the check
checkNavigationStatus().catch(console.error); 