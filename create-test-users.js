const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
const ADMIN_EMAIL = 'admin@mssp.local';
const ADMIN_PASSWORD = 'SecureTestPass123!';

let authCookie = '';

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
    console.error(`❌ Error ${method} ${url}:`, error.response?.data || error.message);
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

// Create test users
async function createTestUsers() {
  console.log('🚀 Creating missing test users...\n');

  // Login first
  if (!await login()) {
    console.log('❌ Failed to login. Aborting user creation.');
    return;
  }

  // Define test users to create
  const testUsers = [
    {
      email: 'manager@mssp.local',
      password: 'SecureTestPass123!',
      firstName: 'Manager',
      lastName: 'User',
      role: 'manager',
      isActive: true
    },
    {
      email: 'engineer@mssp.local', 
      password: 'SecureTestPass123!',
      firstName: 'Engineer',
      lastName: 'User',
      role: 'engineer',
      isActive: true
    },
    {
      email: 'user@mssp.local',
      password: 'SecureTestPass123!',
      firstName: 'Regular',
      lastName: 'User', 
      role: 'user',
      isActive: true
    }
  ];

  // Create each user
  for (const userData of testUsers) {
    console.log(`Creating user: ${userData.email}`);
    
    const result = await makeRequest('POST', '/api/users', userData);
    
    if (result.success) {
      console.log(`✅ Created user: ${userData.email} (Role: ${userData.role})`);
    } else {
      console.log(`❌ Failed to create user: ${userData.email}`);
      console.log(`   Error: ${result.error || result.status}`);
    }
  }

  console.log('\n🎉 Test user creation completed!');
  console.log('\n📋 Test Credentials:');
  console.log('═══════════════════════════════════════');
  console.log('ADMIN   : admin@mssp.local     | SecureTestPass123!');
  console.log('MANAGER : manager@mssp.local   | SecureTestPass123!');
  console.log('ENGINEER: engineer@mssp.local  | SecureTestPass123!');
  console.log('USER    : user@mssp.local      | SecureTestPass123!');
  console.log('═══════════════════════════════════════');
}

// Run the script
createTestUsers().catch(console.error); 