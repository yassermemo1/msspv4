export interface ThemeColors {
  // Primary brand colors
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
  
  // Secondary colors
  secondary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };

  // Semantic colors
  success: {
    50: string;
    100: string;
    500: string;
    600: string;
    700: string;
  };
  
  warning: {
    50: string;
    100: string;
    500: string;
    600: string;
    700: string;
  };
  
  error: {
    50: string;
    100: string;
    500: string;
    600: string;
    700: string;
  };
  
  info: {
    50: string;
    100: string;
    500: string;
    600: string;
    700: string;
  };

  // Neutral colors
  gray: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  mode: 'light' | 'dark';
  colors: ThemeColors;
  
  // Additional theme properties
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// Default Light Theme
export const defaultLightTheme: ThemeDefinition = {
  id: 'default-light',
  name: 'Default Light',
  description: 'Clean and professional light theme',
  mode: 'light',
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe', 
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    },
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617'
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d'
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309'
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c'
    },
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8'
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712'
    }
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem'
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem'
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  }
};

// Default Dark Theme
export const defaultDarkTheme: ThemeDefinition = {
  ...defaultLightTheme,
  id: 'default-dark',
  name: 'Default Dark',
  description: 'Professional dark theme for reduced eye strain',
  mode: 'dark',
  colors: {
    ...defaultLightTheme.colors,
    // Invert some colors for dark mode
    primary: {
      50: '#172554',
      100: '#1e3a8a',
      200: '#1e40af',
      300: '#1d4ed8',
      400: '#2563eb',
      500: '#3b82f6',
      600: '#60a5fa',
      700: '#93c5fd',
      800: '#bfdbfe',
      900: '#dbeafe',
      950: '#eff6ff'
    },
    gray: {
      50: '#030712',
      100: '#111827',
      200: '#1f2937',
      300: '#374151',
      400: '#4b5563',
      500: '#6b7280',
      600: '#9ca3af',
      700: '#d1d5db',
      800: '#e5e7eb',
      900: '#f3f4f6',
      950: '#f9fafb'
    }
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)'
  }
};

// Additional predefined themes
export const corporateBlueTheme: ThemeDefinition = {
  ...defaultLightTheme,
  id: 'corporate-blue',
  name: 'Corporate Blue',
  description: 'Professional blue theme for corporate environments',
  colors: {
    ...defaultLightTheme.colors,
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49'
    }
  }
};

export const greenEcoTheme: ThemeDefinition = {
  ...defaultLightTheme,
  id: 'green-eco',
  name: 'Green Eco',
  description: 'Nature-inspired green theme',
  colors: {
    ...defaultLightTheme.colors,
    primary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16'
    }
  }
};

export const purpleCreativeTheme: ThemeDefinition = {
  ...defaultLightTheme,
  id: 'purple-creative',
  name: 'Purple Creative',
  description: 'Creative purple theme for modern applications',
  colors: {
    ...defaultLightTheme.colors,
    primary: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87',
      950: '#3b0764'
    }
  }
};

// Theme registry
export const AVAILABLE_THEMES: Record<string, ThemeDefinition> = {
  'default-light': defaultLightTheme,
  'default-dark': defaultDarkTheme,
  'corporate-blue': corporateBlueTheme,
  'green-eco': greenEcoTheme,
  'purple-creative': purpleCreativeTheme
};

export class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: ThemeDefinition = defaultLightTheme;
  private listeners: Array<(theme: ThemeDefinition) => void> = [];

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  constructor() {
    this.loadThemeFromStorage();
    this.detectSystemTheme();
  }

  private loadThemeFromStorage(): void {
    const stored = localStorage.getItem('theme');
    if (stored && AVAILABLE_THEMES[stored]) {
      this.currentTheme = AVAILABLE_THEMES[stored];
    }
  }

  private detectSystemTheme(): void {
    if (!localStorage.getItem('theme')) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.currentTheme = prefersDark ? defaultDarkTheme : defaultLightTheme;
    }
  }

  setTheme(themeId: string): void {
    if (AVAILABLE_THEMES[themeId]) {
      this.currentTheme = AVAILABLE_THEMES[themeId];
      localStorage.setItem('theme', themeId);
      this.applyThemeToDOM();
      this.notifyListeners();
    }
  }

  getCurrentTheme(): ThemeDefinition {
    return this.currentTheme;
  }

  getAvailableThemes(): ThemeDefinition[] {
    return Object.values(AVAILABLE_THEMES);
  }

  addTheme(theme: ThemeDefinition): void {
    AVAILABLE_THEMES[theme.id] = theme;
  }

  removeTheme(themeId: string): void {
    if (themeId !== 'default-light' && themeId !== 'default-dark') {
      delete AVAILABLE_THEMES[themeId];
    }
  }

  onThemeChange(callback: (theme: ThemeDefinition) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentTheme));
  }

  private applyThemeToDOM(): void {
    const root = document.documentElement;
    const theme = this.currentTheme;

    // Apply CSS custom properties
    Object.entries(theme.colors.primary).forEach(([key, value]) => {
      root.style.setProperty(`--color-primary-${key}`, value);
    });

    Object.entries(theme.colors.secondary).forEach(([key, value]) => {
      root.style.setProperty(`--color-secondary-${key}`, value);
    });

    Object.entries(theme.colors.gray).forEach(([key, value]) => {
      root.style.setProperty(`--color-gray-${key}`, value);
    });

    // Apply semantic colors
    Object.entries(theme.colors.success).forEach(([key, value]) => {
      root.style.setProperty(`--color-success-${key}`, value);
    });

    Object.entries(theme.colors.warning).forEach(([key, value]) => {
      root.style.setProperty(`--color-warning-${key}`, value);
    });

    Object.entries(theme.colors.error).forEach(([key, value]) => {
      root.style.setProperty(`--color-error-${key}`, value);
    });

    Object.entries(theme.colors.info).forEach(([key, value]) => {
      root.style.setProperty(`--color-info-${key}`, value);
    });

    // Apply other properties
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--border-radius-${key}`, value);
    });

    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });

    Object.entries(theme.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });

    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });

    // Apply dark/light mode class
    root.classList.remove('light', 'dark');
    root.classList.add(theme.mode);
  }

  generateCustomTheme(baseTheme: ThemeDefinition, customizations: Partial<ThemeDefinition>): ThemeDefinition {
    return {
      ...baseTheme,
      ...customizations,
      colors: {
        ...baseTheme.colors,
        ...customizations.colors
      }
    };
  }

  exportTheme(themeId: string): string {
    const theme = AVAILABLE_THEMES[themeId];
    if (theme) {
      return JSON.stringify(theme, null, 2);
    }
    throw new Error(`Theme ${themeId} not found`);
  }

  importTheme(themeJson: string): void {
    try {
      const theme: ThemeDefinition = JSON.parse(themeJson);
      if (this.validateTheme(theme)) {
        this.addTheme(theme);
      } else {
        throw new Error('Invalid theme format');
      }
    } catch (error) {
      throw new Error(`Failed to import theme: ${error}`);
    }
  }

  private validateTheme(theme: any): theme is ThemeDefinition {
    return (
      typeof theme.id === 'string' &&
      typeof theme.name === 'string' &&
      typeof theme.mode === 'string' &&
      (theme.mode === 'light' || theme.mode === 'dark') &&
      typeof theme.colors === 'object'
    );
  }
}

export const themeManager = ThemeManager.getInstance(); 