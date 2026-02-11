import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/tailor/job/title/route';

// Mock Google Generative AI - use class for constructor
vi.mock('@google/generative-ai', () => {
  const mockGenerateContent = vi.fn().mockResolvedValue({
    response: { text: () => '{"jobTitle": "Software Engineer", "confidence": 95}' },
  });
  return {
    GoogleGenerativeAI: class MockGoogleGenerativeAI {
      getGenerativeModel = () => ({
        generateContent: mockGenerateContent,
      });
    },
  };
});

describe('POST /api/tailor/job/title', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('should return 400 when job description is too short', async () => {
    const req = new NextRequest('http://localhost:3000/api/tailor/job/title', {
      method: 'POST',
      body: JSON.stringify({ jobDescription: 'Short' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Input');
  });

  it('should extract job title', async () => {
    const req = new NextRequest('http://localhost:3000/api/tailor/job/title', {
      method: 'POST',
      body: JSON.stringify({
        jobDescription: 'We are looking for a Software Engineer with experience in React and Node.js. The ideal candidate will have 5+ years of experience.',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    if (response.status !== 200) {
      console.error('Tailor job title test error:', data);
    }
    expect(response.status).toBe(200);
    expect(data.jobTitle).toBe('Software Engineer');
    expect(data.confidence).toBe(95);
  });
});



