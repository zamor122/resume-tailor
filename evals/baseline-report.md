# AI Resume Tailor — Agent & Product Baseline Evaluation

**Date:** 2026-11-21  
**Baseline Dataset:** [`evals/golden-dataset.json`](./golden-dataset.json) (8 anonymized real processed resumes + 4 synthetic edge-case resumes)  
**Live Eval Runner:** [`evals/run-baseline.ts`](./run-baseline.ts)  
**Raw Live Results:** [`evals/baseline-results.json`](./baseline-results.json)

---

## 1. Executive Summary

`airesumetailor.com` already has a genuinely ambitious **thick-harness architecture** (7-node LangGraph StateGraph, TypeSafe AI / JEV chunk diagnosis + suggestion judging + alignment scoring, role knowledge synthesis, and an interactive `ElicitationPanel` for Google X-Y-Z metrics).

**However, today it is losing users and failing to beat a plain ChatGPT/Gemini prompt** because of 5 concrete bottlenecks:
1. **Production reliability & silent degradation:** `gemini-2.5-flash` is hitting Free Tier **5 RPM (429)** and **503** errors, falling back to `groq:openai/gpt-oss-120b` which times out at 22s, resulting in **0-char responses** and **1 suggestion out of 29 bullets**.
2. **Garbage-in at `intakeParser` & `keywordAnalyzer`:** Multi-job PDFs get collapsed into 1 job with `"Experience"` as the employer name; missing titles get hallucinated as `"Software Engineer"` (even for a hardware store clerk); generic stop-words (`performs`, `duties`, `ensure`) pollute missing keywords; broken PDF ligatures (`fi nancial`, `sta ff`) pass through untouched.
3. **Low perceived impact (+5.5 pts avg):** Across the 4 live baseline cases, the agent only moved scores by **+5 to +7 points** (`49→54`, `34→41`, `20→25`, `47→52`). A stressed job seeker paying $9–$29 will not feel a +5 point nudge is worth paying for.
4. **Historical production failures (n=61 real resumes):**
   - **50.8% (31/61)** showed a `before` score of **0**
   - **26.2% (16/61)** lost **>25%** of the original resume length (5 lost >50%, worst case 2% retained)
   - **9.8% (6/61)** had **0 or negative** score gain
5. **Pricing & positioning mismatch for stressed job seekers:** Time-based passes (`2D $9`, `7D $19`, `30D $29` + 1 free resume) are honest ("no subscription traps"), which is a huge marketing advantage—**but** giving 1 full free tailored resume + download means a user who only needs 1–2 quick applications never needs to pay, while the UI doesn't yet deliver the "10x better than ChatGPT" moment that makes upgrading feel obvious.

---

## 2. Historical Production Baseline (n = 61 Substantive Resumes in Supabase)

| Metric | Production Baseline | Target |
|---|---:|---:|
| Substantive resumes analyzed (>500c resume, >200c JD) | 61 | — |
| `before_score === 0` (broken scoring) | **31 (50.8%)** | 0% |
| `after_score === 0` | **4 (6.6%)** | 0% |
| Severe truncation (<50% original length) | **5 (8.2%)** | 0% |
| Moderate truncation (50–75% original length) | **11 (18.0%)** | <2% |
| Zero or negative score gain | **6 (9.8%)** | 0% |
| Average score delta | **+25.9 pts** (skewed by `before=0` bug) | +18–25 true pts |
| Length ratio range (min – max) | **0.02x – 2.09x** | 0.85x – 1.25x |

---

## 3. Live Agent Baseline Results (Current `main` Branch)

Run via `npx tsx evals/run-baseline.ts` (`intensity: "targeted"`):

| Case ID | Role | Type | Latency | Length Ratio | Before → After | Delta | Suggestions | Key Defect Observed |
|---|---|---|---:|---:|---:|---:|---:|---|
| `real_24cbaa65` | Administrative Assistant | Real | 13.4s | 1.00x | 49 → 54 | **+5** | **1 / 29** | `intakeParser` collapsed 3 jobs into 1 `"Experience"` job; `gemini-2.5-flash` 503'd → 0-char fallback; broken PDF ligatures (`fi nancial`, `sta ff`) |
| `real_2bdb399f` | AI Software Engineer | Real | 16.0s | 1.07x | 34 → 41 | **+7** | 12 | Historical truncation bug is fixed in current code (1.07x vs 0.16x), but `industryCategory` misclassified as `healthcare` |
| `edge_career_changer` | Customer Success Manager | Edge | 10.0s | 1.32x | 20 → 25 | **+5** | 3 | Awkward literal translation: `"Served 150 customers (students)"`; `seniorityTier` misclassified as `lead_manager` |
| `edge_messy_no_bullets` | Warehouse Operations Supervisor | Edge | 28.1s | 1.40x | 47 → 52 | **+5** | 2 | Hallucinated `"Software Engineer"` as title for `"Bob Hardware store"`; hit Gemini 429 Free Tier (5 RPM) + Groq 22s timeout |

