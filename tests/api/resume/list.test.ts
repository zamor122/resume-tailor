import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/resume/list/route';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'test-secret-key';

const mockGetFreeResumeIdsServer = vi.fn();
const mockRequireAuth = vi.fn();
const mockVerifyUserIdMatch = vi.fn();

vi.mock('@/app/utils/accessManager', () => ({
  getFreeResumeIdsServer: (...args: unknown[]) => mockGetFreeResumeIdsServer(...args),
}));

vi.mock('@/app/utils/auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  verifyUserIdMatch: (...args: unknown[]) => mockVerifyUserIdMatch(...args),
}));

const mockResumes = [
  { id: 'resume-1', created_at: '2025-01-01', job_title: 'Engineer', company_name: 'Co', job_description: null, match_score: { after: 80 }, improvement_metrics: {} },
  { id: 'resume-2', created_at: '2025-01-02', job_title: 'Dev', company_name: 'Inc', job_description: null, match_score: { after: 75 }, improvement_metrics: {} },
];

const createResumeChain = (data: typeof mockResumes) => {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    range: () => chain,
    then: (resolve: (v: { data: typeof mockResumes; error: null; count: number }) => void) =>
      resolve({ data, error: null, count: data.length }),
  };
  return chain;
};

const createPaymentsChain = (data: Array<{ resume_id: string; status: string; amount_cents: number; created_at: string }>) => {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    in: () => Promise.resolve({ data, error: null }),
  };
  return chain;
};

vi.mock('@/app/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'payments') {
        return createPaymentsChain([{ resume_id: 'resume-2', status: 'completed', amount_cents: 500, created_at: '2025-01-02' }]);
      }
      return createResumeChain(mockResumes);
    }),
  },
}));

describe('GET /api/resume/list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFreeResumeIdsServer.mockResolvedValue(['resume-1']);
    mockRequireAuth.mockResolvedValue({ userId: 'user-1' });
    mockVerifyUserIdMatch.mockReturnValue({ ok: true });
  });

  it('should return 400 when neither userId nor sessionId provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/resume/list');

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing userId or sessionId');
  });

  it('should include isUnlocked for free resumes when userId provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/resume/list?userId=user-1', {
      headers: { Authorization: 'Bearer test-token' },
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.resumes).toBeDefined();
    expect(data.resumes.length).toBeGreaterThan(0);
    const firstResume = data.resumes.find((r: { id: string }) => r.id === 'resume-1');
    expect(firstResume).toBeDefined();
    expect(firstResume.isUnlocked).toBe(true);
  });

  it('should return pagination fields (totalCount, page, limit)', async () => {
    const req = new NextRequest('http://localhost:3000/api/resume/list?userId=user-1&page=1&limit=10', {
      headers: { Authorization: 'Bearer test-token' },
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalCount).toBeDefined();
    expect(data.page).toBe(1);
    expect(data.limit).toBe(10);
  });

  it('should return 401 when userId provided but auth fails', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      error: Response.json({ error: 'Authentication required. Please sign in.' }, { status: 401 }),
    });

    const req = new NextRequest('http://localhost:3000/api/resume/list?userId=user-1');
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it('should allow sessionId without auth (anonymous list)', async () => {
    const req = new NextRequest('http://localhost:3000/api/resume/list?sessionId=anon-session-1');
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(mockRequireAuth).not.toHaveBeenCalled();
  });
});
