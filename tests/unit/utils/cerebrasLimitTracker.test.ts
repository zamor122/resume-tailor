import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkCerebrasGlobalLimits,
  trackCerebrasUsage,
  getCerebrasUsageStatus,
} from '@/app/utils/cerebrasLimitTracker';

describe('cerebrasLimitTracker utilities', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.CEREBRAS_GLOBAL_LIMIT_REQUESTS_PER_MINUTE;
    delete process.env.CEREBRAS_GLOBAL_LIMIT_REQUESTS_PER_HOUR;
    delete process.env.CEREBRAS_GLOBAL_LIMIT_REQUESTS_PER_DAY;
    delete process.env.CEREBRAS_GLOBAL_LIMIT_TOKENS_PER_MINUTE;
    delete process.env.CEREBRAS_GLOBAL_LIMIT_TOKENS_PER_HOUR;
    delete process.env.CEREBRAS_GLOBAL_LIMIT_TOKENS_PER_DAY;
  });

  describe('checkCerebrasGlobalLimits', () => {
    it('should return allowed for non-Cerebras models', () => {
      const result = checkCerebrasGlobalLimits('openai:gpt-4', 1000);
      expect(result.approachingLimit).toBe(false);
      expect(result.limitHit).toBe(false);
    });

    it('should track Cerebras models', () => {
      const result = checkCerebrasGlobalLimits(`cerebras:test-${Date.now()}-${Math.random()}`, 1000);
      expect(result.approachingLimit).toBeDefined();
      expect(result.limitHit).toBeDefined();
    });

    it('should detect when limit is hit', () => {
      process.env.CEREBRAS_GLOBAL_LIMIT_REQUESTS_PER_MINUTE = '2';
      
      const modelKey = `cerebras:test-limit-${Date.now()}-${Math.random()}`;
      checkCerebrasGlobalLimits(modelKey, 1000);
      checkCerebrasGlobalLimits(modelKey, 1000);
      
      const result = checkCerebrasGlobalLimits(modelKey, 1000);
      expect(result.limitHit).toBe(true);
      expect(result.approachingLimit).toBe(true);
    });

    it('should detect when approaching limit (80% threshold)', () => {
      process.env.CEREBRAS_GLOBAL_LIMIT_REQUESTS_PER_MINUTE = '10';
      
      const modelKey = `cerebras:test-approach-${Date.now()}-${Math.random()}`;
      // Make 8 requests (80% of 10)
      for (let i = 0; i < 8; i++) {
        checkCerebrasGlobalLimits(modelKey, 1000);
      }
      
      const result = checkCerebrasGlobalLimits(modelKey, 1000);
      expect(result.approachingLimit).toBe(true);
    });
  });

  describe('trackCerebrasUsage', () => {
    it('should track usage for Cerebras models', () => {
      const modelKey = `cerebras:test-track-${Date.now()}-${Math.random()}`;
      trackCerebrasUsage(modelKey, 5000);
      
      const status = getCerebrasUsageStatus(modelKey);
      expect(status.requests.perMinute.current).toBeGreaterThan(0);
    });

    it('should not track usage for non-Cerebras models', () => {
      trackCerebrasUsage('openai:gpt-4', 5000);
      // Should not throw or error
    });
  });

  describe('getCerebrasUsageStatus', () => {
    it('should return zero status for new model', () => {
      const status = getCerebrasUsageStatus(`cerebras:test-zero-${Date.now()}-${Math.random()}`);
      expect(status.requests.perMinute.current).toBe(0);
      expect(status.requests.perHour.current).toBe(0);
      expect(status.requests.perDay.current).toBe(0);
    });

    it('should track usage across windows', () => {
      const modelKey = `cerebras:test-windows-${Date.now()}-${Math.random()}`;
      trackCerebrasUsage(modelKey, 1000);
      trackCerebrasUsage(modelKey, 2000);
      
      const status = getCerebrasUsageStatus(modelKey);
      expect(status.requests.perMinute.current).toBe(2);
      expect(status.requests.perHour.current).toBe(2);
      expect(status.requests.perDay.current).toBe(2);
    });
  });
});



