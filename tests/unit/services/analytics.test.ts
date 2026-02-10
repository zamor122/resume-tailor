import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analytics, trackEvent } from '@/app/services/analytics';

describe('analytics service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.umami
    if (typeof window !== 'undefined') {
      delete (window as any).umami;
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analytics.events', () => {
    it('should have all expected event constants', () => {
      expect(analytics.events.PAGE_VIEW).toBe('page_view');
      expect(analytics.events.RESUME_TAILOR).toBe('resume_tailor');
      expect(analytics.events.TOOL_OPENED).toBe('tool_opened');
      expect(analytics.events.MODEL_RATE_LIMIT_HIT).toBe('MODEL_RATE_LIMIT_HIT');
    });
  });

  describe('trackEvent', () => {
    it('should log event in development mode', async () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = await trackEvent('test_event', { key: 'value' });
      
      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('DEV MODE'),
        expect.anything()
      );
      
      consoleSpy.mockRestore();
    });

    it('should track event when Umami is available', async () => {
      // Mock window.location to simulate production
      const originalLocation = window.location;
      delete (window as any).location;
      (window as any).location = { hostname: 'example.com' };
      
      process.env.NODE_ENV = 'production';
      const mockTrack = vi.fn();
      (window as any).umami = { track: mockTrack };
      
      const result = await trackEvent('test_event', { key: 'value' });
      
      expect(result).toBe(true);
      expect(mockTrack).toHaveBeenCalledWith('test_event', { key: 'value' });
      
      // Restore
      (window as any).location = originalLocation;
    });

    it('should handle old object-style event format', async () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = await trackEvent(
        { name: 'test_event', properties: { key: 'value' } }
      );
      
      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should return false when Umami is not available', async () => {
      // Mock window.location to simulate production
      const originalLocation = window.location;
      delete (window as any).location;
      (window as any).location = { hostname: 'example.com' };
      
      process.env.NODE_ENV = 'production';
      delete (window as any).umami;
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await trackEvent('test_event');
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      // Restore
      (window as any).location = originalLocation;
    });

    it('should handle errors gracefully', async () => {
      // Mock window.location to simulate production
      const originalLocation = window.location;
      delete (window as any).location;
      (window as any).location = { hostname: 'example.com' };
      
      process.env.NODE_ENV = 'production';
      const mockTrack = vi.fn(() => {
        throw new Error('Tracking error');
      });
      (window as any).umami = { track: mockTrack };
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await trackEvent('test_event');
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      // Restore
      (window as any).location = originalLocation;
    });

    it('should return false in server-side context', async () => {
      // Mock window as undefined (server-side)
      const originalWindow = global.window;
      (global as any).window = undefined;
      
      const result = await trackEvent('test_event');
      expect(result).toBe(false);
      
      (global as any).window = originalWindow;
    });
  });
});

