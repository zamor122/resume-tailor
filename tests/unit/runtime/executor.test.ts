import { describe, it, expect, vi } from 'vitest';

vi.mock('@/app/runtime/registry', () => ({
  assertRegistered: vi.fn((id: string) => ({
    id, description: `test: ${id}`, requires: [], outputSchema: 'any', costClass: 'free', maxTokens: 0,
  })),
  getStepSchema: vi.fn(),
  isRegistered: vi.fn(() => true),
  getAllSchemas: vi.fn(() => []),
}));

vi.mock('@/app/runtime/context', () => ({
  resolveStepInputs: vi.fn((_: string[], s: Record<string, unknown>) => ({ ...s })),
  validateSelectors: vi.fn(),
}));

vi.mock('@/app/runtime/cost-guard', () => ({
  checkPayGate: vi.fn(() => ({ allowed: true })),
  getFallbackChainFor: vi.fn(() => []),
}));

vi.mock('@/app/services/model-fallback', () => ({
  generateWithFallback: vi.fn().mockResolvedValue({ text: 'mock', usage: { totalTokens: 50 } }),
}));

vi.mock('@/app/utils/apiRateLimiter', () => ({ estimateTokens: vi.fn(() => 10) }));

import { executeRecipe } from '@/app/runtime/executor';
import type { RuntimeConfig, StepFn, StepId } from '@/app/runtime/types';

function cfg(
  id: string,
  nodes: Array<{ stepId: string; dependsOn?: string[] }>,
  budget = 5000,
): RuntimeConfig {
  return {
    recipe: { id, name: id, description: '', nodes, totalBudget: budget },
    costPolicy: 'free',
    useLegacy: true,
  };
}

describe('StepRuntime — executor', () => {
  it('executes single-node', async () => {
    const fn = vi.fn().mockResolvedValue({ done: true });
    const fm = new Map<StepId, StepFn>([['stepA', fn]]);
    const { results } = await executeRecipe(fm, cfg('t', [{ stepId: 'stepA' }]), {});
    expect(fn).toHaveBeenCalledTimes(1);
    expect(results.get('stepA')?.ok).toBe(true);
  });

  it('respects DAG order', async () => {
    const c: string[] = [];
    const fa = vi.fn(async () => { c.push('A'); return 'a'; });
    const fb = vi.fn(async () => { c.push('B'); return 'b'; });
    const fm = new Map<StepId, StepFn>([['a', fa], ['b', fb]]);
    await executeRecipe(fm, cfg('s', [{ stepId: 'a' }, { stepId: 'b', dependsOn: ['a'] }]), {});
    expect(c).toEqual(['A', 'B']);
  });

  it('runs independent nodes in parallel', async () => {
    let r = 0, mx = 0, d: string[] = [];
    const mk = (n: string) => vi.fn(async () => {
      r++; if (r > mx) mx = r;
      await new Promise((y) => setTimeout(y, 5));
      d.push(n); r--; return n;
    });
    const fm = new Map<StepId, StepFn>([['a', mk('A')], ['b', mk('B')]]);
    await executeRecipe(fm, cfg('p', [{ stepId: 'a' }, { stepId: 'b' }]), {});
    expect(d).toHaveLength(2);
    expect(mx).toBe(2);
  });
it('passes output downstream via session', async () => {
    const fu = vi.fn(async () => ({ up: 42 }));
    const fd = vi.fn(async () => ({ ok: true }));
    const fm = new Map<StepId, StepFn>([['u', fu], ['d', fd]]);
    const { session } = await executeRecipe(fm, cfg('p', [
      { stepId: 'u' }, { stepId: 'd', dependsOn: ['u'] },
    ]), {});
    expect(session.u).toEqual({ up: 42 });
  });

  it('throws on DAG deadlock', async () => {
    const fm = new Map<StepId, StepFn>([['a', vi.fn()], ['b', vi.fn()]]);
    await expect(executeRecipe(fm, cfg('d', [
      { stepId: 'a', dependsOn: ['b'] }, { stepId: 'b', dependsOn: ['a'] },
    ]), {})).rejects.toThrow('DAG deadlock');
  });

  it('throws when step has no fn', async () => {
    await expect(executeRecipe(new Map(), cfg('m', [{ stepId: 'x' }]), {}))
      .rejects.toThrow('No implementation');
  });

  it('marks step failed when fn throws', async () => {
    const ff = vi.fn(async () => { throw new Error('broke'); });
    const fm = new Map<StepId, StepFn>([['f', ff]]);
    const { results } = await executeRecipe(fm, cfg('f', [{ stepId: 'f' }]), {});
    expect(results.get('f')?.ok).toBe(false);
    expect(results.get('f')?.error).toContain('broke');
  });
});
