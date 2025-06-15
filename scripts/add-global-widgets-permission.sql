-- Add Global Widgets page permission
INSERT INTO page_permissions (
  page_name,
  page_url,
  display_name,
  description,
  category,
  icon,
  admin_access,
  manager_access,
  engineer_access,
  user_access,
  requires_special_permission,
  is_active,
  sort_order
) VALUES (
  'Global Widgets',
  '/global-widgets',
  'Global Widgets',
  'Create and manage widgets that can be deployed globally to all client pages',
  'main',
  'Widgets',
  true,   -- admin_access
  true,   -- manager_access  
  false,  -- engineer_access
  false,  -- user_access
  false,  -- requires_special_permission
  true,   -- is_active
  25      -- sort_order (after plugins)
) ON CONFLICT (page_name) DO UPDATE SET
  page_url = EXCLUDED.page_url,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  admin_access = EXCLUDED.admin_access,
  manager_access = EXCLUDED.manager_access,
  engineer_access = EXCLUDED.engineer_access,
  user_access = EXCLUDED.user_access,
  requires_special_permission = EXCLUDED.requires_special_permission,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW(); 