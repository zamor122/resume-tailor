/**
 * API Rate Limit Middleware
 * 
 * Extracts IP address from requests and checks rate limits.
 * Tracks rate limit hits in Umami analytics.
 */

import { NextRequest } from 'next/server';
import { checkRateLimit, RateLimitResult } from './rateLimiter';
import { checkCerebrasGlobalLimits, GlobalLimitStatus } from './cerebrasLimitTracker';
import { trackRateLimitHitServer } from './umamiServer';

/**
 * Extract IP address from request headers
 * Handles various proxy configurations (x-forwarded-for, x-real-ip, etc.)
 */
export function extractIPAddress(req: NextRequest): string {
  // Try x-forwarded-for first (most common in production)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0] || 'unknown';
  }
  
  // Try x-real-ip
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Try cf-connecting-ip (Cloudflare)
  const cfIP = req.headers.get('cf-connecting-ip');
  if (cfIP) {
    return cfIP;
  }
  
  // Fallback to req.ip if available (Next.js)
  // Note: In Edge runtime, req.ip might not be available
  return 'unknown';
}

/**
 * Hash IP address for privacy (one-way hash)
 * Uses Web Crypto API (Edge runtime compatible)
 */
export async function hashIPAddress(ip: string): Promise<string> {
  if (ip === 'unknown') {
    return 'unknown';
  }
  
  try {
    // Use Web Crypto API (available in Edge runtime)
    const encoder = new TextEncoder();
    const data = encoder.encode(ip + (process.env.IP_HASH_SALT || 'default-salt'));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 16); // Use first 16 chars for shorter hashes
  } catch (error) {
    // Fallback: return a simple hash if crypto fails
    return 'unknown';
  }
}

/**
 * Estimate token count from text (rough approximation)
 * Rule of thumb: ~4 characters per token
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Check API rate limits for a request
 * Returns rate limit result with retry-after timing
 */
export async function checkApiRateLimit(
  req: NextRequest,
  endpoint: string,
  modelKey?: string,
  estimatedTokens?: number
): Promise<RateLimitResult & { ip: string; hashedIP: string }> {
  const ip = extractIPAddress(req);
  const hashedIP = await hashIPAddress(ip);
  
  // Estimate tokens if not provided
  let tokens = estimatedTokens;
  if (!tokens && req.body) {
    try {
      const body = await req.clone().json().catch(() => null);
      if (body) {
        const text = JSON.stringify(body);
        tokens = estimateTokens(text);
      }
    } catch {
      // Ignore errors in token estimation
      tokens = 0;
    }
  }
  
  // Check per-IP rate limit
  const perIPResult = checkRateLimit(ip, endpoint, modelKey, tokens);
  
  if (!perIPResult.allowed) {
    return {
      ...perIPResult,
      ip,
      hashedIP,
    };
  }
  
  // Check Cerebras global limits (if using Cerebras model)
  if (modelKey && (modelKey.includes('cerebras') || modelKey.includes('gpt-oss'))) {
    const globalStatus = checkCerebrasGlobalLimits(modelKey, tokens || 0);
    
    if (globalStatus.limitHit) {
      return {
        allowed: false,
        retryAfter: globalStatus.retryAfter || 60,
        limitType: 'global_cerebras',
        currentCount: 0,
        limit: 0,
        window: globalStatus.window,
        ip,
        hashedIP,
      };
    }
  }
  
  return {
    ...perIPResult,
    ip,
    hashedIP,
  };
}

/**
 * Track rate limit hit in Umami (server-side)
 */
export async function trackRateLimitHit(
  req: NextRequest,
  endpoint: string,
  result: RateLimitResult & { ip: string; hashedIP: string },
  modelKey?: string,
  userId?: string
): Promise<void> {
  try {
    await trackRateLimitHitServer({
      endpoint,
      modelKey: modelKey || 'unknown',
      limitType: result.limitType,
      retryAfter: result.retryAfter || 0,
      hashedIP: result.hashedIP,
      userId,
      window: result.window,
      currentCount: result.currentCount,
      limit: result.limit,
    });
  } catch (error) {
    // Don't throw - rate limit tracking failure shouldn't break the request
    console.error('[RateLimit] Failed to track rate limit hit:', error);
  }
}

