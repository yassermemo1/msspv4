const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const TEST_PASSWORD = 'admin123';

// Test credentials
const TEST_CREDENTIALS = {
  admin: { username: 'admin@mssp.local', password: TEST_PASSWORD },
  manager: { username: 'manager@test.mssp.local', password: TEST_PASSWORD },
  engineer: { username: 'engineer@test.mssp.local', password: TEST_PASSWORD },
  user: { username: 'user@test.mssp.local', password: TEST_PASSWORD }
};

let sessionCookie = '';
let testResults = [];

// API Endpoints to test
const API_ENDPOINTS = {
  // Authentication endpoints
  auth: [
    { method: 'POST', path: '/api/login', requiresAuth: false },
    { method: 'POST', path: '/api/logout', requiresAuth: true },
    { method: 'GET', path: '/api/user', requiresAuth: true },
    { method: 'GET', path: '/api/test-cookie', requiresAuth: false }
  ],

  // Health & version endpoints
  system: [
    { method: 'GET', path: '/api/health', requiresAuth: false },
    { method: 'GET', path: '/api/version', requiresAuth: false }
  ],

  // Client management endpoints
  clients: [
    { method: 'GET', path: '/api/clients', requiresAuth: true },
    { method: 'GET', path: '/api/clients/archived', requiresAuth: true },
    { method: 'POST', path: '/api/clients', requiresAuth: true, requiresManager: true },
    { method: 'GET', path: '/api/clients/1', requiresAuth: true },
    { method: 'PUT', path: '/api/clients/1', requiresAuth: true, requiresManager: true },
    { method: 'DELETE', path: '/api/clients/1', requiresAuth: true, requiresManager: true },
    { method: 'POST', path: '/api/clients/1/archive', requiresAuth: true, requiresManager: true },
    { method: 'POST', path: '/api/clients/1/restore', requiresAuth: true, requiresManager: true },
    { method: 'GET', path: '/api/clients/1/deletion-impact', requiresAuth: true, requiresManager: true }
  ],

  // Contract management endpoints
  contracts: [
    { method: 'GET', path: '/api/contracts', requiresAuth: true },
    { method: 'GET', path: '/api/contracts/1', requiresAuth: true },
    { method: 'POST', path: '/api/contracts', requiresAuth: true, requiresManager: true },
    { method: 'PUT', path: '/api/contracts/1', requiresAuth: true, requiresManager: true }
  ],

  // Service management endpoints
  services: [
    { method: 'GET', path: '/api/services', requiresAuth: true },
    { method: 'GET', path: '/api/services/1', requiresAuth: true },
    { method: 'POST', path: '/api/services', requiresAuth: true, requiresManager: true },
    { method: 'PUT', path: '/api/services/1', requiresAuth: true, requiresManager: true },
    { method: 'DELETE', path: '/api/services/1', requiresAuth: true, requiresManager: true },
    { method: 'GET', path: '/api/services/categories', requiresAuth: true }
  ],

  // Service scopes endpoints - Including the problematic dynamic endpoint
  serviceScopes: [
    { method: 'GET', path: '/api/service-scopes', requiresAuth: true },
    { method: 'GET', path: '/api/service-scopes/search', requiresAuth: true },
    { method: 'GET', path: '/api/service-scopes/dynamic', requiresAuth: true }, // PROBLEMATIC ENDPOINT
    { method: 'GET', path: '/api/service-scopes/variables/definitions', requiresAuth: true },
    { method: 'GET', path: '/api/service-scopes/variables/stats', requiresAuth: true },
    { method: 'GET', path: '/api/service-scopes/variables/discover', requiresAuth: true, requiresManager: true },
    { method: 'GET', path: '/api/service-scopes/1', requiresAuth: true },
    { method: 'POST', path: '/api/contracts/1/service-scopes', requiresAuth: true, requiresManager: true },
    { method: 'PUT', path: '/api/contracts/1/service-scopes/1', requiresAuth: true, requiresManager: true },
    { method: 'DELETE', path: '/api/contracts/1/service-scopes/1', requiresAuth: true, requiresManager: true },
    { method: 'DELETE', path: '/api/service-scopes/1', requiresAuth: true, requiresManager: true },
    { method: 'POST', path: '/api/service-scopes/1/variables', requiresAuth: true, requiresManager: true }
  ],

  // Hardware assets endpoints
  hardwareAssets: [
    { method: 'GET', path: '/api/hardware-assets', requiresAuth: true },
    { method: 'GET', path: '/api/hardware-assets/1', requiresAuth: true },
    { method: 'POST', path: '/api/hardware-assets', requiresAuth: true, requiresManager: true },
    { method: 'PUT', path: '/api/hardware-assets/1', requiresAuth: true, requiresManager: true },
    { method: 'DELETE', path: '/api/hardware-assets/1', requiresAuth: true, requiresManager: true }
  ],

  // License pools endpoints
  licensePools: [
    { method: 'GET', path: '/api/license-pools', requiresAuth: true },
    { method: 'GET', path: '/api/license-pools/summary', requiresAuth: true },
    { method: 'GET', path: '/api/license-pools/allocations/all', requiresAuth: true }
  ],

  // Individual licenses endpoints
  individualLicenses: [
    { method: 'GET', path: '/api/individual-licenses', requiresAuth: true },
    { method: 'POST', path: '/api/individual-licenses', requiresAuth: true, requiresManager: true }
  ],

  // Documents endpoints
  documents: [
    { method: 'GET', path: '/api/documents', requiresAuth: true },
    { method: 'GET', path: '/api/documents/1', requiresAuth: true },
    { method: 'PUT', path: '/api/documents/1', requiresAuth: true },
    { method: 'DELETE', path: '/api/documents/1', requiresAuth: true }
  ],

  // Certificates of compliance endpoints
  certificatesOfCompliance: [
    { method: 'GET', path: '/api/certificates-of-compliance', requiresAuth: true },
    { method: 'POST', path: '/api/certificates-of-compliance', requiresAuth: true, requiresManager: true },
    { method: 'GET', path: '/api/certificates-of-compliance/1', requiresAuth: true },
    { method: 'PUT', path: '/api/certificates-of-compliance/1', requiresAuth: true, requiresManager: true },
    { method: 'DELETE', path: '/api/certificates-of-compliance/1', requiresAuth: true, requiresManager: true }
  ],

  // Dashboard endpoints
  dashboard: [
    { method: 'GET', path: '/api/dashboard/recent-activity', requiresAuth: true },
    { method: 'GET', path: '/api/dashboard/stats', requiresAuth: true },
    { method: 'GET', path: '/api/dashboard/card-data', requiresAuth: true },
    { method: 'GET', path: '/api/dashboards', requiresAuth: true },
    { method: 'POST', path: '/api/dashboards', requiresAuth: true },
    { method: 'GET', path: '/api/dashboards/1', requiresAuth: true },
    { method: 'PUT', path: '/api/dashboards/1', requiresAuth: true },
    { method: 'DELETE', path: '/api/dashboards/1', requiresAuth: true }
  ],

  // Search endpoints
  search: [
    { method: 'POST', path: '/api/search/execute', requiresAuth: true },
    { method: 'GET', path: '/api/search/history', requiresAuth: true },
    { method: 'GET', path: '/api/search/saved', requiresAuth: true },
    { method: 'POST', path: '/api/search/save', requiresAuth: true },
    { method: 'POST', path: '/api/search/log', requiresAuth: true }
  ],

  // User management endpoints
  users: [
    { method: 'GET', path: '/api/users', requiresAuth: true },
    { method: 'GET', path: '/api/users/1', requiresAuth: true },
    { method: 'GET', path: '/api/user/accessible-pages', requiresAuth: true },
    { method: 'PUT', path: '/api/user/profile', requiresAuth: true },
    { method: 'GET', path: '/api/user/settings', requiresAuth: true },
    { method: 'PUT', path: '/api/user/settings', requiresAuth: true }
  ],

  // Field visibility endpoints
  fieldVisibility: [
    { method: 'GET', path: '/api/field-visibility', requiresAuth: true },
    { method: 'POST', path: '/api/field-visibility', requiresAuth: true },
    { method: 'GET', path: '/api/field-visibility/clients', requiresAuth: true },
    { method: 'DELETE', path: '/api/field-visibility/clients/name', requiresAuth: true }
  ],

  // Page permissions endpoints
  pagePermissions: [
    { method: 'GET', path: '/api/page-permissions', requiresAuth: true, requiresAdmin: true }
  ]
};

