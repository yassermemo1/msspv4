import { useState, useEffect } from 'react';

interface FieldVisibilityConfig {
  [fieldName: string]: boolean;
}

interface UseFieldVisibilityReturn {
  isFieldVisible: (fieldName: string) => boolean;
  setFieldVisibility: (fieldName: string, isVisible: boolean) => Promise<void>;
  resetFieldVisibility: (fieldName: string) => Promise<void>;
  fieldVisibilityConfig: FieldVisibilityConfig;
  loading: boolean;
  error: string | null;
}

export function useFieldVisibility(tableName: string, context: string = 'form'): UseFieldVisibilityReturn {
  const [fieldVisibilityConfig, setFieldVisibilityConfig] = useState<FieldVisibilityConfig>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load field visibility configuration
  useEffect(() => {
    const loadFieldVisibility = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/field-visibility/${tableName}?context=${context}`);
        if (!response.ok) {
          throw new Error('Failed to load field visibility configuration');
        }
        const config = await response.json();
        setFieldVisibilityConfig(config);
        setError(null);
      } catch (err) {
        console.error('Error loading field visibility:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (tableName) {
      loadFieldVisibility();
    }
  }, [tableName, context]);

  // Check if a field is visible (default to true if not configured)
  const isFieldVisible = (fieldName: string): boolean => {
    return fieldVisibilityConfig[fieldName] !== false;
  };

  // Set field visibility
  const setFieldVisibility = async (fieldName: string, isVisible: boolean): Promise<void> => {
    try {
      const response = await fetch('/api/field-visibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableName,
          fieldName,
          isVisible,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update field visibility');
      }

      // Update local state
      setFieldVisibilityConfig(prev => ({
        ...prev,
        [fieldName]: isVisible,
      }));

      setError(null);
    } catch (err) {
      console.error('Error updating field visibility:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  // Reset field visibility (remove configuration, back to default visible)
  const resetFieldVisibility = async (fieldName: string): Promise<void> => {
    try {
      const response = await fetch(`/api/field-visibility/${tableName}/${fieldName}?context=${context}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to reset field visibility');
      }

      // Update local state (remove the field configuration)
      setFieldVisibilityConfig(prev => {
        const newConfig = { ...prev };
        delete newConfig[fieldName];
        return newConfig;
      });

      setError(null);
    } catch (err) {
      console.error('Error resetting field visibility:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  return {
    isFieldVisible,
    setFieldVisibility,
    resetFieldVisibility,
    fieldVisibilityConfig,
    loading,
    error,
  };
} 