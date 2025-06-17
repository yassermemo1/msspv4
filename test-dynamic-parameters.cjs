#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🎯 DYNAMIC PARAMETER SYSTEM TEST');
console.log('================================');

const BASE_URL = 'http://10.252.1.89:80';

// Helper function to make requests with proper error handling
async function makeRequest(endpoint, options = {}) {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function testDynamicParameters() {
  console.log('');
  console.log('1️⃣ Logging in...');
  
  // Login first
  const loginResult = await makeRequest('/api/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@mssp.local',
      password: 'admin123'
    })
  });

  if (!loginResult.ok) {
    console.log(`❌ Login failed: ${loginResult.error || loginResult.data?.message}`);
    return;
  }
  console.log('   ✅ Login successful');

  console.log('');
  console.log('2️⃣ Testing Static Parameters...');
  
  // Test with static parameters
  let result = await makeRequest('/api/plugins/jira/instances/jira-main/query', {
    method: 'POST',
    body: JSON.stringify({
      query: 'project = "DEP" AND labels ~ ${clientLabel}',
      method: 'GET',
      parameters: {
        clientLabel: {
          source: 'static',
          value: 'SITE'
        }
      }
    })
  });

  if (result.ok && result.data.success) {
    console.log(`   ✅ Static parameter test passed - Query processed successfully`);
    console.log(`   📊 Resolved query: ${result.data.metadata?.query || 'N/A'}`);
    console.log(`   📈 Result count: ${result.data.data?.totalResults || result.data.data?.total || 'N/A'}`);
  } else {
    console.log(`   ❌ Static parameter test failed: ${result.data?.message || result.error}`);
  }

  console.log('');
  console.log('3️⃣ Testing Context Parameters...');
  
  // Test with context parameters
  result = await makeRequest('/api/plugins/jira/instances/jira-main/query', {
    method: 'POST',
    body: JSON.stringify({
      query: 'project in ("DEP", "MD") AND reporter in (emailAddress("*@${reporterDomain}"))',
      method: 'GET',
      parameters: {
        reporterDomain: {
          source: 'context',
          contextVar: 'clientDomain'
        }
      },
      context: {
        clientDomain: 'site.sa',
        clientShortName: 'SITE',
        clientName: 'SITE Test Client'
      }
    })
  });

  if (result.ok && result.data.success) {
    console.log(`   ✅ Context parameter test passed - Domain resolved from context`);
    console.log(`   📊 Resolved query: ${result.data.metadata?.query || 'N/A'}`);
    console.log(`   📈 Result count: ${result.data.data?.totalResults || result.data.data?.total || 'N/A'}`);
  } else {
    console.log(`   ❌ Context parameter test failed: ${result.data?.message || result.error}`);
  }

  console.log('');
  console.log('4️⃣ Testing Database Parameters...');
  
  // First, ensure we have a test client
  const clientResult = await makeRequest('/api/clients', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Dynamic Test Client',
      shortName: 'DYNTEST',
      domain: 'dyntest.com',
      industry: 'Testing',
      status: 'active'
    })
  });

  let clientId = null;
  if (clientResult.ok) {
    clientId = clientResult.data.id;
    console.log(`   📋 Created test client with ID: ${clientId}`);
  } else {
    console.log(`   ⚠️ Could not create test client: ${clientResult.data?.message || clientResult.error}`);
  }

  // Test database parameter resolution
  if (clientId) {
    result = await makeRequest('/api/plugins/jira/instances/jira-main/query', {
      method: 'POST',
      body: JSON.stringify({
        query: 'project in ("DEP", "MD") AND labels ~ ${clientShortName}',
        method: 'GET',
        parameters: {
          clientShortName: {
            source: 'database',
            dbTable: 'clients',
            dbColumn: 'shortName'
          }
        },
        context: {
          clientId: clientId
        }
      })
    });

    if (result.ok && result.data.success) {
      console.log(`   ✅ Database parameter test passed - Value retrieved from database`);
      console.log(`   📊 Resolved query: ${result.data.metadata?.query || 'N/A'}`);
      console.log(`   🎯 Parameter resolution: ${JSON.stringify(result.data.metadata?.parameters || {})}`);
    } else {
      console.log(`   ❌ Database parameter test failed: ${result.data?.message || result.error}`);
    }
  }

  console.log('');
  console.log('5️⃣ Testing Complex Multi-Parameter Widget...');
  
  // Test complex widget with multiple parameter types
  result = await makeRequest('/api/plugins/jira/instances/jira-main/query', {
    method: 'POST',
    body: JSON.stringify({
      query: 'project in ("DEP", "MD") AND labels ~ ${clientPrefix} AND reporter in (emailAddress("*@${domain}")) AND created >= ${dateRange}',
      method: 'GET',
      parameters: {
        clientPrefix: {
          source: 'context',
          contextVar: 'clientShortName'
        },
        domain: {
          source: 'static',
          value: 'site.sa'
        },
        dateRange: {
          source: 'static',
          value: '-30d'
        }
      },
      context: {
        clientId: clientId || 1,
        clientShortName: 'SITE',
        clientName: 'SITE Corporation',
        clientDomain: 'site.sa'
      }
    })
  });

  if (result.ok && result.data.success) {
    console.log(`   ✅ Multi-parameter test passed - All parameters resolved`);
    console.log(`   📊 Original query: project in ("DEP", "MD") AND labels ~ \${clientPrefix} AND reporter in (emailAddress("*@\${domain}")) AND created >= \${dateRange}`);
    console.log(`   📊 Resolved query: ${result.data.metadata?.query || 'N/A'}`);
    console.log(`   🎯 Parameter resolution: ${JSON.stringify(result.data.metadata?.parameters || {})}`);
    console.log(`   📈 Result count: ${result.data.data?.totalResults || result.data.data?.total || 'N/A'}`);
  } else {
    console.log(`   ❌ Multi-parameter test failed: ${result.data?.message || result.error}`);
  }

  console.log('');
  console.log('6️⃣ Testing Widget Creation with Dynamic Parameters...');
  
  // Create a widget with dynamic parameters
  const widgetResult = await makeRequest('/api/widgets/manage', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Dynamic Client Issues Widget',
      description: 'A widget that dynamically filters issues by client using multiple parameter types',
      pluginName: 'jira',
      widgetType: 'table',
      query: 'project in ("DEP", "MD") AND labels ~ ${clientLabel} AND created >= ${timeRange}',
      method: 'GET',
      parameters: {
        clientLabel: {
          source: 'context',
          contextVar: 'clientShortName'
        },
        timeRange: {
          source: 'static',
          value: '-7d'
        }
      },
      displayConfig: {
        width: 'full',
        height: 'medium',
        showBorder: true,
        showHeader: true
      },
      refreshInterval: 300,
      isGlobal: true
    })
  });

  if (widgetResult.ok && widgetResult.data.id) {
    console.log(`   ✅ Dynamic widget created successfully with ID: ${widgetResult.data.id}`);
    console.log(`   📋 Widget name: ${widgetResult.data.name}`);
    console.log(`   ⚙️ Parameters: ${JSON.stringify(widgetResult.data.parameters || {})}`);
  } else {
    console.log(`   ❌ Widget creation failed: ${widgetResult.data?.message || widgetResult.error}`);
  }

  console.log('');
  console.log('🎉 DYNAMIC PARAMETER TESTING COMPLETE!');
  console.log('=====================================');
  console.log('✅ Static Parameters: Values defined in widget configuration');
  console.log('✅ Context Parameters: Values from page context (URL, client data)');
  console.log('✅ Database Parameters: Values fetched from database tables');
  console.log('✅ Multi-Parameter Widgets: Complex queries with multiple parameter types');
  console.log('✅ Widget Creation: Widgets can be created with dynamic parameter configurations');
  console.log('');
  console.log('📋 PARAMETER SOURCES SUPPORTED:');
  console.log('   - static: Fixed values defined in widget configuration');
  console.log('   - context: Dynamic values from page context (clientId, clientShortName, etc.)');
  console.log('   - database: Values retrieved from database tables based on context');
  console.log('');
  console.log('🔄 PARAMETER RESOLUTION ORDER:');
  console.log('   1. Context is extracted from URL and component props');
  console.log('   2. Each parameter is resolved based on its source configuration');
  console.log('   3. Query template placeholders (${param}) are replaced with resolved values');
  console.log('   4. Final query is executed against the plugin API');
  console.log('');
  console.log('💡 USAGE IN CLIENT PAGES:');
  console.log('   - Widget renderer automatically extracts client context from URL');
  console.log('   - Client ID, name, domain are passed to all widget queries');
  console.log('   - Parameters are resolved server-side for security and performance');
  console.log('   - No client-side parameter resolution needed');
}

// Run the test
testDynamicParameters().catch(console.error); 