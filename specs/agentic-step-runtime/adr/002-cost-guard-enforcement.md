# ADR-2: Cost-guard enforcement boundary & token budgets

## Context

The DESIGN requires machine-enforced $0 — no code path can auto-call a paid provider, no run can exceed its budget without a hard stop. The executor must be the sole enforcement point so that every pathway through a recipe hits the same gate.

## Decision

- The cost guard is a **single point** in the `StepRuntime` executor — `cost-guard.ts` classifies every model as `free` or `paid-opt-in` and the executor validates before every LLM-generating `StepFn`.
- No component outside the executor may call `createProvider` or `generateContent*` directly — the executor wraps those calls. If a step needs an LLM, it MUST go through the executor's `invokeLLM` (which checks the cost guard).
- Per-run token budgets are enforced by the executor calling `estimateTokens` (existing util, `text.length/4`) against the declared `maxTokens` on (a) the recipe (`RuntimeConfig.totalBudget`) and (b) each individual step (`StepSchema.maxTokens`). The executor hard-stops when budget is exceeded.
- `context.ts` selectors cap what any read/generation node receives (e.g., `experience: 4 most recent jobs`, `jd: first 1500 chars`), ensuring the prompt-side budget is enforced at the source.

## Consequences

- A single-file `cost-guard.ts` is the source of truth for free vs paid classification — a future paid-opt-in feature only edits this one file.
- The executor becomes inseparable from the cost guard — mocking/test environments will need to mock `invokeLLM` or use the real free providers.
- Token estimate is approximate (`chars/4`) — it's a hard cap on prompt size, not an exact billing counter; per-step context selectors handle the precision end.