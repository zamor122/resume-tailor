import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateCacheKey,
  getCached,
  setCache,
  clearCache,
  executeParallel,
  callMCPTool,
  hashText,
} from '@/app/utils/mcp-tools';

// Mock fetch
global.fetch = vi.fn();

describe('mcp-tools utilities', () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
  });

  describe('generateCacheKey', () => {
    it('should generate consistent cache keys for same input', () => {
      const key1 = generateCacheKey('test', 'data');
      const key2 = generateCacheKey('test', 'data');
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = generateCacheKey('test', 'data1');
      const key2 = generateCacheKey('test', 'data2');
      expect(key1).not.toBe(key2);
    });

    it('should handle object inputs', () => {
      const obj = { key: 'value' };
      const key1 = generateCacheKey('test', obj);
      const key2 = generateCacheKey('test', obj);
      expect(key1).toBe(key2);
    });

    it('should include prefix in key', () => {
      const key = generateCacheKey('prefix', 'data');
      expect(key).toContain('prefix:');
    });
  });

  describe('getCached and setCache', () => {
    it('should store and retrieve cached data', () => {
      const key = 'test-key';
      const data = { value: 'test' };
      
      setCache(key, data);
      const cached = getCached(key);
      
      expect(cached).toEqual(data);
    });

    it('should return null for non-existent key', () => {
      expect(getCached('non-existent')).toBeNull();
    });

    it('should expire cached data after TTL', async () => {
      const key = 'test-key';
      const data = { value: 'test' };
      
      setCache(key, data, 100); // 100ms TTL
      
      expect(getCached(key)).toEqual(data);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(getCached(key)).toBeNull();
    });

    it('should use default TTL when not specified', () => {
      const key = 'test-key';
      const data = { value: 'test' };
      
      setCache(key, data);
      expect(getCached(key)).toEqual(data);
    });
  });

  describe('clearCache', () => {
    it('should clear all cache when no prefix provided', () => {
      setCache('key1', 'data1');
      setCache('key2', 'data2');
      
      clearCache();
      
      expect(getCached('key1')).toBeNull();
      expect(getCached('key2')).toBeNull();
    });

    it('should clear only matching prefix', () => {
      setCache('prefix:key1', 'data1');
      setCache('prefix:key2', 'data2');
      setCache('other:key3', 'data3');
      
      clearCache('prefix:');
      
      expect(getCached('prefix:key1')).toBeNull();
      expect(getCached('prefix:key2')).toBeNull();
      expect(getCached('other:key3')).toEqual('data3');
    });
  });

  describe('executeParallel', () => {
    it('should execute all calls in parallel', async () => {
      const calls = [
        { key: 'a', fn: async () => 'result-a' },
        { key: 'b', fn: async () => 'result-b' },
        { key: 'c', fn: async () => 'result-c' },
      ];
      
      const result = await executeParallel(calls);
      
      expect(result).toEqual({
        a: 'result-a',
        b: 'result-b',
        c: 'result-c',
      });
    });

    it('should use cached results when available', async () => {
      const cacheKey = 'cached-key';
      setCache(cacheKey, 'cached-result');
      
      const calls = [
        {
          key: 'a',
          fn: async () => 'new-result',
          cacheKey,
        },
      ];
      
      const result = await executeParallel(calls);
      
      expect(result.a).toBe('cached-result');
    });

    it('should handle errors in individual calls', async () => {
      const calls = [
        { key: 'a', fn: async () => 'result-a' },
        {
          key: 'b',
          fn: async () => {
            throw new Error('Test error');
          },
        },
        { key: 'c', fn: async () => 'result-c' },
      ];
      
      await expect(executeParallel(calls)).rejects.toThrow('Test error');
    });
  });

  describe('callMCPTool', () => {
    it('should call MCP tool endpoint and return data', async () => {
      const mockResponse = { result: 'success' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      
      const result = await callMCPTool('http://localhost:3000', '/api/test', {});
      
      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should use cached result when available', async () => {
      const cacheKey = 'test-cache';
      const cachedData = { cached: true };
      setCache(cacheKey, cachedData);
      
      const result = await callMCPTool(
        'http://localhost:3000',
        '/api/test',
        {},
        { cacheKey }
      );
      
      expect(result).toEqual(cachedData);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw error on failed request', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      
      await expect(
        callMCPTool('http://localhost:3000', '/api/test', {})
      ).rejects.toThrow();
    });

    it('should cache result after successful call', async () => {
      const mockResponse = { result: 'success' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });
      
      const cacheKey = 'test-cache';
      await callMCPTool('http://localhost:3000', '/api/test', {}, { cacheKey });
      
      const cached = getCached(cacheKey);
      expect(cached).toEqual(mockResponse);
    });
  });

  describe('hashText', () => {
    it('should generate consistent hashes for same input', () => {
      const hash1 = hashText('test');
      const hash2 = hashText('test');
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = hashText('test1');
      const hash2 = hashText('test2');
      expect(hash1).not.toBe(hash2);
    });
  });
});



