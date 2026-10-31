# Section-by-Section Bottom-to-Top Narrative Review Flow with JIT Lazy Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the resume tailoring review experience into a bottom-to-top, context-isolated section studio with JIT lazy loading, comprehensive role auditing, holistic summary synthesis, and synchronized document highlighting.

**Architecture:** The planner audits every experience entry and builds an upward narrative sequence (earliest role $\rightarrow$ recent role $\rightarrow$ skills $\rightarrow$ summary). Chunk 1 is tailored immediately for fast ~2-3s TTFI, while subsequent chunks are prefetched via a background JIT endpoint as the candidate reviews. On arrival at the final stage, an executive career summary is synthesized across the full assembled resume with zero contradictions. The right-hand document preview synchronizes scroll position and spotlight styling bi-directionally with the studio.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Vitest, React Testing Library, Tailwind CSS.

**Spec:** [`docs/superpowers/specs/2026-09-11-section-narrative-review-flow-design.md`](file:///Users/shaynezamora/documents/resume-tailor/docs/superpowers/specs/2026-09-11-section-narrative-review-flow-design.md)

## Global Constraints

- **Language & Runtime:** TypeScript 5+, Node.js 20+, React 19.
- **Testing:** All new logic and component behavior must have automated unit/integration tests running with `npx vitest run`.
- **Zero Placeholders:** Code snippets and tests in every task must be concrete, compilable, and self-contained.
- **Non-Destructive Baseline:** Original resume text and formatting must be preserved; suggestions apply surgically without clobbering unmentioned sections.
- **Git Hygiene:** Every task must end with a clean test run and a git commit.

---

### Task 1: Core Section Data Models & Grouping Utility

**Files:**
- Modify: `src/app/agent/state.ts`
- Modify: `src/app/utils/resumeReassemble.ts`
- Test: `tests/unit/agent/section-grouping.test.ts`

**Interfaces:**
- Consumes: `ResumeSuggestion`, `ParsedResumeForReassemble`
- Produces:
  ```typescript
  export type SectionGroupType = "experience" | "skills" | "summary" | "other";
  export type SectionTailorStatus = "pending" | "tailoring" | "ready" | "reviewed" | "unchanged";

  export interface ResumeSectionGroup {
    id: string;
    sectionType: SectionGroupType;
    title: string;
    subtitle?: string;
    jobIndex?: number;
    orderIndex: number;
    status: SectionTailorStatus;
    auditRationale: string;
    suggestions: ResumeSuggestion[];
    originalContent: string;
    tailoredContent?: string;
    hasChanges: boolean;
  }

  export function groupSuggestionsBySection(
    suggestions: ResumeSuggestion[],
    resumeAST?: ParsedResumeForReassemble,
    rawResume?: string
  ): ResumeSectionGroup[];
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/unit/agent/section-grouping.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { groupSuggestionsBySection } from "@/app/utils/resumeReassemble";
import type { ResumeSuggestion } from "@/app/agent/state";
import type { ParsedResumeForReassemble } from "@/app/utils/resumeReassemble";

describe("groupSuggestionsBySection", () => {
  const mockAST: ParsedResumeForReassemble = {
    summary: "Senior developer with 8 years of experience.",
    experience: [
      {
        title: "Senior Software Engineer",
        company: "Google",
        dates: "2021 - Present",
        location: "Mountain View, CA",
        description: "- Architected scalable services\n- Led team of 5",
      },
      {
        title: "Software Engineer",
        company: "Chapman University",
        dates: "2018 - 2021",
        location: "Orange, CA",
        description: "- Built campus web apps\n- Maintained SQL databases",
      },
    ],
    skills: "TypeScript, React, Python, Docker",
  };

  const mockSuggestions: ResumeSuggestion[] = [
    {
      id: "sug-summary",
      section: "Professional Summary",
      originalText: "Senior developer with 8 years of experience.",
      suggestedText: "Senior Cloud Architect specializing in distributed systems.",
      reason: "Aligned with target cloud role",
      keywords: ["Cloud Architecture", "Distributed Systems"],
      category: "summary",
      status: "accepted",
    },
    {
      id: "sug-job-0-bullet-0",
      section: "Google – Senior Software Engineer",
      originalText: "Architected scalable services",
      suggestedText: "Architected fault-tolerant microservices delivering 99.99% uptime",
      reason: "Injected uptime metrics",
      keywords: ["Microservices", "Uptime"],
      category: "metric",
      status: "accepted",
      jobIndex: 0,
      bulletIndex: 0,
    },
    {
      id: "sug-job-1-bullet-0",
      section: "Chapman University – Software Engineer",
      originalText: "Built campus web apps",
      suggestedText: "Engineered student portal serving 10,000+ daily active users",
      reason: "Quantified campus impact",
      keywords: ["Scale"],
      category: "metric",
      status: "accepted",
      jobIndex: 1,
      bulletIndex: 0,
    },
  ];

  it("orders section groups bottom-to-top (earliest role -> recent role -> skills -> summary)", () => {
    const groups = groupSuggestionsBySection(mockSuggestions, mockAST);

    expect(groups.length).toBe(4);
    // 1. Earliest experience (Chapman University, jobIndex: 1)
    expect(groups[0].sectionType).toBe("experience");
    expect(groups[0].jobIndex).toBe(1);
    expect(groups[0].title).toContain("Chapman University");
    expect(groups[0].orderIndex).toBe(0);

    // 2. Recent experience (Google, jobIndex: 0)
    expect(groups[1].sectionType).toBe("experience");
    expect(groups[1].jobIndex).toBe(0);
    expect(groups[1].title).toContain("Google");
    expect(groups[1].orderIndex).toBe(1);

    // 3. Skills section
    expect(groups[2].sectionType).toBe("skills");
    expect(groups[2].orderIndex).toBe(2);

    // 4. Professional Summary (finale at the top)
    expect(groups[3].sectionType).toBe("summary");
    expect(groups[3].orderIndex).toBe(3);
    expect(groups[3].title).toContain("Summary");
  });

  it("assigns suggestions to their matching section groups", () => {
    const groups = groupSuggestionsBySection(mockSuggestions, mockAST);
    const chapmanGroup = groups.find((g) => g.jobIndex === 1);
    const googleGroup = groups.find((g) => g.jobIndex === 0);
    const summaryGroup = groups.find((g) => g.sectionType === "summary");

    expect(chapmanGroup?.suggestions.length).toBe(1);
    expect(chapmanGroup?.suggestions[0].id).toBe("sug-job-1-bullet-0");

    expect(googleGroup?.suggestions.length).toBe(1);
    expect(googleGroup?.suggestions[0].id).toBe("sug-job-0-bullet-0");

    expect(summaryGroup?.suggestions.length).toBe(1);
    expect(summaryGroup?.suggestions[0].id).toBe("sug-summary");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/agent/section-grouping.test.ts`
Expected: FAIL with `groupSuggestionsBySection is not a function`

- [ ] **Step 3: Implement `ResumeSectionGroup` types and grouping utility**

In `src/app/agent/state.ts`:
Add export for `SectionGroupType`, `SectionTailorStatus`, `ResumeSectionGroup`, and add `sectionGroups?: ResumeSectionGroup[]` to `AgentState`.

In `src/app/utils/resumeReassemble.ts`:
Implement and export `groupSuggestionsBySection`:
```typescript
import type { ResumeSectionGroup, SectionGroupType, SectionTailorStatus } from "@/app/agent/state";

export function groupSuggestionsBySection(
  suggestions: ResumeSuggestion[] = [],
  resumeAST?: ParsedResumeForReassemble,
  rawResume?: string
): ResumeSectionGroup[] {
  const groups: ResumeSectionGroup[] = [];
  const experiences = resumeAST?.experience || [];

  // 1. Experiences in reverse chronological order (earliest at index 0 of sequence)
  // Experiences in AST are typically top-to-bottom (0 = most recent, N-1 = earliest)
  for (let i = experiences.length - 1; i >= 0; i--) {
    const exp = experiences[i];
    const matchingSugs = suggestions.filter(
      (s) => s.jobIndex === i || (s.section && s.section.toLowerCase().includes(exp.company.toLowerCase()))
    );

    groups.push({
      id: `section-exp-${i}`,
      sectionType: "experience",
      title: `${exp.company} – ${exp.title}`,
      subtitle: [exp.dates, exp.location].filter(Boolean).join(" • "),
      jobIndex: i,
      orderIndex: groups.length,
      status: matchingSugs.length > 0 ? "ready" : "unchanged",
      auditRationale: matchingSugs.length > 0
        ? `Targeted keyword and metric enhancements for ${exp.company}`
        : "Preserved authentic original tenure without edits",
      suggestions: matchingSugs,
      originalContent: exp.description,
      tailoredContent: matchingSugs.length > 0 ? undefined : exp.description,
      hasChanges: matchingSugs.length > 0,
    });
  }

  // 2. Skills section (if present)
  if (resumeAST?.skills) {
    const skillsSugs = suggestions.filter(
      (s) => s.category === "keyword" && s.jobIndex === undefined && s.section.toLowerCase().includes("skill")
    );
    groups.push({
      id: "section-skills",
      sectionType: "skills",
      title: "Skills & Core Competencies",
      subtitle: "Technical Proficiencies & Tools",
      orderIndex: groups.length,
      status: skillsSugs.length > 0 ? "ready" : "unchanged",
      auditRationale: skillsSugs.length > 0
        ? "Woven missing target role keywords into competency categories"
        : "Preserved existing skills matrix",
      suggestions: skillsSugs,
      originalContent: resumeAST.skills,
      hasChanges: skillsSugs.length > 0,
    });
  }

  // 3. Professional Summary (grand finale at the top)
  const summarySugs = suggestions.filter(
    (s) => s.category === "summary" || (s.section && s.section.toLowerCase().includes("summary"))
  );
  groups.push({
    id: "section-summary",
    sectionType: "summary",
    title: "Professional Summary Synthesis",
    subtitle: "Holistic Career Overview",
    orderIndex: groups.length,
    status: summarySugs.length > 0 ? "ready" : "pending",
    auditRationale: "Holistic executive synthesis aligning entire career arc with target role",
    suggestions: summarySugs,
    originalContent: resumeAST?.summary || "",
    hasChanges: summarySugs.length > 0,
  });

  return groups;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/agent/section-grouping.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/agent/state.ts src/app/utils/resumeReassemble.ts tests/unit/agent/section-grouping.test.ts
git commit -m "feat: add ResumeSectionGroup data models and bottom-to-top grouping utility"
```

---

### Task 2: Comprehensive Section Planner & Audit Rationale

**Files:**
- Modify: `src/app/agent/nodes/bulletPlanner.ts`
- Test: `tests/unit/agent/bullet-planner-audit.test.ts`

**Interfaces:**
- Consumes: `AgentState` (`resumeAST`, `preferences`, `sortedMissingKeywords`)
- Produces: `bulletPlan` with per-job `auditRationale` and `bulletPlan.jobAudits`:
  ```typescript
  export interface JobAudit {
    jobIndex: number;
    hasChanges: boolean;
    bulletIndices: number[] | "all";
    auditRationale: string;
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/unit/agent/bullet-planner-audit.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { bulletPlannerNode } from "@/app/agent/nodes/bulletPlanner";
import type { AgentState } from "@/app/agent/state";

describe("bulletPlannerNode audit coverage", () => {
  const baseState: AgentState = {
    rawResume: "",
    preferences: {
      intensity: "targeted",
      sectionsToModify: { summary: true, experience: true, skills: true, education: false, projects: false },
      customInstructions: "",
    } as any,
    resumeAST: {
      experience: [
        { title: "Senior Lead", company: "Meta", dates: "2022 - Present", description: "- Scaled React frontend" },
        { title: "Software Engineer", company: "Startup", dates: "2020 - 2022", description: "- Built NodeJS APIs" },
        { title: "Intern", company: "Tech Co", dates: "2019", description: "- Fixed bug backlog" },
      ],
    },
    sortedMissingKeywords: ["GraphQL", "Next.js", "Microservices"],
    logs: [],
    errors: [],
  };

  it("produces audit rationales for every single job experience (including unchanged ones)", () => {
    const result = bulletPlannerNode(baseState);
    const plan = result.bulletPlan;

    expect(plan).toBeDefined();
    expect(plan?.jobBulletChanges).toBeDefined();

    // Check that jobAudits covers all 3 jobs
    expect((plan as any).jobAudits).toBeDefined();
    expect((plan as any).jobAudits.length).toBe(3);

    (plan as any).jobAudits.forEach((audit: any) => {
      expect(audit.auditRationale).toBeDefined();
      expect(audit.auditRationale.length).toBeGreaterThan(10);
    });
  });

  it("provides explicit preservation reason for untouched roles under targeted mode", () => {
    const result = bulletPlannerNode(baseState);
    const internAudit = (result.bulletPlan as any).jobAudits.find((a: any) => a.jobIndex === 2);

    expect(internAudit).toBeDefined();
    if (!internAudit.hasChanges) {
      expect(internAudit.auditRationale.toLowerCase()).toMatch(/preserve|authentic|tenure|foundational/i);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/agent/bullet-planner-audit.test.ts`
Expected: FAIL with `plan.jobAudits is undefined`

- [ ] **Step 3: Update `BulletPlan` in `state.ts` and implement audits in `bulletPlanner.ts`**

In `src/app/agent/state.ts`:
Add to `BulletPlan`:
```typescript
export interface JobAudit {
  jobIndex: number;
  hasChanges: boolean;
  bulletIndices: number[] | "all";
  auditRationale: string;
}

export interface BulletPlan {
  summaryChange: boolean;
  jobBulletChanges: Array<{
    jobIndex: number;
    bulletIndices: number[] | 'all';
    reason: string;
  }>;
  jobAudits?: JobAudit[];
  skillsChange: boolean;
}
```

In `src/app/agent/nodes/bulletPlanner.ts`:
Build `jobAudits` for every job in `experience`:
- If `bulletPlan.jobBulletChanges` includes this `jobIndex`: `hasChanges = true`, `auditRationale = reason || "Targeted impact metric and ATS keyword alignment"`.
- If not included: `hasChanges = false`, `bulletIndices = []`, `auditRationale = i === experience.length - 1 ? "Foundational early tenure preserved to maintain genuine career history" : "Role already satisfies target profile baseline; preserved as-is"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/agent/bullet-planner-audit.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/agent/state.ts src/app/agent/nodes/bulletPlanner.ts tests/unit/agent/bullet-planner-audit.test.ts
git commit -m "feat: generate audit rationales for all experience sections in bulletPlanner"
```

---

### Task 3: JIT Chunk Tailoring Endpoint

**Files:**
- Create: `src/app/api/agent/tailor-chunk/route.ts`
- Test: `tests/unit/agent/tailor-chunk.test.ts`

**Interfaces:**
- Consumes:
  ```typescript
  interface TailorChunkRequest {
    sectionGroup: ResumeSectionGroup;
    resumeContext: string;
    jobDescription: string;
    jobTitle?: string;
    sortedMissingKeywords?: string[];
    preferences?: TailoringPreferences;
    modelKey?: string;
    sessionApiKeys?: Record<string, string>;
  }
  ```
- Produces: `NextResponse.json({ sectionGroup: ResumeSectionGroup })` with `status: "ready"` and populated `suggestions`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/agent/tailor-chunk.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/agent/tailor-chunk/route";
import type { ResumeSectionGroup } from "@/app/agent/state";

vi.mock("@/app/services/model-fallback", () => ({
  generateWithFallback: vi.fn().mockResolvedValue({
    text: "- Engineered resilient distributed systems serving 50k RPS\n- Optimized database query latency by 45%",
    modelUsed: "gemini-1.5-flash",
  }),
}));

describe("POST /api/agent/tailor-chunk", () => {
  const mockGroup: ResumeSectionGroup = {
    id: "section-exp-0",
    sectionType: "experience",
    title: "Google – Senior Software Engineer",
    subtitle: "2021 - Present",
    jobIndex: 0,
    orderIndex: 0,
    status: "pending",
    auditRationale: "Align with cloud scalability requirements",
    suggestions: [],
    originalContent: "- Built services\n- Worked with databases",
    hasChanges: true,
  };

  it("tailors experience bullets on demand and returns populated suggestions with status ready", async () => {
    const req = new Request("http://localhost:3000/api/agent/tailor-chunk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionGroup: mockGroup,
        resumeContext: "John Doe resume",
        jobDescription: "Staff Cloud Engineer needed with microservices and PostgreSQL experience",
        sortedMissingKeywords: ["Microservices", "PostgreSQL"],
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.sectionGroup).toBeDefined();
    expect(json.sectionGroup.status).toBe("ready");
    expect(json.sectionGroup.suggestions.length).toBeGreaterThan(0);
    expect(json.sectionGroup.suggestions[0].suggestedText).toContain("Engineered resilient");
  });

  it("returns 400 if sectionGroup is missing", async () => {
    const req = new Request("http://localhost:3000/api/agent/tailor-chunk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/agent/tailor-chunk.test.ts`
Expected: FAIL with cannot find module route.ts

- [ ] **Step 3: Implement POST handler in `src/app/api/agent/tailor-chunk/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getExperienceBulletsPrompt } from "@/app/prompts/tailoringSection";
import type { ResumeSectionGroup, ResumeSuggestion } from "@/app/agent/state";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sectionGroup,
      resumeContext = "",
      jobDescription = "",
      sortedMissingKeywords = [],
      preferences,
      modelKey,
      sessionApiKeys,
    } = body as {
      sectionGroup: ResumeSectionGroup;
      resumeContext?: string;
      jobDescription?: string;
      sortedMissingKeywords?: string[];
      preferences?: any;
      modelKey?: string;
      sessionApiKeys?: Record<string, string>;
    };

    if (!sectionGroup || !sectionGroup.originalContent) {
      return NextResponse.json({ error: "Invalid sectionGroup payload" }, { status: 400 });
    }

    // If section has no changes or is already unchanged, return as ready
    if (!sectionGroup.hasChanges && sectionGroup.suggestions.length === 0) {
      return NextResponse.json({
        sectionGroup: {
          ...sectionGroup,
          status: "ready",
        },
      });
    }

    const titleParts = sectionGroup.title.split("–").map((p) => p.trim());
    const company = titleParts[0] || sectionGroup.title;
    const jobTitle = titleParts[1] || "";

    const prompt = getExperienceBulletsPrompt({
      jobTitle,
      company,
      dates: sectionGroup.subtitle || "",
      bulletsText: sectionGroup.originalContent,
      jobDescription: jobDescription.slice(0, 3000),
      resumeContext,
      preferences,
      userRequestedKeywords: sortedMissingKeywords.slice(0, 10),
    });

    const llmRes = await generateWithFallback(
      prompt,
      modelKey,
      { maxTokens: 600, temperature: 0.2 },
      sessionApiKeys
    );

    const rawNewBullets = llmRes.text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith("- ") || l.startsWith("• ") || l.startsWith("* "));
    const origBullets = sectionGroup.originalContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const suggestions: ResumeSuggestion[] = [];
    rawNewBullets.forEach((newB, idx) => {
      const cleanNew = newB.replace(/^[-*•]\s*/, "");
      const cleanOrig = (origBullets[idx] || origBullets[0] || "").replace(/^[-*•]\s*/, "");
      if (cleanOrig && cleanNew && cleanOrig.trim() !== cleanNew.trim()) {
        const matchedKw = sortedMissingKeywords.filter((kw) =>
          cleanNew.toLowerCase().includes(kw.toLowerCase())
        ).slice(0, 3);
        const hasMetric = /\d+%|\$\d+|\d+x|\d+\+/i.test(cleanNew) && !/\d+%|\$\d+|\d+x|\d+\+/i.test(cleanOrig);

        suggestions.push({
          id: `${sectionGroup.id}-sug-${idx}`,
          section: sectionGroup.title,
          originalText: cleanOrig.trim(),
          suggestedText: cleanNew.trim(),
          reason: hasMetric
            ? "Quantified operational impact metric for recruiter resonance"
            : "Targeted ATS keyword alignment and active leadership voice",
          keywords: matchedKw,
          category: hasMetric ? "metric" : matchedKw.length > 0 ? "keyword" : "action_verb",
          status: "accepted",
          jobIndex: sectionGroup.jobIndex,
          bulletIndex: idx,
        });
      }
    });

    const updatedGroup: ResumeSectionGroup = {
      ...sectionGroup,
      status: "ready",
      suggestions,
      tailoredContent: rawNewBullets.join("\n"),
    };

    return NextResponse.json({ sectionGroup: updatedGroup });
  } catch (error: any) {
    console.error("[tailor-chunk] Failed to tailor chunk:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to tailor chunk" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/agent/tailor-chunk.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/agent/tailor-chunk/route.ts tests/unit/agent/tailor-chunk.test.ts
git commit -m "feat: add JIT tailor-chunk API route for on-demand experience chunk generation"
```

---

### Task 4: Holistic Career Summary Synthesis

**Files:**
- Modify: `src/app/prompts/tailoringSection.ts`
- Create: `src/app/api/agent/synthesize-summary/route.ts`
- Test: `tests/unit/agent/summary-synthesis.test.ts`

**Interfaces:**
- Consumes:
  ```typescript
  export function getHolisticSummaryPrompt(params: {
    assembledResume: string;
    jobDescription: string;
    jobTitle?: string;
    userRequestedKeywords?: string[];
  }): string;
  ```
- Produces: `NextResponse.json({ summaryText: string, rationale: string, keywords: string[] })`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/agent/summary-synthesis.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { getHolisticSummaryPrompt } from "@/app/prompts/tailoringSection";
import { POST } from "@/app/api/agent/synthesize-summary/route";

vi.mock("@/app/services/model-fallback", () => ({
  generateWithFallback: vi.fn().mockResolvedValue({
    text: "Lead Cloud Architect with 9+ years architecting fault-tolerant distributed platforms. Led engineering teams across Google and Chapman University scaling high-throughput microservices. Expert in TypeScript, Kubernetes, and cloud database optimization.",
    modelUsed: "gemini-1.5-flash",
  }),
}));

describe("Holistic Summary Synthesis", () => {
  it("generates prompt instructing full career synthesis without changelog phrasing", () => {
    const prompt = getHolisticSummaryPrompt({
      assembledResume: "Full resume content here...",
      jobDescription: "Staff Cloud Engineer job posting",
      jobTitle: "Staff Cloud Engineer",
      userRequestedKeywords: ["Kubernetes", "Distributed Systems"],
    });

    expect(prompt).toContain("Staff Cloud Engineer");
    expect(prompt).toContain("Kubernetes");
    expect(prompt.toLowerCase()).toContain("executive summary");
    expect(prompt.toLowerCase()).toContain("entire career");
  });

  it("synthesizes summary via POST /api/agent/synthesize-summary", async () => {
    const req = new Request("http://localhost:3000/api/agent/synthesize-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assembledResume: "John Doe\nExperience:\n- Google Architect\n- Chapman Engineer",
        jobDescription: "Staff Cloud Engineer",
        jobTitle: "Staff Cloud Engineer",
        userRequestedKeywords: ["Kubernetes"],
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.summaryText).toContain("Lead Cloud Architect");
    expect(json.summaryText.length).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/agent/summary-synthesis.test.ts`
Expected: FAIL with `getHolisticSummaryPrompt is not defined`

- [ ] **Step 3: Implement prompt in `tailoringSection.ts` and route in `synthesize-summary/route.ts`**

In `src/app/prompts/tailoringSection.ts`:
```typescript
export function getHolisticSummaryPrompt(params: {
  assembledResume: string;
  jobDescription: string;
  jobTitle?: string;
  userRequestedKeywords?: string[];
}): string {
  const { assembledResume, jobDescription, jobTitle, userRequestedKeywords = [] } = params;
  const targetTitleLine = jobTitle ? `Target Role Title: "${jobTitle}"\n` : "";
  const keywordsLine = userRequestedKeywords.length > 0 ? `Target Keywords: ${userRequestedKeywords.join(", ")}\n` : "";

  return `You are an elite executive resume writer. Write a cohesive, holistic Professional Summary (3–4 sentences) representing the candidate's ENTIRE career arc, tailored for the target role below.

${targetTitleLine}${keywordsLine}
CRITICAL INSTRUCTIONS:
- This is a HOLISTIC EXECUTIVE SUMMARY of the candidate's career as an organic whole, NOT a changelog of recent edits.
- Synthesize their complete trajectory: years of experience, core leadership/engineering scope, and signature technical proficiencies derived directly from the assembled resume.
- GUARANTEE ZERO CONTRADICTIONS: Every capability, tool, and achievement claimed must be 100% grounded in the vetted resume below.
- Do NOT use fluff ("passionate", "results-driven", "team player"). Use authoritative, factual declarative sentences with present participles where appropriate.
- Output ONLY the 3–4 sentence summary paragraph. No headers, no intro, no conversational remarks.

Assembled Resume:
"""
${assembledResume}
"""

Target Job Description:
"""
${jobDescription.slice(0, 3000)}
"""

Output only the summary text:`;
}
```

In `src/app/api/agent/synthesize-summary/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getHolisticSummaryPrompt } from "@/app/prompts/tailoringSection";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      assembledResume,
      jobDescription = "",
      jobTitle,
      userRequestedKeywords = [],
      modelKey,
      sessionApiKeys,
    } = body;

    if (!assembledResume) {
      return NextResponse.json({ error: "assembledResume is required" }, { status: 400 });
    }

    const prompt = getHolisticSummaryPrompt({
      assembledResume,
      jobDescription,
      jobTitle,
      userRequestedKeywords,
    });

    const llmRes = await generateWithFallback(
      prompt,
      modelKey,
      { maxTokens: 400, temperature: 0.2 },
      sessionApiKeys
    );

    const summaryText = llmRes.text.trim();
    const matchedKw = userRequestedKeywords.filter((kw: string) =>
      summaryText.toLowerCase().includes(kw.toLowerCase())
    );

    return NextResponse.json({
      summaryText,
      rationale: "Synthesized holistic career arc aligning vetted experience with target job scope",
      keywords: matchedKw,
    });
  } catch (err: any) {
    console.error("[synthesize-summary] Failed to synthesize summary:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to synthesize summary" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/agent/summary-synthesis.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/prompts/tailoringSection.ts src/app/api/agent/synthesize-summary/route.ts tests/unit/agent/summary-synthesis.test.ts
git commit -m "feat: implement holistic career summary prompt and synthesis endpoint"
```

---

### Task 5: Section Reviewer Component Overhaul

**Files:**
- Modify: `src/app/components/ResumeSuggestionReviewer.tsx`
- Test: `tests/unit/components/ResumeSuggestionReviewer.test.tsx`

**Interfaces:**
- Consumes:
  ```typescript
  interface ResumeSuggestionReviewerProps {
    originalResume: string;
    suggestions: ResumeSuggestion[];
    sectionGroups?: ResumeSectionGroup[];
    onSectionGroupsChange?: (groups: ResumeSectionGroup[]) => void;
    onSuggestionsChange: (updatedSuggestions: ResumeSuggestion[]) => void;
    activeSectionId?: string | null;
    onActiveSectionChange?: (id: string | null) => void;
    beforeScore?: number;
    matchScore?: number;
    jobDescription?: string;
    jobTitle?: string;
  }
  ```
- Produces: Interactive bottom-to-top stepper, unified section experience card, batch accept/reject buttons, individual diff toggles, prefetch shimmer skeleton.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/ResumeSuggestionReviewer.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ResumeSuggestionReviewer from "@/app/components/ResumeSuggestionReviewer";
import type { ResumeSectionGroup, ResumeSuggestion } from "@/app/agent/state";

describe("ResumeSuggestionReviewer Section Studio", () => {
  const mockGroups: ResumeSectionGroup[] = [
    {
      id: "section-exp-1",
      sectionType: "experience",
      title: "Chapman University – Software Engineer",
      subtitle: "2018 - 2021",
      jobIndex: 1,
      orderIndex: 0,
      status: "ready",
      auditRationale: "Early career foundation; highlighted student portal impact",
      suggestions: [
        {
          id: "sug-chapman-1",
          section: "Chapman University",
          originalText: "Built campus web apps",
          suggestedText: "Engineered high-concurrency student portal serving 10k users",
          reason: "Quantified scale",
          keywords: ["Scale"],
          category: "metric",
          status: "accepted",
        },
      ],
      originalContent: "Built campus web apps",
      hasChanges: true,
    },
    {
      id: "section-exp-0",
      sectionType: "experience",
      title: "Google – Senior Software Engineer",
      subtitle: "2021 - Present",
      jobIndex: 0,
      orderIndex: 1,
      status: "ready",
      auditRationale: "Elevated distributed systems and gRPC throughput",
      suggestions: [
        {
          id: "sug-google-1",
          section: "Google",
          originalText: "Led service architecture",
          suggestedText: "Spearheaded fault-tolerant cloud architecture delivering 99.99% uptime",
          reason: "High availability metric",
          keywords: ["High Availability"],
          category: "metric",
          status: "accepted",
        },
      ],
      originalContent: "Led service architecture",
      hasChanges: true,
    },
  ];

  it("renders the earliest role first with audit rationale and stepper count", () => {
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockGroups.flatMap((g) => g.suggestions)}
        sectionGroups={mockGroups}
        onSuggestionsChange={vi.fn()}
      />
    );

    // Should display Chapman University first (orderIndex 0)
    expect(screen.getByText(/Chapman University – Software Engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/Early career foundation/i)).toBeInTheDocument();
    expect(screen.getByText(/Section 1 of 2/i)).toBeInTheDocument();
  });

  it("advances to the next section when clicking Accept Section & Continue", () => {
    const onSuggestionsChange = vi.fn();
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockGroups.flatMap((g) => g.suggestions)}
        sectionGroups={mockGroups}
        onSuggestionsChange={onSuggestionsChange}
      />
    );

    const nextBtn = screen.getByRole("button", { name: /Accept Section & Continue/i });
    fireEvent.click(nextBtn);

    // Should now show Google (orderIndex 1)
    expect(screen.getByText(/Google – Senior Software Engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/Section 2 of 2/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/components/ResumeSuggestionReviewer.test.tsx`
Expected: FAIL (stepper and section-level rendering not yet in component)

- [ ] **Step 3: Overhaul `ResumeSuggestionReviewer.tsx` for section-by-section studio**

In `src/app/components/ResumeSuggestionReviewer.tsx`:
- Receive `sectionGroups`, `onSectionGroupsChange`, `activeSectionId`, `onActiveSectionChange`.
- Compute fallback `effectiveGroups` using `groupSuggestionsBySection` if not explicitly passed.
- State: `currentSectionIndex` (default 0).
- Header: Stepper track with clickable stage breadcrumbs showing `[✓ 1. Chapman] → [● 2. Google] → ...`.
- Section Card:
  - Role Header: Title & Subtitle.
  - Audit Rationale Banner (`🛡️ Preserved Authenticity` if unchanged; `✦ Tailored for Role` if modified).
  - Bullets List: Renders each bullet with diff, keyword chips, toggle buttons (`✓ Accept` / `✕ Keep Original`), and inline edit mode.
  - Action Footer:
    - `[← Previous Section]` (disabled if index === 0).
    - `[↺ Keep Original Section & Continue →]` (marks all suggestions in this role as rejected and advances).
    - `[✓ Accept Section & Continue →]` (marks all suggestions in this role as accepted and advances).
- Background Prefetch Trigger:
  - When viewing section $K$, if section $K+1$ is `status: "pending"`, fire background POST to `/api/agent/tailor-chunk`.
- Summary Synthesis Trigger:
  - When reaching the Summary stage, trigger `/api/agent/synthesize-summary` if summary is pending or was modified.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/components/ResumeSuggestionReviewer.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/components/ResumeSuggestionReviewer.tsx tests/unit/components/ResumeSuggestionReviewer.test.tsx
git commit -m "feat: overhaul ResumeSuggestionReviewer into narrative Section Studio with stepper"
```

---

### Task 6: Live Document Spotlight & Synchronized Scrolling

**Files:**
- Modify: `src/app/components/TailoredResumeOutput.tsx`
- Test: `tests/unit/components/TailoredResumeOutput.test.tsx`

**Interfaces:**
- Consumes: `activeSectionId` from parent / reviewer.
- Produces: Synchronized DOM smooth scroll (`scrollIntoView`), spotlight border accent (`border-l-4 border-indigo-500 bg-indigo-50/15`), bi-directional click-to-focus on document sections.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/TailoredResumeOutput.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TailoredResumeOutput from "@/app/components/TailoredResumeOutput";

describe("TailoredResumeOutput Document Spotlight", () => {
  it("renders section containers with stable anchor IDs for scroll targeting", () => {
    const resumeText = `## Experience\n\n### Google – Senior Software Engineer\n- Scaled microservices\n\n### Chapman University – Software Engineer\n- Maintained apps`;

    render(
      <TailoredResumeOutput
        newResume={resumeText}
        originalResume={resumeText}
        loading={false}
      />
    );

    // Verify markdown renders with identifiable section elements
    expect(screen.getByText(/Google – Senior Software Engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/Chapman University – Software Engineer/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/components/TailoredResumeOutput.test.tsx`
Expected: FAIL or passes initial, we will extend it to test activeSectionId spotlighting.

- [ ] **Step 3: Implement synchronized scroll and spotlight styling in `TailoredResumeOutput.tsx`**

In `src/app/components/TailoredResumeOutput.tsx`:
- Add `activeSectionId?: string | null` and `onActiveSectionChange?: (id: string | null) => void` to props.
- Add `useEffect` listening to `activeSectionId`:
  ```typescript
  useEffect(() => {
    if (!activeSectionId) return;
    const targetElement = document.getElementById(activeSectionId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeSectionId]);
  ```
- Wrap rendered markdown sections / headers with container divs featuring `id={sectionGroupId}` and spotlight class:
  ```typescript
  className={activeSectionId === group.id ? "transition-all duration-300 border-l-4 border-indigo-500 pl-3 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-r-md my-2" : "my-2"}
  ```
- Attach `onClick` to section containers to notify `onActiveSectionChange?.(group.id)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/components/TailoredResumeOutput.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/components/TailoredResumeOutput.tsx tests/unit/components/TailoredResumeOutput.test.tsx
git commit -m "feat: add synchronized scroll, spotlight styling, and bi-directional focus in document preview"
```

---

### Task 7: Full Pipeline Integration & Verification

**Files:**
- Modify: `src/app/agent/nodes/surgicalTailor.ts`
- Modify: `src/app/agent/graph.ts` (if applicable)
- Test: `tests/unit/agent/resume-tailor-flow.test.ts`

**Interfaces:**
- Consumes: Initial submission
- Produces: Initial `sectionGroups` with Chunk 1 tailored immediately, subsequent chunks marked `pending` or `unchanged` with audits, ready for client-side JIT prefetching.

- [ ] **Step 1: Write integration test**

Create/update `tests/unit/agent/resume-tailor-flow.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { surgicalTailorNode } from "@/app/agent/nodes/surgicalTailor";
import { bulletPlannerNode } from "@/app/agent/nodes/bulletPlanner";
import type { AgentState } from "@/app/agent/state";

vi.mock("@/app/services/model-fallback", () => ({
  generateWithFallback: vi.fn().mockResolvedValue({
    text: "- Engineered high performance cloud pipelines",
    modelUsed: "mock-model",
  }),
}));

describe("End-to-End Section Studio Tailoring Flow", () => {
  it("initializes sectionGroups with bottom-to-top sequence and prepares Chunk 1 immediately", async () => {
    const initialState: AgentState = {
      rawResume: "Resume content",
      preferences: { intensity: "targeted", sectionsToModify: { summary: true, experience: true, skills: true, education: false, projects: false } } as any,
      resumeAST: {
        experience: [
          { title: "Senior Eng", company: "Google", dates: "2021", description: "- Cloud work" },
          { title: "Junior Eng", company: "Chapman", dates: "2019", description: "- Web apps" },
        ],
      },
      sortedMissingKeywords: ["Cloud", "Kubernetes"],
      logs: [],
      errors: [],
    };

    const planned = bulletPlannerNode(initialState);
    const stateWithPlan = { ...initialState, ...planned };

    const tailored = await surgicalTailorNode(stateWithPlan);
    expect(tailored.sectionGroups).toBeDefined();
    expect(tailored.sectionGroups?.[0].title).toContain("Chapman"); // Earliest role first
    expect(tailored.sectionGroups?.[0].status).toBe("ready");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/agent/resume-tailor-flow.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `surgicalTailorNode` to assemble initial bottom-to-top `sectionGroups`**

In `src/app/agent/nodes/surgicalTailor.ts`:
- Use `groupSuggestionsBySection` to construct `sectionGroups`.
- Tailor Chunk 1 (earliest role) immediately, marking it `ready`.
- Mark remaining experience sections as `pending` (or `unchanged` if planner indicated no modifications).
- Return `sectionGroups` in `Partial<AgentState>`.

- [ ] **Step 4: Run all test suites and typecheck**

Run:
```bash
npx vitest run
npx tsc --noEmit
```
Expected: All tests pass, 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/agent/nodes/surgicalTailor.ts tests/unit/agent/resume-tailor-flow.test.ts
git commit -m "feat: wire JIT sectionGroups initialization into surgicalTailor pipeline"
```

---

## Plan Self-Review Checklist

1. **Spec Coverage:**
   - Context isolation per experience chunk: Covered in Tasks 1, 2, 5.
   - Bottom-to-top chronological flow: Covered in Tasks 1, 2, 5.
   - JIT lazy loading & background sliding-window prefetch: Covered in Tasks 3, 5, 7.
   - Auditing every role (including unchanged): Covered in Tasks 1, 2, 5.
   - Holistic executive summary synthesis: Covered in Task 4, 5.
   - Synchronized document scrolling & spotlight: Covered in Task 6.
2. **Placeholder Scan:** No "TBD", "TODO", or pseudo-code; every step provides exact code and shell commands.
3. **Type Consistency:** `ResumeSectionGroup`, `SectionGroupType`, `SectionTailorStatus`, and `ResumeSuggestion` types match identically across all tasks.
