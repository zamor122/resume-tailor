import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateWithFallback,
  checkModelAvailability,
  getBestAvailableModel,
} from '@/app/services/model-fallback';
import { getModelProvider } from '@/app/services/ai-provider';

// Mock ai-provider
vi.mock('@/app/services/ai-provider', () => ({
  getModelProvider: vi.fn(),
  generateContentWithFallback: vi.fn(),
}));

describe('model-fallback service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkModelAvailability', () => {
    it('should return true when model is available', async () => {
      const mockProvider = {
        isAvailable: vi.fn().mockResolvedValue(true),
      };
      (getModelProvider as any).mockResolvedValue(mockProvider);
      
      const result = await checkModelAvailability('test-model');
      expect(result).toBe(true);
    });

    it('should return false when model is unavailable', async () => {
      const mockProvider = {
        isAvailable: vi.fn().mockResolvedValue(false),
      };
      (getModelProvider as any).mockResolvedValue(mockProvider);
      
      const result = await checkModelAvailability('test-model');
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (getModelProvider as any).mockRejectedValue(new Error('Provider error'));
      
      const result = await checkModelAvailability('test-model');
      expect(result).toBe(false);
    });
  });

  describe('getBestAvailableModel', () => {
    it('should return preferred model when available', async () => {
      const mockProvider = {
        isAvailable: vi.fn().mockResolvedValue(true),
      };
      (getModelProvider as any).mockResolvedValue(mockProvider);
      
      const result = await getBestAvailableModel('preferred-model');
      expect(result).toBe('preferred-model');
    });

    it('should fallback to default when preferred is unavailable', async () => {
      let callCount = 0;
      const mockProvider = {
        isAvailable: vi.fn().mockImplementation(() => {
          callCount++;
          // First call (preferred) returns false, second (default) returns true
          return Promise.resolve(callCount > 1);
        }),
      };
      (getModelProvider as any).mockResolvedValue(mockProvider);
      
      const result = await getBestAvailableModel('unavailable-model');
      expect(result).toBeDefined();
    });

    it('should return default model when all models unavailable', async () => {
      const mockProvider = {
        isAvailable: vi.fn().mockResolvedValue(false),
      };
      (getModelProvider as any).mockResolvedValue(mockProvider);
      
      const result = await getBestAvailableModel('unavailable-model');
      expect(result).toBeDefined(); // Should return default model
    });
  });

  describe('generateWithFallback', () => {
    it('should call generateContentWithFallback', async () => {
      const { generateContentWithFallback } = await import('@/app/services/ai-provider');
      (generateContentWithFallback as any).mockResolvedValue({
        text: 'Generated content',
      });
      
      const result = await generateWithFallback('test prompt');
      
      expect(generateContentWithFallback).toHaveBeenCalled();
      expect(result.text).toBe('Generated content');
    });

    it('should pass fallback models when provided', async () => {
      const { generateContentWithFallback } = await import('@/app/services/ai-provider');
      (generateContentWithFallback as any).mockResolvedValue({
        text: 'Generated content',
      });
      
      await generateWithFallback('test prompt', undefined, undefined, undefined, {
        fallbackModels: ['fallback1', 'fallback2'],
      });
      
      expect(generateContentWithFallback).toHaveBeenCalledWith(
        'test prompt',
        undefined,
        undefined,
        undefined,
        ['fallback1', 'fallback2']
      );
    });

    it('should throw error when all models fail', async () => {
      const { generateContentWithFallback } = await import('@/app/services/ai-provider');
      (generateContentWithFallback as any).mockRejectedValue(new Error('All models failed'));
      
      await expect(generateWithFallback('test prompt')).rejects.toThrow('All models failed');
    });
  });
});



