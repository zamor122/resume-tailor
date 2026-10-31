import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/**
 * Returns a Stripe client instance.
 * Lazily initialized to prevent build-time crashes when STRIPE_SECRET_KEY is not set
 * (e.g. during Next.js static page generation or preview deployments without Stripe secrets).
 */
export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured in environment variables.");
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2026-01-28.clover",
    });
  }
  return stripeInstance;
}

/**
 * Proxied Stripe instance that lazily initializes upon property access at runtime.
 * Prevents "Neither apiKey nor config.authenticator provided" during Next.js module evaluation at build time.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const instance = getStripe();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

export default stripe;
