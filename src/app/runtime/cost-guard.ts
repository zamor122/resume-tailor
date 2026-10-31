import { getModelConfig, parseModelKey } from '@/app/config/models';
import type { CostClass, CostPolicy, StepId } from './types';

// ---------------------------------------------------------------
// Provider classification (free vs paid-opt-in)
// ---------------------------------------------------------------

const FREE_PROVIDERS = new Set(['cerebras', 'gemini', 'groq', 'huggingface']);
const PAID_OPT_IN_PROVIDERS = new Set(['openai', 'anthropic', 'mistral', 'deepseek', 'openrouter']);

// Penny providers are operator-funded gateways whose per-run cost is negligible
// (target <$0.005). Unlike paid-opt-in providers they do NOT require a
// user-supplied key — the server-side key pays — but they are still refused
// when that server-side key is absent. See mission-control.md §2.3.
const PENNY_PROVIDERS = new Set(['cline']);

// DeepSeek is marked "No free tier" in models.ts, so it goes in paid-opt-in.
// OpenRouter is an aggregator: it CAN serve free-rate models, but the model key
// alone doesn't prove a specific model is free, so it is gated as paid-opt-in
// (fail safe — an OpenRouter key must never silently buy a paid model).

export function classifyProvider(provider: string): CostClass {
  if (FREE_PROVIDERS.has(provider)) return 'free';
  if (PENNY_PROVIDERS.has(provider)) return 'penny';
  if (PAID_OPT_IN_PROVIDERS.has(provider)) return 'paid-opt-in';
  // Unknown providers default to paid-opt-in (fail safe — don't auto-spend).
  return 'paid-opt-in';
}

// ---------------------------------------------------------------
// Free-only fallback chain (diverse providers; no single-key dep)
// ---------------------------------------------------------------

/** The ONLY models ever used in automatic (free) fallback. */
export const FREE_FALLBACK_CHAIN = [
  'gemini:gemini-2.5-flash',
  'groq:llama-3.3-70b-versatile',
  'gemini:gemini-2.5-flash-lite',
] as const;

// ---------------------------------------------------------------
// Step-to-model mapping (best-for-free)
// ---------------------------------------------------------------

/** Heavy generation node → most capable free model. */
const HEAVY_GEN_STEPS = new Set<StepId>(['tailor']);
/** Structured-extraction nodes → penny engine (cheap JSON extraction). */
const STRUCTURED_STEPS = new Set<StepId>(['extractKeywords']);
/** Token-light read nodes → fastest free model to preserve heavy quota. */
const READ_STEPS = new Set<StepId>(['readResume', 'extractKeywords', 'researchCompany']);

/**
 * Penny engine — DeepSeek v4.1 Flash via ClinePass (operator-funded).
 * Preferred for heavy generation + structured extraction when its server-side
 * key is present. Any failure falls back to the free chain (see
 * getFallbackChainFor + generateContentWithFallback), so cost cannot escalate.
 */
export const PENNY_MODEL = 'cline:cline-pass/deepseek-v4.1-flash';

function pennyAvailable(): boolean {
  const config = getModelConfig(PENNY_MODEL);
  return !!(config?.apiKeyEnvVar && process.env[config.apiKeyEnvVar]);
}

export function resolveStepModel(stepId: StepId, userModelKey?: string): string {
  // User override always wins (e.g., from session preferences).
  if (userModelKey) return userModelKey;

  // Penny engine for heavy generation + structured extraction when the
  // server-side key is present (cheap, operator-funded, <$0.005/run).
  if (pennyAvailable() && (HEAVY_GEN_STEPS.has(stepId) || STRUCTURED_STEPS.has(stepId))) {
    return PENNY_MODEL;
  }

  // Heavy nodes get the most capable free model.
  if (HEAVY_GEN_STEPS.has(stepId)) return FREE_FALLBACK_CHAIN[0]; // gemini:gemini-2.5-flash
  // Light read nodes get the fastest model to preserve quota.
  if (READ_STEPS.has(stepId)) return FREE_FALLBACK_CHAIN[2]; // gemini:gemini-2.5-flash-lite
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

  // Penny models (operator-funded, <$0.005/run) are allowed whenever the
  // server-side key is configured — no user key or costPolicy:'paid' required.
  if (costClass === 'penny') {
    const envVar = config.apiKeyEnvVar;
    if (envVar && process.env[envVar]) return { allowed: true };
    return {
      allowed: false,
      reason: `Penny model ${modelKey} requires server-side key in ${envVar}.`,
    };
  }

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