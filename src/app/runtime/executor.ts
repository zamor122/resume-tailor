import { assertRegistered } from './registry';
import { resolveStepInputs } from './context';
import {
  checkPayGate,
  getFallbackChainFor,
} from './cost-guard';
import { generateWithFallback } from '@/app/services/model-fallback';
import { estimateTokens } from '@/app/utils/apiRateLimiter';
import type {
  StepId,
  StepResult,
  StepFn,
  RuntimeConfig,
  LLMInvokeFn,
  StepInputs,
} from './types';

// ---------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------

interface RunState {
  session: Record<string, unknown>;
  results: Map<StepId, StepResult>;
  tokensUsed: number;
  startMs: number;
}

// ---------------------------------------------------------------
// LLM invocation wrapper — the ONLY path to an LLM.
// ---------------------------------------------------------------

function createLLMInvoker(
  config: RuntimeConfig,
  state: RunState
): LLMInvokeFn {
  return async (prompt, modelKey, options, apiKeys) => {
    const gate = checkPayGate(modelKey, config.costPolicy, apiKeys ?? config.userApiKeys);
    if (!gate.allowed) {
      throw new Error(`Cost guard blocked: ${gate.reason}`);
    }

    const promptTokens = estimateTokens(
      typeof prompt === 'string' ? prompt : prompt.join('\n')
    );
    const maxNewTokens = options?.maxTokens ?? 4096;
    const stepTokens = promptTokens + maxNewTokens;
    if (state.tokensUsed + stepTokens > config.recipe.totalBudget) {
      throw new Error(
        `Token budget exceeded: ${state.tokensUsed + stepTokens} > ${config.recipe.totalBudget}`
      );
    }
    state.tokensUsed += stepTokens;

    if (config.maxMs && Date.now() - state.startMs > config.maxMs) {
      throw new Error('Run duration budget exceeded.');
    }

    const fallback = getFallbackChainFor(modelKey);
    return generateWithFallback(prompt, modelKey, options, apiKeys ?? config.userApiKeys, {
      fallbackModels: fallback,
    });
  };
}

// ---------------------------------------------------------------
// Step execution
// ---------------------------------------------------------------

async function executeStep<T>(
  stepId: StepId,
  fn: StepFn<T>,
  config: RuntimeConfig,
  state: RunState
): Promise<StepResult<T>> {
  try {
    const schema = assertRegistered(stepId);
    const inputs = resolveStepInputs(schema.requires, state.session);
    const invokeLLM = createLLMInvoker(config, state);
    const start = Date.now();
    const data = await fn(inputs, invokeLLM);
    return { stepId, ok: true, data, tokensUsed: state.tokensUsed };
  } catch (err: any) {
    return { stepId, ok: false, error: err?.message ?? String(err) };
  }
}

// ---------------------------------------------------------------
// DAG execution
// ---------------------------------------------------------------

export async function executeRecipe(
  fnMap: Map<StepId, StepFn>,
  config: RuntimeConfig,
  initialSession: Record<string, unknown>
): Promise<{
  results: Map<StepId, StepResult>;
  session: Record<string, unknown>;
}> {
  const state: RunState = {
    session: { ...initialSession },
    results: new Map(),
    tokensUsed: 0,
    startMs: Date.now(),
  };

  const completed = new Set<StepId>();
  const nodes = [...config.recipe.nodes];

  while (completed.size < nodes.length) {
    const ready = nodes.filter(
      (n) =>
        !completed.has(n.stepId) &&
        (!n.dependsOn || n.dependsOn.every((d) => completed.has(d))),
    );

    if (ready.length === 0) {
      const remaining = nodes
        .filter((n) => !completed.has(n.stepId))
        .map((n) => n.stepId);
      throw new Error(
        `DAG deadlock — remaining: ${remaining.join(', ')}`,
      );
    }

    const results = await Promise.all(
      ready.map(async (node) => {
        const fn = fnMap.get(node.stepId);
        if (!fn) {
          throw new Error(`No implementation for step: ${node.stepId}`);
        }
        return executeStep(node.stepId, fn, config, state);
      }),
    );

    for (let i = 0; i < ready.length; i++) {
      const result = results[i];
      state.results.set(ready[i].stepId, result);
      completed.add(ready[i].stepId);
      if (result.ok && result.data !== undefined) {
        state.session[ready[i].stepId] = result.data;
      }
    }
  }

  return { results: state.results, session: state.session };
}