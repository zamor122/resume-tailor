import { describe, it, expect } from 'vitest';
import {
  getRelevancyScorePrompt,
  getResumeValidationPrompt,
  getAIDetectionPrompt,
} from '@/app/prompts';

describe('Evaluation Prompts', () => {
  describe('getRelevancyScorePrompt', () => {
    it('should generate a relevancy score prompt', () => {
      const prompt = getRelevancyScorePrompt('Job description', 'Resume content');

      expect(prompt).toContain('ATS');
      expect(prompt).toContain('Job description');
      expect(prompt).toContain('Resume content');
      expect(prompt).toContain('0-100');
    });
  });

  describe('getResumeValidationPrompt', () => {
    it('should generate a validation prompt', () => {
      const prompt = getResumeValidationPrompt('Original resume', 'Tailored resume');

      expect(prompt).toContain('validation expert');
      expect(prompt).toContain('Original resume');
      expect(prompt).toContain('Tailored resume');
      expect(prompt).toContain('hallucinations');
      expect(prompt).toContain('fabrications');
      expect(prompt).toContain('isValid');
    });
  });

  describe('getAIDetectionPrompt', () => {
    it('should generate an AI detection prompt', () => {
      const prompt = getAIDetectionPrompt('Test text to analyze');

      expect(prompt).toContain('AI or a human');
      expect(prompt).toContain('Test text to analyze');
      expect(prompt).toContain('aiScore');
      expect(prompt).toContain('confidence');
      expect(prompt).toContain('indicators');
    });

    it('should truncate long text', () => {
      const longText = 'a'.repeat(10000);
      const prompt = getAIDetectionPrompt(longText);

      expect(prompt.length).toBeLessThan(longText.length);
      expect(prompt).toContain('Text to analyze:');
    });
  });
});



