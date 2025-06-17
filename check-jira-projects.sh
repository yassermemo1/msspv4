#!/bin/bash

echo "🔍 Checking Available Jira Projects..."
echo "====================================="

# Check if we have the environment variables
if [ -z "$JIRA_API_TOKEN" ]; then
    echo "❌ JIRA_API_TOKEN environment variable is not set"
    echo "💡 Set it with: export JIRA_API_TOKEN='your_token_here'"
    exit 1
fi

JIRA_URL="https://sd.sic.sitco.sa"

echo "🌐 Jira URL: $JIRA_URL"
echo "🔑 Using API Token: ${JIRA_API_TOKEN:0:10}..."
echo ""

echo "📋 Fetching project list..."
echo "=========================="

# Fetch projects and format nicely
curl -s -k -H "Authorization: Bearer $JIRA_API_TOKEN" \
    "$JIRA_URL/rest/api/2/project" | \
    jq -r '.[] | "🔹 Key: \(.key) | Name: \(.name) | Type: \(.projectTypeKey)"' 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch projects. Raw response:"
    curl -s -k -H "Authorization: Bearer $JIRA_API_TOKEN" "$JIRA_URL/rest/api/2/project"
    echo ""
    echo ""
    echo "💡 Troubleshooting tips:"
    echo "   1. Check if your JIRA_API_TOKEN is correct"
    echo "   2. Verify you have permission to view projects"
    echo "   3. Ensure the Jira URL is accessible"
else
    echo ""
    echo "✅ Success! Use the 'Key' values in your JQL queries"
    echo ""
    echo "📝 Example query format:"
    echo "   project = \"YOUR_PROJECT_KEY\" AND status != \"Done\""
    echo ""
    echo "🎯 For multiple projects:"
    echo "   project in (\"KEY1\", \"KEY2\", \"KEY3\")"
fi

echo ""
echo "🔗 You can also check projects manually at:"
echo "   $JIRA_URL/secure/BrowseProjects.jspa" 