// Sample data for POST/PUT requests
const TEST_DATA = {
  client: {
    name: 'Test Client',
    contactEmail: 'test@client.com',
    address: '123 Test St',
    phone: '+1234567890',
    primaryContactName: 'Test Contact'
  },
  contract: {
    clientId: 1,
    contractNumber: 'TEST-001',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    totalValue: 10000,
    status: 'active'
  },
  service: {
    name: 'Test Service',
    category: 'security',
    description: 'Test service description',
    isActive: true
  },
  hardwareAsset: {
    assetTag: 'TEST-001',
    serialNumber: 'SN123456',
    category: 'server',
    manufacturer: 'Test Manufacturer',
    model: 'Test Model',
    status: 'active'
  },
  serviceScope: {
    serviceId: 1,
    description: 'Test service scope',
    deliverables: ['Test deliverable'],
    monthlyValue: 1000,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'active'
  },
  dashboard: {
    name: 'Test Dashboard',
    description: 'Test dashboard description',
    layout: {},
    isDefault: false,
    isPublic: false
  },
  individualLicense: {
    clientId: 1,
    softwareName: 'Test Software',
    licenseKey: 'TEST-LICENSE-KEY',
    purchaseDate: '2024-01-01',
    expiryDate: '2024-12-31',
    cost: 100
  },
  certificateOfCompliance: {
    clientId: 1,
    cocNumber: 'COC-TEST-001',
    standard: 'ISO 27001',
    issueDate: '2024-01-01',
    expiryDate: '2024-12-31',
    status: 'active'
  },
  search: {
    query: 'test',
    entityTypes: ['clients', 'contracts'],
    filters: {}
  },
  userSettings: {
    theme: 'dark',
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      push: false
    }
  },
  fieldVisibility: {
    tableName: 'clients',
    fieldName: 'testField',
    isVisible: true,
    userRole: 'admin'
  }
};

