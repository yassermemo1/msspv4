#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const BASE_URL = 'http://localhost:5001';
const COOKIE_FILE = 'test-cookies.txt';

// Test credentials
const testCredentials = {
  email: 'manager@mssp.local',
  password: 'SecureTestPass123!'
};

async function login() {
  try {
    console.log('🔐 Logging in...');
    const loginCmd = `curl -s -c ${COOKIE_FILE} -X POST ${BASE_URL}/api/login -H "Content-Type: application/json" -d '${JSON.stringify(testCredentials)}'`;
    const { stdout } = await execAsync(loginCmd);
    
    const response = JSON.parse(stdout);
    if (response && response.email) {
      console.log('✅ Login successful');
      console.log(`   👤 Logged in as: ${response.email} (${response.role})`);
      return true;
    } else {
      console.error('❌ Login failed - no user data received');
      return false;
    }
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return false;
  }
}

async function testEndpoint(method, endpoint, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`   ${method.toUpperCase()} ${endpoint}`);
    
    const cmd = `curl -s -b ${COOKIE_FILE} -X ${method.toUpperCase()} ${BASE_URL}${endpoint}`;
    const { stdout, stderr } = await execAsync(cmd);
    
    if (stderr) {
      throw new Error(stderr);
    }
    
    const response = JSON.parse(stdout);
    
    // Check if it's an error response
    if (response.error || response.message === 'Authentication required') {
      console.log(`❌ Failed: ${response.error || response.message}`);
      return { success: false, error: response };
    }
    
    console.log(`✅ Success`);
    
    // Log sample of response data
    if (Array.isArray(response)) {
      console.log(`   📊 Returned ${response.length} items`);
      if (response.length > 0) {
        console.log(`   📋 Sample keys:`, Object.keys(response[0]));
      }
    } else if (typeof response === 'object') {
      console.log(`   📋 Response keys:`, Object.keys(response));
      if (response.status || response.message) {
        console.log(`   📋 Status/Message:`, response.status || response.message);
      }
    }
    
    return { success: true, data: response };
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runBusinessLogicTests() {
  console.log('🚀 Starting Business Logic API Tests');
  console.log('=====================================');
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test endpoints
  const tests = [
    // Health Check
    { method: 'GET', endpoint: '/api/business-logic/health', description: 'Business Logic Health Check' },
    
    // Contract Lifecycle Management
    { method: 'GET', endpoint: '/api/contracts/lifecycle/events', description: 'Get Upcoming Contract Events' },
    { method: 'GET', endpoint: '/api/contracts/1/performance', description: 'Get Contract Performance Metrics' },
    { method: 'GET', endpoint: '/api/contracts/1/renewal-recommendation', description: 'Get Contract Renewal Recommendation' },
    { method: 'GET', endpoint: '/api/contracts/1/health-score', description: 'Get Contract Health Score' },
    { method: 'GET', endpoint: '/api/contracts/1/termination-analysis', description: 'Get Contract Termination Analysis' },
    
    // Financial Intelligence
    { method: 'GET', endpoint: '/api/financial/revenue-analytics', description: 'Get Revenue Analytics' },
    { method: 'GET', endpoint: '/api/financial/cash-flow-forecast', description: 'Get Cash Flow Forecast' },
    { method: 'GET', endpoint: '/api/financial/client-profitability', description: 'Get Client Profitability Analysis' },
    { method: 'GET', endpoint: '/api/financial/service-performance', description: 'Get Service Performance Analysis' },
    { method: 'GET', endpoint: '/api/financial/alerts', description: 'Get Financial Alerts' },
    { method: 'GET', endpoint: '/api/financial/executive-summary', description: 'Get Executive Summary' },
    
    // Business Intelligence Dashboard
    { method: 'GET', endpoint: '/api/dashboard/business-intelligence', description: 'Get Business Intelligence Dashboard' }
  ];
  
  // Run all tests
  for (const test of tests) {
    const result = await testEndpoint(test.method, test.endpoint, test.description);
    results.total++;
    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }
    results.tests.push({
      ...test,
      success: result.success,
      error: result.error
    });
  }
  
  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.tests.filter(t => !t.success).forEach(test => {
      console.log(`   • ${test.description} (${test.method} ${test.endpoint})`);
      if (test.error) {
        console.log(`     Error: ${JSON.stringify(test.error)}`);
      }
    });
  }
  
  // Cleanup
  try {
    await execAsync(`rm -f ${COOKIE_FILE}`);
  } catch (e) {
    // Ignore cleanup errors
  }
  
  console.log('\n🎉 Business Logic API Testing Complete!');
  return results;
}

// Run the tests
runBusinessLogicTests().catch(console.error); 