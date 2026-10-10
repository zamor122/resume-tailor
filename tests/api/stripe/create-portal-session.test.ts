import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/stripe/create-portal-session/route';

const mockListCustomers = vi.fn();
const mockCreateCustomer = vi.fn();
const mockCreatePortalSession = vi.fn();
const mockRequireAuthWithEmail = vi.fn();

vi.mock('@/app/lib/stripe', () => ({
  stripe: {
    customers: {
      list: (...args: unknown[]) => mockListCustomers(...args),
      create: (...args: unknown[]) => mockCreateCustomer(...args),
    },
    billingPortal: {
      sessions: {
        create: (...args: unknown[]) => mockCreatePortalSession(...args),
      },
    },
  },
}));

vi.mock('@/app/utils/auth', () => ({
  requireAuthWithEmail: (...args: unknown[]) => mockRequireAuthWithEmail(...args),
}));

vi.mock('@/app/utils/siteUrl', () => ({
  getURL: () => 'https://app.resumetailor.ai',
}));

describe('POST /api/stripe/create-portal-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuthWithEmail.mockResolvedValue({
      userId: 'user-123',
      email: 'user@example.com',
    });
    mockListCustomers.mockResolvedValue({
      data: [{ id: 'cus_existing_123' }],
    });
    mockCreatePortalSession.mockResolvedValue({
      url: 'https://billing.stripe.com/p/session/portal_123',
    });
  });

  it('should return 401 when user is unauthenticated', async () => {
    mockRequireAuthWithEmail.mockResolvedValueOnce({
      error: Response.json({ error: 'Authentication required. Please sign in.' }, { status: 401 }),
    });

    const req = new NextRequest('http://localhost:3000/api/stripe/create-portal-session', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('should return 400 when no email or customerId is resolved', async () => {
    mockRequireAuthWithEmail.mockResolvedValueOnce({
      userId: 'user-123',
      email: undefined,
    });

    const req = new NextRequest('http://localhost:3000/api/stripe/create-portal-session', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Unable to resolve customer');
  });

  it('should reuse existing Stripe customer if found by email', async () => {
    mockListCustomers.mockResolvedValueOnce({
      data: [{ id: 'cus_found_456' }],
    });

    const req = new NextRequest('http://localhost:3000/api/stripe/create-portal-session', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe('https://billing.stripe.com/p/session/portal_123');
    expect(mockCreateCustomer).not.toHaveBeenCalled();
    expect(mockCreatePortalSession).toHaveBeenCalledWith({
      customer: 'cus_found_456',
      return_url: 'https://app.resumetailor.ai/profile',
    });
  });

  it('should create new Stripe customer if not found by email', async () => {
    mockListCustomers.mockResolvedValueOnce({
      data: [],
    });
    mockCreateCustomer.mockResolvedValueOnce({
      id: 'cus_new_789',
    });

    const req = new NextRequest('http://localhost:3000/api/stripe/create-portal-session', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockCreateCustomer).toHaveBeenCalledWith({
      email: 'user@example.com',
    });
    expect(mockCreatePortalSession).toHaveBeenCalledWith({
      customer: 'cus_new_789',
      return_url: 'https://app.resumetailor.ai/profile',
    });
  });

  it('should sanitize returnUrl to prevent open redirects', async () => {
    // Malicious external URL
    const reqMalicious = new NextRequest('http://localhost:3000/api/stripe/create-portal-session', {
      method: 'POST',
      body: JSON.stringify({
        customerId: 'cus_direct_123',
        returnUrl: 'https://phishing.com/account',
      }),
    });

    await POST(reqMalicious);
    expect(mockCreatePortalSession).toHaveBeenLastCalledWith({
      customer: 'cus_direct_123',
      return_url: 'https://app.resumetailor.ai/profile',
    });

    // Valid same-origin URL
    const reqValid = new NextRequest('http://localhost:3000/api/stripe/create-portal-session', {
      method: 'POST',
      body: JSON.stringify({
        customerId: 'cus_direct_123',
        returnUrl: 'https://app.resumetailor.ai/settings',
      }),
    });

    await POST(reqValid);
    expect(mockCreatePortalSession).toHaveBeenLastCalledWith({
      customer: 'cus_direct_123',
      return_url: 'https://app.resumetailor.ai/settings',
    });
  });

  it('should return 500 when billing portal creation fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCreatePortalSession.mockRejectedValueOnce(new Error('Stripe portal down'));

    const req = new NextRequest('http://localhost:3000/api/stripe/create-portal-session', {
      method: 'POST',
      body: JSON.stringify({ customerId: 'cus_123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to create portal session');
    consoleSpy.mockRestore();
  });
});
