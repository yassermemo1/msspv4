import { randomBytes, scryptSync } from 'crypto';
import { faker } from '@faker-js/faker';

export interface TestCredentials {
  email: string;
  password: string;
  username: string;
  role: 'admin' | 'manager' | 'engineer' | 'user';
}

export interface TestUser {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  hashedPassword: string;
}

export class SecureTestDataGenerator {
  private static instance: SecureTestDataGenerator;
  
  static getInstance(): SecureTestDataGenerator {
    if (!SecureTestDataGenerator.instance) {
      SecureTestDataGenerator.instance = new SecureTestDataGenerator();
    }
    return SecureTestDataGenerator.instance;
  }

  /**
   * Generate secure random password
   */
  generateSecurePassword(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const randomArray = randomBytes(length);
    return Array.from(randomArray, byte => chars[byte % chars.length]).join('');
  }

  /**
   * Hash password securely
   */
  hashPassword(password: string): string {
    const salt = randomBytes(32).toString('hex');
    const hashedPassword = scryptSync(password, salt, 64).toString('hex');
    return `${hashedPassword}.${salt}`;
  }

  /**
   * Generate test credentials from environment or secure defaults
   */
  getTestCredentials(): { [role: string]: TestCredentials } {
    const basePassword = process.env.TEST_PASSWORD || this.generateSecurePassword();
    const domain = process.env.TEST_EMAIL_DOMAIN || 'test.mssp.local';
    
    return {
      admin: {
        email: process.env.TEST_ADMIN_EMAIL || `admin@${domain}`,
        password: process.env.TEST_ADMIN_PASSWORD || basePassword,
        username: process.env.TEST_ADMIN_USERNAME || 'testadmin',
        role: 'admin'
      },
      manager: {
        email: process.env.TEST_MANAGER_EMAIL || `manager@${domain}`,
        password: process.env.TEST_MANAGER_PASSWORD || basePassword,
        username: process.env.TEST_MANAGER_USERNAME || 'testmanager',
        role: 'manager'
      },
      engineer: {
        email: process.env.TEST_ENGINEER_EMAIL || `engineer@${domain}`,
        password: process.env.TEST_ENGINEER_PASSWORD || basePassword,
        username: process.env.TEST_ENGINEER_USERNAME || 'testengineer',
        role: 'engineer'
      },
      user: {
        email: process.env.TEST_USER_EMAIL || `user@${domain}`,
        password: process.env.TEST_USER_PASSWORD || basePassword,
        username: process.env.TEST_USER_USERNAME || 'testuser',
        role: 'user'
      }
    };
  }

  /**
   * Generate LDAP test configuration from environment
   */
  getLdapTestConfig() {
    return {
      url: process.env.TEST_LDAP_URL || process.env.LDAP_URL || 'ldap://test.example.com:389',
      searchBase: process.env.TEST_LDAP_SEARCH_BASE || process.env.LDAP_SEARCH_BASE || 'dc=test,dc=example,dc=com',
      bindDn: process.env.TEST_LDAP_BIND_DN || process.env.LDAP_BIND_DN,
      bindPassword: process.env.TEST_LDAP_BIND_PASSWORD || process.env.LDAP_BIND_PASSWORD,
      testUsers: {
        admin: {
          username: process.env.TEST_LDAP_ADMIN_USER || 'testadmin',
          password: process.env.TEST_LDAP_ADMIN_PASSWORD || this.generateSecurePassword(),
          dn: `uid=testadmin,${process.env.TEST_LDAP_SEARCH_BASE || 'dc=test,dc=example,dc=com'}`
        },
        user: {
          username: process.env.TEST_LDAP_USER || 'testuser',
          password: process.env.TEST_LDAP_PASSWORD || this.generateSecurePassword(),
          dn: `uid=testuser,${process.env.TEST_LDAP_SEARCH_BASE || 'dc=test,dc=example,dc=com'}`
        }
      }
    };
  }

  /**
   * Generate random test data for various entities
   */
  generateTestClient() {
    return {
      name: faker.company.name(),
      industry: faker.commerce.department(),
      size: faker.helpers.arrayElement(['1-50', '51-200', '201-500', '500+']),
      status: faker.helpers.arrayElement(['active', 'prospect', 'inactive']),
      acquisitionChannel: faker.helpers.arrayElement(['direct', 'referral', 'marketing', 'partner']),
      address: faker.location.streetAddress(),
      website: faker.internet.url(),
      description: faker.company.catchPhrase()
    };
  }

