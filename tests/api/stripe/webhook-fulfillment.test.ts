import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/stripe/webhook/route';

const mockInsertAccessGrants = vi.fn();
const mockInsertPayments = vi.fn();
const mockListLineItems = vi.fn();
const mockConstructEvent = vi.fn();

vi.mock('@/app/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
    checkout: {
      sessions: {
        listLineItems: (...args: unknown[]) => mockListLineItems(...args),
      },
    },
  },
}));

vi.mock('@/app/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'access_grants') {
        return {
          insert: (...args: unknown[]) => mockInsertAccessGrants(...args),
        };
      }
      if (table === 'payments') {
        return {
          insert: (...args: unknown[]) => mockInsertPayments(...args),
        };
      }
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    },
  },
}));

vi.mock('@/app/config/pricing', () => ({
  getTierConfig: (tier: string) => {
    if (tier === '7D') return { tier: '7D', priceId: 'price_7d', durationDays: 7 };
    if (tier === '2D') return { tier: '2D', priceId: 'price_2d', durationDays: 2 };
    if (tier === '30D') return { tier: '30D', priceId: 'price_30d', durationDays: 30 };
    return undefined;
  },
}));

describe('Stripe Webhook Fulfillment & Lifecycle', () => {
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_valid_secret';
    mockInsertAccessGrants.mockResolvedValue({ error: null });
    mockInsertPayments.mockResolvedValue({ error: null });
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: 'price_7d' } }],
    });
  });

  describe('GET /api/stripe/webhook', () => {
    it('returns health check status and indicates if webhook secret is configured', async () => {
      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.hasSecret).toBe(true);
    });
  });

  describe('POST /api/stripe/webhook - Configuration & Validation', () => {
    it('should return 500 when STRIPE_WEBHOOK_SECRET is unconfigured or invalid format', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: '{}',
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Webhook secret not configured');
      consoleSpy.mockRestore();
    });

    it('should return 400 when stripe signature is missing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Missing signature');
      consoleSpy.mockRestore();
    });

    it('should return 400 when constructEvent throws signature error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConstructEvent.mockImplementationOnce(() => {
        throw new Error('Signature mismatch');
      });

      const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'stripe-signature': 'invalid_sig' },
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Webhook signature verification failed');
      consoleSpy.mockRestore();
    });
  });

  describe('POST /api/stripe/webhook - Fulfillment Processing', () => {
    it('should acknowledge non-checkout events without granting access', async () => {
      mockConstructEvent.mockReturnValueOnce({
        type: 'customer.subscription.updated',
        data: { object: {} },
      });

      const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);
      expect(mockInsertAccessGrants).not.toHaveBeenCalled();
      expect(mockInsertPayments).not.toHaveBeenCalled();
    });

    it('should ignore checkout.session.completed when payment_status is not paid', async () => {
      mockConstructEvent.mockReturnValueOnce({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_unpaid_123',
            payment_status: 'unpaid',
            metadata: { tier: '7D', userId: 'user-1' },
          },
        },
      });

      const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);
      expect(mockInsertAccessGrants).not.toHaveBeenCalled();
      expect(mockInsertPayments).not.toHaveBeenCalled();
    });

    it('should ignore checkout.session.completed when tier is missing or invalid', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConstructEvent.mockReturnValueOnce({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_badtier_123',
            payment_status: 'paid',
            metadata: { tier: 'UNKNOWN_TIER', userId: 'user-1' },
          },
        },
      });

      const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockInsertAccessGrants).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should successfully grant access and insert payment record for paid 7D tier', async () => {
      const mockSession = {
        id: 'cs_success_7d',
        payment_status: 'paid',
        payment_intent: 'pi_test_123',
        amount_total: 1000,
        total_details: { amount_discount: 200 },
        metadata: {
          tier: '7D',
          userId: 'user-candidate-123',
          resumeId: 'resume-tailored-999',
        },
      };

      mockConstructEvent.mockReturnValueOnce({
        type: 'checkout.session.completed',
        data: { object: mockSession },
      });

      const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);

      // Verify access_grants insert
      expect(mockInsertAccessGrants).toHaveBeenCalledTimes(1);
      const grantPayload = mockInsertAccessGrants.mock.calls[0][0];
      expect(grantPayload.user_id).toBe('user-candidate-123');
      expect(grantPayload.stripe_session_id).toBe('cs_success_7d');
      expect(grantPayload.tier_purchased).toBe('7D');
      expect(grantPayload.is_active).toBe(true);
      expect(grantPayload.payment_timestamp).toBeDefined();
      expect(grantPayload.expires_at).toBeDefined();

      const paymentDate = new Date(grantPayload.payment_timestamp);
      const expiryDate = new Date(grantPayload.expires_at);
      const diffDays = Math.round((expiryDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);

      // Verify payments audit insert
      expect(mockInsertPayments).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-candidate-123',
          resume_id: 'resume-tailored-999',
          stripe_session_id: 'cs_success_7d',
          stripe_payment_intent_id: 'pi_test_123',
          stripe_price_id: 'price_7d',
          amount_cents: 1000,
          currency: 'usd',
          status: 'completed',
          metadata: {
            tier: '7D',
            source: 'access_grant',
            amount_discount: 200,
          },
        })
      );
    });

    it('should handle idempotent duplicate webhooks gracefully without crashing (code 23505)', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockConstructEvent.mockReturnValueOnce({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_duplicate_session',
            payment_status: 'paid',
            metadata: { tier: '2D', userId: 'user-duplicate' },
          },
        },
      });

      // Simulate Postgres unique constraint violation
      mockInsertAccessGrants.mockResolvedValueOnce({
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      });

      const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Webhook] Duplicate session, skipping:'),
        'cs_duplicate_session'
      );
      consoleWarnSpy.mockRestore();
    });
  });
});
