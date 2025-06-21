-- Script to create NDR License Pool widgets
-- This script creates 4 widgets for monitoring NDR license pools:
-- 1. NDR License Pool Status - Shows total, used, and available licenses
-- 2. Total NDR Licenses Allocated - Shows total allocated across all clients
-- 3. NDR Pool Utilization - Shows percentage utilization
-- 4. License Pool Comparison - Enhanced comparison of SIEM, EDR, and NDR pools

-- Create NDR License Pool Status widget
INSERT INTO custom_widgets (
    user_id,
    name,
    description,
    plugin_name,
    instance_id,
    query_type,
    custom_query,
    display_type,
    placement,
    styling,
    is_active
) VALUES (
    (SELECT id FROM users WHERE email = 'admin@mssp.local' LIMIT 1),
    'NDR License Pool Status',
    'Total, Used, and Available NDR network licenses',
    'sql',
    'sql-main',
    'custom',
    'SELECT ''NDR Network License Pool'' as label, lp.total_licenses as total, COALESCE(SUM(cl.assigned_licenses), 0) as used, lp.total_licenses - COALESCE(SUM(cl.assigned_licenses), 0) as available FROM license_pools lp LEFT JOIN client_licenses cl ON cl.license_pool_id = lp.id WHERE lp.id = 5 GROUP BY lp.id, lp.total_licenses',
    'metric',
    'dashboard',
    '{"width": "medium", "height": "small", "showBorder": true, "showHeader": true}'::jsonb,
    true
);

-- Create Total NDR Allocated widget
INSERT INTO custom_widgets (
    user_id,
    name,
    description,
    plugin_name,
    instance_id,
    query_type,
    custom_query,
    display_type,
    placement,
    styling,
    is_active
) VALUES (
    (SELECT id FROM users WHERE email = 'admin@mssp.local' LIMIT 1),
    'Total NDR Licenses Allocated',
    'Total NDR network licenses allocated to all clients',
    'sql',
    'sql-main',
    'custom',
    'SELECT COALESCE(SUM(cl.assigned_licenses), 0) as value, ''Total NDR Licenses Allocated'' as label FROM client_licenses cl JOIN license_pools lp ON lp.id = cl.license_pool_id WHERE LOWER(lp.name) LIKE ''%ndr%''',
    'number',
    'dashboard',
    '{"width": "small", "height": "small", "showBorder": true, "showHeader": true}'::jsonb,
    true
);

-- Create NDR Pool Utilization widget
INSERT INTO custom_widgets (
    user_id,
    name,
    description,
    plugin_name,
    instance_id,
    query_type,
    custom_query,
    display_type,
    placement,
    styling,
    is_active
) VALUES (
    (SELECT id FROM users WHERE email = 'admin@mssp.local' LIMIT 1),
    'NDR Pool Utilization',
    'Percentage of NDR network licenses in use',
    'sql',
    'sql-main',
    'custom',
    'SELECT ROUND((COALESCE(SUM(cl.assigned_licenses), 0)::numeric / NULLIF(lp.total_licenses, 0) * 100)::numeric, 1) as value, ''% Utilized'' as label FROM license_pools lp LEFT JOIN client_licenses cl ON cl.license_pool_id = lp.id WHERE LOWER(lp.name) LIKE ''%ndr%'' GROUP BY lp.id, lp.total_licenses',
    'number',
    'dashboard',
    '{"width": "small", "height": "small", "showBorder": true, "showHeader": true}'::jsonb,
    true
);

-- Create enhanced License Pool Comparison widget (SIEM vs EDR vs NDR)
INSERT INTO custom_widgets (
    user_id,
    name,
    description,
    plugin_name,
    instance_id,
    query_type,
    custom_query,
    display_type,
    chart_type,
    placement,
    styling,
    is_active,
    group_by
) VALUES (
    (SELECT id FROM users WHERE email = 'admin@mssp.local' LIMIT 1),
    'SIEM vs EDR vs NDR License Pools',
    'Comparison of SIEM EPS, EDR endpoint, and NDR network license pools utilization',
    'sql',
    'sql-main',
    'custom',
    'SELECT 
        CASE 
            WHEN LOWER(lp.name) LIKE ''%siem%'' THEN ''SIEM EPS''
            WHEN LOWER(lp.name) LIKE ''%edr%'' THEN ''EDR Endpoints''
            WHEN LOWER(lp.name) LIKE ''%ndr%'' THEN ''NDR Network''
            ELSE lp.name
        END as pool_name,
        lp.total_licenses,
        COALESCE(SUM(cl.assigned_licenses), 0) as assigned_licenses,
        lp.total_licenses - COALESCE(SUM(cl.assigned_licenses), 0) as available_licenses,
        ROUND((COALESCE(SUM(cl.assigned_licenses), 0)::numeric / NULLIF(lp.total_licenses, 0) * 100)::numeric, 1) as utilization_percentage
    FROM license_pools lp
    LEFT JOIN client_licenses cl ON cl.license_pool_id = lp.id
    WHERE LOWER(lp.name) LIKE ''%siem%'' 
       OR LOWER(lp.name) LIKE ''%edr%''
       OR LOWER(lp.name) LIKE ''%ndr%''
    GROUP BY lp.id, lp.name, lp.total_licenses
    ORDER BY 
        CASE 
            WHEN LOWER(lp.name) LIKE ''%siem%'' THEN 1
            WHEN LOWER(lp.name) LIKE ''%edr%'' THEN 2
            WHEN LOWER(lp.name) LIKE ''%ndr%'' THEN 3
            ELSE 4
        END',
    'chart',
    'bar',
    'dashboard',
    '{"width": "large", "height": "medium", "showBorder": true, "showHeader": true}'::jsonb,
    true,
    '{"xAxisField": "pool_name", "yAxisField": "assigned_licenses", "aggregationFunction": "sum"}'::jsonb
);

-- Display the IDs of the newly created widgets
SELECT id, name, display_type 
FROM custom_widgets 
WHERE name LIKE '%NDR%' 
   OR name = 'SIEM vs EDR vs NDR License Pools'
ORDER BY id DESC 
LIMIT 4; 