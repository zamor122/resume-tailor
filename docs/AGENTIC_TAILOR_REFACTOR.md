# Agentic Resume Tailor — Refactor Plan (Handoff Doc)

> **Status:** Approved design. No implementation started yet.
> **Owner/branch:** `conversion-metrics`
> **Goal:** Rebuild the resume-tailoring engine as a **deterministic, sandboxed, free-first agentic step-runtime** that beats Rezi and Teal on quality *and* runs at ~$0.
> **Read time for a fresh agent:** ~10 minutes. This doc is self-contained.

---

## 1. North-star principles (read first)

These drive every decision. Deviate only with justification.

1. **The LLM is a judge/reader, not the product.** It is invoked only at designated, schema-constrained nodes — never as a free-form "tool call to use AI."
2. **Deterministic functions do the real work.** Everything that can be done with code (parse-normalize, score, validate, gap analysis, ATS simulation, diffing, sanitization) runs as a **pure in-process function**, not an LLM call and not an HTTP "tool."
3. **Read resumes with the LLM — that's the quality moat.** Resumes vary infinitely; deterministic text parsing fails exactly where it matters. An LLM **reads** any-format resume into a canonical structure; deterministic functions then **validate/normalize** that structure.
4. **Feed the LLM only what's necessary.** Per-step declared inputs/selectors (`context.ts`). This is *required* to survive free-tier token caps, and it reduces hallucination.
5. **Sandbox every step.** Steps run only allowlisted registry functions on declared inputs with declared output schemas. No free-form DB/network.
6. **Free-first, machine-enforced $0.** Default/fallback chain contains only free-tier models. A **cost guard** refuses to call paid providers unless an explicit user key + `costPolicy:'paid'` is present.
7. **No long-running jobs.** Recipes are shallow DAGs of individually short, resumable steps. Per-run budgets cap everything.
8. **Backward compatible.** Public API routes, SSE contract, Stripe, caching, rate limits, and the UI all keep working. We refactor *underneath* them.

---

## 2. Current architecture (what we're refactoring)

- **Stack:** Next.js 16 (Turbopack) on Vercel, Supabase (auth, storage, `resumes`/`sessions`/`blog_posts` tables), Stripe (time-based access: 2D $4.95 / 7D $10 / 30D $20), Umami analytics.
- **LLM layer:** `src/app/services/providers/*` (OpenAI, Anthropic, Gemini, Cerebras, Groq, Mistral, DeepSeek, HuggingFace, OpenRouter) behind `services/ai-provider.ts` + `services/model-fallback.ts`. Today `DEFAULT_MODEL_KEY=cerebras:gpt-oss-120b` (Cerebras free tier), but the config/fallback list also includes **paid** OpenAI, Anthropic, Mistral.
- **Half-built agent scaffolding (incomplete):**
  - `src/app/config/agent-tools.ts` — tool registry (9 tools → 9 endpoints).
  - `src/app/config/pipelines.ts` — sequential step configs (`apply_to_job`, `check_resume`, `prepare_interview`, `full_optimization`).
  - `src/app/prompts/agent.ts` — a JSON planning-loop prompt (largely unused/experimental).
  - `src/app/api/mcp/session-manager/route.ts` — session state (create/get/update/add-message/track-tool/analytics/list).
  - `src/app/utils/mcp-tools.ts` — in-memory cache + parallel executor helpers.
- **The real workhorse is a monolith:** `src/app/api/humanize/stream/route.ts` (SSE) does pre-gen **parallel MCP calls** (`keyword-extractor`, `resume-parser`, `company-research`, `metrics-context`), then **one giant LLM call** (`getTailoringPrompt`), then post-gen **deterministic sanitizers + scoring**. `maxDuration = 60`.
- **17 routes currently call the LLM directly** (see §6 reclassification).
- **Leftover local-debug code** to delete: `fetch('http://127.0.0.1:7244/ingest/...')` blocks scattered in `stream/route.ts`.

### Where current costs/determinism problems come from
- Paid models sit in the default/fallback chain → risk of spend.
- `humanize/stream` feeds the **entire resume + full JD + lots of context** into one large prompt → burns free-tier tokens fast and widens the hallucination surface.
- Many "tools" are independent HTTP endpoints that each call the LLM, duplicating entry points and adding latency/cost.

