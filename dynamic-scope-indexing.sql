-- Dynamic Scope Variable Indexing System
-- This approach allows for flexible addition of new scope variables without schema changes

-- Create a table for scope variable definitions (metadata)
CREATE TABLE IF NOT EXISTS scope_variable_definitions (
    id SERIAL PRIMARY KEY,
    variable_name VARCHAR(100) NOT NULL UNIQUE,
    variable_type VARCHAR(20) NOT NULL, -- integer, decimal, text, boolean
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    is_filterable BOOLEAN DEFAULT true,
    is_indexed BOOLEAN DEFAULT false,
    filter_component VARCHAR(50), -- range, select, text, boolean
    unit VARCHAR(20), -- GB, minutes, endpoints, etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create a table for actual scope variable values
CREATE TABLE IF NOT EXISTS scope_variable_values (
    id SERIAL PRIMARY KEY,
    service_scope_id INTEGER NOT NULL REFERENCES service_scopes(id) ON DELETE CASCADE,
    variable_name VARCHAR(100) NOT NULL REFERENCES scope_variable_definitions(variable_name),
    value_text TEXT,
    value_integer INTEGER,
    value_decimal DECIMAL(15,4),
    value_boolean BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(service_scope_id, variable_name)
);

-- Create indexes for performance
CREATE INDEX idx_scope_variable_values_scope_id ON scope_variable_values(service_scope_id);
CREATE INDEX idx_scope_variable_values_variable ON scope_variable_values(variable_name);
CREATE INDEX idx_scope_variable_values_integer ON scope_variable_values(value_integer) WHERE value_integer IS NOT NULL;
CREATE INDEX idx_scope_variable_values_decimal ON scope_variable_values(value_decimal) WHERE value_decimal IS NOT NULL;
CREATE INDEX idx_scope_variable_values_text ON scope_variable_values(value_text) WHERE value_text IS NOT NULL;

-- Insert predefined variable definitions
INSERT INTO scope_variable_definitions (variable_name, variable_type, display_name, description, filter_component, unit) VALUES
('eps', 'integer', 'Events Per Second', 'Number of security events processed per second', 'range', 'EPS'),
('endpoints', 'integer', 'Endpoint Count', 'Number of endpoints covered by the service', 'range', 'endpoints'),
('data_volume_gb', 'decimal', 'Data Volume', 'Data volume processed in gigabytes', 'range', 'GB'),
('log_sources', 'integer', 'Log Sources', 'Number of log sources for SIEM services', 'range', 'sources'),
('firewall_devices', 'integer', 'Firewall Devices', 'Number of firewall devices managed', 'range', 'devices'),
('pam_users', 'integer', 'PAM Users', 'Number of privileged users managed', 'range', 'users'),
('response_time_minutes', 'integer', 'Response Time', 'Service response time in minutes', 'range', 'minutes'),
('coverage_hours', 'text', 'Coverage Hours', 'Service coverage schedule', 'select', NULL),
('service_tier', 'text', 'Service Tier', 'Service tier level', 'select', NULL),
('sla_uptime', 'decimal', 'SLA Uptime', 'Guaranteed uptime percentage', 'range', '%'),
('max_incidents_monthly', 'integer', 'Max Monthly Incidents', 'Maximum incidents handled per month', 'range', 'incidents'),
('compliance_frameworks', 'text', 'Compliance Frameworks', 'Supported compliance frameworks', 'text', NULL),
('geo_coverage', 'text', 'Geographic Coverage', 'Geographic regions covered', 'select', NULL),
('escalation_levels', 'integer', 'Escalation Levels', 'Number of escalation levels', 'range', 'levels')
ON CONFLICT (variable_name) DO NOTHING;

-- Function to automatically extract variables from existing scope definitions
CREATE OR REPLACE FUNCTION extract_scope_variables()
RETURNS void AS $$
DECLARE
    scope_record RECORD;
    deliverable JSONB;
    variable_name TEXT;
    variable_value TEXT;
    numeric_value DECIMAL;
    integer_value INTEGER;
BEGIN
    -- Loop through all service scopes
    FOR scope_record IN SELECT id, scope_definition FROM service_scopes WHERE scope_definition IS NOT NULL
    LOOP
        -- Extract from deliverables if they exist as array of objects
        IF jsonb_typeof(scope_record.scope_definition->'deliverables') = 'array' THEN
            FOR deliverable IN SELECT * FROM jsonb_array_elements(scope_record.scope_definition->'deliverables')
            LOOP
                IF jsonb_typeof(deliverable) = 'object' AND deliverable ? 'item' AND deliverable ? 'value' THEN
                    variable_name := lower(regexp_replace(deliverable->>'item', '[^a-zA-Z0-9]+', '_', 'g'));
                    variable_value := deliverable->>'value';

                    -- Try to parse as integer first
                    BEGIN
                        integer_value := CAST(regexp_replace(variable_value, '[^0-9]', '', 'g') AS INTEGER);
                        IF integer_value > 0 THEN
                            INSERT INTO scope_variable_values (service_scope_id, variable_name, value_integer, value_text)
                            VALUES (scope_record.id, variable_name, integer_value, variable_value)
                            ON CONFLICT (service_scope_id, variable_name) DO UPDATE SET 
                                value_integer = EXCLUDED.value_integer,
                                value_text = EXCLUDED.value_text,
                                updated_at = NOW();
                        END IF;
                    EXCEPTION WHEN OTHERS THEN
                        -- Try as decimal
                        BEGIN
                            numeric_value := CAST(regexp_replace(variable_value, '[^0-9.]', '', 'g') AS DECIMAL);
                            INSERT INTO scope_variable_values (service_scope_id, variable_name, value_decimal, value_text)
                            VALUES (scope_record.id, variable_name, numeric_value, variable_value)
                            ON CONFLICT (service_scope_id, variable_name) DO UPDATE SET 
                                value_decimal = EXCLUDED.value_decimal,
                                value_text = EXCLUDED.value_text,
                                updated_at = NOW();
                        EXCEPTION WHEN OTHERS THEN
                            -- Store as text
                            INSERT INTO scope_variable_values (service_scope_id, variable_name, value_text)
                            VALUES (scope_record.id, variable_name, variable_value)
                            ON CONFLICT (service_scope_id, variable_name) DO UPDATE SET 
                                value_text = EXCLUDED.value_text,
                                updated_at = NOW();
                        END;
                    END;
                END IF;
            END LOOP;
        END IF;

        -- Also extract common variables from the existing indexed columns if they exist
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_scopes' AND column_name = 'eps') THEN
            INSERT INTO scope_variable_values (service_scope_id, variable_name, value_integer)
            SELECT scope_record.id, 'eps', eps 
            FROM service_scopes 
            WHERE id = scope_record.id AND eps IS NOT NULL
            ON CONFLICT (service_scope_id, variable_name) DO UPDATE SET value_integer = EXCLUDED.value_integer;
        END IF;

        -- Continue for other existing columns...
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create variable definitions for new variables
CREATE OR REPLACE FUNCTION auto_discover_variables()
RETURNS TABLE(variable_name TEXT, count BIGINT, sample_value TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        svv.variable_name,
        COUNT(*) as usage_count,
        (array_agg(COALESCE(svv.value_text, svv.value_integer::text, svv.value_decimal::text)))[1] as sample
    FROM scope_variable_values svv
    LEFT JOIN scope_variable_definitions svd ON svv.variable_name = svd.variable_name
    WHERE svd.variable_name IS NULL  -- Only undefined variables
    GROUP BY svv.variable_name
    HAVING COUNT(*) >= 3  -- Only suggest variables used in 3+ scopes
    ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function for dynamic filtering
CREATE OR REPLACE FUNCTION filter_service_scopes(
    filters JSONB DEFAULT '{}'::jsonb,
    page_num INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 50
)
RETURNS TABLE(
    scope_id INTEGER,
    service_name TEXT,
    client_name TEXT,
    contract_name TEXT,
    scope_data JSONB,
    variables JSONB
) AS $$
DECLARE
    filter_key TEXT;
    filter_value JSONB;
    where_clauses TEXT[] := ARRAY[]::TEXT[];
    query_text TEXT;
    offset_value INTEGER;
BEGIN
    -- Build dynamic WHERE clauses based on filters
    FOR filter_key, filter_value IN SELECT * FROM jsonb_each(filters)
    LOOP
        CASE 
            WHEN filter_key = 'eps_min' THEN
                where_clauses := array_append(where_clauses, 
                    format('EXISTS (SELECT 1 FROM scope_variable_values svv WHERE svv.service_scope_id = ss.id AND svv.variable_name = ''eps'' AND svv.value_integer >= %s)', filter_value));
            WHEN filter_key = 'eps_max' THEN
                where_clauses := array_append(where_clauses, 
                    format('EXISTS (SELECT 1 FROM scope_variable_values svv WHERE svv.service_scope_id = ss.id AND svv.variable_name = ''eps'' AND svv.value_integer <= %s)', filter_value));
            WHEN filter_key = 'service_tier' THEN
                where_clauses := array_append(where_clauses, 
                    format('EXISTS (SELECT 1 FROM scope_variable_values svv WHERE svv.service_scope_id = ss.id AND svv.variable_name = ''service_tier'' AND svv.value_text = %L)', filter_value #>> '{}'));
            -- Add more filter types as needed
        END CASE;
    END LOOP;

    offset_value := (page_num - 1) * page_size;

    -- Build and execute dynamic query
    query_text := format('
        SELECT 
            ss.id,
            s.name,
            c.name,
            ct.name,
            ss.scope_definition,
            jsonb_object_agg(svv.variable_name, 
                CASE 
                    WHEN svv.value_integer IS NOT NULL THEN to_jsonb(svv.value_integer)
                    WHEN svv.value_decimal IS NOT NULL THEN to_jsonb(svv.value_decimal)
                    WHEN svv.value_boolean IS NOT NULL THEN to_jsonb(svv.value_boolean)
                    ELSE to_jsonb(svv.value_text)
                END
            ) as variables
        FROM service_scopes ss
        LEFT JOIN services s ON ss.service_id = s.id
        LEFT JOIN contracts ct ON ss.contract_id = ct.id
        LEFT JOIN clients c ON ct."clientId" = c.id
        LEFT JOIN scope_variable_values svv ON ss.id = svv.service_scope_id
        %s
        GROUP BY ss.id, s.name, c.name, ct.name, ss.scope_definition
        ORDER BY ss.created_at DESC
        LIMIT %s OFFSET %s',
        CASE WHEN array_length(where_clauses, 1) > 0 THEN 'WHERE ' || array_to_string(where_clauses, ' AND ') ELSE '' END,
        page_size,
        offset_value
    );

    RETURN QUERY EXECUTE query_text;
END;
$$ LANGUAGE plpgsql;

-- Execute the extraction
SELECT extract_scope_variables(); 