import { toast } from "sonner";

const API_BASE_URL = 'https://open.er-api.com/v6/latest';

interface ExchangeRateResponse {
  result: string;
  rates: { [key: string]: number };
  base_code: string;
}

// Simple in-memory cache with expiration
const cache = new Map<string, { data: ExchangeRateResponse; timestamp: number }>();
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export async function getExchangeRates(baseCurrency: string): Promise<ExchangeRateResponse['rates']> {
  const cached = cache.get(baseCurrency);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data.rates;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/${baseCurrency}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      toast.error(`Failed to fetch exchange rates: ${errorData.message || response.statusText}`);
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
    }

    const data: ExchangeRateResponse = await response.json();
    if (data.result === 'error') {
        toast.error(`Error fetching exchange rates: ${data['error-type']}`);
        throw new Error(`Error fetching exchange rates: ${data['error-type']}`);
    }
    
    cache.set(baseCurrency, { data, timestamp: Date.now() });
    return data.rates;
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    toast.error("Failed to fetch up-to-date exchange rates. Conversion might be incorrect.");
    // Return stale data if available
    if(cached) {
      return cached.data.rates;
    }
    throw error;
  }
} 