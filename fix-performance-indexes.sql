-- Performance indexes for existing tables with correct names
CREATE INDEX IF NOT EXISTS idx_contracts_client_status ON contracts ("clientId", status);
CREATE INDEX IF NOT EXISTS idx_clientContacts_client ON "clientContacts" ("clientId") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS idx_serviceScopes_contract ON "serviceScopes" ("contractId");
CREATE INDEX IF NOT EXISTS idx_proposals_contract ON proposals ("contractId");
CREATE INDEX IF NOT EXISTS idx_clientLicenses_client ON "clientLicenses" ("clientId");
CREATE INDEX IF NOT EXISTS idx_clientHardwareAssignments_client ON "clientHardwareAssignments" ("clientId");
CREATE INDEX IF NOT EXISTS idx_financialTransactions_client ON "financialTransactions" ("clientId");
CREATE INDEX IF NOT EXISTS idx_userSettings_user ON "userSettings" ("userId");
CREATE INDEX IF NOT EXISTS idx_auditLogs_user_action ON "auditLogs" ("userId", action);
CREATE INDEX IF NOT EXISTS idx_auditLogs_timestamp ON "auditLogs" (timestamp);
CREATE INDEX IF NOT EXISTS idx_securityEvents_timestamp ON "securityEvents" (timestamp);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents ("clientId");
CREATE INDEX IF NOT EXISTS idx_serviceAuthorizationForms_client ON "serviceAuthorizationForms" ("clientId");
CREATE INDEX IF NOT EXISTS idx_certificatesOfCompliance_client ON "certificatesOfCompliance" ("clientId");

-- Dashboard performance indexes
CREATE INDEX IF NOT EXISTS idx_userDashboards_user ON "userDashboards" ("userId");
CREATE INDEX IF NOT EXISTS idx_dashboardWidgetAssignments_dashboard ON "dashboardWidgetAssignments" ("dashboardId");

-- Search and data access indexes
CREATE INDEX IF NOT EXISTS idx_globalSearchIndex_table_entity ON "globalSearchIndex" ("tableName", "entityId");
CREATE INDEX IF NOT EXISTS idx_dataAccessLogs_user_timestamp ON "dataAccessLogs" ("userId", timestamp);

-- Additional critical indexes
CREATE INDEX IF NOT EXISTS idx_services_category ON services (category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services ("isActive") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users ("isActive") WHERE "isActive" = true;

SELECT 'Added performance indexes for existing tables successfully' as result; 