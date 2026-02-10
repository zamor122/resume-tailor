import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/relevancy/route';

// Mock dependencies
vi.mock('@/app/services/model-fallback');
vi.mock('@/app/utils/model-helper');
vi.mock('@/app/utils/mcp-tools');

describe('POST /api/relevancy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 500 when resume is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/relevancy', {
      method: 'POST',
      body: JSON.stringify({ jobDescription: 'Test job' }),
    });

    const response = await POST(req);
    const data = await response.json();

    // Route doesn't validate input upfront, it will fail during processing
    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });

  it('should calculate relevancy score', async () => {
    const { generateWithFallback } = await import('@/app/services/model-fallback');
    const { getModelFromSession } = await import('@/app/utils/model-helper');
    
    // Mock getModelFromSession to return a model
    (getModelFromSession as any).mockResolvedValue({
      modelKey: 'cerebras:gpt-oss-120b',
      sessionApiKeys: {},
    });
    
    // Mock generateWithFallback to return scores (called twice - once for before, once for after)
    (generateWithFallback as any)
      .mockResolvedValueOnce({ text: '70' }) // before score
      .mockResolvedValueOnce({ text: '85' }); // after score

    const req = new NextRequest('http://localhost:3000/api/relevancy', {
      method: 'POST',
      body: JSON.stringify({
        originalResume: 'Original resume',
        tailoredResume: 'Tailored resume',
        jobDescription: 'Job description',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.before).toBe(70);
    expect(data.after).toBe(85);
  });
});

