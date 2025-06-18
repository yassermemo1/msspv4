#!/bin/bash

echo "🚀 Starting MSSP Portal Server..."

# Set up environment
export DATABASE_URL="postgresql://neondb_owner:npg_xB8XHSW4AeP3@ep-orange-pond-a5qhcfm0.us-east-2.aws.neon.tech/neondb?sslmode=require"
export PORT=80
export NODE_ENV=production

# Clean up and set up @shared module
echo "🔧 Setting up @shared module..."
rm -rf node_modules/@shared
mkdir -p node_modules/@shared

# Copy schema files
cp shared/schema.ts node_modules/@shared/schema.ts
cp shared/schema.js node_modules/@shared/schema.js 2>/dev/null || echo "No schema.js found, using .ts"

# Create package.json for @shared module
cat > node_modules/@shared/package.json << 'EOF'
{
  "name": "@shared",
  "main": "schema.js",
  "types": "schema.ts",
  "type": "commonjs"
}
EOF

# Create index file to export everything
cat > node_modules/@shared/index.js << 'EOF'
module.exports = require('./schema.js');
EOF

echo "✅ @shared module configured"

# Start the server
echo "🎯 Starting server on port $PORT..."
npm run start:port80 