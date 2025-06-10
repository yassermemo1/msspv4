// Simple test to check bulk import endpoint structure
import fetch from 'node-fetch';

async function testEndpointStructure() {
  try {
    console.log('🧪 Testing Bulk Import Endpoint Structure...');
    
    // Test with missing authentication
    const response = await fetch('http://localhost:3000/api/bulk-import/comprehensive-paste', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        headers: ['test'],
        rows: [['test']],
        mappings: []
      })
    });
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('✅ Authentication is properly enforced');
      console.log('💡 To test with authentication, log in to the frontend first');
    }
    
    // Test the frontend page availability
    console.log('\n🌐 Testing frontend page availability...');
    const pageResponse = await fetch('http://localhost:3000/comprehensive-bulk-import');
    console.log(`📄 Page response: ${pageResponse.status} ${pageResponse.statusText}`);
    
    if (pageResponse.status === 200) {
      console.log('✅ Frontend page is accessible');
      console.log('🎯 You can test the functionality by:');
      console.log('1. Navigate to http://localhost:3000/login');
      console.log('2. Log in with admin credentials');
      console.log('3. Go to http://localhost:3000/comprehensive-bulk-import');
      console.log('4. Test the bulk import functionality');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Server is not running. Start it with: npm run dev');
    }
  }
}

// Get test credentials from server logs
console.log('🔐 Test Credentials (from server startup):');
console.log('ADMIN   : admin@test.mssp.local     | IUnlz^Rel87Y5Z4e');
console.log('MANAGER : manager@test.mssp.local   | IUnlz^Rel87Y5Z4e');
console.log('ENGINEER: engineer@test.mssp.local  | IUnlz^Rel87Y5Z4e');
console.log('USER    : user@test.mssp.local      | IUnlz^Rel87Y5Z4e');
console.log('');

testEndpointStructure(); 