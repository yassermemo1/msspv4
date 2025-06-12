-- Create field_visibility_config table
CREATE TABLE IF NOT EXISTS field_visibility_config (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  context TEXT NOT NULL DEFAULT 'form',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT field_visibility_unique UNIQUE (table_name, field_name, context)
);

-- Create indexes for field_visibility_config
CREATE INDEX IF NOT EXISTS idx_field_visibility_table_context ON field_visibility_config (table_name, context);

-- Performance indexes for critical tables
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_client_status ON contracts (client_id, status);
CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON client_contacts (client_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_service_scopes_contract ON service_scopes (contract_id);
CREATE INDEX IF NOT EXISTS idx_proposals_contract ON proposals (contract_id);
CREATE INDEX IF NOT EXISTS idx_client_licenses_client ON client_licenses (client_id);
CREATE INDEX IF NOT EXISTS idx_hardware_assets_client ON client_hardware_assignments (client_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_client ON financial_transactions (client_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs (user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events (timestamp);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents (client_id);
CREATE INDEX IF NOT EXISTS idx_service_authorization_forms_client ON service_authorization_forms (client_id);
CREATE INDEX IF NOT EXISTS idx_certificates_compliance_client ON certificates_of_compliance (client_id);

-- Dashboard performance indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user ON user_dashboards (user_id);
CREATE INDEX IF NOT EXISTS idx_widget_assignments_dashboard ON dashboard_widget_assignments (dashboard_id);

-- Search and data access indexes
CREATE INDEX IF NOT EXISTS idx_global_search_table_entity ON global_search_index (table_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_user_timestamp ON data_access_logs (user_id, timestamp);

SELECT 'Created field_visibility_config table and added performance indexes successfully' as result; 