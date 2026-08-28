import type { GenerateContentResult, ModelOptions } from '@/app/types/model';

// ---- step identity & classification ----

export type StepId = string;

/** Cost classification for any step that might call an LLM. */
export type CostClass = 'free' | 'paid-opt-in';

/** A key into context.ts selectors that names a slice of input data for a step. */
export type InputSelector = string;

// ---- step schema (the allowlist entry) ----

export interface StepSchema {
  id: StepId;
  description: string;
  /** Which input selectors this step requires. Resolved by context.ts. */
  requires: InputSelector[];
  /** Declared output schema shape (for validation; structural hint, not a runtime validator). */
  outputSchema: string;
  /** Cost class for any potential LLM invocation within this step. */
  costClass: CostClass;
  /** Maximum tokens this step may consume (prompt + completion together). Hard stop. */
  maxTokens: number;
}

// ---- step inputs (runtime-resolved) ----

/** What the executor passes into a step's implementation function. */
export interface StepInputs {
  [selector: string]: unknown;
}

// ---- step result ----

export interface StepResult<T = unknown> {
  stepId: StepId;
  ok: boolean;
  data?: T;
  error?: string;
  /** Tokens consumed by this step (actual, from provider usage metadata). */
  tokensUsed?: number;
}

// ---- recipe (was pipelines.ts) ----

export type RecipeId = string;

/** A single node in the recipe DAG. Parallel steps are grouped; sequential steps are ordered. */
export interface RecipeNode {
  stepId: StepId;
  /** Other nodes that must complete before this one runs. */
  dependsOn?: StepId[];
}

export interface RecipeConfig {
  id: RecipeId;
  name: string;
  description: string;
  nodes: RecipeNode[];
  /** Hard cap on token consumption across all nodes in this run. */
  totalBudget: number;
}

// ---- runtime config (per-run) ----

export type CostPolicy = 'free' | 'paid';

export interface RuntimeConfig {
  recipe: RecipeConfig;
  costPolicy: CostPolicy;
  /** User-supplied API keys for paid-opt-in providers (session-scoped). */
  userApiKeys?: Record<string, string>;
  /** Time budget for the full run (ms). Hard stop for any step that exceeds. */
  maxMs?: number;
  /** Env-driven feature flag: when false, routes through legacy path. */
  useLegacy?: boolean;
}

// ---- LLM invocation wrapper (the only path to a provider) ----

export type LLMInvokeFn = (
  prompt: string | string[],
  modelKey: string,
  options?: ModelOptions,
  apiKeys?: Record<string, string>
) => Promise<GenerateContentResult>;

// ---- step implementation signature ----

export type StepFn<T = unknown> = (
  inputs: StepInputs,
  invokeLLM: LLMInvokeFn
) => Promise<T>;

// ---- registry type ----

export type StepRegistry = Map<StepId, StepSchema>;