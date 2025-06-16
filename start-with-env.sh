#!/bin/bash

# Production startup script for MSSP Client Manager with .env file support
# Usage: sudo ./start-with-env.sh

# Load environment variables from .env file
if [ -f ".env" ]; then
    echo "📋 Loading environment variables from .env..."
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
else
    echo "⚠️  .env file not found, using defaults..."
    echo "💡 Copy .env.example to .env and configure your settings"
    export NODE_ENV=production
    export SESSION_SECRET="my-secure-session-key"
    export PORT=80
fi

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
echo "🔐 Environment: $NODE_ENV"
echo ""

# Run the application
exec $NPX_PATH tsx server/index.ts 