  generateTestContract() {
    const startDate = faker.date.future();
    const endDate = faker.date.future({ years: 1, refDate: startDate });
    
    return {
      name: `${faker.company.buzzNoun()} ${faker.helpers.arrayElement(['Agreement', 'Contract', 'Service Agreement'])}`,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      value: faker.number.float({ min: 10000, max: 500000, fractionDigits: 2 }),
      status: faker.helpers.arrayElement(['active', 'draft', 'expired', 'terminated']),
      autoRenewal: faker.datatype.boolean(),
      terms: faker.lorem.sentences(2)
    };
  }

  generateTestService() {
    return {
      name: `${faker.hacker.adjective()} ${faker.helpers.arrayElement(['Security', 'Monitoring', 'Assessment', 'Management'])}`,
      category: faker.helpers.arrayElement(['Security Operations', 'Compliance', 'Network Security', 'Cloud Security']),
      description: faker.lorem.paragraph(),
      deliveryModel: faker.helpers.arrayElement(['on-site', 'remote', 'hybrid']),
      basePrice: faker.number.float({ min: 1000, max: 50000, fractionDigits: 2 }),
      pricingModel: faker.helpers.arrayElement(['per month', 'per assessment', 'per user', 'fixed price']),
      isActive: faker.datatype.boolean(0.8)
    };
  }

  /**
   * Generate environment-specific test configuration
   */
  getEnvironmentConfig() {
    const env = process.env.NODE_ENV || 'development';
    
    return {
      environment: env,
      baseUrl: process.env.TEST_BASE_URL || (env === 'production' ? 'https://api.mssp.com' : 'http://localhost:5001'),
      frontendUrl: process.env.TEST_FRONTEND_URL || (env === 'production' ? 'https://app.mssp.com' : 'http://localhost:3000'),
      databaseUrl: this.generateSecureDatabaseUrl(),
      enableTestData: process.env.ENABLE_TEST_DATA === 'true' || env !== 'production',
      testDataSeed: process.env.TEST_DATA_SEED || Date.now().toString()
    };
  }

  /**
   * Generate secure database connection string
   */
  generateSecureDatabaseUrl(): string {
    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }

    // Generate secure connection from components
    const config = {
      host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
      port: process.env.DB_PORT || process.env.PGPORT || '5432',
      database: process.env.DB_NAME || process.env.PGDATABASE || 'mssp_production',
      user: process.env.DB_USER || process.env.PGUSER || 'mssp_user',
      password: process.env.DB_PASSWORD || process.env.PGPASSWORD || ''
    };

    return `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
  }

  /**
   * Create test users for different environments
   */
  generateTestUsers(count: number = 10): TestUser[] {
    const users: TestUser[] = [];
    const credentials = this.getTestCredentials();

    // Add the standard test roles
    Object.values(credentials).forEach(cred => {
      users.push({
        username: cred.username,
        email: cred.email,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: cred.role,
        isActive: true,
        hashedPassword: this.hashPassword(cred.password)
      });
    });

    // Add additional random users
    for (let i = 0; i < count - 4; i++) {
      const password = this.generateSecurePassword();
      users.push({
        username: faker.internet.userName(),
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: faker.helpers.arrayElement(['engineer', 'user']),
        isActive: faker.datatype.boolean(0.9),
        hashedPassword: this.hashPassword(password)
      });
    }

    return users;
  }

  /**
   * Log credentials securely (only in development)
   */
  logTestCredentials(): void {
    if (process.env.NODE_ENV === 'production') {
      console.log('🔒 Test credentials hidden in production environment');
      return;
    }

    const credentials = this.getTestCredentials();
    console.log('\n🧪 Test Credentials (Development Only):');
    console.log('═══════════════════════════════════════');
    
    Object.entries(credentials).forEach(([role, cred]) => {
      console.log(`${role.toUpperCase().padEnd(8)}: ${cred.email.padEnd(25)} | ${cred.password}`);
    });
    
    const ldapConfig = this.getLdapTestConfig();
    console.log('\n🔌 LDAP Test Configuration:');
    console.log('═══════════════════════════════════');
    console.log(`URL: ${ldapConfig.url}`);
    console.log(`Search Base: ${ldapConfig.searchBase}`);
    
    Object.entries(ldapConfig.testUsers).forEach(([role, user]) => {
      console.log(`${role.toUpperCase()}: ${user.username} | ${user.password}`);
    });
    
    console.log('\n💡 Set TEST_PASSWORD env var to use custom password for all test accounts');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
  }
}

export const testDataGenerator = SecureTestDataGenerator.getInstance(); 