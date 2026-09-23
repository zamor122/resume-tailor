# Universal Category & Domain Taxonomy Bullet Elevation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a universal domain taxonomy, canonical job role knowledge base, and Google X-Y-Z bullet elevation engine that transforms resume bullets across any career category (healthcare, hospitality, facilities, aviation, finance, sales, athletics, tech) with industry-native vocabulary, authentic metrics, and zero technical bias.

**Architecture:** A domain taxonomy matrix (`domainTaxonomy.ts`) and Supabase role knowledge base (`job_role_knowledge`) provide fast (<15ms) role resolution and industry-calibrated power verbs/metrics. `candidateProfilerNode` maps target titles to canonical roles. `tailoringSection.ts` dynamically injects industry-native verbs and authentic metric dimensions into the Google X-Y-Z prompt while strictly banning passive openers. `surgicalTailorNode` executes with bounded concurrency (limit 2) and validates with TypeSafe AI's Jev quality gate.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (PostgreSQL + `pg_trgm`), LangGraph (`@langchain/langgraph`), TypeSafe AI SDK (`@typesafe-ai/sdk`), Google Generative AI (`gemini-2.5-flash` / `gemini-1.5-flash`), Vitest.

**Spec:** [`specs/universal-category-bullet-engine/spec.md`](file:///Users/shaynezamora/documents/resume-tailor/specs/universal-category-bullet-engine/spec.md)

## Global Constraints

- **REQ-UNI-01**: Support any profession (hourly, licensed, corporate, trades, aviation, athletics) with zero tech-jargon bias.
- **REQ-UNI-02**: Strictly ban passive/subordinate phrasing (*"Responsible for"*, *"Assisted with"*, *"Helped"*, *"Worked on"*, *"Participated in"*, *"Handled"*, *"Supported"*).
- **REQ-UNI-03**: Enforce the Google X-Y-Z structure: **Accomplished [X], as measured by [Y], by doing [Z]**.
- **REQ-UNI-04**: Quantify with authentic operational metrics (headcount, square footage, patient panels, flight hours, covers, audit pass rates); NEVER hallucinate fake percentages.
- **REQ-UNI-05**: Varied opening verbs per role; no repeated opening action verbs across bullets within a job.
- **REQ-EVT-02/03**: Supabase role knowledge lookup (<15ms cache hit) with in-band parametric synthesis fallback (<1.5s) and resilient in-memory fallback.
- **REQ-ERR-02**: Jev System 1 quality gatekeeper rejects inauthentic or cosmetic-only suggestions.
- **Push Protection**: Target `feature/section-narrative-review-flow` on Vercel preview only; never push directly to `main`.

---

### Task 1: Universal Domain Taxonomy & Calibration Matrix

**Files:**
- Create: `src/app/config/domainTaxonomy.ts`
- Test: `tests/unit/config/domainTaxonomy.test.ts`

**Interfaces:**
- Produces:
  - `export type IndustryCategory = 'healthcare' | 'hospitality_service' | 'sales_marketing' | 'finance_accounting' | 'operations_logistics' | 'trades_facilities' | 'aviation_aerospace' | 'education_coaching' | 'technology_engineering' | 'legal_compliance' | 'general_business'`
  - `export interface DomainTaxonomyConfig { category: IndustryCategory; displayName: string; primaryVerbs: string[]; authenticMetricExamples: string[]; bannedClichés: string[]; evaluationDirectives: string[]; }`
  - `export function getDomainTaxonomy(category?: string | IndustryCategory): DomainTaxonomyConfig`
  - `export function detectIndustryCategory(title?: string, description?: string): IndustryCategory`

- [x] **Step 1: Write the failing unit tests for domain taxonomy**
  In `tests/unit/config/domainTaxonomy.test.ts`:
  - Test detection of Healthcare titles (e.g. "Nurse Manager", "Surgeon", "Medical Assistant").
  - Test detection of Hospitality titles (e.g. "Waiter", "Head Bartender", "Sous Chef").
  - Test detection of Trades/Facilities titles (e.g. "Janitor", "Custodian", "HVAC Technician").
  - Test detection of Aviation titles (e.g. "Commercial Pilot", "Flight Attendant").
  - Test detection of Athletics/Education titles (e.g. "Varsity Basketball Coach", "High School Teacher").
  - Test detection of Finance/Accounting titles (e.g. "Senior Accountant", "Financial Analyst").
  - Test that `getDomainTaxonomy` returns category-specific verbs (e.g. Healthcare includes "Administered", "Triaged"; Aviation includes "Commanded", "Navigated"; Custodial includes "Sanitized", "Maintained").
  - Test fallback to `general_business` when title is ambiguous.

- [x] **Step 2: Run test to confirm it fails**
  Run: `npx vitest run tests/unit/config/domainTaxonomy.test.ts` (Red).

- [x] **Step 3: Implement domain taxonomy in `src/app/config/domainTaxonomy.ts`**
  Implement the 10 domain taxonomy categories with rich, curated action verbs, authentic operational metric dimensions, and keyword patterns.

- [x] **Step 4: Run test to confirm it passes**
  Run: `npx vitest run tests/unit/config/domainTaxonomy.test.ts` (Green).

- [x] **Step 5: Commit changes**
  `git commit -m "feat(taxonomy): add universal domain taxonomy matrix and industry detection engine"`

---

### Task 2: Supabase Role Knowledge Base & Canonical Resolver

**Files:**
- Create: `supabase/migrations/20260923_job_role_knowledge.sql`
- Create: `src/app/services/jobKnowledge.ts`
- Test: `tests/unit/services/jobKnowledge.test.ts`

**Interfaces:**
- Consumes: `IndustryCategory`, `DomainTaxonomyConfig`, `getDomainTaxonomy` from `@/app/config/domainTaxonomy`
- Produces:
  - `export interface JobRoleKnowledge { canonicalTitle: string; industryCategory: IndustryCategory; powerVerbs: string[]; authenticMetricTypes: string[]; coreCompetencies: string[]; alternateTitles?: string[]; }`
  - `export async function getOrSynthesizeJobKnowledge(title: string, jobDescription?: string, apiKey?: string): Promise<JobRoleKnowledge>`
  - `export function resolveCanonicalTitle(title: string, category: IndustryCategory): string`

- [x] **Step 1: Write database migration SQL**
  In `supabase/migrations/20260923_job_role_knowledge.sql`:
  - `CREATE TABLE IF NOT EXISTS job_role_knowledge (...)` with `pg_trgm` extension and indices.

- [x] **Step 2: Write failing tests for job knowledge service**
  In `tests/unit/services/jobKnowledge.test.ts`:
  - Test canonical title normalization (e.g. "Nursing Lead" -> "Nurse Manager / Clinical Lead").
  - Test cache hit retrieval from Supabase.
  - Test fallback to in-band LLM synthesis / domain taxonomy on cache miss or Supabase error.
  - Test that latency is < 15ms on cache hit.

- [x] **Step 3: Run test to confirm failure**
  Run: `npx vitest run tests/unit/services/jobKnowledge.test.ts` (Red).

- [x] **Step 4: Implement `src/app/services/jobKnowledge.ts`**
  Implement cache lookup using `supabaseAdmin`, canonical normalization, LLM fallback synthesis, and asynchronous caching.

- [x] **Step 5: Run test to confirm it passes**
  Run: `npx vitest run tests/unit/services/jobKnowledge.test.ts` (Green).

- [x] **Step 6: Commit changes**
  `git commit -m "feat(knowledge): add job role knowledge cache and canonical resolution service"`

---

### Task 3: Candidate Profiler Integration

**Files:**
- Modify: `src/app/agent/nodes/candidateProfiler.ts`
- Modify: `src/app/agent/state.ts`
- Test: `tests/unit/agent/candidateProfiler-universal.test.ts`

**Interfaces:**
- Consumes: `detectIndustryCategory`, `getDomainTaxonomy` from `@/app/config/domainTaxonomy`, `getOrSynthesizeJobKnowledge` from `@/app/services/jobKnowledge`
- Produces:
  - `AgentState.industryCategory?: IndustryCategory`
  - `AgentState.canonicalRole?: string`
  - `AgentState.jobKnowledge?: JobRoleKnowledge`

- [x] **Step 1: Write failing tests for candidate profiler**
  In `tests/unit/agent/candidateProfiler-universal.test.ts`:
  - Verify `candidateProfilerNode` attaches `industryCategory`, `canonicalRole`, and `jobKnowledge` to `AgentState`.
  - Verify diverse titles (e.g. "Commercial Airline Pilot", "Head Custodian", "ICU Staff Nurse") receive correct categories.

- [x] **Step 2: Run test to confirm failure**
  Run: `npx vitest run tests/unit/agent/candidateProfiler-universal.test.ts` (Red).

- [x] **Step 3: Update `src/app/agent/state.ts` and `candidateProfiler.ts`**
  - Add fields to `AgentState` and `AgentStateAnnotation`.
  - In `candidateProfilerNode`, resolve industry category and job knowledge.

- [x] **Step 4: Run test to confirm it passes**
  Run: `npx vitest run tests/unit/agent/candidateProfiler-universal.test.ts` (Green).

- [x] **Step 5: Commit changes**
  `git commit -m "feat(agent): wire canonical role and domain taxonomy into candidateProfilerNode"`

---

### Task 4: Dynamic Experience Bullets Prompt Refactor (Google X-Y-Z & Anti-Passive)

**Files:**
- Modify: `src/app/prompts/tailoringSection.ts`
- Test: `tests/unit/prompts/universal-tailoringSection.test.ts`

**Interfaces:**
- Consumes: `DomainTaxonomyConfig`, `JobRoleKnowledge`
- Updates: `getExperienceBulletsPrompt` to accept optional `domainTaxonomy?: DomainTaxonomyConfig` and `jobKnowledge?: JobRoleKnowledge`.

- [x] **Step 1: Write failing tests for prompt generation**
  In `tests/unit/prompts/universal-tailoringSection.test.ts`:
  - Test that for Healthcare roles, the prompt injects healthcare verbs (*"Administered"*, *"Triaged"*) and bans tech verbs.
  - Test that for Custodial/Facilities roles, the prompt injects facilities verbs (*"Sanitized"*, *"Maintained"*).
  - Test that the prompt explicitly bans all passive openers (*"Responsible for"*, *"Assisted with"*, *"Helped"*, *"Worked on"*, *"Participated in"*, *"Handled"*).
  - Test that the prompt instructs the Google X-Y-Z framework (*Accomplished [X], as measured by [Y], by doing [Z]*).
  - Test that the prompt mandates distinct opening verbs for each bullet.

- [x] **Step 2: Run test to confirm failure**
  Run: `npx vitest run tests/unit/prompts/universal-tailoringSection.test.ts` (Red).

- [x] **Step 3: Implement prompt updates in `src/app/prompts/tailoringSection.ts`**
  - Build `buildDomainDirectivesBlock(taxonomy, jobKnowledge)` helper.
  - Inject domain-native verbs, authentic metric dimensions, and strict Google X-Y-Z rules into `getExperienceBulletsPrompt`.

- [x] **Step 4: Run test to confirm it passes**
  Run: `npx vitest run tests/unit/prompts/universal-tailoringSection.test.ts` (Green).

- [x] **Step 5: Commit changes**
  `git commit -m "feat(prompts): inject domain-native verbs, Google X-Y-Z framework, and anti-passive mandates into experience prompt"`

---

### Task 5: Surgical Tailor Node Wiring

**Files:**
- Modify: `src/app/agent/nodes/surgicalTailor.ts`
- Test: `tests/unit/agent/surgicalTailor-universal.test.ts`

**Interfaces:**
- Consumes: `state.industryCategory`, `state.jobKnowledge`, `getDomainTaxonomy`
- Supplies: Domain taxonomy and job knowledge to `getExperienceBulletsPrompt`.

- [x] **Step 1: Write failing tests for surgical tailor**
  In `tests/unit/agent/surgicalTailor-universal.test.ts`:
  - Verify that `surgicalTailorNode` passes domain taxonomy to `getExperienceBulletsPrompt`.
  - Verify bounded concurrency (limit 2) and Jev judging continue to work seamlessly.

- [x] **Step 2: Run test to confirm failure**
  Run: `npx vitest run tests/unit/agent/surgicalTailor-universal.test.ts` (Red).

- [x] **Step 3: Update `src/app/agent/nodes/surgicalTailor.ts`**
  Resolve domain taxonomy from state and pass to prompt constructor.

- [x] **Step 4: Run test to confirm it passes**
  Run: `npx vitest run tests/unit/agent/surgicalTailor-universal.test.ts` (Green).

- [x] **Step 5: Commit changes**
  `git commit -m "feat(agent): wire domain taxonomy and role knowledge through surgicalTailorNode"`

---

### Task 6: Multi-Industry End-to-End Test Suite

**Files:**
- Create: `tests/unit/agent/universal-domains-e2e.test.ts`

- [x] **Step 1: Write end-to-end multi-industry tests**
  Test full mock execution for 6 distinct professions:
  1. **Healthcare**: Nurse Manager
  2. **Hospitality**: Restaurant Waiter / Server
  3. **Facilities**: School Janitor / Custodian
  4. **Aviation**: Commercial Airline Pilot
  5. **Finance**: Senior Financial Analyst
  6. **Athletics**: High School Varsity Basketball Coach
  - Assert zero software engineering jargon in non-technical output.
  - Assert zero passive starters (*"Responsible for"*, *"Assisted with"*).
  - Assert Google X-Y-Z pattern presence.

- [x] **Step 2: Run test suite**
  Run: `npx vitest run tests/unit/agent/universal-domains-e2e.test.ts`.

- [x] **Step 3: Commit changes**
  `git commit -m "test(universal): add multi-industry end-to-end verification test suite"`

---

### Task 7: Full Verification & Preview Deployment

- [x] **Step 1: Run full test suite**
  Run: `npm test` (all 77+ suites must pass 100%).
- [x] **Step 2: Run Next.js production build**
  Run: `npm run build` (zero type, lint, or bundling errors).
- [x] **Step 3: Push to preview branch**
  Run: `npm run push:preview`.
- [x] **Step 4: Verify Vercel deployment**
  Inspect Vercel build status and confirm `● Ready`.
