import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  trackRateLimitHitServer,
  trackQuotaExceededServer,
} from '@/app/utils/umamiServer';

// Mock fetch
global.fetch = vi.fn();

describe('umamiServer utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variables before tests
    process.env.NODE_ENV = 'production'; // Default to production for most tests
    process.env.UMAMI_API_KEY = 'test-key';
    process.env.UMAMI_WEBSITE_ID = 'test-website-id';
    process.env.UMAMI_API_URL = 'https://cloud.umami.is/api';
  });

  describe('trackRateLimitHitServer', () => {
    it('should skip tracking in development mode', async () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await trackRateLimitHitServer({
        endpoint: '/api/test',
        modelKey: 'test-model',
        limitType: 'per_ip',
        retryAfter: 60,
        hashedIP: 'hashed-ip',
        window: 'minute',
        currentCount: 10,
        limit: 5,
      });
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should skip tracking when API key is missing', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.UMAMI_API_KEY;
      
      await trackRateLimitHitServer({
        endpoint: '/api/test',
        modelKey: 'test-model',
        limitType: 'per_ip',
        retryAfter: 60,
        hashedIP: 'hashed-ip',
        window: 'minute',
        currentCount: 10,
        limit: 5,
      });
      
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should send tracking request in production', async () => {
      process.env.NODE_ENV = 'production';
      (global.fetch as any).mockResolvedValueOnce({ ok: true });
      
      await trackRateLimitHitServer({
        endpoint: '/api/test',
        modelKey: 'test-model',
        limitType: 'per_ip',
        retryAfter: 60,
        hashedIP: 'hashed-ip',
        window: 'minute',
        currentCount: 10,
        limit: 5,
      });
      
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      process.env.NODE_ENV = 'production';
      process.env.UMAMI_API_KEY = 'test-key';
      process.env.UMAMI_WEBSITE_ID = 'test-website-id';
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await trackRateLimitHitServer({
        endpoint: '/api/test',
        modelKey: 'test-model',
        limitType: 'per_ip',
        retryAfter: 60,
        hashedIP: 'hashed-ip',
        window: 'minute',
        currentCount: 10,
        limit: 5,
      });
      
      // Wait a bit for async error handling
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('trackQuotaExceededServer', () => {
    it('should skip tracking in development mode', async () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await trackQuotaExceededServer('test-model', '/api/test', 'hashed-ip');
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should send tracking request in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.UMAMI_API_KEY = 'test-key';
      process.env.UMAMI_WEBSITE_ID = 'test-website-id';
      (global.fetch as any).mockResolvedValueOnce({ ok: true });
      
      await trackQuotaExceededServer('test-model', '/api/test', 'hashed-ip', 'user-id');
      
      // Wait a bit for async fetch
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});

