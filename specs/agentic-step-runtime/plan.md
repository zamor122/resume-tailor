# plan.md — Agentic Step-Runtime Refactor

Placement: `feature_id: agentic-step-runtime` · owner: Shay Zamora

## Placement

All local work lands under `src/app/runtime/` (new engine) plus targeted, backward-compatible edits to existing routes/config. The feature folder (`specs/agentic-step-runtime/`) holds spec + contracts. The effort-level DESIGN `docs/AGENTIC_TAILOR_REFACTOR.md` is the trio input and is NOT rewritten here.

## Reuse map (exact existing paths — no re-derivation)

| Need | Existing artifact | Use |
| --- | --- | --- |
| Model dispatch + fallback | `src/app/services/ai-provider.ts` (`generateContentWithFallback`, `getModelProvider`), `src/app/services/model-fallback.ts` (`generateWithFallback`) | Runtime LLM nodes call these. |
| Model catalog | `src/app/config/models.ts` (`MODEL_CONFIGS`, `DEFAULT_MODEL`, `FALLBACK_MODELS`, `parseModelKey`, `getModelConfig`) | Cost-guard classification + free-only chain. |
| Model preference from session | `src/app/utils/model-helper.ts` (`getModelFromSession`) | Resolve user/step model + session API keys. |
| Token estimate | `src/app/utils/apiRateLimiter.ts` (`estimateTokens`) | Executor budget enforcement. |
| Deterministic primitives | `src/app/utils/atsSanitizer.ts`, `resumeSectionDedupe.ts`, `educationValidator.ts`, `contactBlockSanitizer.ts`, `keywordParenthesesCleaner.ts`, `resumeReassemble.ts`, `qualityAssurance.ts`, `resume-metrics.ts`, `resumeObfuscator.ts`, `keyword-extraction.ts` | Bucket-A / post-gen steps. |
| SSE emit helpers + cache | `src/app/utils/mcp-tools.ts` (keyed TTL cache, `executeParallel`), `humanize/stream/route.ts` (`sendSSE`) | Runtime caching + SSE adapter. |
| Recipe ids | `src/app/config/pipelines.ts` (`INTENT_PIPELINES`) | Runtime `recipes.ts` maps these. |
| Tool ids | `src/app/config/agent-tools.ts` (`AGENT_TOOLS`) | Runtime registry step ids. |

## Design decisions → ADRs

- Step-to-model mapping & free chain, cost-guard enforcement, skills-market-value determinism, sessions storage, cron out of scope → recorded in `adr/` (post-gate step 5); effort-level decisions remain in DESIGN §9.

## Contracts to produce

Consumed from `contracts/` (already authored): `openapi.yaml` (SSE + pipeline/tailor facades, EARS-annotated), `runtime.feature` (behavior per EARS), plus contract test schemas enumerated in `tasks.md` for each of the 17 routes.

## Decomposition into MRs (1-to-few; none depends on another)

- **MR-1 `runtime-engine`** — `src/app/runtime/*` (types, cost-guard, context, registry, executor, recipes) + unit tests. Self-contained; nothing depends on it at runtime until wired.
- **MR-2 `free-first-config`** — free-only `FALLBACK_MODELS`/cost policy in `config/models.ts` + README/adr note. Independent.
- **MR-3 `flagship-recipe`** — `humanize/stream` runs `apply_to_job` behind `STEP_RUNTIME` flag (SSE preserved), remove `127.0.0.1` debug blocks. Depends on MR-1 only via imports.
- **MR-4 `bucket-a-determinism`** — convert the deterministic routes (ats-simulator, format-validator, resume-versions, validate-resume, keyword-analyzer) off the LLM.
- **MR-5 `bucket-b-c-facades`** — the read/generation nodes + recipe facades (tailor, pipeline, mcp-tools).
- **MR-6 `ci-guard`** — LLM-boundary grep in CI + verification ledger close-out.

MR-2 and MR-6 are independent and safe to land alone; MR-3/4/5 each keep `STEP_RUNTIME=false` rollback.