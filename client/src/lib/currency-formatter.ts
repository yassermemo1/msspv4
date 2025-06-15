import { environmentConfig } from '../../../server/lib/environment-config';
import { toast } from "sonner";
import { getExchangeRates } from './currency-api';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  symbolPosition: 'before' | 'after';
  thousandsSeparator: string;
  decimalSeparator: string;
  locale?: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'en-US'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    symbolPosition: 'after',
    thousandsSeparator: '.',
    decimalSeparator: ',',
    locale: 'de-DE'
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimals: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'en-GB'
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    decimals: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'en-CA'
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    decimals: 0,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'ja-JP'
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    decimals: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'en-AU'
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    name: 'Swiss Franc',
    decimals: 2,
    symbolPosition: 'after',
    thousandsSeparator: "'",
    decimalSeparator: '.',
    locale: 'de-CH'
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    decimals: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'zh-CN'
  },
  SAR: {
    code: 'SAR',
    symbol: 'ر.س',
    name: 'Saudi Riyal',
    decimals: 2,
    symbolPosition: 'after',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'ar-SA'
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    decimals: 2,
    symbolPosition: 'after',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'ar-AE'
  }
};

export class CurrencyFormatter {
  private static instance: CurrencyFormatter;
  private currentCurrency: string = 'USD';
  private userLocale: string = 'en-US';

  static getInstance(): CurrencyFormatter {
    if (!CurrencyFormatter.instance) {
      CurrencyFormatter.instance = new CurrencyFormatter();
    }
    return CurrencyFormatter.instance;
  }

  constructor() {
    // Try to get user's locale from browser
    this.userLocale = typeof window !== 'undefined' ? (navigator.language || 'en-US') : 'en-US';
    
    // Set default currency from environment or user preferences
    this.currentCurrency = this.getDefaultCurrency();
  }

  private getDefaultCurrency(): string {
    // Try to get from local storage first
    if(typeof window !== 'undefined') {
      const stored = localStorage.getItem('currency');
      if (stored && SUPPORTED_CURRENCIES[stored]) {
        return stored;
      }
    }

    // Try to detect from user locale
    const locale = this.userLocale;
    if (locale.includes('en-US') || locale.includes('en-CA')) return 'USD';
    if (locale.includes('en-GB')) return 'GBP';
    if (locale.includes('de') || locale.includes('fr') || locale.includes('it')) return 'EUR';
    if (locale.includes('ja')) return 'JPY';
    if (locale.includes('au')) return 'AUD';
    if (locale.includes('ch')) return 'CHF';
    if (locale.includes('cn')) return 'CNY';
    if (locale.includes('sa')) return 'SAR';
    if (locale.includes('ae')) return 'AED';

    return 'USD'; // Default fallback
  }

  /**
   * Set the current currency
   */
  setCurrency(currencyCode: string): void {
    if (SUPPORTED_CURRENCIES[currencyCode]) {
      this.currentCurrency = currencyCode;
      if(typeof window !== 'undefined') {
        localStorage.setItem('currency', currencyCode);
      }
    } else {
      console.warn(`Unsupported currency: ${currencyCode}`);
    }
  }

  /**
   * Get the current currency
   */
  getCurrentCurrency(): string {
    return this.currentCurrency;
  }

  /**
   * Get currency configuration
   */
  getCurrencyConfig(currencyCode?: string): CurrencyConfig {
    const code = currencyCode || this.currentCurrency;
    return SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES['USD'];
  }

  /**
   * Format amount with current currency
   */
  format(amount: number | string, options: {
    currency?: string;
    showSymbol?: boolean;
    showCode?: boolean;
    decimals?: number;
    useGrouping?: boolean;
  } = {}): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '0';

    const {
      currency = this.currentCurrency,
      showSymbol = true,
      showCode = false,
      decimals,
      useGrouping = true
    } = options;

    const config = this.getCurrencyConfig(currency);
    const finalDecimals = decimals !== undefined ? decimals : config.decimals;

    // Use Intl.NumberFormat for proper localization
    const formatter = new Intl.NumberFormat(config.locale || this.userLocale, {
      style: 'decimal',
      minimumFractionDigits: finalDecimals,
      maximumFractionDigits: finalDecimals,
      useGrouping
    });

    const formatted = formatter.format(numAmount);

    // Add currency symbol/code
    let result = formatted;
    if (showSymbol) {
      result = config.symbolPosition === 'before' 
        ? `${config.symbol}${formatted}`
        : `${formatted} ${config.symbol}`;
    }

    if (showCode) {
      result = showSymbol ? `${result} (${config.code})` : `${result} ${config.code}`;
    }

