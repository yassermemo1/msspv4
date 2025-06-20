#!/bin/bash

echo "🛑 Stopping current server processes..."
# Kill any existing server processes
pkill -f "tsx server/index.ts" || true
pkill -f "node.*server" || true
sleep 2

echo "🏗️ Building frontend..."
npm run build

echo "🚀 Starting server..."
npm run start 