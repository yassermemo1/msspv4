#!/usr/bin/env node

const fetch = require('node-fetch');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
let sessionCookie = '';

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
      ...headers
    }
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const responseData = await response.text();
    
    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = responseData;
    }

    return {
      status: response.status,
      data: parsedData,
      headers: response.headers
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      data: null
    };
  }
}

// Helper function to make form data requests
async function makeFormRequest(method, endpoint, formData) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': sessionCookie
    },
    body: formData
  };

  try {
    const response = await fetch(url, options);
    const responseData = await response.text();
    
    // Extract cookies from response
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      sessionCookie = setCookieHeader.split(';')[0];
      console.log('🍪 Session cookie updated:', sessionCookie);
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = responseData;
    }

    console.log(`📡 ${method} ${endpoint} - Status: ${response.status}`);
    if (response.status !== 200) {
      console.log('📄 Response data:', parsedData);
    }

    return {
      status: response.status,
      data: parsedData,
      headers: response.headers
    };
  } catch (error) {
    console.log('❌ Request error:', error.message);
    return {
      status: 0,
      error: error.message,
      data: null
    };
  }
}

// Test a single endpoint
async function testEndpoint(method, endpoint, expectedStatus, data = null, description = '') {
  console.log(`Testing ${method} ${endpoint} - ${description}`);
  
  const result = await makeRequest(method, endpoint, data);
  const success = result.status === expectedStatus;
  
  if (success) {
    testResults.passed++;
    console.log(`✅ PASS: ${method} ${endpoint} (${result.status})`);
  } else {
    testResults.failed++;
    const error = `❌ FAIL: ${method} ${endpoint} - Expected ${expectedStatus}, got ${result.status}`;
    console.log(error);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.data && typeof result.data === 'object') {
      console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
    }
    testResults.errors.push({
      endpoint: `${method} ${endpoint}`,
      expected: expectedStatus,
      actual: result.status,
      error: result.error,
      data: result.data
    });
  }
  
  testResults.details.push({
    method,
    endpoint,
    expectedStatus,
    actualStatus: result.status,
    success,
    description,
    data: result.data
  });
  
  return result;
}

