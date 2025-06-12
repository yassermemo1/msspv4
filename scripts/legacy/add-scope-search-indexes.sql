-- Add indexed columns for searchable scope variables
-- This allows efficient filtering on scope parameters like EPS, endpoints, etc.

ALTER TABLE service_scopes 
ADD COLUMN eps INTEGER, -- Events Per Second
ADD COLUMN endpoints INTEGER, -- EDR/Endpoint count
ADD COLUMN data_volume_gb DECIMAL(10,2), -- Data volume in GB
ADD COLUMN log_sources INTEGER, -- For SIEM services
ADD COLUMN firewall_devices INTEGER, -- For Firewall services
ADD COLUMN pam_users INTEGER, -- For PAM services
ADD COLUMN response_time_minutes INTEGER, -- Response time in minutes
ADD COLUMN coverage_hours TEXT, -- Coverage hours (8x5, 16x5, 24x7)
ADD COLUMN service_tier TEXT; -- Enterprise, Professional, Standard

-- Create indexes for efficient filtering
CREATE INDEX idx_service_scopes_eps ON service_scopes(eps);
CREATE INDEX idx_service_scopes_endpoints ON service_scopes(endpoints);
CREATE INDEX idx_service_scopes_data_volume ON service_scopes(data_volume_gb);
CREATE INDEX idx_service_scopes_log_sources ON service_scopes(log_sources);
CREATE INDEX idx_service_scopes_firewall_devices ON service_scopes(firewall_devices);
CREATE INDEX idx_service_scopes_pam_users ON service_scopes(pam_users);
CREATE INDEX idx_service_scopes_response_time ON service_scopes(response_time_minutes);
CREATE INDEX idx_service_scopes_coverage ON service_scopes(coverage_hours);
CREATE INDEX idx_service_scopes_tier ON service_scopes(service_tier);

-- Composite indexes for common queries
CREATE INDEX idx_service_scopes_service_eps ON service_scopes(service_id, eps);
CREATE INDEX idx_service_scopes_service_endpoints ON service_scopes(service_id, endpoints);
CREATE INDEX idx_service_scopes_service_tier ON service_scopes(service_id, service_tier);

-- Function to extract and update scope variables from JSON
CREATE OR REPLACE FUNCTION update_scope_variables()
RETURNS void AS $$
DECLARE
    scope_record RECORD;
    deliverable JSONB;
    item_name TEXT;
    item_value TEXT;
    eps_val INTEGER;
    endpoints_val INTEGER;
    data_vol_val DECIMAL(10,2);
    log_sources_val INTEGER;
    firewall_devices_val INTEGER;
    pam_users_val INTEGER;
    response_time_val INTEGER;
    coverage_val TEXT;
    tier_val TEXT;
