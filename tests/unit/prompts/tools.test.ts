import { describe, it, expect } from 'vitest';
import {
  getKeywordAnalyzerPrompt,
  getSkillsGapPrompt,
  getMultiJobComparisonPrompt,
  getATSOptimizerPrompt,
  getATSSimulatorPrompt,
  getInterviewPrepPrompt,
  getResumeStorytellerPrompt,
  getResumeVersionAnalysisPrompt,
  getResumeVersionComparisonPrompt,
  getSkillsMarketValuePrompt,
  getFormatValidatorPrompt,
} from '@/app/prompts';

describe('Tool Prompts', () => {
  describe('getKeywordAnalyzerPrompt', () => {
    it('should generate a keyword analyzer prompt', () => {
      const prompt = getKeywordAnalyzerPrompt('Job description', 'Technology');

      expect(prompt).toContain('keywords');
      expect(prompt).toContain('Job description');
      expect(prompt).toContain('Technology');
      expect(prompt).toContain('technical');
      expect(prompt).toContain('soft');
      expect(prompt).toContain('keywordDensity');
    });

    it('should work without industry', () => {
      const prompt = getKeywordAnalyzerPrompt('Job description');

      expect(prompt).toContain('Job description');
      expect(prompt).not.toContain('Industry:');
    });
  });

  describe('getSkillsGapPrompt', () => {
    it('should generate a skills gap prompt', () => {
      const prompt = getSkillsGapPrompt('Resume content', 'Job description');

      expect(prompt).toContain('skills gap');
      expect(prompt).toContain('Resume content');
      expect(prompt).toContain('Job description');
      expect(prompt).toContain('matchScore');
      expect(prompt).toContain('matched');
      expect(prompt).toContain('missing');
    });
  });

  describe('getMultiJobComparisonPrompt', () => {
    it('should generate a multi-job comparison prompt', () => {
      const prompt = getMultiJobComparisonPrompt('Resume', ['Job 1', 'Job 2']);

      expect(prompt).toContain('Resume');
      expect(prompt).toContain('Job 1');
      expect(prompt).toContain('Job 2');
      expect(prompt).toContain('overallAnalysis');
      expect(prompt).toContain('jobComparisons');
    });
  });

  describe('getATSOptimizerPrompt', () => {
    it('should generate an ATS optimizer prompt', () => {
      const prompt = getATSOptimizerPrompt('Resume', 'Job description', 60);

      expect(prompt).toContain('ATS optimization expert');
      expect(prompt).toContain('Resume');
      expect(prompt).toContain('Job description');
      expect(prompt).toContain('60');
      expect(prompt).toContain('quickWins');
      expect(prompt).toContain('keywordOptimization');
    });

    it('should work without current score', () => {
      const prompt = getATSOptimizerPrompt('Resume', 'Job description');

      expect(prompt).toContain('Resume');
      expect(prompt).toContain('Not provided');
    });
  });

  describe('getATSSimulatorPrompt', () => {
    it('should generate an ATS simulator prompt', () => {
      const prompt = getATSSimulatorPrompt('Resume content');

      expect(prompt).toContain('ATS');
      expect(prompt).toContain('simulator');
      expect(prompt).toContain('Resume content');
      expect(prompt).toContain('atsScore');
      expect(prompt).toContain('parsedData');
      expect(prompt).toContain('workday');
      expect(prompt).toContain('taleo');
    });
  });

  describe('getInterviewPrepPrompt', () => {
    it('should generate an interview prep prompt', () => {
      const prompt = getInterviewPrepPrompt('Resume', 'Job description');

      expect(prompt).toContain('interview preparation');
      expect(prompt).toContain('Resume');
      expect(prompt).toContain('Job description');
      expect(prompt).toContain('behavioral');
      expect(prompt).toContain('technical');
      expect(prompt).toContain('STAR');
    });

    it('should work without resume', () => {
      const prompt = getInterviewPrepPrompt('', 'Job description');

      expect(prompt).toContain('Job description');
    });
  });

  describe('getResumeStorytellerPrompt', () => {
    it('should generate a resume storyteller prompt', () => {
      const prompt = getResumeStorytellerPrompt('Resume', 'Job description');

      expect(prompt).toContain('compelling narrative');
      expect(prompt).toContain('Resume');
      expect(prompt).toContain('Job description');
      expect(prompt).toContain('narrativeScore');
      expect(prompt).toContain('narrativeArc');
    });

    it('should work without job description', () => {
      const prompt = getResumeStorytellerPrompt('Resume');

      expect(prompt).toContain('Resume');
    });
  });

  describe('getResumeVersionAnalysisPrompt', () => {
    it('should generate a version analysis prompt', () => {
      const prompt = getResumeVersionAnalysisPrompt('Resume content');

      expect(prompt).toContain('Resume content');
      expect(prompt).toContain('jobTitle');
      expect(prompt).toContain('keyStrengths');
      expect(prompt).toContain('wordCount');
      expect(prompt).toContain('atsScore');
    });
  });

  describe('getResumeVersionComparisonPrompt', () => {
    it('should generate a version comparison prompt', () => {
      const prompt = getResumeVersionComparisonPrompt(
        { content: 'Version 1', timestamp: '2024-01-01' },
        { content: 'Version 2', timestamp: '2024-01-02' }
      );

      expect(prompt).toContain('Version 1');
      expect(prompt).toContain('Version 2');
      expect(prompt).toContain('2024-01-01');
      expect(prompt).toContain('2024-01-02');
      expect(prompt).toContain('improvements');
      expect(prompt).toContain('regressions');
    });
  });

  describe('getSkillsMarketValuePrompt', () => {
    it('should generate a skills market value prompt', () => {
      const prompt = getSkillsMarketValuePrompt('Resume', 'San Francisco', 'Technology');

      expect(prompt).toContain('market value');
      expect(prompt).toContain('Resume');
      expect(prompt).toContain('San Francisco');
      expect(prompt).toContain('Technology');
      expect(prompt).toContain('skillsAnalysis');
      expect(prompt).toContain('salaryPotential');
    });

    it('should work without location and industry', () => {
      const prompt = getSkillsMarketValuePrompt('Resume');

      expect(prompt).toContain('Resume');
    });
  });

  describe('getFormatValidatorPrompt', () => {
    it('should generate a format validator prompt', () => {
      const prompt = getFormatValidatorPrompt('Resume content');

      expect(prompt).toContain('ATS compatibility');
      expect(prompt).toContain('Resume content');
      expect(prompt).toContain('atsCompatible');
      expect(prompt).toContain('issues');
      expect(prompt).toContain('sectionAnalysis');
    });
  });
});



