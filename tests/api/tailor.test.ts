import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/tailor/route';

describe('POST /api/tailor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when resume is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/tailor', {
      method: 'POST',
      body: JSON.stringify({ jobDescription: 'Test job' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing resume or job description');
  });

  it('should forward to humanize stream and return tailored resume', async () => {
    const sseData = [
      'data: {"stage":"preprocessing"}\n',
      'data: {"tailoredResume":"Tailored resume content","matchScore":{"before":50,"after":75},"improvementMetrics":{"quantifiedBulletsAdded":2,"atsKeywordsMatched":5,"activeVoiceConversions":1,"sectionsOptimized":1}}\n',
    ].join('\n');

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(sseData));
        controller.close();
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: mockStream,
      })
    );

    const req = new NextRequest('http://localhost:3000/api/tailor', {
      method: 'POST',
      body: JSON.stringify({
        resume: 'Original resume',
        jobDescription: 'Job description with at least 100 characters to pass validation because the humanize stream expects a valid job description for tailoring.',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tailoredResume).toBe('Tailored resume content');
    expect(data.matchScore).toEqual({ before: 50, after: 75 });
    expect(data.improvementMetrics).toBeDefined();
    expect(data.changes).toBeDefined();
    expect(Array.isArray(data.changes)).toBe(true);

    vi.unstubAllGlobals();
  });
});

