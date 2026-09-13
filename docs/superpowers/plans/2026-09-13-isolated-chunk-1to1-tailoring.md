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

- [ ] **Step 1: Write the failing test in `tests/unit/prompts/tailoring.test.ts`**

Add tests verifying that `getExperienceBulletsPrompt` does not contain full resume context and requires a strict JSON array:

```typescript
it("should isolate experience context and require structured JSON array matching bullet count", () => {
  const prompt = getExperienceBulletsPrompt({
    jobTitle: "Senior Software Engineer",
    company: "Acme Corp",
    dates: "2021 - Present",
    bulletsText: "- Led team of 5 engineers.\n- Built real-time pipeline in Go.",
    jobDescription: "Looking for Go and Kubernetes experience.",
    userRequestedKeywords: ["Kubernetes", "Go"],
  });

  expect(prompt).not.toContain("Full resume (for context only)");
  expect(prompt).toContain("Output ONLY a valid JSON array");
  expect(prompt).toContain('"originalText"');
  expect(prompt).toContain('"suggestedText"');
  expect(prompt).toContain('"reason"');
  expect(prompt).toContain('"keywords"');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/prompts/tailoring.test.ts`
Expected: FAIL (contains "Full resume (for context only)" and lacks JSON schema instructions).

- [ ] **Step 3: Update `getExperienceBulletsPrompt` in `src/app/prompts/tailoringSection.ts`**

Update the function to accept indexed bullets, remove `resumeContext`, and enforce a JSON array schema:

```typescript
export function getExperienceBulletsPrompt(params: {
  jobTitle: string;
  company: string;
  dates: string | null;
  bulletsText: string;
  jobDescription: string;
  userInstructions?: string;
  userRequestedKeywords?: string[];
  preferences?: TailoringPreferences;
}): string {
  const { jobTitle, company, dates, bulletsText, jobDescription, userInstructions, userRequestedKeywords, preferences } = params;
  const userBlock = userInstructions ? `\nUSER-SPECIFIC INSTRUCTIONS:\n${userInstructions}\n` : "";
  const keywordsBlock = userRequestedKeywords && userRequestedKeywords.length > 0 ? `\nTARGET KEYWORDS: ${userRequestedKeywords.join(", ")}\n` : "";
  const leverBlock = preferences ? `\n${buildLeverInstructions(preferences)}\n` : "";

  return `You are an elite executive resume writer. Tailor the bullet points for this specific role against the target job description.
${leverBlock}${userBlock}${keywordsBlock}
TARGET ROLE METADATA (context boundary - do not repeat):
- Title: ${jobTitle}
- Company: ${company}
- Dates: ${dates || "—"}

TARGET JOB DESCRIPTION:
"""
${jobDescription.slice(0, 2500)}
"""

ORIGINAL BULLETS FOR THIS ROLE:
"""
${bulletsText}
"""

CRITICAL INSTRUCTIONS:
1. STRICT 1-TO-1 MAPPING: For every original bullet, generate exactly one enhanced version. Do NOT merge bullets, split bullets, delete bullets, or create new bullets.
2. ENHANCEMENT RULES:
   - Strong past-tense action verb + specific technologies/tools + quantified business or engineering impact.
   - Weave in target job keywords only where relevant to the candidate's authentic experience.
   - Do NOT use fluff ("passionate", "results-driven").
3. OUTPUT FORMAT: Output ONLY a valid JSON array with the exact same number of items as the original bullets:
[
  {
    "index": 0,
    "originalText": "exact original bullet without leading dash",
    "suggestedText": "tailored bullet without leading dash",
    "status": "enhanced",
    "reason": "Tactical justification (e.g. Added Go/Kubernetes metrics)",
    "keywords": ["Go", "Kubernetes"]
  }
]
Output valid JSON only. No markdown fences, no conversational intro or outro.`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/prompts/tailoring.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/app/prompts/tailoringSection.ts tests/unit/prompts/tailoring.test.ts
git commit -m "feat(prompts): isolate experience chunk context and enforce 1-to-1 JSON schema"
```

---

### Task 2: Chunk Endpoint Normalizer & Deterministic Fallback

**Files:**
- Modify: `src/app/api/agent/tailor-chunk/route.ts`
- Test: `tests/unit/agent/tailor-chunk.test.ts`

