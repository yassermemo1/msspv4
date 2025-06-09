import { environmentConfig } from '../../../server/lib/environment-config';

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
    this.userLocale = navigator.language || 'en-US';
    
    // Set default currency from environment or user preferences
    this.currentCurrency = this.getDefaultCurrency();
  }

  private getDefaultCurrency(): string {
    // Try to get from local storage first
    const stored = localStorage.getItem('currency');
    if (stored && SUPPORTED_CURRENCIES[stored]) {
      return stored;
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
      localStorage.setItem('currency', currencyCode);
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

    // Use Intl.NumberFormat with compact notation
    const formatter = new Intl.NumberFormat(config.locale || this.userLocale, {
      style: 'decimal',
      notation: 'compact',
      compactDisplay: 'short'
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
   * Parse currency string back to number
   */
  parse(value: string, currency?: string): number {
    const config = this.getCurrencyConfig(currency);
    
    // Remove currency symbols and codes
    let cleaned = value
      .replace(new RegExp(config.symbol, 'g'), '')
      .replace(new RegExp(config.code, 'g'), '')
      .replace(/[()]/g, '')
      .trim();

    // Handle different decimal separators
    if (config.decimalSeparator === ',') {
      // European style: 1.234,56
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      
      if (lastComma > lastDot) {
        // Comma is decimal separator
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // Dot is decimal separator, remove commas
        cleaned = cleaned.replace(/,/g, '');
      }
    } else {
      // US style: 1,234.56 - remove commas
      cleaned = cleaned.replace(/,/g, '');
    }

    return parseFloat(cleaned) || 0;
  }

  /**
   * Get currency symbol only
   */
  getSymbol(currency?: string): string {
    return this.getCurrencyConfig(currency).symbol;
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): CurrencyConfig[] {
    return Object.values(SUPPORTED_CURRENCIES);
  }

  /**
   * Create revenue range options for the current currency
   */
  getRevenueRanges(): Array<{value: string, label: string}> {
    const symbol = this.getSymbol();
    return [
      { value: '0-10000', label: `${symbol}0 - ${this.formatCompact(10000)}` },
      { value: '10000-50000', label: `${this.formatCompact(10000)} - ${this.formatCompact(50000)}` },
      { value: '50000-100000', label: `${this.formatCompact(50000)} - ${this.formatCompact(100000)}` },
      { value: '100000-500000', label: `${this.formatCompact(100000)} - ${this.formatCompact(500000)}` },
      { value: '500000-1000000', label: `${this.formatCompact(500000)} - ${this.formatCompact(1000000)}` },
      { value: '1000000+', label: `${this.formatCompact(1000000)}+` }
    ];
  }

  /**
   * Convert between currencies (if rates are available)
   */
  convert(amount: number, fromCurrency: string, toCurrency: string, exchangeRate?: number): number {
    if (fromCurrency === toCurrency) return amount;
    
    // If exchange rate is provided, use it
    if (exchangeRate) {
      return amount * exchangeRate;
    }

    // TODO: Integrate with real-time exchange rate API
    console.warn('Currency conversion requires exchange rate data');
    return amount;
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number, decimals: number = 1): string {
    const formatter = new Intl.NumberFormat(this.userLocale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return formatter.format(value / 100);
  }

  /**
   * Format for input fields (without symbol)
   */
  formatForInput(amount: number | string, currency?: string): string {
    return this.format(amount, { 
      currency, 
      showSymbol: false, 
      showCode: false,
      useGrouping: false 
    });
  }
}

// Global formatter instance
export const currencyFormatter = CurrencyFormatter.getInstance();

// Utility functions for easy use in components
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