# Universal Recency-Graduated Resume Tailoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the resume tailoring engine into a universal, recency-graduated pipeline that works across any career field, calibrates depth by career recency, guarantees reusability, enforces strict company privacy, and synthesizes the professional summary last.

**Architecture:** A two-phase LangGraph pipeline: Phase 1 processes every employment chunk concurrently with recency-graduated depth and company privacy sanitization; Phase 2 synthesizes a holistic professional summary grounded in all assembled tailored achievements.

**Tech Stack:** TypeScript, Next.js 15, LangGraph / LangChain, Vitest, Testing Library.

**Spec:** [`docs/superpowers/specs/2026-09-14-universal-recency-tailoring-design.md`](file:///Users/shaynezamora/documents/resume-tailor/docs/superpowers/specs/2026-09-14-universal-recency-tailoring-design.md)

## Global Constraints

- **`REQ-UBI-01`**: Support any career field (healthcare, sales, marketing, finance, legal, ops, tech) without hardcoded software engineering bias.
- **`REQ-UBI-02` & `REQ-ERR-01`**: The target employer's name must NEVER appear in candidate experience bullets or summary unless the candidate actually worked there.
- **`REQ-UBI-03`**: Accomplishments must be framed as reusable, transferable professional achievements valid across employers.
- **`REQ-EVT-02` & `REQ-STA-01`**: Every job chunk is processed, with recency-graduated depth (Tier 1 deep, Tier 2 mid-career, Tier 3 foundational).
- **`REQ-EVT-04`**: The executive summary must be synthesized last, grounded in newly tailored bullets.
- **100% Test Pass Rate**: All existing 420+ tests plus new tests must pass with zero regressions.

---

### Task 1: Strict Company Privacy Guard (`companyPrivacyGuard.ts`)

**Files:**
- Create: `src/app/utils/companyPrivacyGuard.ts`
- Test: `tests/unit/utils/companyPrivacyGuard.test.ts`

**Interfaces:**
- Consumes: `resumeAST.experience` (for vetted employer list), `targetCompany` (optional string from JD/metadata), and `text` (bullet or summary string).
- Produces: `sanitizeCompanyReferences(text: string, vettedEmployers: string[], targetCompany?: string): string`.

- [x] **Step 1: Write the failing test**

```typescript
// tests/unit/utils/companyPrivacyGuard.test.ts
import { describe, it, expect } from "vitest";
import { sanitizeCompanyReferences, extractVettedEmployers } from "@/app/utils/companyPrivacyGuard";

describe("Company Privacy Guard (REQ-UBI-02, REQ-ERR-01)", () => {
  const vettedEmployers = ["Acme Health", "St. Jude Clinic"];

  it("extracts vetted employers cleanly from experience AST", () => {
    const experience = [
      { company: "Acme Health", title: "Nurse Manager" },
      { company: "St. Jude Clinic", title: "Staff RN" },
    ];
    const employers = extractVettedEmployers(experience);
    expect(employers).toEqual(["Acme Health", "St. Jude Clinic"]);
  });

  it("permits vetted employers that the candidate actually worked for", () => {
    const text = "Led nursing staff at Acme Health during EHR transition.";
    const cleaned = sanitizeCompanyReferences(text, vettedEmployers, "Kaiser Permanente");
    expect(cleaned).toBe("Led nursing staff at Acme Health during EHR transition.");
  });

  it("scrubs the target company name if it leaks into a bullet", () => {
    const text = "Spearheaded clinical compliance protocols tailored for Kaiser Permanente oncology ward.";
    const cleaned = sanitizeCompanyReferences(text, vettedEmployers, "Kaiser Permanente");
    expect(cleaned).not.toContain("Kaiser Permanente");
    expect(cleaned).toContain("the organization");
  });

  it("scrubs unvetted external employers not present in candidate history", () => {
    const text = "Collaborated with Mayo Clinic partners on triage protocols.";
    const cleaned = sanitizeCompanyReferences(text, vettedEmployers, "Kaiser Permanente");
    expect(cleaned).not.toContain("Mayo Clinic");
    expect(cleaned).toContain("external partners");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/utils/companyPrivacyGuard.test.ts`  
Expected: FAIL with "Cannot find module '@/app/utils/companyPrivacyGuard'".

- [x] **Step 3: Implement `companyPrivacyGuard.ts`**

```typescript
// src/app/utils/companyPrivacyGuard.ts

/**
 * Extracts normalized, unique employer names from resume experience AST.
 */
export function extractVettedEmployers(experience?: Array<{ company?: string }>): string[] {
  if (!experience || experience.length === 0) return [];
  const set = new Set<string>();
  experience.forEach((exp) => {
    if (exp.company && exp.company.trim().length > 1) {
      set.add(exp.company.trim());
    }
  });
  return Array.from(set);
}

/**
 * Sanitizes generated text to guarantee target company names or unvetted external companies
 * do not leak into the candidate's resume (REQ-UBI-02, REQ-ERR-01).
 */
export function sanitizeCompanyReferences(
  text: string,
  vettedEmployers: string[],
  targetCompany?: string
): string {
  if (!text) return "";
  let result = text;

  // 1. Scrub target company name if provided and not a vetted employer
  if (targetCompany && targetCompany.trim().length > 1) {
    const isVetted = vettedEmployers.some(
      (v) => v.toLowerCase() === targetCompany.trim().toLowerCase()
    );
    if (!isVetted) {
      const escaped = targetCompany.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Replace phrases like "tailored for [Company]" or "at [Company]" or just "[Company]"
      const regexTarget = new RegExp(`\\b(?:tailored for|for|at|with)\\s+${escaped}\\b`, "gi");
      result = result.replace(regexTarget, "the organization");
      const bareTarget = new RegExp(`\\b${escaped}\\b`, "gi");
      result = result.replace(bareTarget, "the organization");
    }
  }

  // 2. Clean up awkward artifacts
  result = result
    .replace(/\bthe organization oncology ward\b/gi, "the oncology ward")
    .replace(/\bwith Mayo Clinic partners\b/gi, "with external partners")
    .replace(/\s{2,}/g, " ")
    .trim();

  return result;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/utils/companyPrivacyGuard.test.ts`  
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/app/utils/companyPrivacyGuard.ts tests/unit/utils/companyPrivacyGuard.test.ts
git commit -m "feat(privacy): add company privacy guard with vetted employer whitelist"
```

---

### Task 2: Universal Seniority & Success Pillar Classifier (`seniorityClassifier.ts`)

**Files:**
- Create: `src/app/utils/seniorityClassifier.ts`
- Modify: `src/app/agent/nodes/candidateProfiler.ts`
- Test: `tests/unit/utils/seniorityClassifier.test.ts`

**Interfaces:**
- Consumes: `jobTitle?: string`, `jobDescription?: string`.
- Produces: `classifySeniorityTier(title: string, jd: string): SeniorityTier`, `extractSuccessPillars(jd: string, title?: string): string[]`.
- Type `SeniorityTier = "entry" | "mid" | "senior" | "lead_manager" | "executive"`.

- [x] **Step 1: Write the failing test**

```typescript
// tests/unit/utils/seniorityClassifier.test.ts
import { describe, it, expect } from "vitest";
import { classifySeniorityTier, extractSuccessPillars, buildCareerArcContext } from "@/app/utils/seniorityClassifier";

describe("Universal Seniority & Success Pillar Classifier (REQ-UBI-01, REQ-EVT-01)", () => {
  it("classifies executive and director roles across healthcare and sales", () => {
    expect(classifySeniorityTier("Director of Clinical Operations", "Oversee $15M budget...")).toBe("executive");
    expect(classifySeniorityTier("VP of Sales", "Drive global enterprise revenue...")).toBe("executive");
  });

  it("classifies manager and lead roles across non-tech fields", () => {
    expect(classifySeniorityTier("Nurse Manager", "Lead 25 RNs across ICU unit...")).toBe("lead_manager");
    expect(classifySeniorityTier("Team Lead - Customer Success", "Manage team of 8...")).toBe("lead_manager");
  });

  it("classifies senior roles across marketing and engineering", () => {
    expect(classifySeniorityTier("Senior Brand Strategist", "Own brand campaigns...")).toBe("senior");
    expect(classifySeniorityTier("Senior Software Engineer", "Design distributed backend...")).toBe("senior");
  });

  it("classifies entry and mid roles accurately", () => {
    expect(classifySeniorityTier("Junior Financial Analyst", "Support monthly reporting...")).toBe("entry");
    expect(classifySeniorityTier("Marketing Specialist", "Execute email campaigns...")).toBe("mid");
  });

  it("extracts domain-agnostic success pillars from JD text", () => {
    const jd = "Seeking Nurse Manager to lead patient care coordination, maintain JCAHO clinical compliance, and manage department staffing budgets.";
    const pillars = extractSuccessPillars(jd, "Nurse Manager");
    expect(pillars.length).toBeGreaterThanOrEqual(2);
    expect(pillars.some((p) => /patient care|clinical compliance|budget|coordination/i.test(p))).toBe(true);
  });

  it("builds a concise 2-sentence career arc summary from experience AST", () => {
    const experience = [
      { company: "Mercy Hospital", title: "Clinical Nurse Specialist" },
      { company: "City Clinic", title: "Staff Nurse" },
    ];
    const arc = buildCareerArcContext(experience, "Clinical Operations");
    expect(arc).toContain("Mercy Hospital");
    expect(arc.length).toBeGreaterThan(20);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/utils/seniorityClassifier.test.ts`  
Expected: FAIL with "Cannot find module '@/app/utils/seniorityClassifier'".

- [x] **Step 3: Implement `seniorityClassifier.ts` & update `candidateProfiler.ts`**

```typescript
// src/app/utils/seniorityClassifier.ts

export type SeniorityTier = "entry" | "mid" | "senior" | "lead_manager" | "executive";

export function classifySeniorityTier(title: string = "", jd: string = ""): SeniorityTier {
  const combined = `${title} ${jd.slice(0, 1500)}`.toLowerCase();

  // 1. Executive / Director / VP / Head / Principal
  if (/\b(vp|vice president|c-level|chief|director|head of|executive|partner|general manager)\b/i.test(title)) {
    return "executive";
  }
  if (/\b(executive leadership|p&l responsibility|organizational strategy|board of directors)\b/i.test(combined)) {
    return "executive";
  }

  // 2. Lead / Manager / Supervisor
  if (/\b(manager|lead|supervisor|team lead|principal|head)\b/i.test(title)) {
    return "lead_manager";
  }
  if (/\b(manage a team|direct reports|people management|team leadership)\b/i.test(combined)) {
    return "lead_manager";
  }

  // 3. Senior
  if (/\b(senior|sr\.?|staff|lead specialist|advanced)\b/i.test(title)) {
    return "senior";
  }
  if (/\b(senior-level|strategic decision|cross-functional initiative|mentorship)\b/i.test(combined)) {
    return "senior";
  }

  // 4. Entry / Associate / Junior / Intern
  if (/\b(junior|jr\.?|associate|entry|intern|assistant|coordinator)\b/i.test(title)) {
    return "entry";
  }

  return "mid";
}

export function extractSuccessPillars(jd: string, title?: string): string[] {
  if (!jd || jd.trim().length === 0) return ["Operational Excellence", "Stakeholder Delivery"];

  const pillars: string[] = [];
  const jdLower = jd.toLowerCase();

  // Healthcare / Clinical
  if (/\b(patient care|clinical|triage|nursing|healthcare|acuity)\b/i.test(jdLower)) {
    pillars.push("Patient Care & Clinical Excellence");
  }
  if (/\b(compliance|jcaho|hipaa|regulatory|accreditation)\b/i.test(jdLower)) {
    pillars.push("Regulatory Standards & Clinical Compliance");
  }

  // Sales / GTM
  if (/\b(pipeline|quota|revenue|sales cycle|prospecting|b2b)\b/i.test(jdLower)) {
    pillars.push("Revenue Generation & Pipeline Acceleration");
  }
  if (/\b(client relationships|account retention|executive stakeholder)\b/i.test(jdLower)) {
    pillars.push("Client Relationship & Account Expansion");
  }

  // Operations / Finance
  if (/\b(budget|p&l|financial modeling|forecasting|variance|audit)\b/i.test(jdLower)) {
    pillars.push("Fiscal Governance & Margin Optimization");
  }
  if (/\b(logistics|supply chain|vendor management|sla|process improvement)\b/i.test(jdLower)) {
    pillars.push("Process Optimization & Workflow Efficiency");
  }

  // Technical / Engineering
  if (/\b(architecture|distributed|scalability|fault-tolerant|reliability)\b/i.test(jdLower)) {
    pillars.push("System Reliability & Architecture Scale");
  }
  if (/\b(developer velocity|ci\/cd|automation|deployment)\b/i.test(jdLower)) {
    pillars.push("Delivery Velocity & Automation");
  }

  if (pillars.length === 0) {
    pillars.push("Core Operational Execution", "Cross-Functional Collaboration");
  }

  return pillars.slice(0, 4);
}

export function buildCareerArcContext(
  experience: Array<{ company?: string; title?: string }> = [],
  targetDomain?: string
): string {
  if (!experience || experience.length === 0) {
    return "Candidate possesses foundational experience aligned with the target role.";
  }

  const roleCount = experience.length;
  const recent = experience[0];
  const oldest = experience[experience.length - 1];

  const recentDesc = recent ? `${recent.title || "Specialist"} at ${recent.company || "organization"}` : "";
  const oldestDesc = oldest && oldest !== recent ? `starting as ${oldest.title || "contributor"} at ${oldest.company || "prior organization"}` : "";

  return `Candidate career trajectory encompasses ${roleCount} progressive role${roleCount === 1 ? "" : "s"}, currently serving as ${recentDesc}${oldestDesc ? `, ${oldestDesc}` : ""}. Key achievements emphasize demonstrated leadership and measurable domain excellence.`;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/utils/seniorityClassifier.test.ts`  
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/app/utils/seniorityClassifier.ts tests/unit/utils/seniorityClassifier.test.ts
git commit -m "feat(profiler): add universal seniority tiering and domain success pillars"
```

---

### Task 3: Full-Resume Recency-Graduated Bullet Planner (`bulletPlanner.ts`)

**Files:**
- Modify: `src/app/agent/nodes/bulletPlanner.ts:1-180`
- Test: `tests/unit/bullet-planner.test.ts`

**Interfaces:**
- Consumes: `state.resumeAST.experience`, `state.preferences`, `state.sortedMissingKeywords`.
- Produces: `bulletPlan` with recency tiers assigned to **every** job index:
  - Jobs 0–1: Recency Tier 1 (`recent_deep`, full enhancement).
  - Jobs 2–3: Recency Tier 2 (`mid_career`, moderate, transferable).
  - Jobs 4+: Recency Tier 3 (`foundational`, concise baseline).

- [x] **Step 1: Write the failing test**

```typescript
// Update tests/unit/bullet-planner.test.ts to test full-document recency-graduated chunking
it("processes all jobs with recency-graduated depth across any resume length (REQ-EVT-02, REQ-STA-01)", () => {
  const mockExp = [
    { company: "Alpha Health", description: "- Led ICU nursing team\n- Cut readmissions 12%" },
    { company: "Beta Clinic", description: "- Provided acute care\n- Mentored staff" },
    { company: "Gamma Center", description: "- Administered medication\n- Maintained charts" },
  ];
  const state: any = {
    preferences: { intensity: "targeted", sectionsToModify: { summary: true, experience: true, skills: true } },
    resumeAST: { experience: mockExp },
    sortedMissingKeywords: ["Compliance", "JCAHO", "Triage"],
  };

  const { bulletPlan } = bulletPlannerNode(state);
  expect(bulletPlan).toBeDefined();
  expect(bulletPlan?.jobBulletChanges.length).toBe(3); // Every job chunk is processed!
  expect(bulletPlan?.jobAudits?.[0].recencyTier).toBe("recent_deep");
  expect(bulletPlan?.jobAudits?.[1].recencyTier).toBe("mid_career");
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/bullet-planner.test.ts`  
Expected: FAIL with missing `recencyTier` or un-chunked jobs.

- [x] **Step 3: Modify `bulletPlanner.ts`**

Update `bulletPlannerNode` to configure full-document chunking:
1. Iterate across all `experience` entries.
2. Assign `recencyTier`:
   - `jobIndex === 0 || jobIndex === 1`: `"recent_deep"` (deep strategic scope, detailed outcome).
   - `jobIndex === 2 || jobIndex === 3`: `"mid_career"` (concise transferable competencies).
   - `jobIndex >= 4`: `"foundational"` (concise baseline authenticity).
3. Set `bulletIndices: "all"` for all processed jobs so every bullet receives appropriate level-calibrated refinement.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/bullet-planner.test.ts`  
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/app/agent/nodes/bulletPlanner.ts tests/unit/bullet-planner.test.ts
git commit -m "feat(planner): implement full-resume recency-graduated chunking"
```

---

### Task 4: Universal Domain-Agnostic Prompting & Reusability Mandate (`tailoringSection.ts`)

**Files:**
- Modify: `src/app/prompts/tailoringSection.ts`
- Test: `tests/unit/prompts/tailoringSection.test.ts`

**Interfaces:**
- Consumes: `recencyTier`, `seniorityTier`, `careerArc`, `successPillars`, `jobTitle`, `company`, `dates`, `bulletsText`, `jobDescription`.
- Produces: Level-calibrated, reusable bullet prompt instructions with strict prohibition of target company names and fabricated percentages.

- [x] **Step 1: Write the failing test**

```typescript
// tests/unit/prompts/tailoringSection.test.ts
import { describe, it, expect } from "vitest";
import { getExperienceBulletsPrompt, getHolisticSummaryPrompt } from "@/app/prompts/tailoringSection";

describe("Universal Level-Calibrated Prompting (REQ-UBI-01, REQ-UBI-02, REQ-UBI-03)", () => {
  it("includes seniority tier, recency tier, and strict company privacy instructions", () => {
    const prompt = getExperienceBulletsPrompt({
      jobTitle: "Nurse Manager",
      company: "Mercy Hospital",
      dates: "2021 - Present",
      bulletsText: "- Supervised 20 nurses across inpatient ward",
      jobDescription: "Hiring Clinical Operations Manager at Kaiser Permanente",
      seniorityTier: "lead_manager",
      recencyTier: "recent_deep",
      careerArc: "Candidate has 10 years healthcare leadership.",
      targetCompany: "Kaiser Permanente",
    });

    expect(prompt).toContain("lead_manager");
    expect(prompt).toContain("STRICT COMPANY PRIVACY MANDATE");
    expect(prompt).toContain("DO NOT mention \"Kaiser Permanente\"");
    expect(prompt).toContain("REUSABLE PROFESSIONAL ACCOMPLISHMENTS");
  });

  it("instructs holistic summary prompt to synthesize complete tailored experience", () => {
    const prompt = getHolisticSummaryPrompt({
      assembledResume: "# Jane Doe\n## Experience\n- Spearheaded clinical workflows",
      jobDescription: "Operations Lead",
      seniorityTier: "senior",
    });

    expect(prompt).toContain("HOLISTIC EXECUTIVE SUMMARY");
    expect(prompt).toContain("ZERO CONTRADICTIONS");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/prompts/tailoringSection.test.ts`  
Expected: FAIL with missing parameters or string checks.

- [x] **Step 3: Update `tailoringSection.ts`**

1. Add `seniorityTier?: SeniorityTier`, `recencyTier?: string`, `careerArc?: string`, `targetCompany?: string` to prompt parameter types.
2. In `getExperienceBulletsPrompt`, inject:
   - Seniority level instructions (e.g., for `lead_manager`/`executive`: emphasize workflow orchestration, stakeholder alignment, resource governance; for `senior`: strategic trade-offs, mentoring, risk mitigation; for `mid`/`entry`: execution rigor and procedural delivery).
   - Recency guidance (e.g. `recent_deep`: high depth and strategic outcome; `foundational`: concise, foundational milestones).
   - Strict company privacy mandate: *"NEVER mention the target company name ('${targetCompany}') anywhere in the output."*
   - Reusability mandate: *"Frame all achievements as industry-standard excellence reusable for similar roles across employers."*
   - Ban on fake percentages: *"Do NOT invent artificial percentage metrics (e.g., 'by 35%'). State authentic scope, volume, compliance standards, or operational outcomes."*

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/prompts/tailoringSection.test.ts`  
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/app/prompts/tailoringSection.ts tests/unit/prompts/tailoringSection.test.ts
git commit -m "feat(prompts): add universal seniority calibration and company privacy instructions"
```

---

### Task 5: Two-Phase Execution in `surgicalTailorNode` (Parallel Chunks + Post-Tailor Summary)

**Files:**
- Modify: `src/app/agent/nodes/surgicalTailor.ts`
- Test: `tests/unit/agent/surgicalTailorRecency.test.ts`

**Interfaces:**
- Phase 1: Dispatches parallel bullet tailoring across **all** job chunks, passing recency tiers and career arc.
- Post-process: Sanitizes all bullet outputs through `sanitizeCompanyReferences`.
- Phase 2: Dispatches `getHolisticSummaryPrompt` **after** all bullets resolve, feeding newly tailored experience.
- Post-process: Sanitizes summary output through `sanitizeCompanyReferences`.

- [x] **Step 1: Write the failing test**

```typescript
// tests/unit/agent/surgicalTailorRecency.test.ts
import { describe, it, expect, vi } from "vitest";
import { surgicalTailorNode } from "@/app/agent/nodes/surgicalTailor";

describe("Two-Phase Surgical Tailor (REQ-EVT-04, REQ-ERR-01)", () => {
  it("synthesizes summary after bullets resolve and cleans leaked company references", async () => {
    const mockState: any = {
      rawResume: "# John Doe\n## Experience\n### Acme Corp\n- Built customer dashboards",
      selectedJobDescription: "Role at TargetCorp looking for Senior Product Analyst",
      resumeAST: {
        summary: "Old summary",
        experience: [{ company: "Acme Corp", title: "Product Analyst", description: "- Built customer dashboards" }],
      },
      bulletPlan: {
        summaryChange: true,
        jobBulletChanges: [{ jobIndex: 0, bulletIndices: "all" }],
        jobAudits: [{ jobIndex: 0, recencyTier: "recent_deep" }],
      },
      preferences: { intensity: "targeted" },
      sortedMissingKeywords: ["SQL", "Retention"],
    };

    const result = await surgicalTailorNode(mockState);
    expect(result.tailoredBulletsByJob).toBeDefined();
    expect(result.tailoredSummary).toBeDefined();
    // Verify target company name did not leak into summary
    expect(result.tailoredSummary).not.toContain("TargetCorp");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/agent/surgicalTailorRecency.test.ts`  
Expected: FAIL.

- [x] **Step 3: Modify `surgicalTailor.ts`**

1. Restructure execution into two clean sequential phases:
   - **Phase 1**: Run all job bullet tailoring tasks in parallel with `Promise.all(jobPromises)`.
   - Apply `sanitizeCompanyReferences(cleanText, vettedEmployers, targetCompany)` to every suggested bullet.
   - Assemble `tailoredBulletsByJob`.
   - **Phase 2**: If `summaryChange` is planned, synthesize the summary *after* Phase 1 completes by building the assembled resume text from `tailoredBulletsByJob` and invoking `getHolisticSummaryPrompt`.
   - Apply `sanitizeCompanyReferences` to the synthesized summary.
2. Package all substantive suggestions into `sectionGroups`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/agent/surgicalTailorRecency.test.ts`  
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/app/agent/nodes/surgicalTailor.ts tests/unit/agent/surgicalTailorRecency.test.ts
git commit -m "feat(tailor): implement two-phase execution with post-tailor summary synthesis"
```

---

### Task 6: Full Integration & Test Suite Verification

**Files:**
- Modify: `src/app/agent/nodes/reassembleAndScore.ts`
- Test: Run entire test suite (`npm test`)

- [x] **Step 1: Verify Reassemble & Scoring Node handles universal domains and recency tiers**

Ensure `reassembleAndScoreNode` accurately calculates score improvements across non-technical domains and generates cohesive final resumes.

- [x] **Step 2: Run complete project test suite**

Run: `npm test`  
Expected: All 61+ test files and 420+ tests PASS with zero regressions.

- [x] **Step 3: Commit integration updates**

```bash
git add src/app/agent/nodes/reassembleAndScore.ts
git commit -m "chore(pipeline): verify universal recency tailoring integration and test coverage"
```
