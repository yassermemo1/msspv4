const { Pool } = require('pg');

async function createFieldVisibilityTable() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    console.log('Creating field visibility configuration table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS field_visibility_config (
        id SERIAL PRIMARY KEY,
        table_name TEXT NOT NULL,
        field_name TEXT NOT NULL,
        is_visible BOOLEAN NOT NULL DEFAULT true,
        context TEXT NOT NULL DEFAULT 'form',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(table_name, field_name, context)
      );
      
      CREATE INDEX IF NOT EXISTS idx_field_visibility_table_context 
      ON field_visibility_config(table_name, context);
    `);
    
    console.log('✅ Field visibility configuration table created successfully');
  } catch (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createFieldVisibilityTable(); 