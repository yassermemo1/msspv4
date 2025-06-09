const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:5001';
const ADMIN_EMAIL = 'admin@mssp.local';
const ADMIN_PASSWORD = 'SecureTestPass123!';

let authCookie = '';
let testData = {
  clientId: null,
  contractId: null,
  serviceId: null,
  serviceScopeId: null,
  licensePoolId: null,
  hardwareAssetId: null,
  documentId: null,
  externalSystemId: null,
  dashboardId: null,
  widgetId: null,
  safId: null,
  cocId: null
};

// Helper function to make authenticated requests
async function makeRequest(method, url, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Cookie': authCookie,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      status: error.response?.status || 'NO_RESPONSE',
      error: error.response?.data || error.message 
    };
  }
}

// Login function
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/api/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    }, {
      withCredentials: true,
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    });
    
    const cookies = response.headers['set-cookie'];
    if (cookies) {
      authCookie = cookies.map(cookie => cookie.split(';')[0]).join('; ');
      console.log('✅ Login successful');
      return true;
    }
    console.log('❌ Login failed - no cookies received');
    return false;
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return false;
  }
}

// Test all endpoints
async function testAllEndpoints() {
  const results = {
    timestamp: new Date().toISOString(),
    summary: {
      total: 0,
      success: 0,
      failed: 0,
      errors: []
    },
    endpoints: {}
  };

  console.log('🚀 Starting comprehensive API endpoint testing...\n');

  // Login first
  if (!await login()) {
    console.log('❌ Failed to login. Aborting tests.');
    return;
  }

  // Test categories
  const testCategories = [
    {
      name: 'Health & System',
      tests: [
        { method: 'GET', url: '/api/health', name: 'Health Check' },
        { method: 'GET', url: '/api/version', name: 'Version Info' },
        { method: 'GET', url: '/api/user', name: 'Current User' }
      ]
    },
    {
      name: 'Client Management',
      tests: [
        { method: 'GET', url: '/api/clients', name: 'List Clients' },
        { 
          method: 'POST', 
          url: '/api/clients', 
          name: 'Create Client',
          data: {
            name: 'Test Client ' + Date.now(),
            industry: 'Technology',
            status: 'active',
            companySize: 'Medium',
            contactName: 'John Doe',
            contactEmail: 'john@testclient.com',
            contactPhone: '+1234567890'
          }
        },
        { method: 'GET', url: '/api/clients/1', name: 'Get Client Details' },
        { method: 'GET', url: '/api/clients/1/service-scopes', name: 'Client Service Scopes' },
        { method: 'GET', url: '/api/clients/1/service-authorization-forms', name: 'Client SAFs' },
        { method: 'GET', url: '/api/clients/1/certificates-of-compliance', name: 'Client COCs' },
        { method: 'GET', url: '/api/clients/1/financial-transactions', name: 'Client Transactions' },
        { method: 'GET', url: '/api/clients/1/team-assignments', name: 'Client Team' },
        { method: 'GET', url: '/api/clients/1/external-mappings', name: 'Client External Mappings' },
        { method: 'GET', url: '/api/clients/1/aggregated-data', name: 'Client Aggregated Data' }
      ]
    },
    {
      name: 'Service Management',
      tests: [
        { method: 'GET', url: '/api/services', name: 'List Services' },
        { method: 'GET', url: '/api/services/categories', name: 'Service Categories' },
        {
          method: 'POST',
          url: '/api/services',
          name: 'Create Service',
          data: {
            name: 'Test Service ' + Date.now(),
            category: 'Security Operations',
            description: 'Test service description',
            deliveryModel: 'Managed Service',
            basePrice: '5000.00',
            pricingUnit: 'monthly',
            isActive: true
          }
        }
      ]
    },
    {
      name: 'Contract Management',
      tests: [
        { method: 'GET', url: '/api/contracts', name: 'List Contracts' },
        {
          method: 'POST',
          url: '/api/contracts',
          name: 'Create Contract',
          data: {
            clientId: 1,
            name: 'Test Contract ' + Date.now(),
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
            status: 'active',
            totalValue: '100000.00'
          }
        }
      ]
    },
    {
      name: 'License Management',
      tests: [
        { method: 'GET', url: '/api/license-pools', name: 'List License Pools' },
        { method: 'GET', url: '/api/license-pools/summary', name: 'License Pool Summary' },
        {
          method: 'POST',
          url: '/api/license-pools',
          name: 'Create License Pool',
          data: {
            name: 'Test License Pool ' + Date.now(),
            vendor: 'Microsoft',
            productName: 'Office 365',
            licenseType: 'Subscription',
            totalLicenses: 100,
            availableLicenses: 100,
            costPerLicense: '20.00',
            renewalDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
          }
        }
      ]
    },
    {
      name: 'Asset Management',
      tests: [
        { method: 'GET', url: '/api/hardware-assets', name: 'List Hardware Assets' },
        {
          method: 'POST',
          url: '/api/hardware-assets',
          name: 'Create Hardware Asset',
          data: {
            name: 'Test Server ' + Date.now(),
            category: 'Server',
            manufacturer: 'Dell',
            model: 'PowerEdge R740',
            serialNumber: 'SN' + Date.now(),
            status: 'active',
            location: 'Data Center 1'
          }
        }
      ]
    },
    {
      name: 'Financial Management',
      tests: [
        { method: 'GET', url: '/api/financial-transactions', name: 'List Transactions' },
        {
          method: 'POST',
          url: '/api/financial-transactions',
          name: 'Create Transaction',
          data: {
            type: 'invoice',
            clientId: 1,
            amount: '5000.00',
            currency: 'USD',
            description: 'Test invoice',
            transactionDate: new Date().toISOString().split('T')[0],
            status: 'pending'
          }
        }
      ]
    },
    {
      name: 'Dashboard & Widgets',
      tests: [
        { method: 'GET', url: '/api/dashboard/stats', name: 'Dashboard Stats' },
        { method: 'GET', url: '/api/dashboard/widgets', name: 'Dashboard Widgets' },
        { method: 'GET', url: '/api/dashboard/recent-activity', name: 'Recent Activity' },
        { method: 'GET', url: '/api/dashboards', name: 'List Dashboards' },
        {
          method: 'POST',
          url: '/api/dashboards',
          name: 'Create Dashboard',
          data: {
            name: 'Test Dashboard ' + Date.now(),
            description: 'Test dashboard',
            isDefault: false,
            layout: { widgets: [] }
          }
        }
      ]
    },
    {
      name: 'External Systems',
      tests: [
        { method: 'GET', url: '/api/external-systems', name: 'List External Systems' },
        {
          method: 'POST',
          url: '/api/external-systems',
          name: 'Create External System',
          data: {
            name: 'Test System ' + Date.now(),
            baseUrl: 'https://test.example.com',
            authType: 'api_key',
            authConfig: { apiKey: 'test-key' },
            apiEndpoints: { test: '/api/test' }
          }
        }
      ]
    },
    {
      name: 'Reports',
      tests: [
        { method: 'GET', url: '/api/reports/dashboard', name: 'Dashboard Report' },
        { method: 'GET', url: '/api/reports/clients', name: 'Clients Report' },
        { method: 'GET', url: '/api/reports/financial', name: 'Financial Report' },
        { method: 'GET', url: '/api/reports/licenses', name: 'Licenses Report' }
      ]
    },
    {
      name: 'Audit & Security',
      tests: [
        { method: 'GET', url: '/api/audit/logs', name: 'Audit Logs' },
        { method: 'GET', url: '/api/audit/change-history', name: 'Change History' },
        { method: 'GET', url: '/api/audit/security-events', name: 'Security Events' },
        { method: 'GET', url: '/api/audit/data-access', name: 'Data Access Logs' }
      ]
    },
    {
      name: 'User & Permissions',
      tests: [
        { method: 'GET', url: '/api/users', name: 'List Users' },
        { method: 'GET', url: '/api/user/settings', name: 'User Settings' },
        { method: 'GET', url: '/api/user/accessible-pages', name: 'Accessible Pages' },
        { method: 'GET', url: '/api/page-permissions', name: 'Page Permissions' },
        { method: 'GET', url: '/api/user/2fa/status', name: '2FA Status' }
      ]
    },
    {
      name: 'Search',
      tests: [
        { method: 'GET', url: '/api/search/history', name: 'Search History' },
        { method: 'GET', url: '/api/search/saved', name: 'Saved Searches' },
        {
          method: 'POST',
          url: '/api/search/execute',
          name: 'Execute Search',
          data: {
            query: 'test',
            entityTypes: ['clients', 'contracts', 'services']
          }
        }
      ]
    },
    {
      name: 'Documents',
      tests: [
        { method: 'GET', url: '/api/documents', name: 'List Documents' }
      ]
    },
    {
      name: 'Compliance',
      tests: [
        { method: 'GET', url: '/api/service-authorization-forms', name: 'List SAFs' },
        { method: 'GET', url: '/api/certificates-of-compliance', name: 'List COCs' }
      ]
    }
  ];

  // Run all tests
  for (const category of testCategories) {
    console.log(`\n📁 Testing ${category.name}:`);
    console.log('─'.repeat(50));
    
    results.endpoints[category.name] = {
      tests: [],
      summary: { total: 0, success: 0, failed: 0 }
    };
    
    for (const test of category.tests) {
      results.summary.total++;
      results.endpoints[category.name].summary.total++;
      
      const result = await makeRequest(test.method, test.url, test.data);
      
      const status = result.success ? '✅' : '❌';
      const statusCode = result.status;
      const statusText = result.success ? 'SUCCESS' : 'FAILED';
      
      console.log(`${status} ${test.method.padEnd(6)} ${test.url.padEnd(50)} [${statusCode}] ${test.name}`);
      
      if (result.success) {
        results.summary.success++;
        results.endpoints[category.name].summary.success++;
        
        // Store IDs for later use
        if (test.name === 'Create Client' && result.data?.id) {
          testData.clientId = result.data.id;
        } else if (test.name === 'Create Service' && result.data?.id) {
          testData.serviceId = result.data.id;
        } else if (test.name === 'Create Contract' && result.data?.id) {
          testData.contractId = result.data.id;
        } else if (test.name === 'Create License Pool' && result.data?.id) {
          testData.licensePoolId = result.data.id;
        }
      } else {
        results.summary.failed++;
        results.endpoints[category.name].summary.failed++;
        results.summary.errors.push({
          category: category.name,
          test: test.name,
          method: test.method,
          url: test.url,
          status: result.status,
          error: result.error
        });
      }
      
      results.endpoints[category.name].tests.push({
        name: test.name,
        method: test.method,
        url: test.url,
        status: result.status,
        success: result.success,
        error: result.error
      });
    }
  }

  // Print summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 FINAL SUMMARY');
  console.log('═'.repeat(70));
  console.log(`Total Endpoints Tested: ${results.summary.total}`);
  console.log(`✅ Successful: ${results.summary.success} (${(results.summary.success/results.summary.total*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${results.summary.failed} (${(results.summary.failed/results.summary.total*100).toFixed(1)}%)`);
  
  if (results.summary.errors.length > 0) {
    console.log('\n❌ FAILED ENDPOINTS:');
    console.log('─'.repeat(70));
    results.summary.errors.forEach(error => {
      console.log(`${error.method} ${error.url} - ${error.test}`);
      console.log(`   Status: ${error.status}`);
      if (error.error) {
        console.log(`   Error: ${JSON.stringify(error.error).substring(0, 100)}...`);
      }
    });
  }

  // Save detailed report
  fs.writeFileSync('api-test-results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Detailed report saved to: api-test-results.json');
}

// Run the tests
testAllEndpoints().catch(console.error); 