import { describe, it, expect } from 'vitest';
import {
  getUpgradeOptions,
  calculatePriceDifference,
  getBestValueTier,
  formatPriceDifference,
} from '@/app/utils/upgradeCalculator';

describe('upgradeCalculator utilities', () => {
  describe('getUpgradeOptions', () => {
    it('should return empty array (deprecated function)', () => {
      expect(getUpgradeOptions(null)).toEqual([]);
      expect(getUpgradeOptions('2D')).toEqual([]);
    });
  });

  describe('calculatePriceDifference', () => {
    it('should return 0 (deprecated function)', () => {
      expect(calculatePriceDifference(null, '7D')).toBe(0);
      expect(calculatePriceDifference('2D', '30D')).toBe(0);
    });
  });

  describe('getBestValueTier', () => {
    it('should return empty string (deprecated function)', () => {
      expect(getBestValueTier()).toBe('');
    });
  });

  describe('formatPriceDifference', () => {
    it('should return $0.00 (deprecated function)', () => {
      expect(formatPriceDifference(100)).toBe('$0.00');
      expect(formatPriceDifference(-50)).toBe('$0.00');
      expect(formatPriceDifference(0)).toBe('$0.00');
    });
  });
});



