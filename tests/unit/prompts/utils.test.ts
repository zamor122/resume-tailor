import { describe, it, expect } from 'vitest';
import {
  getJobTitleExtractionPrompt,
  getCompanyExtractionPrompt,
  getCompanyResearchPrompt,
  getJobDescriptionEnhancementPrompt,
  getDiffExplanationPrompt,
} from '@/app/prompts';

describe('Utility Prompts', () => {
  describe('getJobTitleExtractionPrompt', () => {
    it('should generate a job title extraction prompt', () => {
      const prompt = getJobTitleExtractionPrompt('Job description here');

      expect(prompt).toContain('job title analyzer');
      expect(prompt).toContain('Job description here');
      expect(prompt).toContain('jobTitle');
      expect(prompt).toContain('confidence');
    });
  });

  describe('getCompanyExtractionPrompt', () => {
    it('should generate a company extraction prompt', () => {
      const prompt = getCompanyExtractionPrompt('Job description');

      expect(prompt).toContain('company name');
      expect(prompt).toContain('job title');
      expect(prompt).toContain('Job description');
      expect(prompt).toContain('companyName');
      expect(prompt).toContain('jobTitle');
    });
  });

  describe('getCompanyResearchPrompt', () => {
    it('should generate a company research prompt', () => {
      const prompt = getCompanyResearchPrompt(
        'Tech Corp',
        'Software Engineer',
        'Job description'
      );

      expect(prompt).toContain('Tech Corp');
      expect(prompt).toContain('Software Engineer');
      expect(prompt).toContain('Job description');
      expect(prompt).toContain('companyInfo');
      expect(prompt).toContain('jobInfo');
    });
  });

  describe('getJobDescriptionEnhancementPrompt', () => {
    it('should generate a job description enhancement prompt', () => {
      const prompt = getJobDescriptionEnhancementPrompt(
        'Original job description',
        {
          industry: 'Tech',
          size: 'Large',
          culture: 'Innovative',
          values: ['Innovation', 'Quality'],
          keywords: ['JavaScript', 'React'],
        },
        {
          teamStructure: 'Agile',
          reporting: 'Manager',
          growth: 'Fast',
          priorities: ['Performance', 'Scalability'],
        }
      );

      expect(prompt).toContain('Original job description');
      expect(prompt).toContain('Tech');
      expect(prompt).toContain('Innovation');
      expect(prompt).toContain('JavaScript');
      expect(prompt).toContain('Agile');
      expect(prompt).toContain('Performance');
    });
  });

  describe('getDiffExplanationPrompt', () => {
    it('should generate a diff explanation prompt', () => {
      const changes = [
        {
          type: 'modified',
          original: 'Original text',
          tailored: 'New text',
          section: 'Experience',
        },
        {
          type: 'added',
          original: '',
          tailored: 'Added text',
          section: 'Skills',
        },
      ];

      const prompt = getDiffExplanationPrompt(changes, 'Job description');

      expect(prompt).toContain('resume optimizer');
      expect(prompt).toContain('Job description');
      expect(prompt).toContain('Original text');
      expect(prompt).toContain('New text');
      expect(prompt).toContain('Experience');
      expect(prompt).toContain('Skills');
      expect(prompt).toContain('explanation');
      expect(prompt).toContain('jobReason');
    });

    it('should handle empty changes array', () => {
      const prompt = getDiffExplanationPrompt([], 'Job description');

      expect(prompt).toContain('Job description');
      expect(prompt).toContain('Resume Changes');
    });
  });
});



