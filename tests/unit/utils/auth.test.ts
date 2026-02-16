import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  extractAuthToken,
  getAuthenticatedUserId,
  getAuthenticatedUser,
  verifyUserIdMatch,
} from '@/app/utils/auth';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      }),
    },
  })),
}));

describe('auth utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractAuthToken', () => {
    it('should extract token from Authorization header', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { Authorization: 'Bearer my-jwt-token' },
      });
      expect(extractAuthToken(req)).toBe('my-jwt-token');
    });

    it('should extract token from body accessToken', () => {
      const req = new NextRequest('http://localhost:3000/api/test');
      expect(extractAuthToken(req, { accessToken: 'body-token' })).toBe('body-token');
    });

    it('should prefer header over body', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { Authorization: 'Bearer header-token' },
      });
      expect(extractAuthToken(req, { accessToken: 'body-token' })).toBe('header-token');
    });

    it('should return null when no token present', () => {
      const req = new NextRequest('http://localhost:3000/api/test');
      expect(extractAuthToken(req)).toBe(null);
    });
  });

  describe('getAuthenticatedUserId', () => {
    it('should return userId for valid token', async () => {
      const result = await getAuthenticatedUserId('valid-token');
      expect(result).toBe('user-123');
    });
  });

  describe('getAuthenticatedUser', () => {
    it('should return user with id and email for valid token', async () => {
      const result = await getAuthenticatedUser('valid-token');
      expect(result).toEqual({ id: 'user-123', email: 'test@example.com' });
    });
  });

  describe('verifyUserIdMatch', () => {
    it('should return ok when IDs match', () => {
      const result = verifyUserIdMatch('user-123', 'user-123');
      expect(result).toEqual({ ok: true });
    });

    it('should return error Response when IDs do not match', () => {
      const result = verifyUserIdMatch('user-123', 'other-user');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error.status).toBe(403);
      }
    });
  });
});
