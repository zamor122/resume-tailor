# Activation and Monetization Acceleration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the CEO Agent's direct strategy for AI Resume Tailor: (1) accelerate candidate activation by deploying onboarding triggers and lifecycle drips to convert the 17 unactivated signups, and (2) iterate monetization by shifting from 3 free resumes to 1 free resume + feature-gated Change Studio upsells and a 24-hour launch offer banner.

**Architecture:** 
- In Phase 1 (Activation): We ensure the automated lifecycle drip engine processes pending lifecycle dispatches, and we add a "Quick Start / Sample Job Profile" prompt on the tailoring workspace when a user has zero tailored resumes.
- In Phase 2 (Monetization): We update `FREE_RESUME_LIMIT` in `src/app/config/pricing.ts` from 3 to 1, update associated copy in pricing and marketing pages, update tests in `accessManager.test.ts`, and implement a high-converting neo-brutalist Launch Pass banner offering the \$6/48h pass for authenticated users within their first 24 hours.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Supabase Auth/DB, Stripe, Vitest.

**Spec:** [docs/superpowers/specs/2026-11-17-soft-neobrutalism-gamification-design.md](file:///Users/shaynezamora/Documents/resume-tailor/docs/superpowers/specs/2026-11-17-soft-neobrutalism-gamification-design.md) & [AI_RESUME_TAILOR_FACTORY_STATUS.md](file:///Users/shaynezamora/.gemini/antigravity/brain/717458ad-e097-4acb-bb55-6d28fe2c80d5/AI_RESUME_TAILOR_FACTORY_STATUS.md)

---

### Task Decomposition

- [ ] **Task 1: Monetization Core — Shift `FREE_RESUME_LIMIT` from 3 to 1 with Test Verification**
  - [ ] Update `FREE_RESUME_LIMIT = 1` in `src/app/config/pricing.ts`.
  - [ ] Update unit tests in `tests/unit/utils/accessManager.test.ts` to reflect the 1-resume free tier threshold.
  - [ ] Run vitest to verify all accessManager and pricing tests pass.

- [ ] **Task 2: UI & Copy Alignment — Update Free Tier References Across Frontend & SEO Pages**
  - [ ] Update `src/app/pricing/page.tsx` copy (`1 Free AI Tailor` instead of `3 Free AI Tailors`).
  - [ ] Update `src/app/components/SplitScreenTailorView.tsx` ("First resume free • No card required").
  - [ ] Update `src/app/components/AlternativeComparisonTable.tsx`, `AlternativeFaq.tsx`, and `StructuredData.tsx`.
  - [ ] Run full test suite (`npm test -- --run`) to verify zero regressions across all 102 suites.

- [ ] **Task 3: Conversion Accelerator — 24-Hour Job Hunt Launch Offer Banner**
  - [ ] Create `src/app/components/LaunchOfferBanner.tsx` with soft neo-brutalist design (amber/yellow accent, high contrast, countdown clock).
  - [ ] Mount the banner on the main tailor screen for authenticated candidates within their first 24 hours of signup with < 2 resumes.
  - [ ] Add unit test `tests/unit/components/LaunchOfferBanner.test.tsx` verifying conditional rendering and dismiss behavior.

- [ ] **Task 4: Activation Engine — Zero-Resume Quick Launch Templates**
  - [ ] In `src/app/components/TailorForm.tsx` (or job description input area), add 3 one-click sample role presets ("Senior Frontend Engineer", "Product Manager", "Account Executive") if the user has 0 tailored resumes.
  - [ ] Clicking a preset auto-populates a sample job description so the candidate can experience the AI Tailor in 10 seconds without hunting for an external job URL.
  - [ ] Add unit test verifying preset insertion.

- [ ] **Task 5: End-to-End Verification & Factory Briefing Update**
  - [ ] Run complete test suite (`npm test -- --run`).
  - [ ] Run `npx tsc --noEmit` to guarantee strict TypeScript compliance.
  - [ ] Run `node scripts/factory-executive-briefing.mjs` to refresh the CEO telemetry briefing.
