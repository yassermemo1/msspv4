#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const TEST_RESULTS_FILE = 'api-test-results.json';

// Test credentials
const TEST_CREDENTIALS = {
  username: 'admin@mssp.local',
  password: 'admin123'
};

class APITester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      testSummary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      tests: []
    };
    this.sessionCookie = '';
    this.testData = {};
  }

  log(message, type = 'info') {
    const timestamp = new Date().toTimeString().split(' ')[0];
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.sessionCookie,
          ...headers
        },
        timeout: 10000,
        validateStatus: () => true // Accept all status codes
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        config.data = data;
      }

      if (data && method.toUpperCase() === 'GET') {
        config.params = data;
      }

      const response = await axios(config);
      
      // Update session cookie if provided
      if (response.headers['set-cookie']) {
        this.sessionCookie = response.headers['set-cookie']
          .map(cookie => cookie.split(';')[0])
          .join('; ');
      }

      return response;
    } catch (error) {
      return {
        status: 0,
        data: { error: error.message },
        statusText: 'Network Error'
      };
    }
  }

  recordTest(name, method, endpoint, status, success, error = null, responseTime = 0) {
    const test = {
      name,
      method,
      endpoint,
      status,
      success,
      error,
      responseTime,
      timestamp: new Date().toISOString()
    };

    this.results.tests.push(test);
    this.results.testSummary.total++;
    
    if (success) {
      this.results.testSummary.passed++;
      this.log(`✅ ${name} - ${method} ${endpoint} (${status})`, 'success');
    } else {
      this.results.testSummary.failed++;
      this.log(`❌ ${name} - ${method} ${endpoint} (${status}) - ${error}`, 'error');
    }
  }

  async login() {
    this.log('🔐 Logging in with admin credentials...', 'info');
    const startTime = Date.now();
    
    const response = await this.makeRequest('POST', '/api/login', TEST_CREDENTIALS);
    const responseTime = Date.now() - startTime;
    
    const success = response.status === 200 && response.data.user;
    
    this.recordTest(
      'Admin Login',
      'POST',
      '/api/login',
      response.status,
      success,
      success ? null : response.data.message || response.statusText,
      responseTime
    );

    if (success) {
      this.log(`Login successful for user: ${response.data.user.email}`, 'success');
      return true;
    } else {
      this.log(`Login failed: ${response.data.message || response.statusText}`, 'error');
      return false;
    }
  }

  async testEndpoint(name, method, endpoint, testData = null, expectedStatus = 200) {
    const startTime = Date.now();
    const response = await this.makeRequest(method, endpoint, testData);
    const responseTime = Date.now() - startTime;
    
    const success = response.status === expectedStatus;
    
    this.recordTest(
      name,
      method,
      endpoint,
      response.status,
      success,
      success ? null : response.data.message || response.data.error || response.statusText,
      responseTime
    );

    return response;
  }

  async runComprehensiveTests() {
    this.log('🚀 Starting Comprehensive API Test Suite', 'info');
    
    // Login first
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      this.log('Cannot proceed without authentication', 'error');
      return;
    }

    // Test authentication endpoints
    await this.testAuthEndpoints();
    
    // Test user management endpoints
    await this.testUserEndpoints();
    
    // Test client management endpoints
    await this.testClientEndpoints();
    
    // Test contract endpoints
    await this.testContractEndpoints();
    
    // Test service endpoints
    await this.testServiceEndpoints();
    
    // Test service scope endpoints (including the problematic dynamic one)
    await this.testServiceScopeEndpoints();
    
    // Test license pool endpoints
    await this.testLicensePoolEndpoints();
    
    // Test hardware asset endpoints
    await this.testHardwareAssetEndpoints();
    
    // Test document endpoints
    await this.testDocumentEndpoints();
    
    // Test dashboard endpoints
    await this.testDashboardEndpoints();
    
    // Test system endpoints
    await this.testSystemEndpoints();

    this.generateReport();
  }

  async testAuthEndpoints() {
    this.log('🔐 Testing Authentication Endpoints', 'info');
    
    await this.testEndpoint('Get Current User', 'GET', '/api/user');
    await this.testEndpoint('Get User Settings', 'GET', '/api/user/settings');
    await this.testEndpoint('Update User Settings', 'PUT', '/api/user/settings', {
      theme: 'dark',
      language: 'en'
    });
    await this.testEndpoint('Get 2FA Status', 'GET', '/api/user/2fa/status');
  }

  async testUserEndpoints() {
    this.log('👥 Testing User Management Endpoints', 'info');
    
    await this.testEndpoint('Get All Users', 'GET', '/api/users');
    await this.testEndpoint('Update User Profile', 'PUT', '/api/user/profile', {
      firstName: 'Admin',
      lastName: 'User Test'
    });
  }

  async testClientEndpoints() {
    this.log('🏢 Testing Client Management Endpoints', 'info');
    
    const clientsResponse = await this.testEndpoint('Get All Clients', 'GET', '/api/clients');
    
    // Create a test client
    const newClient = {
      name: 'Test Client API',
      type: 'enterprise',
      status: 'active',
      contactEmail: 'test@testclient.com',
      contactPhone: '+1234567890',
      address: '123 Test Street',
      city: 'Test City',
      country: 'Test Country'
    };
    
    const createResponse = await this.testEndpoint('Create Client', 'POST', '/api/clients', newClient, 201);
    
    if (createResponse.data && createResponse.data.id) {
      const clientId = createResponse.data.id;
      this.testData.clientId = clientId;
      
      await this.testEndpoint('Get Client by ID', 'GET', `/api/clients/${clientId}`);
      
      await this.testEndpoint('Update Client', 'PUT', `/api/clients/${clientId}`, {
        name: 'Updated Test Client API'
      });
      
      await this.testEndpoint('Get Client Service Scopes', 'GET', `/api/clients/${clientId}/service-scopes`);
      await this.testEndpoint('Get Client Individual Licenses', 'GET', `/api/clients/${clientId}/individual-licenses`);
      await this.testEndpoint('Get Client SAFs', 'GET', `/api/clients/${clientId}/service-authorization-forms`);
      await this.testEndpoint('Get Client COCs', 'GET', `/api/clients/${clientId}/certificates-of-compliance`);
    }
    
    await this.testEndpoint('Get Archived Clients', 'GET', '/api/clients/archived');
  }

  async testContractEndpoints() {
    this.log('📄 Testing Contract Management Endpoints', 'info');
    
    await this.testEndpoint('Get All Contracts', 'GET', '/api/contracts');
    
    if (this.testData.clientId) {
      const newContract = {
        clientId: this.testData.clientId,
        name: 'Test Contract API',
        type: 'managed_service',
        status: 'active',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        totalValue: 50000
      };
      
      const createResponse = await this.testEndpoint('Create Contract', 'POST', '/api/contracts', newContract, 201);
      
      if (createResponse.data && createResponse.data.id) {
        const contractId = createResponse.data.id;
        this.testData.contractId = contractId;
        
        await this.testEndpoint('Get Contract by ID', 'GET', `/api/contracts/${contractId}`);
        
        await this.testEndpoint('Update Contract', 'PUT', `/api/contracts/${contractId}`, {
          name: 'Updated Test Contract API'
        });
      }
    }
  }

  async testServiceEndpoints() {
    this.log('🔧 Testing Service Management Endpoints', 'info');
    
    const servicesResponse = await this.testEndpoint('Get All Services', 'GET', '/api/services');
    
    await this.testEndpoint('Get Service Categories', 'GET', '/api/services/categories');
    
    const newService = {
      name: 'Test Service API',
      category: 'security',
      deliveryModel: 'managed',
      description: 'Test service for API testing',
      basePrice: 1000
    };
    
    const createResponse = await this.testEndpoint('Create Service', 'POST', '/api/services', newService, 201);
    
    if (createResponse.data && createResponse.data.id) {
      const serviceId = createResponse.data.id;
      this.testData.serviceId = serviceId;
      
      await this.testEndpoint('Get Service by ID', 'GET', `/api/services/${serviceId}`);
      
      await this.testEndpoint('Update Service', 'PUT', `/api/services/${serviceId}`, {
        name: 'Updated Test Service API'
      });
      
      await this.testEndpoint('Patch Service', 'PATCH', `/api/services/${serviceId}`, {
        description: 'Updated description via PATCH'
      });
      
      await this.testEndpoint('Get Service Scope Template', 'GET', `/api/services/${serviceId}/scope-template`);
      
      await this.testEndpoint('Update Service Scope Template', 'PUT', `/api/services/${serviceId}/scope-template`, {
        template: { fields: ['test_field'] }
      });
    }
  }

  async testServiceScopeEndpoints() {
    this.log('🎯 Testing Service Scope Endpoints (Including Dynamic)', 'info');
    
    await this.testEndpoint('Get All Service Scopes', 'GET', '/api/service-scopes');
    
    // Test the problematic dynamic endpoint with various parameters
    await this.testEndpoint('Dynamic Service Scopes (No Filters)', 'GET', '/api/service-scopes/dynamic');
    
    await this.testEndpoint('Dynamic Service Scopes (With Pagination)', 'GET', '/api/service-scopes/dynamic', {
      page: 1,
      limit: 10
    });
    
    await this.testEndpoint('Dynamic Service Scopes (With Sorting)', 'GET', '/api/service-scopes/dynamic', {
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
    
    await this.testEndpoint('Dynamic Service Scopes (With Filters)', 'GET', '/api/service-scopes/dynamic', {
      status: 'active',
      page: 1,
      limit: 5
    });
    
    await this.testEndpoint('Get Service Scope Variables', 'GET', '/api/service-scopes/variables/definitions');
    await this.testEndpoint('Get Variable Stats', 'GET', '/api/service-scopes/variables/stats');
    await this.testEndpoint('Discover Variables', 'GET', '/api/service-scopes/variables/discover');
    
    await this.testEndpoint('Search Service Scopes', 'GET', '/api/service-scopes/search', {
      q: 'test'
    });
    
    // Create a service scope if we have contract and service data
    if (this.testData.contractId && this.testData.serviceId) {
      const newScope = {
        serviceId: this.testData.serviceId,
        description: 'Test scope for API testing',
        deliverables: ['Test deliverable 1', 'Test deliverable 2'],
        monthlyValue: 5000,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        status: 'active'
      };
      
      const createResponse = await this.testEndpoint(
        'Create Service Scope', 
        'POST', 
        `/api/contracts/${this.testData.contractId}/service-scopes`, 
        newScope, 
        201
      );
      
      if (createResponse.data && createResponse.data.id) {
        const scopeId = createResponse.data.id;
        this.testData.scopeId = scopeId;
        
        await this.testEndpoint('Get Service Scope by ID', 'GET', `/api/service-scopes/${scopeId}`);
        
        await this.testEndpoint(
          'Update Service Scope', 
          'PUT', 
          `/api/contracts/${this.testData.contractId}/service-scopes/${scopeId}`, 
          {
            description: 'Updated test scope'
          }
        );
        
        // Test adding scope variables
        await this.testEndpoint(
          'Add Scope Variable', 
          'POST', 
          `/api/service-scopes/${scopeId}/variables`, 
          {
            variableName: 'test_variable',
            value: 'test_value',
            type: 'text'
          }
        );
      }
    }
  }

  async testLicensePoolEndpoints() {
    this.log('🔑 Testing License Pool Endpoints', 'info');
    
    await this.testEndpoint('Get All License Pools', 'GET', '/api/license-pools');
    
    const newLicensePool = {
      name: 'Test License Pool API',
      vendor: 'Test Vendor',
      productName: 'Test Product',
      licenseType: 'user',
      totalLicenses: 100,
      availableLicenses: 100,
      costPerLicense: 50,
      renewalDate: '2024-12-31'
    };
    
    const createResponse = await this.testEndpoint('Create License Pool', 'POST', '/api/license-pools', newLicensePool, 201);
    
    if (createResponse.data && createResponse.data.id) {
      const poolId = createResponse.data.id;
      
      await this.testEndpoint('Update License Pool', 'PUT', `/api/license-pools/${poolId}`, {
        name: 'Updated Test License Pool API'
      });
      
      await this.testEndpoint('Get License Pool Allocations', 'GET', `/api/license-pools/${poolId}/allocations`);
    }
  }

  async testHardwareAssetEndpoints() {
    this.log('💻 Testing Hardware Asset Endpoints', 'info');
    
    await this.testEndpoint('Get All Hardware Assets', 'GET', '/api/hardware-assets');
    
    const newAsset = {
      name: 'Test Server API',
      type: 'server',
      model: 'Test Model X1',
      serialNumber: 'TEST123456',
      status: 'active',
      purchaseDate: '2024-01-01',
      warrantyExpiry: '2027-01-01'
    };
    
    const createResponse = await this.testEndpoint('Create Hardware Asset', 'POST', '/api/hardware-assets', newAsset, 201);
    
    if (createResponse.data && createResponse.data.id) {
      const assetId = createResponse.data.id;
      
      await this.testEndpoint('Get Hardware Asset by ID', 'GET', `/api/hardware-assets/${assetId}`);
      
      await this.testEndpoint('Update Hardware Asset', 'PUT', `/api/hardware-assets/${assetId}`, {
        name: 'Updated Test Server API'
      });
    }
  }

  async testDocumentEndpoints() {
    this.log('📁 Testing Document Endpoints', 'info');
    
    await this.testEndpoint('Get All Documents', 'GET', '/api/documents');
    
    // Note: File upload testing would require multipart/form-data
    // For now, just test the read endpoints
  }

  async testDashboardEndpoints() {
    this.log('📊 Testing Dashboard Endpoints', 'info');
    
    await this.testEndpoint('Get Dashboard Widgets', 'GET', '/api/dashboard/widgets');
    await this.testEndpoint('Get Recent Activity', 'GET', '/api/dashboard/recent-activity');
    await this.testEndpoint('Get User Dashboards', 'GET', '/api/dashboards');
    
    const newDashboard = {
      name: 'Test Dashboard API',
      description: 'Test dashboard for API testing',
      layout: 'grid',
      isDefault: false,
      isPublic: false
    };
    
    const createResponse = await this.testEndpoint('Create Dashboard', 'POST', '/api/dashboards', newDashboard, 201);
    
    if (createResponse.data && createResponse.data.id) {
      const dashboardId = createResponse.data.id;
      
      await this.testEndpoint('Update Dashboard', 'PUT', `/api/dashboards/${dashboardId}`, {
        name: 'Updated Test Dashboard API'
      });
    }
  }

  async testSystemEndpoints() {
    this.log('⚙️ Testing System Endpoints', 'info');
    
    await this.testEndpoint('Health Check', 'GET', '/api/health');
    await this.testEndpoint('Version Info', 'GET', '/api/version');
    await this.testEndpoint('Get Field Visibility', 'GET', '/api/field-visibility');
    await this.testEndpoint('Get Entity Relations', 'GET', '/api/entity-relations/types');
  }

  generateReport() {
    // Save detailed results to file
    fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(this.results, null, 2));
    
    // Print summary
    this.log('\n' + '='.repeat(80), 'info');
    this.log('📊 API TEST SUMMARY', 'info');
    this.log('='.repeat(80), 'info');
    
    const { total, passed, failed, skipped } = this.results.testSummary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    
    this.log(`Total Tests: ${total}`, 'info');
    this.log(`Passed: ${passed}`, 'success');
    this.log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');
    this.log(`Skipped: ${skipped}`, 'warning');
    this.log(`Pass Rate: ${passRate}%`, passRate > 80 ? 'success' : 'warning');
    
    this.log('\n📋 FAILED TESTS:', 'error');
    const failedTests = this.results.tests.filter(test => !test.success);
    
    if (failedTests.length === 0) {
      this.log('🎉 All tests passed!', 'success');
    } else {
      failedTests.forEach(test => {
        this.log(`❌ ${test.name} - ${test.method} ${test.endpoint} (${test.status}) - ${test.error}`, 'error');
      });
    }
    
    this.log(`\n📄 Detailed results saved to: ${TEST_RESULTS_FILE}`, 'info');
    this.log('='.repeat(80), 'info');
  }

  async cleanup() {
    // Clean up test data
    if (this.testData.scopeId && this.testData.contractId) {
      await this.testEndpoint(
        'Delete Test Service Scope', 
        'DELETE', 
        `/api/contracts/${this.testData.contractId}/service-scopes/${this.testData.scopeId}`
      );
    }
    
    if (this.testData.serviceId) {
      await this.testEndpoint('Delete Test Service', 'DELETE', `/api/services/${this.testData.serviceId}`);
    }
    
    if (this.testData.clientId) {
      await this.testEndpoint('Delete Test Client', 'DELETE', `/api/clients/${this.testData.clientId}`);
    }
    
    // Logout
    await this.testEndpoint('Logout', 'POST', '/api/logout');
  }
}

// Run the test suite
async function main() {
  const tester = new APITester();
  
  try {
    await tester.runComprehensiveTests();
    await tester.cleanup();
  } catch (error) {
    tester.log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = APITester; 