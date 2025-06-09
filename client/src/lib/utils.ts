import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date to readable format
 */
export function formatDate(date: string | Date): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format currency amount with symbol
 */
export function formatCurrency(amount: number | string, currency: string = 'USD'): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) return '0';

  const currencyMap: Record<string, { symbol: string; locale: string }> = {
    USD: { symbol: '$', locale: 'en-US' },
    SAR: { symbol: 'ر.س', locale: 'ar-SA' },
    EUR: { symbol: '€', locale: 'de-DE' },
    GBP: { symbol: '£', locale: 'en-GB' },
    AED: { symbol: 'د.إ', locale: 'ar-AE' },
  };

  const currencyInfo = currencyMap[currency] || currencyMap.USD;
  
  const formattedNumber = new Intl.NumberFormat(currencyInfo.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);

  // For Arabic currencies, put symbol after the number
  if (currency === 'SAR' || currency === 'AED') {
    return `${formattedNumber} ${currencyInfo.symbol}`;
  } else {
    return `${currencyInfo.symbol}${formattedNumber}`;
  }
}

/**
 * Format client name for display in dropdowns
 * Shows as: (Domain, Short Name, Full Name)
 * Falls back gracefully if fields are missing
 */
export function formatClientName(client: { name: string; shortName?: string | null; domain?: string | null }): string {
  const parts = [];
  
  if (client.domain) {
    parts.push(client.domain);
  }
  
  if (client.shortName) {
    parts.push(client.shortName);
  }
  
  parts.push(client.name);
  
  // If we have domain or shortName, wrap the first parts in parentheses
  if (client.domain || client.shortName) {
    const prefixParts = [];
    if (client.domain) prefixParts.push(client.domain);
    if (client.shortName) prefixParts.push(client.shortName);
    
    return `(${prefixParts.join(', ')}) ${client.name}`;
  }
  
  // Fallback to just the name if no additional info
  return client.name;
}
