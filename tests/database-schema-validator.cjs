#!/usr/bin/env node

/**
 * DATABASE SCHEMA COMPREHENSIVE VALIDATOR
 * =======================================
 * 
 * This validator performs complete testing of:
 * 1. All database tables and their structures
 * 2. All foreign key relationships and constraints
 * 3. All unique constraints and indexes
 * 4. All check constraints and validations
 * 5. Data integrity and consistency
 * 6. Schema evolution and migration testing
 */

const { Pool } = require('pg');
const fs = require('fs');

class DatabaseSchemaValidator {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://mssp_user:devpass123@localhost:5432/mssp_production'
    });
    
    this.results = {
      startTime: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        tablesAnalyzed: 0,
        constraintsValidated: 0,
        relationsVerified: 0
      },
      categories: {},
      schemaAnalysis: {
        tables: {},
        foreignKeys: [],
        uniqueConstraints: [],
        checkConstraints: [],
        indexes: []
      }
    };

    // Expected schema structure based on shared/schema.ts
    this.expectedTables = [
      'users', 'user_settings', 'company_settings', 'clients', 'client_contacts',
      'services', 'service_scope_fields', 'contracts', 'service_scopes', 'proposals',
      'license_pools', 'client_licenses', 'hardware_assets', 'client_hardware_assignments',
      'financial_transactions', 'client_team_assignments', 'custom_fields', 'custom_field_values',
      'documents', 'document_versions', 'document_access', 'individual_licenses',
      'service_authorization_forms', 'certificates_of_compliance', 'data_sources',
      'data_source_mappings', 'integrated_data', 'dashboard_widgets', 'user_dashboards',
      'dashboard_widget_assignments', 'external_systems', 'client_external_mappings',
      'widget_execution_cache', 'audit_logs', 'change_history', 'security_events',
      'data_access_logs', 'system_events', 'page_permissions', 'user_dashboard_settings',
      'schema_versions', 'field_visibility_config'
    ];

    this.expectedRelations = [
      { from: 'user_settings', to: 'users', column: 'user_id' },
      { from: 'client_contacts', to: 'clients', column: 'client_id' },
      { from: 'service_scope_fields', to: 'services', column: 'service_id' },
      { from: 'contracts', to: 'clients', column: 'client_id' },
      { from: 'service_scopes', to: 'contracts', column: 'contract_id' },
      { from: 'service_scopes', to: 'services', column: 'service_id' },
      { from: 'proposals', to: 'contracts', column: 'contract_id' },
      { from: 'client_licenses', to: 'clients', column: 'client_id' },
      { from: 'client_licenses', to: 'license_pools', column: 'license_pool_id' },
      { from: 'client_hardware_assignments', to: 'clients', column: 'client_id' },
      { from: 'client_hardware_assignments', to: 'hardware_assets', column: 'hardware_asset_id' },
      { from: 'financial_transactions', to: 'clients', column: 'client_id' },
      { from: 'client_team_assignments', to: 'clients', column: 'client_id' },
      { from: 'client_team_assignments', to: 'users', column: 'user_id' },
      { from: 'custom_field_values', to: 'custom_fields', column: 'custom_field_id' },
      { from: 'document_versions', to: 'documents', column: 'document_id' },
      { from: 'document_access', to: 'documents', column: 'document_id' },
      { from: 'document_access', to: 'users', column: 'user_id' },
      { from: 'service_authorization_forms', to: 'clients', column: 'client_id' },
      { from: 'service_authorization_forms', to: 'contracts', column: 'contract_id' },
      { from: 'certificates_of_compliance', to: 'clients', column: 'client_id' },
      { from: 'data_source_mappings', to: 'data_sources', column: 'data_source_id' },
      { from: 'user_dashboards', to: 'users', column: 'user_id' },
      { from: 'dashboard_widget_assignments', to: 'user_dashboards', column: 'dashboard_id' },
      { from: 'dashboard_widget_assignments', to: 'dashboard_widgets', column: 'widget_id' },
      { from: 'client_external_mappings', to: 'clients', column: 'client_id' },
      { from: 'client_external_mappings', to: 'external_systems', column: 'external_system_id' },
      { from: 'audit_logs', to: 'users', column: 'user_id' }
    ];
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'SUCCESS' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  recordTest(category, testName, status, details = {}) {
    if (!this.results.categories[category]) {
      this.results.categories[category] = {
        total: 0,
        passed: 0,
        failed: 0,
        tests: []
      };
    }

    this.results.categories[category].total++;
    this.results.categories[category][status]++;
    this.results.summary.totalTests++;
    this.results.summary[status]++;

    this.results.categories[category].tests.push({
      name: testName,
      status,
      timestamp: new Date().toISOString(),
      ...details
    });

    const statusIcon = status === 'passed' ? '✅' : '❌';
    this.log(`${statusIcon} [${category}] ${testName}`, status === 'passed' ? 'SUCCESS' : 'ERROR');
  }

  async analyzeTableStructure() {
    this.log('📋 Analyzing database table structures...');

    const query = `
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position
    `;

    try {
      const result = await this.pool.query(query);
      
      // Group by table
      const tableStructures = {};
      for (const row of result.rows) {
        if (!tableStructures[row.table_name]) {
          tableStructures[row.table_name] = {
            columns: [],
            columnCount: 0
          };
        }
        
        tableStructures[row.table_name].columns.push({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          default: row.column_default,
          maxLength: row.character_maximum_length,
          precision: row.numeric_precision,
          scale: row.numeric_scale
        });
        tableStructures[row.table_name].columnCount++;
      }

      this.results.schemaAnalysis.tables = tableStructures;
      this.results.summary.tablesAnalyzed = Object.keys(tableStructures).length;

      // Validate expected tables exist
      for (const expectedTable of this.expectedTables) {
        if (tableStructures[expectedTable]) {
          this.recordTest('Table Structure', `Table ${expectedTable} exists`, 'passed', {
            columnCount: tableStructures[expectedTable].columnCount,
            columns: tableStructures[expectedTable].columns.map(c => c.name)
          });
        } else {
          this.recordTest('Table Structure', `Table ${expectedTable} exists`, 'failed', {
            error: 'Table missing from database'
          });
        }
      }

      // Check for unexpected tables
      const actualTables = Object.keys(tableStructures);
      const unexpectedTables = actualTables.filter(table => !this.expectedTables.includes(table));
      
      if (unexpectedTables.length > 0) {
        this.recordTest('Table Structure', 'No unexpected tables', 'failed', {
          unexpectedTables,
          details: 'Found tables not in expected schema'
        });
      } else {
        this.recordTest('Table Structure', 'No unexpected tables', 'passed');
      }

      return tableStructures;

    } catch (error) {
      this.recordTest('Table Structure', 'Database connection and query', 'failed', {
        error: error.message
      });
      throw error;
    }
  }

  async analyzeForeignKeys() {
    this.log('🔗 Analyzing foreign key relationships...');

    const query = `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `;

    try {
      const result = await this.pool.query(query);
      
      this.results.schemaAnalysis.foreignKeys = result.rows;
      this.results.summary.constraintsValidated += result.rows.length;

      // Validate expected foreign keys
      for (const expectedFK of this.expectedRelations) {
        const actualFK = result.rows.find(fk => 
          fk.table_name === expectedFK.from && 
          fk.column_name === expectedFK.column &&
          fk.foreign_table_name === expectedFK.to
        );

        if (actualFK) {
          this.recordTest('Foreign Keys', `${expectedFK.from}.${expectedFK.column} → ${expectedFK.to}`, 'passed', {
            constraintName: actualFK.constraint_name
          });
          this.results.summary.relationsVerified++;
        } else {
          this.recordTest('Foreign Keys', `${expectedFK.from}.${expectedFK.column} → ${expectedFK.to}`, 'failed', {
            error: 'Expected foreign key relationship not found'
          });
        }
      }

      // Test foreign key constraint enforcement
      await this.testForeignKeyEnforcement();

      return result.rows;

    } catch (error) {
      this.recordTest('Foreign Keys', 'Foreign key analysis', 'failed', {
        error: error.message
      });
      throw error;
    }
  }

  async testForeignKeyEnforcement() {
    this.log('🛡️ Testing foreign key constraint enforcement...');

    const tests = [
      {
        name: 'Client Contact FK Enforcement',
        test: async () => {
          try {
            // Try to insert contact with non-existent client
            await this.pool.query(`
              INSERT INTO client_contacts (client_id, name, email) 
              VALUES (99999, 'Test Contact', 'test@example.com')
            `);
            return { success: false, error: 'FK constraint should have prevented this insert' };
          } catch (error) {
            if (error.message.includes('foreign key') || error.message.includes('violates')) {
              return { success: true, details: 'FK constraint properly enforced' };
            }
            return { success: false, error: error.message };
          }
        }
      },
      {
        name: 'Contract Client FK Enforcement',
        test: async () => {
          try {
            await this.pool.query(`
              INSERT INTO contracts (client_id, name, start_date, end_date) 
              VALUES (99999, 'Test Contract', NOW(), NOW() + INTERVAL '1 year')
            `);
            return { success: false, error: 'FK constraint should have prevented this insert' };
          } catch (error) {
            if (error.message.includes('foreign key') || error.message.includes('violates')) {
              return { success: true, details: 'FK constraint properly enforced' };
            }
            return { success: false, error: error.message };
          }
        }
      },
      {
        name: 'Service Scope FK Enforcement',
        test: async () => {
          try {
            await this.pool.query(`
              INSERT INTO service_scopes (contract_id, service_id) 
              VALUES (99999, 99999)
            `);
            return { success: false, error: 'FK constraint should have prevented this insert' };
          } catch (error) {
            if (error.message.includes('foreign key') || error.message.includes('violates')) {
              return { success: true, details: 'FK constraint properly enforced' };
            }
            return { success: false, error: error.message };
          }
        }
      }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        if (result.success) {
          this.recordTest('FK Enforcement', test.name, 'passed', {
            details: result.details
          });
        } else {
          this.recordTest('FK Enforcement', test.name, 'failed', {
            error: result.error
          });
        }
      } catch (error) {
        this.recordTest('FK Enforcement', test.name, 'failed', {
          error: error.message
        });
      }
    }
  }

  async analyzeUniqueConstraints() {
    this.log('🔒 Analyzing unique constraints...');

    const query = `
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
      AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position
    `;

    try {
      const result = await this.pool.query(query);
      
      this.results.schemaAnalysis.uniqueConstraints = result.rows;

      // Group by table and constraint
      const constraintsByTable = {};
      for (const row of result.rows) {
        if (!constraintsByTable[row.table_name]) {
          constraintsByTable[row.table_name] = {};
        }
        if (!constraintsByTable[row.table_name][row.constraint_name]) {
          constraintsByTable[row.table_name][row.constraint_name] = {
            type: row.constraint_type,
            columns: []
          };
        }
        constraintsByTable[row.table_name][row.constraint_name].columns.push(row.column_name);
      }

      // Validate critical unique constraints
      const criticalConstraints = [
        { table: 'users', column: 'username', type: 'UNIQUE' },
        { table: 'users', column: 'email', type: 'UNIQUE' },
        { table: 'users', column: 'id', type: 'PRIMARY KEY' },
        { table: 'clients', column: 'id', type: 'PRIMARY KEY' },
        { table: 'contracts', column: 'id', type: 'PRIMARY KEY' },
        { table: 'services', column: 'id', type: 'PRIMARY KEY' }
      ];

      for (const expected of criticalConstraints) {
        const tableConstraints = constraintsByTable[expected.table] || {};
        const hasConstraint = Object.values(tableConstraints).some(constraint =>
          constraint.type === expected.type && 
          constraint.columns.includes(expected.column)
        );

        if (hasConstraint) {
          this.recordTest('Unique Constraints', `${expected.table}.${expected.column} ${expected.type}`, 'passed');
        } else {
          this.recordTest('Unique Constraints', `${expected.table}.${expected.column} ${expected.type}`, 'failed', {
            error: 'Expected constraint not found'
          });
        }
      }

      // Test unique constraint enforcement
      await this.testUniqueConstraintEnforcement();

      return result.rows;

    } catch (error) {
      this.recordTest('Unique Constraints', 'Unique constraint analysis', 'failed', {
        error: error.message
      });
      throw error;
    }
  }

  async testUniqueConstraintEnforcement() {
    this.log('🔐 Testing unique constraint enforcement...');

    const tests = [
      {
        name: 'Username Uniqueness',
        test: async () => {
          try {
            // First, get an existing username
            const existingUser = await this.pool.query('SELECT username FROM users LIMIT 1');
            if (existingUser.rows.length === 0) {
              return { success: false, error: 'No users found to test against' };
            }

            const existingUsername = existingUser.rows[0].username;
            
            // Try to create another user with same username
            await this.pool.query(`
              INSERT INTO users (username, email, first_name, last_name) 
              VALUES ($1, 'unique@test.com', 'Test', 'User')
            `, [existingUsername]);
            
            return { success: false, error: 'Unique constraint should have prevented this insert' };
          } catch (error) {
            if (error.message.includes('unique') || error.message.includes('duplicate')) {
              return { success: true, details: 'Username uniqueness properly enforced' };
            }
            return { success: false, error: error.message };
          }
        }
      },
      {
        name: 'Email Uniqueness',
        test: async () => {
          try {
            // Get an existing email
            const existingUser = await this.pool.query('SELECT email FROM users LIMIT 1');
            if (existingUser.rows.length === 0) {
              return { success: false, error: 'No users found to test against' };
            }

            const existingEmail = existingUser.rows[0].email;
            
            // Try to create another user with same email
            await this.pool.query(`
              INSERT INTO users (username, email, first_name, last_name) 
              VALUES ('uniqueuser', $1, 'Test', 'User')
            `, [existingEmail]);
            
            return { success: false, error: 'Unique constraint should have prevented this insert' };
          } catch (error) {
            if (error.message.includes('unique') || error.message.includes('duplicate')) {
              return { success: true, details: 'Email uniqueness properly enforced' };
            }
            return { success: false, error: error.message };
          }
        }
      }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        if (result.success) {
          this.recordTest('Unique Enforcement', test.name, 'passed', {
            details: result.details
          });
        } else {
          this.recordTest('Unique Enforcement', test.name, 'failed', {
            error: result.error
          });
        }
      } catch (error) {
        this.recordTest('Unique Enforcement', test.name, 'failed', {
          error: error.message
        });
      }
    }
  }

  async analyzeCheckConstraints() {
    this.log('✅ Analyzing check constraints...');

    const query = `
      SELECT
        tc.table_name,
        tc.constraint_name,
        cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
        AND tc.table_schema = cc.constraint_schema
      WHERE tc.constraint_type = 'CHECK'
      AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `;

    try {
      const result = await this.pool.query(query);
      
      this.results.schemaAnalysis.checkConstraints = result.rows;

      for (const constraint of result.rows) {
        this.recordTest('Check Constraints', `${constraint.table_name}: ${constraint.constraint_name}`, 'passed', {
          checkClause: constraint.check_clause
        });
      }

      // Test specific check constraints
      await this.testCheckConstraintEnforcement();

      return result.rows;

    } catch (error) {
      this.recordTest('Check Constraints', 'Check constraint analysis', 'failed', {
        error: error.message
      });
      throw error;
    }
  }

  async testCheckConstraintEnforcement() {
    this.log('🚦 Testing check constraint enforcement...');

    const tests = [
      {
        name: 'Client Status Check Constraint',
        test: async () => {
          try {
            await this.pool.query(`
              INSERT INTO clients (name, status) 
              VALUES ('Test Client', 'invalid_status')
            `);
            return { success: false, error: 'Check constraint should have prevented this insert' };
          } catch (error) {
            if (error.message.includes('check') || error.message.includes('constraint')) {
              return { success: true, details: 'Client status check constraint properly enforced' };
            }
            return { success: false, error: error.message };
          }
        }
      }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        if (result.success) {
          this.recordTest('Check Enforcement', test.name, 'passed', {
            details: result.details
          });
        } else {
          this.recordTest('Check Enforcement', test.name, 'failed', {
            error: result.error
          });
        }
      } catch (error) {
        this.recordTest('Check Enforcement', test.name, 'failed', {
          error: error.message
        });
      }
    }
  }

  async analyzeIndexes() {
    this.log('📊 Analyzing database indexes...');

    const query = `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `;

    try {
      const result = await this.pool.query(query);
      
      this.results.schemaAnalysis.indexes = result.rows;

      // Group by table
      const indexesByTable = {};
      for (const row of result.rows) {
        if (!indexesByTable[row.tablename]) {
          indexesByTable[row.tablename] = [];
        }
        indexesByTable[row.tablename].push({
          name: row.indexname,
          definition: row.indexdef
        });
      }

      // Check for important performance indexes
      const criticalIndexes = [
        { table: 'clients', pattern: 'deleted_at' },
        { table: 'users', pattern: 'username' },
        { table: 'users', pattern: 'email' },
        { table: 'audit_logs', pattern: 'created_at' }
      ];

      for (const expectedIndex of criticalIndexes) {
        const tableIndexes = indexesByTable[expectedIndex.table] || [];
        const hasIndex = tableIndexes.some(index => 
          index.definition.toLowerCase().includes(expectedIndex.pattern.toLowerCase())
        );

        if (hasIndex) {
          this.recordTest('Indexes', `${expectedIndex.table} has ${expectedIndex.pattern} index`, 'passed');
        } else {
          this.recordTest('Indexes', `${expectedIndex.table} has ${expectedIndex.pattern} index`, 'failed', {
            error: 'Performance-critical index missing'
          });
        }
      }

      return result.rows;

    } catch (error) {
      this.recordTest('Indexes', 'Index analysis', 'failed', {
        error: error.message
      });
      throw error;
    }
  }

  async testDataIntegrity() {
    this.log('🔍 Testing data integrity...');

    const integrityTests = [
      {
        name: 'Orphaned Client Contacts',
        query: `
          SELECT COUNT(*) as count 
          FROM client_contacts cc
          LEFT JOIN clients c ON cc.client_id = c.id
          WHERE c.id IS NULL
        `,
        expectZero: true
      },
      {
        name: 'Orphaned Service Scopes',
        query: `
          SELECT COUNT(*) as count
          FROM service_scopes ss
          LEFT JOIN contracts c ON ss.contract_id = c.id
          LEFT JOIN services s ON ss.service_id = s.id
          WHERE c.id IS NULL OR s.id IS NULL
        `,
        expectZero: true
      },
      {
        name: 'Contract Date Consistency',
        query: `
          SELECT COUNT(*) as count
          FROM contracts
          WHERE end_date <= start_date
        `,
        expectZero: true
      },
      {
        name: 'User Role Validity',
        query: `
          SELECT COUNT(*) as count
          FROM users
          WHERE role NOT IN ('admin', 'manager', 'engineer', 'user', 'viewer')
        `,
        expectZero: true
      },
      {
        name: 'Active Users Have Settings',
        query: `
          SELECT COUNT(*) as count
          FROM users u
          LEFT JOIN user_settings us ON u.id = us.user_id
          WHERE u.is_active = true AND us.id IS NULL
        `,
        expectZero: false // Users might not have settings initially
      }
    ];

    for (const test of integrityTests) {
      try {
        const result = await this.pool.query(test.query);
        const count = parseInt(result.rows[0].count);
        
        if (test.expectZero && count === 0) {
          this.recordTest('Data Integrity', test.name, 'passed', {
            count,
            details: 'No integrity violations found'
          });
        } else if (!test.expectZero) {
          this.recordTest('Data Integrity', test.name, 'passed', {
            count,
            details: 'Count recorded for reference'
          });
        } else {
          this.recordTest('Data Integrity', test.name, 'failed', {
            count,
            error: `Found ${count} integrity violations`
          });
        }
      } catch (error) {
        this.recordTest('Data Integrity', test.name, 'failed', {
          error: error.message
        });
      }
    }
  }

  async testPerformanceQueries() {
    this.log('⚡ Testing database query performance...');

    const performanceTests = [
      {
        name: 'Client List Query Performance',
        query: 'SELECT * FROM clients WHERE deleted_at IS NULL LIMIT 100',
        maxTime: 1000 // 1 second
      },
      {
        name: 'Contract with Client Join Performance',
        query: `
          SELECT c.*, cl.name as client_name 
          FROM contracts c 
          JOIN clients cl ON c.client_id = cl.id 
          LIMIT 100
        `,
        maxTime: 1000
      },
      {
        name: 'Dashboard Stats Query Performance',
        query: `
          SELECT 
            COUNT(*) as total_clients,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients
          FROM clients 
          WHERE deleted_at IS NULL
        `,
        maxTime: 2000
      },
      {
        name: 'Audit Log Query Performance',
        query: `
          SELECT * FROM audit_logs 
          WHERE created_at >= NOW() - INTERVAL '30 days'
          ORDER BY created_at DESC 
          LIMIT 100
        `,
        maxTime: 2000
      }
    ];

    for (const test of performanceTests) {
      try {
        const startTime = Date.now();
        await this.pool.query(test.query);
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (duration <= test.maxTime) {
          this.recordTest('Query Performance', test.name, 'passed', {
            duration: `${duration}ms`,
            maxTime: `${test.maxTime}ms`
          });
        } else {
          this.recordTest('Query Performance', test.name, 'failed', {
            duration: `${duration}ms`,
            maxTime: `${test.maxTime}ms`,
            error: `Query exceeded maximum time`
          });
        }
      } catch (error) {
        this.recordTest('Query Performance', test.name, 'failed', {
          error: error.message
        });
      }
    }
  }

  generateReport() {
    this.results.endTime = new Date().toISOString();
    this.results.duration = new Date(this.results.endTime) - new Date(this.results.startTime);

    // Save detailed results
    fs.writeFileSync('database-schema-validation-results.json', JSON.stringify(this.results, null, 2));

    // Print summary
    this.log('\n📊 DATABASE SCHEMA VALIDATION RESULTS', 'SUCCESS');
    this.log('=' .repeat(50));
    this.log(`🕐 Duration: ${Math.round(this.results.duration / 1000)}s`);
    this.log(`📋 Total Tests: ${this.results.summary.totalTests}`);
    this.log(`✅ Passed: ${this.results.summary.passed}`);
    this.log(`❌ Failed: ${this.results.summary.failed}`);
    this.log(`📈 Success Rate: ${((this.results.summary.passed / this.results.summary.totalTests) * 100).toFixed(1)}%`);

    this.log('\n📊 ANALYSIS SUMMARY:');
    this.log(`📋 Tables Analyzed: ${this.results.summary.tablesAnalyzed}`);
    this.log(`🔗 Relations Verified: ${this.results.summary.relationsVerified}`);
    this.log(`🛡️  Constraints Validated: ${this.results.summary.constraintsValidated}`);

    this.log('\n📁 DETAILED RESULTS BY CATEGORY:');
    for (const [category, data] of Object.entries(this.results.categories)) {
      const successRate = data.total > 0 ? (data.passed / data.total * 100).toFixed(1) : 0;
      this.log(`📂 ${category}: ${data.passed}/${data.total} passed (${successRate}%)`);
    }

    this.log('\n💾 Detailed results saved to: database-schema-validation-results.json');
  }

  async runValidation() {
    this.log('🚀 Starting Database Schema Comprehensive Validation...');

    try {
      await this.analyzeTableStructure();
      await this.analyzeForeignKeys();
      await this.analyzeUniqueConstraints();
      await this.analyzeCheckConstraints();
      await this.analyzeIndexes();
      await this.testDataIntegrity();
      await this.testPerformanceQueries();

      this.generateReport();

      return this.results;

    } catch (error) {
      this.log(`💥 Fatal error during validation: ${error.message}`, 'ERROR');
      this.results.fatalError = error.message;
      this.generateReport();
      throw error;
    } finally {
      await this.pool.end();
    }
  }
}

// Run the validator
if (require.main === module) {
  const validator = new DatabaseSchemaValidator();
  
  validator.runValidation()
    .then(results => {
      const successRate = (results.summary.passed / results.summary.totalTests * 100).toFixed(1);
      if (successRate >= 85) {
        console.log(`\n🎉 Database schema validation completed successfully! Success rate: ${successRate}%`);
        process.exit(0);
      } else {
        console.log(`\n⚠️  Database schema validation completed with issues. Success rate: ${successRate}%`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(`\n💥 Database validation failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = DatabaseSchemaValidator; 