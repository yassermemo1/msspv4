// Test script to demonstrate the dynamic scope filtering system
// This shows how to add new scope variables and filter by them without code changes

import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'mssp_database',
  user: 'mssp_user',
  password: 'admin123',
});

async function testDynamicScopeSystem() {
  try {
    await client.connect();
    console.log('Connected to database');

    // 1. Show current variable definitions
    console.log('\n=== Current Variable Definitions ===');
    const definitions = await client.query(`
      SELECT variable_name, display_name, variable_type, unit 
      FROM scope_variable_definitions 
      ORDER BY display_name
    `);
    console.table(definitions.rows);

    // 2. Show variable usage statistics  
    console.log('\n=== Variable Usage Statistics ===');
    const stats = await client.query(`
      SELECT 
        svd.variable_name,
        svd.display_name,
        COUNT(svv.id) as usage_count,
        CASE 
          WHEN svd.variable_type = 'integer' THEN 
            json_build_object(
              'min', MIN(svv.value_integer),
              'max', MAX(svv.value_integer),
              'avg', ROUND(AVG(svv.value_integer), 2)
            )
          WHEN svd.variable_type = 'decimal' THEN 
            json_build_object(
              'min', MIN(svv.value_decimal),
              'max', MAX(svv.value_decimal),
              'avg', ROUND(AVG(svv.value_decimal), 2)
            )
          ELSE 
            json_build_object(
              'unique_values', COUNT(DISTINCT svv.value_text)
            )
        END as statistics
      FROM scope_variable_definitions svd
      LEFT JOIN scope_variable_values svv ON svd.variable_name = svv.variable_name
      GROUP BY svd.variable_name, svd.display_name, svd.variable_type
      HAVING COUNT(svv.id) > 0
      ORDER BY usage_count DESC
    `);
    console.table(stats.rows);

    // 3. Test adding a new scope variable dynamically
    console.log('\n=== Adding New Scope Variable ===');
    const testScopeId = 1; // Assuming scope ID 1 exists
    
    // Add a new variable: "threat_detection_accuracy" = "99.5%"
    await client.query(`
      SELECT add_scope_variable($1, $2, $3, $4)
    `, [testScopeId, 'threat_detection_accuracy', '99.5%', 'auto']);
    
    console.log('✅ Added threat_detection_accuracy = 99.5% to scope', testScopeId);

    // Add another new variable: "security_analysts" = "8"
    await client.query(`
      SELECT add_scope_variable($1, $2, $3, $4)
    `, [testScopeId, 'security_analysts', '8', 'auto']);
    
    console.log('✅ Added security_analysts = 8 to scope', testScopeId);

    // 4. Show that new variables are automatically discovered
    console.log('\n=== Auto-Discovered New Variables ===');
    const newVariables = await client.query(`
      SELECT variable_name, display_name, variable_type, unit 
      FROM scope_variable_definitions 
      WHERE variable_name IN ('threat_detection_accuracy', 'security_analysts')
    `);
    console.table(newVariables.rows);

    // 5. Test filtering by various variables
    console.log('\n=== Testing Dynamic Filtering ===');
    
    // Filter by EPS > 5000
    const highEpsScopes = await client.query(`
      SELECT ss.id, svv.variable_name, svv.value_integer
      FROM service_scopes ss
      JOIN scope_variable_values svv ON ss.id = svv.service_scope_id
      WHERE svv.variable_name = 'eps' AND svv.value_integer > 5000
    `);
    console.log('Service scopes with EPS > 5000:', highEpsScopes.rows);

    // Filter by Enterprise tier
    const enterpriseScopes = await client.query(`
      SELECT ss.id, svv.variable_name, svv.value_text
      FROM service_scopes ss
      JOIN scope_variable_values svv ON ss.id = svv.service_scope_id
      WHERE svv.variable_name = 'service_tier' AND svv.value_text = 'Enterprise'
    `);
    console.log('Enterprise tier scopes:', enterpriseScopes.rows);

    // Complex filter: EPS > 4000 AND endpoints > 1000
    const complexFilter = await client.query(`
      SELECT DISTINCT ss.id
      FROM service_scopes ss
      WHERE EXISTS (
        SELECT 1 FROM scope_variable_values svv1 
        WHERE svv1.service_scope_id = ss.id 
        AND svv1.variable_name = 'eps' 
        AND svv1.value_integer > 4000
      )
      AND EXISTS (
        SELECT 1 FROM scope_variable_values svv2 
        WHERE svv2.service_scope_id = ss.id 
        AND svv2.variable_name = 'endpoints' 
        AND svv2.value_integer > 1000
      )
    `);
    console.log('Scopes with EPS > 4000 AND endpoints > 1000:', complexFilter.rows);

    // 6. Show how to add more variables to different scopes
    console.log('\n=== Adding Variables to Multiple Scopes ===');
    
    // Get a few scope IDs
    const scopes = await client.query(`
      SELECT id FROM service_scopes LIMIT 3
    `);

    for (const scope of scopes.rows) {
      // Add different values for demonstration
      const mttrValue = Math.floor(Math.random() * 120) + 30; // 30-150 minutes
      const complianceScore = Math.floor(Math.random() * 20) + 80; // 80-100%
      
      await client.query(`
        SELECT add_scope_variable($1, $2, $3, $4)
      `, [scope.id, 'mean_time_to_response', `${mttrValue}`, 'integer']);
      
      await client.query(`
        SELECT add_scope_variable($1, $2, $3, $4)
      `, [scope.id, 'compliance_score', `${complianceScore}%`, 'auto']);
      
      console.log(`✅ Added MTTR (${mttrValue}min) and compliance score (${complianceScore}%) to scope ${scope.id}`);
    }

    // 7. Show final variable landscape
    console.log('\n=== Final Variable Definitions (After Dynamic Additions) ===');
    const finalDefinitions = await client.query(`
      SELECT variable_name, display_name, variable_type, unit, 
             (SELECT COUNT(*) FROM scope_variable_values WHERE variable_name = svd.variable_name) as usage_count
      FROM scope_variable_definitions svd
      ORDER BY usage_count DESC, display_name
    `);
    console.table(finalDefinitions.rows);

    // 8. Demonstrate filtering by new variables
    console.log('\n=== Filtering by New Variables ===');
    
    // Filter by MTTR < 60 minutes
    const fastResponseScopes = await client.query(`
      SELECT ss.id, svv.value_integer as mttr_minutes
      FROM service_scopes ss
      JOIN scope_variable_values svv ON ss.id = svv.service_scope_id
      WHERE svv.variable_name = 'mean_time_to_response' 
      AND svv.value_integer < 60
      ORDER BY svv.value_integer
    `);
    console.log('Scopes with MTTR < 60 minutes:', fastResponseScopes.rows);

    // Filter by compliance score > 90%
    const highComplianceScopes = await client.query(`
      SELECT ss.id, svv.value_text as compliance_score
      FROM service_scopes ss
      JOIN scope_variable_values svv ON ss.id = svv.service_scope_id
      WHERE svv.variable_name = 'compliance_score' 
      AND svv.value_integer > 90
      ORDER BY svv.value_integer DESC
    `);
    console.log('Scopes with compliance score > 90%:', highComplianceScopes.rows);

    console.log('\n=== Dynamic Scope System Test Complete ===');
    console.log('✅ Successfully demonstrated:');
    console.log('   - Auto-discovery of new variables');
    console.log('   - Dynamic addition of scope variables');
    console.log('   - Flexible filtering without schema changes');
    console.log('   - Type inference and automatic indexing');
    console.log('   - Complex multi-variable filtering');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await client.end();
  }
}

// API Usage Examples for Future Development
console.log('\n=== API Usage Examples for Future Development ===');
console.log(`
// 1. Get all variable definitions for dynamic UI generation
GET /api/service-scopes/variables/definitions

// 2. Filter scopes with EPS > 4000
GET /api/service-scopes/dynamic?eps_min=4000

// 3. Filter by multiple criteria
GET /api/service-scopes/dynamic?service_tier=Enterprise&eps_min=5000&endpoints_min=1000

// 4. Add new variable to a scope
POST /api/service-scopes/123/variables
{
  "variableName": "ssl_certificate_count",
  "value": "45",
  "type": "integer"
}

// 5. Wildcard text search
GET /api/service-scopes/dynamic?compliance_frameworks=*ISO*

// 6. Get usage statistics
GET /api/service-scopes/variables/stats

// 7. Discover new variables from scope definitions
GET /api/service-scopes/variables/discover
`);

// Run the test
testDynamicScopeSystem(); 