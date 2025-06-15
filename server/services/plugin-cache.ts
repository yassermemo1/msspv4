interface CacheKey {
  pluginName: string;
  instanceId: string;
  queryId?: string;
  parameters?: any;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class PluginCache {
  private connectionCache = new Map<string, CacheEntry<boolean>>();
  private queryCache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 300000; // 5 minutes
  private connectionTTL = 600000; // 10 minutes

  private generateKey(key: CacheKey): string {
    const baseKey = `${key.pluginName}:${key.instanceId}`;
    if (key.queryId) {
      const paramStr = key.parameters ? JSON.stringify(key.parameters) : '';
      return `${baseKey}:${key.queryId}:${paramStr}`;
    }
    return baseKey;
  }

  private isExpired<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private cleanExpired<T>(cache: Map<string, CacheEntry<T>>): void {
    for (const [key, entry] of cache.entries()) {
      if (this.isExpired(entry)) {
        cache.delete(key);
      }
    }
  }

  // Connection status caching
  cacheConnectionStatus(key: CacheKey, status: boolean, ttl?: number): void {
    const cacheKey = this.generateKey(key);
    this.connectionCache.set(cacheKey, {
      data: status,
      timestamp: Date.now(),
      ttl: ttl || this.connectionTTL
    });
  }

  getCachedConnectionStatus(key: CacheKey): boolean | null {
    const cacheKey = this.generateKey(key);
    const entry = this.connectionCache.get(cacheKey);
    
    if (!entry || this.isExpired(entry)) {
      if (entry) {
        this.connectionCache.delete(cacheKey);
      }
      return null;
    }
    
    return entry.data;
  }

  // Query result caching
  cacheQueryResult(key: CacheKey, result: any, ttl?: number): void {
    const cacheKey = this.generateKey(key);
    this.queryCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  getCachedQueryResult(key: CacheKey): any | null {
    const cacheKey = this.generateKey(key);
    const entry = this.queryCache.get(cacheKey);
    
    if (!entry || this.isExpired(entry)) {
      if (entry) {
        this.queryCache.delete(cacheKey);
      }
      return null;
    }
    
    return entry.data;
  }

  // Cache management
  clearCache(): void {
    this.connectionCache.clear();
    this.queryCache.clear();
  }

  clearPluginCache(pluginName: string, instanceId?: string): void {
    const prefix = instanceId ? `${pluginName}:${instanceId}` : `${pluginName}:`;
    
    // Clear connection cache
    for (const key of this.connectionCache.keys()) {
      if (key.startsWith(prefix)) {
        this.connectionCache.delete(key);
      }
    }
    
    // Clear query cache
    for (const key of this.queryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.queryCache.delete(key);
      }
    }
  }

  // Periodic cleanup
  startCleanupInterval(intervalMs: number = 300000): void { // 5 minutes
    setInterval(() => {
      this.cleanExpired(this.connectionCache);
      this.cleanExpired(this.queryCache);
    }, intervalMs);
  }

  // Cache statistics
  getCacheStats(): {
    connectionCacheSize: number;
    queryCacheSize: number;
    totalSize: number;
  } {
    return {
      connectionCacheSize: this.connectionCache.size,
      queryCacheSize: this.queryCache.size,
      totalSize: this.connectionCache.size + this.queryCache.size
    };
  }
}

// Export singleton instance
export const pluginCache = new PluginCache();

// Start cleanup interval
pluginCache.startCleanupInterval(); 