**Interfaces:**
- Consumes: LLM output string, original bullet lines, target keywords.
- Produces: `parseChunkBulletsResponse` returning `ResumeSuggestion[]` of length matching `origBullets.length`.

- [ ] **Step 1: Write failing tests in `tests/unit/agent/tailor-chunk.test.ts`**

Add unit tests covering:
1. Valid JSON array parsing into 1:1 suggestions.
2. JSON inside markdown code fence (` ```json ... ``` `).
3. Resilient fallback when LLM returns plain bullet lines or malformed JSON (never drops original bullets).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/agent/tailor-chunk.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement JSON normalizer and fallback parser in `src/app/api/agent/tailor-chunk/route.ts`**

Implement `parseChunkBulletsResponse`:
- Clean JSON string (strip markdown fences).
- Try `JSON.parse`.
- Validate array structure.
- If JSON succeeds, map each item guaranteeing `originalText` matches the $i$-th original bullet.
- If JSON fails, fallback to line-by-line pairing of raw bullet lines against original bullet lines.
- Guarantee returned suggestions length equals original bullets count.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/agent/tailor-chunk.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/app/api/agent/tailor-chunk/route.ts tests/unit/agent/tailor-chunk.test.ts
git commit -m "feat(api): add resilient 1-to-1 JSON parser and fallback in tailor-chunk"
```

---

### Task 3: Surgical Tailor Node Alignment

**Files:**
- Modify: `src/app/agent/nodes/surgicalTailor.ts:60-120`
- Test: `tests/unit/agent/section-grouping.test.ts`

**Interfaces:**
- Consumes: `AgentState`, `resumeAST`, `bulletPlan`.
- Produces: `surgicalTailorNode` executing isolated chunk calls and storing 1:1 suggestions.

- [ ] **Step 1: Write failing test in `tests/unit/agent/section-grouping.test.ts`**

Verify that experience bullet calls in surgicalTailor do not pass `rawResume` as context and yield 1:1 mapped suggestion objects.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/agent/section-grouping.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `src/app/agent/nodes/surgicalTailor.ts`**

Remove `resumeContext: rawResume` from `getExperienceBulletsPrompt` invocation and use the resilient 1:1 parser to populate `suggestions`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/agent/section-grouping.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/app/agent/nodes/surgicalTailor.ts tests/unit/agent/section-grouping.test.ts
git commit -m "feat(agent): update surgicalTailor node to use isolated chunk context"
```

---

### Task 4: 1:1 Cognitive Diff Cockpit UI

**Files:**
- Modify: `src/app/components/ResumeSuggestionReviewer.tsx`

**Interfaces:**
- Consumes: `activeGroup.suggestions`, `activeGroup.originalContent`.
- Produces: Clean 1:1 comparison cards with line diffs, keyword badges, and one-click accept/keep buttons.

- [ ] **Step 1: Refactor bullet list view in `src/app/components/ResumeSuggestionReviewer.tsx`**

Replace cluttered display with focused 1:1 line diff cards:
- **Card Header**: "Bullet X of N" with category badge and keyword badges.
- **Diff Section**:
  - `Original`: Light red/rose container with exact original bullet text.
  - `Tailored`: Emerald/teal container with tailored text and highlighted keyword tags.
- **Single-Click Actions**:
  - `✓ Accept` (Emerald active button)
  - `✕ Keep Original` (Revert button)
  - `✎ Edit` (Opens clean inline edit box)
- **Zero Full-Document Clutter**: The user sees only the active role's bullets.

- [ ] **Step 2: Verify in tests and build**

Run: `npx vitest run tests/unit/lib/stripe.test.ts tests/unit/agent/tailor-chunk.test.ts`
Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit changes**

```bash
git add src/app/components/ResumeSuggestionReviewer.tsx
git commit -m "feat(ui): implement 1-to-1 line comparison card stack in review cockpit"
```

---

### Task 5: End-to-End Verification & Push

**Files:**
- Verification across full repo.

- [ ] **Step 1: Run full test suite**
Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Run TypeScript check**
Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Run preview build simulation**
Run: `STRIPE_SECRET_KEY="" npx next build`
Expected: Exit code 0, all 58 pages compiled.

- [ ] **Step 4: Push to origin**
Run: `git push origin feature/section-narrative-review-flow`
Expected: Pushed successfully to preview deployment.
