const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function login() {
  const response = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@test.mssp.local',
      password: 'snoL^!p#9HF7vl2T'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }
  
  const cookies = response.headers.get('set-cookie');
  return cookies;
}

async function testEndpoint(endpoint, cookies) {
  try {
    console.log(`Testing: ${endpoint}`);
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { 'Cookie': cookies }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
      return { success: true, status: response.status, data };
    } else {
      const errorData = await response.json().catch(() => ({ message: 'No JSON response' }));
      console.log(`❌ ${endpoint} - Status: ${response.status}, Error: ${errorData.message}`);
      return { success: false, status: response.status, error: errorData.message };
    }
  } catch (error) {
    console.log(`❌ ${endpoint} - Connection Error: ${error.message}`);
    return { success: false, status: 0, error: error.message };
  }
}

async function main() {
  try {
    console.log('Logging in...');
    const cookies = await login();
    console.log('✅ Login successful\n');
    
    const failingEndpoints = [
      '/api/service-scopes/dynamic',
      '/api/service-scopes/variables/definitions',
      '/api/clients/1/service-authorization-forms',
      '/api/clients/1/certificates-of-compliance',
    ];
    
    console.log('Testing failing endpoints:\n');
    
    for (const endpoint of failingEndpoints) {
      await testEndpoint(endpoint, cookies);
      console.log('');
    }
    
    // Test field visibility endpoint with POST
    console.log('Testing POST /api/field-visibility');
    try {
      const response = await fetch(`${BASE_URL}/api/field-visibility`, {
        method: 'POST',
        headers: { 
          'Cookie': cookies,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tableName: 'clients',
          fieldName: 'industry',
          isVisible: true
        })
      });
      
      if (response.ok) {
        console.log(`✅ POST /api/field-visibility - Status: ${response.status}`);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'No JSON response' }));
        console.log(`❌ POST /api/field-visibility - Status: ${response.status}, Error: ${errorData.error || errorData.message}`);
      }
    } catch (error) {
      console.log(`❌ POST /api/field-visibility - Connection Error: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

main(); 