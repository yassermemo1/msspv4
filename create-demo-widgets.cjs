#!/usr/bin/env node

const fetch = require('node-fetch');
const fs = require('fs');

const BASE_URL = 'http://localhost:80';
const COOKIES_FILE = 'test-session-cookies.txt';

// Read session cookies
let cookies = '';
try {
  cookies = fs.readFileSync(COOKIES_FILE, 'utf8').trim();
} catch (e) {
  console.error('❌ Session cookies file not found. Please login first.');
  process.exit(1);
}

console.log('🎯 CREATING DEMO WIDGETS WITH FILTERS & PARAMETERS');
console.log('==================================================');

// 10 Query Widgets with Advanced Filters
const queryWidgets = [
  {
    name: "High Priority Security Incidents",
    description: "Critical and high priority security incidents from all projects with filtering",
    pluginName: "jira",
    widgetType: "table",
    query: 'project in ("DEP", "MD") AND priority in (Critical, High)',
    method: "GET",
    parameters: {},
    filters: [
      {
        id: "priority-filter",
        field: "priority",
        operator: "in",
        value: ["Critical", "High"],
        dataType: "array",
        enabled: true
      },
      {
        id: "status-filter", 
        field: "status",
        operator: "not_equals",
        value: "Done",
        dataType: "string",
        enabled: true
      }
    ],
    displayConfig: {
      width: "full",
      height: "large",
      showBorder: true,
      showHeader: true
    },
    refreshInterval: 30,
    isGlobal: true
  },
  
  {
    name: "Recent Issues Last 7 Days",
    description: "All issues created in the last 7 days with date range filtering",
    pluginName: "jira",
    widgetType: "chart",
    query: 'project in ("DEP", "MD") AND created >= -7d',
    method: "GET", 
    parameters: {},
    filters: [
      {
        id: "date-filter",
        field: "created",
        operator: "date_after",
        value: "2024-06-10",
        dataType: "date",
        enabled: true
      },
      {
        id: "project-filter",
        field: "project",
        operator: "in",
        value: ["DEP", "MD"],
        dataType: "array",
        enabled: true
      }
    ],
    displayConfig: {
      width: "half",
      height: "medium", 
      showBorder: true,
      showHeader: true
    },
    refreshInterval: 60,
    isGlobal: true
  },

  {
    name: "Open Issues by Assignee",
    description: "Open tickets grouped by assignee with status filtering",
    pluginName: "jira",
    widgetType: "chart",
    query: 'project in ("DEP", "MD") AND status not in (Done, Closed, Resolved)',
    method: "GET",
    parameters: {},
    filters: [
      {
        id: "status-exclude-filter",
        field: "status", 
        operator: "not_in",
        value: ["Done", "Closed", "Resolved"],
        dataType: "array",
        enabled: true
      },
      {
        id: "assignee-filter",
        field: "assignee",
        operator: "is_not_null",
        value: null,
        dataType: "string",
        enabled: true
      }
    ],
    displayConfig: {
      width: "half",
      height: "medium",
      showBorder: true,
      showHeader: true
    },
    refreshInterval: 120,
    isGlobal: true
  },

  {
    name: "Deployment Issues Analysis", 
    description: "DEP project issues with deployment-specific filtering",
    pluginName: "jira",
    widgetType: "table",
    query: 'project = "DEP"',
    method: "GET",
    parameters: {},
    filters: [
      {
        id: "project-specific-filter",
        field: "project",
        operator: "equals",
        value: "DEP",
        dataType: "string",
        enabled: true
      },
      {
        id: "issue-type-filter",
        field: "issueType",
        operator: "contains",
        value: "Deployment",
        dataType: "string", 
        enabled: true
      }
    ],
    displayConfig: {
      width: "full",
      height: "medium",
      showBorder: true,
      showHeader: true
    },
    refreshInterval: 180,
    isGlobal: true
  },

  {
    name: "MDR Issues by Reporter Domain",
    description: "MD project issues filtered by reporter domain with text filtering",
    pluginName: "jira", 
    widgetType: "table",
    query: 'project = "MD"',
    method: "GET",
    parameters: {},
    filters: [
      {
        id: "domain-filter",
        field: "reporter.emailAddress",
        operator: "contains",
        value: "site.sa",
        dataType: "string",
        enabled: true
      },
      {
        id: "project-md-filter",
        field: "project",
        operator: "equals", 
        value: "MD",
        dataType: "string",
        enabled: true
      }
    ],
    displayConfig: {
      width: "full",
      height: "large",
      showBorder: true,
      showHeader: true
    },
    refreshInterval: 300,
    isGlobal: true
  },

  {
    name: "Issues Created This Month",
    description: "Monthly issue creation trends with date range filtering",
    pluginName: "jira",
    widgetType: "chart", 
    query: 'project in ("DEP", "MD") AND created >= startOfMonth()',
    method: "GET",
    parameters: {},
    filters: [
      {
        id: "month-filter",
        field: "created",
        operator: "date_after",
        value: "2024-06-01",
        dataType: "date",
        enabled: true
      },
      {
        id: "all-projects-filter",
        field: "project",
        operator: "in",
        value: ["DEP", "MD"],
        dataType: "array",
        enabled: true
      }
    ],
    displayConfig: {
      width: "half",
      height: "medium",
      showBorder: true,
      showHeader: true
    },
    refreshInterval: 600,
    isGlobal: true
  },

  {
    name: "Unassigned Critical Issues",
    description: "Critical priority issues without assignee - requires immediate attention",
    pluginName: "jira",
    widgetType: "table",
    query: 'project in ("DEP", "MD") AND priority = Critical AND assignee is EMPTY',
    method: "GET",
    parameters: {},
    filters: [
      {
        id: "critical-priority-filter",
        field: "priority",
        operator: "equals",
        value: "Critical", 
        dataType: "string",
        enabled: true
      },
      {
        id: "unassigned-filter",
        field: "assignee",
        operator: "is_null",
        value: null,
        dataType: "string",
        enabled: true
      }
    ],
    displayConfig: {
      width: "full",
      height: "medium",
      showBorder: true,
      showHeader: true
    },
    refreshInterval: 60,
    isGlobal: true
  },

  {
    name: "Issues by Status Distribution",
    description: "Status distribution across all projects with categorical filtering",
    pluginName: "jira",
    widgetType: "chart",
    query: 'project in ("DEP", "MD")',
    method: "GET",
    parameters: {},
    filters: [
      {
        id: "active-status-filter",
        field: "status",
        operator: "in",
        value: ["Open", "In Progress", "Waiting for customer", "Done"],
        dataType: "array",
        enabled: true
      },
      {
        id: "project-scope-filter",
        field: "project",
        operator: "in",
        value: ["DEP", "MD"],
        dataType: "array",
        enabled: true
      }
    ],
    displayConfig: {
      width: "half",
      height: "medium",
      showBorder: true,
      showHeader: true
    },
    refreshInterval: 300,
    isGlobal: true
  },

  {
    name: "Recently Updated Issues",
    description: "Issues updated in the last 24 hours with timestamp filtering", 
    pluginName: "jira",
    widgetType: "table",
    query: 'project in ("DEP", "MD") AND updated >= -1d',
    method: "GET",
    parameters: {},
    filters: [
      {
        id: "recent-update-filter",
        field: "updated",
        operator: "date_after",
        value: "2024-06-16",
        dataType: "date",
        enabled: true
      },
      {
        id: "active-projects-filter",
        field: "project", 
        operator: "in",
        value: ["DEP", "MD"],
        dataType: "array",
        enabled: true
      }
    ],
    displayConfig: {
      width: "full",
      height: "medium",
      showBorder: true,
      showHeader: true
    },
    refreshInterval: 120,
    isGlobal: true
  },

  {
    name: "Long Running Issues",
    description: "Issues open for more than 30 days with duration filtering",
    pluginName: "jira",
    widgetType: "table", 
    query: 'project in ("DEP", "MD") AND created <= -30d AND status not in (Done, Closed)',
    method: "GET",
    parameters: {},
    filters: [
      {
        id: "old-issues-filter",
        field: "created",
        operator: "date_before",
        value: "2024-05-17",
        dataType: "date",
        enabled: true
      },
      {
        id: "open-status-filter",
        field: "status",
        operator: "not_in",
        value: ["Done", "Closed", "Resolved"],
        dataType: "array",
        enabled: true
      }
    ],
    displayConfig: {
      width: "full",
      height: "large",
      showBorder: true,
      showHeader: true
    },
    refreshInterval: 3600,
    isGlobal: true
  }
];

