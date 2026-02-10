import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  extractIPAddress,
  hashIPAddress,
  estimateTokens,
  checkApiRateLimit,
} from '@/app/utils/apiRateLimiter';

// Mock dependencies
vi.mock('@/app/utils/rateLimiter');
vi.mock('@/app/utils/cerebrasLimitTracker');
vi.mock('@/app/utils/umamiServer');

describe('apiRateLimiter utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractIPAddress', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '192.168.1.1, 10.0.0.1');
      
      const req = new NextRequest('http://localhost:3000', { headers });
      const ip = extractIPAddress(req);
      
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const headers = new Headers();
      headers.set('x-real-ip', '192.168.1.1');
      
      const req = new NextRequest('http://localhost:3000', { headers });
      const ip = extractIPAddress(req);
      
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from cf-connecting-ip header', () => {
      const headers = new Headers();
      headers.set('cf-connecting-ip', '192.168.1.1');
      
      const req = new NextRequest('http://localhost:3000', { headers });
      const ip = extractIPAddress(req);
      
      expect(ip).toBe('192.168.1.1');
    });

    it('should return unknown when no IP headers present', () => {
      const req = new NextRequest('http://localhost:3000');
      const ip = extractIPAddress(req);
      
      expect(ip).toBe('unknown');
    });
  });

  describe('hashIPAddress', () => {
    it('should return unknown for unknown IP', async () => {
      const hashed = await hashIPAddress('unknown');
      expect(hashed).toBe('unknown');
    });

    it('should hash IP address', async () => {
      const hashed = await hashIPAddress('192.168.1.1');
      expect(hashed).not.toBe('192.168.1.1');
      expect(hashed).not.toBe('unknown');
      expect(hashed.length).toBeGreaterThan(0);
    });

    it('should generate consistent hashes for same IP', async () => {
      const ip = '192.168.1.1';
      const hash1 = await hashIPAddress(ip);
      const hash2 = await hashIPAddress(ip);
      expect(hash1).toBe(hash2);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens from text length', () => {
      const text = 'This is a test string with some content.';
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should return 0 for empty text', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should approximate 4 characters per token', () => {
      const text = 'a'.repeat(40); // 40 characters
      const tokens = estimateTokens(text);
      expect(tokens).toBe(10); // 40 / 4 = 10
    });
  });

  describe('checkApiRateLimit', () => {
    it('should extract IP and check rate limits', async () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '192.168.1.1');
      
      const req = new NextRequest('http://localhost:3000', { headers });
      
      const { checkRateLimit } = await import('@/app/utils/rateLimiter');
      (checkRateLimit as any).mockReturnValue({
        allowed: true,
        limitType: 'per_ip',
        currentCount: 1,
        limit: 100,
        window: 'day',
      });
      
      const result = await checkApiRateLimit(req, '/api/test');
      
      expect(result.ip).toBe('192.168.1.1');
      expect(result.allowed).toBe(true);
    });
  });
});



