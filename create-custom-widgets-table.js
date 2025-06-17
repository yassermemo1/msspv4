import pkg from 'pg';
const { Pool } = pkg;

// Use the same database configuration as the application
const databaseUrl = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER || 'mssp_user'}:${process.env.DB_PASSWORD || '12345678'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'mssp_production'}`;

async function createCustomWidgetsTable() {
  console.log('🔧 Creating custom_widgets table...');
  
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    const client = await pool.connect();
    
    // Drop table if exists and recreate to ensure clean state
    await client.query(`DROP TABLE IF EXISTS custom_widgets CASCADE;`);
    console.log('✅ Dropped existing custom_widgets table (if any)');
    
    // Create table with exact schema from Drizzle definition
    const createTableQuery = `
      CREATE TABLE custom_widgets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        plugin_name TEXT NOT NULL,
        instance_id TEXT NOT NULL,
        query_type TEXT NOT NULL DEFAULT 'default',
        query_id TEXT,
        custom_query TEXT,
        query_method TEXT NOT NULL DEFAULT 'GET',
        query_parameters JSONB NOT NULL DEFAULT '{}',
        display_type TEXT NOT NULL DEFAULT 'table',
        chart_type TEXT,
        refresh_interval INTEGER NOT NULL DEFAULT 30,
        placement TEXT NOT NULL DEFAULT 'client-details',
        styling JSONB NOT NULL DEFAULT '{"width":"full","height":"medium","showBorder":true,"showHeader":true}',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    
    await client.query(createTableQuery);
    console.log('✅ Created custom_widgets table successfully');
    
    // Verify table was created
    const verifyQuery = `
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'custom_widgets' 
      ORDER BY ordinal_position;
    `;
    
    const result = await client.query(verifyQuery);
    console.log(`✅ Table verified with ${result.rows.length} columns:`);
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
    
    client.release();
    await pool.end();
    
    console.log('✅ Database connection closed');
    console.log('🎉 custom_widgets table is ready!');
    
  } catch (error) {
    console.error('❌ Error creating custom_widgets table:', error.message);
    process.exit(1);
  }
}

createCustomWidgetsTable(); 