**Live Baseline Averages:**
- **Latency:** 16.9s avg (worst: 28.1s)
- **Score Delta:** **+5.5 pts**
- **Length Retention:** 1.00x–1.40x (good—current code fixed the old truncation bug)

---

## 4. Harness Evaluation: Why a Normal ChatGPT/Gemini Prompt Still Competes

You already have a **thick harness** (`intakeParser` → `candidateProfiler` → `jobDiscovery` → `keywordAnalyzer` → `bulletPlanner` → `surgicalTailor` + JEV judge → `reassembleAndScore` + `ElicitationPanel`). That is the *right* architecture to beat raw ChatGPT—because ChatGPT:
- Hallucinates skills/metrics you don't have,
- Rewrites your whole resume into generic AI slop,
- Doesn't ask targeted follow-up questions to pull real metrics out of your head,
- Doesn't score/diff line-by-line or export an ATS-safe PDF.

**Where the current harness breaks down:**
1. **Parser fragility (`intakeParser.ts`):** When deterministic regex parsing fails on messy PDFs or unformatted text, it silently produces 1 giant job or defaults missing titles to `"Software Engineer"`.
2. **Noisy keyword extraction (`keywordAnalyzer.ts`):** Generic verbs/nouns (`performs`, `duties`, `ensure`) steal keyword budget from real domain skills.
3. **Elicitation is optional/hidden instead of the hero differentiator:** `ElicitationPanel` is the #1 thing ChatGPT won't do proactively. Making 2–3 ultra-fast, role-specific questions ("How many people/accounts/tickets did you handle?", "What tools did you use?") part of the core flow—and feeding those verified facts into `surgicalTailor`—is what creates a resume ChatGPT *cannot* produce.
4. **LLM Provider Quota:** Running production/evals on Gemini Free Tier (5 RPM) guarantees 429/503 failures under even 2 concurrent users.

---

## 5. Pricing & Marketing Recommendations (For Stressed Job Seekers)

Current pricing: **1 Free Resume (view + download)**, then **Sprint Pass (2D / $9)**, **Pro Week (7D / $19, popular)**, **Job Search Month (30D / $29)** — non-subscription.

**What's great:**
- **"No subscription traps — one-time pass"** is a killer marketing hook. Job seekers *hate* Zety/Resume.io/Teal auto-rebilling them while unemployed.

**What to optimize:**
1. **Tighten the free tier:** Give **1 free full ATS audit + diff preview** (show them the exact before/after score jump and 2–3 unlocked bullet rewrites), and put **full PDF download + unlimited tailoring** behind the **$9 Sprint Pass** (or make the 1st download watermarked / plain-text only). Right now, 1 full free PDF lets 80% of casual users leave without paying.
2. **Reframe tiers around job-search urgency:**
   - **$9 — Weekend Sprint (3 days):** "Applying to 5–10 jobs this weekend"
   - **$19 — Interview Week (14 days, Most Popular):** "Full active job search" (14 days feels 2x fairer than 7 days for $19)
   - **$29 — Land the Job (30 days + Cover Letter & Interview Prep):** Best value anchor.
3. **Remove "TailorBot MK-II" / "+30 XP" gamification fluff on the pricing page:** Stressed, unemployed people want **calm, trustworthy, fast results** that get them interviews—not video-game XP.

---

## 6. Prioritized Fix Plan (Next Sprint)

| Priority | Fix | Expected Impact |
|---|---|---|
| **P0** | Upgrade Gemini API key to Paid Tier (or primary fast paid model) so 429/503 + 22s Groq timeouts stop | Eliminates 0-char failures; cuts latency from 17–28s to <8s |
| **P0** | Fix `intakeParser` (strip PDF ligatures `fi `/`fl `/`ff `, never default unknown title to `"Software Engineer"`, fall back to LLM parser when deterministic parser finds ≤1 job on >1000c resume) | Fixes `real_24cbaa65` (1→20+ suggestions) and `edge_messy_no_bullets` |
| **P0** | Filter stop-words (`performs`, `duties`, `ensure`, `ability`, `experience`) out of `keywordAnalyzer` | Immediately raises keyword relevance & score deltas |
| **P1** | Make `ElicitationPanel` a 30-second, 3-question "Boost Your Impact" step before tailoring (with 1-click skip) and inject answers directly into `surgicalTailor` | Creates the "ChatGPT can't do this" moat |
| **P1** | Tighten free tier (free audit + preview, paid PDF download at $9) and extend $19 tier from 7D → 14D | Directly lifts free-to-paid conversion |
| **P2** | Re-run `npx tsx evals/run-baseline.ts` after each fix and track delta against this baseline | Prevents regressions |
