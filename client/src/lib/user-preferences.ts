// User Preferences API - Replaces localStorage with database persistence

export interface UserPreference {
  id: number;
  userId: number;
  preferenceType: string;
  preferenceKey: string;
  preferenceValue: any;
  createdAt: string;
  updatedAt: string;
}

export interface CustomWidget {
  id: number;
  userId: number;
  name: string;
  description?: string;
  pluginName: string;
  instanceId: string;
  queryType: string;
  queryId?: string;
  customQuery?: string;
  queryMethod: string;
  queryParameters: Record<string, any>;
  displayType: string;
  chartType?: string;
  refreshInterval: number;
  placement: string;
  styling: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Preference Types
export const PREFERENCE_TYPES = {
  THEME: 'theme',
  COLUMN_VISIBILITY: 'column_visibility',
  ONBOARDING_PROGRESS: 'onboarding_progress',
  WIDGET_LAYOUT: 'widget_layout',
  FORM_SETTINGS: 'form_settings'
} as const;

// Base API functions
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

// ========================================
// USER PREFERENCES API
// ========================================

export async function getUserPreferences(type: string, key?: string): Promise<UserPreference[]> {
  const url = key 
    ? `/api/user/preferences/${type}?key=${encodeURIComponent(key)}`
    : `/api/user/preferences/${type}`;
  return apiRequest(url);
}

export async function setUserPreference(type: string, key: string, value: any): Promise<UserPreference> {
  return apiRequest(`/api/user/preferences/${type}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

export async function deleteUserPreference(type: string, key?: string): Promise<void> {
  const url = key 
    ? `/api/user/preferences/${type}/${encodeURIComponent(key)}`
    : `/api/user/preferences/${type}`;
  return apiRequest(url, { method: 'DELETE' });
}

// ========================================
// CUSTOM WIDGETS API
// ========================================

export async function getUserCustomWidgets(placement?: string): Promise<CustomWidget[]> {
  const url = placement 
    ? `/api/user/widgets?placement=${encodeURIComponent(placement)}`
    : '/api/user/widgets';
  return apiRequest(url);
}

export async function createCustomWidget(widget: Omit<CustomWidget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<CustomWidget> {
  return apiRequest('/api/user/widgets', {
    method: 'POST',
    body: JSON.stringify(widget),
  });
}

export async function updateCustomWidget(id: number, widget: Partial<CustomWidget>): Promise<CustomWidget> {
  return apiRequest(`/api/user/widgets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(widget),
  });
}

export async function deleteCustomWidget(id: number): Promise<void> {
  return apiRequest(`/api/user/widgets/${id}`, { method: 'DELETE' });
}

// ========================================
// CONVENIENCE FUNCTIONS FOR SPECIFIC USE CASES
// ========================================

// Theme preferences
export async function getThemePreference(): Promise<string> {
  try {
    const prefs = await getUserPreferences(PREFERENCE_TYPES.THEME, 'current');
    return prefs[0]?.preferenceValue || 'light';
  } catch (error) {
    console.warn('Failed to load theme preference, using default:', error);
    return 'light';
  }
}

export async function setThemePreference(theme: string): Promise<void> {
  await setUserPreference(PREFERENCE_TYPES.THEME, 'current', theme);
}

// Column visibility preferences
export async function getColumnVisibility(tableName: string): Promise<Record<string, boolean>> {
  try {
    const prefs = await getUserPreferences(PREFERENCE_TYPES.COLUMN_VISIBILITY, tableName);
    return prefs[0]?.preferenceValue || {};
  } catch (error) {
    console.warn('Failed to load column visibility, using defaults:', error);
    return {};
  }
}

export async function setColumnVisibility(tableName: string, visibility: Record<string, boolean>): Promise<void> {
  await setUserPreference(PREFERENCE_TYPES.COLUMN_VISIBILITY, tableName, visibility);
}

// Onboarding progress
export async function getOnboardingProgress(): Promise<{ currentStep?: number; completedSteps?: string[] }> {
  try {
    const prefs = await getUserPreferences(PREFERENCE_TYPES.ONBOARDING_PROGRESS, 'progress_data');
    return prefs[0]?.preferenceValue || {};
  } catch (error) {
    console.warn('Failed to load onboarding progress, using defaults:', error);
    return {};
  }
}

