-- Create tenants_lookup table to cache MDR tenant information
CREATE TABLE IF NOT EXISTS tenants_lookup (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100) NOT NULL,
    domain VARCHAR(100),
    response_hours INTEGER,
    service_activation_date TIMESTAMP WITH TIME ZONE,
    service_expiration_date TIMESTAMP WITH TIME ZONE,
    -- Visibility data fields
    contract_scope INTEGER,
    current_scope_servers INTEGER DEFAULT 0,
    current_scope_workstations INTEGER DEFAULT 0,
    actual_scope_servers INTEGER DEFAULT 0,
    actual_scope_workstations INTEGER DEFAULT 0,
    online_server_endpoint_count INTEGER DEFAULT 0,
    online_workstation_endpoint_count INTEGER DEFAULT 0,
    server_count INTEGER DEFAULT 0,
    workstation_count INTEGER DEFAULT 0,
    last_endpoint_update TIMESTAMP WITH TIME ZONE,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_tenants_lookup_short_name ON tenants_lookup(short_name);
CREATE INDEX idx_tenants_lookup_tenant_id ON tenants_lookup(tenant_id);
CREATE INDEX idx_tenants_lookup_domain ON tenants_lookup(domain);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_tenants_lookup_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_tenants_lookup_updated_at_trigger
    BEFORE UPDATE ON tenants_lookup
    FOR EACH ROW
    EXECUTE FUNCTION update_tenants_lookup_updated_at();

-- Add comment to explain the table's purpose
COMMENT ON TABLE tenants_lookup IS 'Cache table for MDR tenant information, synced daily and on client creation'; 