---

## 3. Target architecture — the step-runtime

We keep every public route, the SSE contract, Stripe, caching, rate limits, and the UI untouched (principle #8). Underneath them we install a shallow-DAG **recipe runtime** that replaces the monolith and the loose HTTP-tool calls.

**Core concepts**

- **Recipe** (was `pipelines.ts`): a declarative list of steps + inputs + per-run budget + cost policy. A recipe is a shallow DAG — steps may run in parallel, but there are no nested sub-DAGs (principle #7). Today's `apply_to_job`, `check_resume`, `prepare_interview`, `full_optimization` become recipes verbatim.
- **Step** (was `agent-tools.ts` registry): one unit of work with a **declared** `inputs` (named selectors), an **allowlisted** implementation (a pure function or a schema-constrained LLM read), a declared **output schema**, and a **maxToken/maxMs** guard. Steps never do free-form DB/network access (principle #5).
- **StepRuntime**: an in-process executor. It validates step schemas, resolves inputs, runs only registered functions, enforces budgets & the cost guard, and returns a normalized `StepResult`. No LLM planning loop picks tools at runtime — the recipe is fixed; only deterministic `context.ts` selectors decide *what* is passed (principle #4).
- **`context.ts`**: per-step selector functions that extract only the slice of the resume/JD/metrics a step needs (e.g. `experience: oldest 4 jobs, date+title+bullets`). This is the mechanism that shrinks every prompt below free-tier token caps.

**Execution shape for the flagship (`apply_to_job`):**

```
readResume (LLM-as-reader, canonical ResumeDocument)
  -> parse/normalize  (pure: validateOrFixEducation, contactBlockSanitizer, sectionDedupe)
  -> extractKeywords  (LLM read of JD -> canonical keyword list)
  -> researchCompany  (LLM read, bounded)
  -> metricsContext   (deterministic from resume + analytics)
  -> baselineScore    (deterministic relevancy-scorer)
  -> tailor           (LLM generation node, fed ONLY selected context)
  -> reScore + sanitize (pure: atsSanitizer, resumeReassemble, contactBlockSanitizer)
  -> assemble final   (diff, obfuscation, free-reveal, persist to resumes table)
```

Each node stays short and resumable; the **SSE adapter** emits the same `status`/`complete` events the UI already expects, so the front-end never changes.

---

## 4. Step registry & schema (`context.ts`)

New files replace/augment the scaffolding:

- `src/app/runtime/types.ts` — `StepId`, `StepInputs`, `StepResult`, `Recipe`, `RuntimeConfig`.
- `src/app/runtime/context.ts` — declared selectors + `resolveStepInputs(step, session)`.
- `src/app/runtime/registry.ts` — maps `StepId -> { id, allows, outputs, costModel, maxTokens }`. **This is the only allowlist** a step can run (principle #5).
- `src/app/runtime/executor.ts` — the `StepRuntime`: schema-validate → resolve inputs → run allowlisted impl → enforce budget/cost → cache via existing `mcp-tools.ts` keyed cache.
- `src/app/runtime/recipes.ts` — re-export of `pipelines.ts` ids wired to registry steps.
- `src/app/runtime/cost-guard.ts` — see §7.

Schema rule that makes the whole thing enforceable: **every step declares an output schema and a cost class (`free` | `paid-opt-in`) in code.** The executor refuses to run, or refuses to pay for, anything not in the registry (principle #5) and anything whose cost class exceeds the run's `costPolicy` (principle #6).

---

## 5. Deterministic function library (map to existing code)

The "do the work" functions already exist in `src/app/utils/*` and mostly just need to be exposed via the registry with declared schemas. Consolidate under `src/app/runtime/functions/` re-exports; do **not** move or delete working code.

| Step | Deterministic implementation (existing) | Notes |
| --- | --- | --- |
| `parse-normalize` | `resumeSectionDedupe`, `educationValidator`, `contactBlockSanitizer`, `keywordParenthesesCleaner`, `resumeReassemble` | Pure, in-process. |
| `score` / `relevancy-scorer` | `resume-metrics` + current `relevancy-scorer` logic | Must become pure — no LLM in scoring (§2's `humanize/stream` only calls it to read `.before/.after`). |
| `ats-simulate` | `atsSanitizer` + rule-based scoring currently inside `tools/ats-simulator` | Replace LLM scoring with deterministic parse/score; keep the JSON hygiene helpers (`sanitizeATSJson`, `extractPartialATSResponse`). |
| `format-validate` | `contactBlockSanitizer`, `educationValidator`, structure checks in `format-validator` | Pure. |
| `validate-resume` | `qualityAssurance` + current `validate-resume` logic | Pure. |
| `keyword-fallback` | `keyword-extraction` (`extractKeywordsFrequencyBased`) | Pure; used when the LLM read is skipped/rate-limited. |
| `metrics-context` | `resume-metrics` + analytics in `session-manager` `analytics` | Pure, from persisted session/resume. |
| `obfuscate` / `diff` / `reassemble` | `resumeObfuscator`, `ResumeDiffView` data, `resumeReassemble` | Pure post-gen steps. |

The **only** steps that call an LLM are the ones that fundamentally read arbitrary text (principle #3): `readResume`, `extractKeywords`, `researchCompany`, and the generation node `tailor`. Everything downstream of them is code.
---

## 6. Reclassification of the 17 LLM-calling routes

`grep -rln "model-fallback\|ai-provider\|services/providers" src/app/api/*/route.ts` returns 18 routes. Drop the admin-only `cron/generate-blog-post` (isolated, not user-facing) → **17 routes** needing reclassification into exactly three buckets.

**A. Deterministic rewrite — remove the LLM (pure functions):**
- `tools/ats-simulator` → `ats-simulate` (rule-based scoring; contract unchanged).
- `tools/format-validator` → `format-validate` (pure).
- `tools/resume-versions` → thin wrapper over the already-deterministic `resume/[id]/versions` list + DB metadata.
- `api/validate-resume` → `validate-resume` (pure, via `qualityAssurance`).
- `tools/keyword-analyzer` → `extract-keywords` (LLM read) + `score` (pure) composed in a recipe; the frequency-based fallback becomes the default path when the read is budget-limited.

**B. Keep as schema-constrained LLM read/generation nodes** (bounded inputs, declared outputs, always behind `context.ts` + a step budget):
- `tools/skills-gap`, `tools/interview-prep`, `tools/multi-job-comparison`, `tools/resume-storyteller`, `tools/skills-market-value`, `mcp-tools/job-relevancy-enhancer`, `research-company`, `ai-detection` → each becomes a `StepId` (generation or classifier node). Their endpoints become **facades** that hand off to the runtime and return the same JSON shape.

**C. Become recipe facades (the flagship path):**
- `humanize/stream` → **replace the monolith** with the `apply_to_job` recipe + SSE adapter. Delete the leftover `fetch('http://127.0.0.1:7244/ingest/...')` debug blocks (§2).
- `api/tailor`, `api/pipeline`, and the `mcp-tools/*` endpoints consumed by recipes → thin facades resolving to a recipe/step id, preserving payloads.
- Keep `keyword-extractor`, `resume-parser`, `company-research`, `metrics-context` as the named read/context steps the streams already parallelize (now via the runtime instead of raw `fetch`).

**Compile-time check:** after migration, `grep -rln "generateWithFallback\|generateContentWithFallback\|services/providers" src/app/api` must match **only** bucket-B node facades at the runtime boundary — never scoring, validation, formatting, or simulation logic.

---

## 7. Free-first, machine-enforced $0 (cost guard)

- `cost-guard.ts` classifies every model/provider: `free` (Cerebras, Groq/HF/OpenRouter free tiers, Gemini flash-lite/flash) vs `paid-opt-in` (OpenAI, Anthropic, Mistral, Gemini pro).
- **Default/fallback chains become free-only.** `FALLBACK_MODELS` in `config/models.ts` is reduced to the decided free chain: `cerebras:gpt-oss-120b` → `gemini:gemini-2.5-flash-lite` → `groq:llama-3.3-70b-versatile`. The paid keys (`openai:*`, `anthropic:*`) and non-free `deepseek:*` are **removed from automatic fallback** — reachable only via an explicit user key + `costPolicy:'paid'`. `DEFAULT_MODEL_KEY` stays on `cerebras:gpt-oss-120b`.
- **Step-to-model mapping (best for free).** The heavy `tailor` generation node uses the most capable free model — `cerebras:gpt-oss-120b` (1M tokens/day). Token-light read nodes (`readResume`, `extractKeywords`, `researchCompany`) default to `gemini:gemini-2.5-flash-lite` (1,000 req/day, fastest) so the generous Cerebras quota is reserved for generation; `groq:llama-3.3-70b-versatile` is the fast different-provider fallback when Gemini/Cerebras free tiers are exhausted. Rationale recorded in §9.
- **Refuse-to-spend:** the executor raises before calling any paid provider unless, **for that specific user/run**, an explicit `costPolicy:'paid'` is present **and** a user-supplied API key covers it. No free-tier path silently escalates (principle #6); paid models never appear in an automatic fallback list.
- **Per-run token budget:** `context.ts` selectors cap what any read/generation node receives; the executor counts tokens with the existing `estimateTokens` util and hard-stops at the recipe's budget. This directly fixes §2's "entire resume + full JD in one prompt" cost driver.

---

## 8. Ship plan (keep it backward compatible end-to-end)

**Phase 0 — baseline/tests (no behavior change).** Add unit tests for the deterministic fns (§5) if missing; snapshot the SSE shape and the 17 route response shapes (via `tests/`) so refactors can be verified.

**Phase 1 — runtime skeleton.** Land `runtime/*` (§4) behind a feature flag env `STEP_RUNTIME=true`. Register the deterministic steps first (§5). No route changes. Existing behavior is the fallback.

**Phase 2 — migrate flagships.** Point `humanize/stream` at the `apply_to_job` recipe behind the SSE adapter; keep the old monolith path behind the same env flag for instant rollback. Then flip `pipeline`/`tailor` facades onto recipes. Reconcile scoring to match current numbers before flipping (score parity is the gate).

**Phase 3 — reclassify the 17.** Convert bucket A to pure functions; bucket B to nodes; bucket C to facades — each behind the flag, landed with its own tests and a before/after quality diff on `scip-snapshot`.

**Phase 4 — harden & delete.** Remove the env flag and the old monolith + `fetch(127.0.0.1:7244/...)` debug blocks. Enforce the §6 compile-time grep in CI. Re-run advisors/security scan.

**Rollback:** each PR keeps the prior path reachable via `STEP_RUNTIME=false`; a bad release is a one-line env revert, not a code revert.

---

## 9. Definition of done & resolved decisions

**Definition of done**
1. `humanize/stream` runs the `apply_to_job` recipe; response shapes/SSE identical to today.
2. `grep` for LLM calls outside the registry boundary returns zero (compiled in CI).
3. Default/fallback chains are free-only; no code path auto-calls a paid model.
4. The 17 routes work and match their current JSON contract.
5. Debug `127.0.0.1` blocks and the old monolith are deleted; flag default = runtime on.
6. Tests green; quality metrics on `scip-coverage` not regressed.

**Resolved decisions (free-first, best-for-free) — decided now; reopen only with a concrete cost/quality trade-off:**
- **Blog cron stays outside the runtime.** `cron/generate-blog-post` remains a standalone admin route; it has no user-facing contract, so migration adds risk without payoff. (DoD unchanged.)
- **Default `tailor` generator is `cerebras:gpt-oss-120b`.** It is the most capable open-weight model on a real free tier (120B, 1M tokens/day, 65K context) and is already `DEFAULT_MODEL_KEY` in local + production. Fallback chain (all free, diverse providers to survive a single-key quota exhaust): `gemini:gemini-2.5-flash-lite` (1,000 req/day) → `groq:llama-3.3-70b-versatile` (fast). Token-light read nodes prioritize `gemini-2.5-flash-lite` so Cerebras quota goes to the heavy generation node. Those three are the **only** automatic fallback; paid `openai:*`/`anthropic:*` and non-free `deepseek:*` are reachable only via user key + `costPolicy:'paid'`.
- **`skills-market-value` is deterministic.** A curated salary/market data lookup answers by default; a bounded LLM read fires only if the lookup misses *and* the run opts into `costPolicy:'paid'` with a user key. No free path spends tokens to answer a market question.
- **Sessions stay in the `sessions` table.** The runtime reads persisted state through declared `context.ts` selectors; no new state store. Keeps principle #8 and avoids a migration.

These close the previously-open §9 items; nothing remains blocked on a decision before Phase 1.