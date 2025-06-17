#!/bin/bash

echo "🎯 Creating Jira Widget via API..."
echo "=================================="

# Create a Jira Issues Summary widget
RESPONSE=$(curl -s -b test-session-cookies.txt -X POST http://localhost:80/api/widgets/manage \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Jira Issues Summary",
    "description": "Shows Jira project issues using custom JQL query",
    "pluginName": "jira",
    "widgetType": "table",
    "query": "project in (DEP, MD) ORDER BY created DESC",
    "method": "POST",
    "parameters": {},
    "displayConfig": {
      "width": "full",
      "height": "medium",
      "showBorder": true,
      "showHeader": true
    },
    "refreshInterval": 60,
    "isGlobal": true
  }')

echo "📝 API Response:"
echo "$RESPONSE" | jq '.'

# Check if widget was created successfully
if echo "$RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    echo "✅ Jira widget created successfully!"
    WIDGET_ID=$(echo "$RESPONSE" | jq -r '.id')
    echo "🆔 Widget ID: $WIDGET_ID"
else
    echo "❌ Failed to create widget"
    echo "Error: $RESPONSE"
fi

echo ""
echo "🔍 Fetching all widgets to verify..."
curl -s -b test-session-cookies.txt http://localhost:80/api/widgets/manage | jq '.' 