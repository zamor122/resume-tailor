import { describe, it, expect } from 'vitest';
import {
  getFontSizeClass,
  getProseFontSizeClass,
  getInputFontSizeClass,
} from '@/app/utils/fontSize';

describe('fontSize utilities', () => {
  describe('getFontSizeClass', () => {
    it('should return correct class for small font size', () => {
      expect(getFontSizeClass('small')).toBe('text-xs');
    });

    it('should return correct class for medium font size', () => {
      expect(getFontSizeClass('medium')).toBe('text-sm');
    });

    it('should return correct class for large font size', () => {
      expect(getFontSizeClass('large')).toBe('text-base');
    });

    it('should default to medium when no argument provided', () => {
      expect(getFontSizeClass()).toBe('text-sm');
    });
  });

  describe('getProseFontSizeClass', () => {
    it('should return correct class for small prose font size', () => {
      expect(getProseFontSizeClass('small')).toBe('prose-sm');
    });

    it('should return correct class for medium prose font size', () => {
      expect(getProseFontSizeClass('medium')).toBe('prose');
    });

    it('should return correct class for large prose font size', () => {
      expect(getProseFontSizeClass('large')).toBe('prose-lg');
    });

    it('should default to medium when no argument provided', () => {
      expect(getProseFontSizeClass()).toBe('prose');
    });
  });

  describe('getInputFontSizeClass', () => {
    it('should return correct class for small input font size', () => {
      expect(getInputFontSizeClass('small')).toBe('text-xs');
    });

    it('should return correct class for medium input font size', () => {
      expect(getInputFontSizeClass('medium')).toBe('text-sm');
    });

    it('should return correct class for large input font size', () => {
      expect(getInputFontSizeClass('large')).toBe('text-base');
    });

    it('should default to medium when no argument provided', () => {
      expect(getInputFontSizeClass()).toBe('text-sm');
    });
  });
});



