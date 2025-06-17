#!/bin/bash

echo "🎯 CREATING DEMO WIDGETS WITH FILTERS & PARAMETERS"
echo "=================================================="

# Login and get session
echo "🔐 Logging in..."
curl -s -c session.txt -X POST http://localhost:80/api/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@mssp.local", "password": "admin123"}' > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ Login successful"
else
    echo "❌ Login failed"
    exit 1
fi

# Counter for widgets
success_count=0
fail_count=0

echo ""
echo "📊 Creating 10 Query Widgets with Advanced Filters..."
echo "===================================================="

# Widget 1: High Priority Security Incidents
echo ""
echo "1️⃣ Creating: High Priority Security Incidents"
response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High Priority Security Incidents",
    "description": "Critical and high priority security incidents from all projects with filtering",
    "pluginName": "jira",
    "widgetType": "table",
    "query": "project in (\"DEP\", \"MD\") AND priority in (Critical, High)",
    "method": "GET",
    "parameters": {},
    "filters": [
      {
        "id": "priority-filter",
        "field": "priority",
        "operator": "in",
        "value": ["Critical", "High"],
        "dataType": "array",
        "enabled": true
      },
      {
        "id": "status-filter",
        "field": "status",
        "operator": "not_equals",
        "value": "Done",
        "dataType": "string",
        "enabled": true
      }
    ],
    "displayConfig": {
      "width": "full",
      "height": "large",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 30,
    "isGlobal": true
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

# Widget 2: Recent Issues Last 7 Days
echo ""
echo "2️⃣ Creating: Recent Issues Last 7 Days"
response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Recent Issues Last 7 Days",
    "description": "All issues created in the last 7 days with date range filtering",
    "pluginName": "jira",
    "widgetType": "chart",
    "query": "project in (\"DEP\", \"MD\") AND created >= -7d",
    "method": "GET",
    "parameters": {},
    "filters": [
      {
        "id": "date-filter",
        "field": "created",
        "operator": "date_after",
        "value": "2024-06-10",
        "dataType": "date",
        "enabled": true
      },
      {
        "id": "project-filter",
        "field": "project",
        "operator": "in",
        "value": ["DEP", "MD"],
        "dataType": "array",
        "enabled": true
      }
    ],
    "displayConfig": {
      "width": "half",
      "height": "medium",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 60,
    "isGlobal": true
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

# Widget 3: Open Issues by Assignee
echo ""
echo "3️⃣ Creating: Open Issues by Assignee"
response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Open Issues by Assignee",
    "description": "Open tickets grouped by assignee with status filtering",
    "pluginName": "jira",
    "widgetType": "chart",
    "query": "project in (\"DEP\", \"MD\") AND status not in (Done, Closed, Resolved)",
    "method": "GET",
    "parameters": {},
    "filters": [
      {
        "id": "status-exclude-filter",
        "field": "status",
        "operator": "not_in",
        "value": ["Done", "Closed", "Resolved"],
        "dataType": "array",
        "enabled": true
      },
      {
        "id": "assignee-filter",
        "field": "assignee",
        "operator": "is_not_null",
        "value": null,
        "dataType": "string",
        "enabled": true
      }
    ],
    "displayConfig": {
      "width": "half",
      "height": "medium",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 120,
    "isGlobal": true
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

# Widget 4: Deployment Issues Analysis
echo ""
echo "4️⃣ Creating: Deployment Issues Analysis"
response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Deployment Issues Analysis",
    "description": "DEP project issues with deployment-specific filtering",
    "pluginName": "jira",
    "widgetType": "table",
    "query": "project = \"DEP\"",
    "method": "GET",
    "parameters": {},
    "filters": [
      {
        "id": "project-specific-filter",
        "field": "project",
        "operator": "equals",
        "value": "DEP",
        "dataType": "string",
        "enabled": true
      },
      {
        "id": "issue-type-filter",
        "field": "issueType",
        "operator": "contains",
        "value": "Deployment",
        "dataType": "string",
        "enabled": true
      }
    ],
    "displayConfig": {
      "width": "full",
      "height": "medium",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 180,
    "isGlobal": true
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

# Widget 5: MDR Issues by Reporter Domain
echo ""
echo "5️⃣ Creating: MDR Issues by Reporter Domain"
response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MDR Issues by Reporter Domain",
    "description": "MD project issues filtered by reporter domain with text filtering",
    "pluginName": "jira",
    "widgetType": "table",
    "query": "project = \"MD\"",
    "method": "GET",
    "parameters": {},
    "filters": [
      {
        "id": "domain-filter",
        "field": "reporter.emailAddress",
        "operator": "contains",
        "value": "site.sa",
        "dataType": "string",
        "enabled": true
      },
      {
        "id": "project-md-filter",
        "field": "project",
        "operator": "equals",
        "value": "MD",
        "dataType": "string",
        "enabled": true
      }
    ],
    "displayConfig": {
      "width": "full",
      "height": "large",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 300,
    "isGlobal": true
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

# Widget 6: Issues Created This Month
echo ""
echo "6️⃣ Creating: Issues Created This Month"
response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Issues Created This Month",
    "description": "Monthly issue creation trends with date range filtering",
    "pluginName": "jira",
    "widgetType": "chart",
    "query": "project in (\"DEP\", \"MD\") AND created >= startOfMonth()",
    "method": "GET",
    "parameters": {},
    "filters": [
      {
        "id": "month-filter",
        "field": "created",
        "operator": "date_after",
        "value": "2024-06-01",
        "dataType": "date",
        "enabled": true
      },
      {
        "id": "all-projects-filter",
        "field": "project",
        "operator": "in",
        "value": ["DEP", "MD"],
        "dataType": "array",
        "enabled": true
      }
    ],
    "displayConfig": {
      "width": "half",
      "height": "medium",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 600,
    "isGlobal": true
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

# Widget 7: Unassigned Critical Issues
echo ""
echo "7️⃣ Creating: Unassigned Critical Issues"
response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unassigned Critical Issues",
    "description": "Critical priority issues without assignee - requires immediate attention",
    "pluginName": "jira",
    "widgetType": "table",
    "query": "project in (\"DEP\", \"MD\") AND priority = Critical AND assignee is EMPTY",
    "method": "GET",
    "parameters": {},
    "filters": [
      {
        "id": "critical-priority-filter",
        "field": "priority",
        "operator": "equals",
        "value": "Critical",
        "dataType": "string",
        "enabled": true
      },
      {
        "id": "unassigned-filter",
        "field": "assignee",
        "operator": "is_null",
        "value": null,
        "dataType": "string",
        "enabled": true
      }
    ],
    "displayConfig": {
      "width": "full",
      "height": "medium",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 60,
    "isGlobal": true
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

# Widget 8: Issues by Status Distribution
echo ""
echo "8️⃣ Creating: Issues by Status Distribution"
response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Issues by Status Distribution",
    "description": "Status distribution across all projects with categorical filtering",
    "pluginName": "jira",
    "widgetType": "chart",
    "query": "project in (\"DEP\", \"MD\")",
    "method": "GET",
    "parameters": {},
    "filters": [
      {
        "id": "active-status-filter",
        "field": "status",
        "operator": "in",
        "value": ["Open", "In Progress", "Waiting for customer", "Done"],
        "dataType": "array",
        "enabled": true
      },
      {
        "id": "project-scope-filter",
        "field": "project",
        "operator": "in",
        "value": ["DEP", "MD"],
        "dataType": "array",
        "enabled": true
      }
    ],
    "displayConfig": {
      "width": "half",
      "height": "medium",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 300,
    "isGlobal": true
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

# Widget 9: Recently Updated Issues
echo ""
echo "9️⃣ Creating: Recently Updated Issues"
response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Recently Updated Issues",
    "description": "Issues updated in the last 24 hours with timestamp filtering",
    "pluginName": "jira",
    "widgetType": "table",
    "query": "project in (\"DEP\", \"MD\") AND updated >= -1d",
    "method": "GET",
    "parameters": {},
    "filters": [
      {
        "id": "recent-update-filter",
        "field": "updated",
        "operator": "date_after",
        "value": "2024-06-16",
        "dataType": "date",
        "enabled": true
      },
      {
        "id": "active-projects-filter",
        "field": "project",
        "operator": "in",
        "value": ["DEP", "MD"],
        "dataType": "array",
        "enabled": true
      }
    ],
    "displayConfig": {
      "width": "full",
      "height": "medium",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 120,
    "isGlobal": true
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

# Widget 10: Long Running Issues
echo ""
echo "🔟 Creating: Long Running Issues"
response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Long Running Issues",
    "description": "Issues open for more than 30 days with duration filtering",
    "pluginName": "jira",
    "widgetType": "table",
    "query": "project in (\"DEP\", \"MD\") AND created <= -30d AND status not in (Done, Closed)",
    "method": "GET",
    "parameters": {},
    "filters": [
      {
        "id": "old-issues-filter",
        "field": "created",
        "operator": "date_before",
        "value": "2024-05-17",
        "dataType": "date",
        "enabled": true
      },
      {
        "id": "open-status-filter",
        "field": "status",
        "operator": "not_in",
        "value": ["Done", "Closed", "Resolved"],
        "dataType": "array",
        "enabled": true
      }
    ],
    "displayConfig": {
      "width": "full",
      "height": "large",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 3600,
    "isGlobal": true
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

echo ""
echo "👥 Creating 5 Client-Specific Widgets with Dynamic Parameters..."
echo "================================================================"

# Client Widget 1: SITE Client Issues
echo ""
echo "1️⃣ Creating: SITE Client Issues"
response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SITE Client Issues",
    "description": "Issues related to SITE client using dynamic shortName parameter from client page context",
    "pluginName": "jira",
    "widgetType": "table",
    "query": "project in (\"DEP\", \"MD\") AND labels ~ \${shortName}",
    "method": "GET",
    "parameters": {
      "shortName": {
        "source": "database",
        "dbTable": "clients",
        "dbColumn": "shortName"
      }
    },
    "filters": [
      {
        "id": "client-label-filter",
        "field": "labels",
        "operator": "contains",
        "value": "SITE",
        "dataType": "string",
        "enabled": true
      }
    ],
    "displayConfig": {
      "width": "full",
      "height": "large",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 300,
    "isGlobal": false
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

# Client Widget 2: HAJ Client Security Incidents
echo ""
echo "2️⃣ Creating: HAJ Client Security Incidents"
response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "HAJ Client Security Incidents",
    "description": "Security incidents for HAJ client with priority filtering and dynamic shortName",
    "pluginName": "jira",
    "widgetType": "table",
    "query": "project in (\"DEP\", \"MD\") AND labels ~ \${shortName} AND priority in (Critical, High)",
    "method": "GET",
    "parameters": {
      "shortName": {
        "source": "database",
        "dbTable": "clients",
        "dbColumn": "shortName"
      }
    },
    "filters": [
      {
        "id": "high-priority-filter",
        "field": "priority",
        "operator": "in",
        "value": ["Critical", "High"],
        "dataType": "array",
        "enabled": true
      },
      {
        "id": "client-label-filter",
        "field": "labels",
        "operator": "contains",
        "value": "HAJ",
        "dataType": "string",
        "enabled": true
      }
    ],
    "displayConfig": {
      "width": "full",
      "height": "medium",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 180,
    "isGlobal": false
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

# Client Widget 3: ROSHN Development Issues
echo ""
echo "3️⃣ Creating: ROSHN Development Issues"
response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ROSHN Development Issues",
    "description": "Development and deployment issues for ROSHN client with dynamic context",
    "pluginName": "jira",
    "widgetType": "table",
    "query": "project in (\"DEP\", \"MD\") AND labels ~ \${shortName} AND issueType ~ \"Development\"",
    "method": "GET",
    "parameters": {
      "shortName": {
        "source": "database",
        "dbTable": "clients",
        "dbColumn": "shortName"
      }
    },
    "filters": [
      {
        "id": "development-filter",
        "field": "issueType",
        "operator": "contains",
        "value": "Development",
        "dataType": "string",
        "enabled": true
      },
      {
        "id": "client-label-filter",
        "field": "labels",
        "operator": "contains",
        "value": "ROSHN",
        "dataType": "string",
        "enabled": true
      }
    ],
    "displayConfig": {
      "width": "full",
      "height": "medium",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 240,
    "isGlobal": false
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

# Client Widget 4: MOD Client Open Tickets
echo ""
echo "4️⃣ Creating: MOD Client Open Tickets"
response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MOD Client Open Tickets",
    "description": "All open tickets for Ministry of Defense client with status filtering",
    "pluginName": "jira",
    "widgetType": "table",
    "query": "project in (\"DEP\", \"MD\") AND labels ~ \${shortName} AND status not in (Done, Closed)",
    "method": "GET",
    "parameters": {
      "shortName": {
        "source": "database",
        "dbTable": "clients",
        "dbColumn": "shortName"
      }
    },
    "filters": [
      {
        "id": "open-status-filter",
        "field": "status",
        "operator": "not_in",
        "value": ["Done", "Closed", "Resolved"],
        "dataType": "array",
        "enabled": true
      },
      {
        "id": "client-label-filter",
        "field": "labels",
        "operator": "contains",
        "value": "MOD",
        "dataType": "string",
        "enabled": true
      }
    ],
    "displayConfig": {
      "width": "full",
      "height": "large",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 300,
    "isGlobal": false
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

# Client Widget 5: ARAMCO Client Recent Activity
echo ""
echo "5️⃣ Creating: ARAMCO Client Recent Activity"
response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ARAMCO Client Recent Activity",
    "description": "Recent activity and updates for ARAMCO client with time-based filtering",
    "pluginName": "jira",
    "widgetType": "table",
    "query": "project in (\"DEP\", \"MD\") AND labels ~ \${shortName} AND updated >= -7d",
    "method": "GET",
    "parameters": {
      "shortName": {
        "source": "database",
        "dbTable": "clients",
        "dbColumn": "shortName"
      }
    },
    "filters": [
      {
        "id": "recent-activity-filter",
        "field": "updated",
        "operator": "date_after",
        "value": "2024-06-10",
        "dataType": "date",
        "enabled": true
      },
      {
        "id": "client-label-filter",
        "field": "labels",
        "operator": "contains",
        "value": "ARAMCO",
        "dataType": "string",
        "enabled": true
      }
    ],
    "displayConfig": {
      "width": "full",
      "height": "medium",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 600,
    "isGlobal": false
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

echo ""
echo "📈 WIDGET CREATION SUMMARY"
echo "========================="
echo "✅ Successfully created: $success_count widgets"
echo "❌ Failed to create: $fail_count widgets"
echo "📊 Total widgets: $((success_count + fail_count))"

if [ $success_count -gt 0 ]; then
    echo ""
    echo "🎯 FEATURES DEMONSTRATED:"
    echo "========================"
    echo "✅ Advanced filtering system with 20+ operators"
    echo "✅ Dynamic parameter resolution (static, context, database)"
    echo "✅ Client-specific widgets with shortName parameters"
    echo "✅ Multi-data type filtering (string, number, date, array)"
    echo "✅ Real-time parameter substitution"
    echo "✅ Context-aware widget behavior"
    echo "✅ Professional widget configurations"
    
    echo ""
    echo "📋 ACCESS WIDGETS:"
    echo "=================="
    echo "🌐 Global widgets: Available on all dashboard pages"
    echo "👤 Client widgets: Automatically filter based on client page context"
    echo "🔄 Auto-refresh: Widgets update automatically at configured intervals"
    echo "⚙️  Configurable: All filters and parameters can be modified in widget builder"
fi

# Clean up
rm -f session.txt

echo ""
echo "🎉 Widget creation process completed!" 