import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/resume/retrieve/route';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'test-secret-key';

const mockGetAccessInfoServer = vi.fn();
const mockIsWithinFreeResumeLimitServer = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/app/utils/accessManager', () => ({
  getAccessInfoServer: (...args: unknown[]) => mockGetAccessInfoServer(...args),
  isWithinFreeResumeLimitServer: (...args: unknown[]) => mockIsWithinFreeResumeLimitServer(...args),
}));

const createSupabaseChain = (resume: object | null, error: object | null = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: resume, error }),
});

vi.mock('@/app/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe('POST /api/resume/retrieve', () => {
  const mockResume = {
    id: 'resume-123',
    original_content: 'Original',
    tailored_content: 'Tailored',
    obfuscated_content: 'Obfuscated',
    content_map: {},
    job_description: 'Job desc',
    job_title: 'Engineer',
    match_score: { before: 70, after: 85 },
    improvement_metrics: {},
    free_reveal: null,
    format_spec: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(createSupabaseChain(mockResume, null));
  });

  it('should return 400 when neither resumeId nor email provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/resume/retrieve', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('should return 404 when resume not found', async () => {
    mockFrom.mockReturnValue(createSupabaseChain(null, { message: 'Not found' }));

    const req = new NextRequest('http://localhost:3000/api/resume/retrieve', {
      method: 'POST',
      body: JSON.stringify({ resumeId: 'missing-id' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Resume not found');
  });

  it('should return isUnlocked: false when user has no access', async () => {
    mockGetAccessInfoServer.mockResolvedValue({ hasAccess: false });
    mockIsWithinFreeResumeLimitServer.mockResolvedValue(false);

    const req = new NextRequest('http://localhost:3000/api/resume/retrieve', {
      method: 'POST',
      body: JSON.stringify({ resumeId: 'resume-123', userId: 'user-1' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isUnlocked).toBe(false);
    expect(data.tailoredResume).toBe('Obfuscated');
  });

  it('should return isUnlocked: true when user has paid access', async () => {
    mockGetAccessInfoServer.mockResolvedValue({
      hasAccess: true,
      tier: '7D',
      tierLabel: '7-Day Access',
      expiresAt: new Date(Date.now() + 86400000),
      remainingTime: 86400000,
      isExpired: false,
    });
    mockIsWithinFreeResumeLimitServer.mockResolvedValue(false);

    const req = new NextRequest('http://localhost:3000/api/resume/retrieve', {
      method: 'POST',
      body: JSON.stringify({ resumeId: 'resume-123', userId: 'user-1' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isUnlocked).toBe(true);
    expect(data.tailoredResume).toBe('Tailored');
    expect(data.accessInfo?.tier).toBe('7D');
  });

  it('should return isUnlocked: true when resume is within free limit', async () => {
    mockGetAccessInfoServer.mockResolvedValue({ hasAccess: false });
    mockIsWithinFreeResumeLimitServer.mockResolvedValue(true);

    const req = new NextRequest('http://localhost:3000/api/resume/retrieve', {
      method: 'POST',
      body: JSON.stringify({ resumeId: 'resume-123', userId: 'user-1' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isUnlocked).toBe(true);
    expect(data.tailoredResume).toBe('Tailored');
  });
});
