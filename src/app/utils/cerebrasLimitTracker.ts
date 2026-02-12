/**
 * Cerebras Global Limit Tracker
 * 
 * Monitors Cerebras API global limits (shared across all users).
 * These limits are enforced by Cerebras API, but we track usage to monitor
 * when we're approaching limits and log warnings.
 */

export interface GlobalLimitStatus {
  approachingLimit: boolean;
  limitHit: boolean;
  usagePercent: number;
  retryAfter?: number;
  window: 'minute' | 'hour' | 'day';
}

export interface UsageStatus {
  requests: {
    perMinute: { current: number; limit: number };
    perHour: { current: number; limit: number };
    perDay: { current: number; limit: number };
  };
  tokens: {
    perMinute: { current: number; limit: number };
    perHour: { current: number; limit: number };
    perDay: { current: number; limit: number };
  };
}

interface UsageEntry {
  requests: number[];
  tokens: number[];
}

// In-memory store for global usage tracking
// Key: modelKey (e.g., 'gpt-oss-120b')
const globalUsageStore = new Map<string, UsageEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupOldEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return;
  }
  
  lastCleanup = now;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  for (const [modelKey, entry] of globalUsageStore.entries()) {
    const recentRequests = entry.requests.filter(timestamp => timestamp > oneDayAgo);
    const recentTokens = entry.tokens.filter(timestamp => timestamp > oneDayAgo);
    
    if (recentRequests.length === 0 && recentTokens.length === 0) {
      globalUsageStore.delete(modelKey);
    } else {
      globalUsageStore.set(modelKey, {
        requests: recentRequests,
        tokens: recentTokens,
      });
    }
  }
}

function getCerebrasLimits(): {
  requests: { perMinute: number; perHour: number; perDay: number };
  tokens: { perMinute: number; perHour: number; perDay: number };
} {
  return {
    requests: {
      perMinute: parseInt(process.env.CEREBRAS_GLOBAL_LIMIT_REQUESTS_PER_MINUTE || '30'),
      perHour: parseInt(process.env.CEREBRAS_GLOBAL_LIMIT_REQUESTS_PER_HOUR || '900'),
      perDay: parseInt(process.env.CEREBRAS_GLOBAL_LIMIT_REQUESTS_PER_DAY || '14400'),
    },
    tokens: {
      perMinute: parseInt(process.env.CEREBRAS_GLOBAL_LIMIT_TOKENS_PER_MINUTE || '64000'),
      perHour: parseInt(process.env.CEREBRAS_GLOBAL_LIMIT_TOKENS_PER_HOUR || '1000000'),
      perDay: parseInt(process.env.CEREBRAS_GLOBAL_LIMIT_TOKENS_PER_DAY || '1000000'),
    },
  };
}

function countInWindow(timestamps: number[], windowMs: number): number {
  const now = Date.now();
  const windowStart = now - windowMs;
  return timestamps.filter(ts => ts > windowStart).length;
}

function sumTokensInWindow(
  entries: Array<{ timestamp: number; tokens: number }>,
  windowMs: number
): number {
  const now = Date.now();
  const windowStart = now - windowMs;
  return entries
    .filter(e => e.timestamp > windowStart)
    .reduce((sum, e) => sum + e.tokens, 0);
}

