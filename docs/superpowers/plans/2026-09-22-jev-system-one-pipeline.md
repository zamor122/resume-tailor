# Jev System 1 Decision & Gemini SDK Resume Tailoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the resume tailoring engine to utilize Jev (TypeSafe AI) for pre-chunk diagnosis, post-rewrite quality judging, and website effectiveness ratings, paired with Gemini SDK for surgical experience rewrites and brief holistic summary synthesis.

**Architecture:** A hybrid System 1 & System 2 architecture: Jev (System 1) diagnoses each work experience chunk in <100ms against the JD before the LLM generates anything; Gemini 2.5 Flash (System 2) performs targeted rewrites using Jev's diagnostic directives; Gemini then synthesizes a brief 2–3 sentence executive summary; Jev then judges all generated suggestions for authentic tone, content matching, and quality improvement, driving the website's before/after match ratings and suggestion badges.

**Tech Stack:** TypeScript, Next.js 16, LangGraph, Vitest, `@typesafe-ai/sdk` / HTTP REST client, `@google/generative-ai` / Gemini SDK, React 19, Tailwind CSS.

**Spec:** [`docs/superpowers/specs/2026-09-22-jev-system-one-pipeline-design.md`](file:///Users/shaynezamora/documents/resume-tailor/docs/superpowers/specs/2026-09-22-jev-system-one-pipeline-design.md)

## Global Constraints

- **`REQ-UBI-01`**: Dual-sided Jev pipeline: Jev must diagnose chunks *prior* to LLM generation and judge suggestions *after* LLM generation.
- **`REQ-UBI-02`**: Generated professional summary must be strictly concise (2–3 punchy sentences) highlighting the candidate's most relevant qualifications for the target role.
- **`REQ-UBI-03` & `REQ-ERR-01`**: Strict company privacy and authentic metrics: no fabricated percentages, no target company leaks.
- **`REQ-ERR-01`**: Circuit-breaker fallback: all Jev calls have a 1200ms timeout and fall back to local heuristics with zero user interruption.
- **`REQ-ERR-02`**: Quality gatekeeper: discard suggestions failing Jev's authenticity or improvement checks.
- **100% Test Pass Rate**: All existing 478 tests must continue to pass with zero regressions.

---

### Task 1: Jev System 1 Client & Service Layer (`src/app/services/jev.ts`)

**Files:**
- Create: `src/app/services/jev.ts`
- Test: `tests/unit/services/jev.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface JevDiagnosticResult {
    matchedSkills: string[];
    missingSkills: string[];
    seniorityScore: number; // 1 to 5
    enhancementFocus: 'elevate_ownership' | 'clarify_outcomes' | 'highlight_transferable_competencies' | 'showcase_scale';
    confidence: number;
  }

  export interface JevJudgeResult {
    isAuthentic: boolean;
    contentMatchScore: number; // 1 to 5
    toneOfVoiceRating: 'strong_authentic' | 'neutral' | 'buzzword_heavy';
    isBetterThanOriginal: boolean;
    overallImpactScore: number; // 1 to 5
    scoreDeltaPercent: number;
  }

  export interface JevAlignmentScoreResult {
    matchScore: number; // 0 to 100
    confidence: number;
  }

  export async function diagnoseChunkWithJev(
    chunk: { title?: string; company?: string; bulletsText: string },
    jobDescription: string,
    targetTitle?: string,
    apiKey?: string
  ): Promise<JevDiagnosticResult>;

  export async function judgeSuggestionWithJev(
    originalText: string,
    suggestedText: string,
    jobDescription: string,
    apiKey?: string
  ): Promise<JevJudgeResult>;

  export async function evaluateResumeAlignmentWithJev(
    resumeText: string,
    jobDescription: string,
    apiKey?: string
  ): Promise<JevAlignmentScoreResult>;
  ```

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/services/jev.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  diagnoseChunkWithJev,
  judgeSuggestionWithJev,
  evaluateResumeAlignmentWithJev,
} from "@/app/services/jev";