export async function setOnboardingProgress(progress: { currentStep?: number; completedSteps?: string[] }): Promise<void> {
  await setUserPreference(PREFERENCE_TYPES.ONBOARDING_PROGRESS, 'progress_data', progress);
}

// Legacy function for step completion tracking
export async function getOnboardingSteps(): Promise<Record<string, boolean>> {
  try {
    const prefs = await getUserPreferences(PREFERENCE_TYPES.ONBOARDING_PROGRESS, 'completed_steps');
    return prefs[0]?.preferenceValue || {};
  } catch (error) {
    console.warn('Failed to load onboarding steps, using defaults:', error);
    return {};
  }
}

export async function markOnboardingStepComplete(step: string): Promise<void> {
  const currentSteps = await getOnboardingSteps();
  currentSteps[step] = true;
  await setUserPreference(PREFERENCE_TYPES.ONBOARDING_PROGRESS, 'completed_steps', currentSteps);
}

// Widget layout preferences
export async function getWidgetLayout(placement: string): Promise<any[]> {
  try {
    const prefs = await getUserPreferences(PREFERENCE_TYPES.WIDGET_LAYOUT, placement);
    return prefs[0]?.preferenceValue || [];
  } catch (error) {
    console.warn('Failed to load widget layout, using defaults:', error);
    return [];
  }
}

export async function setWidgetLayout(placement: string, layout: any[]): Promise<void> {
  await setUserPreference(PREFERENCE_TYPES.WIDGET_LAYOUT, placement, layout);
}

// ========================================
// MIGRATION HELPERS - for converting localStorage to database
// ========================================

export async function migrateLocalStorageToDatabase(): Promise<void> {
  try {
    console.log('🔄 Starting localStorage to database migration...');

    // Migrate theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      await setThemePreference(savedTheme);
      localStorage.removeItem('theme');
      console.log('✅ Migrated theme preference');
    }

    // Migrate onboarding progress
    const onboardingProgress = localStorage.getItem('onboardingProgress');
    if (onboardingProgress) {
      try {
        const progress = JSON.parse(onboardingProgress);
        await setOnboardingProgress(progress);
        localStorage.removeItem('onboardingProgress');
        console.log('✅ Migrated onboarding progress');
      } catch (e) {
        console.warn('Failed to migrate onboarding progress:', e);
      }
    }

    // Migrate column visibility preferences
    const columnVisibilityKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('columnVisibility_')
    );
    
    for (const key of columnVisibilityKeys) {
      try {
        const tableName = key.replace('columnVisibility_', '');
        const visibility = JSON.parse(localStorage.getItem(key) || '{}');
        await setColumnVisibility(tableName, visibility);
        localStorage.removeItem(key);
        console.log(`✅ Migrated column visibility for ${tableName}`);
      } catch (e) {
        console.warn(`Failed to migrate column visibility for ${key}:`, e);
      }
    }

    // Migrate custom widgets (if any were stored in localStorage)
    const customWidgets = localStorage.getItem('customWidgets');
    if (customWidgets) {
      try {
        const widgets = JSON.parse(customWidgets);
        for (const widget of widgets) {
          await createCustomWidget(widget);
        }
        localStorage.removeItem('customWidgets');
        console.log('✅ Migrated custom widgets');
      } catch (e) {
        console.warn('Failed to migrate custom widgets:', e);
      }
    }

    console.log('✅ localStorage migration completed');
  } catch (error) {
    console.error('❌ localStorage migration failed:', error);
    throw error;
  }
}

// Auto-migration on page load
export async function initializeUserPreferences(): Promise<void> {
  // Check if migration has already been done
  const migrationComplete = localStorage.getItem('preferencesMigrationComplete');
  
  if (!migrationComplete) {
    try {
      await migrateLocalStorageToDatabase();
      localStorage.setItem('preferencesMigrationComplete', 'true');
    } catch (error) {
      console.error('Failed to migrate preferences:', error);
      // Don't block the app if migration fails
    }
  }
} 