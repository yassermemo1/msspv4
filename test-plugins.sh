#!/bin/bash

echo "🔌 Testing Plugin System"
echo "========================"

echo ""
echo "1. Testing plugins list endpoint..."
curl -s "http://localhost:3000/api/plugins" | jq '.plugins | length' | xargs echo "Found plugins:"

echo ""
echo "2. Testing FortiGate instance status..."
curl -s "http://localhost:3000/api/plugins" | jq '.plugins[] | select(.systemName == "fortigate") | .config.instances[] | {id, name, isActive}'

echo ""
echo "3. Testing connection to FortiGate prod instance..."
curl -s "http://localhost:3000/api/plugins/instances/fortigate/fortigate-prod/test" -X POST | jq '.connected // false' | xargs echo "Connected:"

echo ""
echo "4. Testing available plugins for widget creation..."
curl -s "http://localhost:3000/api/plugins/available" | jq 'length' | xargs echo "Available plugins:"

echo ""
echo "✅ Plugin system test complete" 