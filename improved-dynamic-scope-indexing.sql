-- Improved Dynamic Scope Variable System
-- Auto-creates variable definitions for discovered variables

-- Function to ensure variable definition exists
CREATE OR REPLACE FUNCTION ensure_variable_definition(
    var_name TEXT,
    sample_value TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    var_type TEXT;
    display_name TEXT;
    filter_comp TEXT;
    unit_val TEXT;
BEGIN
    -- Check if variable definition already exists
    IF NOT EXISTS (SELECT 1 FROM scope_variable_definitions WHERE variable_name = var_name) THEN
        -- Try to determine variable type from sample value
        IF sample_value ~ '^[0-9]+$' THEN
            var_type := 'integer';
            filter_comp := 'range';
        ELSIF sample_value ~ '^[0-9]+\.[0-9]+$' THEN
            var_type := 'decimal';
            filter_comp := 'range';
        ELSIF sample_value ~ '(?i)(true|false|yes|no)' THEN
            var_type := 'boolean';
            filter_comp := 'boolean';
        ELSE
            var_type := 'text';
            filter_comp := 'text';
        END IF;

        -- Generate display name from variable name
        display_name := replace(initcap(replace(var_name, '_', ' ')), ' ', ' ');
        
        -- Guess unit from variable name
        CASE 
            WHEN var_name LIKE '%eps%' OR var_name LIKE '%events_per_second%' THEN unit_val := 'EPS';
            WHEN var_name LIKE '%endpoint%' THEN unit_val := 'endpoints';
            WHEN var_name LIKE '%gb%' OR var_name LIKE '%gigabyte%' THEN unit_val := 'GB';
            WHEN var_name LIKE '%minute%' OR var_name LIKE '%time%' THEN unit_val := 'minutes';
            WHEN var_name LIKE '%hour%' THEN unit_val := 'hours';
            WHEN var_name LIKE '%percent%' OR var_name LIKE '%uptime%' THEN unit_val := '%';
            ELSE unit_val := NULL;
        END CASE;

        -- Insert the new variable definition
        INSERT INTO scope_variable_definitions (
            variable_name, 
            variable_type, 
            display_name, 
            description, 
            filter_component, 
            unit
        ) VALUES (
            var_name,
            var_type,
            display_name,
            'Auto-discovered variable from scope definitions',
            filter_comp,
            unit_val
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Improved extraction function with auto-discovery
CREATE OR REPLACE FUNCTION extract_scope_variables()
RETURNS void AS $$
DECLARE
    scope_record RECORD;
    deliverable JSONB;
    var_name TEXT;
    var_value TEXT;
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
                    var_name := lower(regexp_replace(deliverable->>'item', '[^a-zA-Z0-9]+', '_', 'g'));
                    var_value := deliverable->>'value';

                    -- Ensure variable definition exists
                    PERFORM ensure_variable_definition(var_name, var_value);

                    -- Try to parse as integer first
                    BEGIN
                        integer_value := CAST(regexp_replace(var_value, '[^0-9]', '', 'g') AS INTEGER);
                        IF integer_value > 0 THEN
                            INSERT INTO scope_variable_values (service_scope_id, variable_name, value_integer, value_text)
                            VALUES (scope_record.id, var_name, integer_value, var_value)
                            ON CONFLICT (service_scope_id, variable_name) DO UPDATE SET 
                                value_integer = EXCLUDED.value_integer,
                                value_text = EXCLUDED.value_text,
                                updated_at = NOW();
                        ELSE
                            -- Store as text if integer is 0 or negative
                            INSERT INTO scope_variable_values (service_scope_id, variable_name, value_text)
                            VALUES (scope_record.id, var_name, var_value)
                            ON CONFLICT (service_scope_id, variable_name) DO UPDATE SET 
                                value_text = EXCLUDED.value_text,
                                updated_at = NOW();
                        END IF;
                    EXCEPTION WHEN OTHERS THEN
                        -- Try as decimal
                        BEGIN
                            numeric_value := CAST(regexp_replace(var_value, '[^0-9.]', '', 'g') AS DECIMAL);
                            IF numeric_value > 0 THEN
                                INSERT INTO scope_variable_values (service_scope_id, variable_name, value_decimal, value_text)
                                VALUES (scope_record.id, var_name, numeric_value, var_value)
                                ON CONFLICT (service_scope_id, variable_name) DO UPDATE SET 
                                    value_decimal = EXCLUDED.value_decimal,
                                    value_text = EXCLUDED.value_text,
                                    updated_at = NOW();
                            ELSE
                                -- Store as text if decimal is 0 or negative
                                INSERT INTO scope_variable_values (service_scope_id, variable_name, value_text)
                                VALUES (scope_record.id, var_name, var_value)
                                ON CONFLICT (service_scope_id, variable_name) DO UPDATE SET 
                                    value_text = EXCLUDED.value_text,
                                    updated_at = NOW();
                            END IF;
                        EXCEPTION WHEN OTHERS THEN
                            -- Store as text
                            INSERT INTO scope_variable_values (service_scope_id, variable_name, value_text)
                            VALUES (scope_record.id, var_name, var_value)
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

        -- Extract other existing columns
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_scopes' AND column_name = 'endpoints') THEN
            INSERT INTO scope_variable_values (service_scope_id, variable_name, value_integer)
            SELECT scope_record.id, 'endpoints', endpoints 
            FROM service_scopes 
            WHERE id = scope_record.id AND endpoints IS NOT NULL
            ON CONFLICT (service_scope_id, variable_name) DO UPDATE SET value_integer = EXCLUDED.value_integer;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_scopes' AND column_name = 'service_tier') THEN
            INSERT INTO scope_variable_values (service_scope_id, variable_name, value_text)
            SELECT scope_record.id, 'service_tier', service_tier 
            FROM service_scopes 
            WHERE id = scope_record.id AND service_tier IS NOT NULL
            ON CONFLICT (service_scope_id, variable_name) DO UPDATE SET value_text = EXCLUDED.value_text;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_scopes' AND column_name = 'coverage_hours') THEN
            INSERT INTO scope_variable_values (service_scope_id, variable_name, value_text)
            SELECT scope_record.id, 'coverage_hours', coverage_hours 
            FROM service_scopes 
            WHERE id = scope_record.id AND coverage_hours IS NOT NULL
            ON CONFLICT (service_scope_id, variable_name) DO UPDATE SET value_text = EXCLUDED.value_text;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_scopes' AND column_name = 'response_time_minutes') THEN
            INSERT INTO scope_variable_values (service_scope_id, variable_name, value_integer)
            SELECT scope_record.id, 'response_time_minutes', response_time_minutes 
            FROM service_scopes 
            WHERE id = scope_record.id AND response_time_minutes IS NOT NULL
            ON CONFLICT (service_scope_id, variable_name) DO UPDATE SET value_integer = EXCLUDED.value_integer;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to add a new scope variable (for future use)
CREATE OR REPLACE FUNCTION add_scope_variable(
    scope_id INTEGER,
    var_name TEXT,
    var_value TEXT,
    var_type TEXT DEFAULT 'auto'
)
RETURNS void AS $$
DECLARE
    numeric_value DECIMAL;
    integer_value INTEGER;
    boolean_value BOOLEAN;
BEGIN
    -- Ensure variable definition exists
    PERFORM ensure_variable_definition(var_name, var_value);

    -- Insert based on type
    IF var_type = 'integer' OR (var_type = 'auto' AND var_value ~ '^[0-9]+$') THEN
        integer_value := CAST(var_value AS INTEGER);
        INSERT INTO scope_variable_values (service_scope_id, variable_name, value_integer, value_text)
        VALUES (scope_id, var_name, integer_value, var_value)
        ON CONFLICT (service_scope_id, variable_name) DO UPDATE SET 
            value_integer = EXCLUDED.value_integer,
            value_text = EXCLUDED.value_text,
            updated_at = NOW();
    ELSIF var_type = 'decimal' OR (var_type = 'auto' AND var_value ~ '^[0-9]+\.[0-9]+$') THEN
        numeric_value := CAST(var_value AS DECIMAL);
        INSERT INTO scope_variable_values (service_scope_id, variable_name, value_decimal, value_text)
        VALUES (scope_id, var_name, numeric_value, var_value)
        ON CONFLICT (service_scope_id, variable_name) DO UPDATE SET 
            value_decimal = EXCLUDED.value_decimal,
            value_text = EXCLUDED.value_text,
            updated_at = NOW();
    ELSIF var_type = 'boolean' OR (var_type = 'auto' AND var_value ~* '^(true|false|yes|no)$') THEN
        boolean_value := CASE WHEN var_value ~* '^(true|yes)$' THEN true ELSE false END;
        INSERT INTO scope_variable_values (service_scope_id, variable_name, value_boolean, value_text)
        VALUES (scope_id, var_name, boolean_value, var_value)
        ON CONFLICT (service_scope_id, variable_name) DO UPDATE SET 
            value_boolean = EXCLUDED.value_boolean,
            value_text = EXCLUDED.value_text,
            updated_at = NOW();
    ELSE
        -- Store as text
        INSERT INTO scope_variable_values (service_scope_id, variable_name, value_text)
        VALUES (scope_id, var_name, var_value)
        ON CONFLICT (service_scope_id, variable_name) DO UPDATE SET 
            value_text = EXCLUDED.value_text,
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the extraction
SELECT extract_scope_variables(); 