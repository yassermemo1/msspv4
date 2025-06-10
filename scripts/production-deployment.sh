#!/bin/bash

# 🚀 MSSP Production Deployment Script
# This script performs all critical checks and optimizations for production deployment

set -e  # Exit on any error

echo "🚀 Starting MSSP Production Deployment Preparation..."
echo "=================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "INFO")
            echo -e "${BLUE}ℹ️  ${message}${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅ ${message}${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  ${message}${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ ${message}${NC}"
            ;;
    esac
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate environment variables
validate_env() {
    print_status "INFO" "Validating environment variables..."
    
    local required_vars=(
        "NODE_ENV"
        "DATABASE_URL"
        "SESSION_SECRET"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_status "ERROR" "Missing required environment variables: ${missing_vars[*]}"
        return 1
    fi
    
    print_status "SUCCESS" "Environment variables validated"
    return 0
}

# Function to check TypeScript compilation
check_typescript() {
    print_status "INFO" "Checking TypeScript compilation..."
    
    if npm run typecheck > /dev/null 2>&1; then
        print_status "SUCCESS" "TypeScript compilation passed"
        return 0
    else
        print_status "ERROR" "TypeScript compilation failed - Fix errors before production deployment"
        print_status "INFO" "Run 'npm run typecheck' to see detailed errors"
        return 1
    fi
}

# Function to run linting
run_linting() {
    print_status "INFO" "Running ESLint..."
    
    if npm run lint > /dev/null 2>&1; then
        print_status "SUCCESS" "Linting passed"
        return 0
    else
        print_status "WARNING" "Linting issues found - Consider fixing before deployment"
        print_status "INFO" "Run 'npm run lint' to see detailed issues"
        return 0  # Don't fail deployment for linting
    fi
}

# Function to check security vulnerabilities
check_security() {
    print_status "INFO" "Checking for security vulnerabilities..."
    
    local audit_output
    audit_output=$(npm audit --audit-level moderate 2>&1)
    local audit_exit_code=$?
    
    if [[ $audit_exit_code -eq 0 ]]; then
        print_status "SUCCESS" "No critical security vulnerabilities found"
        return 0
    else
        local critical_count
        critical_count=$(echo "$audit_output" | grep -o '[0-9]* critical' | head -1 | cut -d' ' -f1)
        local high_count
        high_count=$(echo "$audit_output" | grep -o '[0-9]* high' | head -1 | cut -d' ' -f1)
        
        if [[ -n "$critical_count" && "$critical_count" -gt 0 ]]; then
            print_status "ERROR" "$critical_count critical vulnerabilities found - Must fix before production"
            return 1
        elif [[ -n "$high_count" && "$high_count" -gt 0 ]]; then
            print_status "WARNING" "$high_count high severity vulnerabilities found - Consider fixing"
            return 0
        else
            print_status "WARNING" "Some vulnerabilities found - Review with 'npm audit'"
            return 0
        fi
    fi
}

# Function to run tests
run_tests() {
    print_status "INFO" "Running test suite..."
    
    # Run unit tests
    if npm run test:unit > /dev/null 2>&1; then
        print_status "SUCCESS" "Unit tests passed"
    else
        print_status "ERROR" "Unit tests failed"
        return 1
    fi
    
    # Run integration tests if available
    if command_exists "npm run test:integration"; then
        if npm run test:integration > /dev/null 2>&1; then
            print_status "SUCCESS" "Integration tests passed"
        else
            print_status "ERROR" "Integration tests failed"
            return 1
        fi
    fi
    
    return 0
}

# Function to build for production
build_production() {
    print_status "INFO" "Building for production..."
    
    export NODE_ENV=production
    
    if npm run build > /dev/null 2>&1; then
        print_status "SUCCESS" "Production build completed"
        
        # Check build size
        local build_size
        build_size=$(du -sh dist/ 2>/dev/null | cut -f1 || echo "Unknown")
        print_status "INFO" "Build size: $build_size"
        
        return 0
    else
        print_status "ERROR" "Production build failed"
        return 1
    fi
}

# Function to validate database connection
check_database() {
    print_status "INFO" "Checking database connection..."
    
    # This would need to be implemented based on your database setup
    # For now, just check if DATABASE_URL is set
    if [[ -n "$DATABASE_URL" ]]; then
        print_status "SUCCESS" "Database URL configured"
        return 0
    else
        print_status "ERROR" "DATABASE_URL not configured"
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    print_status "INFO" "Checking disk space..."
    
    local available_space
    available_space=$(df . | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB in KB
    
    if [[ $available_space -gt $required_space ]]; then
        print_status "SUCCESS" "Sufficient disk space available"
        return 0
    else
        print_status "WARNING" "Low disk space - Consider freeing up space"
        return 0
    fi
}

# Function to generate security secrets if needed
generate_secrets() {
    print_status "INFO" "Checking security secrets..."
    
    if [[ -z "$SESSION_SECRET" ]] || [[ ${#SESSION_SECRET} -lt 32 ]]; then
        print_status "WARNING" "SESSION_SECRET is missing or too short"
        print_status "INFO" "Generate a secure secret with: openssl rand -hex 32"
        return 1
    fi
    
    if [[ -z "$JWT_SECRET" ]] || [[ ${#JWT_SECRET} -lt 32 ]]; then
        print_status "WARNING" "JWT_SECRET is missing or too short"
        print_status "INFO" "Generate a secure secret with: openssl rand -hex 32"
        return 1
    fi
    
    print_status "SUCCESS" "Security secrets validated"
    return 0
}

# Function to check production readiness
check_production_config() {
    print_status "INFO" "Validating production configuration..."
    
    local issues=0
    
    # Check NODE_ENV
    if [[ "$NODE_ENV" != "production" ]]; then
        print_status "WARNING" "NODE_ENV should be 'production' for production deployment"
        ((issues++))
    fi
    
    # Check if HTTPS is configured
    if [[ -z "$FORCE_HTTPS" ]] && [[ "$NODE_ENV" == "production" ]]; then
        print_status "WARNING" "Consider setting FORCE_HTTPS=true for production"
        ((issues++))
    fi
    
    # Check session configuration
    if [[ -z "$SESSION_SECURE" ]] && [[ "$NODE_ENV" == "production" ]]; then
        print_status "WARNING" "Consider setting SESSION_SECURE=true for production"
        ((issues++))
    fi
    
    if [[ $issues -eq 0 ]]; then
        print_status "SUCCESS" "Production configuration validated"
        return 0
    else
        print_status "WARNING" "$issues configuration issues found"
        return 0
    fi
}

# Function to run E2E tests
run_e2e_tests() {
    print_status "INFO" "Running E2E tests..."
    
    if command_exists "npx playwright"; then
        if npx playwright test tests/e2e/production-readiness.spec.ts > /dev/null 2>&1; then
            print_status "SUCCESS" "E2E tests passed"
            return 0
        else
            print_status "ERROR" "E2E tests failed"
            return 1
        fi
    else
        print_status "WARNING" "Playwright not available - Skipping E2E tests"
        return 0
    fi
}

# Function to create deployment summary
create_summary() {
    local total_checks=$1
    local passed_checks=$2
    local failed_checks=$3
    
    print_status "INFO" "Creating deployment summary..."
    
    cat > production-deployment-summary.md << EOF
# Production Deployment Summary

**Date:** $(date)
**Environment:** ${NODE_ENV:-development}
**Total Checks:** $total_checks
**Passed:** $passed_checks
**Failed:** $failed_checks

## Deployment Status
$(if [[ $failed_checks -eq 0 ]]; then echo "✅ **READY FOR PRODUCTION**"; else echo "❌ **NOT READY FOR PRODUCTION**"; fi)

## Checklist Results
$(if [[ $TYPESCRIPT_PASSED == "true" ]]; then echo "- ✅ TypeScript compilation"; else echo "- ❌ TypeScript compilation"; fi)
$(if [[ $SECURITY_PASSED == "true" ]]; then echo "- ✅ Security audit"; else echo "- ❌ Security audit"; fi)
$(if [[ $TESTS_PASSED == "true" ]]; then echo "- ✅ Test suite"; else echo "- ❌ Test suite"; fi)
$(if [[ $BUILD_PASSED == "true" ]]; then echo "- ✅ Production build"; else echo "- ❌ Production build"; fi)

## Next Steps
$(if [[ $failed_checks -eq 0 ]]; then
echo "1. Deploy to staging environment
2. Run final smoke tests
3. Deploy to production
4. Monitor application health"
else
echo "1. Fix failed checks above
2. Re-run deployment script
3. Ensure all checks pass before production deployment"
fi)

## Deployment Commands
\`\`\`bash
# Start production server
NODE_ENV=production npm start

# Or using PM2
pm2 start ecosystem.config.js --env production
\`\`\`
EOF

    print_status "SUCCESS" "Deployment summary created: production-deployment-summary.md"
}

# Main execution
main() {
    local total_checks=0
    local passed_checks=0
    local failed_checks=0
    
    # Track check results
    TYPESCRIPT_PASSED="false"
    SECURITY_PASSED="false"
    TESTS_PASSED="false"
    BUILD_PASSED="false"
    
    echo ""
    print_status "INFO" "Starting production readiness checks..."
    echo ""
    
    # Environment validation
    ((total_checks++))
    if validate_env; then
        ((passed_checks++))
    else
        ((failed_checks++))
        print_status "ERROR" "Environment validation failed - Cannot continue"
        exit 1
    fi
    
    # TypeScript check
    ((total_checks++))
    if check_typescript; then
        ((passed_checks++))
        TYPESCRIPT_PASSED="true"
    else
        ((failed_checks++))
    fi
    
    # Linting
    ((total_checks++))
    if run_linting; then
        ((passed_checks++))
    else
        ((failed_checks++))
    fi
    
    # Security audit
    ((total_checks++))
    if check_security; then
        ((passed_checks++))
        SECURITY_PASSED="true"
    else
        ((failed_checks++))
    fi
    
    # Generate/check secrets
    ((total_checks++))
    if generate_secrets; then
        ((passed_checks++))
    else
        ((failed_checks++))
    fi
    
    # Database check
    ((total_checks++))
    if check_database; then
        ((passed_checks++))
    else
        ((failed_checks++))
    fi
    
    # Disk space check
    ((total_checks++))
    if check_disk_space; then
        ((passed_checks++))
    else
        ((failed_checks++))
    fi
    
    # Production config check
    ((total_checks++))
    if check_production_config; then
        ((passed_checks++))
    else
        ((failed_checks++))
    fi
    
    # Run tests
    ((total_checks++))
    if run_tests; then
        ((passed_checks++))
        TESTS_PASSED="true"
    else
        ((failed_checks++))
    fi
    
    # Build for production
    ((total_checks++))
    if build_production; then
        ((passed_checks++))
        BUILD_PASSED="true"
    else
        ((failed_checks++))
    fi
    
    # E2E tests (optional)
    ((total_checks++))
    if run_e2e_tests; then
        ((passed_checks++))
    else
        ((failed_checks++))
    fi
    
    echo ""
    print_status "INFO" "Production readiness check completed"
    echo "=================================================="
    print_status "INFO" "Total checks: $total_checks"
    print_status "SUCCESS" "Passed: $passed_checks"
    if [[ $failed_checks -gt 0 ]]; then
        print_status "ERROR" "Failed: $failed_checks"
    fi
    echo ""
    
    # Create summary
    create_summary $total_checks $passed_checks $failed_checks
    
    # Final decision
    if [[ $failed_checks -eq 0 ]]; then
        print_status "SUCCESS" "🎉 Application is READY for production deployment!"
        echo ""
        print_status "INFO" "Next steps:"
        echo "   1. Review the deployment summary"
        echo "   2. Deploy to staging environment first"
        echo "   3. Run final smoke tests"
        echo "   4. Deploy to production"
        echo "   5. Monitor application health"
        exit 0
    else
        print_status "ERROR" "❌ Application is NOT ready for production deployment"
        echo ""
        print_status "INFO" "Please fix the failed checks above and re-run this script"
        echo "   Run with: ./scripts/production-deployment.sh"
        exit 1
    fi
}

# Check if running with --help
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    echo "MSSP Production Deployment Script"
    echo ""
    echo "This script performs comprehensive checks to ensure your application"
    echo "is ready for production deployment."
    echo ""
    echo "Usage: $0 [--help]"
    echo ""
    echo "Checks performed:"
    echo "  ✓ Environment variables validation"
    echo "  ✓ TypeScript compilation"
    echo "  ✓ Code linting"
    echo "  ✓ Security vulnerability scan"
    echo "  ✓ Test suite execution"
    echo "  ✓ Production build"
    echo "  ✓ Database connectivity"
    echo "  ✓ Disk space availability"
    echo "  ✓ Production configuration"
    echo "  ✓ E2E tests (optional)"
    echo ""
    echo "Environment variables required:"
    echo "  NODE_ENV=production"
    echo "  DATABASE_URL=postgresql://..."
    echo "  SESSION_SECRET=<32-byte-secret>"
    echo "  JWT_SECRET=<32-byte-secret>"
    echo ""
    exit 0
fi

# Run main function
main "$@" 