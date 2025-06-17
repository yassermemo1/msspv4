import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, uuid, check, index, unique, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

// Users table for authentication and team management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"), // Made nullable for LDAP users
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("user"), // admin, manager, engineer, etc.
  authProvider: text("auth_provider").notNull().default("local"), // local, ldap
  ldapId: text("ldap_id").unique(), // LDAP unique identifier (DN or uid)
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User settings table for preferences and configurations
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  // Notification preferences
  emailNotifications: boolean("email_notifications").notNull().default(true),
  pushNotifications: boolean("push_notifications").notNull().default(false),
  contractReminders: boolean("contract_reminders").notNull().default(true),
  financialAlerts: boolean("financial_alerts").notNull().default(true),
  // Security settings

  sessionTimeout: boolean("session_timeout").notNull().default(true),
  // System preferences
  darkMode: boolean("dark_mode").notNull().default(false),
  theme: text("theme").notNull().default("light"), // light, dark, system, or custom theme ID
  timezone: text("timezone").notNull().default("America/New_York"),
  language: text("language").notNull().default("en"),
  currency: text("currency").notNull().default("USD"), // USD, SAR, EUR, GBP, etc.
  autoSaveForms: boolean("auto_save_forms").notNull().default(true),
  // Data preferences
  dataExport: boolean("data_export").notNull().default(true),
  apiAccess: boolean("api_access").notNull().default(false),
  dataRetentionPeriod: text("data_retention_period").notNull().default("5years"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Company settings table for global configuration
export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default("MSSP Client Manager"),
  currency: text("currency").notNull().default("USD"),
  timezone: text("timezone").notNull().default("America/New_York"),
  fiscalYearStart: text("fiscal_year_start").notNull().default("01-01"),
  dateFormat: text("date_format").notNull().default("MM/DD/YYYY"),
  timeFormat: text("time_format").notNull().default("12h"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").notNull().default("#3b82f6"),
  secondaryColor: text("secondary_color").notNull().default("#64748b"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  taxId: text("tax_id"),
  registrationNumber: text("registration_number"),
  emailNotificationsEnabled: boolean("email_notifications_enabled").notNull().default(true),
  smsNotificationsEnabled: boolean("sms_notifications_enabled").notNull().default(false),
  sessionTimeoutMinutes: integer("session_timeout_minutes").notNull().default(480),
  passwordExpiryDays: integer("password_expiry_days").notNull().default(90),
  maxLoginAttempts: integer("max_login_attempts").notNull().default(5),
  auditLogRetentionDays: integer("audit_log_retention_days").notNull().default(2555),
  backupRetentionDays: integer("backup_retention_days").notNull().default(365),
  apiRateLimit: integer("api_rate_limit").notNull().default(1000),
  webhookRetryAttempts: integer("webhook_retry_attempts").notNull().default(3),
  advancedSearchEnabled: boolean("advanced_search_enabled").notNull().default(true),
  auditLoggingEnabled: boolean("audit_logging_enabled").notNull().default(true),

  dataExportEnabled: boolean("data_export_enabled").notNull().default(true),
  
  // LDAP Configuration
  ldapEnabled: boolean("ldap_enabled").notNull().default(false),
  ldapUrl: text("ldap_url"),
  ldapBindDn: text("ldap_bind_dn"),
  ldapBindPassword: text("ldap_bind_password"),
  ldapSearchBase: text("ldap_search_base"),
  ldapSearchFilter: text("ldap_search_filter").default("(uid={{username}})"),
  ldapUsernameAttribute: text("ldap_username_attribute").default("uid"),
  ldapEmailAttribute: text("ldap_email_attribute").default("mail"),
  ldapFirstNameAttribute: text("ldap_first_name_attribute").default("givenName"),
  ldapLastNameAttribute: text("ldap_last_name_attribute").default("sn"),
  ldapDefaultRole: text("ldap_default_role").default("user"),
  ldapGroupSearchBase: text("ldap_group_search_base"),
  ldapGroupSearchFilter: text("ldap_group_search_filter"),
  ldapAdminGroup: text("ldap_admin_group"),
  ldapManagerGroup: text("ldap_manager_group"),
  ldapEngineerGroup: text("ldap_engineer_group"),
  ldapConnectionTimeout: integer("ldap_connection_timeout").default(5000),
  ldapSearchTimeout: integer("ldap_search_timeout").default(10000),
  ldapCertificateVerification: boolean("ldap_certificate_verification").notNull().default(true),
  
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
});

// Clients table for company information
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("shortName"), // Client short/abbreviated name
  domain: text("domain"), // Company domain (e.g., company.com)
  industry: text("industry"),
  companySize: text("companySize"),
  status: text("status").notNull().default("prospect"), // prospect, active, inactive, suspended, archived
  source: text("source"), // how they found us
  address: text("address"),
  website: text("website"),
  notes: text("notes"),
  deletedAt: timestamp("deletedAt"), // Soft deletion timestamp
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
}, (table) => [
  // Index for performance when filtering out deleted clients
  index("idx_clients_active").on(table.deletedAt).where(sql`${table.deletedAt} IS NULL`),
  index("idx_clients_deleted_at").on(table.deletedAt),
  // Status constraint with archived support
  check("clients_status_check", sql`status = ANY (ARRAY['prospect'::text, 'active'::text, 'inactive'::text, 'suspended'::text, 'archived'::text])`),
]);

