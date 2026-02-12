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

export const TIME_BASED_TIERS: TimeBasedTier[] = [
  {
    tier: '2D',
    priceId: process.env.STRIPE_PRICE_ID_2D || '',
    price: 4.95,
    label: '2-Day Access',
    description: 'Perfect for urgent applications',
    durationDays: 2,
    durationLabel: '2 days',
  },
  {
    tier: '7D',
    priceId: process.env.STRIPE_PRICE_ID_7D || '',
    price: 10.00,
    label: '1-Week Access',
    description: 'Tailor unlimited resumes for a full week',
    durationDays: 7,
    durationLabel: '1 week',
    popular: true,
  },
  {
    tier: '30D',
    priceId: process.env.STRIPE_PRICE_ID_30D || '',
    price: 20.00,
    label: '1-Month Access',
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

