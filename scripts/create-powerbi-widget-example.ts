// Example script to create PowerBI dashboard widgets
// Run with: npx tsx scripts/create-powerbi-widget-example.ts

import { db } from '../server/db';
import { customWidgets } from '../shared/schema';

async function createPowerBIWidget() {
  console.log('Creating example PowerBI widgets...');
  
  try {
    // Example 1: Simple metric widget
    const widget1 = await db.insert(customWidgets).values({
      userId: 1, // Admin user
      name: 'Customer Satisfaction Score',
      description: 'Average customer satisfaction rating from surveys',
      pluginName: 'sql',
      instanceId: 'sql-main',
      queryType: 'custom',
      customQuery: `
        SELECT 
          ROUND(AVG(rating), 1) as value,
          'Customer Satisfaction' as label,
          ROUND(AVG(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN rating END), 1) as previous_value
        FROM customer_surveys
        WHERE created_at > NOW() - INTERVAL '90 days'
      `,
      queryMethod: 'POST',
      queryParameters: {},
      displayType: 'metric',
      chartType: null,
      refreshInterval: 300,
      placement: 'powerbi-dashboard',
      styling: {
        width: 'full',
        height: 'medium',
        showBorder: true,
        showHeader: true
      },
      isActive: true
    }).returning();
    
    console.log('✅ Created widget:', widget1[0].name);
    
    // Example 2: Jira issues widget
    const widget2 = await db.insert(customWidgets).values({
      userId: 1,
      name: 'Open Support Tickets',
      description: 'Number of open Jira support tickets',
      pluginName: 'jira',
      instanceId: 'jira-main',
      queryType: 'custom',
      customQuery: 'project = SUPPORT AND status NOT IN (Closed, Resolved)',
      queryMethod: 'GET',
      queryParameters: {},
      displayType: 'metric',
      chartType: null,
      refreshInterval: 120,
      placement: 'powerbi-dashboard',
      styling: {
        width: 'full',
        height: 'medium',
        showBorder: true,
        showHeader: true,
        drilldownUrl: '/jira-tickets'
      },
      isActive: true
    }).returning();
    
    console.log('✅ Created widget:', widget2[0].name);
    
    // Example 3: API integration widget
    const widget3 = await db.insert(customWidgets).values({
      userId: 1,
      name: 'System Uptime',
      description: 'Current system uptime percentage',
      pluginName: 'generic-api',
      instanceId: 'generic-api-main',
      queryType: 'custom',
      customQuery: '/api/v1/system/uptime',
      queryMethod: 'GET',
      queryParameters: {
        format: 'json'
      },
      displayType: 'metric',
      chartType: null,
      refreshInterval: 60,
      placement: 'powerbi-dashboard',
      styling: {
        width: 'full',
        height: 'medium',
        showBorder: true,
        showHeader: true
      },
      isActive: true
    }).returning();
    
    console.log('✅ Created widget:', widget3[0].name);
    
    console.log('\n✨ Successfully created 3 example PowerBI widgets!');
    console.log('Visit http://10.252.1.89/powerbi-dashboard to see them in action.');
    
  } catch (error) {
    console.error('❌ Error creating widgets:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
createPowerBIWidget(); 