#!/bin/bash

echo "🎯 Creating Custom Query Jira Widget..."
echo "======================================="

# Create a custom query widget with specific JQL
RESPONSE=$(curl -s -b test-session-cookies.txt -X POST http://localhost:80/api/widgets/manage \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Open Jira Issues",
    "description": "Custom query showing open issues from specific projects",
    "pluginName": "jira",
    "widgetType": "query",
    "query": "project in (\"DEP\", \"MD\") AND status != \"Done\" AND created >= -30d ORDER BY created DESC",
    "method": "POST",
    "parameters": {},
    "displayConfig": {
      "width": "full",
      "height": "large",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 120,
    "isGlobal": false
  }')

echo "📝 API Response:"
echo "$RESPONSE" | jq '.'

# Check if widget was created successfully
if echo "$RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    echo "✅ Custom query widget created successfully!"
    WIDGET_ID=$(echo "$RESPONSE" | jq -r '.id')
    echo "🆔 Widget ID: $WIDGET_ID"
    
    echo ""
    echo "👁️ Testing widget view/preview..."
    echo "================================"
    
    # Test if we can access widget data
    echo "🔍 Testing widget data endpoint..."
    curl -s -b test-session-cookies.txt "http://localhost:80/api/widgets/data/$WIDGET_ID" | jq '.'
    
else
    echo "❌ Failed to create widget"
    echo "Error: $RESPONSE"
fi

echo ""
echo "📊 Current widgets summary:"
echo "=========================="
curl -s -b test-session-cookies.txt http://localhost:80/api/widgets/manage | jq '.[] | {id, name, pluginName, widgetType, query: .query[0:50]}'

echo ""
echo "🔗 Widget Manager URL: http://localhost:80/widget-manager"
echo "📱 You can now access the Widget Manager UI to view and manage widgets" 