export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  locale: string;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
    locale: 'en-US',
  },
  SAR: {
    code: 'SAR',
    symbol: 'ر.س',
    name: 'Saudi Riyal',
    decimals: 2,
    locale: 'ar-SA',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    locale: 'de-DE',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimals: 2,
    locale: 'en-GB',
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    decimals: 2,
    locale: 'ar-AE',
  },
};

export function formatCurrency(
  amount: number | string,
  currencyCode: string = 'USD',
  options: {
    showSymbol?: boolean;
    showCode?: boolean;
    decimals?: number;
  } = {}
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return '0';
  }

  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const { showSymbol = true, showCode = false, decimals = currency.decimals } = options;

  // Format the number with proper locale
  const formattedNumber = new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numericAmount);

  // Build the final string
  let result = formattedNumber;

  if (showSymbol && showCode) {
    result = `${currency.symbol} ${result} ${currency.code}`;
  } else if (showSymbol) {
    // For Arabic currencies, put symbol after the number
    if (currencyCode === 'SAR' || currencyCode === 'AED') {
      result = `${result} ${currency.symbol}`;
    } else {
      result = `${currency.symbol}${result}`;
    }
  } else if (showCode) {
    result = `${result} ${currency.code}`;
  }

  return result;
}

export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCIES[currencyCode]?.symbol || '$';
}

export function getCurrencyName(currencyCode: string): string {
  return CURRENCIES[currencyCode]?.name || 'US Dollar';
}

export function getAllCurrencies(): CurrencyConfig[] {
  return Object.values(CURRENCIES);
}

// Simple conversion rates (in a real app, you'd fetch these from an API)
export const EXCHANGE_RATES: Record<string, Record<string, number>> = {
  USD: {
    USD: 1,
    SAR: 3.75,
    EUR: 0.85,
    GBP: 0.73,
    AED: 3.67,
  },
  SAR: {
    USD: 0.27,
    SAR: 1,
    EUR: 0.23,
    GBP: 0.19,
    AED: 0.98,
  },
  EUR: {
    USD: 1.18,
    SAR: 4.41,
    EUR: 1,
    GBP: 0.86,
    AED: 4.32,
  },
  GBP: {
    USD: 1.37,
    SAR: 5.14,
    EUR: 1.16,
    GBP: 1,
    AED: 5.03,
  },
  AED: {
    USD: 0.27,
    SAR: 1.02,
    EUR: 0.23,
    GBP: 0.20,
    AED: 1,
  },
};

export function convertCurrency(
  amount: number | string,
  fromCurrency: string,
  toCurrency: string
): number {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount) || fromCurrency === toCurrency) {
    return numericAmount;
  }

  const rate = EXCHANGE_RATES[fromCurrency]?.[toCurrency];
  if (!rate) {
    console.warn(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    return numericAmount;
  }

  return numericAmount * rate;
} 