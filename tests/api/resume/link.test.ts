import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/resume/link/route';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'test-secret-key';

const mockRequireAuth = vi.fn();
const mockVerifyUserIdMatch = vi.fn();

vi.mock('@/app/utils/auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  verifyUserIdMatch: (...args: unknown[]) => mockVerifyUserIdMatch(...args),
}));

const mockFrom = vi.fn();
vi.mock('@/app/lib/supabase/server', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const createChain = (findRes: { data: { id: string }[] }, updateRes: { data: { id: string }[] }) => {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    then: (resolve: (v: { data: { id: string }[]; error: null }) => void) => {
      resolve(findRes);
    },
    update: () => ({
      in: () => ({
        select: () => Promise.resolve(updateRes),
      }),
    }),
  };
  return chain;
};

describe('POST /api/resume/link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ userId: 'user-1' });
    mockVerifyUserIdMatch.mockReturnValue({ ok: true });
    mockFrom.mockReturnValue(
      createChain(
        { data: [{ id: 'resume-1' }, { id: 'resume-2' }] },
        { data: [{ id: 'resume-1' }, { id: 'resume-2' }] }
      )
    );
  });

  it('should return 401 when userId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/resume/link', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's1' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('userId');
  });

  it('should return 401 when auth fails', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      error: Response.json({ error: 'Authentication required.' }, { status: 401 }),
    });

    const req = new NextRequest('http://localhost:3000/api/resume/link', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 's1', userId: 'user-1' }),
    });

    const response = await POST(req);

    expect(response.status).toBe(401);
  });

  it('should return 403 when userId does not match authenticated user', async () => {
    mockRequireAuth.mockResolvedValueOnce({ userId: 'user-1' });
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
        accessToken: 'token',
      }),
    });

    const response = await POST(req);

    expect(response.status).toBe(403);
  });

  it('should link resumes successfully when auth valid', async () => {
    const req = new NextRequest('http://localhost:3000/api/resume/link', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 's1',
        userId: 'user-1',
        accessToken: 'valid-token',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.linked).toBe(2);
  });
});
