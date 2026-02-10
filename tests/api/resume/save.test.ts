import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/resume/save/route';

// Mock Supabase
vi.mock('@/app/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
    })),
  },
}));

// Set env vars before mocking
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'test-secret-key';

// Mock dependencies
vi.mock('@/app/lib/supabase/server', () => {
  const mockFrom = vi.fn(() => ({
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: 'resume-id', created_at: new Date().toISOString() },
      error: null,
    }),
  }));

  return {
    supabaseAdmin: new Proxy({ from: mockFrom } as any, {
      get(target, prop) {
        return target[prop as keyof typeof target];
      },
    }),
  };
});
vi.mock('@/app/utils/resumeObfuscator');

describe('POST /api/resume/save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when resume is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/resume/save', {
      method: 'POST',
      body: JSON.stringify({ jobDescription: 'Test job' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('resume');
  });

  it('should save resume successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/resume/save', {
      method: 'POST',
      body: JSON.stringify({
        originalResume: 'Original resume',
        tailoredResume: 'Tailored resume',
        jobDescription: 'Test job',
        sessionId: 'test-session',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.resumeId).toBeDefined();
  });
});

