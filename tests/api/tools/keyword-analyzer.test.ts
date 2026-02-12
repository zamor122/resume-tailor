import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/tools/keyword-analyzer/route';

// Mock dependencies
vi.mock('@/app/services/model-fallback');
vi.mock('@/app/utils/model-helper');

describe('POST /api/tools/keyword-analyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when job description is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/tools/keyword-analyzer', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Input');
  });

  it('should analyze keywords', async () => {
    const { generateWithFallback } = await import('@/app/services/model-fallback');
    const { getModelFromSession } = await import('@/app/utils/model-helper');

    (getModelFromSession as any).mockResolvedValue({
      modelKey: 'cerebras:gpt-oss-120b',
      sessionApiKeys: {},
    });

    (generateWithFallback as any).mockResolvedValue({
      text: JSON.stringify({
        keywords: {
          technical: [
            {
              term: 'React',
              importance: 'high',
              importanceScore: 90,
              frequency: 5,
              synonyms: ['React.js'],
              recommendedSections: ['Skills', 'Experience'],
              incorporationExample: 'Developed React applications',
            },
          ],
          soft: [],
          industry: [],
          certifications: [],
          actionVerbs: [],
          powerWords: [],
        },
        keywordDensity: {
          totalKeywords: 10,
          criticalKeywords: 3,
          averageFrequency: 2.5,
          mostFrequent: [{ keyword: 'React', count: 5 }],
        },
        missingFromResume: [],
        recommendations: [],
        industryBenchmark: {
          industryAverage: 15,
          thisJob: 10,
          comparison: 'below average',
        },
        industry: 'Technology',
        experienceLevel: 'mid',
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/tools/keyword-analyzer', {
      method: 'POST',
      body: JSON.stringify({
        jobDescription: 'We are looking for a React developer with experience in JavaScript and Node.js. The ideal candidate will have strong React skills and be able to work with modern frameworks.',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.keywords).toBeDefined();
    expect(data.keywords.technical).toBeDefined();
    expect(data.keywordDensity).toBeDefined();
  });
});



