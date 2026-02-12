// DEPRECATED: This file is kept for compatibility but no longer used in time-based pricing system

export interface UpgradeOption {
  tier: string;
  price: number;
  priceDifference: number;
  label: string;
  description: string;
  dailyCost: string;
  savings?: string;
  isPopular?: boolean;
}

/**
 * @deprecated No longer used in time-based pricing system
 * Returns empty array as there are no upgrade tiers
 */
export function getUpgradeOptions(currentTier: string | null): UpgradeOption[] {
  return [];
}

/**
 * @deprecated No longer used in time-based pricing system
 */
export function calculatePriceDifference(fromTier: string | null, toTier: string): number {
  return 0;
}

/**
 * @deprecated No longer used in time-based pricing system
 */
export function getBestValueTier(): string {
  return '';
}

/**
 * @deprecated No longer used in time-based pricing system
 */
export function formatPriceDifference(difference: number): string {
  return '$0.00';
}

