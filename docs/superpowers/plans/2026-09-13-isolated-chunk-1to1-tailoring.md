# Isolated Chunk Context & 1-to-1 Line-by-Line Tailoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate cognitive overload and hallucination risk by isolating experience tailoring context to the active job role only, enforcing a strict 1-for-1 bullet JSON schema, and rendering a clean 1:1 line diff in the review cockpit.

**Architecture:** Refactor `getExperienceBulletsPrompt` to strip out the full resume and enforce a structured JSON output of length $N$ matching the original bullet indices. Build a resilient normalizer in `tailor-chunk` and `surgicalTailor` that guarantees exactly $N$ suggestions with zero dropped lines. Update `ResumeSuggestionReviewer` to display a focused 1:1 comparison stack with before/after line diffs and one-click actions.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5.9, Vitest, Tailwind CSS.

**Spec:** `specs/isolated-chunk-1to1-tailoring/spec.md`

## Global Constraints
- **Zero Full-Resume Bleed (@EARS-1)**: Experience prompts SHALL NEVER receive `rawResume`. Input is strictly limited to active job metadata, original bullets $[0 \dots N-1]$, and target job description keywords.
- **Strict 1-to-1 Preservation (@EARS-2, @EARS-3)**: Every original bullet index $i \in [0 \dots N-1]$ must have an explicit 1:1 mapped suggestion. No bullets dropped, none added out of thin air.
- **Fault-Tolerant Parsing (@EARS-8, @EARS-9)**: If the LLM generates invalid JSON or drops bullets, deterministic fallback line pairing SHALL recover all original bullets without failing or throwing 500.
- **Zero TypeScript Errors**: `npx tsc --noEmit` must pass with 0 errors.
- **Build Isolation**: Build must succeed cleanly both with and without `STRIPE_SECRET_KEY`.

---

### Task 1: Prompt Contract & Context Sandbox Refactor

**Files:**
- Modify: `src/app/prompts/tailoringSection.ts:60-120`
- Test: `tests/unit/prompts/tailoring.test.ts`

**Interfaces:**
- Consumes: `company`, `jobTitle`, `dates`, `bulletsText`, `jobDescription`, `userRequestedKeywords`, `preferences`.
- Produces: `getExperienceBulletsPrompt` outputting a strict JSON array prompt without `resumeContext`.

- [x] **Step 1: Write the failing test in `tests/unit/prompts/tailoring.test.ts`**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Update `getExperienceBulletsPrompt` in `src/app/prompts/tailoringSection.ts`**
- [x] **Step 4: Run test to verify it passes**
- [x] **Step 5: Commit changes**

---

### Task 2: Chunk Endpoint Normalizer & Deterministic Fallback

- [x] **Step 1: Write failing tests in `tests/unit/agent/tailor-chunk.test.ts`**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Implement JSON normalizer and fallback parser in `src/app/api/agent/tailor-chunk/route.ts`**
- [x] **Step 4: Run test to verify it passes**
- [x] **Step 5: Commit changes**

---

### Task 3: Surgical Tailor Node Alignment

- [x] **Step 1: Write failing test in `tests/unit/agent/section-grouping.test.ts`**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Update `src/app/agent/nodes/surgicalTailor.ts`**
- [x] **Step 4: Run test to verify it passes**
- [x] **Step 5: Commit changes**

---

### Task 4: 1:1 Cognitive Diff Cockpit UI

- [x] **Step 1: Refactor bullet list view in `src/app/components/ResumeSuggestionReviewer.tsx`**
- [x] **Step 2: Verify in tests and build**
- [x] **Step 3: Commit changes**

---

### Task 5: End-to-End Verification & Push

- [x] **Step 1: Run full test suite**
- [x] **Step 2: Run TypeScript check**
- [x] **Step 3: Run preview build simulation**
- [x] **Step 4: Push to origin**

