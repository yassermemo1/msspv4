const bcrypt = require('bcrypt');
const { Client } = require('pg');

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'mssp_user',
  password: process.env.DB_PASSWORD || '12345678',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mssp_production'
};

async function fixUserPasswords() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Hash the test password
    const testPassword = 'SecureTestPass123!';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    console.log('✅ Password hashed');
    
    // Update passwords for test users
    const testUsers = [
      { email: 'manager@mssp.local', role: 'manager' },
      { email: 'engineer@mssp.local', role: 'engineer' },
      { email: 'user@mssp.local', role: 'user' }
    ];
    
    for (const user of testUsers) {
      const result = await client.query(
        'UPDATE users SET password = $1 WHERE email = $2',
        [hashedPassword, user.email]
      );
      
      if (result.rowCount > 0) {
        console.log(`✅ Updated password for ${user.email} (${user.role})`);
      } else {
        console.log(`❌ User not found: ${user.email}`);
      }
    }
    
    console.log('\n🎉 Password update completed!');
    console.log('\n📋 Test Credentials:');
    console.log('═══════════════════════════════════════');
    console.log('ADMIN   : admin@mssp.local     | SecureTestPass123!');
    console.log('MANAGER : manager@mssp.local   | SecureTestPass123!');
    console.log('ENGINEER: engineer@mssp.local  | SecureTestPass123!');
    console.log('USER    : user@mssp.local      | SecureTestPass123!');
    console.log('═══════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('✅ Database connection closed');
  }
}

// Run the script
fixUserPasswords().catch(console.error); 