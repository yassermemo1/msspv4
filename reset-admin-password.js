import bcrypt from 'bcryptjs';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function resetAdminPassword() {
  try {
    await client.connect();
    console.log('🔌 Connected to database');

    // Hash the password
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update admin@mssp.local password
    const result1 = await client.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashedPassword, 'admin@mssp.local']
    );

    // Update admin@test.mssp.local password  
    const result2 = await client.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashedPassword, 'admin@test.mssp.local']
    );

    console.log(`✅ Updated admin@mssp.local password (${result1.rowCount} rows affected)`);
    console.log(`✅ Updated admin@test.mssp.local password (${result2.rowCount} rows affected)`);
    console.log(`🔑 Password set to: ${password}`);
    console.log(`📧 Admin emails: admin@mssp.local, admin@test.mssp.local`);

  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
  } finally {
    await client.end();
  }
}

resetAdminPassword(); 