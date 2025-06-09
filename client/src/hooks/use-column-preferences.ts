import { useState, useEffect, useCallback } from "react";
import { ColumnDefinition } from "@/components/ui/column-visibility";

export interface UseColumnPreferencesProps {
  storageKey: string;
  columns: ColumnDefinition[];
}

export function useColumnPreferences({ storageKey, columns }: UseColumnPreferencesProps) {
  // Initialize visible columns based on defaults
  const getDefaultVisibility = useCallback(() => {
    return columns.reduce((acc, column) => {
      acc[column.key] = column.defaultVisible;
      return acc;
    }, {} as Record<string, boolean>);
  }, [columns]);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    // Try to load from localStorage
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure all current columns are represented (for when new columns are added)
        const defaultVisibility = getDefaultVisibility();
        return { ...defaultVisibility, ...parsed };
      }
    } catch (error) {
      console.warn("Failed to load column preferences:", error);
    }
    
    return getDefaultVisibility();
  });

  // Save to localStorage whenever visibility changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
    } catch (error) {
      console.warn("Failed to save column preferences:", error);
    }
  }, [storageKey, visibleColumns]);

  const handleVisibilityChange = useCallback((columnKey: string, visible: boolean) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: visible
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    const defaultVisibility = getDefaultVisibility();
    setVisibleColumns(defaultVisibility);
  }, [getDefaultVisibility]);

  const isColumnVisible = useCallback((columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    return visibleColumns[columnKey] ?? column?.defaultVisible ?? false;
  }, [visibleColumns, columns]);

  return {
    visibleColumns,
    handleVisibilityChange,
    resetToDefaults,
    isColumnVisible
  };
} 