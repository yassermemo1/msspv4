#!/usr/bin/env node

const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const BASE_URL = 'http://localhost:5001';
const TEST_USER = {
  email: 'manager@mssp.local',
  password: 'SecureTestPass123!'
};

class BusinessLogicTester {
  constructor() {
    // Create axios instance with cookie jar support
    this.axiosInstance = wrapper(axios.create({
      baseURL: BASE_URL,
      jar: new CookieJar(),
      withCredentials: true,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    }));
  }

  async login() {
    console.log('🔐 Authenticating...');
    try {
      const response = await this.axiosInstance.post('/api/login', TEST_USER);
      console.log('✅ Authentication successful');
      console.log(`👤 User: ${response.data.email} (${response.data.role})`);
      return response.data;
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testHealthCheck() {
    console.log('\n🏥 Testing Business Logic Health Check...');
    try {
      const response = await this.axiosInstance.get('/api/business-logic/health');
      console.log('✅ Health Check:', JSON.stringify(response.data, null, 2));
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Health Check failed:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  async testContractLifecycleEndpoints() {
    console.log('\n📋 Testing Contract Lifecycle Endpoints...');
    
    const endpoints = [
      { path: '/api/contracts/lifecycle/events', name: 'Lifecycle Events' },
      { path: '/api/contracts/1/performance', name: 'Contract Performance' },
      { path: '/api/contracts/1/renewal-recommendation', name: 'Renewal Recommendation' },
      { path: '/api/contracts/1/health-score', name: 'Health Score' },
      { path: '/api/contracts/1/termination-analysis', name: 'Termination Analysis' }
    ];

    const results = {};
    for (const endpoint of endpoints) {
      try {
        console.log(`  Testing ${endpoint.name}...`);
        const response = await this.axiosInstance.get(endpoint.path);
        console.log(`  ✅ ${endpoint.name}: Success`);
        results[endpoint.name] = { success: true, data: response.data };
      } catch (error) {
        console.log(`  ⚠️  ${endpoint.name}: ${error.response?.status || 'Error'} - ${error.response?.data?.error || error.message}`);
        results[endpoint.name] = { success: false, error: error.response?.data || error.message };
      }
    }
    return results;
  }

  async testFinancialIntelligenceEndpoints() {
    console.log('\n💰 Testing Financial Intelligence Endpoints...');
    
    const endpoints = [
      { path: '/api/financial/revenue-analytics', name: 'Revenue Analytics' },
      { path: '/api/financial/cash-flow-forecast', name: 'Cash Flow Forecast' },
      { path: '/api/financial/client-profitability', name: 'Client Profitability' },
      { path: '/api/financial/service-performance', name: 'Service Performance' },
      { path: '/api/financial/alerts', name: 'Financial Alerts' },
      { path: '/api/financial/executive-summary', name: 'Executive Summary' }
    ];

    const results = {};
    for (const endpoint of endpoints) {
      try {
        console.log(`  Testing ${endpoint.name}...`);
        const response = await this.axiosInstance.get(endpoint.path);
        console.log(`  ✅ ${endpoint.name}: Success`);
        results[endpoint.name] = { success: true, data: response.data };
      } catch (error) {
        console.log(`  ⚠️  ${endpoint.name}: ${error.response?.status || 'Error'} - ${error.response?.data?.error || error.message}`);
        results[endpoint.name] = { success: false, error: error.response?.data || error.message };
      }
    }
    return results;
  }

  async testBusinessIntelligenceDashboard() {
    console.log('\n📊 Testing Business Intelligence Dashboard...');
    try {
      const response = await this.axiosInstance.get('/api/dashboard/business-intelligence');
      console.log('✅ Business Intelligence Dashboard: Success');
      console.log('📈 Dashboard Summary:');
      console.log(`  - Contract Events: ${response.data.contractEvents?.length || 0}`);
      console.log(`  - Revenue: $${response.data.revenue?.totalRevenue || 0}`);
      console.log(`  - MRR: $${response.data.revenue?.recurringRevenue || 0}`);
      console.log(`  - Alerts: ${response.data.alerts?.length || 0}`);
      console.log(`  - KPIs: ${response.data.summary?.kpis?.length || 0}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Business Intelligence Dashboard failed:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  async testContractRenewalProcess() {
    console.log('\n🔄 Testing Contract Renewal Process...');
    try {
      const response = await this.axiosInstance.post('/api/contracts/1/process-renewal');
      console.log('✅ Contract Renewal Process: Success');
      return { success: true, data: response.data };
    } catch (error) {
      console.log(`⚠️  Contract Renewal Process: ${error.response?.status || 'Error'} - ${error.response?.data?.error || error.message}`);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  generateReport(results) {
    console.log('\n📋 BUSINESS LOGIC TEST REPORT');
    console.log('=' .repeat(50));
    
    let totalTests = 0;
    let passedTests = 0;
    
    Object.entries(results).forEach(([category, categoryResults]) => {
      console.log(`\n${category}:`);
      if (categoryResults && typeof categoryResults === 'object' && categoryResults.success !== undefined) {
        // Single test result
        totalTests++;
        if (categoryResults.success) {
          passedTests++;
          console.log(`  ✅ ${category}`);
        } else {
          console.log(`  ❌ ${category}: ${JSON.stringify(categoryResults.error)}`);
        }
      } else if (categoryResults && typeof categoryResults === 'object') {
        // Multiple test results
        Object.entries(categoryResults).forEach(([test, result]) => {
          totalTests++;
          if (result && result.success) {
            passedTests++;
            console.log(`  ✅ ${test}`);
          } else {
            console.log(`  ❌ ${test}: ${JSON.stringify(result?.error || 'Unknown error')}`);
          }
        });
      }
    });

    console.log('\n' + '=' .repeat(50));
    console.log(`📊 SUMMARY: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All business logic endpoints are operational!');
    } else {
      console.log('⚠️  Some endpoints need attention.');
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Business Logic Endpoint Tests...');
    console.log('=' .repeat(50));

    try {
      // Authenticate
      await this.login();

      // Run all tests
      const results = {
        'Health Check': await this.testHealthCheck(),
        'Contract Lifecycle': await this.testContractLifecycleEndpoints(),
        'Financial Intelligence': await this.testFinancialIntelligenceEndpoints(),
        'Business Dashboard': await this.testBusinessIntelligenceDashboard(),
        'Contract Renewal': await this.testContractRenewalProcess()
      };

      // Generate report
      this.generateReport(results);

      return results;
    } catch (error) {
      console.error('💥 Test suite failed:', error.message);
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new BusinessLogicTester();
  tester.runAllTests().catch(console.error);
}

module.exports = BusinessLogicTester; 