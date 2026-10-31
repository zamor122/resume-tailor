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

vi.mock('@/app/utils/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: 'user-1' }),
  verifyUserIdMatch: vi.fn().mockReturnValue({ ok: true }),
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

  it('should return sectionGroups and resumeAST when present in format_spec or improvement_metrics', async () => {
    const resumeWithSections = {
      ...mockResume,
      format_spec: {
        sectionGroups: [{ id: 'section-exp-0', title: 'Tech Corp', sectionType: 'experience' }],
        resumeAST: { experience: [{ company: 'Tech Corp' }] },
      },
    };
    mockFrom.mockReturnValue(createSupabaseChain(resumeWithSections, null));
    mockGetAccessInfoServer.mockResolvedValue({ hasAccess: true });

    const req = new NextRequest('http://localhost:3000/api/resume/retrieve', {
      method: 'POST',
      body: JSON.stringify({ resumeId: 'resume-123', userId: 'user-1' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sectionGroups).toEqual([{ id: 'section-exp-0', title: 'Tech Corp', sectionType: 'experience' }]);
    expect(data.resumeAST).toEqual({ experience: [{ company: 'Tech Corp' }] });
  });

  it('should return 403 when user tries to retrieve someone elses resume (anti-IDOR)', async () => {
    const foreignResume = {
      ...mockResume,
      user_id: 'victim-user-id',
    };
    mockFrom.mockReturnValue(createSupabaseChain(foreignResume, null));

    const req = new NextRequest('http://localhost:3000/api/resume/retrieve', {
      method: 'POST',
      body: JSON.stringify({ resumeId: 'resume-123', userId: 'user-1' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('Access denied');
  });

  it('should sanitize suggestions and strip realText from contentMap when isUnlocked is false', async () => {
    const lockedResume = {
      ...mockResume,
      user_id: 'user-1',
      content_map: [
        {
          obfuscatedText: '████████',
          realText: 'SECRET_UNREDACTED_BULLET',
          isFreeReveal: false,
        },
        {
          obfuscatedText: 'REVEALED_BULLET',
          realText: 'FREE_SAMPLE_BULLET',
          isFreeReveal: true,
        },
      ],
      format_spec: {
        suggestions: [
          {
            id: 'sug-1',
            section: 'Experience',
            originalText: 'Old bullet',
            suggestedText: 'SECRET_TAILORED_BULLET',
          },
          {
            id: 'sug-2',
            section: 'Experience',
            originalText: 'Old bullet 2',
            suggestedText: 'FREE_SAMPLE_BULLET',
          },
        ],
        sectionGroups: [
          {
            id: 'group-1',
            title: 'Experience',
            tailoredContent: 'SECRET_FULL_TAILORED_SECTION',
            suggestions: [
              {
                id: 'sug-1',
                section: 'Experience',
                originalText: 'Old bullet',
                suggestedText: 'SECRET_TAILORED_BULLET',
              },
            ],
          },
        ],
        resumeAST: { experience: [{ role: 'SECRET_AST' }] },
      },
      free_reveal: {
        improvedText: 'FREE_SAMPLE_BULLET',
      },
    };

    mockFrom.mockReturnValue(createSupabaseChain(lockedResume, null));
    mockGetAccessInfoServer.mockResolvedValue({ hasAccess: false });
    mockIsWithinFreeResumeLimitServer.mockResolvedValue(false);

    const req = new NextRequest('http://localhost:3000/api/resume/retrieve', {
      method: 'POST',
      body: JSON.stringify({ resumeId: 'resume-123', userId: 'user-1' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.isUnlocked).toBe(false);

    // Verify contentMap has no secret realText
    expect(data.contentMap[0].realText).toBeUndefined();
    expect(data.contentMap[1].realText).toBe('FREE_SAMPLE_BULLET');

    // Verify suggestions are masked
    expect(data.suggestions[0].suggestedText).toContain('🔒 AI-tailored accomplishment locked');
    expect(data.suggestions[0].isLocked).toBe(true);
    expect(data.suggestions[1].suggestedText).toBe('FREE_SAMPLE_BULLET');
    expect(data.suggestions[1].isFreeReveal).toBe(true);

    // Verify sectionGroups stripped tailoredContent and masked suggestions
    expect(data.sectionGroups[0].tailoredContent).toBeUndefined();
    expect(data.sectionGroups[0].suggestions[0].suggestedText).toContain('🔒 AI-tailored accomplishment locked');

    // Verify resumeAST is undefined to prevent structural inspection
    expect(data.resumeAST).toBeUndefined();
  });
});