    return result;
  }

  /**
   * Format compact currency (1.2K, 1.5M, etc.)
   */
  formatCompact(amount: number | string, options: {
    currency?: string;
    showSymbol?: boolean;
    showCode?: boolean;
  } = {}): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '0';

    const {
      currency = this.currentCurrency,
      showSymbol = true,
      showCode = false
    } = options;

    const config = this.getCurrencyConfig(currency);

    // Use Intl.NumberFormat for compact notation
    const formatter = new Intl.NumberFormat(config.locale || this.userLocale, {
      notation: 'compact',
      compactDisplay: 'short',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });

    const formatted = formatter.format(numAmount);
    
    let result = formatted;
    if (showSymbol) {
      result = config.symbolPosition === 'before' 
        ? `${config.symbol}${formatted}` 
        : `${formatted} ${config.symbol}`;
    }

    if(showCode){
      result = `${result} (${config.code})`;
    }

    return result;
  }

  /**
   * Parse a formatted currency string into a number
   */
  parse(value: string, currency?: string): number {
    const config = this.getCurrencyConfig(currency);
    
    // Remove symbols, separators, and non-numeric characters
    const sanitized = value
      .replace(config.symbol, '')
      .replace(new RegExp(`\\${config.thousandsSeparator}`, 'g'), '')
      .replace(config.decimalSeparator, '.')
      .trim();
      
    return parseFloat(sanitized) || 0;
  }

  /**
   * Get currency symbol
   */
  getSymbol(currency?: string): string {
    const config = this.getCurrencyConfig(currency);
    return config.symbol;
  }

  /**
   * Get a list of supported currencies
   */
  getSupportedCurrencies(): CurrencyConfig[] {
    return Object.values(SUPPORTED_CURRENCIES);
  }
  
  /**
   * Get predefined revenue ranges for filtering/display
   */
  getRevenueRanges(): Array<{value: string, label: string}> {
    const ranges = [
      { value: '0-1000', label: this.format(0) + ' - ' + this.format(1000, { showSymbol: false }) },
      { value: '1000-10000', label: this.format(1000) + ' - ' + this.format(10000, { showSymbol: false }) },
      { value: '10000-50000', label: this.format(10000) + ' - ' + this.format(50000, { showSymbol: false }) },
      { value: '50000-250000', label: this.format(50000) + ' - ' + this.format(250000, { showSymbol: false }) },
      { value: '250000+', label: this.format(250000) + '+' }
    ];
    return ranges;
  }

  private mockConversion(amount: number, fromCurrency: string, toCurrency: string): number {
    // This is a placeholder. In a real scenario, you might have some default or stale rates.
    console.warn(`Performing mock conversion from ${fromCurrency} to ${toCurrency}. This is not accurate.`);
    const mockRates: { [key: string]: number } = {
      'USD_EUR': 0.92,
      'EUR_USD': 1.08,
      'USD_GBP': 0.79,
      'GBP_USD': 1.27,
    };
    const rate = mockRates[`${fromCurrency}_${toCurrency}`] || 1;
    return amount * rate;
  }

  /**
   * Convert between currencies using real-time exchange rates
   */
  async convert(amount: number, fromCurrency: string, toCurrency: string, exchangeRate?: number): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // If an explicit exchange rate is provided, use it.
    if (exchangeRate) {
      return amount * exchangeRate;
    }
    
    try {
      const rates = await getExchangeRates(fromCurrency);
      const rate = rates[toCurrency];
      
      if (rate) {
        return amount * rate;
      } else {
        toast.error(`Real-time exchange rate not available for ${fromCurrency} to ${toCurrency}.`);
        return this.mockConversion(amount, fromCurrency, toCurrency);
      }
    } catch (error) {
      console.error("Failed to fetch real-time exchange rates. Falling back to mock conversion.", error);
      toast.error("Using mock conversion rate due to API failure.");
      return this.mockConversion(amount, fromCurrency, toCurrency);
    }
  }

  /**
   * Format a number as a percentage
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * Format a number for an input field, ensuring it's a plain number string
   */
  formatForInput(amount: number | string, currency?: string): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '';
    
    const config = this.getCurrencyConfig(currency);
    return numAmount.toFixed(config.decimals);
  }
}

export const currencyFormatter = CurrencyFormatter.getInstance();

export const formatCurrency = (amount: number | string, options?: any) => 
  currencyFormatter.format(amount, options);

export const formatCurrencyCompact = (amount: number | string, options?: any) => 
  currencyFormatter.formatCompact(amount, options);

export const parseCurrency = (value: string, currency?: string) => 
  currencyFormatter.parse(value, currency);

export const getCurrencySymbol = (currency?: string) => 
  currencyFormatter.getSymbol(currency);

export const formatPercentage = (value: number, decimals?: number) =>
  currencyFormatter.formatPercentage(value, decimals);

export const getRevenueRanges = () => 
  currencyFormatter.getRevenueRanges();

export const getSupportedCurrencies = () => 
  currencyFormatter.getSupportedCurrencies();

export const formatForInput = (amount: number | string, currency?: string) => 
  currencyFormatter.formatForInput(amount, currency);

export const convertCurrency = async (amount: number, fromCurrency: string, toCurrency: string, exchangeRate?: number) => 
  currencyFormatter.convert(amount, fromCurrency, toCurrency, exchangeRate);

export const mockConversion = (amount: number, fromCurrency: string, toCurrency: string) => 
  currencyFormatter.mockConversion(amount, fromCurrency, toCurrency); 