import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const geminiGenerate = vi.fn();
const groqGenerate = vi.fn();
const openaiGenerate = vi.fn();

vi.mock('@/app/services/providers/gemini', () => ({
  GeminiProvider: class {
    provider = 'gemini';
    getModelId() {
      return 'gemini-2.5-flash';
    }
    isAvailable() {
      return true;
    }
    generateContent(prompt: unknown, options?: unknown) {
      return geminiGenerate(prompt, options);
    }
  },
}));

vi.mock('@/app/services/providers/groq', () => ({
  GroqProvider: class {
    provider = 'groq';
    getModelId() {
      return 'llama-3.3-70b-versatile';
    }
    isAvailable() {
      return true;
    }
    generateContent(prompt: unknown, options?: unknown) {
      return groqGenerate(prompt, options);
    }
  },
}));

vi.mock('@/app/services/providers/openai', () => ({
  OpenAIProvider: class {
    provider = 'openai';
    getModelId() {
      return 'gpt-4o-mini';
    }
    isAvailable() {
      return true;
    }
    generateContent(prompt: unknown, options?: unknown) {
      return openaiGenerate(prompt, options);
    }
  },
}));

import { generateContentWithFallback } from '@/app/services/ai-provider';

/**
 * AUDIT.md F10 — the cost guard must be enforced on the main path, not only in
 * the runtime executor. Before this fix the fallback chain ended with a
 * hard-coded paid model, so a stray OPENAI_API_KEY in the environment would
 * silently route production traffic to a paid provider with no opt-in.
 *
 * Note: generateContentWithFallback skips any model whose API key is missing, so
 * the free providers' keys must be set here for the chain to be exercised at all.
 * The decisive case forces every FREE provider to fail — under the old
 * behaviour the chain would then reach the paid tail and call OpenAI.
 */
describe('generateContentWithFallback — cost guard on the main path (F10)', () => {
  const KEYS = ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'GROQ_API_KEY'] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of KEYS) saved[k] = process.env[k];
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.OPENAI_API_KEY = 'sk-test-should-never-be-used';

    geminiGenerate.mockReset().mockResolvedValue({ text: 'gemini-ok' });
    groqGenerate.mockReset().mockResolvedValue({ text: 'groq-ok' });
    openaiGenerate.mockReset().mockResolvedValue({ text: 'openai-ok' });
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('does NOT fall through to a paid provider when every free model fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    geminiGenerate.mockRejectedValue(new Error('gemini down'));
    groqGenerate.mockRejectedValue(new Error('groq down'));

    await expect(generateContentWithFallback('hello')).rejects.toThrow();

    // The whole point: the paid provider must never have been attempted.
    expect(openaiGenerate).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('serves free models normally and never touches a paid provider', async () => {
    const res = await generateContentWithFallback('hello');

    expect(res.text).toBe('gemini-ok');
    expect(geminiGenerate).toHaveBeenCalled();
    expect(openaiGenerate).not.toHaveBeenCalled();
  });

  it('falls back to another FREE model when the requested free model fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    groqGenerate.mockRejectedValue(new Error('groq down'));

    const res = await generateContentWithFallback(
      'hello',
      'groq:llama-3.3-70b-versatile'
    );

    expect(res.text).toBe('gemini-ok');
    expect(openaiGenerate).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
