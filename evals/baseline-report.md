# AI Resume Tailor — Agent & Product Baseline Evaluation (Option A + Tier Tightening)

**Updated:** 2026-11-22  
**Pipeline Mode:** 100% ClinePass (`cline:cline-pass/minimax-m3.1-flash` for read/JSON + `cline:cline-pass/qwen3.8-max` for heavy tailoring)  
**Golden Dataset:** [`evals/golden-dataset.json`](./golden-dataset.json) (8 anonymized real processed resumes + 4 synthetic edge-case resumes)  
**Eval Runner:** [`evals/run-baseline.ts`](./run-baseline.ts) (`npx tsx evals/run-baseline.ts --all`)

---

## 1. Before vs. After Baseline Comparison

| Metric | Initial Baseline (4 cases, Gemini/Groq) | Pre-Option A (12 cases, 100% ClinePass) | Post-Option A (`task-2507` 12 cases + `task-2534` `real_24cbaa65` fix) |
|---|---:|---:|---:|
| Completion / Errors | 4/4 (429/503 + 22s Groq timeouts) | 12/12 (0 errors, 0 fallbacks) | **12/12 (0 errors)** |
| Avg Score Delta | +5.5 pts | +8.0 pts (+8.7 pts improvable) | **+7.2 pts** *(+7.8 pts across 11 improvable cases; Software/Tech classification fixed)* |
| Tech Domain Accuracy | Misclassified 2/3 SWEs as `healthcare`/`finance` | Misclassified 3/4 SWEs | **4/4 Tech Roles classified as `technology_engineering`** |
| Summary Acceptance Rate | — | 2/7 accepted | **3/7 accepted** (`real_47979c65` now accepted, 80→87) |
| Malformed JSON Safety (`real_24cbaa65`) | N/A | N/A | **Fixed in `chunkBulletParser.ts`** (11 clean suggestions, 50→61 (+11), 1.36x, 0 raw JSON leaks) |

---

## 2. Full 12-Case Option A Run (`task-2507`) + Post-Fix Verification (`task-2534`)

| Case ID | Role | Industry Classified | Before → After | Delta | Suggestions | Keywords Added | Summary Updated |
|---|---|---|---:|---:|---:|---:|---|
| `real_24cbaa65` *(post-fix `task-2534`)* | Administrative Assistant | `finance_accounting` | 50 → 61 | **+11** | 11 | 10 | No *(JEV rejected)* |
| `real_47979c65` | Software Engineer | **`technology_engineering`** | 80 → 87 | **+7** | 3 | 8 | **Yes** |
| `real_1e0cb30c` | Manufacturing Manager | **`operations_logistics`** | 68 → 73 | +5 | 13 | 11 | No *(no summary)* |
| `real_2bdb399f` | AI Software Engineer | **`technology_engineering`** | 32 → 38 | +6 | 4 | 9 | **Yes** |
| `real_411226c5` | Infrastructure Engineer | **`technology_engineering`** | 98 → 98 | 0 *(ceiling)* | 7 | 7 | No *(no summary)* |
| `real_24ad1111` | Legal Assistant / Law Clerk | `legal_compliance` | 29 → 34 | +5 | **18** | 12 | No *(JEV rejected)* |
| `real_eb6f96dc` | Data Analyst | `general_business` | 82 → 87 | +5 | 7 | 7 | **Yes** |
| `real_513e3023` | Full-Stack Developer | **`technology_engineering`** | 63 → 68 | +5 | 6 | 0 | No *(JEV rejected)* |
| `edge_career_changer` | Teacher → CSM | `general_business` | 20 → 33 | **+13** | 3 | 3 | No *(no summary)* |
| `edge_messy_no_bullets` | Warehouse Supervisor | `operations_logistics` | 46 → 56 | **+10** | 2 | 6 | No *(no summary)* |
| `edge_sparse_new_grad` | Junior Data Analyst | `sales_marketing` | 25 → 30 | +5 | 1 | 0 | No *(no summary)* |
| `edge_executive_long` | VP of Engineering | `general_business` | 53 → 63 | **+10** | 6 | 0 | No *(JEV rejected)* |

---

## 3. Monetization & Conversion Guardrails Shipped Alongside Option A

1. **Anonymous Tier Tightened (`anonymousTailorAllowance.ts`):** Changed from 1 preview every 24 hours to **1 lifetime anonymous preview per hashed IP** (no daily resets without creating an account).
2. **Free Authenticated Tier Tightened (`pricing.ts`, `humanize/stream/route.ts`, `accessManager.ts`):** Set `FREE_RESUME_LIMIT = 0` (0 free full PDF downloads) and `FREE_AUDIT_LIMIT = 2` (up to 2 free ATS match-score audits + `freeReveal` bullet previews per unpaid account; full downloads & unlimited tailoring require any one-time pass starting at \$9).
