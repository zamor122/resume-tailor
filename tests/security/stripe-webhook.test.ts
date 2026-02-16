import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/stripe/webhook/route';

process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_key';

vi.mock('stripe', () => ({
  default: class MockStripe {
    webhooks = {
      constructEvent: (body: string, signature: string, _secret: string) => {
        if (!signature || signature === 'invalid') {
          throw new Error('Signature verification failed');
        }
        return {
          type: 'checkout.session.completed',
          data: {
            object: {
              payment_status: 'paid',
              metadata: { tier: '7D', userId: 'user-1' },
            },
          },
        };
      },
    };
  },
}));

vi.mock('@/app/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('@/app/config/pricing', () => ({
  getTierConfig: vi.fn(() => ({ priceId: 'price_123' })),
}));

describe('Security: Stripe webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when stripe-signature header is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: '{}',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Missing signature');
  });

  it('should return 400 when signature is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      body: '{}',
      headers: { 'stripe-signature': 'invalid' },
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Signature verification failed');
  });
});