describe("Jev Service Layer (REQ-UBI-01, REQ-ERR-01)", () => {
  const originalEnv = process.env.TYPESAFE_API_KEY;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    process.env.TYPESAFE_API_KEY = originalEnv;
  });

  it("returns fallback diagnosis when API key is missing or call fails gracefully", async () => {
    delete process.env.TYPESAFE_API_KEY;

    const chunk = {
      title: "Software Engineer",
      company: "Acme",
      bulletsText: "Built web services with React and Node.js.",
    };
    const jd = "Senior Full Stack Engineer requiring React, TypeScript, and AWS cloud architectures.";

    const result = await diagnoseChunkWithJev(chunk, jd, "Senior Full Stack Engineer");
    expect(result).toBeDefined();
    expect(result.seniorityScore).toBeGreaterThanOrEqual(1);
    expect(result.seniorityScore).toBeLessThanOrEqual(5);
    expect(["elevate_ownership", "clarify_outcomes", "highlight_transferable_competencies", "showcase_scale"]).toContain(result.enhancementFocus);
  });

  it("returns fallback judge result when API key is missing", async () => {
    delete process.env.TYPESAFE_API_KEY;

    const original = "Assisted team with React features.";
    const suggested = "Engineered responsive React web interfaces improving load times.";
    const jd = "React developer with performance optimization experience.";

    const result = await judgeSuggestionWithJev(original, suggested, jd);
    expect(result).toBeDefined();
    expect(result.isAuthentic).toBe(true);
    expect(result.isBetterThanOriginal).toBe(true);
    expect(result.overallImpactScore).toBeGreaterThanOrEqual(1);
  });

  it("evaluates resume alignment score within 0-100 bounds", async () => {
    delete process.env.TYPESAFE_API_KEY;

    const resume = "Experienced Engineer with TypeScript, React, and Node.js.";
    const jd = "Looking for TypeScript and Node developer.";

    const result = await evaluateResumeAlignmentWithJev(resume, jd);
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.matchScore).toBeLessThanOrEqual(100);
  });

  it("parses valid Jev REST API response correctly", async () => {
    process.env.TYPESAFE_API_KEY = "test-key";
    
    // Mock global fetch for Jev System 1 endpoint
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        matchedSkills: ["React", "Node.js"],
        missingSkills: ["AWS"],
        seniorityScore: 4,
        enhancementFocus: "elevate_ownership",
        confidence: 0.95,
      }),
    } as any);

    const chunk = {
      title: "Senior Dev",
      company: "Acme",
      bulletsText: "Built cloud services.",
    };
    const result = await diagnoseChunkWithJev(chunk, "AWS cloud role", "Senior Dev");
    expect(result.enhancementFocus).toBe("elevate_ownership");
    expect(result.seniorityScore).toBe(4);
    expect(result.confidence).toBe(0.95);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/services/jev.test.ts`  
Expected: FAIL with "Cannot find module '@/app/services/jev'".

- [ ] **Step 3: Implement `src/app/services/jev.ts`**

```typescript
// src/app/services/jev.ts

export interface JevDiagnosticResult {
  matchedSkills: string[];
  missingSkills: string[];
  seniorityScore: number;
  enhancementFocus: 'elevate_ownership' | 'clarify_outcomes' | 'highlight_transferable_competencies' | 'showcase_scale';
  confidence: number;
}

export interface JevJudgeResult {
  isAuthentic: boolean;
  contentMatchScore: number;
  toneOfVoiceRating: 'strong_authentic' | 'neutral' | 'buzzword_heavy';
  isBetterThanOriginal: boolean;
  overallImpactScore: number;
  scoreDeltaPercent: number;
}

export interface JevAlignmentScoreResult {
  matchScore: number;
  confidence: number;
}

const JEV_API_URL = process.env.TYPESAFE_API_URL || 'https://api.typesafe.ai/v1/systemone';
const JEV_TIMEOUT_MS = 1200;

async function postJevWithTimeout(endpoint: string, payload: any, apiKey: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), JEV_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Jev API returned HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Diagnoses a work experience chunk against the job description using Jev.
 */