// Helper function to make API requests
async function makeRequest(method, path, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${path}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (sessionCookie) {
      config.headers.Cookie = sessionCookie;
    }

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data,
      headers: response.headers
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.response?.data || error.message,
      headers: error.response?.headers || {}
    };
  }
}

// Login function
async function login(credentials) {
  console.log(`🔐 Logging in as ${credentials.username}...`);
  
  const result = await makeRequest('POST', '/api/login', credentials);
  
  if (result.success) {
    // Extract session cookie
    const setCookieHeader = result.headers['set-cookie'];
    if (setCookieHeader) {
      sessionCookie = setCookieHeader.find(cookie => cookie.startsWith('session='));
      if (sessionCookie) {
        sessionCookie = sessionCookie.split(';')[0]; // Remove additional cookie attributes
      }
    }
    console.log('✅ Login successful');
    return true;
  } else {
    console.log('❌ Login failed:', result.error);
    return false;
  }
}

// Test a single endpoint
async function testEndpoint(category, endpoint) {
  const { method, path, requiresAuth, requiresManager, requiresAdmin } = endpoint;
  
  console.log(`\n🧪 Testing ${method} ${path}`);
  
  // Skip if requires authentication but we're not logged in
  if (requiresAuth && !sessionCookie) {
    console.log('⏭️  Skipped - requires authentication');
    return { category, method, path, status: 'SKIPPED', reason: 'No authentication' };
  }

  // Get appropriate test data
  let testData = null;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    if (path.includes('client')) testData = TEST_DATA.client;
    else if (path.includes('contract')) testData = TEST_DATA.contract;
    else if (path.includes('service') && !path.includes('scope')) testData = TEST_DATA.service;
    else if (path.includes('service-scope')) testData = TEST_DATA.serviceScope;
    else if (path.includes('hardware-asset')) testData = TEST_DATA.hardwareAsset;
    else if (path.includes('dashboard')) testData = TEST_DATA.dashboard;
    else if (path.includes('individual-license')) testData = TEST_DATA.individualLicense;
    else if (path.includes('certificate')) testData = TEST_DATA.certificateOfCompliance;
    else if (path.includes('search')) testData = TEST_DATA.search;
    else if (path.includes('settings')) testData = TEST_DATA.userSettings;
    else if (path.includes('field-visibility')) testData = TEST_DATA.fieldVisibility;
  }

  const result = await makeRequest(method, path, testData);
  
  let status = 'PASS';
  let details = '';
  
  if (!result.success) {
    status = 'FAIL';
    details = `Status: ${result.status}, Error: ${JSON.stringify(result.error)}`;
    
    // Special handling for the problematic dynamic endpoint
    if (path === '/api/service-scopes/dynamic' && result.error?.message?.includes('parameter $2')) {
      console.log('🚨 FOUND THE PROBLEMATIC ENDPOINT! Parameter issue detected.');
      details += ' [IDENTIFIED PARAMETER ISSUE]';
    }
  } else {
    details = `Status: ${result.status}`;
  }
  
  console.log(`${status === 'PASS' ? '✅' : '❌'} ${status}: ${details}`);
  
  return {
    category,
    method,
    path,
    status,
    details,
    responseTime: Date.now()
  };
}

