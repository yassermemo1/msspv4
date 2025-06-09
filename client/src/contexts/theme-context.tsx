import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { UserSettings } from '@shared/schema';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, defaultTheme = 'light', storageKey = 'theme' }: ThemeProviderProps) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  // Get user settings to determine theme preference
  const { data: userSettings } = useQuery<UserSettings>({
    queryKey: ['/api/user/settings'],
    enabled: !!user,
  });

  // Update user settings when theme changes
  const updateSettingsMutation = useMutation({
    mutationFn: async (darkMode: boolean) => {
      const res = await apiRequest('PUT', '/api/user/settings', { darkMode });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/settings'] });
    },
  });

  // Apply theme to DOM
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Store in localStorage if storageKey is provided
    if (storageKey) {
      localStorage.setItem(storageKey, theme);
    }
  }, [theme, storageKey]);

  // Initialize theme from user settings or localStorage
  useEffect(() => {
    if (userSettings) {
      const initialTheme = userSettings.darkMode ? 'dark' : 'light';
      setThemeState(initialTheme);
    } else if (storageKey) {
      // Fallback to localStorage if no user settings
      const stored = localStorage.getItem(storageKey) as Theme;
      if (stored && (stored === 'light' || stored === 'dark')) {
        setThemeState(stored);
      }
    }
  }, [userSettings, storageKey]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (user) {
      updateSettingsMutation.mutate(newTheme === 'dark');
    } else if (storageKey) {
      localStorage.setItem(storageKey, newTheme);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 