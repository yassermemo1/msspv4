#!/bin/bash

echo "🎯 Creating Client-Specific Widgets with Dynamic Parameters"
echo "=========================================================="

# Login first
curl -s -c session.txt -X POST http://10.252.1.89:80/api/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@mssp.local", "password": "admin123"}' > /dev/null

success_count=0
fail_count=0

echo ""
echo "📊 1. Context-Based Widget: Client Issues by Short Name"
echo "======================================================="

response=$(curl -s -b session.txt -X POST "http://10.252.1.89:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Client Issues (Dynamic)",
    "description": "Shows issues filtered by client short name from page context - automatically adapts based on which client page you are viewing",
    "pluginName": "jira",
    "widgetType": "table",
    "query": "project in (\"DEP\", \"MD\") AND labels ~ ${clientShortName}",
    "method": "GET",
    "parameters": {
      "clientShortName": {
        "source": "context",
        "contextVar": "clientShortName"
      }
    },
    "displayConfig": {
      "width": "full",
      "height": "medium",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 300,
    "isGlobal": true
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id' 2>/dev/null)
    echo "   ✅ Created successfully with ID: $widget_id"
    echo "   🔄 Context parameter: clientShortName (automatically filled from URL)"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

echo ""
echo "📊 2. Database-Linked Widget: Issues by Client Domain"
echo "===================================================="

response=$(curl -s -b session.txt -X POST "http://10.252.1.89:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Issues by Client Domain",
    "description": "Fetches client domain from database and filters issues by reporter domain - database parameter example",
    "pluginName": "jira",
    "widgetType": "metric",
    "query": "project in (\"DEP\", \"MD\") AND \"Reporter Domain\" ~ ${clientDomain}",
    "method": "GET",
    "parameters": {
      "clientDomain": {
        "source": "database",
        "dbTable": "clients",
        "dbColumn": "domain"
      }
    },
    "displayConfig": {
      "width": "half",
      "height": "small",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 600,
    "isGlobal": true
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id' 2>/dev/null)
    echo "   ✅ Created successfully with ID: $widget_id"
    echo "   🗄️ Database parameter: domain from clients table based on current client ID"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

echo ""
echo "📊 3. Multi-Parameter Widget: Comprehensive Client View"
echo "======================================================"

response=$(curl -s -b session.txt -X POST "http://10.252.1.89:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Client Security Overview",
    "description": "Combines static timeframe, context client data, and database domain for comprehensive security view",
    "pluginName": "jira",
    "widgetType": "chart",
    "chartType": "pie",
    "query": "project in (\"DEP\", \"MD\") AND labels ~ ${clientPrefix} AND created >= ${timeRange} AND \"Reporter Domain\" ~ ${clientDomain}",
    "method": "GET",
    "parameters": {
      "clientPrefix": {
        "source": "context",
        "contextVar": "clientShortName"
      },
      "timeRange": {
        "source": "static",
        "value": "-30d"
      },
      "clientDomain": {
        "source": "database",
        "dbTable": "clients",
        "dbColumn": "domain"
      }
    },
    "displayConfig": {
      "width": "full",
      "height": "medium",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 900,
    "isGlobal": true
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id' 2>/dev/null)
    echo "   ✅ Created successfully with ID: $widget_id"
    echo "   🎯 Multi-parameter: context + static + database sources"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

echo ""
echo "📊 4. Static + Context Widget: Priority Filtered by Client"
echo "=========================================================="

response=$(curl -s -b session.txt -X POST "http://10.252.1.89:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High Priority Client Issues",
    "description": "Shows high/critical priority issues for current client using static priority filter and dynamic client context",
    "pluginName": "jira",
    "widgetType": "table",
    "query": "project in (\"DEP\", \"MD\") AND labels ~ ${clientTag} AND priority in (${priorityLevels})",
    "method": "GET",
    "parameters": {
      "clientTag": {
        "source": "context",
        "contextVar": "clientShortName"
      },
      "priorityLevels": {
        "source": "static",
        "value": "Critical,High"
      }
    },
    "displayConfig": {
      "width": "full",
      "height": "large",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 180,
    "isGlobal": true
  }')

if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id' 2>/dev/null)
    echo "   ✅ Created successfully with ID: $widget_id"
    echo "   ⚡ Mixed parameters: dynamic client + static priority filter"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

echo ""
echo "📊 5. Time-Based Dynamic Widget: Recent Activity"
echo "==============================================="

response=$(curl -s -b session.txt -X POST "http://10.252.1.89:80/api/widgets/manage" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Recent Client Activity",
    "description": "Shows activity for current client in the last 7 days - demonstrates time-based filtering with client context",
    "pluginName": "jira",
    "widgetType": "trend",
    "query": "project in (\"DEP\", \"MD\") AND labels ~ ${clientCode} AND updated >= ${recentPeriod} ORDER BY updated DESC",
    "method": "GET",
    "parameters": {
      "clientCode": {
        "source": "context",
        "contextVar": "clientShortName"
      },
      "recentPeriod": {
        "source": "static",
        "value": "-7d"
      }
    },
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
    widget_id=$(echo "$response" | jq -r '.id' 2>/dev/null)
    echo "   ✅ Created successfully with ID: $widget_id"
    echo "   📅 Time-based: recent activity for current client"
    ((success_count++))
else
    echo "   ❌ Failed to create widget"
    ((fail_count++))
fi

echo ""
echo "🎉 CLIENT DYNAMIC WIDGETS CREATION COMPLETED!"
echo "============================================="
echo "📊 Widgets created: $success_count"
echo "❌ Failed widgets: $fail_count"

if [ $success_count -gt 0 ]; then
    echo ""
    echo "🎯 DYNAMIC PARAMETER FEATURES DEMONSTRATED:"
    echo "==========================================="
    echo "✅ Context Parameters: clientShortName automatically filled from current page URL"
    echo "✅ Database Parameters: Client domain fetched from database based on client ID"
    echo "✅ Static Parameters: Fixed values like priority levels and time ranges"
    echo "✅ Multi-Parameter Queries: Combining all three parameter types in single widget"
    echo "✅ Automatic Resolution: Parameters resolved server-side for security and performance"
    
    echo ""
    echo "📋 HOW IT WORKS:"
    echo "==============="
    echo "🔗 URL Context: /clients/123 → clientId=123 extracted automatically"
    echo "🗄️ Database Lookup: clientId=123 → fetch client.domain, client.shortName etc."
    echo "🔄 Parameter Substitution: \${clientShortName} replaced with actual client value"
    echo "🚀 Query Execution: Final query with resolved parameters sent to Jira API"
    
    echo ""
    echo "💡 USAGE IN CLIENT PAGES:"
    echo "========================"
    echo "✨ Navigate to any client detail page (e.g., /clients/1)"
    echo "📊 All widgets automatically adapt to show data for that specific client"
    echo "🔄 No manual configuration needed - client context extracted from URL"
    echo "⚡ Widgets refresh automatically at configured intervals"
    echo "🎛️ Each widget can be edited/disabled via widget management interface"
    
    echo ""
    echo "🔧 PARAMETER TYPES AVAILABLE:"
    echo "============================="
    echo "📍 Context Parameters:"
    echo "   - clientId: Current client's database ID"
    echo "   - clientShortName: Client's short identifier (e.g., 'ACME')"
    echo "   - clientName: Full client name"
    echo "   - clientDomain: Client's domain (if available)"
    echo "   - contractId: Current contract ID (if on contract page)"
    echo "   - userId: Current logged-in user ID"
    echo ""
    echo "🗄️ Database Parameters:"
    echo "   - Any column from clients, contracts, users, services tables"
    echo "   - Automatically linked based on current page context"
    echo "   - Secure server-side resolution"
    echo ""
    echo "⚙️ Static Parameters:"
    echo "   - Fixed values defined in widget configuration"
    echo "   - Time ranges, priority levels, status filters, etc."
    echo "   - Can be edited via widget builder interface"
fi

# Clean up
rm -f session.txt

echo ""
echo "🎊 Dynamic parameter widgets are now ready for use!" 