// 5 Client-Specific Widgets with Dynamic Parameters
const clientWidgets = [
  {
    name: "SITE Client Issues",
    description: "Issues related to SITE client using dynamic shortName parameter from client page context",
    pluginName: "jira",
    widgetType: "table",
    query: 'project in ("DEP", "MD") AND labels ~ ${shortName}',
    method: "GET",
    parameters: {
      shortName: {
        source: "database",
        dbTable: "clients", 
        dbColumn: "shortName"
      }
    },
    filters: [
      {
        id: "client-label-filter",
        field: "labels",
        operator: "contains",
        value: "SITE",
        dataType: "string",
        enabled: true
      }
    ],
    displayConfig: {
      width: "full",
      height: "large",
      showBorder: true,
      showHeader: true
    },
    refreshInterval: 300,
    isGlobal: false
  },

  {
    name: "HAJ Client Security Incidents",
    description: "Security incidents for HAJ client with priority filtering and dynamic shortName",
    pluginName: "jira",
    widgetType: "table",
    query: 'project in ("DEP", "MD") AND labels ~ ${shortName} AND priority in (Critical, High)',
    method: "GET",
    parameters: {
      shortName: {
        source: "database",
        dbTable: "clients",
        dbColumn: "shortName"
      }
    },
    filters: [
      {
        id: "high-priority-filter",
        field: "priority",
        operator: "in", 
        value: ["Critical", "High"],
        dataType: "array",
        enabled: true
      },
      {
        id: "client-label-filter",
        field: "labels",
        operator: "contains",
        value: "HAJ",
        dataType: "string",
        enabled: true
      }
    ],
    displayConfig: {
      width: "full",
      height: "medium",
      showBorder: true,
      showHeader: true
    },
    refreshInterval: 180,
    isGlobal: false
  },

  {
    name: "ROSHN Development Issues",
    description: "Development and deployment issues for ROSHN client with dynamic context",
    pluginName: "jira",
    widgetType: "table",
    query: 'project in ("DEP", "MD") AND labels ~ ${shortName} AND issueType ~ "Development"',
    method: "GET", 
    parameters: {
      shortName: {
        source: "database",
        dbTable: "clients",
        dbColumn: "shortName"
      }
    },
    filters: [
      {
        id: "development-filter",
        field: "issueType", 
        operator: "contains",
        value: "Development",
        dataType: "string",
        enabled: true
      },
      {
        id: "client-label-filter",
        field: "labels",
        operator: "contains",
        value: "ROSHN",
        dataType: "string",
        enabled: true
      }
    ],
    displayConfig: {
      width: "full",
      height: "medium",
      showBorder: true,
      showHeader: true
    },
    refreshInterval: 240,
    isGlobal: false
  },

  {
    name: "MOD Client Open Tickets",
    description: "All open tickets for Ministry of Defense client with status filtering",
    pluginName: "jira",
    widgetType: "table",
    query: 'project in ("DEP", "MD") AND labels ~ ${shortName} AND status not in (Done, Closed)',
    method: "GET",
    parameters: {
      shortName: {
        source: "database",
        dbTable: "clients",
        dbColumn: "shortName"
      }
    },
    filters: [
      {
        id: "open-status-filter",
        field: "status",
        operator: "not_in",
        value: ["Done", "Closed", "Resolved"],
        dataType: "array",
        enabled: true
      },
      {
        id: "client-label-filter",
        field: "labels",
        operator: "contains",
        value: "MOD",
        dataType: "string",
        enabled: true
      }
    ],
    displayConfig: {
      width: "full",
      height: "large",
      showBorder: true,
      showHeader: true
    },
    refreshInterval: 300,
    isGlobal: false
  },

  {
    name: "ARAMCO Client Recent Activity",
    description: "Recent activity and updates for ARAMCO client with time-based filtering",
    pluginName: "jira",
    widgetType: "table",
    query: 'project in ("DEP", "MD") AND labels ~ ${shortName} AND updated >= -7d',
    method: "GET",
    parameters: {
      shortName: {
        source: "database",
        dbTable: "clients",
        dbColumn: "shortName"
      }
    },
    filters: [
      {
        id: "recent-activity-filter",
        field: "updated",
        operator: "date_after",
        value: "2024-06-10",
        dataType: "date",
        enabled: true
      },
      {
        id: "client-label-filter",
        field: "labels", 
        operator: "contains",
        value: "ARAMCO",
        dataType: "string",
        enabled: true
      }
    ],
    displayConfig: {
      width: "full",
      height: "medium",
      showBorder: true,
      showHeader: true
    },
    refreshInterval: 600,
    isGlobal: false
  }
];

