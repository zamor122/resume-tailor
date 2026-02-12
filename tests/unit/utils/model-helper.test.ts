import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getModelFromSession } from '@/app/utils/model-helper';

// Mock fetch
global.fetch = vi.fn();

describe('model-helper utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEFAULT_MODEL_KEY = 'cerebras:gpt-oss-120b';
  });

  describe('getModelFromSession', () => {
    it('should return default model when no modelKey or sessionId provided', async () => {
      const result = await getModelFromSession(undefined, undefined, 'http://localhost:3000');
      
      expect(result.modelKey).toBe('cerebras:gpt-oss-120b');
    });

    it('should use provided modelKey', async () => {
      const result = await getModelFromSession(undefined, 'openai:gpt-4', 'http://localhost:3000');
      
      expect(result.modelKey).toBe('openai:gpt-4');
    });

    it('should fetch session preferences when sessionId provided', async () => {
      const mockSession = {
        session: {
          preferences: {
            apiKeys: {
              'openai': 'test-key',
            },
          },
        },
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      });
      
      const result = await getModelFromSession('test-session-id', undefined, 'http://localhost:3000');
      
      expect(result.modelKey).toBe('cerebras:gpt-oss-120b');
      expect(result.sessionApiKeys).toEqual({ openai: 'test-key' });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/mcp/session-manager',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle session fetch errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = await getModelFromSession('test-session-id', undefined, 'http://localhost:3000');
      
      expect(result.modelKey).toBe('cerebras:gpt-oss-120b');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle non-ok session responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      
      const result = await getModelFromSession('test-session-id', undefined, 'http://localhost:3000');
      
      expect(result.modelKey).toBe('cerebras:gpt-oss-120b');
    });
  });
});



