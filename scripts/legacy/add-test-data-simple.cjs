const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://mssp_user:12345678@localhost:5432/mssp_database'
});

async function addTestData() {
  try {
    console.log('Adding test data for widget aggregation testing...');
    
    // Sample user data that would come from jsonplaceholder API
    const testUsers = [
      { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', department: 'Engineering', salary: 75000 },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'active', department: 'Marketing', salary: 65000 },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'inactive', department: 'Engineering', salary: 80000 },
      { id: 4, name: 'Alice Brown', email: 'alice@example.com', status: 'active', department: 'Sales', salary: 70000 },
      { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', status: 'active', department: 'Engineering', salary: 85000 },
      { id: 6, name: 'Diana Davis', email: 'diana@example.com', status: 'inactive', department: 'Marketing', salary: 60000 },
      { id: 7, name: 'Eve Miller', email: 'eve@example.com', status: 'active', department: 'Sales', salary: 72000 },
      { id: 8, name: 'Frank Garcia', email: 'frank@example.com', status: 'active', department: 'Engineering', salary: 78000 },
      { id: 9, name: 'Grace Lee', email: 'grace@example.com', status: 'active', department: 'Marketing', salary: 68000 },
      { id: 10, name: 'Henry Taylor', email: 'henry@example.com', status: 'inactive', department: 'Sales', salary: 74000 }
    ];
    
    // Insert test data into integrated_data table
    for (const user of testUsers) {
      await pool.query(`
        INSERT INTO integrated_data (data_source_id, external_id, mapped_data, raw_data, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (data_source_id, external_id) DO UPDATE SET
          mapped_data = EXCLUDED.mapped_data,
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW()
      `, [
        1, // data_source_id (our test data source)
        user.id.toString(), // external_id
        JSON.stringify(user), // mapped_data
        JSON.stringify(user)  // raw_data
      ]);
    }
    
    console.log(`✅ Added ${testUsers.length} test records to data source 1`);
    
    // Verify the data was added
    const result = await pool.query('SELECT COUNT(*) FROM integrated_data WHERE data_source_id = 1');
    console.log(`📊 Total records in data source 1: ${result.rows[0].count}`);
    
    console.log('🎯 Test data added successfully! You can now test widget aggregations.');
    
  } catch (error) {
    console.error('❌ Error adding test data:', error);
  } finally {
    await pool.end();
  }
}

addTestData(); 