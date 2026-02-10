import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ai-detection/route';

// Mock dependencies
vi.mock('@/app/services/model-fallback');
vi.mock('@/app/utils/model-helper');
vi.mock('@/app/utils/json-extractor');

describe('POST /api/ai-detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when text is too short', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai-detection', {
      method: 'POST',
      body: JSON.stringify({ text: 'Short' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Input');
  });

  it('should detect AI-generated text', async () => {
    const { generateWithFallback } = await import('@/app/services/model-fallback');
    const { getModelFromSession } = await import('@/app/utils/model-helper');
    const { parseJSONFromText } = await import('@/app/utils/json-extractor');

    (getModelFromSession as any).mockResolvedValue({
      modelKey: 'cerebras:gpt-oss-120b',
      sessionApiKeys: {},
    });

    (generateWithFallback as any).mockResolvedValue({
      text: JSON.stringify({
        aiScore: 85,
        confidence: 90,
        indicators: ['Repetitive phrases', 'Overly formal language'],
        humanScore: 15,
      }),
    });

    (parseJSONFromText as any).mockReturnValue({
      aiScore: 85,
      confidence: 90,
      indicators: ['Repetitive phrases', 'Overly formal language'],
      humanScore: 15,
    });

    const req = new NextRequest('http://localhost:3000/api/ai-detection', {
      method: 'POST',
      body: JSON.stringify({
        text: 'This is a test text that is long enough to pass validation. It contains enough characters to be analyzed for AI detection.',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.aiScore).toBe(85);
    expect(data.confidence).toBe(90);
    expect(data.indicators).toBeDefined();
    expect(data.humanScore).toBe(15);
  });
});

