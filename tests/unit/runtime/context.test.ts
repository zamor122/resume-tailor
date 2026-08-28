import { describe, it, expect } from 'vitest';
import { resolveStepInputs, validateSelectors } from '@/app/runtime/context';

describe('Context selectors', () => {
  const session = {
    resume: 'Senior developer with 10 years experience.',
    jobDescription: 'Hiring a lead engineer.',
    parsedResume: { name: 'Test', experience: [] },
    keywords: { critical: ['React'], technical: [] },
    companyContext: { name: 'Acme', industry: 'SaaS' },
    metrics: { wordCount: 200 },
    baselineScore: 72,
    tailoredResume: 'Optimized resume text.',
    customInstructions: 'Emphasize leadership.',
    keywordsToWeave: ['TypeScript', 'GraphQL'],
    promptPresetIds: ['leadership'],
    sessionId: 'sess-123',
    userId: 'user-456',
  };

  it('resolves a subset of selectors', () => {
    const inputs = resolveStepInputs(['resume', 'jobDescription'], session);
    expect(inputs.resume).toBe(session.resume);
    expect(inputs.jobDescription).toBe(session.jobDescription);
    expect(inputs.parsedResume).toBeUndefined();
  });

  it('resolves parsedResume and keywords', () => {
    const inputs = resolveStepInputs(['parsedResume', 'keywords'], session);
    expect(inputs.parsedResume).toEqual(session.parsedResume);
    expect(inputs.keywords).toEqual(session.keywords);
  });

  it('resolves metrics, baselineScore, and companyContext', () => {
    const inputs = resolveStepInputs(['metrics', 'baselineScore', 'companyContext'], session);
    expect(inputs.metrics).toEqual(session.metrics);
    expect(inputs.baselineScore).toBe(72);
    expect(inputs.companyContext).toEqual(session.companyContext);
  });

  it('returns empty string for missing string selectors', () => {
    const inputs = resolveStepInputs(['customInstructions'], {});
    expect(inputs.customInstructions).toBe('');
  });

  it('returns null for missing object selectors', () => {
    const inputs = resolveStepInputs(['parsedResume', 'metrics'], {});
    expect(inputs.parsedResume).toBeNull();
    expect(inputs.metrics).toBeNull();
  });

  it('throws for an unknown selector', () => {
    expect(() => resolveStepInputs(['resume', 'doesNotExist'], session)).toThrow(
      /Unknown input selector/,
    );
  });

  describe('validateSelectors', () => {
    it('passes for valid selectors', () => {
      expect(() => validateSelectors(['resume', 'jobDescription'])).not.toThrow();
    });

    it('throws for an unknown selector', () => {
      expect(() => validateSelectors(['bogusSelector'])).toThrow(
        /Unknown input selector/,
      );
    });
  });
});