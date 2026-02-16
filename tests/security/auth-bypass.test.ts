import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/resume/list/route';
import { POST } from '@/app/api/resume/retrieve/route';
import { POST as POST_LINK } from '@/app/api/resume/link/route';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'test-secret-key';

const mockRequireAuth = vi.fn();
const mockVerifyUserIdMatch = vi.fn();

vi.mock('@/app/utils/auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  verifyUserIdMatch: (...args: unknown[]) => mockVerifyUserIdMatch(...args),
}));

vi.mock('@/app/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      then: (cb: (v: unknown) => void) => cb({ data: [], error: null, count: 0 }),
      in: () => Promise.resolve({ data: [], error: null }),
      is: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('@/app/utils/accessManager', () => ({
  getFreeResumeIdsServer: vi.fn().mockResolvedValue([]),
  getAccessInfoServer: vi.fn().mockResolvedValue({ hasAccess: false }),
  isWithinFreeResumeLimitServer: vi.fn().mockResolvedValue(false),
}));

describe('Security: Auth bypass prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resume/list', () => {
    it('should return 401 when userId provided but no valid auth', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        error: Response.json({ error: 'Authentication required. Please sign in.' }, { status: 401 }),
      });

      const req = new NextRequest('http://localhost:3000/api/resume/list?userId=victim-uuid');
      const response = await GET(req);

      expect(response.status).toBe(401);
    });

    it('should return 403 when userId does not match authenticated user', async () => {
      mockRequireAuth.mockResolvedValueOnce({ userId: 'attacker-uuid' });
      mockVerifyUserIdMatch.mockReturnValueOnce({
        error: Response.json(
          { error: 'User ID does not match authenticated session.' },
          { status: 403 }
        ),
      });

      const req = new NextRequest('http://localhost:3000/api/resume/list?userId=victim-uuid', {
        headers: { Authorization: 'Bearer attacker-token' },
      });
      const response = await GET(req);

      expect(response.status).toBe(403);
    });
  });

  describe('resume/retrieve', () => {
    it('should return 401 when userId provided but auth fails', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        error: Response.json({ error: 'Invalid or expired session. Please sign in again.' }, { status: 401 }),
      });

      const req = new NextRequest('http://localhost:3000/api/resume/retrieve', {
        method: 'POST',
        body: JSON.stringify({ resumeId: 'resume-1', userId: 'victim-uuid' }),
      });
      const response = await POST(req);

      expect(response.status).toBe(401);
    });
  });

  describe('resume/link', () => {
    it('should return 401 when no auth token', async () => {
      mockRequireAuth.mockResolvedValueOnce({
        error: Response.json({ error: 'Authentication required. Please sign in.' }, { status: 401 }),
      });

      const req = new NextRequest('http://localhost:3000/api/resume/link', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 's1', userId: 'user-1' }),
      });
      const response = await POST_LINK(req);

      expect(response.status).toBe(401);
    });

    it('should return 403 when userId does not match authenticated user', async () => {
      mockRequireAuth.mockResolvedValueOnce({ userId: 'attacker-uuid' });
      mockVerifyUserIdMatch.mockReturnValueOnce({
        error: Response.json(
          { error: 'User ID does not match authenticated session.' },
          { status: 403 }
        ),
      });

      const req = new NextRequest('http://localhost:3000/api/resume/link', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 's1',
          userId: 'victim-uuid',
          accessToken: 'attacker-token',
        }),
      });
      const response = await POST_LINK(req);

      expect(response.status).toBe(403);
    });
  });
});