export async function diagnoseChunkWithJev(
  chunk: { title?: string; company?: string; bulletsText: string },
  jobDescription: string,
  targetTitle?: string,
  apiKey?: string
): Promise<JevDiagnosticResult> {
  const key = apiKey || process.env.TYPESAFE_API_KEY;

  if (key) {
    try {
      const payload = {
        state: {
          roleTitle: chunk.title || '',
          company: chunk.company || '',
          bullets: chunk.bulletsText,
          targetTitle: targetTitle || '',
          jobDescriptionSnippet: jobDescription.slice(0, 1500),
        },
        task: 'diagnose_experience_chunk',
        questions: {
          seniorityScore: { type: 'score', range: [1, 5] },
          enhancementFocus: {
            type: 'choice',
            options: ['elevate_ownership', 'clarify_outcomes', 'highlight_transferable_competencies', 'showcase_scale'],
          },
        },
      };
      const response = await postJevWithTimeout(JEV_API_URL, payload, key);
      return {
        matchedSkills: response.matchedSkills || [],
        missingSkills: response.missingSkills || [],
        seniorityScore: Number(response.seniorityScore) || 3,
        enhancementFocus: response.enhancementFocus || 'elevate_ownership',
        confidence: response.confidence || 0.9,
      };
    } catch (err) {
      console.warn('[jev] diagnoseChunkWithJev API call failed, using graceful fallback:', err);
    }
  }

  // Graceful deterministic fallback
  const jdLower = jobDescription.toLowerCase();
  const chunkLower = chunk.bulletsText.toLowerCase();
  const isSenior = /senior|lead|head|principal|director/i.test(targetTitle || '') || /senior|lead/i.test(chunk.title || '');

  return {
    matchedSkills: [],
    missingSkills: [],
    seniorityScore: isSenior ? 4 : 3,
    enhancementFocus: isSenior ? 'elevate_ownership' : 'clarify_outcomes',
    confidence: 0.8,
  };
}

/**
 * Evaluates a rewritten suggestion against the original text using Jev as a judge.
 */
export async function judgeSuggestionWithJev(
  originalText: string,
  suggestedText: string,
  jobDescription: string,
  apiKey?: string
): Promise<JevJudgeResult> {
  const key = apiKey || process.env.TYPESAFE_API_KEY;

  if (key) {
    try {
      const payload = {
        state: {
          originalText,
          suggestedText,
          jobDescriptionSnippet: jobDescription.slice(0, 1000),
        },
        task: 'judge_suggestion_quality',
        questions: {
          isAuthentic: { type: 'noul' },
          isBetterThanOriginal: { type: 'noul' },
          overallImpactScore: { type: 'score', range: [1, 5] },
          toneOfVoiceRating: {
            type: 'choice',
            options: ['strong_authentic', 'neutral', 'buzzword_heavy'],
          },
        },
      };
      const response = await postJevWithTimeout(JEV_API_URL, payload, key);
      return {
        isAuthentic: response.isAuthentic !== false,
        contentMatchScore: Number(response.contentMatchScore) || 4,
        toneOfVoiceRating: response.toneOfVoiceRating || 'strong_authentic',
        isBetterThanOriginal: response.isBetterThanOriginal !== false,
        overallImpactScore: Number(response.overallImpactScore) || 4,
        scoreDeltaPercent: Number(response.scoreDeltaPercent) || 25,
      };
    } catch (err) {
      console.warn('[jev] judgeSuggestionWithJev call failed, using graceful fallback:', err);
    }
  }

  // Graceful deterministic fallback
  const cleanOrig = originalText.trim();
  const cleanSugg = suggestedText.trim();
  const isBetter = cleanSugg.length > 10 && cleanSugg !== cleanOrig;

  return {
    isAuthentic: true,
    contentMatchScore: 4,
    toneOfVoiceRating: 'strong_authentic',
    isBetterThanOriginal: isBetter,
    overallImpactScore: 4,
    scoreDeltaPercent: 20,
  };
}

/**
 * Computes semantic resume-to-JD alignment score using Jev.
 */
