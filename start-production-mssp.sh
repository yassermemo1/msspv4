#!/bin/bash

# MSSP Production Startup Script
# This script starts the MSSP application with the correct database configuration

echo "🚀 Starting MSSP Client Manager in production mode..."

# Kill any existing processes on port 80
echo "🔄 Checking for existing processes on port 80..."
EXISTING_PID=$(lsof -t -i:80 2>/dev/null)
if [ ! -z "$EXISTING_PID" ]; then
    echo "   Killing existing process: $EXISTING_PID"
    kill -9 $EXISTING_PID
    sleep 2
fi

# Load environment variables from .env file
if [ -f .env ]; then
    echo "📂 Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ DATABASE_URL loaded from .env file"
else
    echo "❌ ERROR: .env file not found!"
    echo "Please create a .env file with DATABASE_URL and other required variables."
    exit 1
fi
export DB_PASSWORD=12345678

# Jira configuration (from environment)
export JIRA_BASE_URL="https://sd.sic.sitco.sa"
export JIRA_USERNAME="yalmohammed"
export JIRA_AUTH_TYPE="bearer"
export JIRA_ENABLED="true"

echo "✅ Environment variables set"
echo "📊 Database: mssp_production"
echo "🌐 Server: http://0.0.0.0:80"
echo ""

# Start the application
echo "🚀 Starting application..."
npx tsx server/index.ts 