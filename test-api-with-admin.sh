#!/bin/bash

# API Testing Script with Consistent Admin Credentials
# This script uses the admin credentials from .env for all API testing

# Load environment variables
source .env

# Set admin credentials
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@mssp.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
BASE_URL="http://localhost:80"
COOKIE_FILE="test-session-cookies.txt"

echo "🧪 MSSP API Testing Suite"
echo "=========================="
echo "📧 Admin Email: $ADMIN_EMAIL"
echo "🔑 Admin Password: $ADMIN_PASSWORD"
echo "🌐 Base URL: $BASE_URL"
echo ""

# Function to test login
test_login() {
    echo "🔐 Testing Admin Login..."
    response=$(curl -s -c "$COOKIE_FILE" -X POST "$BASE_URL/api/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
        -w "HTTP_CODE:%{http_code}")
    
    http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
    json_response=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Login Successful"
        echo "👤 User: $(echo "$json_response" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)"
        echo "🏷️  Role: $(echo "$json_response" | grep -o '"role":"[^"]*"' | cut -d'"' -f4)"
        return 0
    else
        echo "❌ Login Failed (HTTP $http_code)"
        echo "$json_response"
        return 1
    fi
}

# Function to test authenticated endpoint
test_authenticated_endpoint() {
    local endpoint="$1"
    local method="${2:-GET}"
    local description="$3"
    
    echo "🔍 Testing: $description"
    echo "   $method $endpoint"
    
    response=$(curl -s -b "$COOKIE_FILE" -X "$method" "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -w "HTTP_CODE:%{http_code}")
    
    http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
    json_response=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Success (HTTP $http_code)"
        # Show first 100 characters of response
        echo "   Response: $(echo "$json_response" | cut -c1-100)..."
    else
        echo "❌ Failed (HTTP $http_code)"
        echo "   Error: $json_response"
    fi
    echo ""
}

# Function to test POST endpoint with data
test_post_endpoint() {
    local endpoint="$1"
    local data="$2"
    local description="$3"
    
    echo "🔍 Testing: $description"
    echo "   POST $endpoint"
    
    response=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data" \
        -w "HTTP_CODE:%{http_code}")
    
    http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
    json_response=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo "✅ Success (HTTP $http_code)"
        echo "   Response: $(echo "$json_response" | cut -c1-100)..."
    else
        echo "❌ Failed (HTTP $http_code)"
        echo "   Error: $json_response"
    fi
    echo ""
}

# Main testing sequence
main() {
    # Test login first
    if ! test_login; then
        echo "❌ Cannot proceed without successful login"
        exit 1
    fi
    
    echo ""
    echo "🧪 Testing API Endpoints with Admin Session"
    echo "==========================================="
    
    # Test various endpoints
    test_authenticated_endpoint "/api/user" "GET" "Current User Info"
    test_authenticated_endpoint "/api/widgets/manage" "GET" "Widget Manager"
    test_authenticated_endpoint "/api/clients" "GET" "Clients List"
    test_authenticated_endpoint "/api/health" "GET" "Health Check"
    test_authenticated_endpoint "/api/plugins" "GET" "Plugins List"
    test_authenticated_endpoint "/api/users" "GET" "Users Management"
    test_authenticated_endpoint "/api/company" "GET" "Company Settings"
    
    echo "🎯 Summary"
    echo "=========="
    echo "✅ Admin credentials from .env are working"
    echo "🔑 Email: $ADMIN_EMAIL"
    echo "🔑 Password: $ADMIN_PASSWORD"
    echo "🍪 Session saved in: $COOKIE_FILE"
    echo ""
    echo "💡 Usage Examples:"
    echo "   curl -b $COOKIE_FILE $BASE_URL/api/widgets/manage"
    echo "   curl -b $COOKIE_FILE $BASE_URL/api/clients"
    echo ""
    echo "🔄 To re-login: curl -c $COOKIE_FILE -X POST $BASE_URL/api/login -H 'Content-Type: application/json' -d '{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}'"
}

# Run the tests
main 