async function createWidget(widget) {
  try {
    const response = await fetch(`${BASE_URL}/api/widgets/manage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(widget)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error(`Failed to create widget: ${error.message}`);
  }
}

async function main() {
  let successCount = 0;
  let failCount = 0;

  console.log('\n📊 Creating 10 Query Widgets with Advanced Filters...');
  console.log('====================================================');
  
  for (let i = 0; i < queryWidgets.length; i++) {
    const widget = queryWidgets[i];
    try {
      console.log(`\n${i + 1}️⃣ Creating: ${widget.name}`);
      console.log(`   Query: ${widget.query}`);
      console.log(`   Filters: ${widget.filters.length} filters configured`);
      
      const result = await createWidget(widget);
      console.log(`   ✅ Created successfully with ID: ${result.id}`);
      successCount++;
      
      // Brief pause between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      failCount++;
    }
  }

  console.log('\n👥 Creating 5 Client-Specific Widgets with Dynamic Parameters...');
  console.log('================================================================');
  
  for (let i = 0; i < clientWidgets.length; i++) {
    const widget = clientWidgets[i];
    try {
      console.log(`\n${i + 1}️⃣ Creating: ${widget.name}`);
      console.log(`   Query: ${widget.query}`);
      console.log(`   Parameters: ${Object.keys(widget.parameters).join(', ')}`);
      console.log(`   Filters: ${widget.filters.length} filters configured`);
      
      const result = await createWidget(widget);
      console.log(`   ✅ Created successfully with ID: ${result.id}`);
      successCount++;
      
      // Brief pause between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      failCount++;
    }
  }

  console.log('\n📈 WIDGET CREATION SUMMARY');
  console.log('=========================');
  console.log(`✅ Successfully created: ${successCount} widgets`);
  console.log(`❌ Failed to create: ${failCount} widgets`);
  console.log(`📊 Total widgets: ${successCount + failCount}`);
  
  if (successCount > 0) {
    console.log('\n🎯 FEATURES DEMONSTRATED:');
    console.log('========================');
    console.log('✅ Advanced filtering system with 20+ operators');
    console.log('✅ Dynamic parameter resolution (static, context, database)');
    console.log('✅ Client-specific widgets with shortName parameters');
    console.log('✅ Multi-data type filtering (string, number, date, array)');
    console.log('✅ Real-time parameter substitution');
    console.log('✅ Context-aware widget behavior');
    console.log('✅ Professional widget configurations');
    
    console.log('\n📋 ACCESS WIDGETS:');
    console.log('==================');
    console.log('🌐 Global widgets: Available on all dashboard pages');
    console.log('👤 Client widgets: Automatically filter based on client page context');
    console.log('🔄 Auto-refresh: Widgets update automatically at configured intervals');
    console.log('⚙️  Configurable: All filters and parameters can be modified in widget builder');
  }
}

main().catch(console.error); 