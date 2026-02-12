import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/validate-resume/route';

// Mock dependencies
vi.mock('@/app/utils/model-helper');
vi.mock('@/app/services/ai-provider');
vi.mock('@/app/utils/json-extractor');

describe('POST /api/validate-resume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when resumes are missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/validate-resume', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should validate a resume', async () => {
    const { getModelFromSession } = await import('@/app/utils/model-helper');
    const { generateContentWithFallback } = await import('@/app/services/ai-provider');
    const { parseJSONFromText } = await import('@/app/utils/json-extractor');

    (getModelFromSession as any).mockResolvedValue({
      modelKey: 'cerebras:gpt-oss-120b',
    });

    (generateContentWithFallback as any).mockResolvedValue({
      text: JSON.stringify({
        isValid: true,
        flaggedItems: [],
        summary: 'Resume is valid',
      }),
    });

    (parseJSONFromText as any).mockReturnValue({
      isValid: true,
      flaggedItems: [],
      summary: 'Resume is valid',
    });

    const req = new NextRequest('http://localhost:3000/api/validate-resume', {
      method: 'POST',
      body: JSON.stringify({
        originalResume: 'Original resume',
        tailoredResume: 'Tailored resume',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isValid).toBe(true);
    expect(data.flaggedItems).toEqual([]);
  });

  it('should detect hallucinations', async () => {
    const { getModelFromSession } = await import('@/app/utils/model-helper');
    const { generateContentWithFallback } = await import('@/app/services/ai-provider');
    const { parseJSONFromText } = await import('@/app/utils/json-extractor');

    (getModelFromSession as any).mockResolvedValue({
      modelKey: 'cerebras:gpt-oss-120b',
    });

    (generateContentWithFallback as any).mockResolvedValue({
      text: JSON.stringify({
        isValid: false,
        flaggedItems: [
          {
            type: 'hallucination',
            description: 'Added skill not in original',
            location: 'Skills section',
            severity: 'high',
          },
        ],
        summary: 'Found hallucinations',
      }),
    });

    (parseJSONFromText as any).mockReturnValue({
      isValid: false,
      flaggedItems: [
        {
          type: 'hallucination',
          description: 'Added skill not in original',
          location: 'Skills section',
          severity: 'high',
        },
      ],
      summary: 'Found hallucinations',
    });

    const req = new NextRequest('http://localhost:3000/api/validate-resume', {
      method: 'POST',
      body: JSON.stringify({
        originalResume: 'Original resume',
        tailoredResume: 'Tailored resume with extra skills',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isValid).toBe(false);
    expect(data.flaggedItems.length).toBeGreaterThan(0);
  });
});



