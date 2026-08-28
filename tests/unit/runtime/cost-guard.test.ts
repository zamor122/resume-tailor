import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  classifyProvider,
  checkPayGate,
  resolveStepModel,
  getFallbackChainFor,
  FREE_FALLBACK_CHAIN,
} from '@/app/runtime/cost-guard';
import type { CostPolicy } from '@/app/runtime/types';

// Mock getModelConfig to avoid real env key lookups in tests.
vi.mock('@/app/config/models', () => ({
  getModelConfig: (key: string) => {
    const catalog: Record<string, { apiKeyEnvVar?: string }> = {
      'cerebras:gpt-oss-120b': { apiKeyEnvVar: 'CEREBRAS_API_KEY' },
      'gemini:gemini-2.5-flash-lite': { apiKeyEnvVar: 'GEMINI_API_KEY' },
      'groq:llama-3.3-70b-versatile': { apiKeyEnvVar: 'GROQ_API_KEY' },
      'openai:gpt-4o': { apiKeyEnvVar: 'OPENAI_API_KEY' },
      'anthropic:claude-3-5-haiku-20241022': { apiKeyEnvVar: 'ANTHROPIC_API_KEY' },
      'deepseek:deepseek-chat': { apiKeyEnvVar: 'DEEPSEEK_API_KEY' },
      'mistral:mistral-small-latest': { apiKeyEnvVar: 'MISTRAL_API_KEY' },
    };
    return catalog[key] ?? null;
  },
  parseModelKey: (key: string) => {
    const [provider, ...rest] = key.split(':');
    return { provider, modelId: rest.join(':') };
  },
}));

describe('Cost guard', () => {
  describe('classifyProvider', () => {
    it('classifies cerebras as free', () => {
      expect(classifyProvider('cerebras')).toBe('free');
    });
    it('classifies gemini as free', () => {
      expect(classifyProvider('gemini')).toBe('free');
    });
    it('classifies groq as free', () => {
      expect(classifyProvider('groq')).toBe('free');
    });
    it('classifies openai as paid-opt-in', () => {
      expect(classifyProvider('openai')).toBe('paid-opt-in');
    });
    it('classifies anthropic as paid-opt-in', () => {
      expect(classifyProvider('anthropic')).toBe('paid-opt-in');
    });
    it('classifies deepseek as paid-opt-in', () => {
      expect(classifyProvider('deepseek')).toBe('paid-opt-in');
    });
    it('defaults unknown providers to paid-opt-in (fail safe)', () => {
      expect(classifyProvider('some-fake-provider')).toBe('paid-opt-in');
    });
  });

  describe('checkPayGate — free models always allowed', () => {
    it('allows cerebras:gpt-oss-120b with costPolicy free', () => {
      const result = checkPayGate('cerebras:gpt-oss-120b', 'free');
      expect(result.allowed).toBe(true);
    });
    it('allows gemini:gemini-2.5-flash-lite with costPolicy paid', () => {
      const result = checkPayGate('gemini:gemini-2.5-flash-lite', 'paid');
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkPayGate — paid models only with opt-in + key', () => {
    it('refuses openai:gpt-4o without paid policy', () => {
      const result = checkPayGate('openai:gpt-4o', 'free');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('costPolicy');
    });
    it('refuses openai:gpt-4o with paid policy but no user key', () => {
      const result = checkPayGate('openai:gpt-4o', 'paid');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('OPENAI_API_KEY');
    });
    it('allows openai:gpt-4o with paid policy + valid user key', () => {
      const result = checkPayGate('openai:gpt-4o', 'paid', {
        OPENAI_API_KEY: 'sk-user-123',
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkPayGate — unknown model fails', () => {
    it('returns not allowed for an unregistered model key', () => {
      const result = checkPayGate('bogus:model-x', 'free');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Unknown model');
    });
  });

  describe('resolveStepModel', () => {
    it('returns cerebras for tailor node', () => {
      expect(resolveStepModel('tailor')).toBe('cerebras:gpt-oss-120b');
    });
    it('returns gemini for readResume node', () => {
      expect(resolveStepModel('readResume')).toBe('gemini:gemini-2.5-flash-lite');
    });
    it('returns user-provided model when specified', () => {
      expect(resolveStepModel('tailor', 'groq:llama-3.3-70b-versatile')).toBe(
        'groq:llama-3.3-70b-versatile',
      );
    });
    it('returns cerebras as default for unknown step ids', () => {
      expect(resolveStepModel('some-unknown-step')).toBe('cerebras:gpt-oss-120b');
    });
  });

  describe('getFallbackChainFor', () => {
    it('returns remaining chain after the current model', () => {
      const chain = getFallbackChainFor('cerebras:gpt-oss-120b');
      expect(chain).toEqual([
        'gemini:gemini-2.5-flash-lite',
        'groq:llama-3.3-70b-versatile',
      ]);
    });

    it('returns empty when at the last model', () => {
      const chain = getFallbackChainFor('groq:llama-3.3-70b-versatile');
      expect(chain).toEqual([]);
    });

    it('returns full chain for a model not in the free list', () => {
      const chain = getFallbackChainFor('openai:gpt-4o');
      expect(chain).toEqual([...FREE_FALLBACK_CHAIN]);
    });
  });

  describe('FREE_FALLBACK_CHAIN', () => {
    it('contains only three diverse providers', () => {
      expect(FREE_FALLBACK_CHAIN).toHaveLength(3);
      const providers = FREE_FALLBACK_CHAIN.map((k) => k.split(':')[0]);
      expect(new Set(providers).size).toBe(3); // diverse — no single-provider dep
    });

    it('contains no paid-opt-in providers', () => {
      for (const key of FREE_FALLBACK_CHAIN) {
        const provider = key.split(':')[0];
        expect(classifyProvider(provider)).toBe('free');
      }
    });
  });
});