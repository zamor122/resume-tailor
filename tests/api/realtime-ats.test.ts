import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/realtime-ats/route';

// Mock dependencies
vi.mock('@/app/utils/mcp-tools', () => ({
  callMCPTool: vi.fn(),
  generateCacheKey: vi.fn(() => 'test-cache-key'),
}));

describe('POST /api/realtime-ats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when resume is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/realtime-ats', {
      method: 'POST',
      body: JSON.stringify({ jobDescription: 'Test job' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing resume or job description');
  });

  it('should return 400 when job description is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/realtime-ats', {
      method: 'POST',
      body: JSON.stringify({ resume: 'Test resume' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing resume or job description');
  });

  it('should calculate ATS score successfully', async () => {
    const { callMCPTool } = await import('@/app/utils/mcp-tools');
    (callMCPTool as any).mockResolvedValue({
      before: 75,
      keywordMatches: [
        { keyword: 'JavaScript', matched: true },
        { keyword: 'React', matched: true },
      ],
    });

    const req = new NextRequest('http://localhost:3000/api/realtime-ats', {
      method: 'POST',
      body: JSON.stringify({
        resume: 'Test resume',
        jobDescription: 'Test job description',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.score).toBe(75);
    expect(data.keywordMatches).toBeDefined();
  });

  it('should handle MCP tool errors gracefully', async () => {
    const { callMCPTool } = await import('@/app/utils/mcp-tools');
    (callMCPTool as any).mockRejectedValue(new Error('MCP tool error'));

    const req = new NextRequest('http://localhost:3000/api/realtime-ats', {
      method: 'POST',
      body: JSON.stringify({
        resume: 'Test resume',
        jobDescription: 'Test job description',
      }),
    });

    const response = await POST(req);
    const data = await response.json();
    
    // Route catches errors and returns fallback response with 200 status
    expect(response.status).toBe(200);
    expect(data.score).toBeDefined();
    expect(data.keywordMatches).toBeDefined();
  });
});

