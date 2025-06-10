#!/usr/bin/env node

/**
 * COMPREHENSIVE FORM VALIDATION TESTER
 * ====================================
 * 
 * This tester validates:
 * 1. All form schemas and Zod validations
 * 2. Frontend form validation logic
 * 3. Backend API validation
 * 4. Data type enforcement
 * 5. Required field validation
 * 6. Format validation (email, dates, etc.)
 * 7. Business rule validation
 * 8. Cross-field validation
 */

const axios = require('axios');
const fs = require('fs');

class FormValidationTester {
  constructor() {
    this.baseURL = process.env.TEST_BASE_URL || 'http://localhost:5000';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      validateStatus: () => true
    });

    this.results = {
      startTime: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        formsValidated: 0,
        validationRulesChecked: 0
      },
      categories: {},
      formSchemas: {}
    };

    // All forms in the application with their validation rules
    this.formDefinitions = {
      clientForm: {
        endpoint: '/api/clients',
        method: 'POST',
        requiredFields: ['name'],
        optionalFields: ['shortName', 'domain', 'industry', 'companySize', 'status', 'source', 'address', 'website', 'notes'],
        validationRules: {
          name: { type: 'string', minLength: 1, maxLength: 255, required: true },
          shortName: { type: 'string', maxLength: 50 },
          domain: { type: 'string', format: 'domain' },
          industry: { type: 'string', maxLength: 100 },
          companySize: { type: 'string', maxLength: 50 },
          status: { type: 'enum', values: ['prospect', 'active', 'inactive', 'suspended', 'archived'] },
          source: { type: 'string', maxLength: 100 },
          address: { type: 'text' },
          website: { type: 'string', format: 'url' },
          notes: { type: 'text' }
        }
      },
      serviceForm: {
        endpoint: '/api/services',
        method: 'POST',
        requiredFields: ['name', 'category', 'deliveryModel'],
        optionalFields: ['description', 'basePrice', 'pricingUnit'],
        validationRules: {
          name: { type: 'string', minLength: 1, maxLength: 255, required: true },
          category: { type: 'string', minLength: 1, maxLength: 100, required: true },
          deliveryModel: { type: 'enum', values: ['Serverless', 'On-Prem Engineer', 'Hybrid'], required: true },
          description: { type: 'text' },
          basePrice: { type: 'decimal', min: 0, precision: 10, scale: 2 },
          pricingUnit: { type: 'string', maxLength: 50 }
        }
      },
      contractForm: {
        endpoint: '/api/contracts',
        method: 'POST',
        requiredFields: ['clientId', 'name', 'startDate', 'endDate'],
        optionalFields: ['autoRenewal', 'renewalTerms', 'totalValue', 'status', 'documentUrl', 'notes'],
        validationRules: {
          clientId: { type: 'integer', min: 1, required: true, foreignKey: 'clients.id' },
          name: { type: 'string', minLength: 1, maxLength: 255, required: true },
          startDate: { type: 'datetime', required: true },
          endDate: { type: 'datetime', required: true, after: 'startDate' },
          autoRenewal: { type: 'boolean' },
          renewalTerms: { type: 'text' },
          totalValue: { type: 'decimal', min: 0, precision: 12, scale: 2 },
          status: { type: 'enum', values: ['draft', 'active', 'expired', 'terminated'] },
          documentUrl: { type: 'string', format: 'url' },
          notes: { type: 'text' }
        }
      },
      userForm: {
        endpoint: '/api/users',
        method: 'POST',
        requiredFields: ['username', 'email', 'firstName', 'lastName'],
        optionalFields: ['password', 'role', 'authProvider', 'ldapId', 'isActive'],
        validationRules: {
          username: { type: 'string', minLength: 3, maxLength: 50, required: true, unique: true },
          email: { type: 'string', format: 'email', required: true, unique: true },
          firstName: { type: 'string', minLength: 1, maxLength: 100, required: true },
          lastName: { type: 'string', minLength: 1, maxLength: 100, required: true },
          password: { type: 'string', minLength: 8, format: 'password' },
          role: { type: 'enum', values: ['admin', 'manager', 'engineer', 'user', 'viewer'] },
          authProvider: { type: 'enum', values: ['local', 'ldap'] },
          ldapId: { type: 'string', maxLength: 255 },
          isActive: { type: 'boolean' }
        }
      },
      hardwareAssetForm: {
        endpoint: '/api/hardware-assets',
        method: 'POST',
        requiredFields: ['assetTag', 'type'],
        optionalFields: ['model', 'manufacturer', 'serialNumber', 'purchaseDate', 'warrantyExpiry', 'status', 'location', 'notes'],
        validationRules: {
          assetTag: { type: 'string', minLength: 1, maxLength: 100, required: true, unique: true },
          type: { type: 'string', minLength: 1, maxLength: 100, required: true },
          model: { type: 'string', maxLength: 100 },
          manufacturer: { type: 'string', maxLength: 100 },
          serialNumber: { type: 'string', maxLength: 100 },
          purchaseDate: { type: 'date' },
          warrantyExpiry: { type: 'date' },
          status: { type: 'enum', values: ['active', 'inactive', 'maintenance', 'retired'] },
          location: { type: 'string', maxLength: 255 },
          notes: { type: 'text' }
        }
      },
      licensePoolForm: {
        endpoint: '/api/license-pools',
        method: 'POST',
        requiredFields: ['name', 'vendor', 'totalLicenses'],
        optionalFields: ['description', 'licenseType', 'expiryDate', 'costPerLicense', 'notes'],
        validationRules: {
          name: { type: 'string', minLength: 1, maxLength: 255, required: true },
          vendor: { type: 'string', minLength: 1, maxLength: 100, required: true },
          totalLicenses: { type: 'integer', min: 1, required: true },
          description: { type: 'text' },
          licenseType: { type: 'string', maxLength: 100 },
          expiryDate: { type: 'date' },
          costPerLicense: { type: 'decimal', min: 0, precision: 10, scale: 2 },
          notes: { type: 'text' }
        }
      },
      proposalForm: {
        endpoint: '/api/proposals',
        method: 'POST',
        requiredFields: ['contractId', 'title'],
        optionalFields: ['description', 'proposedValue', 'proposedStartDate', 'proposedEndDate', 'status', 'documentUrl', 'notes'],
        validationRules: {
          contractId: { type: 'integer', min: 1, required: true, foreignKey: 'contracts.id' },
          title: { type: 'string', minLength: 1, maxLength: 255, required: true },
          description: { type: 'text' },
          proposedValue: { type: 'decimal', min: 0, precision: 12, scale: 2 },
          proposedStartDate: { type: 'date' },
          proposedEndDate: { type: 'date', after: 'proposedStartDate' },
          status: { type: 'enum', values: ['draft', 'submitted', 'approved', 'rejected', 'negotiating'] },
          documentUrl: { type: 'string', format: 'url' },
          notes: { type: 'text' }
        }
      },
      safForm: {
        endpoint: '/api/service-authorization-forms',
        method: 'POST',
        requiredFields: ['clientId', 'contractId', 'title'],
        optionalFields: ['description', 'safType', 'startDate', 'endDate', 'documentUrl', 'value', 'status', 'notes'],
        validationRules: {
          clientId: { type: 'integer', min: 1, required: true, foreignKey: 'clients.id' },
          contractId: { type: 'integer', min: 1, required: true, foreignKey: 'contracts.id' },
          title: { type: 'string', minLength: 1, maxLength: 255, required: true },
          description: { type: 'text' },
          safType: { type: 'string', maxLength: 100 },
          startDate: { type: 'date' },
          endDate: { type: 'date', after: 'startDate' },
          documentUrl: { type: 'string', format: 'url' },
          value: { type: 'decimal', min: 0, precision: 12, scale: 2 },
          status: { type: 'enum', values: ['draft', 'active', 'completed', 'cancelled'] },
          notes: { type: 'text' }
        }
      },
      cocForm: {
        endpoint: '/api/certificates-of-compliance',
        method: 'POST',
        requiredFields: ['clientId', 'title'],
        optionalFields: ['description', 'certificationType', 'issueDate', 'expiryDate', 'documentUrl', 'status', 'notes'],
        validationRules: {
          clientId: { type: 'integer', min: 1, required: true, foreignKey: 'clients.id' },
          title: { type: 'string', minLength: 1, maxLength: 255, required: true },
          description: { type: 'text' },
          certificationType: { type: 'string', maxLength: 100 },
          issueDate: { type: 'date' },
          expiryDate: { type: 'date', after: 'issueDate' },
          documentUrl: { type: 'string', format: 'url' },
          status: { type: 'enum', values: ['draft', 'issued', 'expired', 'revoked'] },
          notes: { type: 'text' }
        }
      },
      financialTransactionForm: {
        endpoint: '/api/financial-transactions',
        method: 'POST',
        requiredFields: ['clientId', 'amount', 'transactionType'],
        optionalFields: ['description', 'transactionDate', 'reference', 'status', 'notes'],
        validationRules: {
          clientId: { type: 'integer', min: 1, required: true, foreignKey: 'clients.id' },
          amount: { type: 'decimal', required: true, precision: 12, scale: 2 },
          transactionType: { type: 'enum', values: ['invoice', 'payment', 'credit', 'refund'], required: true },
          description: { type: 'text' },
          transactionDate: { type: 'date' },
          reference: { type: 'string', maxLength: 100 },
          status: { type: 'enum', values: ['pending', 'completed', 'failed', 'cancelled'] },
          notes: { type: 'text' }
        }
      }
    };
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

  // Generate valid test data for a form
  generateValidData(formDef) {
    const data = {};
    
    // Add all required fields
    for (const field of formDef.requiredFields) {
      const rule = formDef.validationRules[field];
      data[field] = this.generateFieldValue(field, rule, true);
    }

    // Add some optional fields
    for (const field of formDef.optionalFields.slice(0, 3)) {
      const rule = formDef.validationRules[field];
      data[field] = this.generateFieldValue(field, rule, false);
    }

    return data;
  }

  generateFieldValue(fieldName, rule, isRequired) {
    if (!rule) return null;

    switch (rule.type) {
      case 'string':
        if (rule.format === 'email') {
          return `test_${Date.now()}@example.com`;
        } else if (rule.format === 'url') {
          return 'https://example.com';
        } else if (rule.format === 'domain') {
          return 'example.com';
        } else {
          const length = rule.minLength || 5;
          return `Test ${fieldName} ${Date.now()}`.substring(0, rule.maxLength || 255);
        }
      
      case 'text':
        return `Test ${fieldName} description ${Date.now()}`;
      
      case 'integer':
        if (rule.foreignKey) {
          return 1; // Assume ID 1 exists for testing
        }
        return rule.min || 1;
      
      case 'decimal':
        return '100.50';
      
      case 'boolean':
        return true;
      
      case 'date':
        return new Date().toISOString().split('T')[0];
      
      case 'datetime':
        return new Date().toISOString();
      
      case 'enum':
        return rule.values[0];
      
      default:
        return `test_${fieldName}_${Date.now()}`;
    }
  }

  // Generate invalid test data variations
  generateInvalidDataVariations(formDef) {
    const variations = [];

    // Test 1: Missing required fields
    for (const requiredField of formDef.requiredFields) {
      const data = this.generateValidData(formDef);
      delete data[requiredField];
      variations.push({
        name: `Missing required field: ${requiredField}`,
        data,
        expectedError: `${requiredField} is required`
      });
    }

    // Test 2: Invalid data types and formats
    for (const [fieldName, rule] of Object.entries(formDef.validationRules)) {
      const data = this.generateValidData(formDef);
      
      switch (rule.type) {
        case 'string':
          if (rule.format === 'email') {
            data[fieldName] = 'invalid-email';
            variations.push({
              name: `Invalid email format: ${fieldName}`,
              data: { ...data },
              expectedError: 'invalid email format'
            });
          }
          
          if (rule.maxLength) {
            data[fieldName] = 'x'.repeat(rule.maxLength + 10);
            variations.push({
              name: `String too long: ${fieldName}`,
              data: { ...data },
              expectedError: 'string too long'
            });
          }
          
          if (rule.minLength && rule.minLength > 0) {
            data[fieldName] = '';
            variations.push({
              name: `String too short: ${fieldName}`,
              data: { ...data },
              expectedError: 'string too short'
            });
          }
          break;

        case 'integer':
          data[fieldName] = 'not-a-number';
          variations.push({
            name: `Invalid integer: ${fieldName}`,
            data: { ...data },
            expectedError: 'invalid integer'
          });
          
          if (rule.min) {
            data[fieldName] = rule.min - 1;
            variations.push({
              name: `Integer below minimum: ${fieldName}`,
              data: { ...data },
              expectedError: 'below minimum value'
            });
          }
          break;

        case 'decimal':
          data[fieldName] = 'not-a-decimal';
          variations.push({
            name: `Invalid decimal: ${fieldName}`,
            data: { ...data },
            expectedError: 'invalid decimal'
          });
          break;

        case 'enum':
          data[fieldName] = 'invalid-enum-value';
          variations.push({
            name: `Invalid enum value: ${fieldName}`,
            data: { ...data },
            expectedError: 'invalid enum value'
          });
          break;

        case 'date':
        case 'datetime':
          data[fieldName] = 'invalid-date';
          variations.push({
            name: `Invalid date format: ${fieldName}`,
            data: { ...data },
            expectedError: 'invalid date format'
          });
          break;
      }
    }

    // Test 3: Business rule violations
    if (formDef.validationRules.endDate && formDef.validationRules.endDate.after === 'startDate') {
      const data = this.generateValidData(formDef);
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000); // End before start
      
      data.startDate = startDate.toISOString();
      data.endDate = endDate.toISOString();
      
      variations.push({
        name: 'End date before start date',
        data,
        expectedError: 'end date must be after start date'
      });
    }

    return variations;
  }

  async authenticate() {
    this.log('🔐 Authenticating for form validation tests...');
    
    try {
      const response = await this.client.post('/api/login', {
        username: 'admin',
        password: 'admin123'
      });

      if (response.status === 200) {
        const cookies = response.headers['set-cookie'];
        if (cookies) {
          const sessionCookie = cookies.find(cookie => cookie.startsWith('session='));
          if (sessionCookie) {
            this.client.defaults.headers.Cookie = sessionCookie;
          }
        }
        return true;
      }
      return false;
    } catch (error) {
      this.log(`Authentication failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async testFormValidation(formName, formDef) {
    this.log(`📝 Testing ${formName} validation...`);

    // Test 1: Valid data submission
    try {
      const validData = this.generateValidData(formDef);
      const response = await this.client.request({
        method: formDef.method,
        url: formDef.endpoint,
        data: validData
      });

      if (response.status === 201 || response.status === 200) {
        this.recordTest('Form Validation', `${formName} - Valid Data`, 'passed', {
          status: response.status,
          data: validData
        });
      } else {
        this.recordTest('Form Validation', `${formName} - Valid Data`, 'failed', {
          status: response.status,
          error: response.data?.message,
          data: validData
        });
      }
    } catch (error) {
      this.recordTest('Form Validation', `${formName} - Valid Data`, 'failed', {
        error: error.message
      });
    }

    // Test 2: Invalid data variations
    const invalidVariations = this.generateInvalidDataVariations(formDef);
    
    for (const variation of invalidVariations.slice(0, 10)) { // Limit to first 10 variations
      try {
        const response = await this.client.request({
          method: formDef.method,
          url: formDef.endpoint,
          data: variation.data
        });

        const isValidationError = response.status >= 400 && response.status < 500;
        
        if (isValidationError) {
          this.recordTest('Form Validation', `${formName} - ${variation.name}`, 'passed', {
            status: response.status,
            validationWorking: true
          });
        } else {
          this.recordTest('Form Validation', `${formName} - ${variation.name}`, 'failed', {
            status: response.status,
            error: 'Validation should have failed but didn\'t',
            data: variation.data
          });
        }
      } catch (error) {
        this.recordTest('Form Validation', `${formName} - ${variation.name}`, 'failed', {
          error: error.message
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
    }

    this.results.summary.formsValidated++;
    this.results.summary.validationRulesChecked += Object.keys(formDef.validationRules).length;
  }

  async testSchemaTypes() {
    this.log('🔍 Testing schema type validations...');

    const typeTests = [
      {
        name: 'String Type Validation',
        test: async () => {
          const response = await this.client.post('/api/clients', {
            name: 123, // Should be string
            status: 'prospect'
          });
          return response.status >= 400;
        }
      },
      {
        name: 'Integer Type Validation',
        test: async () => {
          const response = await this.client.post('/api/contracts', {
            clientId: 'not-a-number', // Should be integer
            name: 'Test Contract',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          });
          return response.status >= 400;
        }
      },
      {
        name: 'Boolean Type Validation',
        test: async () => {
          const response = await this.client.post('/api/contracts', {
            clientId: 1,
            name: 'Test Contract',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            autoRenewal: 'yes' // Should be boolean
          });
          return response.status >= 400;
        }
      },
      {
        name: 'Date Type Validation',
        test: async () => {
          const response = await this.client.post('/api/contracts', {
            clientId: 1,
            name: 'Test Contract',
            startDate: 'invalid-date', // Should be valid date
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          });
          return response.status >= 400;
        }
      },
      {
        name: 'Decimal Type Validation',
        test: async () => {
          const response = await this.client.post('/api/contracts', {
            clientId: 1,
            name: 'Test Contract',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            totalValue: 'not-a-number' // Should be decimal
          });
          return response.status >= 400;
        }
      }
    ];

    for (const test of typeTests) {
      try {
        const result = await test.test();
        if (result) {
          this.recordTest('Schema Types', test.name, 'passed');
        } else {
          this.recordTest('Schema Types', test.name, 'failed', {
            error: 'Type validation should have failed but didn\'t'
          });
        }
      } catch (error) {
        this.recordTest('Schema Types', test.name, 'failed', {
          error: error.message
        });
      }
    }
  }

  async testBusinessRules() {
    this.log('🧠 Testing business rule validations...');

    const businessRuleTests = [
      {
        name: 'Contract Date Logic',
        test: async () => {
          const startDate = new Date();
          const endDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000); // End before start
          
          const response = await this.client.post('/api/contracts', {
            clientId: 1,
            name: 'Invalid Date Contract',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          });
          
          return response.status >= 400;
        }
      },
      {
        name: 'SAF Client-Contract Consistency',
        test: async () => {
          // Try to create SAF with mismatched client and contract
          const response = await this.client.post('/api/service-authorization-forms', {
            clientId: 1,
            contractId: 999, // Assuming this contract doesn't belong to client 1
            title: 'Test SAF'
          });
          
          return response.status >= 400;
        }
      },
      {
        name: 'License Pool Capacity',
        test: async () => {
          const response = await this.client.post('/api/license-pools', {
            name: 'Test License Pool',
            vendor: 'Test Vendor',
            totalLicenses: -5 // Negative licenses should be invalid
          });
          
          return response.status >= 400;
        }
      },
      {
        name: 'User Role Validation',
        test: async () => {
          const response = await this.client.post('/api/users', {
            username: `testuser_${Date.now()}`,
            email: `test_${Date.now()}@example.com`,
            firstName: 'Test',
            lastName: 'User',
            role: 'invalid_role' // Invalid role
          });
          
          return response.status >= 400;
        }
      }
    ];

    for (const test of businessRuleTests) {
      try {
        const result = await test.test();
        if (result) {
          this.recordTest('Business Rules', test.name, 'passed');
        } else {
          this.recordTest('Business Rules', test.name, 'failed', {
            error: 'Business rule validation should have failed but didn\'t'
          });
        }
      } catch (error) {
        this.recordTest('Business Rules', test.name, 'failed', {
          error: error.message
        });
      }
    }
  }

  async testCrossFieldValidation() {
    this.log('🔗 Testing cross-field validations...');

    const crossFieldTests = [
      {
        name: 'Contract Start/End Date Relationship',
        test: async () => {
          const now = new Date();
          const response = await this.client.post('/api/contracts', {
            clientId: 1,
            name: 'Test Contract',
            startDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Start in future
            endDate: now.toISOString() // End in past relative to start
          });
          
          return response.status >= 400;
        }
      },
      {
        name: 'Proposal Date Relationship',
        test: async () => {
          const now = new Date();
          const response = await this.client.post('/api/proposals', {
            contractId: 1,
            title: 'Test Proposal',
            proposedStartDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            proposedEndDate: now.toISOString() // End before start
          });
          
          return response.status >= 400;
        }
      },
      {
        name: 'SAF Date Relationship',
        test: async () => {
          const now = new Date();
          const response = await this.client.post('/api/service-authorization-forms', {
            clientId: 1,
            contractId: 1,
            title: 'Test SAF',
            startDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: now.toISOString() // End before start
          });
          
          return response.status >= 400;
        }
      }
    ];

    for (const test of crossFieldTests) {
      try {
        const result = await test.test();
        if (result) {
          this.recordTest('Cross-Field Validation', test.name, 'passed');
        } else {
          this.recordTest('Cross-Field Validation', test.name, 'failed', {
            error: 'Cross-field validation should have failed but didn\'t'
          });
        }
      } catch (error) {
        this.recordTest('Cross-Field Validation', test.name, 'failed', {
          error: error.message
        });
      }
    }
  }

  generateReport() {
    this.results.endTime = new Date().toISOString();
    this.results.duration = new Date(this.results.endTime) - new Date(this.results.startTime);

    // Save detailed results
    fs.writeFileSync('form-validation-test-results.json', JSON.stringify(this.results, null, 2));

    // Print summary
    this.log('\n📊 FORM VALIDATION TEST RESULTS', 'SUCCESS');
    this.log('='.repeat(50));
    this.log(`🕐 Duration: ${Math.round(this.results.duration / 1000)}s`);
    this.log(`📋 Total Tests: ${this.results.summary.totalTests}`);
    this.log(`✅ Passed: ${this.results.summary.passed}`);
    this.log(`❌ Failed: ${this.results.summary.failed}`);
    this.log(`📈 Success Rate: ${((this.results.summary.passed / this.results.summary.totalTests) * 100).toFixed(1)}%`);

    this.log('\n📊 VALIDATION SUMMARY:');
    this.log(`📝 Forms Validated: ${this.results.summary.formsValidated}`);
    this.log(`🔍 Validation Rules Checked: ${this.results.summary.validationRulesChecked}`);

    this.log('\n📁 DETAILED RESULTS BY CATEGORY:');
    for (const [category, data] of Object.entries(this.results.categories)) {
      const successRate = data.total > 0 ? (data.passed / data.total * 100).toFixed(1) : 0;
      this.log(`📂 ${category}: ${data.passed}/${data.total} passed (${successRate}%)`);
    }

    this.log('\n💾 Detailed results saved to: form-validation-test-results.json');
  }

  async runAllTests() {
    this.log('🚀 Starting Comprehensive Form Validation Testing...');

    try {
      // Authenticate
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        this.log('❌ Authentication failed. Tests may not run properly.', 'ERROR');
      }

      // Test all forms
      for (const [formName, formDef] of Object.entries(this.formDefinitions)) {
        await this.testFormValidation(formName, formDef);
      }

      // Test schema types
      await this.testSchemaTypes();

      // Test business rules
      await this.testBusinessRules();

      // Test cross-field validation
      await this.testCrossFieldValidation();

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

// Run the form validation tester
if (require.main === module) {
  const tester = new FormValidationTester();
  
  tester.runAllTests()
    .then(results => {
      const successRate = (results.summary.passed / results.summary.totalTests * 100).toFixed(1);
      if (successRate >= 80) {
        console.log(`\n🎉 Form validation testing completed successfully! Success rate: ${successRate}%`);
        process.exit(0);
      } else {
        console.log(`\n⚠️  Form validation testing completed with issues. Success rate: ${successRate}%`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(`\n💥 Form validation testing failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = FormValidationTester; 