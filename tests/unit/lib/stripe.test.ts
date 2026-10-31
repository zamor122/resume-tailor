import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("stripe client library", () => {
  const originalEnv = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = originalEnv;
  });

  it("should not throw on module import when STRIPE_SECRET_KEY is missing", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { stripe } = await import("@/app/lib/stripe");
    expect(stripe).toBeDefined();
  });

  it("should throw a descriptive error when accessing stripe properties without STRIPE_SECRET_KEY", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { stripe } = await import("@/app/lib/stripe");
    expect(() => stripe.checkout).toThrow(
      "STRIPE_SECRET_KEY is not configured in environment variables."
    );
  });

  it("should lazily instantiate Stripe when STRIPE_SECRET_KEY is set", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123456789";
    const { stripe, getStripe } = await import("@/app/lib/stripe");
    const instance = getStripe();
    expect(instance).toBeDefined();
    expect(stripe.checkout).toBeDefined();
  });
});
