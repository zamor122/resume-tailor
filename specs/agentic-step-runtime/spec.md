---
feature_id: "agentic-step-runtime"
feature_name: "Agentic step-runtime refactor for the resume tailoring engine"
status: "In progress — entry gate signed, implementation underway"
owner: "Shayne Zamora"
source-design: "docs/AGENTIC_TAILOR_REFACTOR.md (effort-level DESIGN / trio input)"
std: "SDD Authoring Contract — docs/SDD_AUTHORING_CONTRACT.md (sdd-docs)"
---

# spec.md — Agentic Step-Runtime Refactor

## Context

The resume-tailoring engine runs through a monolithic SSE route (`api/humanize/stream`) that feeds an entire resume + full JD into one large LLM call, and 17 other API routes each invoke the LLM directly. This costs free-tier tokens fast, widens the hallucination surface, and leaves paid models in the automatic fallback chain (a spend risk). We will replace the monolith with a **deterministic, sandboxed, free-first step-runtime**: the LLM is confined to a small set of schema-constrained read/generation nodes, and everything else (parse-normalize, scoring, validation, ATS simulation, formatting, diffing, reassembly) runs as pure in-process functions behind an allowlist registry. All public routes, the SSE contract, Stripe, caching, rate limits, and the UI stay byte-compatible (backward-compatible refactor).

## Scope In

- New `src/app/runtime/*` module: `types.ts`, `context.ts`, `registry.ts`, `executor.ts`, `recipes.ts`, `cost-guard.ts`.
- Recipe runtime over the existing `pipelines.ts` ids (`apply_to_job`, `check_resume`, `prepare_interview`, `full_optimization`).
- Migrate `api/humanize/stream` to the `apply_to_job` recipe behind an SSE adapter (same events/schema).
- Reclassify the 17 LLM-calling routes into buckets A (deterministic rewrite), B (schema-constrained nodes), C (recipe facades), behind a `STEP_RUNTIME` feature flag with a `false` rollback path.
- Free-only default/fallback model chain: `cerebras:gpt-oss-120b` → `gemini:gemini-2.5-flash-lite` → `groq:llama-3.3-70b-versatile`; `DEFAULT_MODEL_KEY` stays free-tier.
- Cost guard: refuse-to-pay unless `costPolicy:'paid'` + a user-supplied key cover it.
- Per-step/per-run token budgets via `context.ts` selectors and `estimateTokens`.
- Remove legacy `fetch('http://127.0.0.1:7244/ingest/...')` debug blocks and the old monolith path once the flag default is on.
- CI compile-time grep: zero LLM-service imports outside the runtime boundary.
- Contract tests preserving the 17 route + SSE response shapes; unit tests for the deterministic functions; score-parity gate.

## Scope Out (explicitly NOT in this feature)

- Any UI / front-end behavior, component, or copy change (front-end must not notice the refactor).
- Changes to Stripe, caching/rate-limit infrastructure, or Supabase table migrations.
- New or removed public API endpoints / SSE event schema changes (contracts are frozen).
- `cron/generate-blog-post` (admin-only, outside the runtime).
- Sessions storage redesign (stays in the `sessions` table, read via `context.ts` selectors).
- Adding new LLM providers or upgrading provider SDKs.
- Building out large curated salary/market datasets (a bounded deterministic lookup for `skills-market-value` is in scope; broad data build-out is not).
- Paid feature routes beyond the existing opt-in path.

## EARS criteria

Traceability: each criterion → 1 contract → 1 task → 1 named test → 1 verification row (locked in `tasks.md`/`verification.md` post-gate). Tag = `@EARS-<n>`.

