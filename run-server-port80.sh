#!/bin/bash

echo "🚀 Starting MSSP Portal on Port 80..."

# Set all required environment variables
export DATABASE_URL="postgresql://neondb_owner:npg_xB8XHSW4AeP3@ep-orange-pond-a5qhcfm0.us-east-2.aws.neon.tech/neondb?sslmode=require"
export PORT=80
export NODE_ENV=production
export SESSION_SECRET="mssp-session-secret-key"
export ENABLE_AUTO_SYNC=true
export JIRA_BASE_URL="https://sd.sic.sitco.sa"
export JIRA_USERNAME="yalmohammed" 
export JIRA_AUTH_TYPE="bearer"
export JIRA_ENABLED="true"

# Kill any existing processes
echo "🔄 Checking for existing processes on port 80..."
pkill -f "tsx.*server" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true

# Set up @shared module properly
echo "🔧 Setting up @shared module..."
rm -rf node_modules/@shared
mkdir -p node_modules/@shared

# Try to use built schema first, fallback to source
if [ -f "dist/shared/schema.js" ]; then
    cp dist/shared/schema.js node_modules/@shared/schema.js
    echo "✅ Using built schema from dist/"
elif [ -f "shared/schema.js" ]; then
    cp shared/schema.js node_modules/@shared/schema.js  
    echo "✅ Using source schema.js"
else
    echo "⚠️  No schema.js found, trying TypeScript approach..."
    cp shared/schema.ts node_modules/@shared/schema.ts
fi

# Create package.json for @shared
cat > node_modules/@shared/package.json << 'EOF'
{
  "name": "@shared",
  "main": "schema.js",
  "type": "commonjs"
}
EOF

echo "✅ Module setup complete"
echo "🌐 Starting server on http://localhost:80"
echo ""

# Run the server
npx tsx server/index.ts 