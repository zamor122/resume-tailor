import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isRateLimitError,
  isModelUnavailableError,
  createProvider,
  getModelProvider,
} from '@/app/services/ai-provider';
import { AIProviderError } from '@/app/services/ai-provider';

describe('ai-provider service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isRateLimitError', () => {
    it('should identify 429 status as rate limit error', () => {
      const error = { status: 429 };
      expect(isRateLimitError(error)).toBe(true);
    });

    it('should identify 402 status as rate limit error', () => {
      const error = { status: 402 };
      expect(isRateLimitError(error)).toBe(true);
    });

    it('should identify quotaExceeded flag', () => {
      const error = { quotaExceeded: true };
      expect(isRateLimitError(error)).toBe(true);
    });

    it('should identify rate limit in error message', () => {
      const error = { message: 'Rate limit exceeded' };
      expect(isRateLimitError(error)).toBe(true);
    });

    it('should return false for non-rate-limit errors', () => {
      const error = { status: 500, message: 'Internal server error' };
      expect(isRateLimitError(error)).toBe(false);
    });
  });

  describe('isModelUnavailableError', () => {
    it('should identify 404 as model unavailable', () => {
      const error = { status: 404 };
      expect(isModelUnavailableError(error)).toBe(true);
    });

    it('should identify 403 as model unavailable', () => {
      const error = { status: 403 };
      expect(isModelUnavailableError(error)).toBe(true);
    });

    it('should identify 400 as model unavailable', () => {
      const error = { status: 400 };
      expect(isModelUnavailableError(error)).toBe(true);
    });

    it('should identify "not found" in message', () => {
      const error = { message: 'Model not found' };
      expect(isModelUnavailableError(error)).toBe(true);
    });

    it('should identify "decommissioned" in message', () => {
      const error = { message: 'Model decommissioned' };
      expect(isModelUnavailableError(error)).toBe(true);
    });

    it('should return false for available models', () => {
      const error = { status: 200 };
      expect(isModelUnavailableError(error)).toBe(false);
    });
  });

  describe('createProvider', () => {
    it('should create OpenAI provider', () => {
      const provider = createProvider('openai', 'gpt-4', 'test-api-key');
      expect(provider).toBeDefined();
    });

    it('should create Anthropic provider', () => {
      const provider = createProvider('anthropic', 'claude-3-opus', 'test-api-key');
      expect(provider).toBeDefined();
    });

    it('should create Cerebras provider', () => {
      const provider = createProvider('cerebras', 'gpt-oss-120b');
      expect(provider).toBeDefined();
    });

    it('should throw error for unknown provider', () => {
      expect(() => {
        createProvider('unknown', 'model');
      }).toThrow('Unknown provider: unknown');
    });
  });

  describe('AIProviderError', () => {
    it('should create error with message', () => {
      const error = new AIProviderError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AIProviderError');
    });

    it('should include status and retryAfter', () => {
      const error = new AIProviderError('Rate limited', 429, 60);
      expect(error.status).toBe(429);
      expect(error.retryAfter).toBe(60);
    });

    it('should include quotaExceeded flag', () => {
      const error = new AIProviderError('Quota exceeded', 402, undefined, true);
      expect(error.quotaExceeded).toBe(true);
    });
  });
});

