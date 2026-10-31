import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/stripe/create-checkout/route';

const mockCreateSession = vi.fn();
const mockRequireAuth = vi.fn();
const mockVerifyUserIdMatch = vi.fn();
const mockGetTierConfig = vi.fn();

vi.mock('@/app/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: (...args: unknown[]) => mockCreateSession(...args),
      },
    },
  },
}));

vi.mock('@/app/utils/auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  verifyUserIdMatch: (...args: unknown[]) => mockVerifyUserIdMatch(...args),
}));

vi.mock('@/app/config/pricing', () => ({
  getTierConfig: (...args: unknown[]) => mockGetTierConfig(...args),
}));

vi.mock('@/app/utils/siteUrl', () => ({
  getURL: () => 'https://app.resumetailor.ai',
}));

describe('POST /api/stripe/create-checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ userId: 'user-123' });
    mockVerifyUserIdMatch.mockReturnValue({ ok: true });
    mockGetTierConfig.mockImplementation((tier: string) => {
      if (tier === '7D') return { tier: '7D', priceId: 'price_7d_test', durationDays: 7 };
      if (tier === '2D') return { tier: '2D', priceId: 'price_2d_test', durationDays: 2 };
      if (tier === '30D') return { tier: '30D', priceId: 'price_30d_test', durationDays: 30 };
      return undefined;
    });
    mockCreateSession.mockResolvedValue({
      id: 'cs_test_session_123',
      url: 'https://checkout.stripe.com/pay/cs_test_session_123',
    });
  });

  it('should return 401 when userId is missing from request body', async () => {
    const req = new NextRequest('http://localhost:3000/api/stripe/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ tier: '7D' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('Authentication required');
  });

  it('should return 401 when requireAuth rejects the request', async () => {
    mockRequireAuth.mockResolvedValueOnce({
      error: Response.json({ error: 'Invalid or expired session' }, { status: 401 }),
    });

    const req = new NextRequest('http://localhost:3000/api/stripe/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-123', tier: '7D' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid or expired session');
  });

  it('should return 403 when claimed userId does not match session', async () => {
    mockVerifyUserIdMatch.mockReturnValueOnce({
      error: Response.json({ error: 'User ID does not match authenticated session.' }, { status: 403 }),
    });

    const req = new NextRequest('http://localhost:3000/api/stripe/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ userId: 'attacker-id', tier: '7D' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('User ID does not match authenticated session.');
  });

  it('should return 400 when tier is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/stripe/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('tier is required');
  });

  it('should return 400 when tier price is not configured', async () => {
    mockGetTierConfig.mockReturnValueOnce(undefined);

    const req = new NextRequest('http://localhost:3000/api/stripe/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-123', tier: 'INVALID_TIER' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid tier or price not configured');
  });

  it('should successfully create checkout session with valid tier and return checkout URL', async () => {
    const req = new NextRequest('http://localhost:3000/api/stripe/create-checkout', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-123',
        tier: '7D',
        email: 'candidate@example.com',
        resumeId: 'resume-xyz',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe('https://checkout.stripe.com/pay/cs_test_session_123');
    expect(data.sessionId).toBe('cs_test_session_123');

    expect(mockCreateSession).toHaveBeenCalledWith({
      mode: 'payment',
      payment_method_types: ['card', 'amazon_pay'],
      allow_promotion_codes: true,
      line_items: [{ price: 'price_7d_test', quantity: 1 }],
      metadata: {
        tier: '7D',
        resumeId: 'resume-xyz',
        userId: 'user-123',
      },
      success_url: 'https://app.resumetailor.ai/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://app.resumetailor.ai/',
      customer_email: 'candidate@example.com',
    });
  });

  it('should sanitize returnUrl to prevent open redirects', async () => {
    // Malicious external returnUrl
    const reqMalicious = new NextRequest('http://localhost:3000/api/stripe/create-checkout', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-123',
        tier: '2D',
        returnUrl: 'https://evil-phishing-site.com/drain',
      }),
    });

    await POST(reqMalicious);
    expect(mockCreateSession).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cancel_url: 'https://app.resumetailor.ai/',
      })
    );

    // Legitimate same-origin returnUrl
    const reqLegit = new NextRequest('http://localhost:3000/api/stripe/create-checkout', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-123',
        tier: '2D',
        returnUrl: 'https://app.resumetailor.ai/pricing?ref=upgrade',
      }),
    });

    await POST(reqLegit);
    expect(mockCreateSession).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cancel_url: 'https://app.resumetailor.ai/pricing?ref=upgrade',
      })
    );
  });

  it('should return 500 when Stripe API fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCreateSession.mockRejectedValueOnce(new Error('Stripe network timeout'));

    const req = new NextRequest('http://localhost:3000/api/stripe/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-123', tier: '7D' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to create checkout session');
    consoleSpy.mockRestore();
  });
});
