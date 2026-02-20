import { describe, it, expect } from 'vitest';
import {
  validateQuality,
  normalizeAIPhrasing,
  measureAuthenticity,
} from '@/app/utils/qualityAssurance';

describe('qualityAssurance utilities', () => {
  it('normalizes common AI-sounding phrases', () => {
    const input = 'Results-driven engineer who can leverage best practices and utilize modern tooling.';
    const output = normalizeAIPhrasing(input);

    expect(output.text).toContain('outcome-focused');
    expect(output.text).toContain('use production standards');
    expect(output.replacements).toBeGreaterThan(0);
  });

  it('measures authenticity signals', () => {
    const text = `
- Developed APIs for billing and search
- Developed dashboards for product analytics
- Developed CI workflows for deployment
I improved release quality with team support.
`;

    const metrics = measureAuthenticity(text);

    expect(metrics.repetitiveBulletStarts).toBeGreaterThan(0);
    expect(metrics.firstPersonPronounHits).toBeGreaterThan(0);
    expect(metrics.aiSmellScore).toBeGreaterThan(0);
  });

  it('keeps quality score healthy for quantified concrete text', () => {
    const original = 'Built internal systems.';
    const improved = 'Built internal systems that reduced support tickets by 22% across 3 quarters.';

    const metrics = validateQuality(original, improved);

    expect(metrics.hasMetrics).toBe(true);
    expect(metrics.overallScore).toBeGreaterThan(50);
  });
});
