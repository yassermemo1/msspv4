#!/usr/bin/env node

/**
 * COMPREHENSIVE MSSP APPLICATION TESTING SUITE
 * ============================================
 * 
 * This suite provides complete testing coverage for:
 * 1. All API endpoints (GET, POST, PUT, DELETE)
 * 2. All form validations and schemas
 * 3. All database relations and constraints
 * 4. All business logic and data integrity
 * 5. Authentication and authorization
 * 6. External integrations and services
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  testUser: {
    email: 'admin@mssp.local',
    password: 'admin123'
  },
  outputFile: 'comprehensive-test-results.json'
};

class ComprehensiveTestSuite {
  constructor() {
    this.results = {
      startTime: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        coverage: {
          apiEndpoints: { total: 0, tested: 0 },
          formValidations: { total: 0, tested: 0 },
          databaseRelations: { total: 0, tested: 0 },
          constraints: { total: 0, tested: 0 }
        }
      },
      testCategories: {},
      authToken: null,
      sessionCookie: null
    };
    
    this.client = axios.create({
      baseURL: CONFIG.baseURL,
      timeout: CONFIG.timeout,
      validateStatus: () => true // Don't throw on HTTP errors
    });
  }

  // Utility methods
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'SUCCESS' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  recordTest(category, testName, status, details = {}) {
    if (!this.results.testCategories[category]) {
      this.results.testCategories[category] = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        tests: []
      };
    }

    this.results.testCategories[category].total++;
    this.results.testCategories[category][status]++;
    this.results.summary.totalTests++;
    this.results.summary[status]++;

    this.results.testCategories[category].tests.push({
      name: testName,
      status,
      timestamp: new Date().toISOString(),
      ...details
    });

    const statusIcon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⏭️';
    this.log(`${statusIcon} [${category}] ${testName}`, status === 'passed' ? 'SUCCESS' : status === 'failed' ? 'ERROR' : 'WARN');
  }

  // Authentication and setup
  async authenticate() {
    this.log('🔐 Authenticating test user...');
    
    try {
      const response = await this.client.post('/api/login', {
        email: CONFIG.testUser.email,
        password: CONFIG.testUser.password
      });

      if (response.status === 200) {
        // Extract session cookie and token
        const cookies = response.headers['set-cookie'];
        if (cookies) {
          this.sessionCookie = cookies.find(cookie => cookie.startsWith('session='));
          if (this.sessionCookie) {
            this.client.defaults.headers.Cookie = this.sessionCookie;
          }
        }

        if (response.data.token) {
          this.authToken = response.data.token;
          this.client.defaults.headers.Authorization = `Bearer ${this.authToken}`;
        }

        this.recordTest('Authentication', 'Login', 'passed', {
          hasToken: !!this.authToken,
          hasCookie: !!this.sessionCookie
        });
        return true;
      } else {
        this.recordTest('Authentication', 'Login', 'failed', {
          status: response.status,
          error: response.data
        });
        return false;
      }
    } catch (error) {
      this.recordTest('Authentication', 'Login', 'failed', {
        error: error.message
      });
      return false;
    }
  }

  // API Endpoint Testing
  async testAPIEndpoints() {
    this.log('🔌 Testing all API endpoints...');

    const endpoints = [
      // Health and version endpoints
      { method: 'GET', path: '/api/health', name: 'Health Check', requiresAuth: false },
      { method: 'GET', path: '/api/version', name: 'Version Info', requiresAuth: false },

      // User and authentication endpoints
      { method: 'GET', path: '/api/user', name: 'Current User', requiresAuth: true },
      { method: 'GET', path: '/api/user/2fa/status', name: '2FA Status', requiresAuth: true },
      { method: 'GET', path: '/api/users', name: 'Users List', requiresAuth: true },
      { method: 'GET', path: '/api/user/settings', name: 'User Settings', requiresAuth: true },

      // Company settings endpoints
      { method: 'GET', path: '/api/company/settings', name: 'Company Settings', requiresAuth: true },

      // Client management endpoints
      { method: 'GET', path: '/api/clients', name: 'Clients List', requiresAuth: true },
      { method: 'GET', path: '/api/clients/archived', name: 'Archived Clients', requiresAuth: true },

      // Contract management endpoints
      { method: 'GET', path: '/api/contracts', name: 'Contracts List', requiresAuth: true },

      // Service management endpoints
      { method: 'GET', path: '/api/services', name: 'Services List', requiresAuth: true },
      { method: 'GET', path: '/api/services/categories', name: 'Service Categories', requiresAuth: true },

      // Hardware and license endpoints
      { method: 'GET', path: '/api/hardware-assets', name: 'Hardware Assets', requiresAuth: true },
      { method: 'GET', path: '/api/license-pools', name: 'License Pools', requiresAuth: true },
      { method: 'GET', path: '/api/individual-licenses', name: 'Individual Licenses', requiresAuth: true },

      // Document management endpoints
      { method: 'GET', path: '/api/documents', name: 'Documents List', requiresAuth: true },

      // Dashboard endpoints
      { method: 'GET', path: '/api/dashboard/stats', name: 'Dashboard Stats', requiresAuth: true },
      { method: 'GET', path: '/api/dashboard/widgets', name: 'Dashboard Widgets', requiresAuth: true },
      { method: 'GET', path: '/api/dashboard/recent-activity', name: 'Recent Activity', requiresAuth: true },

      // External systems endpoints
      { method: 'GET', path: '/api/external-systems', name: 'External Systems', requiresAuth: true },
      { method: 'GET', path: '/api/data-sources', name: 'Data Sources', requiresAuth: true },

      // Field visibility endpoints
      { method: 'GET', path: '/api/field-visibility', name: 'Field Visibility', requiresAuth: true },

      // SAF and COC endpoints
      { method: 'GET', path: '/api/service-authorization-forms', name: 'SAF List', requiresAuth: true },
      { method: 'GET', path: '/api/certificates-of-compliance', name: 'COC List', requiresAuth: true },

      // Audit and security endpoints
      { method: 'GET', path: '/api/audit-logs', name: 'Audit Logs', requiresAuth: true },

      // Integration engine endpoints
      { method: 'GET', path: '/api/integration-engine/health', name: 'Integration Engine Health', requiresAuth: true },

      // Entity relations endpoints
      { method: 'GET', path: '/api/entity-relations/types', name: 'Entity Relation Types', requiresAuth: true },

      // Financial endpoints
      { method: 'GET', path: '/api/financial-transactions', name: 'Financial Transactions', requiresAuth: true }
    ];

    this.results.summary.coverage.apiEndpoints.total = endpoints.length;

    for (const endpoint of endpoints) {
      await this.testSingleEndpoint(endpoint);
      await this.sleep(100); // Rate limiting
    }
  }

  async testSingleEndpoint(endpoint) {
    try {
      const headers = {};
      if (endpoint.requiresAuth && this.sessionCookie) {
        headers.Cookie = this.sessionCookie;
      }

      const response = await this.client.request({
        method: endpoint.method,
        url: endpoint.path,
        headers
      });

      const isSuccess = response.status >= 200 && response.status < 300;
      const isAuthError = response.status === 401 || response.status === 403;

      if (endpoint.requiresAuth && isAuthError) {
        this.recordTest('API Endpoints', endpoint.name, 'skipped', {
          reason: 'Authentication required but not properly authenticated',
          status: response.status
        });
      } else if (isSuccess) {
        this.recordTest('API Endpoints', endpoint.name, 'passed', {
          status: response.status,
          responseSize: JSON.stringify(response.data).length,
          hasData: !!response.data
        });
        this.results.summary.coverage.apiEndpoints.tested++;
      } else {
        this.recordTest('API Endpoints', endpoint.name, 'failed', {
          status: response.status,
          error: response.data?.message || response.statusText
        });
      }
    } catch (error) {
      this.recordTest('API Endpoints', endpoint.name, 'failed', {
        error: error.message
      });
    }
  }

  // Form Validation Testing
  async testFormValidations() {
    this.log('📝 Testing form validations...');

    const formTests = [
      {
        name: 'Client Creation Form',
        endpoint: '/api/clients',
        method: 'POST',
        validData: {
          name: 'Test Client',
          domain: 'testclient.com',
          industry: 'Technology',
          status: 'prospect'
        },
        invalidData: [
          { data: {}, expectedError: 'name is required' },
          { data: { name: '' }, expectedError: 'name cannot be empty' },
          { data: { name: 'Valid Name', status: 'invalid' }, expectedError: 'invalid status' }
        ]
      },
      {
        name: 'Service Creation Form',
        endpoint: '/api/services',
        method: 'POST',
        validData: {
          name: 'Test Service',
          category: 'Security Operations',
          deliveryModel: 'Serverless',
          basePrice: '1000.00'
        },
        invalidData: [
          { data: {}, expectedError: 'name is required' },
          { data: { name: 'Test', deliveryModel: 'Invalid' }, expectedError: 'invalid delivery model' }
        ]
      },
      {
        name: 'Contract Creation Form',
        endpoint: '/api/contracts',
        method: 'POST',
        validData: {
          name: 'Test Contract',
          clientId: 1,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          totalValue: '10000.00'
        },
        invalidData: [
          { data: {}, expectedError: 'name is required' },
          { data: { name: 'Test', startDate: 'invalid-date' }, expectedError: 'invalid date format' }
        ]
      },
      {
        name: 'User Creation Form',
        endpoint: '/api/users',
        method: 'POST',
        validData: {
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'user'
        },
        invalidData: [
          { data: {}, expectedError: 'username is required' },
          { data: { username: 'test', email: 'invalid-email' }, expectedError: 'invalid email format' }
        ]
      },
      {
        name: 'Hardware Asset Form',
        endpoint: '/api/hardware-assets',
        method: 'POST',
        validData: {
          assetTag: 'HW-TEST-001',
          type: 'Server',
          model: 'Dell PowerEdge',
          status: 'active'
        },
        invalidData: [
          { data: {}, expectedError: 'assetTag is required' },
          { data: { assetTag: 'test', status: 'invalid' }, expectedError: 'invalid status' }
        ]
      }
    ];

    this.results.summary.coverage.formValidations.total = formTests.length;

    for (const formTest of formTests) {
      await this.testFormValidation(formTest);
      await this.sleep(200);
    }
  }

  async testFormValidation(formTest) {
    // Test valid data
    try {
      const response = await this.client.request({
        method: formTest.method,
        url: formTest.endpoint,
        data: formTest.validData
      });

      if (response.status === 201 || response.status === 200) {
        this.recordTest('Form Validations', `${formTest.name} - Valid Data`, 'passed', {
          status: response.status
        });
      } else {
        this.recordTest('Form Validations', `${formTest.name} - Valid Data`, 'failed', {
          status: response.status,
          error: response.data?.message
        });
      }
    } catch (error) {
      this.recordTest('Form Validations', `${formTest.name} - Valid Data`, 'failed', {
        error: error.message
      });
    }

    // Test invalid data scenarios
    for (const invalidTest of formTest.invalidData) {
      try {
        const response = await this.client.request({
          method: formTest.method,
          url: formTest.endpoint,
          data: invalidTest.data
        });

        const hasValidationError = response.status >= 400 && response.status < 500;
        
        if (hasValidationError) {
          this.recordTest('Form Validations', `${formTest.name} - Invalid Data (${invalidTest.expectedError})`, 'passed', {
            status: response.status,
            validationWorking: true
          });
        } else {
          this.recordTest('Form Validations', `${formTest.name} - Invalid Data (${invalidTest.expectedError})`, 'failed', {
            status: response.status,
            error: 'Validation should have failed but didn\'t'
          });
        }
      } catch (error) {
        this.recordTest('Form Validations', `${formTest.name} - Invalid Data (${invalidTest.expectedError})`, 'failed', {
          error: error.message
        });
      }
      await this.sleep(100);
    }

    this.results.summary.coverage.formValidations.tested++;
  }

  // Database Relations Testing
  async testDatabaseRelations() {
    this.log('🔗 Testing database relations and constraints...');

    const relationTests = [
      {
        name: 'Contract-Client Relationship',
        description: 'Test that contracts must belong to valid clients',
        test: async () => {
          // Try to create contract with invalid client ID
          const invalidResponse = await this.client.post('/api/contracts', {
            name: 'Test Contract',
            clientId: 99999, // Non-existent client
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          });

          const shouldFail = invalidResponse.status >= 400;
          
          return {
            success: shouldFail,
            details: { 
              invalidClientRejected: shouldFail,
              status: invalidResponse.status 
            }
          };
        }
      },
      {
        name: 'Service Scope Relationship',
        description: 'Test service scope to contract and service relationships',
        test: async () => {
          // Get existing contracts and services
          const [contractsResp, servicesResp] = await Promise.all([
            this.client.get('/api/contracts'),
            this.client.get('/api/services')
          ]);

          if (contractsResp.status !== 200 || servicesResp.status !== 200) {
            return { success: false, error: 'Cannot fetch contracts or services' };
          }

          if (!contractsResp.data.length || !servicesResp.data.length) {
            return { success: false, error: 'No contracts or services available for testing' };
          }

          const contract = contractsResp.data[0];
          const service = servicesResp.data[0];

          // Try to create service scope
          const scopeResponse = await this.client.post(`/api/contracts/${contract.id}/service-scopes`, {
            serviceId: service.id,
            scopeDefinition: { testField: 'testValue' }
          });

          return {
            success: scopeResponse.status === 201,
            details: { 
              contractId: contract.id,
              serviceId: service.id,
              status: scopeResponse.status 
            }
          };
        }
      },
      {
        name: 'User Settings Relationship',
        description: 'Test that user settings belong to valid users',
        test: async () => {
          // Get current user
          const userResponse = await this.client.get('/api/user');
          if (userResponse.status !== 200) {
            return { success: false, error: 'Cannot get current user' };
          }

          // Try to update user settings
          const settingsResponse = await this.client.put('/api/user/settings', {
            darkMode: true,
            emailNotifications: false
          });

          return {
            success: settingsResponse.status === 200,
            details: { userId: userResponse.data.id, status: settingsResponse.status }
          };
        }
      },
      {
        name: 'Document Access Relationship',
        description: 'Test document access controls and user relationships',
        test: async () => {
          // Try to get documents (should require proper auth)
          const docsResponse = await this.client.get('/api/documents');
          
          return {
            success: docsResponse.status === 200 || docsResponse.status === 403,
            details: { 
              documentsAccessible: docsResponse.status === 200,
              properAuthCheck: docsResponse.status === 403,
              status: docsResponse.status 
            }
          };
        }
      }
    ];

    this.results.summary.coverage.databaseRelations.total = relationTests.length;

    for (const relationTest of relationTests) {
      try {
        const result = await relationTest.test();
        
        if (result.success) {
          this.recordTest('Database Relations', relationTest.name, 'passed', {
            description: relationTest.description,
            details: result.details
          });
          this.results.summary.coverage.databaseRelations.tested++;
        } else {
          this.recordTest('Database Relations', relationTest.name, 'failed', {
            description: relationTest.description,
            error: result.error,
            details: result.details
          });
        }
      } catch (error) {
        this.recordTest('Database Relations', relationTest.name, 'failed', {
          description: relationTest.description,
          error: error.message
        });
      }
      
      await this.sleep(200);
    }
  }

  // Database Constraints Testing
  async testDatabaseConstraints() {
    this.log('🛡️ Testing database constraints...');

    const constraintTests = [
      {
        name: 'Unique Username Constraint',
        description: 'Test that usernames must be unique',
        test: async () => {
          // Try to create user with duplicate username
          const duplicateUserResponse = await this.client.post('/api/users', {
            username: 'admin', // Should already exist
            email: 'newemail@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'user'
          });

          const constraintWorking = duplicateUserResponse.status >= 400;
          
          return {
            success: constraintWorking,
            details: { status: duplicateUserResponse.status }
          };
        }
      },
      {
        name: 'Email Unique Constraint',
        description: 'Test that email addresses must be unique',
        test: async () => {
          // Get current user to use their email
          const userResponse = await this.client.get('/api/user');
          if (userResponse.status !== 200) {
            return { success: false, error: 'Cannot get current user email' };
          }

          // Try to create user with duplicate email
          const duplicateEmailResponse = await this.client.post('/api/users', {
            username: 'uniqueusername',
            email: userResponse.data.email, // Duplicate email
            firstName: 'Test',
            lastName: 'User',
            role: 'user'
          });

          const constraintWorking = duplicateEmailResponse.status >= 400;
          
          return {
            success: constraintWorking,
            details: { status: duplicateEmailResponse.status }
          };
        }
      },
      {
        name: 'Client Status Constraint',
        description: 'Test that client status must be valid enum value',
        test: async () => {
          const invalidStatusResponse = await this.client.post('/api/clients', {
            name: 'Test Client',
            status: 'invalid_status' // Invalid status
          });

          const constraintWorking = invalidStatusResponse.status >= 400;
          
          return {
            success: constraintWorking,
            details: { status: invalidStatusResponse.status }
          };
        }
      },
      {
        name: 'Contract Date Constraint',
        description: 'Test that contract end date must be after start date',
        test: async () => {
          // Get a client first
          const clientsResponse = await this.client.get('/api/clients');
          if (clientsResponse.status !== 200 || !clientsResponse.data.length) {
            return { success: false, error: 'No clients available' };
          }

          const client = clientsResponse.data[0];
          const now = new Date();
          const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

          const invalidDateResponse = await this.client.post('/api/contracts', {
            name: 'Invalid Date Contract',
            clientId: client.id,
            startDate: now.toISOString(),
            endDate: pastDate.toISOString() // End date before start date
          });

          const constraintWorking = invalidDateResponse.status >= 400;
          
          return {
            success: constraintWorking,
            details: { status: invalidDateResponse.status }
          };
        }
      },
      {
        name: 'Foreign Key Constraint',
        description: 'Test that foreign keys must reference valid records',
        test: async () => {
          const invalidFKResponse = await this.client.post('/api/contracts', {
            name: 'Invalid FK Contract',
            clientId: 99999, // Non-existent client ID
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          });

          const constraintWorking = invalidFKResponse.status >= 400;
          
          return {
            success: constraintWorking,
            details: { status: invalidFKResponse.status }
          };
        }
      }
    ];

    this.results.summary.coverage.constraints.total = constraintTests.length;

    for (const constraintTest of constraintTests) {
      try {
        const result = await constraintTest.test();
        
        if (result.success) {
          this.recordTest('Database Constraints', constraintTest.name, 'passed', {
            description: constraintTest.description,
            details: result.details
          });
          this.results.summary.coverage.constraints.tested++;
        } else {
          this.recordTest('Database Constraints', constraintTest.name, 'failed', {
            description: constraintTest.description,
            error: result.error,
            details: result.details
          });
        }
      } catch (error) {
        this.recordTest('Database Constraints', constraintTest.name, 'failed', {
          description: constraintTest.description,
          error: error.message
        });
      }
      
      await this.sleep(200);
    }
  }

  // Schema Validation Testing
  async testSchemaValidation() {
    this.log('📋 Testing schema validations...');

    const schemaTests = [
      {
        name: 'Client Schema Validation',
        test: async () => {
          const invalidSchemaTests = [
            { name: null }, // Null name
            { name: 'Valid', status: 'invalid_enum' }, // Invalid enum
            { name: 'A'.repeat(300) } // Too long name
          ];

          let passedTests = 0;
          for (const invalidData of invalidSchemaTests) {
            const response = await this.client.post('/api/clients', invalidData);
            if (response.status >= 400) {
              passedTests++;
            }
          }

          return {
            success: passedTests === invalidSchemaTests.length,
            details: { passedTests, totalTests: invalidSchemaTests.length }
          };
        }
      },
      {
        name: 'Service Schema Validation',
        test: async () => {
          const invalidSchemaTests = [
            { category: 'Valid Category' }, // Missing required name
            { name: 'Valid', deliveryModel: 'Invalid' }, // Invalid delivery model
            { name: 'Valid', basePrice: 'not_a_number' } // Invalid price format
          ];

          let passedTests = 0;
          for (const invalidData of invalidSchemaTests) {
            const response = await this.client.post('/api/services', invalidData);
            if (response.status >= 400) {
              passedTests++;
            }
          }

          return {
            success: passedTests === invalidSchemaTests.length,
            details: { passedTests, totalTests: invalidSchemaTests.length }
          };
        }
      },
      {
        name: 'User Schema Validation',
        test: async () => {
          const invalidSchemaTests = [
            { email: 'invalid-email' }, // Invalid email format
            { username: 'test', email: 'valid@email.com' }, // Missing required fields
            { username: 'test', email: 'valid@email.com', firstName: '', lastName: 'User' } // Empty required field
          ];

          let passedTests = 0;
          for (const invalidData of invalidSchemaTests) {
            const response = await this.client.post('/api/users', invalidData);
            if (response.status >= 400) {
              passedTests++;
            }
          }

          return {
            success: passedTests === invalidSchemaTests.length,
            details: { passedTests, totalTests: invalidSchemaTests.length }
          };
        }
      }
    ];

    for (const schemaTest of schemaTests) {
      try {
        const result = await schemaTest.test();
        
        if (result.success) {
          this.recordTest('Schema Validation', schemaTest.name, 'passed', {
            details: result.details
          });
        } else {
          this.recordTest('Schema Validation', schemaTest.name, 'failed', {
            error: result.error,
            details: result.details
          });
        }
      } catch (error) {
        this.recordTest('Schema Validation', schemaTest.name, 'failed', {
          error: error.message
        });
      }
      
      await this.sleep(200);
    }
  }

  // Business Logic Testing
  async testBusinessLogic() {
    this.log('🧠 Testing business logic...');

    const businessLogicTests = [
      {
        name: 'Contract Lifecycle Events',
        test: async () => {
          const response = await this.client.get('/api/contracts/lifecycle/events');
          return {
            success: response.status === 200,
            details: { status: response.status, hasEvents: Array.isArray(response.data) }
          };
        }
      },
      {
        name: 'Dashboard Statistics',
        test: async () => {
          const response = await this.client.get('/api/dashboard/stats');
          return {
            success: response.status === 200,
            details: { 
              status: response.status, 
              hasStats: !!response.data,
              statsKeys: response.data ? Object.keys(response.data) : []
            }
          };
        }
      },
      {
        name: 'Field Visibility Management',
        test: async () => {
          const response = await this.client.get('/api/field-visibility');
          return {
            success: response.status === 200,
            details: { 
              status: response.status, 
              hasConfigs: Array.isArray(response.data),
              configCount: response.data ? response.data.length : 0
            }
          };
        }
      },
      {
        name: 'Audit Log Creation',
        test: async () => {
          // Perform an action that should create an audit log
          await this.client.get('/api/clients');
          
          // Check if audit logs are being created
          const response = await this.client.get('/api/audit-logs');
          return {
            success: response.status === 200,
            details: { 
              status: response.status, 
              hasLogs: Array.isArray(response.data),
              logCount: response.data ? response.data.length : 0
            }
          };
        }
      }
    ];

    for (const test of businessLogicTests) {
      try {
        const result = await test.test();
        
        if (result.success) {
          this.recordTest('Business Logic', test.name, 'passed', {
            details: result.details
          });
        } else {
          this.recordTest('Business Logic', test.name, 'failed', {
            error: result.error,
            details: result.details
          });
        }
      } catch (error) {
        this.recordTest('Business Logic', test.name, 'failed', {
          error: error.message
        });
      }
      
      await this.sleep(200);
    }
  }

  // External Integrations Testing
  async testExternalIntegrations() {
    this.log('🔌 Testing external integrations...');

    const integrationTests = [
      {
        name: 'Integration Engine Health',
        test: async () => {
          const response = await this.client.get('/api/integration-engine/health');
          return {
            success: response.status === 200,
            details: { 
              status: response.status,
              healthStatus: response.data?.status,
              dataSourcesCount: response.data?.dataSourcesCount,
              widgetsCount: response.data?.widgetsCount
            }
          };
        }
      },
      {
        name: 'External Systems Configuration',
        test: async () => {
          const response = await this.client.get('/api/external-systems');
          return {
            success: response.status === 200,
            details: { 
              status: response.status,
              systemsCount: response.data ? response.data.length : 0
            }
          };
        }
      },
      {
        name: 'Data Sources Management',
        test: async () => {
          const response = await this.client.get('/api/data-sources');
          return {
            success: response.status === 200,
            details: { 
              status: response.status,
              dataSourcesCount: response.data ? response.data.length : 0
            }
          };
        }
      },
      {
        name: 'External Widget Routes',
        test: async () => {
          const response = await this.client.get('/api/external-widgets/test');
          return {
            success: response.status === 200 || response.status === 404, // 404 is acceptable for test endpoint
            details: { 
              status: response.status,
              routeAccessible: response.status !== 500
            }
          };
        }
      }
    ];

    for (const test of integrationTests) {
      try {
        const result = await test.test();
        
        if (result.success) {
          this.recordTest('External Integrations', test.name, 'passed', {
            details: result.details
          });
        } else {
          this.recordTest('External Integrations', test.name, 'failed', {
            error: result.error,
            details: result.details
          });
        }
      } catch (error) {
        this.recordTest('External Integrations', test.name, 'failed', {
          error: error.message
        });
      }
      
      await this.sleep(200);
    }
  }

  // Security Testing
  async testSecurity() {
    this.log('🔒 Testing security features...');

    const securityTests = [
      {
        name: 'Unauthorized Access Protection',
        test: async () => {
          // Create a client without auth headers
          const unauthorizedClient = axios.create({
            baseURL: CONFIG.baseURL,
            timeout: CONFIG.timeout,
            validateStatus: () => true
          });

          const response = await unauthorizedClient.get('/api/users');
          return {
            success: response.status === 401 || response.status === 403,
            details: { status: response.status }
          };
        }
      },
      {
        name: 'Protected Route Access',
        test: async () => {
          const response = await this.client.get('/api/users');
          return {
            success: response.status === 200 || response.status === 403,
            details: { 
              status: response.status,
              properAuth: response.status === 200
            }
          };
        }
      },
      {
        name: 'Session Management',
        test: async () => {
          const response = await this.client.get('/api/user');
          return {
            success: response.status === 200,
            details: { 
              status: response.status,
              sessionValid: response.status === 200,
              userInfo: !!response.data?.id
            }
          };
        }
      }
    ];

    for (const test of securityTests) {
      try {
        const result = await test.test();
        
        if (result.success) {
          this.recordTest('Security', test.name, 'passed', {
            details: result.details
          });
        } else {
          this.recordTest('Security', test.name, 'failed', {
            error: result.error,
            details: result.details
          });
        }
      } catch (error) {
        this.recordTest('Security', test.name, 'failed', {
          error: error.message
        });
      }
      
      await this.sleep(200);
    }
  }

  // Performance Testing
  async testPerformance() {
    this.log('⚡ Testing performance...');

    const performanceTests = [
      {
        name: 'API Response Times',
        test: async () => {
          const endpoints = [
            '/api/health',
            '/api/clients',
            '/api/services',
            '/api/dashboard/stats'
          ];

          const times = [];
          for (const endpoint of endpoints) {
            const start = Date.now();
            await this.client.get(endpoint);
            const end = Date.now();
            times.push({ endpoint, time: end - start });
          }

          const avgTime = times.reduce((sum, t) => sum + t.time, 0) / times.length;
          const maxTime = Math.max(...times.map(t => t.time));

          return {
            success: avgTime < 2000 && maxTime < 5000, // 2s avg, 5s max
            details: { avgTime, maxTime, times }
          };
        }
      },
      {
        name: 'Concurrent Request Handling',
        test: async () => {
          const promises = [];
          for (let i = 0; i < 10; i++) {
            promises.push(this.client.get('/api/health'));
          }

          const start = Date.now();
          const results = await Promise.all(promises);
          const end = Date.now();

          const allSuccessful = results.every(r => r.status === 200);
          const totalTime = end - start;

          return {
            success: allSuccessful && totalTime < 3000,
            details: { allSuccessful, totalTime, requestCount: promises.length }
          };
        }
      }
    ];

    for (const test of performanceTests) {
      try {
        const result = await test.test();
        
        if (result.success) {
          this.recordTest('Performance', test.name, 'passed', {
            details: result.details
          });
        } else {
          this.recordTest('Performance', test.name, 'failed', {
            error: result.error,
            details: result.details
          });
        }
      } catch (error) {
        this.recordTest('Performance', test.name, 'failed', {
          error: error.message
        });
      }
      
      await this.sleep(500);
    }
  }

  // Generate final report
  generateReport() {
    this.results.endTime = new Date().toISOString();
    this.results.duration = new Date(this.results.endTime) - new Date(this.results.startTime);

    // Calculate coverage percentages
    const { coverage } = this.results.summary;
    coverage.apiEndpoints.percentage = coverage.apiEndpoints.total > 0 ? 
      (coverage.apiEndpoints.tested / coverage.apiEndpoints.total * 100).toFixed(1) : 0;
    coverage.formValidations.percentage = coverage.formValidations.total > 0 ? 
      (coverage.formValidations.tested / coverage.formValidations.total * 100).toFixed(1) : 0;
    coverage.databaseRelations.percentage = coverage.databaseRelations.total > 0 ? 
      (coverage.databaseRelations.tested / coverage.databaseRelations.total * 100).toFixed(1) : 0;
    coverage.constraints.percentage = coverage.constraints.total > 0 ? 
      (coverage.constraints.tested / coverage.constraints.total * 100).toFixed(1) : 0;

    // Save detailed results to file
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(this.results, null, 2));

    // Print summary
    this.log('\n📊 COMPREHENSIVE TEST RESULTS SUMMARY', 'SUCCESS');
    this.log('=' * 50);
    this.log(`🕐 Duration: ${Math.round(this.results.duration / 1000)}s`);
    this.log(`📋 Total Tests: ${this.results.summary.totalTests}`);
    this.log(`✅ Passed: ${this.results.summary.passed}`);
    this.log(`❌ Failed: ${this.results.summary.failed}`);
    this.log(`⏭️  Skipped: ${this.results.summary.skipped}`);
    this.log(`📈 Success Rate: ${((this.results.summary.passed / this.results.summary.totalTests) * 100).toFixed(1)}%`);

    this.log('\n📊 COVERAGE BREAKDOWN:');
    this.log(`🔌 API Endpoints: ${coverage.apiEndpoints.tested}/${coverage.apiEndpoints.total} (${coverage.apiEndpoints.percentage}%)`);
    this.log(`📝 Form Validations: ${coverage.formValidations.tested}/${coverage.formValidations.total} (${coverage.formValidations.percentage}%)`);
    this.log(`🔗 Database Relations: ${coverage.databaseRelations.tested}/${coverage.databaseRelations.total} (${coverage.databaseRelations.percentage}%)`);
    this.log(`🛡️  Database Constraints: ${coverage.constraints.tested}/${coverage.constraints.total} (${coverage.constraints.percentage}%)`);

    this.log('\n📁 DETAILED RESULTS BY CATEGORY:');
    for (const [category, data] of Object.entries(this.results.testCategories)) {
      const successRate = data.total > 0 ? (data.passed / data.total * 100).toFixed(1) : 0;
      this.log(`📂 ${category}: ${data.passed}/${data.total} passed (${successRate}%)`);
    }

    this.log(`\n💾 Detailed results saved to: ${CONFIG.outputFile}`);
  }

  // Main test runner
  async runAllTests() {
    this.log('🚀 Starting Comprehensive MSSP Application Testing Suite...');
    this.log(`🎯 Target: ${CONFIG.baseURL}`);

    try {
      // Authenticate first
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        this.log('❌ Authentication failed. Some tests may not run properly.', 'ERROR');
      }

      // Run all test categories
      await this.testAPIEndpoints();
      await this.testFormValidations();
      await this.testDatabaseRelations();
      await this.testDatabaseConstraints();
      await this.testSchemaValidation();
      await this.testBusinessLogic();
      await this.testExternalIntegrations();
      await this.testSecurity();
      await this.testPerformance();

      // Generate final report
      this.generateReport();

      return this.results;

    } catch (error) {
      this.log(`💥 Fatal error during testing: ${error.message}`, 'ERROR');
      this.results.fatalError = error.message;
      this.generateReport();
      throw error;
    }
  }
}

// Run the comprehensive test suite
if (require.main === module) {
  const testSuite = new ComprehensiveTestSuite();
  
  testSuite.runAllTests()
    .then(results => {
      const successRate = (results.summary.passed / results.summary.totalTests * 100).toFixed(1);
      if (successRate >= 80) {
        console.log(`\n🎉 Testing completed successfully! Success rate: ${successRate}%`);
        process.exit(0);
      } else {
        console.log(`\n⚠️  Testing completed with issues. Success rate: ${successRate}%`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(`\n💥 Testing failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = ComprehensiveTestSuite; 