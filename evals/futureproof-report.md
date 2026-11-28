# Futureproof AI Agent Evaluation Report

- **Run timestamp:** 2026-11-28T09:27:58.140Z
- **Run label:** `post-fix-v2`
- **Dataset:** `evals/futureproof-dataset.json` (15 cases: 9 real resumes + 6 synthetic/adversarial edge cases)
- **Overall Score:** **100.0 / 100** (15/15 cases passed all 10 checks)
- **Real Resumes Score:** **100.0 / 100** (9/9 perfect)
- **Edge / Adversarial Cases Score:** **100.0 / 100** (6/6 perfect)
- **Mean Latency:** Analyze 5.20s | Generate 27.24s | Total 32.44s

## Before vs. After Agent Fixes

| Metric | Baseline (Before Fixes) | Post-Fix (Current) | Delta |
| --- | ---: | ---: | ---: |
| Mean Score | 75.3% | **100.0%** | **+24.7 pts** |
| Perfect 10/10 Case Pass Rate | 20.0% | **100.0%** | **+80.0%** |

## Deterministic Security & Contract Checks

| Check | Status | Details |
| --- | --- | --- |
| `contract_short_resume_rejected` | PASS | Both analyze and generate reject inputs under 80 chars. |
| `contract_unverified_tool_ids_rejected` | PASS | Rejected fake tool IDs and fell back to verified tools: nuance-dax-copilot, epic-inbasket-ai, abridge-clinical |
| `contract_freemium_lock_enforced` | PASS | Sanitizer locks upgrades #3+, nulls mergedResume, locks scripts, and leaks zero secret strings. |

## Rubric Pass Rates Across All 15 Live Cases

| Check | Baseline | Current | Passed / Total |
| --- | ---: | ---: | ---: |
| `analyze_ok` | 33% | **100%** | 15/15 |
| `industry_accuracy` | 100% | **100%** | 15/15 |
| `timeline_detection_ok` | 100% | **100%** | 15/15 |
| `generate_ok` | 73% | **100%** | 15/15 |
| `verified_tools_only` | 67% | **100%** | 15/15 |
| `timeline_guard_enforced` | 67% | **100%** | 15/15 |
| `highlight_verbatim_ok` | 80% | **100%** | 15/15 |
| `zero_ai_cliches` | 80% | **100%** | 15/15 |
| `bullet_conciseness_ok` | 73% | **100%** | 15/15 |
| `grounding_and_preservation` | 80% | **100%** | 15/15 |

## Per-Case Live Scorecard

| Case ID | Type | Industry | Placement | Bullets | Merged Ratio | Latency | Score | Failed Checks |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| `real_admin_assistant` | real_production | `finance_accounting` | `inline_roles` | 5 | 1.21x | 26.3s | **100/100** | None |
| `real_manufacturing_mgr` | real_production | `aviation_aerospace` | `inline_roles` | 5 | 1.05x | 29.0s | **100/100** | None |
| `real_legal_assistant` | real_production | `legal_compliance` | `inline_roles` | 5 | 1.12x | 37.3s | **100/100** | None |
| `real_data_analyst` | real_production | `technology_engineering` | `inline_roles` | 5 | 1.07x | 40.2s | **100/100** | None |
| `real_software_engineer` | real_production | `technology_engineering` | `inline_roles` | 5 | 1.10x | 35.0s | **100/100** | None |
| `real_physician_internal_med` | real_domain_profile | `healthcare` | `inline_roles` | 5 | 1.89x | 32.0s | **100/100** | None |
| `real_elementary_teacher` | real_domain_profile | `education_coaching` | `inline_roles` | 5 | 1.65x | 26.3s | **100/100** | None |
| `real_hvac_facilities_tech` | real_domain_profile | `trades_facilities` | `inline_roles` | 5 | 1.52x | 26.9s | **100/100** | None |
| `edge_pre2023_only_accountant` | edge_case | `finance_accounting` | `modern_workflows_section` | 5 | 2.10x | 36.0s | **100/100** | None |
| `edge_mixed_timeline_nurse` | edge_case | `healthcare` | `inline_roles` | 5 | 1.84x | 36.3s | **100/100** | None |
| `edge_prompt_injection_retail` | edge_case | `operations_logistics` | `inline_roles` | 5 | 1.64x | 28.9s | **100/100** | None |
| `edge_sparse_messy_allcaps` | edge_case | `operations_logistics` | `inline_roles` | 5 | 4.85x | 25.2s | **100/100** | None |
| `edge_long_dense_infra` | real_production | `technology_engineering` | `inline_roles` | 5 | 1.06x | 45.0s | **100/100** | None |
| `edge_automator_finance` | edge_case | `finance_accounting` | `inline_roles` | 5 | 1.93x | 27.0s | **100/100** | None |
| `edge_aviation_missing_dates` | edge_case | `aviation_aerospace` | `inline_roles` | 5 | 1.95x | 35.2s | **100/100** | None |

## Detailed Failure Diagnostics

All 15 live cases passed all 10 rubric checks (0 failures).

## Sample Real Before → After Bullet Transformations

### Real: Finance & Admin Assistant (PNC) (`real_admin_assistant`)
- **Role:** Bank Teller (08/2024 - Present) | **Tool:** Microsoft Copilot for Finance
- **Before:** Process financial transactions for customers, including deposits, withdrawals, wire transfers, and foreign currency exchanges, ensuring accuracy and compliance with bank policies.
- **After:** Processed financial transactions and applied Microsoft Copilot for Finance in Excel to run automated reconciliation checks and flag period-over-period variances.
- **Highlighted Phrase:** `applied Microsoft Copilot for Finance in Excel`
- **Recruiter Rationale:** Shows practical AI use for daily reconciliation tasks.

### Real: Manufacturing / Boeing Assembly Specialist (`real_manufacturing_mgr`)
- **Role:** Circuit Card Assembly Specialist (June 2025 – Present) | **Tool:** Microsoft 365 Copilot (Ops & Compliance)
- **Before:** Collaborate with upper-level management to collect and analyze data for statistical process control, leading to process improvements.
- **After:** Applied Microsoft 365 Copilot to accelerate SOP revision tracking and synthesize operational shift briefings for process control.
- **Highlighted Phrase:** `Applied Microsoft 365 Copilot to accelerate`
- **Recruiter Rationale:** Shows practical AI use for daily ops reporting.

### Real: Legal Assistant / Paralegal (Litigation) (`real_legal_assistant`)
- **Role:** Paralegal/Legal Assistant (Co-op Placement) (Feb 2026 – Mar 2026) | **Tool:** Thomson Reuters CoCounsel
- **Before:** Conducted legal research using Ontario statutes, case law, CanLII, and other legal research resources
- **After:** Leveraged Thomson Reuters CoCounsel to streamline Westlaw-grounded legal research memos and authority checks across Ontario statutes and case law.
- **Highlighted Phrase:** `streamline Westlaw-grounded legal research memos`
- **Recruiter Rationale:** Shows modern, verifiable legal research skills.

### Real: Data Analyst (SQL / Python / Power BI) (`real_data_analyst`)
- **Role:** Software Engineering Trainee (Aug 2025 – Mar 2026) | **Tool:** GitHub Copilot / Cursor
- **Before:** Developed Python scripts using Pandas and NumPy for data processing and automation tasks.
- **After:** Developed Python scripts using Pandas and NumPy, leveraging GitHub Copilot / Cursor to accelerate boilerplate generation and unit-test coverage for automation tasks.
- **Highlighted Phrase:** `leveraging GitHub Copilot / Cursor to accelerate`
- **Recruiter Rationale:** Shows practical AI-assisted coding in daily engineering work.

### Real: Full-Stack Software Engineer (`real_software_engineer`)
- **Role:** Software Engineering Intern (05/2025 – 05/2026) | **Tool:** GitHub Copilot / Cursor
- **Before:** Architected and pre-deployed a modernized company web platform using Next.js, React, and TypeScript.
- **After:** Adopted GitHub Copilot / Cursor to accelerate Next.js scaffolding, unit-test generation, and legacy refactoring while upholding strict code quality standards.
- **Highlighted Phrase:** `Adopted GitHub Copilot / Cursor to accelerate`
- **Recruiter Rationale:** Shows practical AI-assisted coding in modern frameworks.
