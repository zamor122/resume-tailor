import { getModelConfig, parseModelKey } from '@/app/config/models';
import type { CostClass, CostPolicy, StepId } from './types';

// ---------------------------------------------------------------
// Provider classification (free vs paid-opt-in)
// ---------------------------------------------------------------

const FREE_PROVIDERS = new Set(['cerebras', 'gemini', 'groq', 'huggingface', 'openrouter']);
const PAID_OPT_IN_PROVIDERS = new Set(['openai', 'anthropic', 'mistral', 'deepseek']);

// DeepSeek is marked "No free tier" in models.ts, so it goes in paid-opt-in.
// OpenRouter may have free-rate models, but we gate it as paid-opt-in unless
// the specific model is verified free.

export function classifyProvider(provider: string): CostClass {
  if (FREE_PROVIDERS.has(provider)) return 'free';
  if (PAID_OPT_IN_PROVIDERS.has(provider)) return 'paid-opt-in';
  // Unknown providers default to paid-opt-in (fail safe — don't auto-spend).
  return 'paid-opt-in';
}

// ---------------------------------------------------------------
// Free-only fallback chain (diverse providers; no single-key dep)
// ---------------------------------------------------------------

/** The ONLY models ever used in automatic (free) fallback. */
export const FREE_FALLBACK_CHAIN = [
  'cerebras:gpt-oss-120b',
  'gemini:gemini-2.5-flash-lite',
  'groq:llama-3.3-70b-versatile',
] as const;

// ---------------------------------------------------------------
// Step-to-model mapping (best-for-free)
// ---------------------------------------------------------------

/** Heavy generation node → most capable free model. */
const HEAVY_GEN_STEPS = new Set<StepId>(['tailor']);
/** Token-light read nodes → fastest free model to preserve heavy quota. */
const READ_STEPS = new Set<StepId>(['readResume', 'extractKeywords', 'researchCompany']);

export function resolveStepModel(stepId: StepId, userModelKey?: string): string {
  // User override always wins (e.g., from session preferences).
  if (userModelKey) return userModelKey;

  // Heavy nodes get the most capable free model.
  if (HEAVY_GEN_STEPS.has(stepId)) return FREE_FALLBACK_CHAIN[0]; // cerebras:gpt-oss-120b
  // Light read nodes get the fastest model to preserve quota.
  if (READ_STEPS.has(stepId)) return FREE_FALLBACK_CHAIN[1]; // gemini:gemini-2.5-flash-lite
  // Default: first free model.
  return FREE_FALLBACK_CHAIN[0];
}

// ---------------------------------------------------------------
// Refuse-to-pay enforcement
// ---------------------------------------------------------------

export interface PayGateResult {
  allowed: boolean;
  reason?: string;
}

export function checkPayGate(
  modelKey: string,
  costPolicy: CostPolicy,
  userApiKeys?: Record<string, string>
): PayGateResult {
  const config = getModelConfig(modelKey);
  if (!config) {
    return { allowed: false, reason: `Unknown model: ${modelKey}` };
  }

  const { provider } = parseModelKey(modelKey);
  const costClass = classifyProvider(provider);

  // Free models always allowed regardless of policy.
  if (costClass === 'free') return { allowed: true };

  // Paid model requires explicit opt-in + a valid user key.
  if (costPolicy !== 'paid') {
    return {
      allowed: false,
      reason: `Model ${modelKey} is ${costClass}. Requires costPolicy:'paid' + user-supplied API key.`,
    };
  }

  const envVar = config.apiKeyEnvVar;
  // A user-supplied key covering this provider must exist.
  if (!envVar || !userApiKeys?.[envVar]) {
    return {
      allowed: false,
      reason: `Paid model ${modelKey} requires user-supplied key in ${envVar}.`,
    };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------
// Fallback chain resolver (in-order, no paid escalation)
// ---------------------------------------------------------------

export function getFallbackChainFor(modelKey: string): string[] {
  const idx = FREE_FALLBACK_CHAIN.indexOf(
    modelKey as (typeof FREE_FALLBACK_CHAIN)[number]
  );
  if (idx === -1) {
    // If the primary isn't in the free chain, start from chain[0].
    return [...FREE_FALLBACK_CHAIN];
  }
  // Return everything after the current model (inclusive of next, not repeat-self).
  return [...FREE_FALLBACK_CHAIN.slice(idx + 1)];
}