import { testDataGenerator } from './test-data-generator';

export interface EnvironmentConfig {
  // Server Configuration
  server: {
    port: number;
    host: string;
    environment: string;
    corsOrigin: string[];
    trustProxy: boolean;
  };

  // Database Configuration  
  database: {
    url: string;
    ssl: boolean;
    pool: {
      min: number;
      max: number;
      idleTimeoutMillis: number;
    };
  };

  // Security Configuration
  security: {
    sessionSecret: string;
    jwtSecret?: string;
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordMinLength: number;
    requireTwoFactor: boolean;
    allowedFileTypes: string[];
    maxFileSize: number;
  };

  // LDAP Configuration
  ldap: {
    enabled: boolean;
    url?: string;
    searchBase?: string;
    bindDn?: string;
    bindPassword?: string;
    searchFilter: string;
    attributes: {
      username: string;
      email: string;
      firstName: string;
      lastName: string;
    };
    defaultRole: string;
    connectionTimeout: number;
    searchTimeout: number;
  };

  // Email Configuration
  email: {
    enabled: boolean;
    host?: string;
    port: number;
    secure: boolean;
    auth?: {
      user: string;
      pass: string;
    };
    from: string;
  };

  // API Configuration
  api: {
    rateLimit: number;
    timeout: number;
    retries: number;
    pagination: {
      defaultLimit: number;
      maxLimit: number;
    };
  };

  // External Systems Configuration
  external: {
    timeout: number;
    retries: number;
    rateLimit: number;
  };

  // Testing Configuration
  testing: {
    enabled: boolean;
    credentials: any;
    dataGeneration: boolean;
    seed?: string;
  };

  // UI Configuration
  ui: {
    theme: {
      defaultTheme: 'light' | 'dark';
      allowUserThemes: boolean;
    };
    currency: {
      default: string;
      supported: string[];
    };
    pagination: {
      defaultPageSize: number;
      pageSizeOptions: number[];
    };
  };
}

class EnvironmentConfigManager {
  private static instance: EnvironmentConfigManager;
  private config: EnvironmentConfig | null = null;

  static getInstance(): EnvironmentConfigManager {
    if (!EnvironmentConfigManager.instance) {
      EnvironmentConfigManager.instance = new EnvironmentConfigManager();
    }
    return EnvironmentConfigManager.instance;
  }

  /**
   * Load and validate environment configuration
   */
  loadConfig(): EnvironmentConfig {
    if (this.config) {
      return this.config;
    }

    const env = process.env.NODE_ENV || 'development';
    const isDevelopment = env === 'development';
    const isProduction = env === 'production';

    this.config = {
      server: {
        port: parseInt(process.env.PORT || process.env.SERVER_PORT || (isDevelopment ? '3000' : '5001')),
        host: process.env.HOST || (isProduction ? '0.0.0.0' : 'localhost'),
        environment: env,
        corsOrigin: this.parseCorsOrigins(),
        trustProxy: process.env.TRUST_PROXY === 'true' || isProduction
      },

      database: {
        url: this.getDatabaseUrl(),
        ssl: process.env.DB_SSL === 'true',
        pool: {
          min: parseInt(process.env.DB_POOL_MIN || '2'),
          max: parseInt(process.env.DB_POOL_MAX || '10'),
          idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000')
        }
      },

      security: {
        sessionSecret: this.getSessionSecret(),
        jwtSecret: process.env.JWT_SECRET,
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '28800'), // 8 hours
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
        passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
        requireTwoFactor: process.env.REQUIRE_2FA === 'true',
        allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png'],
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB
      },

      ldap: {
        enabled: process.env.LDAP_ENABLED === 'true',
        url: process.env.LDAP_URL,
        searchBase: process.env.LDAP_SEARCH_BASE,
        bindDn: process.env.LDAP_BIND_DN,
        bindPassword: process.env.LDAP_BIND_PASSWORD,
        searchFilter: process.env.LDAP_SEARCH_FILTER || '(uid={{username}})',
        attributes: {
          username: process.env.LDAP_USERNAME_ATTR || 'uid',
          email: process.env.LDAP_EMAIL_ATTR || 'mail',
          firstName: process.env.LDAP_FIRSTNAME_ATTR || 'givenName',
          lastName: process.env.LDAP_LASTNAME_ATTR || 'sn'
        },
        defaultRole: process.env.LDAP_DEFAULT_ROLE || 'user',
        connectionTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT || '5000'),
        searchTimeout: parseInt(process.env.LDAP_SEARCH_TIMEOUT || '10000')
      },

