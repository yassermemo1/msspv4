-- Fix the variable naming conflict in extract_scope_variables function
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
                        END IF;
                    EXCEPTION WHEN OTHERS THEN
                        -- Try as decimal
                        BEGIN
                            numeric_value := CAST(regexp_replace(var_value, '[^0-9.]', '', 'g') AS DECIMAL);
                            INSERT INTO scope_variable_values (service_scope_id, variable_name, value_decimal, value_text)
                            VALUES (scope_record.id, var_name, numeric_value, var_value)
                            ON CONFLICT (service_scope_id, variable_name) DO UPDATE SET 
                                value_decimal = EXCLUDED.value_decimal,
                                value_text = EXCLUDED.value_text,
                                updated_at = NOW();
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

-- Execute the extraction
SELECT extract_scope_variables(); 