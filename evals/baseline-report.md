# AI Resume Tailor — Agent & Product Baseline Evaluation (Updated 12-Case ClinePass Baseline)

**Updated:** 2026-11-22  
**Pipeline Mode:** 100% ClinePass (`cline:cline-pass/minimax-m3.1-flash` for read/JSON + `cline:cline-pass/qwen3.8-max` for heavy tailoring; `reasoning: { enabled: false }` to eliminate 10k-token reasoning stalls)  
**Golden Dataset:** [`evals/golden-dataset.json`](./golden-dataset.json) (8 anonymized real processed resumes + 4 synthetic edge-case resumes)  
**Eval Runner:** [`evals/run-baseline.ts`](./run-baseline.ts) (`npx tsx evals/run-baseline.ts --all`)  
**Raw Latest Results:** [`evals/baseline-results.json`](./baseline-results.json)

---

## 1. Before vs. After Baseline Comparison

| Metric | Initial Baseline (4 cases, Gemini/Groq) | Current Baseline (All 12 cases, 100% ClinePass) | Change |
|---|---:|---:|---|
| Completion Rate | 4/4 (with 429/503 + 22s Groq timeouts) | **12/12 (0 errors, 0 fallbacks)** | **100% ClinePass** |
| Avg Match Score Delta | +5.5 pts | **+8.0 pts** (+8.7 pts across improvable cases) | **+45% higher lift** |
| Max Match Score Delta | +7 pts | **+27 pts** (`46 → 73`) | **Up to +27 pts** |
| Multi-Job Parsing (`real_24cbaa65`) | 1 collapsed job, 1 suggestion | **4 real jobs, 11 suggestions, 10 keywords added** | **Fixed** |
| Truncations (<0.75x length) | 0/4 (historical Supabase: 16/61) | **0/12 (0.82x – 1.83x)** | **0 truncations** |
| Avg Latency | 16.9s (51–82s during 429/timeout spikes) | **29.3s** (12.4s – 43.8s consistent) | Predictable, 0 timeouts |

---

## 2. Full 12-Case Scorecard (`evals/baseline-results.json`)

| Case ID | Role / Industry | Type | Latency | Length Ratio | Before → After | Delta | Suggestions | Keywords Added | Summary Updated |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| `real_24cbaa65` | Administrative Assistant | Real | 37.0s | 1.35x | 50 → 59 | **+9** | 11 | **10** | No *(JEV rejected)* |
| `real_47979c65` | Software Engineer | Real | 31.1s | 1.20x | 81 → 86 | +5 | 11 | **11** | No *(JEV rejected)* |
| `real_1e0cb30c` | Manufacturing Manager | Real | 36.1s | 1.48x | 68 → 73 | +5 | 15 | **12** | No *(no summary)* |
| `real_2bdb399f` | AI Software Engineer | Real | 37.5s | 0.82x | 34 → 48 | **+14** | 4 | **6** | **Yes** |
| `real_411226c5` | Infrastructure Engineer | Real | 30.9s | 1.08x | 98 → 98 | 0 *(ceiling)* | 9 | **6** | No *(no summary)* |
| `real_24ad1111` | Legal Assistant / Law Clerk | Real | 43.8s | 1.32x | 30 → 35 | +5 | **19** | 3 | No *(JEV rejected)* |
| `real_eb6f96dc` | Data Analyst | Real | 25.0s | 1.05x | 82 → 87 | +5 | 7 | **6** | **Yes** |
| `real_513e3023` | Full-Stack Developer | Real | 28.2s | 1.02x | 62 → 67 | +5 | 5 | 4 | No *(JEV rejected)* |
| `edge_career_changer` | Teacher → Customer Success | Edge | 15.5s | 1.36x | 20 → 25 | +5 | 1 | 1 | No *(no summary)* |
| `edge_messy_no_bullets` | Warehouse Supervisor | Edge | 17.8s | 1.83x | 46 → 73 | **+27** | 2 | **5** | No *(no summary)* |
| `edge_sparse_new_grad` | Junior Data Analyst | Edge | 12.4s | 1.42x | 25 → 30 | +5 | 1 | 0 | No *(no summary)* |
| `edge_executive_long` | VP of Engineering | Edge | 35.8s | 1.70x | 52 → 63 | **+11** | 5 | 0 | No *(JEV rejected)* |

---

## 3. Historical Production Baseline (n = 61 Substantive Resumes in Supabase)

| Metric | Historical Prod | Target |
|---|---:|---:|
| `before_score === 0` (broken scoring) | 31 (50.8%) | 0% |
| `after_score === 0` | 4 (6.6%) | 0% |
| Severe truncation (<50% length) | 5 (8.2%) | 0% |
| Moderate truncation (50–75% length) | 11 (18.0%) | <2% |

---

## 4. Key Gaps Found in This 12-Case Run (Next Targets)

1. **5 of 7 Summary rewrites were rejected by the JEV authenticity/tone gate (`buzzword_heavy` / `authNoul: 0.11`).**
   When Summary rewrites passed (`real_2bdb399f`), the score jumped **+14 pts**. Tightening `getHolisticSummaryPrompt` to avoid generic corporate buzzwords and stay grounded in the candidate's actual bullets will unlock larger deltas across all real resumes.
2. **`skillsChange` is still a no-op in `surgicalTailor.ts`.**
   `bulletPlanner` enables `skillsChange: true`, but `surgicalTailor.ts` does not yet tailor/reorder the Skills section (e.g. `real_513e3023` still left 19 missing keywords untouched).
3. **Domain classifier false positives:**
   `real_2bdb399f` (AI Software Engineer) and `real_513e3023` (Full-Stack Developer) were misclassified as `industryCategory: "healthcare"` in `domainTaxonomy.ts`, and `real_47979c65` (Software Engineer) was classified as `"finance_accounting"`.
4. **Strict truthfulness guard on messy inputs:**
   In `edge_messy_no_bullets` (`46 → 73`, +27 pts), `qwen3.8-max` added JD terms `"WMS workflows"` and `"OTIF"` that weren't in the candidate's original text. Adding an explicit "use `ElicitationPanel` to confirm missing tools instead of inserting unverified tools" guard keeps resumes 100% honest.
5. **Free-tier tightening + Marketing execution:**
   Codebase and `docs/30-DAY-MARKETING-PLAYBOOK.md` are ready; tightening the free tier (audit + diff preview free, full PDF behind the $9 Sprint Pass) remains the #1 monetization lever.
