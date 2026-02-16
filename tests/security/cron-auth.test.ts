import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/generate-blog-post/route';

describe('Security: Cron auth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it('should return 401 when CRON_SECRET is not set', async () => {
    delete process.env.CRON_SECRET;

    const req = new NextRequest('http://localhost:3000/api/cron/generate-blog-post');
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it('should return 401 when Authorization header is missing', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';

    const req = new NextRequest('http://localhost:3000/api/cron/generate-blog-post');
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it('should return 401 when Authorization header does not match', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';

    const req = new NextRequest('http://localhost:3000/api/cron/generate-blog-post', {
      headers: { Authorization: 'Bearer wrong-secret' },
    });
    const response = await GET(req);

    expect(response.status).toBe(401);
  });
});