export function checkCerebrasGlobalLimits(
  modelKey: string,
  estimatedTokens: number
): GlobalLimitStatus {
  cleanupOldEntries();
  
  // Only track Cerebras models
  if (!modelKey.includes('cerebras') && !modelKey.includes('gpt-oss')) {
    return {
      approachingLimit: false,
      limitHit: false,
      usagePercent: 0,
      window: 'day',
    };
  }
  
  const limits = getCerebrasLimits();
  const now = Date.now();
  
  // Get or create entry
  let entry = globalUsageStore.get(modelKey);
  if (!entry) {
    entry = { requests: [], tokens: [] };
    globalUsageStore.set(modelKey, entry);
  }
  
  // Add current usage
  entry.requests.push(now);
  entry.tokens.push(estimatedTokens);
  
  // Check request limits
  const requestWindows = [
    { name: 'minute' as const, ms: 60 * 1000, limit: limits.requests.perMinute },
    { name: 'hour' as const, ms: 60 * 60 * 1000, limit: limits.requests.perHour },
    { name: 'day' as const, ms: 24 * 60 * 60 * 1000, limit: limits.requests.perDay },
  ];
  
  for (const window of requestWindows) {
    const count = countInWindow(entry.requests, window.ms);
    const usagePercent = (count / window.limit) * 100;
    
    if (count >= window.limit) {
      // Limit hit
      return {
        approachingLimit: true,
        limitHit: true,
        usagePercent: 100,
        retryAfter: 60, // Default retry after 60 seconds
        window: window.name,
      };
    }
    
    if (usagePercent >= 80) {
      // Approaching limit
      return {
        approachingLimit: true,
        limitHit: false,
        usagePercent,
        window: window.name,
      };
    }
  }
  
  // Check token limits
  const tokenEntries = entry.tokens.map((tokens, idx) => ({
    timestamp: entry.requests[idx] || now,
    tokens,
  }));
  
  const tokenWindows = [
    { name: 'minute' as const, ms: 60 * 1000, limit: limits.tokens.perMinute },
    { name: 'hour' as const, ms: 60 * 60 * 1000, limit: limits.tokens.perHour },
    { name: 'day' as const, ms: 24 * 60 * 60 * 1000, limit: limits.tokens.perDay },
  ];
  
  for (const window of tokenWindows) {
    const tokensUsed = sumTokensInWindow(tokenEntries, window.ms);
    const usagePercent = (tokensUsed / window.limit) * 100;
    
    if (tokensUsed >= window.limit) {
      return {
        approachingLimit: true,
        limitHit: true,
        usagePercent: 100,
        retryAfter: 60,
        window: window.name,
      };
    }
    
    if (usagePercent >= 80) {
      return {
        approachingLimit: true,
        limitHit: false,
        usagePercent,
        window: window.name,
      };
    }
  }
  
  // Update store
  globalUsageStore.set(modelKey, entry);
  
  return {
    approachingLimit: false,
    limitHit: false,
    usagePercent: 0,
    window: 'day',
  };
}

export function trackCerebrasUsage(modelKey: string, tokens: number): void {
  cleanupOldEntries();
  
  if (!modelKey.includes('cerebras') && !modelKey.includes('gpt-oss')) {
    return;
  }
  
  const now = Date.now();
  let entry = globalUsageStore.get(modelKey);
  
  if (!entry) {
    entry = { requests: [], tokens: [] };
    globalUsageStore.set(modelKey, entry);
  }
  
  entry.requests.push(now);
  entry.tokens.push(tokens);
  
  globalUsageStore.set(modelKey, entry);
}

export function getCerebrasUsageStatus(modelKey: string): UsageStatus {
  cleanupOldEntries();
  
  const limits = getCerebrasLimits();
  const entry = globalUsageStore.get(modelKey);
  
  if (!entry) {
    return {
      requests: {
        perMinute: { current: 0, limit: limits.requests.perMinute },
        perHour: { current: 0, limit: limits.requests.perHour },
        perDay: { current: 0, limit: limits.requests.perDay },
      },
      tokens: {
        perMinute: { current: 0, limit: limits.tokens.perMinute },
        perHour: { current: 0, limit: limits.tokens.perHour },
        perDay: { current: 0, limit: limits.tokens.perDay },
      },
    };
  }
  
  const tokenEntries = entry.tokens.map((tokens, idx) => ({
    timestamp: entry.requests[idx] || Date.now(),
    tokens,
  }));
  
  return {
    requests: {
      perMinute: {
        current: countInWindow(entry.requests, 60 * 1000),
        limit: limits.requests.perMinute,
      },
      perHour: {
        current: countInWindow(entry.requests, 60 * 60 * 1000),
        limit: limits.requests.perHour,
      },
      perDay: {
        current: countInWindow(entry.requests, 24 * 60 * 60 * 1000),
        limit: limits.requests.perDay,
      },
    },
    tokens: {
      perMinute: {
        current: sumTokensInWindow(tokenEntries, 60 * 1000),
        limit: limits.tokens.perMinute,
      },
      perHour: {
        current: sumTokensInWindow(tokenEntries, 60 * 60 * 1000),
        limit: limits.tokens.perHour,
      },
      perDay: {
        current: sumTokensInWindow(tokenEntries, 24 * 60 * 60 * 1000),
        limit: limits.tokens.perDay,
      },
    },
  };
}



