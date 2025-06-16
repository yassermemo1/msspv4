# Database Persistence Fixes - localStorage to Database Migration

## Summary
Fixed 4 categories of data that were only being saved to localStorage (which would be lost on page refresh) by implementing proper database persistence.

## 📋 **Fixed Categories:**

### 1. **Theme Preferences** 
- **Before**: Stored in `localStorage.getItem('theme')`
- **After**: Stored in `user_preferences` table with type 'theme'
- **Impact**: Theme settings now persist across sessions and devices

### 2. **Column Visibility Settings**
- **Before**: Stored as `localStorage.getItem('columnVisibility_tableName')`
- **After**: Stored in `user_preferences` table with type 'column_visibility'
- **Impact**: Table column preferences now persist across sessions

### 3. **Onboarding Progress**
- **Before**: Stored in `localStorage.getItem('onboardingProgress')`
- **After**: Stored in `user_preferences` table with type 'onboarding_progress'
- **Impact**: User onboarding progress now persists across sessions

### 4. **Custom Widgets**
- **Before**: Stored in `localStorage.getItem('customWidgets')`
- **After**: Stored in dedicated `custom_widgets` table
- **Impact**: Custom dashboard widgets now persist and can be shared

## 🛠 **Technical Implementation:**

### Database Schema Changes:
```sql
-- New tables added to shared/schema.ts:

-- Custom widgets table
CREATE TABLE custom_widgets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  plugin_name TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  query_type TEXT NOT NULL DEFAULT 'default',
  -- ... other widget configuration fields
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User preferences table
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  preference_type TEXT NOT NULL, -- 'theme', 'column_visibility', etc.
  preference_key TEXT NOT NULL,   -- specific key within type
  preference_value JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, preference_type, preference_key)
);
```

### API Endpoints Added:
```typescript
// Custom Widgets
GET    /api/user/widgets              // Get user's widgets
POST   /api/user/widgets              // Create widget
PUT    /api/user/widgets/:id          // Update widget
DELETE /api/user/widgets/:id          // Delete widget

// User Preferences  
GET    /api/user/preferences/:type    // Get preferences by type
PUT    /api/user/preferences/:type/:key // Set preference
DELETE /api/user/preferences/:type/:key // Delete preference
```

### Client-Side Utility Library:
- **File**: `client/src/lib/user-preferences.ts`
- **Features**:
  - Automatic localStorage migration to database
  - Convenience functions for common preferences
  - Error handling with localStorage fallback
  - TypeScript interfaces for type safety

### Updated Components:
1. **Client Onboarding Page** (`client/src/pages/client-onboarding-page.tsx`)
   - Replaced localStorage calls with database API
   - Progress now persists across sessions

2. **Widget Management Panel** (`client/src/components/widgets/widget-management-panel.tsx`)
   - Full CRUD operations now use database
   - Widgets persist and can be shared between sessions

## 🔄 **Migration Strategy:**

The system includes automatic migration logic that:
1. Checks if migration has already been completed
2. Reads existing localStorage data
3. Saves it to the database via API
4. Removes localStorage entries
5. Marks migration as complete

```typescript
// Auto-migration on app initialization
export async function initializeUserPreferences(): Promise<void> {
  const migrationComplete = localStorage.getItem('preferencesMigrationComplete');
  
  if (!migrationComplete) {
    await migrateLocalStorageToDatabase();
    localStorage.setItem('preferencesMigrationComplete', 'true');
  }
}
```

## ✅ **Benefits:**

1. **Data Persistence**: User preferences survive browser clears, different devices
2. **Multi-Device Sync**: Settings sync across user's devices
3. **Backup & Recovery**: Preferences are backed up with database
4. **Admin Visibility**: Admins can see user preferences if needed
5. **Scalability**: Database storage scales better than localStorage
6. **Type Safety**: Full TypeScript support with proper interfaces

## 🧪 **Testing:**

To test the fixes:
1. **Before Migration**: Check localStorage in browser dev tools
2. **After Migration**: Preferences saved to database tables
3. **Persistence Test**: Refresh page, clear localStorage - settings remain
4. **Cross-Device**: Login from different browser/device - settings sync

## 📊 **Database Tables Created:**

- `custom_widgets`: 23 columns for full widget configuration
- `user_preferences`: 7 columns with JSONB for flexible preference storage
- Enhanced `user_settings`: Added theme field for UI preferences

## 🔧 **Storage Implementation:**

Added methods to `DatabaseStorage` class:
- `getUserCustomWidgets()`, `createCustomWidget()`, `updateCustomWidget()`, `deleteCustomWidget()`
- `getUserPreference()`, `setUserPreference()`, `deleteUserPreference()`

The fix ensures all user preferences and customizations now have proper database persistence instead of being lost on page refresh or browser storage clearing. 