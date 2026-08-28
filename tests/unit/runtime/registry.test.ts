import { describe, it, expect } from 'vitest';
import {
  getStepSchema,
  getAllSchemas,
  isRegistered,
  assertRegistered,
} from '@/app/runtime/registry';

describe('Step registry', () => {
  const coreSteps = [
    'readResume',
    'extractKeywords',
    'researchCompany',
    'tailor',
    'parseNormalize',
    'metricsContext',
    'baselineScore',
    'reScore',
    'sanitize',
    'assemble',
  ];

  it('all core steps are registered', () => {
    for (const id of coreSteps) {
      expect(isRegistered(id)).toBe(true);
    }
  });

  it('returns a schema for every core step', () => {
    for (const id of coreSteps) {
      const schema = getStepSchema(id);
      expect(schema).toBeDefined();
      expect(schema!.id).toBe(id);
    }
  });

  it('returns undefined for an unregistered step', () => {
    expect(getStepSchema('not-a-real-step')).toBeUndefined();
    expect(isRegistered('something-else')).toBe(false);
  });

  it('assertRegistered throws for an unregistered step', () => {
    expect(() => assertRegistered('missing')).toThrow(
      /Unregistered step.*allowlist/,
    );
  });

  it('assertRegistered returns the schema for a registered step', () => {
    const schema = assertRegistered('tailor');
    expect(schema.id).toBe('tailor');
    expect(schema.costClass).toBe('free');
    expect(schema.maxTokens).toBeGreaterThan(0);
  });

  it('all registered schemas have valid selectors in their requires lists', () => {
    for (const schema of getAllSchemas()) {
      expect(schema.id).toBeTruthy();
      expect(Array.isArray(schema.requires)).toBe(true);
      expect(schema.outputSchema).toBeTruthy();
      expect(['free', 'paid-opt-in']).toContain(schema.costClass);
      expect(typeof schema.maxTokens).toBe('number');
    }
  });

  it('no two steps share the same id', () => {
    const all = getAllSchemas();
    const ids = all.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('deterministic steps have maxTokens = 0', () => {
    const deterministic = ['parseNormalize', 'metricsContext', 'baselineScore', 'reScore', 'sanitize', 'assemble'];
    for (const id of deterministic) {
      const schema = getStepSchema(id);
      expect(schema?.maxTokens).toBe(0);
    }
  });
});