// Test all endpoints in a category
async function testCategory(categoryName, endpoints) {
  console.log(`\n\n📂 Testing ${categoryName.toUpperCase()} endpoints...`);
  console.log('='.repeat(50));
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(categoryName, endpoint);
    results.push(result);
    testResults.push(result);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// Generate summary report
function generateReport() {
  console.log('\n\n📊 TEST SUMMARY REPORT');
  console.log('='.repeat(60));
  
  const summary = {
    total: testResults.length,
    passed: testResults.filter(r => r.status === 'PASS').length,
    failed: testResults.filter(r => r.status === 'FAIL').length,
    skipped: testResults.filter(r => r.status === 'SKIPPED').length
  };
  
  console.log(`Total Tests: ${summary.total}`);
  console.log(`✅ Passed: ${summary.passed}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`⏭️  Skipped: ${summary.skipped}`);
  console.log(`Success Rate: ${((summary.passed / (summary.total - summary.skipped)) * 100).toFixed(1)}%`);
  
  // Show failed tests
  const failedTests = testResults.filter(r => r.status === 'FAIL');
  if (failedTests.length > 0) {
    console.log('\n🚨 FAILED TESTS:');
    console.log('-'.repeat(40));
    failedTests.forEach(test => {
      console.log(`❌ ${test.method} ${test.path}`);
      console.log(`   ${test.details}`);
    });
  }

  // Show problematic dynamic endpoint specifically
  const dynamicEndpointTest = testResults.find(r => r.path === '/api/service-scopes/dynamic');
  if (dynamicEndpointTest && dynamicEndpointTest.status === 'FAIL') {
    console.log('\n🎯 PROBLEMATIC ENDPOINT IDENTIFIED:');
    console.log('-'.repeat(40));
    console.log(`${dynamicEndpointTest.method} ${dynamicEndpointTest.path}`);
    console.log(`Details: ${dynamicEndpointTest.details}`);
  }
  
  // Save detailed report to file
  const reportData = {
    timestamp: new Date().toISOString(),
    summary,
    testResults,
    problematicEndpoint: dynamicEndpointTest
  };
  
  fs.writeFileSync('api-test-results.json', JSON.stringify(reportData, null, 2));
  console.log('\n📁 Detailed results saved to: api-test-results.json');
}

// Main test execution
async function runAllTests() {
  console.log('🚀 Starting Comprehensive API Testing...');
  console.log('Using admin123 password for all test accounts');
  console.log('='.repeat(60));
  
  // Login as admin first
  const loginSuccess = await login(TEST_CREDENTIALS.admin);
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  
  // Test all categories
  for (const [categoryName, endpoints] of Object.entries(API_ENDPOINTS)) {
    await testCategory(categoryName, endpoints);
  }
  
  // Generate final report
  generateReport();
  
  console.log('\n🏁 Testing completed!');
}

// Run the tests
runAllTests().catch(console.error); 