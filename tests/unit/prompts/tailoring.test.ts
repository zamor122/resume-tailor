import { describe, it, expect } from 'vitest';
import { getTailoringPrompt } from '@/app/prompts';

describe('Tailoring Prompts', () => {
  describe('getTailoringPrompt', () => {
    it('should generate a prompt with all required parameters', () => {
      const prompt = getTailoringPrompt({
        baselineScore: 50,
        targetScore: 70,
        targetImprovement: 20,
        sortedMissing: ['React', 'TypeScript'],
        keywordContext: 'JavaScript, Node.js',
        companyContext: 'Tech Corp (Software)',
        resume: 'Test resume content',
        cleanJobDescription: 'Test job description',
      });

      expect(prompt).toContain('50');
      expect(prompt).toContain('70');
      expect(prompt).toContain('20');
      expect(prompt).toContain('React');
      expect(prompt).toContain('TypeScript');
      expect(prompt).toContain('JavaScript, Node.js');
      expect(prompt).toContain('Tech Corp (Software)');
      expect(prompt).toContain('Test resume content');
      expect(prompt).toContain('Test job description');
      expect(prompt).toContain('MISSING KEYWORDS THAT MUST BE ADDED');
    });

    it('should handle empty missing keywords', () => {
      const prompt = getTailoringPrompt({
        baselineScore: 60,
        targetScore: 80,
        targetImprovement: 20,
        sortedMissing: [],
        resume: 'Resume',
        cleanJobDescription: 'Job',
      });

      expect(prompt).toContain('60');
      expect(prompt).toContain('80');
      expect(prompt).not.toContain('MISSING KEYWORDS THAT MUST BE ADDED');
      expect(prompt).toContain('Extract and incorporate ALL key terms');
    });

    it('should include all sections of the prompt', () => {
      const prompt = getTailoringPrompt({
        baselineScore: 55,
        targetScore: 75,
        targetImprovement: 20,
        sortedMissing: ['Express'],
        resume: 'Resume',
        cleanJobDescription: 'Job',
      });

      expect(prompt).toContain('ATS optimization specialist');
      expect(prompt).toContain('EXACT TERMINOLOGY MATCHING');
      expect(prompt).toContain('KEYWORD DENSITY & PLACEMENT');
      expect(prompt).toContain('SKILL ALIGNMENT');
      expect(prompt).toContain('SECTION-BY-SECTION OPTIMIZATION');
      expect(prompt).toContain('CONTENT ENHANCEMENT STRATEGIES');
      expect(prompt).toContain('Return JSON');
    });

    it('should include DE-AI-IFY banned phrases and ATS safety rules', () => {
      const prompt = getTailoringPrompt({
        baselineScore: 55,
        targetScore: 75,
        targetImprovement: 20,
        sortedMissing: ['Express'],
        resume: 'Resume',
        cleanJobDescription: 'Job',
      });

      expect(prompt).toContain('DE-AI-IFY');
      expect(prompt).toContain('culture-focused approach');
      expect(prompt).toContain('security-first design patterns');
      expect(prompt).toContain('AI-enhanced');
      expect(prompt).toContain('PREFER CONCRETE OVER ABSTRACT');
      expect(prompt).toContain('ATS SAFETY RULE');
      expect(prompt).toContain('preserve job-critical terms');
    });
  });
});



