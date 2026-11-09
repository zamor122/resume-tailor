import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/app/services/model-fallback');
vi.mock('@/app/utils/stripModelThinking', () => ({
  stripModelThinking: (s: string) => s,
}));

import { POST } from '@/app/api/elicitation/questions/route';

const makeReq = (body: unknown) =>
  new NextRequest('http://localhost:3000/api/elicitation/questions', {
    method: 'POST',
    body: JSON.stringify(body),
  });

const LONG = 'x'.repeat(80);

describe('POST /api/elicitation/questions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns honest fallback questions (never an error) when inputs are too short', async () => {
    const res = await POST(makeReq({ resume: 'short', jobDescription: 'short' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.source).toBe('fallback');
    expect(data.questions.length).toBeGreaterThanOrEqual(3);
  });

  it('returns generated questions when the model answers cleanly', async () => {
    const { generateWithFallback } = await import('@/app/services/model-fallback');
    (generateWithFallback as any).mockResolvedValue({
      text: JSON.stringify([
        'How many people did that project affect?',
        'What changed for the business as a result?',
        'How long did the project take?',
      ]),
    });

    const res = await POST(makeReq({ resume: LONG, jobDescription: LONG, jobTitle: 'PM' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.source).toBe('generated');
    expect(data.questions.length).toBe(3);
    expect(data.questions[0].question).toContain('How many people');
  });

  it('falls back to honest questions when the model call throws', async () => {
    const { generateWithFallback } = await import('@/app/services/model-fallback');
    (generateWithFallback as any).mockRejectedValue(new Error('provider down'));

    const res = await POST(makeReq({ resume: LONG, jobDescription: LONG }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.source).toBe('fallback');
    expect(data.questions.length).toBeGreaterThanOrEqual(3);
  });

  it('never exposes an error status even for a malformed body', async () => {
    const req = new NextRequest('http://localhost:3000/api/elicitation/questions', {
      method: 'POST',
      body: 'not-json',
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data.questions)).toBe(true);
  });

  it('reports source "fallback" (not "generated") when the model returns nothing usable', async () => {
    const { generateWithFallback } = await import('@/app/services/model-fallback');
    (generateWithFallback as any).mockResolvedValue({ text: 'I cannot help with that.' });

    const res = await POST(makeReq({ resume: LONG, jobDescription: LONG }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.source).toBe('fallback');
    expect(data.questions.length).toBeGreaterThanOrEqual(3);
  });

  it('caps the returned question list at five', async () => {
    const { generateWithFallback } = await import('@/app/services/model-fallback');
    (generateWithFallback as any).mockResolvedValue({
      text: JSON.stringify(Array.from({ length: 9 }, (_, i) => `Question number ${i + 1} with enough length?`)),
    });

    const res = await POST(makeReq({ resume: LONG, jobDescription: LONG }));
    const data = await res.json();
    expect(data.questions.length).toBeLessThanOrEqual(5);
  });
});