BEGIN
    -- Loop through all service scopes
    FOR scope_record IN SELECT id, scope_definition FROM service_scopes WHERE scope_definition IS NOT NULL
    LOOP
        -- Initialize values
        eps_val := NULL;
        endpoints_val := NULL;
        data_vol_val := NULL;
        log_sources_val := NULL;
        firewall_devices_val := NULL;
        pam_users_val := NULL;
        response_time_val := NULL;
        coverage_val := NULL;
        tier_val := NULL;

        -- Extract tier from description
        IF scope_definition->>'description' ILIKE '%enterprise%' THEN
            tier_val := 'Enterprise';
        ELSIF scope_definition->>'description' ILIKE '%professional%' THEN
            tier_val := 'Professional';
        ELSIF scope_definition->>'description' ILIKE '%standard%' THEN
            tier_val := 'Standard';
        END IF;

        -- Extract coverage from description
        IF scope_definition->>'description' ILIKE '%24x7%' OR scope_definition->>'description' ILIKE '%24/7%' THEN
            coverage_val := '24x7';
        ELSIF scope_definition->>'description' ILIKE '%16x5%' THEN
            coverage_val := '16x5';
        ELSIF scope_definition->>'description' ILIKE '%8x5%' THEN
            coverage_val := '8x5';
        END IF;

        -- Extract response time
        IF scope_definition->>'description' ILIKE '%15 minute%' OR scope_definition->>'description' ILIKE '%15-minute%' THEN
            response_time_val := 15;
        ELSIF scope_definition->>'description' ILIKE '%30 minute%' OR scope_definition->>'description' ILIKE '%30-minute%' THEN
            response_time_val := 30;
        ELSIF scope_definition->>'description' ILIKE '%45 minute%' OR scope_definition->>'description' ILIKE '%45-minute%' THEN
            response_time_val := 45;
        ELSIF scope_definition->>'description' ILIKE '%1 hour%' OR scope_definition->>'description' ILIKE '%60 minute%' THEN
            response_time_val := 60;
        ELSIF scope_definition->>'description' ILIKE '%2 hour%' OR scope_definition->>'description' ILIKE '%120 minute%' THEN
            response_time_val := 120;
        END IF;

        -- Loop through deliverables if they exist as array of objects
        IF jsonb_typeof(scope_record.scope_definition->'deliverables') = 'array' THEN
            FOR deliverable IN SELECT * FROM jsonb_array_elements(scope_record.scope_definition->'deliverables')
            LOOP
                IF jsonb_typeof(deliverable) = 'object' AND deliverable ? 'item' AND deliverable ? 'value' THEN
                    item_name := deliverable->>'item';
                    item_value := deliverable->>'value';

                    -- Extract EPS
                    IF item_name ILIKE '%Events Per Second%' OR item_name ILIKE '%EPS%' THEN
                        eps_val := CAST(regexp_replace(item_value, '[^0-9]', '', 'g') AS INTEGER);
                    END IF;

                    -- Extract Endpoints
                    IF item_name ILIKE '%Endpoint%' OR item_name ILIKE '%EDR%' THEN
                        endpoints_val := CAST(regexp_replace(item_value, '[^0-9]', '', 'g') AS INTEGER);
                    END IF;

                    -- Extract Data Volume (convert to GB)
                    IF item_name ILIKE '%Data Volume%' OR item_name ILIKE '%NDR%' THEN
                        IF item_value ILIKE '%GB%' THEN
                            data_vol_val := CAST(regexp_replace(item_value, '[^0-9.]', '', 'g') AS DECIMAL(10,2));
                        ELSIF item_value ILIKE '%MB%' THEN
                            data_vol_val := CAST(regexp_replace(item_value, '[^0-9.]', '', 'g') AS DECIMAL(10,2)) / 1024;
                        END IF;
                    END IF;

                    -- Extract Log Sources
                    IF item_name ILIKE '%Log Source%' OR item_name ILIKE '%SIEM%' THEN
                        log_sources_val := CAST(regexp_replace(item_value, '[^0-9]', '', 'g') AS INTEGER);
                    END IF;

                    -- Extract Firewall Devices
                    IF item_name ILIKE '%Firewall%' OR item_name ILIKE '%Device%' THEN
                        firewall_devices_val := CAST(regexp_replace(item_value, '[^0-9]', '', 'g') AS INTEGER);
                    END IF;

                    -- Extract PAM Users
                    IF item_name ILIKE '%PAM User%' OR item_name ILIKE '%Privileged User%' THEN
                        pam_users_val := CAST(regexp_replace(item_value, '[^0-9]', '', 'g') AS INTEGER);
                    END IF;
                END IF;
            END LOOP;
        END IF;

        -- Also extract from description text for cases where values are in description
        IF eps_val IS NULL THEN
            SELECT CAST(regexp_replace(substring(scope_record.scope_definition->>'description' FROM 'EPS[:\s]*([0-9,]+)'), '[^0-9]', '', 'g') AS INTEGER) INTO eps_val;
        END IF;

        IF endpoints_val IS NULL THEN
            SELECT CAST(regexp_replace(substring(scope_record.scope_definition->>'description' FROM 'Endpoint[s]*[:\s]*([0-9,]+)'), '[^0-9]', '', 'g') AS INTEGER) INTO endpoints_val;
        END IF;

        -- Update the record
        UPDATE service_scopes 
        SET 
            eps = eps_val,
            endpoints = endpoints_val,
            data_volume_gb = data_vol_val,
            log_sources = log_sources_val,
            firewall_devices = firewall_devices_val,
            pam_users = pam_users_val,
            response_time_minutes = response_time_val,
            coverage_hours = coverage_val,
            service_tier = tier_val
        WHERE id = scope_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to populate the new columns
SELECT update_scope_variables();

-- Drop the function as it's only needed for this migration
DROP FUNCTION update_scope_variables(); 