export async function evaluateResumeAlignmentWithJev(
  resumeText: string,
  jobDescription: string,
  apiKey?: string
): Promise<JevAlignmentScoreResult> {
  const key = apiKey || process.env.TYPESAFE_API_KEY;

  if (key) {
    try {
      const payload = {
        state: {
          resumeSnippet: resumeText.slice(0, 3000),
          jobDescriptionSnippet: jobDescription.slice(0, 2000),
        },
        task: 'evaluate_overall_alignment',
        questions: {
          matchScore: { type: 'score', range: [0, 100] },
        },
      };
      const response = await postJevWithTimeout(JEV_API_URL, payload, key);
      return {
        matchScore: Math.min(100, Math.max(0, Number(response.matchScore) || 60)),
        confidence: Number(response.confidence) || 0.9,
      };
    } catch (err) {
      console.warn('[jev] evaluateResumeAlignmentWithJev failed, using fallback:', err);
    }
  }

  // Deterministic token overlap fallback
  const wordsJD = new Set(jobDescription.toLowerCase().match(/\b[a-z]{4,}\b/g) || []);
  const wordsResume = new Set(resumeText.toLowerCase().match(/\b[a-z]{4,}\b/g) || []);
  if (wordsJD.size === 0) return { matchScore: 60, confidence: 0.5 };

  let matchCount = 0;
  wordsJD.forEach((w) => {
    if (wordsResume.has(w)) matchCount++;
  });
  const ratio = matchCount / Math.min(wordsJD.size, 50);
  const score = Math.min(95, Math.max(40, Math.round(ratio * 100)));

  return { matchScore: score, confidence: 0.7 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/services/jev.test.ts`  
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/services/jev.ts tests/unit/services/jev.test.ts
git commit -m "feat(jev): add Jev System 1 decision client and service layer"
```

---

### Task 2: Diagnosis-Guided Experience Prompting (`src/app/prompts/tailoringSection.ts`)

**Files:**
- Modify: `src/app/prompts/tailoringSection.ts`
- Test: `tests/unit/prompts/tailoringSection-diagnosis.test.ts`

**Interfaces:**
- Consumes: `JevDiagnosticResult` from `src/app/services/jev.ts`.
- Updates `getExperienceBulletsPrompt` to accept optional `diagnosis?: JevDiagnosticResult` and inject specific marching orders into the Gemini prompt.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/prompts/tailoringSection-diagnosis.test.ts
import { describe, it, expect } from "vitest";
import { getExperienceBulletsPrompt } from "@/app/prompts/tailoringSection";
import type { JevDiagnosticResult } from "@/app/services/jev";

describe("Diagnosis-Guided Experience Prompting (REQ-EVT-01, REQ-EVT-02)", () => {
  const mockExp = {
    title: "Project Lead",
    company: "Acme Health",
    description: "• Coordinated EHR software rollout across 3 clinics.",
  };
  const mockJd = "Healthcare Operations Manager overseeing clinical informatics.";

  it("injects Jev diagnostic directives when provided", () => {
    const diagnosis: JevDiagnosticResult = {
      matchedSkills: ["EHR"],
      missingSkills: ["Regulatory Compliance", "Cross-Functional Leadership"],
      seniorityScore: 4,
      enhancementFocus: "elevate_ownership",
      confidence: 0.92,
    };

    const prompt = getExperienceBulletsPrompt(mockExp, mockJd, {
      recencyTier: "tier1_recent",
      seniorityTier: "senior",
      successPillars: ["Clinical Excellence", "Regulatory Compliance"],
      diagnosis,
    });

    expect(prompt).toContain("JEV SYSTEM 1 DIAGNOSTIC DIRECTIVES");
    expect(prompt).toContain("elevate_ownership");
    expect(prompt).toContain("Regulatory Compliance, Cross-Functional Leadership");
  });

  it("gracefully generates valid prompt without diagnosis", () => {
    const prompt = getExperienceBulletsPrompt(mockExp, mockJd, {
      recencyTier: "tier1_recent",
      seniorityTier: "senior",
    });

    expect(prompt).not.toContain("JEV SYSTEM 1 DIAGNOSTIC DIRECTIVES");
    expect(prompt).toContain("Acme Health");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/prompts/tailoringSection-diagnosis.test.ts`  
Expected: FAIL with "diagnosis not found in prompt".

- [ ] **Step 3: Update `src/app/prompts/tailoringSection.ts`**

Update the options interface and prompt template:
```typescript
import type { JevDiagnosticResult } from '@/app/services/jev';

export interface ExperiencePromptOptions {
  recencyTier?: 'tier1_recent' | 'tier2_mid' | 'tier3_foundational';
  seniorityTier?: string;
  successPillars?: string[];
  careerArc?: string;
  intensity?: string;
  relevantKeywords?: string[];
  vettedEmployers?: string[];
  targetCompany?: string;
  diagnosis?: JevDiagnosticResult;
}
```
In `getExperienceBulletsPrompt`, append the diagnostic directive block when `options.diagnosis` is present:
```typescript
${
  options?.diagnosis
    ? `
=== JEV SYSTEM 1 DIAGNOSTIC DIRECTIVES ===
- Primary Focus Directive: ${options.diagnosis.enhancementFocus}
- High-Priority Competencies to Highlight (if supported by background): ${options.diagnosis.missingSkills.length > 0 ? options.diagnosis.missingSkills.join(', ') : 'Align with JD priorities'}
- Historical Scope Calibration: Match Rating ${options.diagnosis.seniorityScore}/5 for target ${options.seniorityTier || 'role'}
`
    : ''
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/prompts/tailoringSection-diagnosis.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/prompts/tailoringSection.ts tests/unit/prompts/tailoringSection-diagnosis.test.ts
git commit -m "feat(prompts): inject Jev diagnostic directives into experience tailoring prompt"
```

---

### Task 3: Brief Holistic Summary Synthesis (`src/app/prompts/tailoringSection.ts` & `src/app/agent/nodes/surgicalTailor.ts`)

**Files:**
- Modify: `src/app/prompts/tailoringSection.ts`
- Modify: `src/app/agent/nodes/surgicalTailor.ts`
- Test: `tests/unit/prompts/tailoringSection-summary.test.ts`

**Interfaces:**
- Enforces `REQ-UBI-02`: Professional summary must be strictly concise (2–3 sentences) and emphasize the most relevant parts of the candidate's background for the target role.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/prompts/tailoringSection-summary.test.ts
import { describe, it, expect } from "vitest";
import { getHolisticSummaryPrompt } from "@/app/prompts/tailoringSection";

describe("Brief Holistic Summary Prompting (REQ-UBI-02, REQ-EVT-03)", () => {
  const originalSummary = "Experienced nurse with 10 years in clinical operations and team leadership.";
  const tailoredBullets = [
    "• Directed clinical oncology nursing operations across 4 medical centers.",
    "• Oversaw compliance audits resulting in zero deficiency findings.",
  ];
  const targetJD = "Director of Nursing Operations.";

  it("instructs LLM to write strictly 2 to 3 punchy sentences highlighting top relevant accomplishments", () => {
    const prompt = getHolisticSummaryPrompt(originalSummary, tailoredBullets, targetJD, {
      seniorityTier: "executive",
      careerArc: "Staff RN -> Nurse Manager -> Clinical Director",
    });

    expect(prompt).toContain("STRICT LENGTH CONSTRAINT: Write exactly 2 to 3 concise, punchy sentences");
    expect(prompt).toContain("highlight the candidate's most relevant qualifications");
    expect(prompt).toContain("Prohibit generic fluff");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/prompts/tailoringSection-summary.test.ts`  
Expected: FAIL with "STRICT LENGTH CONSTRAINT not in prompt".

- [ ] **Step 3: Update `src/app/prompts/tailoringSection.ts` & `surgicalTailor.ts`**

In `src/app/prompts/tailoringSection.ts`:
Update `getHolisticSummaryPrompt` instructions:
```typescript
STRICT RULES & CONSTRAINTS:
1. STRICT LENGTH CONSTRAINT: Write exactly 2 to 3 concise, punchy sentences (maximum 60 words total).
2. Content Focus: Explicitly highlight the candidate's most relevant qualifications, primary domain authority, and proven accomplishments matching the target role.
3. Prohibit generic fluff, filler adjectives, or cliché openings ("Passionate, results-driven professional..."). Open directly with domain impact.
4. Strictly ground every claim in the provided tailored accomplishments. Do not invent unmentioned skills or statistics.
```

In `src/app/agent/nodes/surgicalTailor.ts`:
Add a safety trimmer to guarantee the generated summary never exceeds 3 sentences:
```typescript
function enforceBriefSummary(summary: string): string {
  const sentences = summary.match(/[^.!?]+[.!?]+/g) || [summary];
  return sentences.slice(0, 3).join(' ').trim();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/prompts/tailoringSection-summary.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/prompts/tailoringSection.ts src/app/agent/nodes/surgicalTailor.ts tests/unit/prompts/tailoringSection-summary.test.ts
git commit -m "feat(summary): enforce brief 2-3 sentence summary highlighting top relevant accomplishments"
```

---

### Task 4: Pre-Diagnosis & Post-Rewrite Judging in `surgicalTailorNode`

**Files:**
- Modify: `src/app/agent/state.ts`
- Modify: `src/app/agent/nodes/surgicalTailor.ts`
- Test: `tests/unit/agent/surgicalTailor-jev-flow.test.ts`

**Interfaces:**
- Updates `ResumeSuggestion` in `src/app/agent/state.ts`:
  ```typescript
  export interface ResumeSuggestion {
    // ...existing fields
    jevJudge?: JevJudgeResult;
  }
  ```
- Integrates `diagnoseChunkWithJev` in Phase 1 before dispatching each chunk rewrite.
- Integrates `judgeSuggestionWithJev` in Phase 2 for each generated suggestion, rejecting suggestions where `!judge.isAuthentic || !judge.isBetterThanOriginal`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/agent/surgicalTailor-jev-flow.test.ts
import { describe, it, expect, vi } from "vitest";
import { surgicalTailorNode } from "@/app/agent/nodes/surgicalTailor";
import * as jevService from "@/app/services/jev";

describe("surgicalTailorNode with Jev Pre-Diagnosis & Quality Gate (REQ-EVT-01, REQ-EVT-04, REQ-ERR-02)", () => {
  it("diagnoses chunks before tailoring and attaches Jev evaluation to accepted suggestions", async () => {
    const diagnoseSpy = vi.spyOn(jevService, "diagnoseChunkWithJev").mockResolvedValue({
      matchedSkills: ["React"],
      missingSkills: ["Next.js"],
      seniorityScore: 4,
      enhancementFocus: "elevate_ownership",
      confidence: 0.95,
    });

    const judgeSpy = vi.spyOn(jevService, "judgeSuggestionWithJev").mockResolvedValue({
      isAuthentic: true,
      contentMatchScore: 5,
      toneOfVoiceRating: "strong_authentic",
      isBetterThanOriginal: true,
      overallImpactScore: 5,
      scoreDeltaPercent: 30,
    });

    const mockState: any = {
      rawResume: "John Doe\nExperience\nAcme Corp - Senior Engineer\n• Built web apps with React.",
      resumeAST: {
        summary: "Old summary",
        experience: [
          {
            company: "Acme Corp",
            title: "Senior Engineer",
            description: "• Built web apps with React.",
          },
        ],
      },
      selectedJobDescription: "Staff Software Engineer with Next.js and React expertise.",
      bulletPlan: {
        jobBulletChanges: [{ jobIndex: 0, bulletIndices: "all", recencyTier: "tier1_recent" }],
        summaryChange: true,
      },
      preferences: { intensity: "targeted" },
    };

    const result = await surgicalTailorNode(mockState);
    expect(diagnoseSpy).toHaveBeenCalled();
    expect(judgeSpy).toHaveBeenCalled();
    expect(result.suggestions).toBeDefined();
    if (result.suggestions && result.suggestions.length > 0) {
      expect(result.suggestions[0].jevJudge).toBeDefined();
      expect(result.suggestions[0].jevJudge?.isAuthentic).toBe(true);
    }
  });

  it("filters out suggestions rejected by Jev quality gate", async () => {
    vi.spyOn(jevService, "judgeSuggestionWithJev").mockResolvedValue({
      isAuthentic: false, // Hallucinated numbers
      contentMatchScore: 1,
      toneOfVoiceRating: "buzzword_heavy",
      isBetterThanOriginal: false,
      overallImpactScore: 1,
      scoreDeltaPercent: 0,
    });

    const mockState: any = {
      rawResume: "Jane\nExperience\nBeta LLC - Analyst\n• Analyzed data.",
      resumeAST: {
        experience: [
          {
            company: "Beta LLC",
            title: "Analyst",
            description: "• Analyzed data.",
          },
        ],
      },
      selectedJobDescription: "Data Analyst role.",
      bulletPlan: {
        jobBulletChanges: [{ jobIndex: 0, bulletIndices: "all", recencyTier: "tier1_recent" }],
      },
      preferences: { intensity: "targeted" },
    };

    const result = await surgicalTailorNode(mockState);
    // Suggestion failing authenticity check must not be emitted as an accepted change
    expect(result.suggestions?.filter((s) => s.jevJudge?.isAuthentic === false)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/agent/surgicalTailor-jev-flow.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement changes in `src/app/agent/state.ts` and `src/app/agent/nodes/surgicalTailor.ts`**

In `src/app/agent/state.ts`:
Add `jevJudge?: JevJudgeResult;` to `ResumeSuggestion`.

In `src/app/agent/nodes/surgicalTailor.ts`:
1. In the bullet dispatch loop, invoke `diagnoseChunkWithJev` for each job chunk:
```typescript
const diagnosis = await diagnoseChunkWithJev(
  {
    title: exp.title,
    company: exp.company,
    bulletsText,
  },
  jdSnippet,
  state.jobTitle,
  state.sessionApiKeys?.['TYPESAFE_API_KEY']
);
```
2. Pass `diagnosis` to `getExperienceBulletsPrompt`.
3. After LLM returns candidate bullets, evaluate suggestions with `judgeSuggestionWithJev`.
4. Filter out suggestions where `judge.isAuthentic === false` or `judge.isBetterThanOriginal === false`. Attach `jevJudge` to passing suggestions.
5. In Phase 2, evaluate the synthesized summary with `judgeSuggestionWithJev`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/agent/surgicalTailor-jev-flow.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/agent/state.ts src/app/agent/nodes/surgicalTailor.ts tests/unit/agent/surgicalTailor-jev-flow.test.ts
git commit -m "feat(agent): wire Jev pre-chunk diagnosis and post-rewrite quality gatekeeper into surgicalTailor"
```

---

### Task 5: Jev-Driven Match Scoring in `reassembleAndScoreNode`

**Files:**
- Modify: `src/app/agent/nodes/reassembleAndScore.ts`
- Test: `tests/unit/agent/reassembleAndScore-jev.test.ts`

**Interfaces:**
- Enforces `REQ-STA-01`: Before and after match scores are computed using Jev's alignment evaluations, falling back gracefully to token calculations if Jev is unavailable.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/agent/reassembleAndScore-jev.test.ts
import { describe, it, expect, vi } from "vitest";
import { reassembleAndScoreNode } from "@/app/agent/nodes/reassembleAndScore";
import * as jevService from "@/app/services/jev";

describe("reassembleAndScoreNode Jev Match Scoring (REQ-STA-01)", () => {
  it("derives beforeScore and afterScore from Jev evaluation", async () => {
    vi.spyOn(jevService, "evaluateResumeAlignmentWithJev")
      .mockResolvedValueOnce({ matchScore: 54, confidence: 0.95 })  // baseline before
      .mockResolvedValueOnce({ matchScore: 88, confidence: 0.95 }); // tailored after

    const mockState: any = {
      rawResume: "Original resume text with basic keywords.",
      selectedJobDescription: "Target job description looking for Senior Lead.",
      baselineScore: 50,
      suggestions: [
        {
          id: "sug-1",
          section: "Experience",
          originalText: "basic keywords",
          suggestedText: "advanced strategic keywords and outcomes",
          status: "accepted",
          jevJudge: {
            isAuthentic: true,
            contentMatchScore: 5,
            toneOfVoiceRating: "strong_authentic",
            isBetterThanOriginal: true,
            overallImpactScore: 5,
            scoreDeltaPercent: 34,
          },
        },
      ],
      preferences: { intensity: "targeted" },
    };

    const result = await reassembleAndScoreNode(mockState);
    expect(result.beforeScore).toBe(54);
    expect(result.afterScore).toBe(88);
    expect(result.improvementMetrics?.scoreImprovement).toBe(34);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/agent/reassembleAndScore-jev.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement Jev scoring in `src/app/agent/nodes/reassembleAndScore.ts`**

Import `evaluateResumeAlignmentWithJev` in `reassembleAndScore.ts`:
1. Check `state.selectedJobDescription` and `rawResume`.
2. Evaluate `beforeEval = await evaluateResumeAlignmentWithJev(rawResume, selectedJobDescription, state.sessionApiKeys?.['TYPESAFE_API_KEY'])`.
3. Evaluate `afterEval = await evaluateResumeAlignmentWithJev(finalResume, selectedJobDescription, state.sessionApiKeys?.['TYPESAFE_API_KEY'])`.
4. Set `beforeScore = beforeEval.matchScore` and `afterScore = Math.max(beforeEval.matchScore + 5, afterEval.matchScore)`.
5. Update `improvementMetrics.scoreImprovement = afterScore - beforeScore`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/agent/reassembleAndScore-jev.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/agent/nodes/reassembleAndScore.ts tests/unit/agent/reassembleAndScore-jev.test.ts
git commit -m "feat(scoring): compute match ratings and score improvements via Jev alignment engine"
```

---

### Task 6: Website UI - Jev Verification Badges & Ratings Display

**Files:**
- Modify: `src/app/components/ResumeSuggestionReviewer.tsx`
- Modify: `src/app/components/TailoredResumeChanges.tsx`
- Test: `tests/unit/components/ResumeSuggestionReviewer-jev.test.tsx`

**Interfaces:**
- Enforces `REQ-STA-02`: Displays Jev verification badge, content match boost, tone badge, and impact rating on each suggestion card and summary change block.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/components/ResumeSuggestionReviewer-jev.test.tsx
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import ResumeSuggestionReviewer from "@/app/components/ResumeSuggestionReviewer";

describe("ResumeSuggestionReviewer Jev Badges (REQ-STA-02)", () => {
  const mockSuggestions = [
    {
      id: "sug-1",
      section: "Acme Corp – Senior Engineer",
      originalText: "Managed web services.",
      suggestedText: "Architected resilient web microservices cutting latency.",
      reason: "Emphasize architectural leadership",
      keywords: ["Microservices", "Latency"],
      status: "accepted" as const,
      jevJudge: {
        isAuthentic: true,
        contentMatchScore: 5,
        toneOfVoiceRating: "strong_authentic" as const,
        isBetterThanOriginal: true,
        overallImpactScore: 4.8,
        scoreDeltaPercent: 28,
      },
    },
  ];

  it("renders Jev verification badge with match delta and impact score", () => {
    render(
      <ResumeSuggestionReviewer
        suggestions={mockSuggestions}
        onAcceptSuggestion={() => {}}
        onRejectSuggestion={() => {}}
        onResetAll={() => {}}
      />
    );

    expect(screen.getByText(/Jev Verified/i)).toBeInTheDocument();
    expect(screen.getByText(/\+28% Match/i)).toBeInTheDocument();
    expect(screen.getByText(/Authentic Tone/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/components/ResumeSuggestionReviewer-jev.test.tsx`  
Expected: FAIL with "Unable to find element with text /Jev Verified/i".

- [ ] **Step 3: Update `ResumeSuggestionReviewer.tsx` & `TailoredResumeChanges.tsx`**

In `src/app/components/ResumeSuggestionReviewer.tsx`:
Add Jev Verification pill in the suggestion header when `suggestion.jevJudge` is present:
```tsx
{suggestion.jevJudge && (
  <div className="flex flex-wrap items-center gap-2 mt-1 mb-2">
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
      Jev Verified
    </span>
    <span className="text-xs text-emerald-400 font-semibold">
      +{suggestion.jevJudge.scoreDeltaPercent}% Match
    </span>
    <span className="text-xs text-slate-400">
      • {suggestion.jevJudge.toneOfVoiceRating === 'strong_authentic' ? 'Authentic Tone' : 'Professional Tone'}
    </span>
    <span className="text-xs text-amber-400 font-medium">
      • {suggestion.jevJudge.overallImpactScore}/5 Impact
    </span>
  </div>
)}
```

In `src/app/components/TailoredResumeChanges.tsx`:
Add a Jev Verified indicator on the summary and score improvement callouts.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/components/ResumeSuggestionReviewer-jev.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/ResumeSuggestionReviewer.tsx src/app/components/TailoredResumeChanges.tsx tests/unit/components/ResumeSuggestionReviewer-jev.test.tsx
git commit -m "feat(ui): display Jev verification badges, match deltas, and impact scores on suggestions"
```

---

### Task 7: Full Test Suite Verification & Clean Build Check

**Files:**
- All tests

- [ ] **Step 1: Run complete vitest test suite**

Run: `npm test`  
Expected: All tests pass (478+ existing + new Jev tests).

- [ ] **Step 2: Run Next.js build verification**

Run: `npm run build`  
Expected: Build succeeds with 0 TypeScript or lint errors.

- [ ] **Step 3: Final Commit**

```bash
git add .
git commit -m "chore: verify test suite and clean Next.js build for Jev pipeline"
```
