import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testAdminLogin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@mssp.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  console.log('🧪 Testing Admin Login Credentials');
  console.log(`📧 Email: ${adminEmail}`);
  console.log(`🔑 Password: ${adminPassword}`);
  console.log('🌐 Testing against: http://localhost:80/api/login');
  
  try {
    // Test login
    const response = await fetch('http://localhost:80/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword
      })
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.text();
      console.log('✅ Login Successful!');
      console.log('🍪 Response:', data);
      
      // Extract session cookie if present
      const cookies = response.headers.get('set-cookie');
      if (cookies) {
        console.log('🍪 Session Cookie:', cookies);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Login Failed');
      console.log('📝 Response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error during login test:', error.message);
  }
}

// Run test
testAdminLogin(); 