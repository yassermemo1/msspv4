"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertServiceAuthorizationFormSchema = exports.insertIndividualLicenseSchema = exports.insertClientLicenseSchema = exports.insertLicensePoolSchema = exports.insertProposalSchema = exports.insertServiceScopeSchema = exports.insertContractSchema = exports.insertServiceSchema = exports.insertClientContactSchema = exports.insertClientSchema = exports.insertUserSchema = exports.clientTeamAssignmentsRelations = exports.userSettingsRelations = exports.usersRelations = exports.clientHardwareAssignmentsRelations = exports.hardwareAssetsRelations = exports.certificatesOfComplianceRelations = exports.serviceAuthorizationFormsRelations = exports.individualLicensesRelations = exports.clientLicensesRelations = exports.licensePoolsRelations = exports.proposalsRelations = exports.serviceScopesRelations = exports.servicesRelations = exports.contractsRelations = exports.clientContactsRelations = exports.clientsRelations = exports.customFieldValues = exports.customFields = exports.clientTeamAssignments = exports.financialTransactions = exports.clientHardwareAssignments = exports.hardwareAssets = exports.certificatesOfCompliance = exports.serviceAuthorizationForms = exports.individualLicenses = exports.clientLicenses = exports.licensePools = exports.proposals = exports.scopeVariableValues = exports.scopeVariableDefinitions = exports.serviceScopes = exports.contracts = exports.serviceScopeFields = exports.services = exports.clientContacts = exports.clients = exports.companySettings = exports.userSettings = exports.users = void 0;
exports.insertCustomWidgetSchema = exports.customWidgets = exports.insertSavedQuerySchema = exports.savedQueries = exports.insertFieldVisibilityConfigSchema = exports.fieldVisibilityConfig = exports.schemaVersions = exports.insertServiceScopeFieldSchema = exports.insertPagePermissionSchema = exports.pagePermissions = exports.clientFeedback = exports.clientSatisfactionSurveys = exports.insertSystemEventSchema = exports.insertDataAccessLogSchema = exports.insertSecurityEventSchema = exports.insertChangeHistorySchema = exports.insertAuditLogSchema = exports.dataAccessLogsRelations = exports.securityEventsRelations = exports.changeHistoryRelations = exports.auditLogsRelations = exports.systemEvents = exports.dataAccessLogs = exports.securityEvents = exports.changeHistory = exports.auditLogs = exports.globalSearchIndex = exports.searchHistory = exports.savedSearches = exports.clientExternalMappings = exports.userDashboardSettings = exports.updateCompanySettingsSchema = exports.insertCompanySettingsSchema = exports.insertUserSettingsSchema = exports.insertDocumentAccessSchema = exports.insertDocumentVersionSchema = exports.insertDocumentSchema = exports.documentAccessRelations = exports.documentVersionsRelations = exports.documentsRelations = exports.documentAccess = exports.documentVersions = exports.documents = exports.insertCustomFieldValueSchema = exports.insertCustomFieldSchema = exports.insertClientTeamAssignmentSchema = exports.insertFinancialTransactionSchema = exports.insertClientHardwareAssignmentSchema = exports.insertHardwareAssetSchema = exports.insertCertificateOfComplianceSchema = void 0;
exports.insertUserPreferenceSchema = exports.userPreferences = void 0;
exports.validateSAFClientConsistency = validateSAFClientConsistency;
exports.validateProposalClientConsistency = validateProposalClientConsistency;
exports.validateContractClientConsistency = validateContractClientConsistency;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
const drizzle_orm_1 = require("drizzle-orm");
// Users table for authentication and team management
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    username: (0, pg_core_1.text)("username").notNull().unique(),
    password: (0, pg_core_1.text)("password"), // Made nullable for LDAP users
    email: (0, pg_core_1.text)("email").notNull().unique(),
    firstName: (0, pg_core_1.text)("first_name").notNull(),
    lastName: (0, pg_core_1.text)("last_name").notNull(),
    role: (0, pg_core_1.text)("role").notNull().default("user"), // admin, manager, engineer, etc.
    authProvider: (0, pg_core_1.text)("auth_provider").notNull().default("local"), // local, ldap
    ldapId: (0, pg_core_1.text)("ldap_id").unique(), // LDAP unique identifier (DN or uid)
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
// User settings table for preferences and configurations
exports.userSettings = (0, pg_core_1.pgTable)("user_settings", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.users.id),
    // Notification preferences
    emailNotifications: (0, pg_core_1.boolean)("email_notifications").notNull().default(true),
    pushNotifications: (0, pg_core_1.boolean)("push_notifications").notNull().default(false),
    contractReminders: (0, pg_core_1.boolean)("contract_reminders").notNull().default(true),
    financialAlerts: (0, pg_core_1.boolean)("financial_alerts").notNull().default(true),
    // Security settings
    sessionTimeout: (0, pg_core_1.boolean)("session_timeout").notNull().default(true),
    // System preferences
    darkMode: (0, pg_core_1.boolean)("dark_mode").notNull().default(false),
    theme: (0, pg_core_1.text)("theme").notNull().default("light"), // light, dark, system, or custom theme ID
    timezone: (0, pg_core_1.text)("timezone").notNull().default("America/New_York"),
    language: (0, pg_core_1.text)("language").notNull().default("en"),
    currency: (0, pg_core_1.text)("currency").notNull().default("USD"), // USD, SAR, EUR, GBP, etc.
    autoSaveForms: (0, pg_core_1.boolean)("auto_save_forms").notNull().default(true),
    // Data preferences
    dataExport: (0, pg_core_1.boolean)("data_export").notNull().default(true),
    apiAccess: (0, pg_core_1.boolean)("api_access").notNull().default(false),
    dataRetentionPeriod: (0, pg_core_1.text)("data_retention_period").notNull().default("5years"),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
});
// Company settings table for global configuration
exports.companySettings = (0, pg_core_1.pgTable)("company_settings", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    companyName: (0, pg_core_1.text)("company_name").notNull().default("MSSP Client Manager"),
    currency: (0, pg_core_1.text)("currency").notNull().default("USD"),
    timezone: (0, pg_core_1.text)("timezone").notNull().default("America/New_York"),
    fiscalYearStart: (0, pg_core_1.text)("fiscal_year_start").notNull().default("01-01"),
    dateFormat: (0, pg_core_1.text)("date_format").notNull().default("MM/DD/YYYY"),
    timeFormat: (0, pg_core_1.text)("time_format").notNull().default("12h"),
    logoUrl: (0, pg_core_1.text)("logo_url"),
    primaryColor: (0, pg_core_1.text)("primary_color").notNull().default("#3b82f6"),
    secondaryColor: (0, pg_core_1.text)("secondary_color").notNull().default("#64748b"),
    address: (0, pg_core_1.text)("address"),
    phone: (0, pg_core_1.text)("phone"),
    email: (0, pg_core_1.text)("email"),
    website: (0, pg_core_1.text)("website"),
    taxId: (0, pg_core_1.text)("tax_id"),
    registrationNumber: (0, pg_core_1.text)("registration_number"),
    emailNotificationsEnabled: (0, pg_core_1.boolean)("email_notifications_enabled").notNull().default(true),
    smsNotificationsEnabled: (0, pg_core_1.boolean)("sms_notifications_enabled").notNull().default(false),
    sessionTimeoutMinutes: (0, pg_core_1.integer)("session_timeout_minutes").notNull().default(480),
    passwordExpiryDays: (0, pg_core_1.integer)("password_expiry_days").notNull().default(90),
    maxLoginAttempts: (0, pg_core_1.integer)("max_login_attempts").notNull().default(5),
    auditLogRetentionDays: (0, pg_core_1.integer)("audit_log_retention_days").notNull().default(2555),
    backupRetentionDays: (0, pg_core_1.integer)("backup_retention_days").notNull().default(365),
    apiRateLimit: (0, pg_core_1.integer)("api_rate_limit").notNull().default(1000),
    webhookRetryAttempts: (0, pg_core_1.integer)("webhook_retry_attempts").notNull().default(3),
    advancedSearchEnabled: (0, pg_core_1.boolean)("advanced_search_enabled").notNull().default(true),
    auditLoggingEnabled: (0, pg_core_1.boolean)("audit_logging_enabled").notNull().default(true),
    dataExportEnabled: (0, pg_core_1.boolean)("data_export_enabled").notNull().default(true),
    // LDAP Configuration
    ldapEnabled: (0, pg_core_1.boolean)("ldap_enabled").notNull().default(false),
    ldapUrl: (0, pg_core_1.text)("ldap_url"),
    ldapBindDn: (0, pg_core_1.text)("ldap_bind_dn"),
    ldapBindPassword: (0, pg_core_1.text)("ldap_bind_password"),
    ldapSearchBase: (0, pg_core_1.text)("ldap_search_base"),
    ldapSearchFilter: (0, pg_core_1.text)("ldap_search_filter").default("(uid={{username}})"),
    ldapUsernameAttribute: (0, pg_core_1.text)("ldap_username_attribute").default("uid"),
    ldapEmailAttribute: (0, pg_core_1.text)("ldap_email_attribute").default("mail"),
    ldapFirstNameAttribute: (0, pg_core_1.text)("ldap_first_name_attribute").default("givenName"),
    ldapLastNameAttribute: (0, pg_core_1.text)("ldap_last_name_attribute").default("sn"),
    ldapDefaultRole: (0, pg_core_1.text)("ldap_default_role").default("user"),
    ldapGroupSearchBase: (0, pg_core_1.text)("ldap_group_search_base"),
    ldapGroupSearchFilter: (0, pg_core_1.text)("ldap_group_search_filter"),
    ldapAdminGroup: (0, pg_core_1.text)("ldap_admin_group"),
    ldapManagerGroup: (0, pg_core_1.text)("ldap_manager_group"),
    ldapEngineerGroup: (0, pg_core_1.text)("ldap_engineer_group"),
    ldapConnectionTimeout: (0, pg_core_1.integer)("ldap_connection_timeout").default(5000),
    ldapSearchTimeout: (0, pg_core_1.integer)("ldap_search_timeout").default(10000),
    ldapCertificateVerification: (0, pg_core_1.boolean)("ldap_certificate_verification").notNull().default(true),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
    updatedBy: (0, pg_core_1.integer)("updated_by").references(() => exports.users.id),
});
// Clients table for company information
exports.clients = (0, pg_core_1.pgTable)("clients", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    shortName: (0, pg_core_1.text)("shortName"), // Client short/abbreviated name
    domain: (0, pg_core_1.text)("domain"), // Company domain (e.g., company.com)
    industry: (0, pg_core_1.text)("industry"),
    companySize: (0, pg_core_1.text)("companySize"),
    status: (0, pg_core_1.text)("status").notNull().default("prospect"), // prospect, active, inactive, suspended, archived
    source: (0, pg_core_1.text)("source"), // how they found us
    address: (0, pg_core_1.text)("address"),
    website: (0, pg_core_1.text)("website"),
    notes: (0, pg_core_1.text)("notes"),
    deletedAt: (0, pg_core_1.timestamp)("deletedAt"), // Soft deletion timestamp
    createdAt: (0, pg_core_1.timestamp)("createdAt").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").notNull().defaultNow(),
}, (table) => [
    // Index for performance when filtering out deleted clients
    (0, pg_core_1.index)("idx_clients_active").on(table.deletedAt).where((0, drizzle_orm_1.sql) `${table.deletedAt} IS NULL`),
    (0, pg_core_1.index)("idx_clients_deleted_at").on(table.deletedAt),
    // Status constraint with archived support
    (0, pg_core_1.check)("clients_status_check", (0, drizzle_orm_1.sql) `status = ANY (ARRAY['prospect'::text, 'active'::text, 'inactive'::text, 'suspended'::text, 'archived'::text])`),
]);
// Client contacts for multiple contacts per client
exports.clientContacts = (0, pg_core_1.pgTable)("client_contacts", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    clientId: (0, pg_core_1.integer)("clientId").notNull().references(() => exports.clients.id),
    name: (0, pg_core_1.text)("name").notNull(),
    email: (0, pg_core_1.text)("email").notNull(),
    phone: (0, pg_core_1.text)("phone"),
    title: (0, pg_core_1.text)("title"),
    isPrimary: (0, pg_core_1.boolean)("isPrimary").notNull().default(false),
    isActive: (0, pg_core_1.boolean)("isActive").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("createdAt").notNull().defaultNow(),
});
// Service catalog for all services offered
exports.services = (0, pg_core_1.pgTable)("services", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    category: (0, pg_core_1.text)("category").notNull(), // Security Operations, Network Security, etc.
    description: (0, pg_core_1.text)("description"),
    deliveryModel: (0, pg_core_1.text)("delivery_model").notNull(), // Serverless, On-Prem Engineer, Hybrid
    basePrice: (0, pg_core_1.decimal)("base_price", { precision: 10, scale: 2 }),
    pricingUnit: (0, pg_core_1.text)("pricing_unit"), // per endpoint, per month, per GB/day
    scopeDefinitionTemplate: (0, pg_core_1.jsonb)("scope_definition_template"), // Dynamic form schema - DEPRECATED, use serviceScopeFields instead
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
// New table for service scope field definitions (replaces JSONB approach)
exports.serviceScopeFields = (0, pg_core_1.pgTable)("service_scope_fields", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    serviceId: (0, pg_core_1.integer)("service_id").references(() => exports.services.id),
    name: (0, pg_core_1.text)("name").notNull(), // Field name/key
    label: (0, pg_core_1.text)("label").notNull(), // Display label
    fieldType: (0, pg_core_1.text)("field_type").notNull(), // TEXT_SINGLE_LINE, TEXT_MULTI_LINE, NUMBER_INTEGER, etc.
    isRequired: (0, pg_core_1.boolean)("is_required").notNull().default(false),
    displayOrder: (0, pg_core_1.integer)("display_order").notNull().default(0),
    placeholderText: (0, pg_core_1.text)("placeholder_text"),
    helpText: (0, pg_core_1.text)("help_text"),
    defaultValue: (0, pg_core_1.text)("default_value"),
    selectOptions: (0, pg_core_1.jsonb)("select_options"), // For dropdown/checkbox options
    validationRules: (0, pg_core_1.jsonb)("validation_rules"), // Min/max values, etc.
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
});
// Contracts for client agreements
exports.contracts = (0, pg_core_1.pgTable)("contracts", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    clientId: (0, pg_core_1.integer)("clientId").notNull().references(() => exports.clients.id),
    name: (0, pg_core_1.text)("name").notNull(),
    startDate: (0, pg_core_1.timestamp)("startDate").notNull(),
    endDate: (0, pg_core_1.timestamp)("endDate").notNull(),
    autoRenewal: (0, pg_core_1.boolean)("autoRenewal").notNull().default(false),
    renewalTerms: (0, pg_core_1.text)("renewalTerms"),
    totalValue: (0, pg_core_1.decimal)("totalValue", { precision: 12, scale: 2 }),
    status: (0, pg_core_1.text)("status").notNull().default("draft"), // draft, active, expired, terminated
    documentUrl: (0, pg_core_1.text)("documentUrl"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("createdAt").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updatedAt").notNull().defaultNow(),
});
// Service scopes for each service within a contract
exports.serviceScopes = (0, pg_core_1.pgTable)("service_scopes", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    contractId: (0, pg_core_1.integer)("contract_id").notNull().references(() => exports.contracts.id),
    serviceId: (0, pg_core_1.integer)("service_id").references(() => exports.services.id),
    scopeDefinition: (0, pg_core_1.jsonb)("scope_definition"), // Actual scope parameters
    safDocumentUrl: (0, pg_core_1.text)("saf_document_url"),
    safStartDate: (0, pg_core_1.timestamp)("saf_start_date"),
    safEndDate: (0, pg_core_1.timestamp)("saf_end_date"),
    safStatus: (0, pg_core_1.text)("saf_status").default("pending"), // pending, approved, active, completed
    startDate: (0, pg_core_1.timestamp)("start_date"), // General start date for service scope
    endDate: (0, pg_core_1.timestamp)("end_date"), // General end date for service scope
    status: (0, pg_core_1.text)("status").default("active"), // active, pending, completed, cancelled
    monthlyValue: (0, pg_core_1.decimal)("monthly_value", { precision: 10, scale: 2 }),
    // Human-readable description/title for the particular scope (used in searches)
    description: (0, pg_core_1.text)("description"),
    notes: (0, pg_core_1.text)("notes"),
    // Indexed scope variables for efficient filtering
    eps: (0, pg_core_1.integer)("eps"), // Events Per Second
    endpoints: (0, pg_core_1.integer)("endpoints"), // EDR/Endpoint count
    dataVolumeGb: (0, pg_core_1.decimal)("data_volume_gb", { precision: 10, scale: 2 }), // Data volume in GB
    logSources: (0, pg_core_1.integer)("log_sources"), // For SIEM services
    firewallDevices: (0, pg_core_1.integer)("firewall_devices"), // For Firewall services
    pamUsers: (0, pg_core_1.integer)("pam_users"), // For PAM services
    responseTimeMinutes: (0, pg_core_1.integer)("response_time_minutes"), // Response time in minutes
    coverageHours: (0, pg_core_1.text)("coverage_hours"), // Coverage hours (8x5, 16x5, 24x7)
    serviceTier: (0, pg_core_1.text)("service_tier"), // Enterprise, Professional, Standard
    // Link back to SAF that authorized this service scope (nullable)
    safId: (0, pg_core_1.integer)("saf_id").references(() => exports.serviceAuthorizationForms.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
});
// Dynamic scope variable definitions table
exports.scopeVariableDefinitions = (0, pg_core_1.pgTable)('scope_variable_definitions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    variableName: (0, pg_core_1.varchar)('variable_name', { length: 100 }).notNull().unique(),
    variableType: (0, pg_core_1.varchar)('variable_type', { length: 20 }).notNull(), // integer, decimal, text, boolean
    displayName: (0, pg_core_1.varchar)('display_name', { length: 200 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    isFilterable: (0, pg_core_1.boolean)('is_filterable').default(true),
    isIndexed: (0, pg_core_1.boolean)('is_indexed').default(false),
    filterComponent: (0, pg_core_1.varchar)('filter_component', { length: 50 }), // range, select, text, boolean
    unit: (0, pg_core_1.varchar)('unit', { length: 20 }), // GB, minutes, endpoints, etc.
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
// Dynamic scope variable values table
exports.scopeVariableValues = (0, pg_core_1.pgTable)('scope_variable_values', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    serviceScopeId: (0, pg_core_1.integer)('service_scope_id').notNull().references(() => exports.serviceScopes.id, { onDelete: 'cascade' }),
    variableName: (0, pg_core_1.varchar)('variable_name', { length: 100 }).notNull().references(() => exports.scopeVariableDefinitions.variableName),
    valueText: (0, pg_core_1.text)('value_text'),
    valueInteger: (0, pg_core_1.integer)('value_integer'),
    valueDecimal: (0, pg_core_1.decimal)('value_decimal', { precision: 15, scale: 4 }),
    valueBoolean: (0, pg_core_1.boolean)('value_boolean'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (table) => ({
    uniqueScope: (0, pg_core_1.unique)().on(table.serviceScopeId, table.variableName),
}));
// Proposals for tracking technical and financial proposals
exports.proposals = (0, pg_core_1.pgTable)("proposals", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    contractId: (0, pg_core_1.integer)("contract_id").notNull().references(() => exports.contracts.id),
    type: (0, pg_core_1.text)("type").notNull(), // technical, financial
    version: (0, pg_core_1.text)("version").notNull().default("1.0"),
    status: (0, pg_core_1.text)("status").notNull().default("draft"), // draft, sent, accepted, rejected
    documentUrl: (0, pg_core_1.text)("document_url"),
    proposedValue: (0, pg_core_1.decimal)("proposed_value", { precision: 12, scale: 2 }),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
});
// License pools for software license management
exports.licensePools = (0, pg_core_1.pgTable)("license_pools", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    vendor: (0, pg_core_1.text)("vendor").notNull(),
    productName: (0, pg_core_1.text)("product_name").notNull(),
    licenseType: (0, pg_core_1.text)("license_type"), // per user, per device, concurrent
    totalLicenses: (0, pg_core_1.integer)("total_licenses").notNull(),
    availableLicenses: (0, pg_core_1.integer)("available_licenses").notNull(),
    orderedLicenses: (0, pg_core_1.integer)("ordered_licenses").notNull().default(0), // Track how many were ordered
    costPerLicense: (0, pg_core_1.decimal)("cost_per_license", { precision: 8, scale: 2 }),
    renewalDate: (0, pg_core_1.timestamp)("renewal_date"),
    purchaseRequestNumber: (0, pg_core_1.text)("purchase_request_number"), // PR number
    purchaseOrderNumber: (0, pg_core_1.text)("purchase_order_number"), // PO number
    notes: (0, pg_core_1.text)("notes"),
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
// Client license assignments
exports.clientLicenses = (0, pg_core_1.pgTable)("client_licenses", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    clientId: (0, pg_core_1.integer)("client_id").notNull().references(() => exports.clients.id),
    licensePoolId: (0, pg_core_1.integer)("license_pool_id").notNull().references(() => exports.licensePools.id),
    serviceScopeId: (0, pg_core_1.integer)("service_scope_id").references(() => exports.serviceScopes.id),
    assignedLicenses: (0, pg_core_1.integer)("assigned_licenses").notNull(),
    assignedDate: (0, pg_core_1.timestamp)("assigned_date").notNull().defaultNow(),
    notes: (0, pg_core_1.text)("notes"),
});
// Individual licenses (not from pools)
exports.individualLicenses = (0, pg_core_1.pgTable)("individual_licenses", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    clientId: (0, pg_core_1.integer)("client_id").notNull().references(() => exports.clients.id),
    serviceScopeId: (0, pg_core_1.integer)("service_scope_id").references(() => exports.serviceScopes.id),
    name: (0, pg_core_1.text)("name").notNull(),
    vendor: (0, pg_core_1.text)("vendor").notNull(),
    productName: (0, pg_core_1.text)("product_name").notNull(),
    licenseKey: (0, pg_core_1.text)("license_key"),
    licenseType: (0, pg_core_1.text)("license_type"), // per user, per device, concurrent
    quantity: (0, pg_core_1.integer)("quantity").notNull().default(1),
    costPerLicense: (0, pg_core_1.decimal)("cost_per_license", { precision: 8, scale: 2 }),
    purchaseDate: (0, pg_core_1.timestamp)("purchase_date"),
    expiryDate: (0, pg_core_1.timestamp)("expiry_date"),
    renewalDate: (0, pg_core_1.timestamp)("renewal_date"),
    purchaseRequestNumber: (0, pg_core_1.text)("purchase_request_number"), // PR number
    purchaseOrderNumber: (0, pg_core_1.text)("purchase_order_number"), // PO number
    documentUrl: (0, pg_core_1.text)("document_url"), // License document/certificate
    status: (0, pg_core_1.text)("status").notNull().default("active"), // active, expired, suspended, cancelled
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
});
// Service Authorization Forms (SAF)
exports.serviceAuthorizationForms = (0, pg_core_1.pgTable)("service_authorization_forms", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    clientId: (0, pg_core_1.integer)("client_id").references(() => exports.clients.id).notNull(),
    contractId: (0, pg_core_1.integer)("contract_id").references(() => exports.contracts.id).notNull(),
    serviceScopeId: (0, pg_core_1.integer)("service_scope_id").references(() => exports.serviceScopes.id),
    safNumber: (0, pg_core_1.text)("saf_number").notNull(),
    title: (0, pg_core_1.text)("title").notNull(), // Added missing title column
    description: (0, pg_core_1.text)("description"),
    status: (0, pg_core_1.text)("status").default("pending"), // pending, approved, rejected, expired
    requestedDate: (0, pg_core_1.timestamp)("requested_date").notNull(),
    approvedDate: (0, pg_core_1.timestamp)("approved_date"),
    expiryDate: (0, pg_core_1.timestamp)("expiry_date"),
    approvedBy: (0, pg_core_1.integer)("approved_by").references(() => exports.users.id),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
});
// Certificate of Compliance (COC)
exports.certificatesOfCompliance = (0, pg_core_1.pgTable)("certificates_of_compliance", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    clientId: (0, pg_core_1.integer)("client_id").references(() => exports.clients.id).notNull(),
    contractId: (0, pg_core_1.integer)("contract_id").references(() => exports.contracts.id),
    serviceScopeId: (0, pg_core_1.integer)("service_scope_id").references(() => exports.serviceScopes.id),
    safId: (0, pg_core_1.integer)("saf_id").references(() => exports.serviceAuthorizationForms.id),
    cocNumber: (0, pg_core_1.text)("coc_number").notNull(),
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description"),
    complianceType: (0, pg_core_1.text)("compliance_type").notNull(),
    issueDate: (0, pg_core_1.timestamp)("issue_date").notNull(),
    expiryDate: (0, pg_core_1.timestamp)("expiry_date"),
    status: (0, pg_core_1.text)("status").default("active"),
    documentUrl: (0, pg_core_1.text)("document_url"),
    issuedBy: (0, pg_core_1.integer)("issued_by").references(() => exports.users.id),
    auditDate: (0, pg_core_1.timestamp)("audit_date"),
    nextAuditDate: (0, pg_core_1.timestamp)("next_audit_date"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Hardware assets catalog
exports.hardwareAssets = (0, pg_core_1.pgTable)("hardware_assets", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    category: (0, pg_core_1.text)("category").notNull(), // Firewall, Server, Appliance
    manufacturer: (0, pg_core_1.text)("manufacturer"),
    model: (0, pg_core_1.text)("model"),
    serialNumber: (0, pg_core_1.text)("serial_number").unique(),
    purchaseDate: (0, pg_core_1.timestamp)("purchase_date"),
    purchaseCost: (0, pg_core_1.decimal)("purchase_cost", { precision: 10, scale: 2 }),
    warrantyExpiry: (0, pg_core_1.timestamp)("warranty_expiry"),
    status: (0, pg_core_1.text)("status").notNull().default("available"), // available, assigned, maintenance, retired, lost
    location: (0, pg_core_1.text)("location"),
    purchaseRequestNumber: (0, pg_core_1.text)("purchase_request_number"), // PR number
    purchaseOrderNumber: (0, pg_core_1.text)("purchase_order_number"), // PO number
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
// Client hardware assignments
exports.clientHardwareAssignments = (0, pg_core_1.pgTable)("client_hardware_assignments", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    clientId: (0, pg_core_1.integer)("client_id").notNull().references(() => exports.clients.id),
    hardwareAssetId: (0, pg_core_1.integer)("hardware_asset_id").notNull().references(() => exports.hardwareAssets.id),
    serviceScopeId: (0, pg_core_1.integer)("service_scope_id").references(() => exports.serviceScopes.id),
    assignedDate: (0, pg_core_1.timestamp)("assigned_date").notNull().defaultNow(),
    returnedDate: (0, pg_core_1.timestamp)("returned_date"),
    installationLocation: (0, pg_core_1.text)("installation_location"),
    status: (0, pg_core_1.text)("status").notNull().default("active"), // active, returned, maintenance
    notes: (0, pg_core_1.text)("notes"),
});
// Financial transactions for cost and revenue tracking
exports.financialTransactions = (0, pg_core_1.pgTable)("financial_transactions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    type: (0, pg_core_1.text)("type").notNull(), // cost, revenue
    amount: (0, pg_core_1.decimal)("amount", { precision: 12, scale: 2 }).notNull(),
    description: (0, pg_core_1.text)("description").notNull(),
    status: (0, pg_core_1.text)("status").notNull().default("pending"), // pending, completed, failed, cancelled
    clientId: (0, pg_core_1.integer)("client_id").references(() => exports.clients.id),
    contractId: (0, pg_core_1.integer)("contract_id").references(() => exports.contracts.id),
    serviceScopeId: (0, pg_core_1.integer)("service_scope_id").references(() => exports.serviceScopes.id),
    licensePoolId: (0, pg_core_1.integer)("license_pool_id").references(() => exports.licensePools.id),
    hardwareAssetId: (0, pg_core_1.integer)("hardware_asset_id").references(() => exports.hardwareAssets.id),
    transactionDate: (0, pg_core_1.timestamp)("transaction_date").notNull(),
    category: (0, pg_core_1.text)("category"), // licensing, hardware, services, etc.
    reference: (0, pg_core_1.text)("reference"), // invoice number, PO number, etc.
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
// Client team assignments for role-based access
exports.clientTeamAssignments = (0, pg_core_1.pgTable)("client_team_assignments", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    clientId: (0, pg_core_1.integer)("client_id").notNull().references(() => exports.clients.id),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.users.id),
    role: (0, pg_core_1.text)("role").notNull(), // Account Manager, Lead Engineer, Project Manager
    assignedDate: (0, pg_core_1.timestamp)("assigned_date").notNull().defaultNow(),
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    notes: (0, pg_core_1.text)("notes"),
});
// Custom fields for extensibility
exports.customFields = (0, pg_core_1.pgTable)("custom_fields", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    entityType: (0, pg_core_1.text)("entity_type").notNull(), // clients, contracts, proposals, etc.
    fieldName: (0, pg_core_1.text)("field_name").notNull(),
    fieldType: (0, pg_core_1.text)("field_type").notNull(), // text, number, date, select, boolean
    fieldOptions: (0, pg_core_1.jsonb)("field_options"), // for select fields
    isRequired: (0, pg_core_1.boolean)("is_required").notNull().default(false),
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
// Custom field values
exports.customFieldValues = (0, pg_core_1.pgTable)("custom_field_values", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    customFieldId: (0, pg_core_1.integer)("custom_field_id").notNull().references(() => exports.customFields.id),
    entityId: (0, pg_core_1.integer)("entity_id").notNull(),
    value: (0, pg_core_1.text)("value"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
});
// Relations
exports.clientsRelations = (0, drizzle_orm_1.relations)(exports.clients, ({ many }) => ({
    contacts: many(exports.clientContacts),
    contracts: many(exports.contracts),
    licenses: many(exports.clientLicenses),
    individualLicenses: many(exports.individualLicenses),
    hardwareAssignments: many(exports.clientHardwareAssignments),
    teamAssignments: many(exports.clientTeamAssignments),
    transactions: many(exports.financialTransactions),
    serviceAuthorizationForms: many(exports.serviceAuthorizationForms),
    certificatesOfCompliance: many(exports.certificatesOfCompliance),
    externalMappings: many(exports.clientExternalMappings),
}));
exports.clientContactsRelations = (0, drizzle_orm_1.relations)(exports.clientContacts, ({ one }) => ({
    client: one(exports.clients, { fields: [exports.clientContacts.clientId], references: [exports.clients.id] }),
}));
exports.contractsRelations = (0, drizzle_orm_1.relations)(exports.contracts, ({ one, many }) => ({
    client: one(exports.clients, { fields: [exports.contracts.clientId], references: [exports.clients.id] }),
    serviceScopes: many(exports.serviceScopes),
    proposals: many(exports.proposals),
    transactions: many(exports.financialTransactions),
}));
exports.servicesRelations = (0, drizzle_orm_1.relations)(exports.services, ({ many }) => ({
    serviceScopes: many(exports.serviceScopes),
}));
exports.serviceScopesRelations = (0, drizzle_orm_1.relations)(exports.serviceScopes, ({ one, many }) => ({
    contract: one(exports.contracts, { fields: [exports.serviceScopes.contractId], references: [exports.contracts.id] }),
    service: one(exports.services, { fields: [exports.serviceScopes.serviceId], references: [exports.services.id] }),
    licenses: many(exports.clientLicenses),
    hardwareAssignments: many(exports.clientHardwareAssignments),
    transactions: many(exports.financialTransactions),
}));
exports.proposalsRelations = (0, drizzle_orm_1.relations)(exports.proposals, ({ one }) => ({
    contract: one(exports.contracts, { fields: [exports.proposals.contractId], references: [exports.contracts.id] }),
}));
exports.licensePoolsRelations = (0, drizzle_orm_1.relations)(exports.licensePools, ({ many }) => ({
    assignments: many(exports.clientLicenses),
    transactions: many(exports.financialTransactions),
}));
exports.clientLicensesRelations = (0, drizzle_orm_1.relations)(exports.clientLicenses, ({ one }) => ({
    client: one(exports.clients, { fields: [exports.clientLicenses.clientId], references: [exports.clients.id] }),
    licensePool: one(exports.licensePools, { fields: [exports.clientLicenses.licensePoolId], references: [exports.licensePools.id] }),
    serviceScope: one(exports.serviceScopes, { fields: [exports.clientLicenses.serviceScopeId], references: [exports.serviceScopes.id] }),
}));
exports.individualLicensesRelations = (0, drizzle_orm_1.relations)(exports.individualLicenses, ({ one }) => ({
    client: one(exports.clients, { fields: [exports.individualLicenses.clientId], references: [exports.clients.id] }),
    serviceScope: one(exports.serviceScopes, { fields: [exports.individualLicenses.serviceScopeId], references: [exports.serviceScopes.id] }),
}));
exports.serviceAuthorizationFormsRelations = (0, drizzle_orm_1.relations)(exports.serviceAuthorizationForms, ({ one, many }) => ({
    client: one(exports.clients, { fields: [exports.serviceAuthorizationForms.clientId], references: [exports.clients.id] }),
    contract: one(exports.contracts, { fields: [exports.serviceAuthorizationForms.contractId], references: [exports.contracts.id] }),
    serviceScope: one(exports.serviceScopes, { fields: [exports.serviceAuthorizationForms.serviceScopeId], references: [exports.serviceScopes.id] }),
    approvedByUser: one(exports.users, { fields: [exports.serviceAuthorizationForms.approvedBy], references: [exports.users.id] }),
    certificatesOfCompliance: many(exports.certificatesOfCompliance),
}));
exports.certificatesOfComplianceRelations = (0, drizzle_orm_1.relations)(exports.certificatesOfCompliance, ({ one }) => ({
    client: one(exports.clients, { fields: [exports.certificatesOfCompliance.clientId], references: [exports.clients.id] }),
    contract: one(exports.contracts, { fields: [exports.certificatesOfCompliance.contractId], references: [exports.contracts.id] }),
    serviceScope: one(exports.serviceScopes, { fields: [exports.certificatesOfCompliance.serviceScopeId], references: [exports.serviceScopes.id] }),
    saf: one(exports.serviceAuthorizationForms, { fields: [exports.certificatesOfCompliance.safId], references: [exports.serviceAuthorizationForms.id] }),
    issuedByUser: one(exports.users, { fields: [exports.certificatesOfCompliance.issuedBy], references: [exports.users.id] }),
}));
exports.hardwareAssetsRelations = (0, drizzle_orm_1.relations)(exports.hardwareAssets, ({ many }) => ({
    assignments: many(exports.clientHardwareAssignments),
    transactions: many(exports.financialTransactions),
}));
exports.clientHardwareAssignmentsRelations = (0, drizzle_orm_1.relations)(exports.clientHardwareAssignments, ({ one }) => ({
    client: one(exports.clients, { fields: [exports.clientHardwareAssignments.clientId], references: [exports.clients.id] }),
    hardwareAsset: one(exports.hardwareAssets, { fields: [exports.clientHardwareAssignments.hardwareAssetId], references: [exports.hardwareAssets.id] }),
    serviceScope: one(exports.serviceScopes, { fields: [exports.clientHardwareAssignments.serviceScopeId], references: [exports.serviceScopes.id] }),
}));
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ one, many }) => ({
    settings: one(exports.userSettings, { fields: [exports.users.id], references: [exports.userSettings.userId] }),
    teamAssignments: many(exports.clientTeamAssignments),
}));
exports.userSettingsRelations = (0, drizzle_orm_1.relations)(exports.userSettings, ({ one }) => ({
    user: one(exports.users, { fields: [exports.userSettings.userId], references: [exports.users.id] }),
}));
exports.clientTeamAssignmentsRelations = (0, drizzle_orm_1.relations)(exports.clientTeamAssignments, ({ one }) => ({
    client: one(exports.clients, { fields: [exports.clientTeamAssignments.clientId], references: [exports.clients.id] }),
    user: one(exports.users, { fields: [exports.clientTeamAssignments.userId], references: [exports.users.id] }),
}));
// Insert schemas
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).omit({
    id: true,
    createdAt: true,
});
exports.insertClientSchema = (0, drizzle_zod_1.createInsertSchema)(exports.clients).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertClientContactSchema = (0, drizzle_zod_1.createInsertSchema)(exports.clientContacts).omit({
    id: true,
    createdAt: true,
});
exports.insertServiceSchema = (0, drizzle_zod_1.createInsertSchema)(exports.services).omit({
    id: true,
    createdAt: true,
});
exports.insertContractSchema = (0, drizzle_zod_1.createInsertSchema)(exports.contracts, {
    // Transform string dates to Date objects for timestamp fields
    startDate: zod_1.z.string().transform((str) => new Date(str)),
    endDate: zod_1.z.string().transform((str) => new Date(str)),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertServiceScopeSchema = (0, drizzle_zod_1.createInsertSchema)(exports.serviceScopes, {
    // Transform string dates to Date objects for timestamp fields
    safStartDate: zod_1.z.string().optional().transform((str) => str ? new Date(str) : undefined),
    safEndDate: zod_1.z.string().optional().transform((str) => str ? new Date(str) : undefined),
    startDate: zod_1.z.string().optional().transform((str) => str ? new Date(str) : undefined),
    endDate: zod_1.z.string().optional().transform((str) => str ? new Date(str) : undefined),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertProposalSchema = (0, drizzle_zod_1.createInsertSchema)(exports.proposals).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertLicensePoolSchema = (0, drizzle_zod_1.createInsertSchema)(exports.licensePools, {
    // Transform string dates to Date objects for timestamp fields
    renewalDate: zod_1.z.string().optional().transform((str) => str ? new Date(str) : undefined),
}).omit({
    id: true,
    createdAt: true,
    availableLicenses: true, // Auto-calculated on backend
});
exports.insertClientLicenseSchema = (0, drizzle_zod_1.createInsertSchema)(exports.clientLicenses).omit({
    id: true,
    assignedDate: true,
});
exports.insertIndividualLicenseSchema = (0, drizzle_zod_1.createInsertSchema)(exports.individualLicenses, {
    // Transform string dates to Date objects for timestamp fields
    purchaseDate: zod_1.z.string().optional().transform((str) => str ? new Date(str) : undefined),
    expiryDate: zod_1.z.string().optional().transform((str) => str ? new Date(str) : undefined),
    renewalDate: zod_1.z.string().optional().transform((str) => str ? new Date(str) : undefined),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertServiceAuthorizationFormSchema = (0, drizzle_zod_1.createInsertSchema)(exports.serviceAuthorizationForms).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertCertificateOfComplianceSchema = (0, drizzle_zod_1.createInsertSchema)(exports.certificatesOfCompliance, {
    // Transform string dates to Date objects for timestamp fields
    issueDate: zod_1.z.string().transform((str) => new Date(str)),
    expiryDate: zod_1.z.string().optional().transform((str) => str ? new Date(str) : undefined),
    auditDate: zod_1.z.string().optional().transform((str) => str ? new Date(str) : undefined),
    nextAuditDate: zod_1.z.string().optional().transform((str) => str ? new Date(str) : undefined),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertHardwareAssetSchema = (0, drizzle_zod_1.createInsertSchema)(exports.hardwareAssets, {
    // Transform string dates to Date objects for timestamp fields
    purchaseDate: zod_1.z.string().optional().transform((str) => str ? new Date(str) : undefined),
    warrantyExpiry: zod_1.z.string().optional().transform((str) => str ? new Date(str) : undefined),
}).omit({
    id: true,
    createdAt: true,
});
exports.insertClientHardwareAssignmentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.clientHardwareAssignments).omit({
    id: true,
    assignedDate: true,
});
exports.insertFinancialTransactionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.financialTransactions, {
    // Transform string dates to Date objects for timestamp fields
    transactionDate: zod_1.z.string().transform((str) => new Date(str)),
}).omit({
    id: true,
    createdAt: true,
});
exports.insertClientTeamAssignmentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.clientTeamAssignments).omit({
    id: true,
    assignedDate: true,
});
exports.insertCustomFieldSchema = (0, drizzle_zod_1.createInsertSchema)(exports.customFields).omit({
    id: true,
    createdAt: true,
});
exports.insertCustomFieldValueSchema = (0, drizzle_zod_1.createInsertSchema)(exports.customFieldValues).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// Document Management System
exports.documents = (0, pg_core_1.pgTable)("documents", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    documentType: (0, pg_core_1.text)("document_type").notNull(), // contract, proposal, technical_doc, financial_report
    fileName: (0, pg_core_1.text)("file_name").notNull(),
    filePath: (0, pg_core_1.text)("file_path").notNull(),
    fileSize: (0, pg_core_1.integer)("file_size").notNull(), // in bytes
    mimeType: (0, pg_core_1.text)("mime_type").notNull(),
    version: (0, pg_core_1.integer)("version").notNull().default(1),
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    clientId: (0, pg_core_1.integer)("client_id").references(() => exports.clients.id),
    contractId: (0, pg_core_1.integer)("contract_id").references(() => exports.contracts.id),
    tags: (0, pg_core_1.text)("tags").array(),
    expirationDate: (0, pg_core_1.timestamp)("expiration_date"),
    complianceType: (0, pg_core_1.text)("compliance_type"),
    uploadedBy: (0, pg_core_1.integer)("uploaded_by").notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
});
exports.documentVersions = (0, pg_core_1.pgTable)("document_versions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    documentId: (0, pg_core_1.integer)("document_id").notNull().references(() => exports.documents.id),
    version: (0, pg_core_1.integer)("version").notNull(),
    fileName: (0, pg_core_1.text)("file_name").notNull(),
    filePath: (0, pg_core_1.text)("file_path").notNull(),
    fileSize: (0, pg_core_1.integer)("file_size").notNull(),
    changeNotes: (0, pg_core_1.text)("change_notes"),
    uploadedBy: (0, pg_core_1.integer)("uploaded_by").notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
exports.documentAccess = (0, pg_core_1.pgTable)("document_access", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    documentId: (0, pg_core_1.integer)("document_id").notNull().references(() => exports.documents.id),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.users.id),
    accessType: (0, pg_core_1.text)("access_type").notNull(), // read, write, admin
    grantedBy: (0, pg_core_1.integer)("granted_by").notNull().references(() => exports.users.id),
    grantedAt: (0, pg_core_1.timestamp)("granted_at").notNull().defaultNow(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
});
// Document relations
exports.documentsRelations = (0, drizzle_orm_1.relations)(exports.documents, ({ one, many }) => ({
    client: one(exports.clients, { fields: [exports.documents.clientId], references: [exports.clients.id] }),
    contract: one(exports.contracts, { fields: [exports.documents.contractId], references: [exports.contracts.id] }),
    uploadedByUser: one(exports.users, { fields: [exports.documents.uploadedBy], references: [exports.users.id] }),
    versions: many(exports.documentVersions),
    access: many(exports.documentAccess),
}));
exports.documentVersionsRelations = (0, drizzle_orm_1.relations)(exports.documentVersions, ({ one }) => ({
    document: one(exports.documents, { fields: [exports.documentVersions.documentId], references: [exports.documents.id] }),
    uploadedByUser: one(exports.users, { fields: [exports.documentVersions.uploadedBy], references: [exports.users.id] }),
}));
exports.documentAccessRelations = (0, drizzle_orm_1.relations)(exports.documentAccess, ({ one }) => ({
    document: one(exports.documents, { fields: [exports.documentAccess.documentId], references: [exports.documents.id] }),
    user: one(exports.users, { fields: [exports.documentAccess.userId], references: [exports.users.id] }),
    grantedByUser: one(exports.users, { fields: [exports.documentAccess.grantedBy], references: [exports.users.id] }),
}));
// Document schemas
exports.insertDocumentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.documents).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertDocumentVersionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.documentVersions).omit({
    id: true,
    createdAt: true,
});
exports.insertDocumentAccessSchema = (0, drizzle_zod_1.createInsertSchema)(exports.documentAccess).omit({
    id: true,
    grantedAt: true,
});
// User settings schemas
exports.insertUserSettingsSchema = (0, drizzle_zod_1.createInsertSchema)(exports.userSettings).omit({
    id: true,
    updatedAt: true,
});
// Company settings schemas
exports.insertCompanySettingsSchema = (0, drizzle_zod_1.createInsertSchema)(exports.companySettings).omit({
    id: true,
    updatedAt: true,
});
exports.updateCompanySettingsSchema = (0, drizzle_zod_1.createInsertSchema)(exports.companySettings).omit({
    id: true,
    updatedAt: true,
    updatedBy: true,
}).partial();
// User dashboard card settings - stores personalized dashboard configuration
exports.userDashboardSettings = (0, pg_core_1.pgTable)("user_dashboard_settings", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    cardId: (0, pg_core_1.text)("card_id").notNull(), // Unique identifier for the card
    title: (0, pg_core_1.text)("title").notNull(),
    type: (0, pg_core_1.text)("type").notNull(), // 'metric' | 'chart' | 'table' | 'custom' | 'builtin'
    category: (0, pg_core_1.text)("category").notNull().default("dashboard"), // 'dashboard' | 'kpi' | 'chart' | 'custom'
    dataSource: (0, pg_core_1.text)("data_source").notNull(),
    size: (0, pg_core_1.text)("size").notNull().default("small"), // 'small' | 'medium' | 'large' | 'xlarge'
    visible: (0, pg_core_1.boolean)("visible").notNull().default(true),
    position: (0, pg_core_1.integer)("position").notNull().default(0), // Display order
    config: (0, pg_core_1.jsonb)("config").notNull().default('{}'), // Card-specific configuration
    isBuiltIn: (0, pg_core_1.boolean)("is_built_in").notNull().default(false), // Whether this is a built-in card
    isRemovable: (0, pg_core_1.boolean)("is_removable").notNull().default(true), // Whether user can delete this card
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
}, (table) => ({
    // Ensure each user has unique card configurations
    userCardUnique: (0, pg_core_1.unique)().on(table.userId, table.cardId),
}));
// API Aggregator for Dynamic Client Data
// Client external mappings for API aggregation
// ⚠️ DEPRECATED: Client external mappings - Use Plugin-based client associations instead
exports.clientExternalMappings = (0, pg_core_1.pgTable)("client_external_mappings", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    clientId: (0, pg_core_1.integer)("client_id").notNull().references(() => exports.clients.id, { onDelete: 'cascade' }),
    systemName: (0, pg_core_1.text)("system_name").notNull(), // 'jira', 'grafana', 'servicenow', etc.
    externalIdentifier: (0, pg_core_1.text)("external_identifier").notNull(), // Project key, dashboard UID, etc.
    metadata: (0, pg_core_1.jsonb)("metadata"), // Additional config like specific dashboard panels, filters, etc.
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
});
// Advanced Search & Filtering System
exports.savedSearches = (0, pg_core_1.pgTable)("saved_searches", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.users.id),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    searchConfig: (0, pg_core_1.text)("search_config").notNull(), // JSON string of search configuration
    entityTypes: (0, pg_core_1.text)("entity_types").array().notNull(), // ['clients', 'contracts', 'services', etc.]
    isPublic: (0, pg_core_1.boolean)("is_public").notNull().default(false),
    isQuickFilter: (0, pg_core_1.boolean)("is_quick_filter").notNull().default(false),
    useCount: (0, pg_core_1.integer)("use_count").notNull().default(0),
    lastUsed: (0, pg_core_1.timestamp)("last_used"),
    tags: (0, pg_core_1.text)("tags").array(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
});
exports.searchHistory = (0, pg_core_1.pgTable)("search_history", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.users.id),
    searchQuery: (0, pg_core_1.text)("search_query").notNull(),
    searchConfig: (0, pg_core_1.text)("search_config"), // JSON string of advanced search config
    entityTypes: (0, pg_core_1.text)("entity_types").array().notNull(),
    resultsCount: (0, pg_core_1.integer)("results_count").notNull().default(0),
    executionTime: (0, pg_core_1.integer)("execution_time"), // milliseconds
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
});
exports.globalSearchIndex = (0, pg_core_1.pgTable)("global_search_index", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    entityType: (0, pg_core_1.text)("entity_type").notNull(), // 'client', 'contract', 'service', etc.
    entityId: (0, pg_core_1.integer)("entity_id").notNull(),
    searchContent: (0, pg_core_1.text)("search_content").notNull(), // Concatenated searchable text
    keywords: (0, pg_core_1.text)("keywords").array(), // Extracted keywords
    lastIndexed: (0, pg_core_1.timestamp)("last_indexed").notNull().defaultNow(),
});
// Audit Logging System for Security & Compliance
exports.auditLogs = (0, pg_core_1.pgTable)("audit_logs", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").references(() => exports.users.id), // null for system events
    sessionId: (0, pg_core_1.text)("session_id"), // For tracking user sessions
    action: (0, pg_core_1.text)("action").notNull(), // 'create', 'update', 'delete', 'view', 'login', 'logout', 'export', 'import'
    entityType: (0, pg_core_1.text)("entity_type").notNull(), // 'client', 'contract', 'user', 'system', etc.
    entityId: (0, pg_core_1.integer)("entity_id"), // ID of the affected entity (null for bulk operations)
    entityName: (0, pg_core_1.text)("entity_name"), // Name/title for easy identification
    description: (0, pg_core_1.text)("description").notNull(), // Human readable description of the action
    ipAddress: (0, pg_core_1.text)("ip_address"), // User's IP address
    userAgent: (0, pg_core_1.text)("user_agent"), // User's browser/agent string
    severity: (0, pg_core_1.text)("severity").notNull().default("info"), // 'low', 'medium', 'high', 'critical'
    category: (0, pg_core_1.text)("category").notNull(), // 'authentication', 'data_access', 'data_modification', 'security', 'compliance'
    metadata: (0, pg_core_1.jsonb)("metadata"), // Additional contextual data
    timestamp: (0, pg_core_1.timestamp)("timestamp").notNull().defaultNow(),
});
exports.changeHistory = (0, pg_core_1.pgTable)("change_history", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    entityType: (0, pg_core_1.text)("entity_type").notNull(), // 'client', 'contract', 'service', etc.
    entityId: (0, pg_core_1.integer)("entity_id").notNull(),
    entityName: (0, pg_core_1.text)("entity_name"), // For easier identification
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.users.id),
    action: (0, pg_core_1.text)("action").notNull(), // 'create', 'update', 'delete'
    fieldName: (0, pg_core_1.text)("field_name"), // Specific field that was changed (null for create/delete)
    oldValue: (0, pg_core_1.text)("old_value"), // Previous value (JSON string for complex data)
    newValue: (0, pg_core_1.text)("new_value"), // New value (JSON string for complex data)
    changeReason: (0, pg_core_1.text)("change_reason"), // Optional reason for the change
    automaticChange: (0, pg_core_1.boolean)("automatic_change").notNull().default(false), // System vs user initiated
    batchId: (0, pg_core_1.text)("batch_id"), // For grouping multiple changes from one operation
    rollbackData: (0, pg_core_1.jsonb)("rollback_data"), // Data needed to revert this change
    ipAddress: (0, pg_core_1.text)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    timestamp: (0, pg_core_1.timestamp)("timestamp").notNull().defaultNow(),
});
exports.securityEvents = (0, pg_core_1.pgTable)("security_events", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").references(() => exports.users.id),
    eventType: (0, pg_core_1.text)("event_type").notNull(), // 'login_success', 'login_failure', 'logout', 'password_change', 'permission_denied', 'suspicious_activity'
    source: (0, pg_core_1.text)("source").notNull(), // 'web', 'api', 'mobile', 'system'
    ipAddress: (0, pg_core_1.text)("ip_address").notNull(),
    userAgent: (0, pg_core_1.text)("user_agent"),
    location: (0, pg_core_1.text)("location"), // Geolocation if available
    deviceFingerprint: (0, pg_core_1.text)("device_fingerprint"), // Browser/device fingerprinting
    success: (0, pg_core_1.boolean)("success").notNull(),
    failureReason: (0, pg_core_1.text)("failure_reason"), // Why the event failed
    riskScore: (0, pg_core_1.integer)("risk_score"), // 0-100 risk assessment
    blocked: (0, pg_core_1.boolean)("blocked").notNull().default(false), // Was this event blocked
    entityType: (0, pg_core_1.text)("entity_type"), // Optional entity context for this event
    entityId: (0, pg_core_1.integer)("entity_id"),
    metadata: (0, pg_core_1.jsonb)("metadata"), // Additional security context
    timestamp: (0, pg_core_1.timestamp)("timestamp").notNull().defaultNow(),
});
exports.dataAccessLogs = (0, pg_core_1.pgTable)("data_access_logs", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.users.id),
    entityType: (0, pg_core_1.text)("entity_type").notNull(), // What type of data was accessed
    entityId: (0, pg_core_1.integer)("entity_id"), // Specific record accessed (null for list views)
    entityName: (0, pg_core_1.text)("entity_name"), // For easier identification
    accessType: (0, pg_core_1.text)("access_type").notNull(), // 'view', 'list', 'search', 'export', 'print'
    accessMethod: (0, pg_core_1.text)("access_method").notNull(), // 'web_ui', 'api', 'bulk_export', 'report'
    dataScope: (0, pg_core_1.text)("data_scope"), // 'full', 'partial', 'summary' - level of data accessed
    filters: (0, pg_core_1.jsonb)("filters"), // What filters/criteria were used
    resultCount: (0, pg_core_1.integer)("result_count"), // Number of records accessed
    sensitiveData: (0, pg_core_1.boolean)("sensitive_data").notNull().default(false), // Contains PII/sensitive info
    purpose: (0, pg_core_1.text)("purpose"), // Business justification for access
    ipAddress: (0, pg_core_1.text)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    sessionDuration: (0, pg_core_1.integer)("session_duration"), // How long they viewed the data
    timestamp: (0, pg_core_1.timestamp)("timestamp").notNull().defaultNow(),
});
exports.systemEvents = (0, pg_core_1.pgTable)("system_events", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    eventType: (0, pg_core_1.text)("event_type").notNull(), // 'backup_created', 'maintenance_start', 'sync_completed', 'error_occurred'
    source: (0, pg_core_1.text)("source").notNull(), // 'scheduler', 'admin', 'integration', 'system'
    severity: (0, pg_core_1.text)("severity").notNull(), // 'info', 'warning', 'error', 'critical'
    category: (0, pg_core_1.text)("category").notNull(), // 'backup', 'maintenance', 'integration', 'security', 'performance'
    description: (0, pg_core_1.text)("description").notNull(),
    details: (0, pg_core_1.jsonb)("details"), // Technical details, error messages, etc.
    affectedEntities: (0, pg_core_1.jsonb)("affected_entities"), // List of entities affected by this event
    resolution: (0, pg_core_1.text)("resolution"), // How the issue was resolved
    resolvedAt: (0, pg_core_1.timestamp)("resolved_at"), // When the issue was resolved
    timestamp: (0, pg_core_1.timestamp)("timestamp").notNull().defaultNow(),
});
// Audit System Relations
exports.auditLogsRelations = (0, drizzle_orm_1.relations)(exports.auditLogs, ({ one }) => ({
    user: one(exports.users, { fields: [exports.auditLogs.userId], references: [exports.users.id] }),
}));
exports.changeHistoryRelations = (0, drizzle_orm_1.relations)(exports.changeHistory, ({ one }) => ({
    user: one(exports.users, { fields: [exports.changeHistory.userId], references: [exports.users.id] }),
}));
exports.securityEventsRelations = (0, drizzle_orm_1.relations)(exports.securityEvents, ({ one }) => ({
    user: one(exports.users, { fields: [exports.securityEvents.userId], references: [exports.users.id] }),
}));
exports.dataAccessLogsRelations = (0, drizzle_orm_1.relations)(exports.dataAccessLogs, ({ one }) => ({
    user: one(exports.users, { fields: [exports.dataAccessLogs.userId], references: [exports.users.id] }),
}));
// Audit System Schemas
exports.insertAuditLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.auditLogs).omit({
    id: true,
    timestamp: true,
});
exports.insertChangeHistorySchema = (0, drizzle_zod_1.createInsertSchema)(exports.changeHistory).omit({
    id: true,
    timestamp: true,
});
exports.insertSecurityEventSchema = (0, drizzle_zod_1.createInsertSchema)(exports.securityEvents).omit({
    id: true,
    timestamp: true,
});
exports.insertDataAccessLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.dataAccessLogs).omit({
    id: true,
    timestamp: true,
});
exports.insertSystemEventSchema = (0, drizzle_zod_1.createInsertSchema)(exports.systemEvents).omit({
    id: true,
    timestamp: true,
});
// Validation functions to ensure data integrity
function validateSAFClientConsistency(saf, contracts) {
    const contract = contracts.find(c => c.id === saf.contractId);
    if (!contract) {
        throw new Error("Contract not found");
    }
    if (contract.clientId !== saf.clientId) {
        throw new Error("SAF client must match the contract's client");
    }
    return true;
}
function validateProposalClientConsistency(proposal, contracts) {
    const contract = contracts.find(c => c.id === proposal.contractId);
    if (!contract) {
        throw new Error("Contract not found");
    }
    return contract.clientId;
}
function validateContractClientConsistency(contract, clients) {
    const client = clients.find(c => c.id === contract.clientId);
    if (!client) {
        throw new Error("Client not found");
    }
    return true;
}
// Client Satisfaction Surveys
exports.clientSatisfactionSurveys = (0, pg_core_1.pgTable)("client_satisfaction_surveys", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    clientId: (0, pg_core_1.integer)("client_id").references(() => exports.clients.id).notNull(),
    contractId: (0, pg_core_1.integer)("contract_id").references(() => exports.contracts.id),
    serviceScopeId: (0, pg_core_1.integer)("service_scope_id").references(() => exports.serviceScopes.id),
    surveyDate: (0, pg_core_1.timestamp)("survey_date").notNull(),
    surveyType: (0, pg_core_1.text)("survey_type").notNull(), // 'quarterly', 'annual', 'project_completion', 'incident_followup'
    overallSatisfaction: (0, pg_core_1.integer)("overall_satisfaction").notNull(), // 1-5 scale
    serviceQuality: (0, pg_core_1.integer)("service_quality"), // 1-5 scale
    responseTime: (0, pg_core_1.integer)("response_time"), // 1-5 scale
    communication: (0, pg_core_1.integer)("communication"), // 1-5 scale
    technicalExpertise: (0, pg_core_1.integer)("technical_expertise"), // 1-5 scale
    valueForMoney: (0, pg_core_1.integer)("value_for_money"), // 1-5 scale
    likelihood_to_recommend: (0, pg_core_1.integer)("likelihood_to_recommend"), // 1-10 NPS scale
    feedback: (0, pg_core_1.text)("feedback"),
    improvements: (0, pg_core_1.text)("improvements"),
    compliments: (0, pg_core_1.text)("compliments"),
    concerns: (0, pg_core_1.text)("concerns"),
    status: (0, pg_core_1.text)("status").default("completed"), // 'sent', 'in_progress', 'completed', 'expired'
    conductedBy: (0, pg_core_1.integer)("conducted_by").references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Client Feedback (ongoing/ad-hoc feedback)
exports.clientFeedback = (0, pg_core_1.pgTable)("client_feedback", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    clientId: (0, pg_core_1.integer)("client_id").references(() => exports.clients.id).notNull(),
    contractId: (0, pg_core_1.integer)("contract_id").references(() => exports.contracts.id),
    serviceScopeId: (0, pg_core_1.integer)("service_scope_id").references(() => exports.serviceScopes.id),
    feedbackDate: (0, pg_core_1.timestamp)("feedback_date").defaultNow(),
    feedbackType: (0, pg_core_1.text)("feedback_type").notNull(), // 'compliment', 'complaint', 'suggestion', 'inquiry', 'escalation'
    category: (0, pg_core_1.text)("category"), // 'service_delivery', 'communication', 'billing', 'technical', 'other'
    priority: (0, pg_core_1.text)("priority").default("medium"), // 'low', 'medium', 'high', 'urgent'
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description").notNull(),
    contactMethod: (0, pg_core_1.text)("contact_method"), // 'phone', 'email', 'portal', 'meeting', 'ticket'
    satisfactionRating: (0, pg_core_1.integer)("satisfaction_rating"), // 1-5 scale (if applicable)
    status: (0, pg_core_1.text)("status").default("open"), // 'open', 'in_progress', 'resolved', 'closed'
    assignedTo: (0, pg_core_1.integer)("assigned_to").references(() => exports.users.id),
    resolvedBy: (0, pg_core_1.integer)("resolved_by").references(() => exports.users.id),
    resolvedAt: (0, pg_core_1.timestamp)("resolved_at"),
    resolutionNotes: (0, pg_core_1.text)("resolution_notes"),
    followUpRequired: (0, pg_core_1.boolean)("follow_up_required").default(false),
    followUpDate: (0, pg_core_1.timestamp)("follow_up_date"),
    internalNotes: (0, pg_core_1.text)("internal_notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Page permissions for role-based access control
exports.pagePermissions = (0, pg_core_1.pgTable)("page_permissions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    pageName: (0, pg_core_1.text)("page_name").notNull().unique(), // Dashboard, Clients, Services, etc.
    pageUrl: (0, pg_core_1.text)("page_url").notNull(), // /, /clients, /services, etc.
    displayName: (0, pg_core_1.text)("display_name").notNull(), // User-friendly name
    description: (0, pg_core_1.text)("description"), // What this page does
    category: (0, pg_core_1.text)("category").notNull().default("main"), // main, admin, reports, etc.
    icon: (0, pg_core_1.text)("icon"), // Lucide icon name
    adminAccess: (0, pg_core_1.boolean)("admin_access").notNull().default(true),
    managerAccess: (0, pg_core_1.boolean)("manager_access").notNull().default(false),
    engineerAccess: (0, pg_core_1.boolean)("engineer_access").notNull().default(false),
    userAccess: (0, pg_core_1.boolean)("user_access").notNull().default(false),
    requiresSpecialPermission: (0, pg_core_1.boolean)("requires_special_permission").notNull().default(false),
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    sortOrder: (0, pg_core_1.integer)("sort_order").notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
});
// Page permissions schema
exports.insertPagePermissionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.pagePermissions);
exports.insertServiceScopeFieldSchema = (0, drizzle_zod_1.createInsertSchema)(exports.serviceScopeFields, {
    selectOptions: zod_1.z.array(zod_1.z.string()).optional(),
    validationRules: zod_1.z.object({
        min: zod_1.z.number().optional(),
        max: zod_1.z.number().optional(),
    }).optional(),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// Schema versioning table for tracking database migrations
exports.schemaVersions = (0, pg_core_1.pgTable)("schema_versions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    scriptVersion: (0, pg_core_1.text)("script_version"),
    appVersion: (0, pg_core_1.text)("app_version"),
    schemaVersion: (0, pg_core_1.text)("schema_version"),
    version: (0, pg_core_1.text)("version").notNull(),
    appliedAt: (0, pg_core_1.timestamp)("applied_at").defaultNow(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    environment: (0, pg_core_1.text)("environment"),
    notes: (0, pg_core_1.text)("notes"),
    migrationFile: (0, pg_core_1.text)("migration_file"),
    description: (0, pg_core_1.text)("description"),
});
// Field visibility configuration table for hiding fields from UI forms
exports.fieldVisibilityConfig = (0, pg_core_1.pgTable)("field_visibility_config", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    tableName: (0, pg_core_1.text)("table_name").notNull(),
    fieldName: (0, pg_core_1.text)("field_name").notNull(),
    isVisible: (0, pg_core_1.boolean)("is_visible").notNull().default(true),
    context: (0, pg_core_1.text)("context").notNull().default("form"), // 'form', 'table', 'export', etc.
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
}, (table) => [
    // Unique constraint to prevent duplicate configurations
    (0, pg_core_1.unique)("field_visibility_unique").on(table.tableName, table.fieldName, table.context),
    // Index for quick lookups
    (0, pg_core_1.index)("idx_field_visibility_table_context").on(table.tableName, table.context),
]);
exports.insertFieldVisibilityConfigSchema = (0, drizzle_zod_1.createInsertSchema)(exports.fieldVisibilityConfig);
// Saved Queries table for user-defined plugin queries
exports.savedQueries = (0, pg_core_1.pgTable)("saved_queries", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.users.id),
    pluginName: (0, pg_core_1.text)("plugin_name").notNull(),
    instanceId: (0, pg_core_1.text)("instance_id").notNull(),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    query: (0, pg_core_1.text)("query").notNull(),
    method: (0, pg_core_1.text)("method").notNull().default("GET"),
    tags: (0, pg_core_1.jsonb)("tags"), // For categorization
    isPublic: (0, pg_core_1.boolean)("is_public").notNull().default(false), // Allow sharing with other users
    executionCount: (0, pg_core_1.integer)("execution_count").notNull().default(0),
    lastExecutedAt: (0, pg_core_1.timestamp)("last_executed_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_saved_queries_user_plugin").on(table.userId, table.pluginName),
    (0, pg_core_1.index)("idx_saved_queries_public").on(table.isPublic).where((0, drizzle_orm_1.sql) `${table.isPublic} = true`),
]);
exports.insertSavedQuerySchema = (0, drizzle_zod_1.createInsertSchema)(exports.savedQueries).omit({
    id: true,
    executionCount: true,
    lastExecutedAt: true,
    createdAt: true,
    updatedAt: true,
});
// Custom widgets table - replaces localStorage storage
exports.customWidgets = (0, pg_core_1.pgTable)("custom_widgets", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.users.id),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    pluginName: (0, pg_core_1.text)("plugin_name").notNull(),
    instanceId: (0, pg_core_1.text)("instance_id").notNull(),
    queryType: (0, pg_core_1.text)("query_type").notNull().default("default"), // 'default' | 'custom'
    queryId: (0, pg_core_1.text)("query_id"),
    customQuery: (0, pg_core_1.text)("custom_query"),
    queryMethod: (0, pg_core_1.text)("query_method").notNull().default("GET"),
    queryParameters: (0, pg_core_1.jsonb)("query_parameters").notNull().default('{}'),
    displayType: (0, pg_core_1.text)("display_type").notNull().default("table"), // 'table' | 'chart' | 'metric' | 'list' | 'gauge'
    chartType: (0, pg_core_1.text)("chart_type"), // 'bar' | 'line' | 'pie' | 'area'
    refreshInterval: (0, pg_core_1.integer)("refresh_interval").notNull().default(30),
    placement: (0, pg_core_1.text)("placement").notNull().default("client-details"), // 'client-details' | 'global-dashboard' | 'custom'
    styling: (0, pg_core_1.jsonb)("styling").notNull().default('{"width":"full","height":"medium","showBorder":true,"showHeader":true}'),
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_custom_widgets_user").on(table.userId),
    (0, pg_core_1.index)("idx_custom_widgets_placement").on(table.placement),
]);
exports.insertCustomWidgetSchema = (0, drizzle_zod_1.createInsertSchema)(exports.customWidgets).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// User preferences table - replaces localStorage for theme, column prefs, etc.
exports.userPreferences = (0, pg_core_1.pgTable)("user_preferences", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(() => exports.users.id),
    preferenceType: (0, pg_core_1.text)("preference_type").notNull(), // 'theme', 'column_visibility', 'onboarding_progress'
    preferenceKey: (0, pg_core_1.text)("preference_key").notNull(), // specific key within type (e.g., table name for columns)
    preferenceValue: (0, pg_core_1.jsonb)("preference_value").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
}, (table) => [
    // Unique constraint to prevent duplicate preferences
    (0, pg_core_1.unique)("user_preference_unique").on(table.userId, table.preferenceType, table.preferenceKey),
    // Index for performance
    (0, pg_core_1.index)("idx_user_preferences_lookup").on(table.userId, table.preferenceType, table.preferenceKey),
]);
exports.insertUserPreferenceSchema = (0, drizzle_zod_1.createInsertSchema)(exports.userPreferences).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