      email: {
        enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD || ''
        } : undefined,
        from: process.env.SMTP_FROM || 'noreply@mssp.com'
      },

      api: {
        rateLimit: parseInt(process.env.API_RATE_LIMIT || '1000'),
        timeout: parseInt(process.env.API_TIMEOUT || '30000'),
        retries: parseInt(process.env.API_RETRIES || '3'),
        pagination: {
          defaultLimit: parseInt(process.env.API_DEFAULT_LIMIT || '50'),
          maxLimit: parseInt(process.env.API_MAX_LIMIT || '1000')
        }
      },

      external: {
        timeout: parseInt(process.env.EXTERNAL_API_TIMEOUT || '10000'),
        retries: parseInt(process.env.EXTERNAL_API_RETRIES || '3'),
        rateLimit: parseInt(process.env.EXTERNAL_API_RATE_LIMIT || '100')
      },

      testing: {
        enabled: process.env.ENABLE_TESTING === 'true' || isDevelopment,
        credentials: isDevelopment ? testDataGenerator.getTestCredentials() : null,
        dataGeneration: process.env.ENABLE_TEST_DATA === 'true' || isDevelopment,
        seed: process.env.TEST_DATA_SEED
      },

      ui: {
        theme: {
          defaultTheme: (process.env.DEFAULT_THEME as 'light' | 'dark') || 'light',
          allowUserThemes: process.env.ALLOW_USER_THEMES !== 'false'
        },
        currency: {
          default: process.env.DEFAULT_CURRENCY || 'USD',
          supported: process.env.SUPPORTED_CURRENCIES?.split(',') || ['USD', 'EUR', 'GBP', 'CAD']
        },
        pagination: {
          defaultPageSize: parseInt(process.env.UI_DEFAULT_PAGE_SIZE || '25'),
          pageSizeOptions: process.env.UI_PAGE_SIZE_OPTIONS?.split(',').map(n => parseInt(n)) || [10, 25, 50, 100]
        }
      }
    };

    this.validateConfig();
    return this.config;
  }

  private getDatabaseUrl(): string {
    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }

    return testDataGenerator.generateSecureDatabaseUrl();
  }

  private getSessionSecret(): string {
    if (process.env.SESSION_SECRET) {
      return process.env.SESSION_SECRET;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set in production environment');
    }

    // Generate a secure session secret for development
    console.warn('⚠️ Using generated session secret. Set SESSION_SECRET env var for production.');
    return testDataGenerator.generateSecurePassword(64);
  }

  private parseCorsOrigins(): string[] {
    const origins = process.env.CORS_ORIGINS;
    if (origins) {
      return origins.split(',').map(origin => origin.trim());
    }

    const env = process.env.NODE_ENV || 'development';
    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL;
    
    if (env === 'production' && frontendUrl) {
      return [frontendUrl];
    }

    // Development defaults
    return [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
  }

  private validateConfig(): void {
    if (!this.config) return;

    const errors: string[] = [];

    // Validate required production settings
    if (this.config.server.environment === 'production') {
      if (!process.env.SESSION_SECRET) {
        errors.push('SESSION_SECRET is required in production');
      }
      if (!process.env.DATABASE_URL && !this.hasAllDbComponents()) {
        errors.push('DATABASE_URL or complete DB_* components required in production');
      }
    }

    // Validate LDAP config if enabled
    if (this.config.ldap.enabled) {
      if (!this.config.ldap.url || !this.config.ldap.searchBase) {
        errors.push('LDAP_URL and LDAP_SEARCH_BASE are required when LDAP is enabled');
      }
    }

    // Validate email config if enabled
    if (this.config.email.enabled) {
      if (!this.config.email.host || !this.config.email.auth?.user) {
        errors.push('SMTP_HOST and SMTP_USER are required when email is enabled');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Environment configuration errors:\n${errors.join('\n')}`);
    }
  }

  private hasAllDbComponents(): boolean {
    return !!(
      process.env.DB_HOST && 
      process.env.DB_NAME && 
      process.env.DB_USER
    );
  }

  /**
   * Get current configuration
   */
  getConfig(): EnvironmentConfig {
    return this.config || this.loadConfig();
  }

  /**
   * Get specific configuration section
   */
  getServerConfig() {
    return this.getConfig().server;
  }

  getDatabaseConfig() {
    return this.getConfig().database;
  }

  getSecurityConfig() {
    return this.getConfig().security;
  }

  getLdapConfig() {
    return this.getConfig().ldap;
  }

  getEmailConfig() {
    return this.getConfig().email;
  }

  getApiConfig() {
    return this.getConfig().api;
  }

  getTestingConfig() {
    return this.getConfig().testing;
  }

  getUiConfig() {
    return this.getConfig().ui;
  }

  /**
   * Log configuration summary (safe for production)
   */
  logConfigSummary(): void {
    const config = this.getConfig();
    console.log('\n⚙️  Environment Configuration Summary');
    console.log('════════════════════════════════════');
    console.log(`Environment: ${config.server.environment}`);
    console.log(`Server: ${config.server.host}:${config.server.port}`);
    console.log(`Database: ${config.database.url.includes('localhost') ? 'Local' : 'Remote'}`);
    console.log(`LDAP: ${config.ldap.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`Email: ${config.email.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`Testing: ${config.testing.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`Security: 2FA ${config.security.requireTwoFactor ? 'Required' : 'Optional'}`);
    console.log('════════════════════════════════════\n');

    // Log test credentials only in development
    if (config.testing.enabled && config.server.environment === 'development') {
      testDataGenerator.logTestCredentials();
    }
  }

  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return this.getConfig().server.environment === 'development';
  }

  /**
   * Check if running in production mode
   */
  isProduction(): boolean {
    return this.getConfig().server.environment === 'production';
  }
}

export const environmentConfig = EnvironmentConfigManager.getInstance(); 