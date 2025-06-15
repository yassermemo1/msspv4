# Navigation System Documentation

## Overview

The MSSP Platform uses a **database-driven navigation system** with role-based access control. This document explains how the navigation works and how to manage it.

## ⚠️ Important: Multiple Navigation Systems

Your application currently has **multiple navigation systems**. Here's what each one does:

### 1. **Database Navigation** (ACTIVE - Controls Main UI)
- **Location**: `page_permissions` database table
- **Used by**: Main `AppLayout` component via `DynamicNavigation`
- **API**: `/api/user/accessible-pages`
- **Management**: Navigation Manager UI (Settings > Navigation Manager)
- **Status**: ✅ **This is what controls your actual navigation**

### 2. **Static Navigation Config** (LEGACY - Limited Use)
- **Location**: `client/src/config/navigation.ts`
- **Used by**: Mobile navigation fallback, some legacy components
- **Status**: ⚠️ **Changes here won't affect main navigation**

### 3. **Navigation Manager UI** (ADMIN TOOL)
- **Location**: `/navigation-manager` page (admin only)
- **Purpose**: Visual interface to manage database navigation
- **Status**: ✅ **Use this to make navigation changes**

## How to Update Navigation

### Method 1: Navigation Manager UI (Recommended)
1. Login as admin
2. Go to **Settings > Navigation Manager**
3. Drag and drop to reorder items
4. Toggle visibility with switches
5. Click **Save Changes**

### Method 2: Sync Static Config to Database
If you prefer editing the static config file:

1. Edit `client/src/config/navigation.ts`
2. Run: `npm run sync-navigation`
3. This syncs your static config to the database

### Method 3: Direct Database/API
For advanced users:
- Edit `page_permissions` table directly
- Use `/api/page-permissions` API endpoints
- Requires admin authentication

## Navigation Structure

### Categories
Navigation items are organized into categories:

- **main**: Core features (Dashboard, Clients, Contracts)
- **advanced**: Advanced tools (Dynamic Dashboards, Widget Manager)
- **integration**: External systems (Plugins, Integration Engine)
- **reports**: Analytics and reporting
- **admin**: Administrative functions (User Management, Settings)
- **other**: Miscellaneous features

### Role-Based Access
Each navigation item has access controls:

- **adminAccess**: Admin users only
- **managerAccess**: Manager level and above
- **engineerAccess**: Engineer level and above  
- **userAccess**: All authenticated users

## Database Schema

```sql
CREATE TABLE page_permissions (
  id SERIAL PRIMARY KEY,
  page_name TEXT NOT NULL UNIQUE,
  page_url TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'main',
  icon TEXT,
  admin_access BOOLEAN NOT NULL DEFAULT true,
  manager_access BOOLEAN NOT NULL DEFAULT false,
  engineer_access BOOLEAN NOT NULL DEFAULT false,
  user_access BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## API Endpoints

### Get User's Accessible Pages
```http
GET /api/user/accessible-pages
```
Returns navigation items the current user can access based on their role.

### Get All Page Permissions (Admin Only)
```http
GET /api/page-permissions
```
Returns all navigation items for management.

### Update Page Permission (Admin Only)
```http
PUT /api/page-permissions/:id
```
Update a specific navigation item.

### Reorder Navigation (Admin Only)
```http
PUT /api/page-permissions/reorder
```
Bulk update sort order for navigation items.

## Troubleshooting

### "I changed navigation.ts but don't see changes"
- The main app uses database navigation, not the static config
- Run `npm run sync-navigation` to sync your changes
- Or use the Navigation Manager UI instead

### "Navigation Manager shows different items than I expect"
- Check the `page_permissions` database table
- Ensure items are marked as `is_active = true`
- Verify your user role has access to the items

### "New pages don't appear in navigation"
1. Add the page to `page_permissions` table
2. Set appropriate role access permissions
3. Ensure `is_active = true`
4. Set a `sort_order` value

### "Navigation order is wrong"
- Use Navigation Manager to drag and drop reorder
- Or update `sort_order` values in database
- Lower numbers appear first

## Best Practices

1. **Use Navigation Manager UI** for most changes
2. **Keep categories organized** - don't put everything in 'main'
3. **Set appropriate role permissions** - follow principle of least privilege
4. **Use descriptive display names** and descriptions
5. **Test with different user roles** to verify access
6. **Keep sort_order values spaced** (10, 20, 30) for easy reordering

## Migration Guide

If you want to **consolidate to one navigation system**:

### Option A: Keep Database Navigation (Recommended)
1. Run `npm run sync-navigation` to sync static config to database
2. Use Navigation Manager for future changes
3. Consider the static config as backup/reference only

### Option B: Switch to Static Navigation Only
1. Replace `DynamicNavigation` with static navigation in `AppLayout`
2. Remove database navigation system
3. Edit `navigation.ts` for changes
4. Lose role-based access control features

## Files Involved

- `client/src/components/layout/app-layout.tsx` - Main layout using DynamicNavigation
- `client/src/components/layout/dynamic-navigation.tsx` - Database-driven navigation component
- `client/src/config/navigation.ts` - Static navigation configuration (legacy)
- `client/src/pages/admin/navigation-manager-page.tsx` - Navigation management UI
- `shared/schema.ts` - Database schema for page_permissions
- `server/routes.ts` - API endpoints for navigation
- `scripts/sync-navigation-to-db.ts` - Sync script

## Support

If you need help with navigation:
1. Check this documentation
2. Use Navigation Manager UI for visual management
3. Check browser console for API errors
4. Verify database connectivity and permissions 