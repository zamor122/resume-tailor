import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkRateLimit,
  getRateLimitStatus,
} from '@/app/utils/rateLimiter';

describe('rateLimiter utilities', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.RATE_LIMIT_REQUESTS_PER_MINUTE;
    delete process.env.RATE_LIMIT_REQUESTS_PER_HOUR;
    delete process.env.RATE_LIMIT_REQUESTS_PER_DAY;
  });

  describe('checkRateLimit', () => {
    it('should allow request when under limit', () => {
      const result = checkRateLimit('127.0.0.1', '/api/test');
      expect(result.allowed).toBe(true);
      expect(result.limitType).toBe('per_ip');
    });

    it('should deny request when over per-minute limit', () => {
      const ip = '127.0.0.1';
      const endpoint = '/api/test';
      
      // Set low limit for testing
      process.env.RATE_LIMIT_REQUESTS_PER_MINUTE = '2';
      
      // Make requests up to limit
      checkRateLimit(ip, endpoint);
      checkRateLimit(ip, endpoint);
      
      // This should be denied
      const result = checkRateLimit(ip, endpoint);
      expect(result.allowed).toBe(false);
      expect(result.window).toBe('minute');
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should track requests per IP and endpoint separately', () => {
      const ip1 = '127.0.0.1';
      const ip2 = '192.168.1.1';
      const endpoint1 = '/api/test1';
      const endpoint2 = '/api/test2';
      
      process.env.RATE_LIMIT_REQUESTS_PER_MINUTE = '1';
      
      // IP1, endpoint1 - should be allowed
      expect(checkRateLimit(ip1, endpoint1).allowed).toBe(true);
      
      // IP1, endpoint1 - should be denied (same IP/endpoint)
      expect(checkRateLimit(ip1, endpoint1).allowed).toBe(false);
      
      // IP2, endpoint1 - should be allowed (different IP)
      expect(checkRateLimit(ip2, endpoint1).allowed).toBe(true);
      
      // IP1, endpoint2 - should be allowed (different endpoint)
      expect(checkRateLimit(ip1, endpoint2).allowed).toBe(true);
    });

    it('should handle model-specific limits', () => {
      const ip = '127.0.0.1';
      const endpoint = '/api/test';
      const modelKey = 'test-model';
      
      process.env.RATE_LIMIT_MODEL_test_model_PER_MINUTE = '1';
      
      expect(checkRateLimit(ip, endpoint, modelKey).allowed).toBe(true);
      expect(checkRateLimit(ip, endpoint, modelKey).allowed).toBe(false);
    });

    it('should calculate retryAfter correctly', () => {
      const ip = '127.0.0.1';
      const endpoint = '/api/test';
      
      process.env.RATE_LIMIT_REQUESTS_PER_MINUTE = '1';
      
      checkRateLimit(ip, endpoint);
      const result = checkRateLimit(ip, endpoint);
      
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return zero status for new IP/endpoint', () => {
      const status = getRateLimitStatus('127.0.0.1', '/api/test');
      expect(status.perMinute.current).toBe(0);
      expect(status.perHour.current).toBe(0);
      expect(status.perDay.current).toBe(0);
    });

    it('should track current usage across windows', () => {
      const ip = '127.0.0.1';
      const endpoint = '/api/test';
      
      // Make some requests
      checkRateLimit(ip, endpoint);
      checkRateLimit(ip, endpoint);
      checkRateLimit(ip, endpoint);
      
      const status = getRateLimitStatus(ip, endpoint);
      expect(status.perMinute.current).toBe(3);
      expect(status.perHour.current).toBe(3);
      expect(status.perDay.current).toBe(3);
    });

    it('should respect window boundaries', async () => {
      const ip = '127.0.0.1';
      const endpoint = '/api/test';
      
      checkRateLimit(ip, endpoint);
      
      const status1 = getRateLimitStatus(ip, endpoint);
      expect(status1.perMinute.current).toBe(1);
      
      // Wait a bit (simulated)
      vi.useFakeTimers();
      vi.advanceTimersByTime(61000); // 61 seconds
      
      const status2 = getRateLimitStatus(ip, endpoint);
      expect(status2.perMinute.current).toBe(0); // Should be 0 after minute window
      expect(status2.perHour.current).toBe(1); // But still in hour window
      
      vi.useRealTimers();
    });
  });
});



