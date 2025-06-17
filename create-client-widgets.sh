#!/bin/bash

echo "👥 Creating 5 Client-Specific Widgets with Dynamic Parameters..."
echo "================================================================"

# Login
curl -s -c session.txt -X POST http://localhost:80/api/login -H "Content-Type: application/json" -d '{"email": "admin@mssp.local", "password": "admin123"}' > /dev/null

success_count=0
fail_count=0

# Client Widget 1: SITE Client Issues
echo ""
echo "1️⃣ Creating: SITE Client Issues"
cat > widget1.json << 'EOF'
{
  "name": "SITE Client Issues",
  "description": "Issues related to SITE client using dynamic shortName parameter from client page context",
  "pluginName": "jira",
  "widgetType": "table",
  "query": "project in (\"DEP\", \"MD\") AND labels ~ ${shortName}",
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
}
EOF

response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" -H "Content-Type: application/json" -d @widget1.json)
if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed: $response"
    ((fail_count++))
fi

# Client Widget 2: HAJ Client Security Incidents
echo ""
echo "2️⃣ Creating: HAJ Client Security Incidents"
cat > widget2.json << 'EOF'
{
  "name": "HAJ Client Security Incidents",
  "description": "Security incidents for HAJ client with priority filtering and dynamic shortName",
  "pluginName": "jira",
  "widgetType": "table",
  "query": "project in (\"DEP\", \"MD\") AND labels ~ ${shortName} AND priority in (Critical, High)",
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
}
EOF

response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" -H "Content-Type: application/json" -d @widget2.json)
if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed: $response"
    ((fail_count++))
fi

# Client Widget 3: ROSHN Development Issues
echo ""
echo "3️⃣ Creating: ROSHN Development Issues"
cat > widget3.json << 'EOF'
{
  "name": "ROSHN Development Issues",
  "description": "Development and deployment issues for ROSHN client with dynamic context",
  "pluginName": "jira",
  "widgetType": "table",
  "query": "project in (\"DEP\", \"MD\") AND labels ~ ${shortName}",
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
}
EOF

response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" -H "Content-Type: application/json" -d @widget3.json)
if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed: $response"
    ((fail_count++))
fi

# Client Widget 4: MOD Client Open Tickets
echo ""
echo "4️⃣ Creating: MOD Client Open Tickets"
cat > widget4.json << 'EOF'
{
  "name": "MOD Client Open Tickets",
  "description": "All open tickets for Ministry of Defense client with status filtering",
  "pluginName": "jira",
  "widgetType": "table",
  "query": "project in (\"DEP\", \"MD\") AND labels ~ ${shortName} AND status not in (Done, Closed)",
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
}
EOF

response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" -H "Content-Type: application/json" -d @widget4.json)
if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed: $response"
    ((fail_count++))
fi

# Client Widget 5: ARAMCO Client Recent Activity
echo ""
echo "5️⃣ Creating: ARAMCO Client Recent Activity"
cat > widget5.json << 'EOF'
{
  "name": "ARAMCO Client Recent Activity",
  "description": "Recent activity and updates for ARAMCO client with time-based filtering",
  "pluginName": "jira",
  "widgetType": "table",
  "query": "project in (\"DEP\", \"MD\") AND labels ~ ${shortName} AND updated >= -7d",
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
}
EOF

response=$(curl -s -b session.txt -X POST "http://localhost:80/api/widgets/manage" -H "Content-Type: application/json" -d @widget5.json)
if echo "$response" | grep -q '"id"'; then
    widget_id=$(echo "$response" | jq -r '.id')
    echo "   ✅ Created successfully with ID: $widget_id"
    ((success_count++))
else
    echo "   ❌ Failed: $response"
    ((fail_count++))
fi

echo ""
echo "📈 CLIENT WIDGET CREATION SUMMARY"
echo "================================="
echo "✅ Successfully created: $success_count client widgets"
echo "❌ Failed to create: $fail_count client widgets"
echo "📊 Total client widgets: $((success_count + fail_count))"

# Clean up
rm -f session.txt widget*.json

echo ""
echo "🎉 Client widget creation process completed!" 