// Login function
async function login() {
  console.log('🔐 Attempting to login...');
  
  // Try with the test credentials from server output (latest password)
  const result = await makeFormRequest('POST', '/api/login', 'email=admin@test.mssp.local&password=p#BOm52PQSRHTA03');
  
  if (result.status === 200) {
    console.log('✅ Login successful');
    return true;
  } else {
    console.log('❌ Login failed:', result.status, result.data);
    // Try with the local admin credentials as fallback
    console.log('🔄 Trying with local admin credentials...');
    const fallbackResult = await makeFormRequest('POST', '/api/login', 'email=admin@mssp.local&password=snoL^!p#9HF7vl2T');
    
    if (fallbackResult.status === 200) {
      console.log('✅ Login successful with fallback credentials');
      return true;
    } else {
      console.log('❌ Fallback login also failed:', fallbackResult.status, fallbackResult.data);
      
      // Try with the original admin credentials
      console.log('🔄 Trying with original admin credentials...');
      const originalResult = await makeFormRequest('POST', '/api/login', 'email=admin@mssp.local&password=admin123');
      
      if (originalResult.status === 200) {
        console.log('✅ Login successful with original credentials');
        return true;
      } else {
        console.log('❌ All login attempts failed');
        console.log('Debug info - Last response:', originalResult);
        return false;
      }
    }
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting API Endpoint Tests\n');
  
  // Test health endpoint (no auth required)
  await testEndpoint('GET', '/api/health', 200, null, 'Health check');
  await testEndpoint('GET', '/api/version', 200, null, 'Version info');
  
  // Attempt login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed with authenticated tests - login failed');
    return;
  }
  
  console.log('\n📋 Testing authenticated endpoints...\n');
  
  // Test user endpoints
  await testEndpoint('GET', '/api/user', 200, null, 'Get current user');
  await testEndpoint('GET', '/api/users', 200, null, 'Get all users');
  
  // Test client endpoints
  await testEndpoint('GET', '/api/clients', 200, null, 'Get all clients');
  await testEndpoint('GET', '/api/clients/archived', 200, null, 'Get archived clients');
  
  // Test dashboard endpoints
  await testEndpoint('GET', '/api/dashboard/recent-activity', 200, null, 'Get recent activity');
  await testEndpoint('GET', '/api/dashboard/stats', 200, null, 'Get dashboard stats');
  await testEndpoint('GET', '/api/dashboard/card-data', 200, null, 'Get dashboard card data');
  
  // Test contract endpoints
  await testEndpoint('GET', '/api/contracts', 200, null, 'Get all contracts');
  
  // Test service endpoints
  await testEndpoint('GET', '/api/services', 200, null, 'Get all services');
  await testEndpoint('GET', '/api/services/categories', 200, null, 'Get service categories');
  
  // Test service scope endpoints
  await testEndpoint('GET', '/api/service-scopes', 200, null, 'Get all service scopes');
  await testEndpoint('GET', '/api/service-scopes/search', 200, null, 'Search service scopes');
  await testEndpoint('GET', '/api/service-scopes/dynamic', 200, null, 'Get dynamic service scopes');
  await testEndpoint('GET', '/api/service-scopes/variables/definitions', 200, null, 'Get variable definitions');
  await testEndpoint('GET', '/api/service-scopes/variables/stats', 200, null, 'Get variable stats');
  
  // Test license endpoints
  await testEndpoint('GET', '/api/license-pools', 200, null, 'Get license pools');
  await testEndpoint('GET', '/api/license-pools/summary', 200, null, 'Get license pool summary');
  await testEndpoint('GET', '/api/license-pools/allocations/all', 200, null, 'Get all license allocations');
  await testEndpoint('GET', '/api/individual-licenses', 200, null, 'Get individual licenses');
  
  // Test hardware endpoints
  await testEndpoint('GET', '/api/hardware-assets', 200, null, 'Get hardware assets');
  
  // Test document endpoints
  await testEndpoint('GET', '/api/documents', 200, null, 'Get documents');
  
  // Test financial endpoints
  await testEndpoint('GET', '/api/financial-transactions', 200, null, 'Get financial transactions');
  
  // Test team assignment endpoints
  await testEndpoint('GET', '/api/team-assignments', 200, null, 'Get team assignments');
  
  // Test certificate endpoints
  await testEndpoint('GET', '/api/certificates-of-compliance', 200, null, 'Get certificates of compliance');
  
  // Test field visibility endpoints
  await testEndpoint('GET', '/api/field-visibility', 200, null, 'Get field visibility configs');
  
  // Test search endpoints
  await testEndpoint('GET', '/api/search/history', 200, null, 'Get search history');
  await testEndpoint('GET', '/api/search/saved', 200, null, 'Get saved searches');
  
  // Test settings endpoints
  await testEndpoint('GET', '/api/user/settings', 200, null, 'Get user settings');
  await testEndpoint('GET', '/api/company/settings', 200, null, 'Get company settings');
  await testEndpoint('GET', '/api/user-dashboard-settings', 200, null, 'Get user dashboard settings');
  
  // Test plugin endpoints
  await testEndpoint('GET', '/api/plugins', 200, null, 'Get plugins');
  
  // Test admin endpoints (may fail if not admin)
  await testEndpoint('GET', '/api/admin/stats', 200, null, 'Get admin stats');
  await testEndpoint('GET', '/api/page-permissions', 200, null, 'Get page permissions');
  
  // Test entity relation endpoints
  await testEndpoint('GET', '/api/entity-relations/types', 200, null, 'Get entity relation types');
  
  // Test accessible pages
  await testEndpoint('GET', '/api/user/accessible-pages', 200, null, 'Get accessible pages');
  
  // Test widgets
  await testEndpoint('GET', '/api/global-widgets', 200, null, 'Get global widgets');
  await testEndpoint('GET', '/api/widgets/manage', 200, null, 'Get widget management');
  
  console.log('\n🧪 Testing POST endpoints with sample data...\n');
  
  // Test creating a client
  const clientData = {
    name: 'Test Client API',
    email: 'test@example.com',
    phone: '123-456-7890',
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    country: 'Test Country'
  };
  
  const clientResult = await testEndpoint('POST', '/api/clients', 201, clientData, 'Create new client');
  let createdClientId = null;
  if (clientResult.status === 201 && clientResult.data && clientResult.data.id) {
    createdClientId = clientResult.data.id;
    console.log(`Created client with ID: ${createdClientId}`);
  }
  
  // Test client-specific endpoints if we have a client ID
  if (createdClientId) {
    await testEndpoint('GET', `/api/clients/${createdClientId}`, 200, null, 'Get specific client');
    await testEndpoint('GET', `/api/clients/${createdClientId}/individual-licenses`, 200, null, 'Get client licenses');
    await testEndpoint('GET', `/api/clients/${createdClientId}/service-authorization-forms`, 200, null, 'Get client SAFs');
    await testEndpoint('GET', `/api/clients/${createdClientId}/certificates-of-compliance`, 200, null, 'Get client COCs');
    await testEndpoint('GET', `/api/clients/${createdClientId}/service-scopes`, 200, null, 'Get client service scopes');
    
    // Test updating the client
    const updateData = { ...clientData, name: 'Updated Test Client API' };
    await testEndpoint('PUT', `/api/clients/${createdClientId}`, 200, updateData, 'Update client');
    
    // Test archiving the client
    await testEndpoint('POST', `/api/clients/${createdClientId}/archive`, 200, null, 'Archive client');
    
    // Test restoring the client
    await testEndpoint('POST', `/api/clients/${createdClientId}/restore`, 200, null, 'Restore client');
    
    // Test deletion impact
    await testEndpoint('GET', `/api/clients/${createdClientId}/deletion-impact`, 200, null, 'Get deletion impact');
    
    // Clean up - delete the test client
    await testEndpoint('DELETE', `/api/clients/${createdClientId}`, 200, null, 'Delete test client');
  }
  
  // Test search functionality
  const searchData = {
    query: 'test',
    tables: ['clients'],
    limit: 10
  };
  await testEndpoint('POST', '/api/search/execute', 200, searchData, 'Execute search');
  
  // Test field visibility
  const fieldVisibilityData = {
    tableName: 'clients',
    fieldName: 'email',
    isVisible: false,
    context: 'form'
  };
  await testEndpoint('POST', '/api/field-visibility', 200, fieldVisibilityData, 'Set field visibility');
  
  // Test logout
  await testEndpoint('POST', '/api/logout', 200, null, 'Logout');
  
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total: ${testResults.passed + testResults.failed}`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.errors.forEach(error => {
      console.log(`  - ${error.endpoint}: Expected ${error.expected}, got ${error.actual}`);
      if (error.error) {
        console.log(`    Error: ${error.error}`);
      }
    });
  }
  
  // Save detailed results to file
  fs.writeFileSync('api-test-results.json', JSON.stringify(testResults, null, 2));
  console.log('\n📄 Detailed results saved to api-test-results.json');
}

// Run the tests
runTests().catch(console.error); 