/**
 * MCP Tools Utilities
 * Provides caching, parallel execution, and helper functions for deterministic MCP tools
 */

// In-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key from input data
 */
export function generateCacheKey(prefix: string, data: string | object): string {
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < dataStr.length; i++) {
    const char = dataStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `${prefix}:${Math.abs(hash).toString(36)}`;
}

/**
 * Get cached data if available and not expired
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

/**
 * Set cache entry
 */
export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Clear cache entries matching prefix
 */
export function clearCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Execute multiple MCP tool calls in parallel
 */
export async function executeParallel<T extends Record<string, any>>(
  calls: Array<{
    key: string;
    fn: () => Promise<any>;
    cacheKey?: string;
    cacheTTL?: number;
  }>
): Promise<T> {
  const results: Record<string, any> = {};
  const promises: Array<Promise<void>> = [];
  
  for (const call of calls) {
    const promise = (async () => {
      // Check cache first
      if (call.cacheKey) {
        const cached = getCached(call.cacheKey);
        if (cached !== null) {
          results[call.key] = cached;
          return;
        }
      }
      
      // Execute and cache
      try {
        const result = await call.fn();
        results[call.key] = result;
        
        if (call.cacheKey) {
          setCache(call.cacheKey, result, call.cacheTTL);
        }
      } catch (error) {
        console.error(`[MCP Tools] Error executing ${call.key}:`, error);
        results[call.key] = null;
      }
    })();
    
    promises.push(promise);
  }
  
  await Promise.all(promises);
  return results as T;
}

/**
 * Call MCP tool endpoint
 */
export async function callMCPTool<T>(
  baseUrl: string,
  endpoint: string,
  body: any,
  options?: {
    cacheKey?: string;
    cacheTTL?: number;
  }
): Promise<T> {
  // Check cache
  if (options?.cacheKey) {
    const cached = getCached<T>(options.cacheKey);
    if (cached !== null) {
      return cached;
    }
  }
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`MCP tool error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Cache result
    if (options?.cacheKey) {
      setCache(options.cacheKey, data, options.cacheTTL);
    }
    
    return data;
  } catch (error) {
    console.error(`[MCP Tools] Error calling ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Simple text hash for cache keys
 */
export function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}





