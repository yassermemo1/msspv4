import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { UserSettings } from '@shared/schema';
import { 
  currencyFormatter, 
  formatCurrency, 
  formatCurrencyCompact, 
  parseCurrency, 
  getCurrencySymbol,
  formatPercentage,
  SUPPORTED_CURRENCIES,
  type CurrencyConfig 
} from '@/lib/currency-formatter';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  format: (amount: number | string, options?: any) => string;
  formatCompact: (amount: number | string, options?: any) => string;
  parse: (value: string, currency?: string) => number;
  getSymbol: (currency?: string) => string;
  formatPercentage: (value: number, decimals?: number) => string;
  getSupportedCurrencies: () => CurrencyConfig[];
  getRevenueRanges: () => Array<{value: string, label: string}>;
  getCurrencyConfig: (currency?: string) => CurrencyConfig;
  isLoading: boolean;
}

interface CurrencyProviderProps {
  children: React.ReactNode;
  defaultCurrency?: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children, defaultCurrency = 'USD' }: CurrencyProviderProps) {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<string>(defaultCurrency);
  const [isLoading, setIsLoading] = useState(true);

  // Get user settings to determine currency preference
  const { data: userSettings, isLoading: settingsLoading } = useQuery<UserSettings>({
    queryKey: ['/api/user/settings'],
    enabled: !!user,
  });

  // Get company settings for default currency
  const { data: companySettings } = useQuery({
    queryKey: ['/api/company/settings'],
    enabled: !!user,
  });

  // Update user settings when currency changes
  const updateSettingsMutation = useMutation({
    mutationFn: async (newCurrency: string) => {
      const res = await apiRequest('PUT', '/api/user/settings', { 
        preferredCurrency: newCurrency 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/settings'] });
    },
  });

  // Initialize currency from various sources
  useEffect(() => {
    let initialCurrency = defaultCurrency;

    // Priority order: User settings > Company settings > Browser locale > Default
    if (userSettings?.preferredCurrency) {
      initialCurrency = userSettings.preferredCurrency;
    } else if (companySettings?.currency) {
      initialCurrency = companySettings.currency;
    } else {
      // Try to get from currency formatter's auto-detection
      initialCurrency = currencyFormatter.getCurrentCurrency();
    }

    if (SUPPORTED_CURRENCIES[initialCurrency]) {
      setCurrencyState(initialCurrency);
      currencyFormatter.setCurrency(initialCurrency);
    }

    setIsLoading(false);
  }, [userSettings, companySettings, defaultCurrency]);

  // Update loading state
  useEffect(() => {
    setIsLoading(settingsLoading);
  }, [settingsLoading]);

  const setCurrency = (newCurrency: string) => {
    if (!SUPPORTED_CURRENCIES[newCurrency]) {
      console.warn(`Unsupported currency: ${newCurrency}`);
      return;
    }

    setCurrencyState(newCurrency);
    currencyFormatter.setCurrency(newCurrency);
    
    // Update user settings if logged in
    if (user) {
      updateSettingsMutation.mutate(newCurrency);
    }
  };

  // Wrapper functions that use current currency context
  const format = (amount: number | string, options: any = {}) => {
    return formatCurrency(amount, { currency, ...options });
  };

  const formatCompact = (amount: number | string, options: any = {}) => {
    return formatCurrencyCompact(amount, { currency, ...options });
  };

  const parse = (value: string, targetCurrency?: string) => {
    return parseCurrency(value, targetCurrency || currency);
  };

  const getSymbol = (targetCurrency?: string) => {
    return getCurrencySymbol(targetCurrency || currency);
  };

  const getSupportedCurrencies = () => {
    return currencyFormatter.getSupportedCurrencies();
  };

  const getRevenueRanges = () => {
    return currencyFormatter.getRevenueRanges();
  };

  const getCurrencyConfig = (targetCurrency?: string) => {
    return currencyFormatter.getCurrencyConfig(targetCurrency || currency);
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      format,
      formatCompact,
      parse,
      getSymbol,
      formatPercentage,
      getSupportedCurrencies,
      getRevenueRanges,
      getCurrencyConfig,
      isLoading
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

// Legacy support - these can be used directly without context if needed
export const availableCurrencies = Object.values(SUPPORTED_CURRENCIES);

// Hook for getting currency formatting without full context
export function useCurrencyFormatter() {
  return {
    format: formatCurrency,
    formatCompact: formatCurrencyCompact,
    parse: parseCurrency,
    getSymbol: getCurrencySymbol,
    formatPercentage,
    getSupportedCurrencies: () => Object.values(SUPPORTED_CURRENCIES)
  };
} 