// Client contacts for multiple contacts per client
export const clientContacts = pgTable("client_contacts", {
  id: serial("id").primaryKey(),
  clientId: integer("clientId").notNull().references(() => clients.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  title: text("title"),
  isPrimary: boolean("isPrimary").notNull().default(false),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Service catalog for all services offered
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // Security Operations, Network Security, etc.
  description: text("description"),
  deliveryModel: text("delivery_model").notNull(), // Serverless, On-Prem Engineer, Hybrid
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  pricingUnit: text("pricing_unit"), // per endpoint, per month, per GB/day
  scopeDefinitionTemplate: jsonb("scope_definition_template"), // Dynamic form schema - DEPRECATED, use serviceScopeFields instead
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// New table for service scope field definitions (replaces JSONB approach)
export const serviceScopeFields = pgTable("service_scope_fields", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").references(() => services.id),
  name: text("name").notNull(), // Field name/key
  label: text("label").notNull(), // Display label
  fieldType: text("field_type").notNull(), // TEXT_SINGLE_LINE, TEXT_MULTI_LINE, NUMBER_INTEGER, etc.
  isRequired: boolean("is_required").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  placeholderText: text("placeholder_text"),
  helpText: text("help_text"),
  defaultValue: text("default_value"),
  selectOptions: jsonb("select_options"), // For dropdown/checkbox options
  validationRules: jsonb("validation_rules"), // Min/max values, etc.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Contracts for client agreements
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  clientId: integer("clientId").notNull().references(() => clients.id),
  name: text("name").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  autoRenewal: boolean("autoRenewal").notNull().default(false),
  renewalTerms: text("renewalTerms"),
  totalValue: decimal("totalValue", { precision: 12, scale: 2 }),
  status: text("status").notNull().default("draft"), // draft, active, expired, terminated
  documentUrl: text("documentUrl"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Service scopes for each service within a contract
export const serviceScopes = pgTable("service_scopes", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id),
  serviceId: integer("service_id").references(() => services.id),
  scopeDefinition: jsonb("scope_definition"), // Actual scope parameters
  safDocumentUrl: text("saf_document_url"),
  safStartDate: timestamp("saf_start_date"),
  safEndDate: timestamp("saf_end_date"),
  safStatus: text("saf_status").default("pending"), // pending, approved, active, completed
  startDate: timestamp("start_date"), // General start date for service scope
  endDate: timestamp("end_date"), // General end date for service scope
  status: text("status").default("active"), // active, pending, completed, cancelled
  monthlyValue: decimal("monthly_value", { precision: 10, scale: 2 }),
  // Human-readable description/title for the particular scope (used in searches)
  description: text("description"),
  notes: text("notes"),
  // Indexed scope variables for efficient filtering
  eps: integer("eps"), // Events Per Second
  endpoints: integer("endpoints"), // EDR/Endpoint count
  dataVolumeGb: decimal("data_volume_gb", { precision: 10, scale: 2 }), // Data volume in GB
  logSources: integer("log_sources"), // For SIEM services
  firewallDevices: integer("firewall_devices"), // For Firewall services
  pamUsers: integer("pam_users"), // For PAM services
  responseTimeMinutes: integer("response_time_minutes"), // Response time in minutes
  coverageHours: text("coverage_hours"), // Coverage hours (8x5, 16x5, 24x7)
  serviceTier: text("service_tier"), // Enterprise, Professional, Standard
  // Link back to SAF that authorized this service scope (nullable)
  safId: integer("saf_id").references(() => serviceAuthorizationForms.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Dynamic scope variable definitions table
export const scopeVariableDefinitions = pgTable('scope_variable_definitions', {
  id: serial('id').primaryKey(),
  variableName: varchar('variable_name', { length: 100 }).notNull().unique(),
  variableType: varchar('variable_type', { length: 20 }).notNull(), // integer, decimal, text, boolean
  displayName: varchar('display_name', { length: 200 }).notNull(),
  description: text('description'),
  isFilterable: boolean('is_filterable').default(true),
  isIndexed: boolean('is_indexed').default(false),
  filterComponent: varchar('filter_component', { length: 50 }), // range, select, text, boolean
  unit: varchar('unit', { length: 20 }), // GB, minutes, endpoints, etc.
  createdAt: timestamp('created_at').defaultNow(),
});

// Dynamic scope variable values table
export const scopeVariableValues = pgTable('scope_variable_values', {
  id: serial('id').primaryKey(),
  serviceScopeId: integer('service_scope_id').notNull().references(() => serviceScopes.id, { onDelete: 'cascade' }),
  variableName: varchar('variable_name', { length: 100 }).notNull().references(() => scopeVariableDefinitions.variableName),
  valueText: text('value_text'),
  valueInteger: integer('value_integer'),
  valueDecimal: decimal('value_decimal', { precision: 15, scale: 4 }),
  valueBoolean: boolean('value_boolean'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueScope: unique().on(table.serviceScopeId, table.variableName),
}));

// Proposals for tracking technical and financial proposals
export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id),
  type: text("type").notNull(), // technical, financial
  version: text("version").notNull().default("1.0"),
  status: text("status").notNull().default("draft"), // draft, sent, accepted, rejected
  documentUrl: text("document_url"),
  proposedValue: decimal("proposed_value", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// License pools for software license management
export const licensePools = pgTable("license_pools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  vendor: text("vendor").notNull(),
  productName: text("product_name").notNull(),
  licenseType: text("license_type"), // per user, per device, concurrent
  totalLicenses: integer("total_licenses").notNull(),
  availableLicenses: integer("available_licenses").notNull(),
  orderedLicenses: integer("ordered_licenses").notNull().default(0), // Track how many were ordered
  costPerLicense: decimal("cost_per_license", { precision: 8, scale: 2 }),
  renewalDate: timestamp("renewal_date"),
  purchaseRequestNumber: text("purchase_request_number"), // PR number
  purchaseOrderNumber: text("purchase_order_number"), // PO number
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Client license assignments
export const clientLicenses = pgTable("client_licenses", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  licensePoolId: integer("license_pool_id").notNull().references(() => licensePools.id),
  serviceScopeId: integer("service_scope_id").references(() => serviceScopes.id),
  assignedLicenses: integer("assigned_licenses").notNull(),
  assignedDate: timestamp("assigned_date").notNull().defaultNow(),
  notes: text("notes"),
});

// Individual licenses (not from pools)
export const individualLicenses = pgTable("individual_licenses", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  serviceScopeId: integer("service_scope_id").references(() => serviceScopes.id),
  name: text("name").notNull(),
  vendor: text("vendor").notNull(),
  productName: text("product_name").notNull(),
  licenseKey: text("license_key"),
  licenseType: text("license_type"), // per user, per device, concurrent
  quantity: integer("quantity").notNull().default(1),
  costPerLicense: decimal("cost_per_license", { precision: 8, scale: 2 }),
  purchaseDate: timestamp("purchase_date"),
  expiryDate: timestamp("expiry_date"),
  renewalDate: timestamp("renewal_date"),
  purchaseRequestNumber: text("purchase_request_number"), // PR number
  purchaseOrderNumber: text("purchase_order_number"), // PO number
  documentUrl: text("document_url"), // License document/certificate
  status: text("status").notNull().default("active"), // active, expired, suspended, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Service Authorization Forms (SAF)
export const serviceAuthorizationForms: any = pgTable("service_authorization_forms", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  contractId: integer("contract_id").references(() => contracts.id).notNull(),
  serviceScopeId: integer("service_scope_id").references(() => serviceScopes.id),
  safNumber: text("saf_number").notNull(),
  title: text("title").notNull(), // Added missing title column
  description: text("description"),
  status: text("status").default("pending"), // pending, approved, rejected, expired
  requestedDate: timestamp("requested_date").notNull(),
  approvedDate: timestamp("approved_date"),
  expiryDate: timestamp("expiry_date"),
  approvedBy: integer("approved_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Certificate of Compliance (COC)
export const certificatesOfCompliance = pgTable("certificates_of_compliance", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  contractId: integer("contract_id").references(() => contracts.id),
  serviceScopeId: integer("service_scope_id").references(() => serviceScopes.id),
  safId: integer("saf_id").references(() => serviceAuthorizationForms.id),
  cocNumber: text("coc_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  complianceType: text("compliance_type").notNull(),
  issueDate: timestamp("issue_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  status: text("status").default("active"),
  documentUrl: text("document_url"),
  issuedBy: integer("issued_by").references(() => users.id),
  auditDate: timestamp("audit_date"),
  nextAuditDate: timestamp("next_audit_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Hardware assets catalog
export const hardwareAssets = pgTable("hardware_assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // Firewall, Server, Appliance
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number").unique(),
  purchaseDate: timestamp("purchase_date"),
  purchaseCost: decimal("purchase_cost", { precision: 10, scale: 2 }),
  warrantyExpiry: timestamp("warranty_expiry"),
  status: text("status").notNull().default("available"), // available, assigned, maintenance, retired, lost
  location: text("location"),
  purchaseRequestNumber: text("purchase_request_number"), // PR number
  purchaseOrderNumber: text("purchase_order_number"), // PO number
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Client hardware assignments
export const clientHardwareAssignments = pgTable("client_hardware_assignments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  hardwareAssetId: integer("hardware_asset_id").notNull().references(() => hardwareAssets.id),
  serviceScopeId: integer("service_scope_id").references(() => serviceScopes.id),
  assignedDate: timestamp("assigned_date").notNull().defaultNow(),
  returnedDate: timestamp("returned_date"),
  installationLocation: text("installation_location"),
  status: text("status").notNull().default("active"), // active, returned, maintenance
  notes: text("notes"),
});

// Financial transactions for cost and revenue tracking
export const financialTransactions = pgTable("financial_transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // cost, revenue
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed, cancelled
  clientId: integer("client_id").references(() => clients.id),
  contractId: integer("contract_id").references(() => contracts.id),
  serviceScopeId: integer("service_scope_id").references(() => serviceScopes.id),
  licensePoolId: integer("license_pool_id").references(() => licensePools.id),
  hardwareAssetId: integer("hardware_asset_id").references(() => hardwareAssets.id),
  transactionDate: timestamp("transaction_date").notNull(),
  category: text("category"), // licensing, hardware, services, etc.
  reference: text("reference"), // invoice number, PO number, etc.
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Client team assignments for role-based access
export const clientTeamAssignments = pgTable("client_team_assignments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull(), // Account Manager, Lead Engineer, Project Manager
  assignedDate: timestamp("assigned_date").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
});

// Custom fields for extensibility
export const customFields = pgTable("custom_fields", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // clients, contracts, proposals, etc.
  fieldName: text("field_name").notNull(),
  fieldType: text("field_type").notNull(), // text, number, date, select, boolean
  fieldOptions: jsonb("field_options"), // for select fields
  isRequired: boolean("is_required").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Custom field values
export const customFieldValues = pgTable("custom_field_values", {
  id: serial("id").primaryKey(),
  customFieldId: integer("custom_field_id").notNull().references(() => customFields.id),
  entityId: integer("entity_id").notNull(),
  value: text("value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  contacts: many(clientContacts),
  contracts: many(contracts),
  licenses: many(clientLicenses),
  individualLicenses: many(individualLicenses),
  hardwareAssignments: many(clientHardwareAssignments),
  teamAssignments: many(clientTeamAssignments),
  transactions: many(financialTransactions, { relationName: "clientTransactions" }),
  serviceAuthorizationForms: many(serviceAuthorizationForms),
  certificatesOfCompliance: many(certificatesOfCompliance),
  externalMappings: many(clientExternalMappings),
}));

export const clientContactsRelations = relations(clientContacts, ({ one }) => ({
  client: one(clients, { fields: [clientContacts.clientId], references: [clients.id] }),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  client: one(clients, { fields: [contracts.clientId], references: [clients.id] }),
  serviceScopes: many(serviceScopes),
  proposals: many(proposals),
  transactions: many(financialTransactions, { relationName: "contractTransactions" }),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  serviceScopes: many(serviceScopes),
}));

export const serviceScopesRelations = relations(serviceScopes, ({ one, many }) => ({
  contract: one(contracts, { fields: [serviceScopes.contractId], references: [contracts.id] }),
  service: one(services, { fields: [serviceScopes.serviceId], references: [services.id] }),
  licenses: many(clientLicenses),
  hardwareAssignments: many(clientHardwareAssignments),
  transactions: many(financialTransactions, { relationName: "scopeTransactions" }),
}));

export const proposalsRelations = relations(proposals, ({ one }) => ({
  contract: one(contracts, { fields: [proposals.contractId], references: [contracts.id] }),
}));

export const licensePoolsRelations = relations(licensePools, ({ many }) => ({
  assignments: many(clientLicenses),
  transactions: many(financialTransactions, { relationName: "poolTransactions" }),
}));

export const clientLicensesRelations = relations(clientLicenses, ({ one }) => ({
  client: one(clients, { fields: [clientLicenses.clientId], references: [clients.id] }),
  licensePool: one(licensePools, { fields: [clientLicenses.licensePoolId], references: [licensePools.id] }),
  serviceScope: one(serviceScopes, { fields: [clientLicenses.serviceScopeId], references: [serviceScopes.id] }),
}));

export const individualLicensesRelations = relations(individualLicenses, ({ one }) => ({
  client: one(clients, { fields: [individualLicenses.clientId], references: [clients.id] }),
  serviceScope: one(serviceScopes, { fields: [individualLicenses.serviceScopeId], references: [serviceScopes.id] }),
}));

export const serviceAuthorizationFormsRelations = relations(serviceAuthorizationForms, ({ one, many }) => ({
  client: one(clients, { fields: [serviceAuthorizationForms.clientId], references: [clients.id] }),
  contract: one(contracts, { fields: [serviceAuthorizationForms.contractId], references: [contracts.id] }),
  serviceScope: one(serviceScopes, { fields: [serviceAuthorizationForms.serviceScopeId], references: [serviceScopes.id] }),
  approvedByUser: one(users, { fields: [serviceAuthorizationForms.approvedBy], references: [users.id] }),
  certificatesOfCompliance: many(certificatesOfCompliance),
}));

export const certificatesOfComplianceRelations = relations(certificatesOfCompliance, ({ one }) => ({
  client: one(clients, { fields: [certificatesOfCompliance.clientId], references: [clients.id] }),
  contract: one(contracts, { fields: [certificatesOfCompliance.contractId], references: [contracts.id] }),
  serviceScope: one(serviceScopes, { fields: [certificatesOfCompliance.serviceScopeId], references: [serviceScopes.id] }),
  saf: one(serviceAuthorizationForms, { fields: [certificatesOfCompliance.safId], references: [serviceAuthorizationForms.id] }),
  issuedByUser: one(users, { fields: [certificatesOfCompliance.issuedBy], references: [users.id] }),
}));

export const hardwareAssetsRelations = relations(hardwareAssets, ({ many }) => ({
  assignments: many(clientHardwareAssignments),
  transactions: many(financialTransactions, { relationName: "assetTransactions" }),
}));

export const clientHardwareAssignmentsRelations = relations(clientHardwareAssignments, ({ one }) => ({
  client: one(clients, { fields: [clientHardwareAssignments.clientId], references: [clients.id] }),
  hardwareAsset: one(hardwareAssets, { fields: [clientHardwareAssignments.hardwareAssetId], references: [hardwareAssets.id] }),
  serviceScope: one(serviceScopes, { fields: [clientHardwareAssignments.serviceScopeId], references: [serviceScopes.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  settings: one(userSettings, { fields: [users.id], references: [userSettings.userId] }),
  teamAssignments: many(clientTeamAssignments),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));

export const clientTeamAssignmentsRelations = relations(clientTeamAssignments, ({ one }) => ({
  client: one(clients, { fields: [clientTeamAssignments.clientId], references: [clients.id] }),
  user: one(users, { fields: [clientTeamAssignments.userId], references: [users.id] }),
}));

export const financialTransactionsRelations = relations(financialTransactions, ({ one }) => ({
  client: one(clients, { 
    fields: [financialTransactions.clientId], 
    references: [clients.id],
    relationName: "clientTransactions"
  }),
  contract: one(contracts, { 
    fields: [financialTransactions.contractId], 
    references: [contracts.id],
    relationName: "contractTransactions"
  }),
  serviceScope: one(serviceScopes, { 
    fields: [financialTransactions.serviceScopeId], 
    references: [serviceScopes.id],
    relationName: "scopeTransactions"
  }),
  licensePool: one(licensePools, { 
    fields: [financialTransactions.licensePoolId], 
    references: [licensePools.id],
    relationName: "poolTransactions"
  }),
  hardwareAsset: one(hardwareAssets, { 
    fields: [financialTransactions.hardwareAssetId], 
    references: [hardwareAssets.id],
    relationName: "assetTransactions"
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientContactSchema = createInsertSchema(clientContacts).omit({
  id: true,
  createdAt: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});

export const insertContractSchema = createInsertSchema(contracts, {
  // Transform string dates to Date objects for timestamp fields
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceScopeSchema = createInsertSchema(serviceScopes, {
  // Transform string dates to Date objects for timestamp fields
  safStartDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  safEndDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  startDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  endDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLicensePoolSchema = createInsertSchema(licensePools, {
  // Transform string dates to Date objects for timestamp fields
  renewalDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
}).omit({
  id: true,
  createdAt: true,
  availableLicenses: true, // Auto-calculated on backend
});

export const insertClientLicenseSchema = createInsertSchema(clientLicenses).omit({
  id: true,
  assignedDate: true,
});

export const insertIndividualLicenseSchema = createInsertSchema(individualLicenses, {
  // Transform string dates to Date objects for timestamp fields
  purchaseDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  expiryDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  renewalDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceAuthorizationFormSchema = createInsertSchema(serviceAuthorizationForms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCertificateOfComplianceSchema = createInsertSchema(certificatesOfCompliance, {
  // Transform string dates to Date objects for timestamp fields
  issueDate: z.string().transform((str) => new Date(str)),
  expiryDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  auditDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  nextAuditDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHardwareAssetSchema = createInsertSchema(hardwareAssets, {
  // Transform string dates to Date objects for timestamp fields
  purchaseDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  warrantyExpiry: z.string().optional().transform((str) => str ? new Date(str) : undefined),
}).omit({
  id: true,
  createdAt: true,
});

export const insertClientHardwareAssignmentSchema = createInsertSchema(clientHardwareAssignments).omit({
  id: true,
  assignedDate: true,
});

export const insertFinancialTransactionSchema = createInsertSchema(financialTransactions, {
  // Transform string dates to Date objects for timestamp fields
  transactionDate: z.string().transform((str) => new Date(str)),
}).omit({
  id: true,
  createdAt: true,
});

export const insertClientTeamAssignmentSchema = createInsertSchema(clientTeamAssignments).omit({
  id: true,
  assignedDate: true,
});

export const insertCustomFieldSchema = createInsertSchema(customFields).omit({
  id: true,
  createdAt: true,
});

export const insertCustomFieldValueSchema = createInsertSchema(customFieldValues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertClientContact = z.infer<typeof insertClientContactSchema>;
export type ClientContact = typeof clientContacts.$inferSelect;

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

export type InsertServiceScope = z.infer<typeof insertServiceScopeSchema>;
export type ServiceScope = typeof serviceScopes.$inferSelect;

export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposals.$inferSelect;

export type InsertLicensePool = z.infer<typeof insertLicensePoolSchema>;
export type LicensePool = typeof licensePools.$inferSelect;

export type InsertClientLicense = z.infer<typeof insertClientLicenseSchema>;
export type ClientLicense = typeof clientLicenses.$inferSelect;

export type InsertHardwareAsset = z.infer<typeof insertHardwareAssetSchema>;
export type HardwareAsset = typeof hardwareAssets.$inferSelect;

export type InsertClientHardwareAssignment = z.infer<typeof insertClientHardwareAssignmentSchema>;
export type ClientHardwareAssignment = typeof clientHardwareAssignments.$inferSelect;

export type InsertFinancialTransaction = z.infer<typeof insertFinancialTransactionSchema>;
export type FinancialTransaction = typeof financialTransactions.$inferSelect;

export type InsertClientTeamAssignment = z.infer<typeof insertClientTeamAssignmentSchema>;
export type ClientTeamAssignment = typeof clientTeamAssignments.$inferSelect;

export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;
export type CustomField = typeof customFields.$inferSelect;

export type InsertCustomFieldValue = z.infer<typeof insertCustomFieldValueSchema>;
export type CustomFieldValue = typeof customFieldValues.$inferSelect;

// Document Management System
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  documentType: text("document_type").notNull(), // contract, proposal, technical_doc, financial_report
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: text("mime_type").notNull(),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  clientId: integer("client_id").references(() => clients.id),
  contractId: integer("contract_id").references(() => contracts.id),
  tags: text("tags").array(),
  expirationDate: timestamp("expiration_date"),
  complianceType: text("compliance_type"),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id),
  version: integer("version").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  changeNotes: text("change_notes"),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documentAccess = pgTable("document_access", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id),
  userId: integer("user_id").notNull().references(() => users.id),
  accessType: text("access_type").notNull(), // read, write, admin
  grantedBy: integer("granted_by").notNull().references(() => users.id),
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// Document relations
export const documentsRelations = relations(documents, ({ one, many }) => ({
  client: one(clients, { fields: [documents.clientId], references: [clients.id] }),
  contract: one(contracts, { fields: [documents.contractId], references: [contracts.id] }),
  uploadedByUser: one(users, { fields: [documents.uploadedBy], references: [users.id] }),
  versions: many(documentVersions),
  access: many(documentAccess),
}));

export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  document: one(documents, { fields: [documentVersions.documentId], references: [documents.id] }),
  uploadedByUser: one(users, { fields: [documentVersions.uploadedBy], references: [users.id] }),
}));

export const documentAccessRelations = relations(documentAccess, ({ one }) => ({
  document: one(documents, { fields: [documentAccess.documentId], references: [documents.id] }),
  user: one(users, { fields: [documentAccess.userId], references: [users.id] }),
  grantedByUser: one(users, { fields: [documentAccess.grantedBy], references: [users.id] }),
}));

// Document schemas
export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentVersionSchema = createInsertSchema(documentVersions).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentAccessSchema = createInsertSchema(documentAccess).omit({
  id: true,
  grantedAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;
export type DocumentVersion = typeof documentVersions.$inferSelect;

export type InsertDocumentAccess = z.infer<typeof insertDocumentAccessSchema>;
export type DocumentAccess = typeof documentAccess.$inferSelect;

// User settings schemas
export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

// Company settings schemas
export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({
  id: true,
  updatedAt: true,
});

export const updateCompanySettingsSchema = createInsertSchema(companySettings).omit({
  id: true,
  updatedAt: true,
  updatedBy: true,
}).partial();

export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type UpdateCompanySettings = z.infer<typeof updateCompanySettingsSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;

export type InsertIndividualLicense = z.infer<typeof insertIndividualLicenseSchema>;
export type IndividualLicense = typeof individualLicenses.$inferSelect;

export type InsertServiceAuthorizationForm = z.infer<typeof insertServiceAuthorizationFormSchema>;
export type ServiceAuthorizationForm = typeof serviceAuthorizationForms.$inferSelect;

export type InsertCertificateOfCompliance = z.infer<typeof insertCertificateOfComplianceSchema>;
export type CertificateOfCompliance = typeof certificatesOfCompliance.$inferSelect;

// Pagination interfaces
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    cursor?: string;
  };
}

// User dashboard card settings - stores personalized dashboard configuration
export const userDashboardSettings = pgTable("user_dashboard_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  cardId: text("card_id").notNull(), // Unique identifier for the card
  title: text("title").notNull(),
  type: text("type").notNull(), // 'metric' | 'chart' | 'table' | 'custom' | 'builtin'
  category: text("category").notNull().default("dashboard"), // 'dashboard' | 'kpi' | 'chart' | 'custom'
  dataSource: text("data_source").notNull(),
  size: text("size").notNull().default("small"), // 'small' | 'medium' | 'large' | 'xlarge'
  visible: boolean("visible").notNull().default(true),
  position: integer("position").notNull().default(0), // Display order
  config: jsonb("config").notNull().default('{}'), // Card-specific configuration
  isBuiltIn: boolean("is_built_in").notNull().default(false), // Whether this is a built-in card
  isRemovable: boolean("is_removable").notNull().default(true), // Whether user can delete this card
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Ensure each user has unique card configurations
  userCardUnique: unique().on(table.userId, table.cardId),
}));

// API Aggregator for Dynamic Client Data

// Client external mappings for API aggregation
// ⚠️ DEPRECATED: Client external mappings - Use Plugin-based client associations instead
export const clientExternalMappings = pgTable("client_external_mappings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  systemName: text("system_name").notNull(), // 'jira', 'grafana', 'servicenow', etc.
  externalIdentifier: text("external_identifier").notNull(), // Project key, dashboard UID, etc.
  metadata: jsonb("metadata"), // Additional config like specific dashboard panels, filters, etc.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Advanced Search & Filtering System
export const savedSearches = pgTable("saved_searches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  searchConfig: text("search_config").notNull(), // JSON string of search configuration
  entityTypes: text("entity_types").array().notNull(), // ['clients', 'contracts', 'services', etc.]
  isPublic: boolean("is_public").notNull().default(false),
  isQuickFilter: boolean("is_quick_filter").notNull().default(false),
  useCount: integer("use_count").notNull().default(0),
  lastUsed: timestamp("last_used"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  searchQuery: text("search_query").notNull(),
  searchConfig: text("search_config"), // JSON string of advanced search config
  entityTypes: text("entity_types").array().notNull(),
  resultsCount: integer("results_count").notNull().default(0),
  executionTime: integer("execution_time"), // milliseconds
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const globalSearchIndex = pgTable("global_search_index", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // 'client', 'contract', 'service', etc.
  entityId: integer("entity_id").notNull(),
  searchContent: text("search_content").notNull(), // Concatenated searchable text
  keywords: text("keywords").array(), // Extracted keywords
  lastIndexed: timestamp("last_indexed").notNull().defaultNow(),
});

// Audit Logging System for Security & Compliance
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // null for system events
  sessionId: text("session_id"), // For tracking user sessions
  action: text("action").notNull(), // 'create', 'update', 'delete', 'view', 'login', 'logout', 'export', 'import'
  entityType: text("entity_type").notNull(), // 'client', 'contract', 'user', 'system', etc.
  entityId: integer("entity_id"), // ID of the affected entity (null for bulk operations)
  entityName: text("entity_name"), // Name/title for easy identification
  description: text("description").notNull(), // Human readable description of the action
  ipAddress: text("ip_address"), // User's IP address
  userAgent: text("user_agent"), // User's browser/agent string
  severity: text("severity").notNull().default("info"), // 'low', 'medium', 'high', 'critical'
  category: text("category").notNull(), // 'authentication', 'data_access', 'data_modification', 'security', 'compliance'
  metadata: jsonb("metadata"), // Additional contextual data
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const changeHistory = pgTable("change_history", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // 'client', 'contract', 'service', etc.
  entityId: integer("entity_id").notNull(),
  entityName: text("entity_name"), // For easier identification
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // 'create', 'update', 'delete'
  fieldName: text("field_name"), // Specific field that was changed (null for create/delete)
  oldValue: text("old_value"), // Previous value (JSON string for complex data)
  newValue: text("new_value"), // New value (JSON string for complex data)
  changeReason: text("change_reason"), // Optional reason for the change
  automaticChange: boolean("automatic_change").notNull().default(false), // System vs user initiated
  batchId: text("batch_id"), // For grouping multiple changes from one operation
  rollbackData: jsonb("rollback_data"), // Data needed to revert this change
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const securityEvents = pgTable("security_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  eventType: text("event_type").notNull(), // 'login_success', 'login_failure', 'logout', 'password_change', 'permission_denied', 'suspicious_activity'
  source: text("source").notNull(), // 'web', 'api', 'mobile', 'system'
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  location: text("location"), // Geolocation if available
  deviceFingerprint: text("device_fingerprint"), // Browser/device fingerprinting
  success: boolean("success").notNull(),
  failureReason: text("failure_reason"), // Why the event failed
  riskScore: integer("risk_score"), // 0-100 risk assessment
  blocked: boolean("blocked").notNull().default(false), // Was this event blocked
  entityType: text("entity_type"), // Optional entity context for this event
  entityId: integer("entity_id"),
  metadata: jsonb("metadata"), // Additional security context
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const dataAccessLogs = pgTable("data_access_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  entityType: text("entity_type").notNull(), // What type of data was accessed
  entityId: integer("entity_id"), // Specific record accessed (null for list views)
  entityName: text("entity_name"), // For easier identification
  accessType: text("access_type").notNull(), // 'view', 'list', 'search', 'export', 'print'
  accessMethod: text("access_method").notNull(), // 'web_ui', 'api', 'bulk_export', 'report'
  dataScope: text("data_scope"), // 'full', 'partial', 'summary' - level of data accessed
  filters: jsonb("filters"), // What filters/criteria were used
  resultCount: integer("result_count"), // Number of records accessed
  sensitiveData: boolean("sensitive_data").notNull().default(false), // Contains PII/sensitive info
  purpose: text("purpose"), // Business justification for access
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionDuration: integer("session_duration"), // How long they viewed the data
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const systemEvents = pgTable("system_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // 'backup_created', 'maintenance_start', 'sync_completed', 'error_occurred'
  source: text("source").notNull(), // 'scheduler', 'admin', 'integration', 'system'
  severity: text("severity").notNull(), // 'info', 'warning', 'error', 'critical'
  category: text("category").notNull(), // 'backup', 'maintenance', 'integration', 'security', 'performance'
  description: text("description").notNull(),
  details: jsonb("details"), // Technical details, error messages, etc.
  affectedEntities: jsonb("affected_entities"), // List of entities affected by this event
  resolution: text("resolution"), // How the issue was resolved
  resolvedAt: timestamp("resolved_at"), // When the issue was resolved
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Audit System Relations
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const changeHistoryRelations = relations(changeHistory, ({ one }) => ({
  user: one(users, { fields: [changeHistory.userId], references: [users.id] }),
}));

export const securityEventsRelations = relations(securityEvents, ({ one }) => ({
  user: one(users, { fields: [securityEvents.userId], references: [users.id] }),
}));

export const dataAccessLogsRelations = relations(dataAccessLogs, ({ one }) => ({
  user: one(users, { fields: [dataAccessLogs.userId], references: [users.id] }),
}));

// Audit System Schemas
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertChangeHistorySchema = createInsertSchema(changeHistory).omit({
  id: true,
  timestamp: true,
});

export const insertSecurityEventSchema = createInsertSchema(securityEvents).omit({
  id: true,
  timestamp: true,
});

export const insertDataAccessLogSchema = createInsertSchema(dataAccessLogs).omit({
  id: true,
  timestamp: true,
});

export const insertSystemEventSchema = createInsertSchema(systemEvents).omit({
  id: true,
  timestamp: true,
});

// Audit System Types
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertChangeHistory = z.infer<typeof insertChangeHistorySchema>;
export type ChangeHistory = typeof changeHistory.$inferSelect;

export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;
export type SecurityEvent = typeof securityEvents.$inferSelect;

export type InsertDataAccessLog = z.infer<typeof insertDataAccessLogSchema>;
export type DataAccessLog = typeof dataAccessLogs.$inferSelect;

export type InsertSystemEvent = z.infer<typeof insertSystemEventSchema>;
export type SystemEvent = typeof systemEvents.$inferSelect;

// Validation functions to ensure data integrity
export function validateSAFClientConsistency(saf: { clientId: number; contractId: number }, contracts: { id: number; clientId: number }[]) {
  const contract = contracts.find(c => c.id === saf.contractId);
  if (!contract) {
    throw new Error("Contract not found");
  }
  if (contract.clientId !== saf.clientId) {
    throw new Error("SAF client must match the contract's client");
  }
  return true;
}

export function validateProposalClientConsistency(proposal: { contractId: number }, contracts: { id: number; clientId: number }[]) {
  const contract = contracts.find(c => c.id === proposal.contractId);
  if (!contract) {
    throw new Error("Contract not found");
  }
  return contract.clientId;
}

export function validateContractClientConsistency(contract: { clientId: number }, clients: { id: number }[]) {
  const client = clients.find(c => c.id === contract.clientId);
  if (!client) {
    throw new Error("Client not found");
  }
  return true;
}

// Client Satisfaction Surveys
export const clientSatisfactionSurveys = pgTable("client_satisfaction_surveys", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  contractId: integer("contract_id").references(() => contracts.id),
  serviceScopeId: integer("service_scope_id").references(() => serviceScopes.id),
  surveyDate: timestamp("survey_date").notNull(),
  surveyType: text("survey_type").notNull(), // 'quarterly', 'annual', 'project_completion', 'incident_followup'
  overallSatisfaction: integer("overall_satisfaction").notNull(), // 1-5 scale
  serviceQuality: integer("service_quality"), // 1-5 scale
  responseTime: integer("response_time"), // 1-5 scale
  communication: integer("communication"), // 1-5 scale
  technicalExpertise: integer("technical_expertise"), // 1-5 scale
  valueForMoney: integer("value_for_money"), // 1-5 scale
  likelihood_to_recommend: integer("likelihood_to_recommend"), // 1-10 NPS scale
  feedback: text("feedback"),
  improvements: text("improvements"),
  compliments: text("compliments"),
  concerns: text("concerns"),
  status: text("status").default("completed"), // 'sent', 'in_progress', 'completed', 'expired'
  conductedBy: integer("conducted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client Feedback (ongoing/ad-hoc feedback)
export const clientFeedback = pgTable("client_feedback", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  contractId: integer("contract_id").references(() => contracts.id),
  serviceScopeId: integer("service_scope_id").references(() => serviceScopes.id),
  feedbackDate: timestamp("feedback_date").defaultNow(),
  feedbackType: text("feedback_type").notNull(), // 'compliment', 'complaint', 'suggestion', 'inquiry', 'escalation'
  category: text("category"), // 'service_delivery', 'communication', 'billing', 'technical', 'other'
  priority: text("priority").default("medium"), // 'low', 'medium', 'high', 'urgent'
  title: text("title").notNull(),
  description: text("description").notNull(),
  contactMethod: text("contact_method"), // 'phone', 'email', 'portal', 'meeting', 'ticket'
  satisfactionRating: integer("satisfaction_rating"), // 1-5 scale (if applicable)
  status: text("status").default("open"), // 'open', 'in_progress', 'resolved', 'closed'
  assignedTo: integer("assigned_to").references(() => users.id),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  internalNotes: text("internal_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Scope Definition Template Response DTO
export interface ScopeDefinitionTemplateResponse {
  template: any | null;
  serviceName: string;
  category: string;
  deliveryModel: string;
}

// Page permissions for role-based access control
export const pagePermissions = pgTable("page_permissions", {
  id: serial("id").primaryKey(),
  pageName: text("page_name").notNull().unique(), // Dashboard, Clients, Services, etc.
  pageUrl: text("page_url").notNull(), // /, /clients, /services, etc.
  displayName: text("display_name").notNull(), // User-friendly name
  description: text("description"), // What this page does
  category: text("category").notNull().default("main"), // main, admin, reports, etc.
  icon: text("icon"), // Lucide icon name
  adminAccess: boolean("admin_access").notNull().default(true),
  managerAccess: boolean("manager_access").notNull().default(false),
  engineerAccess: boolean("engineer_access").notNull().default(false),
  userAccess: boolean("user_access").notNull().default(false),
  requiresSpecialPermission: boolean("requires_special_permission").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Page permissions schema
export const insertPagePermissionSchema = createInsertSchema(pagePermissions);
export type InsertPagePermission = z.infer<typeof insertPagePermissionSchema>;
export type PagePermission = typeof pagePermissions.$inferSelect;

export type ServiceScopeField = typeof serviceScopeFields.$inferSelect;
export type InsertServiceScopeField = typeof serviceScopeFields.$inferInsert;

export const insertServiceScopeFieldSchema = createInsertSchema(serviceScopeFields, {
  selectOptions: z.array(z.string()).optional(),
  validationRules: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User Dashboard Settings Types
export type UserDashboardSetting = typeof userDashboardSettings.$inferSelect;
export type InsertUserDashboardSetting = typeof userDashboardSettings.$inferInsert;

// Schema versioning table for tracking database migrations
export const schemaVersions = pgTable("schema_versions", {
  id: serial("id").primaryKey(),
  scriptVersion: text("script_version"),
  appVersion: text("app_version"),
  schemaVersion: text("schema_version"),
  version: text("version").notNull(),
  appliedAt: timestamp("applied_at").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  environment: text("environment"),
  notes: text("notes"),
  migrationFile: text("migration_file"),
  description: text("description"),
});

export type SchemaVersion = typeof schemaVersions.$inferSelect;
export type InsertSchemaVersion = typeof schemaVersions.$inferInsert;

// Field visibility configuration table for hiding fields from UI forms
export const fieldVisibilityConfig = pgTable("field_visibility_config", {
  id: serial("id").primaryKey(),
  tableName: text("table_name").notNull(),
  fieldName: text("field_name").notNull(),
  isVisible: boolean("is_visible").notNull().default(true),
  context: text("context").notNull().default("form"), // 'form', 'table', 'export', etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  // Unique constraint to prevent duplicate configurations
  unique("field_visibility_unique").on(table.tableName, table.fieldName, table.context),
  // Index for quick lookups
  index("idx_field_visibility_table_context").on(table.tableName, table.context),
]);

export const insertFieldVisibilityConfigSchema = createInsertSchema(fieldVisibilityConfig);
export type InsertFieldVisibilityConfig = z.infer<typeof insertFieldVisibilityConfigSchema>;
export type FieldVisibilityConfig = typeof fieldVisibilityConfig.$inferSelect;

// Saved Queries table for user-defined plugin queries
export const savedQueries = pgTable("saved_queries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  pluginName: text("plugin_name").notNull(),
  instanceId: text("instance_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  query: text("query").notNull(),
  method: text("method").notNull().default("GET"),
  tags: jsonb("tags"), // For categorization
  isPublic: boolean("is_public").notNull().default(false), // Allow sharing with other users
  executionCount: integer("execution_count").notNull().default(0),
  lastExecutedAt: timestamp("last_executed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_saved_queries_user_plugin").on(table.userId, table.pluginName),
  index("idx_saved_queries_public").on(table.isPublic).where(sql`${table.isPublic} = true`),
]);

export const insertSavedQuerySchema = createInsertSchema(savedQueries).omit({
  id: true,
  executionCount: true,
  lastExecutedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSavedQuery = z.infer<typeof insertSavedQuerySchema>;
export type SavedQuery = typeof savedQueries.$inferSelect;

// Custom widgets table - replaces localStorage storage
export const customWidgets = pgTable("custom_widgets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  pluginName: text("plugin_name").notNull(),
  instanceId: text("instance_id").notNull(),
  queryType: text("query_type").notNull().default("default"), // 'default' | 'custom'
  queryId: text("query_id"),
  customQuery: text("custom_query"),
  queryMethod: text("query_method").notNull().default("GET"),
  queryParameters: jsonb("query_parameters").notNull().default('{}'),
  displayType: text("display_type").notNull().default("table"), // 'table' | 'chart' | 'metric' | 'list' | 'gauge'
  chartType: text("chart_type"), // 'bar' | 'line' | 'pie' | 'area'
  refreshInterval: integer("refresh_interval").notNull().default(30),
  placement: text("placement").notNull().default("client-details"), // 'client-details' | 'global-dashboard' | 'custom'
  styling: jsonb("styling").notNull().default('{"width":"full","height":"medium","showBorder":true,"showHeader":true}'),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_custom_widgets_user").on(table.userId),
  index("idx_custom_widgets_placement").on(table.placement),
]);

export const insertCustomWidgetSchema = createInsertSchema(customWidgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCustomWidget = z.infer<typeof insertCustomWidgetSchema>;
export type CustomWidget = typeof customWidgets.$inferSelect;

// User preferences table - replaces localStorage for theme, column prefs, etc.
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  preferenceType: text("preference_type").notNull(), // 'theme', 'column_visibility', 'onboarding_progress'
  preferenceKey: text("preference_key").notNull(), // specific key within type (e.g., table name for columns)
  preferenceValue: jsonb("preference_value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  // Unique constraint to prevent duplicate preferences
  unique("user_preference_unique").on(table.userId, table.preferenceType, table.preferenceKey),
  // Index for performance
  index("idx_user_preferences_lookup").on(table.userId, table.preferenceType, table.preferenceKey),
]);

export const insertUserPreferenceSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;
export type UserPreference = typeof userPreferences.$inferSelect;
