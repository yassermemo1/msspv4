-- Script to create EDR License Pool widgets
-- This script creates 4 widgets for monitoring EDR license pools:
-- 1. EDR License Pool Status - Shows total, used, and available licenses
-- 2. Total EDR Licenses Allocated - Shows total allocated across all clients
-- 3. EDR Pool Utilization - Shows percentage utilization
-- 4. SIEM vs EDR License Pools - Comparison chart of both pools

-- Create EDR License Pool Status widget
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
    'EDR License Pool Status',
    'Total, Used, and Available EDR endpoint licenses',
    'sql',
    'sql-main',
    'custom',
    'SELECT ''EDR Endpoint License Pool'' as label, lp.total_licenses as total, COALESCE(SUM(cl.assigned_licenses), 0) as used, lp.total_licenses - COALESCE(SUM(cl.assigned_licenses), 0) as available FROM license_pools lp LEFT JOIN client_licenses cl ON cl.license_pool_id = lp.id WHERE lp.id = 4 GROUP BY lp.id, lp.total_licenses',
    'metric',
    'dashboard',
    '{"width": "medium", "height": "small", "showBorder": true, "showHeader": true}'::jsonb,
    true
);

-- Create Total EDR Allocated widget
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
    'Total EDR Licenses Allocated',
    'Total EDR endpoint licenses allocated to all clients',
    'sql',
    'sql-main',
    'custom',
    'SELECT COALESCE(SUM(cl.assigned_licenses), 0) as value, ''Total EDR Endpoints Allocated'' as label FROM client_licenses cl JOIN license_pools lp ON lp.id = cl.license_pool_id WHERE LOWER(lp.name) LIKE ''%edr%''',
    'number',
    'dashboard',
    '{"width": "small", "height": "small", "showBorder": true, "showHeader": true}'::jsonb,
    true
);

-- Create EDR Pool Utilization widget
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
    'EDR Pool Utilization',
    'EDR license pool usage percentage',
    'sql',
    'sql-main',
    'custom',
    'SELECT ROUND((COALESCE(SUM(cl.assigned_licenses), 0)::numeric / NULLIF(lp.total_licenses, 0) * 100)::numeric, 1) as value, ''% Utilized'' as label FROM license_pools lp LEFT JOIN client_licenses cl ON cl.license_pool_id = lp.id WHERE LOWER(lp.name) LIKE ''%edr%'' GROUP BY lp.id, lp.total_licenses',
    'number',
    'dashboard',
    '{"width": "small", "height": "small", "showBorder": true, "showHeader": true}'::jsonb,
    true
);

-- Create combined SIEM vs EDR License Pools widget
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
    'SIEM vs EDR License Pools',
    'Comparison of SIEM EPS and EDR endpoint license pools utilization',
    'sql',
    'sql-main',
    'custom',
    'SELECT 
        lp.name as pool_name,
        lp.total_licenses,
        COALESCE(SUM(cl.assigned_licenses), 0) as assigned_licenses,
        lp.total_licenses - COALESCE(SUM(cl.assigned_licenses), 0) as available_licenses,
        ROUND((COALESCE(SUM(cl.assigned_licenses), 0)::numeric / NULLIF(lp.total_licenses, 0) * 100)::numeric, 1) as utilization_percentage
    FROM license_pools lp
    LEFT JOIN client_licenses cl ON cl.license_pool_id = lp.id
    WHERE LOWER(lp.name) LIKE ''%siem%'' OR LOWER(lp.name) LIKE ''%edr%''
    GROUP BY lp.id, lp.name, lp.total_licenses
    ORDER BY lp.name',
    'bar',
    'bar',
    'dashboard',
    '{"width": "large", "height": "medium", "showBorder": true, "showHeader": true}'::jsonb,
    true,
    '{"xAxisField": "pool_name", "yAxisField": "total_licenses", "legendField": "pool_name", "metrics": ["total_licenses", "assigned_licenses", "available_licenses"]}'::jsonb
);

-- Show all license pool widgets
SELECT id, name, display_type, placement 
FROM custom_widgets 
WHERE (LOWER(name) LIKE '%siem%' OR LOWER(name) LIKE '%edr%' OR LOWER(name) LIKE '%license%')
  AND placement = 'dashboard'
ORDER BY id DESC; 