# ADR-1: Step-to-model mapping & free-only fallback chain

## Context

The engine has nine providers and 25+ configured model keys. The prior `FALLBACK_MODELS` list mixed paid with free models (OpenAI, Anthropic, DeepSeek non-free tier). The DESIGN calls for a deterministic step-runtime where default execution costs $0 by only calling free-tier providers automatically.

## Decision

- Default generator for the `tailor` node: `cerebras:gpt-oss-120b` — the most capable open-weight model on a real free tier (120B, 1M tokens/day, 65K context), already `DEFAULT_MODEL_KEY` in both local and production environments.
- Token-light read nodes (`readResume`, `extractKeywords`, `researchCompany`): default to `gemini:gemini-2.5-flash-lite` (1,000 req/day), preserving the generous Cerebras quota for the heavy generation step.
- `groq:llama-3.3-70b-versatile` is the fast different-provider fallback when Gemini/Cerebras free tiers are simultaneously exhausted.
- Automatic fallback chain is exactly these three — diverse providers so a single quota can't take down the whole pipeline.
- Paid models (`openai:*`, `anthropic:*`, `mistral:*`) and the non-free `deepseek:*` line are reachable only via explicit user key + `costPolicy:'paid'` — they never auto-fallback.

## Consequences

- The free chain has lower headroom (token/day constraints) than paid providers; heavy runs may exhaust it. The cost guard fails loudly rather than silently escalating — users see a clear quota-exhausted message.
- The step-to-model mapping is encoded in `cost-guard.ts` (`classifyProvider` + `resolveStepModel`), not in `models.ts` directly, so the model catalog stays descriptive and the enforcement lives in the runtime.
- Adding a new free provider means registering it in `cost-guard.ts` AND confirming quota constraints.