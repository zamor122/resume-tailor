/**
 * Rate Limiter Utility
 * 
 * Enforces per-IP rate limits to prevent abuse.
 * Limits are MORE restrictive than Cerebras global limits to ensure fair distribution.
 */

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // seconds until retry is allowed
  limitType: 'per_ip' | 'global_cerebras';
  currentCount: number;
  limit: number;
  window: 'minute' | 'hour' | 'day';
}

export interface RateLimitStatus {
  perMinute: { current: number; limit: number };
  perHour: { current: number; limit: number };
  perDay: { current: number; limit: number };
}

interface RateLimitEntry {
  requests: number[];
  tokens: number[];
}

// In-memory store for rate limiting (Edge runtime compatible)
// Key: `${ip}:${endpoint}:${modelKey || 'default'}`
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupOldEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return;
  }
  
  lastCleanup = now;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries older than 1 day
    const recentRequests = entry.requests.filter(timestamp => timestamp > oneDayAgo);
    const recentTokens = entry.tokens.filter(timestamp => timestamp > oneDayAgo);
    
    if (recentRequests.length === 0 && recentTokens.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, {
        requests: recentRequests,
        tokens: recentTokens,
      });
    }
  }
}

function getRateLimitConfig(modelKey?: string): {
  perMinute: number;
  perHour: number;
  perDay: number;
} {
  // Check for model-specific overrides
  if (modelKey) {
    const perMinute = parseInt(
      process.env[`RATE_LIMIT_MODEL_${modelKey.replace(/[:.-]/g, '_')}_PER_MINUTE`] || 
      process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || 
      '5'
    );
    const perHour = parseInt(
      process.env[`RATE_LIMIT_MODEL_${modelKey.replace(/[:.-]/g, '_')}_PER_HOUR`] || 
      process.env.RATE_LIMIT_REQUESTS_PER_HOUR || 
      '30'
    );
    const perDay = parseInt(
      process.env[`RATE_LIMIT_MODEL_${modelKey.replace(/[:.-]/g, '_')}_PER_DAY`] || 
      process.env.RATE_LIMIT_REQUESTS_PER_DAY || 
      '200'
    );
    
    return { perMinute, perHour, perDay };
  }
  
  // Default limits
  return {
    perMinute: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '5'),
    perHour: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_HOUR || '30'),
    perDay: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_DAY || '200'),
  };
}

function getStoreKey(ip: string, endpoint: string, modelKey?: string): string {
  return `${ip}:${endpoint}:${modelKey || 'default'}`;
}

function countRequestsInWindow(
  timestamps: number[],
  windowMs: number
): number {
  const now = Date.now();
  const windowStart = now - windowMs;
  return timestamps.filter(ts => ts > windowStart).length;
}

function getRetryAfter(
  timestamps: number[],
  limit: number,
  windowMs: number
): number {
  if (timestamps.length < limit) {
    return 0;
  }
  
  const now = Date.now();
  const windowStart = now - windowMs;
  const recentTimestamps = timestamps.filter(ts => ts > windowStart).sort((a, b) => a - b);
  
  if (recentTimestamps.length >= limit) {
    // Return time until oldest request in window expires
    const oldestInWindow = recentTimestamps[0];
    const expiresAt = oldestInWindow + windowMs;
    return Math.max(0, Math.ceil((expiresAt - now) / 1000));
  }
  
  return 0;
}

export function checkRateLimit(
  ip: string,
  endpoint: string,
  modelKey?: string,
  estimatedTokens?: number
): RateLimitResult {
  cleanupOldEntries();
  
  const config = getRateLimitConfig(modelKey);
  const storeKey = getStoreKey(ip, endpoint, modelKey);
  const now = Date.now();
  
  // Get or create entry
  let entry = rateLimitStore.get(storeKey);
  if (!entry) {
    entry = { requests: [], tokens: [] };
    rateLimitStore.set(storeKey, entry);
  }
  
  // Add current request timestamp
  entry.requests.push(now);
  if (estimatedTokens) {
    entry.tokens.push(estimatedTokens);
  }
  
  // Check limits for each window
  const windows = [
    { name: 'minute' as const, ms: 60 * 1000, limit: config.perMinute },
    { name: 'hour' as const, ms: 60 * 60 * 1000, limit: config.perHour },
    { name: 'day' as const, ms: 24 * 60 * 60 * 1000, limit: config.perDay },
  ];
  
  for (const window of windows) {
    const count = countRequestsInWindow(entry.requests, window.ms);
    
    if (count > window.limit) {
      const retryAfter = getRetryAfter(entry.requests, window.limit, window.ms);
      
      return {
        allowed: false,
        retryAfter,
        limitType: 'per_ip',
        currentCount: count,
        limit: window.limit,
        window: window.name,
      };
    }
  }
  
  // Update store
  rateLimitStore.set(storeKey, entry);
  
  return {
    allowed: true,
    limitType: 'per_ip',
    currentCount: entry.requests.length,
    limit: config.perDay,
    window: 'day',
  };
}

export function getRateLimitStatus(
  ip: string,
  endpoint: string,
  modelKey?: string
): RateLimitStatus {
  cleanupOldEntries();
  
  const config = getRateLimitConfig(modelKey);
  const storeKey = getStoreKey(ip, endpoint, modelKey);
  const entry = rateLimitStore.get(storeKey);
  
  if (!entry) {
    return {
      perMinute: { current: 0, limit: config.perMinute },
      perHour: { current: 0, limit: config.perHour },
      perDay: { current: 0, limit: config.perDay },
    };
  }
  
  return {
    perMinute: {
      current: countRequestsInWindow(entry.requests, 60 * 1000),
      limit: config.perMinute,
    },
    perHour: {
      current: countRequestsInWindow(entry.requests, 60 * 60 * 1000),
      limit: config.perHour,
    },
    perDay: {
      current: countRequestsInWindow(entry.requests, 24 * 60 * 60 * 1000),
      limit: config.perDay,
    },
  };
}



