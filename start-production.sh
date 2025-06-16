#!/bin/bash

# MSSP Portal Production Startup Script
# This script builds and starts the MSSP Portal in production mode

set -e  # Exit on any error

echo "🚀 Starting MSSP Portal Production Deployment..."

# Configuration
NODE_ENV=production
PORT=80
SESSION_SECRET="413bc276264441a67c6d57bc79996874d9453547e80ce7af1a25dca982748980"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root (required for port 80)
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root to bind to port 80"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    exit 1
fi

print_status "Node.js version: $(node --version)"

# Navigate to project directory
cd /root/mcsportal/msspv2

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the correct directory?"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm ci --production=false
fi

# Build the application
print_status "Building application for production..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    print_error "Build failed - dist directory not found"
    exit 1
fi

print_status "Build completed successfully"

# Kill any existing processes on port 80
print_status "Checking for existing processes on port 80..."
if lsof -ti:80 > /dev/null 2>&1; then
    print_warning "Killing existing processes on port 80..."
    fuser -k 80/tcp || true
    sleep 2
fi

# Kill any existing tsx processes
if pgrep -f "tsx.*server" > /dev/null; then
    print_warning "Stopping existing server processes..."
    pkill -f "tsx.*server" || true
    sleep 2
fi

# Set environment variables
export NODE_ENV=$NODE_ENV
export PORT=$PORT
export SESSION_SECRET=$SESSION_SECRET

print_status "Starting MSSP Portal in production mode..."
print_status "Environment: $NODE_ENV"
print_status "Port: $PORT"
print_status "Session Secret: [SET]"

# Start the application
exec npm start 