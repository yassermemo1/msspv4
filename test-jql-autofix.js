#!/usr/bin/env node

console.log('🔧 Testing JQL Auto-Fix Functionality...');
console.log('=====================================');

// Test the auto-fix function with problematic queries
const testQueries = [
  'Project = DEP AND Status = Open',
  'project in (DEP, MD) AND status != Done',
  'Project in (DEP, MD) AND Status != Done ORDER BY priority DESC',
  'project = DEP AND assignee = currentUser()',
  'Project in (DEP, MD) AND created >= -30d ORDER BY priority'
];

// Send test query to the validation endpoint
async function testValidation() {
  const testQuery = 'project in (DEP, MD) AND status != Done AND created >= -30d ORDER BY priority DESC';
  
  try {
    console.log('\n🎯 Testing Query Validation Endpoint...');
    console.log(`Query: "${testQuery}"`);
    
    const response = await fetch('http://localhost:80/api/plugins/plugins/jira/instances/jira-main/validate-query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=s%3A2scFbcE3Egfk-j7jW6DCXhgqpdjC1Bb_.%2F9KLg61LqoNnqkiRPNVgERQ%2FKh%2BXUFH93X2A3gCd2UE'
      },
      body: JSON.stringify({
        query: testQuery,
        method: 'GET'
      })
    });
    
    const result = await response.json();
    console.log('\n📊 Validation Result:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Validation test failed:', error.message);
  }
}

// Test actual query execution
async function testQueryExecution() {
  const testQuery = 'project in (DEP, MD) AND status != Done AND created >= -30d ORDER BY created DESC';
  
  try {
    console.log('\n🚀 Testing Query Execution...');
    console.log(`Query: "${testQuery}"`);
    
    const response = await fetch('http://localhost:80/api/plugins/plugins/jira/instances/jira-main/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=s%3A2scFbcE3Egfk-j7jW6DCXhgqpdjC1Bb_.%2F9KLg61LqoNnqkiRPNVgERQ%2FKh%2BXUFH93X2A3gCd2UE'
      },
      body: JSON.stringify({
        query: testQuery,
        method: 'GET'
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.data) {
      console.log(`✅ Query Success! Found ${result.data.total} issues`);
      console.log('📝 Sample results:');
      result.data.issues.slice(0, 3).forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue.key}: ${issue.fields.summary}`);
      });
    } else {
      console.log('❌ Query failed:', result);
    }
    
  } catch (error) {
    console.error('❌ Query execution test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  await testValidation();
  await testQueryExecution();
  
  console.log('\n📱 Widget Manager Instructions:');
  console.log('==============================');
  console.log('1. Navigate to: http://localhost:80/widget-manager');
  console.log('2. Click "Create Widget"');
  console.log('3. Fill in the "Basic Info" tab');
  console.log('4. Go to "Query Config" tab and select "Write Custom Query"');
  console.log('5. Go to "Preview & Test" tab - you should see the Test Query button');
  console.log('6. Use this working query:');
  console.log('   project in ("DEP", "MD") AND status != "Done" ORDER BY created DESC');
  console.log('');
  console.log('✨ The auto-fix will handle formatting issues automatically!');
}

runTests(); 