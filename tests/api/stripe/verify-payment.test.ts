import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/stripe/verify-payment/route';

const mockRetrieveSession = vi.fn();

vi.mock('@/app/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        retrieve: (...args: unknown[]) => mockRetrieveSession(...args),
      },
    },
  },
}));

describe('POST /api/stripe/verify-payment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when sessionId is missing from payload', async () => {
    const req = new NextRequest('http://localhost:3000/api/stripe/verify-payment', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('sessionId is required');
  });

  it('should return paid: false when session status is not paid', async () => {
    mockRetrieveSession.mockResolvedValueOnce({
      id: 'cs_unpaid_123',
      payment_status: 'unpaid',
      customer_email: 'applicant@example.com',
      metadata: { tier: '7D' },
    });

    const req = new NextRequest('http://localhost:3000/api/stripe/verify-payment', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'cs_unpaid_123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.paid).toBe(false);
    expect(data.status).toBe('unpaid');
  });

  it('should return paid: true with metadata and email when session is paid', async () => {
    mockRetrieveSession.mockResolvedValueOnce({
      id: 'cs_paid_123',
      payment_status: 'paid',
      customer_email: 'applicant@example.com',
      metadata: { tier: '7D', userId: 'user-xyz', resumeId: 'resume-abc' },
    });

    const req = new NextRequest('http://localhost:3000/api/stripe/verify-payment', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'cs_paid_123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.paid).toBe(true);
    expect(data.status).toBe('paid');
    expect(data.customer_email).toBe('applicant@example.com');
    expect(data.metadata).toEqual({
      tier: '7D',
      userId: 'user-xyz',
      resumeId: 'resume-abc',
    });
  });

  it('should return 500 when Stripe retrieval fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRetrieveSession.mockRejectedValueOnce(new Error('Stripe API unreachable'));

    const req = new NextRequest('http://localhost:3000/api/stripe/verify-payment', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'cs_error_123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to verify payment');
    consoleSpy.mockRestore();
  });
});
