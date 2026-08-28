# tasks.md — Agentic Step-Runtime Refactor

Legend: **EARS** = spec criterion (locked 1:1) · **Contract** = artifact/schema in `contracts/` · **Named test** = failing test that proves it (in `runtime.test.ts` or route contract tests) · **Touches** = globs · **Size** = S | M · **MR**.

## Task table (T1..Tn)

| Task | EARS | Contract | Named test | Touches | Size | MR |
| --- | --- | --- | --- | --- | --- | --- |
| T1 runtime types + registry allowlist, fail-closed | @EARS-1 | runtime.feature:1 | `registry fails closed on undeclared fn/input` | `src/app/runtime/types.ts`, `registry.ts` | S | MR-1 |
| T2 cost-guard classification + refuse-to-pay | @EARS-2,9 | runtime.feature:2,8 | `cost-guard refuses without opt-in+nested key`, `free-only defaults` | `src/app/runtime/cost-guard.ts` | M | MR-1 |
| T3 executor: budget + selectors + fail-closed run | @EARS-8 | runtime.feature:7 | `executor hard-stops at per-run budget` | `src/app/runtime/executor.ts`, `context.ts` | M | MR-1 |
| T4 free fallback chain, no paid escalation | @EARS-4 | runtime.feature:3 | `fallback hits free chain only` | `src/app/runtime/executor.ts`, `cost-guard.ts` | M | MR-1 |
| T5 apply_to_job recipe + SSE preservation | @EARS-3,5 | openapi.yaml | `apply_to_job emits preserved SSE` | `src/app/runtime/recipes.ts`, `humanize/stream/route.ts` | M | MR-3 |
| T6 LLM confined to read/generation nodes | @EARS-7 | runtime.feature:5 | `LLM-boundary grep = 0` | `src/app/runtime/registry.ts` + CI script | S | MR-6 |
| T7 bucket-A routes deterministic (no LLM) | @EARS-6 | runtime.feature:4 | per-route schema + `no LLM import` | `api/tools/{ats-simulator,format-validator,resume-versions,keyword-analyzer}`, `api/validate-resume` | M | MR-4 |
| T8 free-only default/fallback config | @EARS-9 | runtime.feature:8 | `FALLBACK_MODELS excludes paid+deepseek` | `src/app/config/models.ts` | S | MR-2 |
| T9 score parity vs legacy | @EARS-11 | — (parity corpus) | `deterministic score within ±2 on ≥95%` | `src/app/runtime/` scorers, `utils/resume-metrics.ts` | M | MR-4 |
| T10 rollback path when `STEP_RUNTIME=false` | @EARS-10 | runtime.feature:9 | `flag-off routes legacy` | `humanize/stream`, facades | S | MR-3 |
| T11 remove debug + legacy monolith | @EARS-12 | runtime.feature:10 | `no 127.0.0.1 / no monolith grep` | `humanize/stream/route.ts` | S | MR-3 |
| T12 CI boundary + budget guardrails | @EARS-7,8 | runtime.feature:5 | CI step passes | `.github/workflows/*` + `scripts/check.boundary.sh` | S | MR-6 |

## MR rollup (branch per feature `agentic-step-runtime/…`)

| MR | Branch | Tasks | Depends on |
| --- | --- | --- | --- |
| MR-1 runtime-engine | `agentic-step-runtime/runtime-engine` | T1 T2 T3 T4 | — |
| MR-2 free-first-config | `agentic-step-runtime/free-first-config` | T8 | — |
| MR-3 flagship-recipe | `agentic-step-runtime/flagship-recipe` | T5 T10 T11 | MR-1 |
| MR-4 bucket-a-determinism | `agentic-step-runtime/bucket-a-determinism` | T7 T9 | MR-1 |
| MR-5 bucket-bc-facades | `agentic-step-runtime/bucket-bc-facades` | (bucket-B/C nodes) | MR-1 |
| MR-6 ci-guard | `agentic-step-runtime/ci-guard` | T6 T12 | — |

No MR depends on another MR whose work must merge first; MR-3/4/5 rely only on MR-1 artifacts via imports and keep `STEP_RUNTIME=false` rollback.