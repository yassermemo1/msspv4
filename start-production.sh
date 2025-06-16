#!/bin/bash

# Production startup script for MSSP Client Manager
# Usage: sudo ./start-production.sh

# Set environment variables with static values
export NODE_ENV=production
export SESSION_SECRET="my-secure-session-key"
export PORT=80

# Use the full path to node and npx
NODE_PATH=$(which node)
NPX_PATH=$(which npx)

if [ -z "$NODE_PATH" ]; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

if [ -z "$NPX_PATH" ]; then
    echo "❌ npx not found. Please install Node.js first."
    exit 1
fi

echo "🚀 Starting MSSP Client Manager in production mode..."
echo "🌐 Server will be available at: http://localhost:$PORT"
echo "🔐 Using static session configuration"
echo ""

# Run the application
exec $NPX_PATH tsx server/index.ts 