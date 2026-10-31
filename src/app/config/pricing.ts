/**
 * Time-based access pricing configuration
 * Users purchase access for a time period, not per-resume
 * This is NOT a subscription - users must purchase again when access expires
 */

/** Number of resumes every authenticated user gets for free (view + download) - first 3 by creation date */
export const FREE_RESUME_LIMIT = 3;

export interface TimeBasedTier {
  tier: '2D' | '7D' | '30D';
  priceId: string;
  price: number;
  label: string;
  description: string;
  durationDays: number;
  durationLabel: string;
  popular?: boolean;
}

/**
 * Stripe price ids are declared HERE, beside the display price, instead of being
 * read from STRIPE_PRICE_ID_* env vars.
 *
 * Why: when the advertised amount and the charged amount live in two different
 * places they drift. A stale env var silently makes the site advertise one price
 * while Stripe charges another — and nothing in the app can detect it. Keeping the
 * price id and the amount in the same object makes that impossible: changing a
 * price is a one-line edit to one file, and `price` must match the Stripe price.
 *
 * Changing a price therefore means: create the new Stripe price, then update both
 * `priceId` and `price` here together.
 *
 * Test-mode ids are used when the app runs against a test Stripe key, so local
 * development keeps working against the same amounts.
 */
const IS_TEST_MODE = (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_test_');

const STRIPE_PRICE_IDS: Record<TimeBasedTier['tier'], { live: string; test: string }> = {
  '2D': {
    live: 'price_1UWWMNC13jTu0IyNbytoqqBo',
    test: 'price_1UWWOoC13jTu0IyNgu19qjyC',
  },
  '7D': {
    live: 'price_1UWWMNC13jTu0IyNBbYsFakA',
    test: 'price_1UWWOpC13jTu0IyNTTflqNCC',
  },
  '30D': {
    live: 'price_1UWWMOC13jTu0IyNs5aTJlxJ',
    test: 'price_1UWWOpC13jTu0IyN3BNRH1hb',
  },
};

const priceIdFor = (tier: TimeBasedTier['tier']): string =>
  IS_TEST_MODE ? STRIPE_PRICE_IDS[tier].test : STRIPE_PRICE_IDS[tier].live;

export const TIME_BASED_TIERS: TimeBasedTier[] = [
  {
    tier: '2D',
    priceId: priceIdFor('2D'),
    price: 9.0,
    label: 'Sprint Pass',
    description: 'Perfect for urgent applications',
    durationDays: 2,
    durationLabel: '2 days',
  },
  {
    tier: '7D',
    priceId: priceIdFor('7D'),
    price: 19.0,
    label: 'Pro Week',
    description: 'Tailor unlimited resumes for a full week',
    durationDays: 7,
    durationLabel: '1 week',
    popular: true,
  },
  {
    tier: '30D',
    priceId: priceIdFor('30D'),
    price: 29.0,
    label: 'Job Search Month',
    description: 'Comprehensive access for your full job search',
    durationDays: 30,
    durationLabel: '1 month',
  },
];

/**
 * Get tier configuration by tier code
 */
export function getTierConfig(tier: '2D' | '7D' | '30D'): TimeBasedTier | undefined {
  return TIME_BASED_TIERS.find(t => t.tier === tier);
}

/**
 * Get all available tiers
 */
export function getAllTiers(): TimeBasedTier[] {
  return TIME_BASED_TIERS;
}

/**
 * Get default tier (most popular)
 */
export function getDefaultTier(): TimeBasedTier {
  return TIME_BASED_TIERS.find(t => t.popular) || TIME_BASED_TIERS[1]; // Default to 7D if no popular tier
}

/**
 * Non-subscription messaging
 */
export const NON_SUBSCRIPTION_MESSAGE = 'This is not a subscription. You purchase access for a specific time period. When your access expires, you can purchase again if needed.';

/**
 * Value bullets for time-based access
 */
export const TIME_BASED_VALUE_BULLETS = [
  '✓ Unlimited resume tailoring during access period',
  '✓ Download all resumes',
  '✓ Full access to all improvements',
  '✓ No subscription - one-time payment',
];
