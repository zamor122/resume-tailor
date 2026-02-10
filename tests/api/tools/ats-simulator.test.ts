import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/tools/ats-simulator/route';

// Mock dependencies
vi.mock('@/app/services/model-fallback');
vi.mock('@/app/utils/model-helper');
vi.mock('@/app/utils/json-extractor');

describe('POST /api/tools/ats-simulator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when resume is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/tools/ats-simulator', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Input');
  });

  it('should simulate ATS parsing', async () => {
    const { generateWithFallback } = await import('@/app/services/model-fallback');
    const { getModelFromSession } = await import('@/app/utils/model-helper');
    
    // Mock getModelFromSession to return a model
    (getModelFromSession as any).mockResolvedValue({
      modelKey: 'cerebras:gpt-oss-120b',
      sessionApiKeys: {},
    });
    
    // Mock generateWithFallback to return JSON string (route parses it directly)
    (generateWithFallback as any).mockResolvedValue({
      text: JSON.stringify({
        atsScore: 85,
        parsedData: {
          contactInfo: {
            email: 'test@example.com',
          },
          skills: [
            { skill: 'JavaScript', confidence: 90, source: 'Skills section' },
            { skill: 'React', confidence: 85, source: 'Experience section' },
          ],
          experience: [],
          education: [],
        },
        issues: [],
        recommendations: [],
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/tools/ats-simulator', {
      method: 'POST',
      body: JSON.stringify({ resume: 'Test resume text with enough characters to pass validation. This should be at least 100 characters long to satisfy the minimum length requirement for the ATS simulator endpoint.' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.atsScore).toBe(85);
    expect(data.parsedData).toBeDefined();
  });
});