- **@EARS-1** [Ubiquitous] The step-runtime SHALL expose a single step registry; every step SHALL declare an allowlisted implementation, explicit input selectors (`context.ts`), a declared output schema, a cost class (`free` | `paid-opt-in`), and a `maxTokens` budget, and the executor SHALL fail closed when a step references an unregistered function or an undeclared input.
- **@EARS-2** [Ubiquitous] The runtime SHALL permit a step to invoke a paid provider IF AND ONLY IF the run carries `costPolicy:'paid'` AND a user-supplied API key covers that provider; otherwise the executor SHALL raise and SHALL NOT call the paid provider.
- **@EARS-3** [When] When the `apply_to_job` recipe executes with a valid resume + JD, the runtime SHALL run the DAG `readResume → parse-normalize → extractKeywords → researchCompany → metricsContext → baselineScore → tailor → reScore+sanitize → assemble` and SHALL emit the same SSE `status` stages and a `complete` event with the same schema as the legacy `humanize/stream`.
- **@EARS-4** [Exception] IF the designated free model for a step is rate-limited or unavailable, THEN the runtime SHALL attempt the free fallback chain in order (`cerebras:gpt-oss-120b` → `gemini:gemini-2.5-flash-lite` → `groq:llama-3.3-70b-versatile`) and SHALL NOT escalate to a paid provider.
- **@EARS-5** [Ubiquitous] The runtime SHALL preserve the exact request/response contract of the 17 reclassified routes and the `humanize/stream` SSE streaming contract, as verified by contract tests.
- **@EARS-6** [When] When a bucket-A route (`ats-simulator`, `format-validator`, `resume-versions`, `validate-resume`, `keyword-analyzer`) is invoked, the system SHALL answer using pure in-process deterministic functions WITHOUT any LLM call, returning the unchanged JSON shape.
- **@EARS-7** [Ubiquitous] The system SHALL confine LLM calls to the schema-constrained nodes `readResume`, `extractKeywords`, `researchCompany`, `tailor` such that a CI grep for LLM-service imports outside the runtime boundary returns zero matches.
- **@EARS-8** [Ubiquitous] The executor SHALL apply per-step and per-run token budgets using `estimateTokens` and SHALL cap context delivered by `context.ts` selectors; no automatic run SHALL exceed its declared budget.
- **@EARS-9** [When] When no paid opt-in is set, the effective default/fallback model configuration SHALL contain only free-tier models from the decided chain, and `DEFAULT_MODEL_KEY` SHALL resolve to a free-tier key.
- **@EARS-10** [Exception] WHILE `STEP_RUNTIME` is disabled, the system SHALL route feature execution through the legacy path unchanged, enabling one-line rollback.
- **@EARS-11** [Ubiquitous] The reclassified deterministic score (baseline + relevancy + ATS) SHALL match legacy scoring within ±2 points on ≥95% of identical inputs; regression over the legacy baseline SHALL be zero.
- **@EARS-12** [Ubiquitous] The shipped runtime SHALL NOT contain the legacy `127.0.0.1:7244` debug ingest calls, and the legacy monolith path SHALL be removed once the flag default is enabled.
## Numeric non-functionals

- **NF-1** Tailor end-to-end latency, p95 ≤ 30 s (SSE request → `complete`), under normal free-tier load.
- **NF-2** Avg tokens per tailor run ≤ 20,000; hard per-run cap (default) = 40,000 tokens across all nodes.
- **NF-3** Default-path monetary cost = **$0.00** (auto calls hit free tiers only); any paid call requires opt-in.
- **NF-4** Score parity: ≥ 95% of inputs within ±2 points of legacy; 0 regressions, average change monotonic, on the same inputs.
- **NF-5** Backward compatibility: 100% of preserved contract tests green; **zero** breaking HTTP/SSE schema changes.
- **NF-6** Free-tier reliability/error budget: a transient 429/quota hit on the primary model degrades to the next fallback within 1 retry attempt; dropped-event tail ≤ 0.1% per month.
- **NF-7** In-run caching: keyword/company/resume-parse cache hit target ≥ 60% on repeated runs (existing TTL cache in `mcp-tools.ts`).
- **NF-8** Cost-guard evaluation adds ≤ 500 ms (p95) overhead to a run; guard SHALL resolve without a paid provider call.

## Open questions

Resolved — none remain open. All decisions dispositioned in the source DESIGN (`AGENTIC_TAILOR_REFACTOR.md` §9, recorded as ADRs in step 5 post-gate):
- Blog cron: keep out of the runtime.
- Default `tailor` generator: `cerebras:gpt-oss-120b`, fallback chain as above.
- `skills-market-value`: deterministic lookup default; bounded LLM read only on paid opt-in.
- Sessions: stay in the `sessions` table.

§Open questions is empty and SHALL remain empty before proceeding.

## Sign-off — entry gate (human only)

- [x] **Human approval** of `spec.md` + `contracts/` (spec owner): given by owner (Shayne Zamora) — "go ahead as stated".
- [x] `feature_id` set in front-matter: `agentic-step-runtime`.
- [ ] **§Sign-off stamp:** ____________________ (by: ______, date: ______)

> Per the SDD Authoring Contract: **do not** write `plan.md`, `tasks.md`, `adr/`, or `verification.md`, and do not touch code, until the line above is filled.