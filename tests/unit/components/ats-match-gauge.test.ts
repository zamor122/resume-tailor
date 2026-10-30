import { describe, it, expect } from 'vitest';
import {
  clampScore,
  getMatchBand,
  getBandMeta,
  type MatchBand,
} from '@/app/components/AtsMatchGauge';

describe('AtsMatchGauge helpers', () => {
  describe('clampScore', () => {
    it('rounds and clamps into the 0–100 range', () => {
      expect(clampScore(72.4)).toBe(72);
      expect(clampScore(72.6)).toBe(73);
      expect(clampScore(-5)).toBe(0);
      expect(clampScore(140)).toBe(100);
    });

    it('returns 0 for NaN / non-numbers', () => {
      expect(clampScore(NaN)).toBe(0);
      expect(clampScore(undefined as unknown as number)).toBe(0);
    });
  });

  describe('getMatchBand', () => {
    it('bands scores at the documented thresholds', () => {
      expect(getMatchBand(100)).toBe('strong');
      expect(getMatchBand(85)).toBe('strong');
      expect(getMatchBand(84)).toBe('good');
      expect(getMatchBand(70)).toBe('good');
      expect(getMatchBand(69)).toBe('fair');
      expect(getMatchBand(50)).toBe('fair');
      expect(getMatchBand(49)).toBe('weak');
      expect(getMatchBand(0)).toBe('weak');
    });
  });

  describe('getBandMeta', () => {
    it('returns a distinct stroke colour per band', () => {
      const bands: MatchBand[] = ['strong', 'good', 'fair', 'weak'];
      const strokes = bands.map((b) => getBandMeta(b).stroke);
      expect(new Set(strokes).size).toBe(4);
    });
  });
});
