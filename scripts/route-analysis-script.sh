#!/bin/bash

# MSSP Client Manager - Route Analysis and Improvement Script
# This script helps analyze routes and suggest improvements

echo "🔍 MSSP Client Manager - Route Analysis Script"
echo "=============================================="
echo ""

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $1"
        return 1
    fi
}

# Function to count routes in a file
count_routes() {
    local file="$1"
    local pattern="$2"
    if [ -f "$file" ]; then
        count=$(grep -c "$pattern" "$file" 2>/dev/null || echo "0")
        echo "$count"
    else
        echo "0"
    fi
}

echo "📋 Step 1: Frontend Route Analysis"
echo "=================================="

# Check main routing files
echo "Checking main routing configuration files:"
check_file "MsspClientManager/client/src/App.tsx"
check_file "MsspClientManager/client/src/config/navigation.ts"
check_file "MsspClientManager/client/src/components/layout/dynamic-navigation.tsx"

echo ""

# Count frontend routes
if [ -f "MsspClientManager/client/src/App.tsx" ]; then
    frontend_routes=$(count_routes "MsspClientManager/client/src/App.tsx" "<Route path=")
    echo -e "${BLUE}Frontend Routes Found:${NC} $frontend_routes"
fi

echo ""
echo "📋 Step 2: Backend API Analysis"
echo "==============================="

# Check backend routing files
echo "Checking backend API files:"
check_file "MsspClientManager/server/routes.ts"
check_file "MsspClientManager/server/auth.ts"

echo ""

# Count backend routes
if [ -f "MsspClientManager/server/routes.ts" ]; then
    api_routes=$(count_routes "MsspClientManager/server/routes.ts" "app\.\(get\|post\|put\|delete\|patch\)")
    echo -e "${BLUE}API Routes Found:${NC} $api_routes"
fi

if [ -f "MsspClientManager/server/auth.ts" ]; then
    auth_routes=$(count_routes "MsspClientManager/server/auth.ts" "app\.\(get\|post\|put\|delete\|patch\)")
    echo -e "${BLUE}Auth Routes Found:${NC} $auth_routes"
fi

echo ""
echo "📋 Step 3: Route Consistency Check"
echo "=================================="

# Check for common route patterns
echo "Checking for potential route mismatches:"

# Define expected route pairs
declare -a route_pairs=(
    "/clients:GET /api/clients"
    "/contracts:GET /api/contracts"
    "/services:GET /api/services"
    "/assets:GET /api/hardware-assets"
    "/financial:GET /api/financial-transactions"
    "/documents:GET /api/documents"
    "/dashboards:GET /api/dashboards"
)

for pair in "${route_pairs[@]}"; do
    frontend_route=$(echo "$pair" | cut -d':' -f1)
    backend_route=$(echo "$pair" | cut -d':' -f2)
    
    # Check if frontend route exists
    if [ -f "MsspClientManager/client/src/App.tsx" ]; then
        if grep -q "path=\"$frontend_route\"" "MsspClientManager/client/src/App.tsx" 2>/dev/null; then
            frontend_exists=true
        else
            frontend_exists=false
        fi
    else
        frontend_exists=false
    fi
    
    # Check if backend route exists
    if [ -f "MsspClientManager/server/routes.ts" ]; then
        if grep -q "$backend_route" "MsspClientManager/server/routes.ts" 2>/dev/null; then
            backend_exists=true
        else
            backend_exists=false
        fi
    else
        backend_exists=false
    fi
    
    # Report status
    if [ "$frontend_exists" = true ] && [ "$backend_exists" = true ]; then
        echo -e "${GREEN}✓${NC} $frontend_route ↔ $backend_route"
    elif [ "$frontend_exists" = true ] && [ "$backend_exists" = false ]; then
        echo -e "${YELLOW}⚠${NC} $frontend_route exists but $backend_route missing"
    elif [ "$frontend_exists" = false ] && [ "$backend_exists" = true ]; then
        echo -e "${YELLOW}⚠${NC} $backend_route exists but $frontend_route missing"
    else
        echo -e "${RED}✗${NC} Both $frontend_route and $backend_route missing"
    fi
done

echo ""
echo "📋 Step 4: Security Analysis"
echo "============================"

# Check for authentication patterns
echo "Checking authentication patterns:"

if [ -f "MsspClientManager/server/routes.ts" ]; then
    protected_routes=$(count_routes "MsspClientManager/server/routes.ts" "requireAuth")
    admin_routes=$(count_routes "MsspClientManager/server/routes.ts" "requireAdmin")
    manager_routes=$(count_routes "MsspClientManager/server/routes.ts" "requireManagerOrAbove")
    
    echo -e "${BLUE}Protected Routes:${NC} $protected_routes"
    echo -e "${BLUE}Admin-only Routes:${NC} $admin_routes"
    echo -e "${BLUE}Manager+ Routes:${NC} $manager_routes"
fi

if [ -f "MsspClientManager/client/src/App.tsx" ]; then
    auth_guarded=$(count_routes "MsspClientManager/client/src/App.tsx" "AuthGuard")
    page_guarded=$(count_routes "MsspClientManager/client/src/App.tsx" "PageGuard")
    
    echo -e "${BLUE}Auth Guarded Routes:${NC} $auth_guarded"
    echo -e "${BLUE}Page Guarded Routes:${NC} $page_guarded"
fi

echo ""
echo "📋 Step 5: Recommendations"
echo "=========================="

echo "Based on the analysis, here are the recommendations:"
echo ""

# Generate recommendations
echo -e "${YELLOW}🔧 Route Improvements:${NC}"
echo "1. Add missing API endpoints for complete CRUD operations"
echo "2. Implement proper error handling for 404 routes"
echo "3. Consider adding API versioning (/api/v1/...)"
echo "4. Add OpenAPI/Swagger documentation"
echo ""

echo -e "${YELLOW}🔒 Security Enhancements:${NC}"
echo "1. Ensure all sensitive routes are properly protected"
echo "2. Implement rate limiting for public endpoints"
echo "3. Add request validation middleware"
echo "4. Consider implementing CSRF protection"
echo ""

echo -e "${YELLOW}⚡ Performance Optimizations:${NC}"
echo "1. Implement route-based code splitting"
echo "2. Add caching for frequently accessed routes"
echo "3. Consider implementing route prefetching"
echo "4. Add compression for API responses"
echo ""

echo -e "${YELLOW}📚 Documentation:${NC}"
echo "1. Create route documentation in README"
echo "2. Add inline comments for complex route logic"
echo "3. Document authentication requirements"
echo "4. Create API endpoint documentation"
echo ""

echo "✅ Route analysis complete!"
echo ""
echo "For detailed analysis, see: fix-missing-routes.md"
echo "==============================================" 