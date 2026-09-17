import { describe, it, expect, vi, beforeEach } from "vitest";
import { intakeParserNode } from "@/app/agent/nodes/intakeParser";
import { candidateProfilerNode } from "@/app/agent/nodes/candidateProfiler";
import { bulletPlannerNode } from "@/app/agent/nodes/bulletPlanner";
import { surgicalTailorNode } from "@/app/agent/nodes/surgicalTailor";
import { reassembleAndScoreNode } from "@/app/agent/nodes/reassembleAndScore";
import type { AgentState } from "@/app/agent/state";
import { DEFAULT_PREFERENCES } from "@/app/types/tailoringPreferences";
import { generateWithFallback } from "@/app/services/model-fallback";
import type { JDInterpreterResult } from "@/app/utils/keyword-extraction";

vi.mock("@/app/services/model-fallback", () => ({
  generateWithFallback: vi.fn(),
}));

/**
 * Universal-domain (REQ-UBI-01) end-to-end coverage with a deliberately NON-TECHNICAL candidate.
 * A healthcare career (Nurse Manager → Staff Nurse → Certified Nursing Assistant) is pushed through the
 * real node chain — intake → profiler → planner → surgical tailor (both phases) → reassemble/score —
 * to prove the pipeline carries no software-engineering assumptions and enforces target-employer
 * privacy (REQ-UBI-02) at every persisted output.
 */

const TARGET_EMPLOYER = "Northgate Health System";
const PRIMARY_EMPLOYER = "Mercy Hospital";
const PRIOR_EMPLOYER = "Lakeside Medical Center";

/** Clinical phrases that exist ONLY in mocked LLM output, so their presence proves real content flowed. */
const BULLET_CLINICAL_PHRASE = "patient acuity triage";
const SUMMARY_CLINICAL_PHRASE = "staff scheduling governance";

const sampleResume = `# Dana Whitfield
dana.whitfield@example.com | 555-214-8890 | Columbus, OH

## Summary
Registered Nurse leader with 12 years of acute care and clinical operations experience.

## Experience
Mercy Hospital | Nurse Manager | March 2021 - Present
- Managed staffing and scheduling for a 42-bed medical-surgical unit.
- Led accreditation readiness and regulatory compliance audits for patient care standards.
- Reduced patient fall incidents by 22% through clinical protocol improvements.

Lakeside Medical Center | Staff Nurse | June 2016 - March 2021
- Delivered direct patient care across a 30-bed telemetry floor.
- Precepted new graduate nurses and coordinated nursing shift handoffs.

Rosedale Community Clinic | Certified Nursing Assistant | January 2013 - June 2016
- Supported vitals monitoring and intake workflows for an outpatient clinic panel.

## Skills
Patient Care, Staff Scheduling, Telemetry, Electronic Health Records

## Education
B.S. in Nursing - State University - 2013
`;

const sampleJob = `Northgate Health System is hiring a Nurse Manager for acute care clinical operations.

In this Nurse Manager role at Northgate Health System, you will lead nursing teams across a 300-bed hospital, own patient care quality, staffing and scheduling, and regulatory accreditation readiness.

Requirements:
- 8+ years of clinical nursing experience with 3+ years managing direct reports and team leadership.
- Proven track record of improving patient satisfaction and reducing length of stay.
- Experience with JCAHO accreditation surveys, HIPAA compliance, and clinical audit readiness.
`;

const PROFILE_JSON = JSON.stringify({
  primaryTitle: "Nurse Manager",
  seniorityLevel: "lead_manager",
  topSkills: ["Patient Care", "Clinical Compliance", "Staff Scheduling"],
  domain: "Healthcare",
  searchQuery: "Nurse Manager clinical operations hospital",
});

const keywordResult: JDInterpreterResult = {
  criticalKeywords: ["Accreditation Readiness", "Patient Care", "Clinical Operations", "Staff Scheduling"],
  keywords: {
    technical: [],
    soft: [],
    industry: [{ term: "Accreditation Readiness", importance: "critical", frequency: 3 }],
    certifications: [],
    actionVerbs: [],
    powerWords: [],
  },
  keywordDensity: {
    totalKeywords: 4,
    criticalKeywords: 4,
    averageFrequency: 2,
    mostFrequent: [],
  },
  cleanedJobDescription: sampleJob,
  jobTitle: "Nurse Manager",
};

/** Builds a genuine 1:1 bullet JSON array from the bullets embedded in the real bullet prompt. */
function bulletResponse(prompt: string): string {
  const bulletsBlock =
    prompt.match(/ORIGINAL BULLETS FOR THIS ROLE \(\d+ bullets total\):\s*"""\n([\s\S]*?)\n"""/)?.[1] ?? "";
  const originals = bulletsBlock
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items = originals.map((original, index) => {
    const clean = original.replace(/^([-*•–—]|\d+\.)\s*/, "").replace(/\.$/, "").trim();
    return {
      index,
      originalText: clean,
      // Deliberately leaks the target employer AND names the candidate's own employer so the privacy
      // guard is proven end to end instead of merely assumed (REQ-UBI-02).
      suggestedText: `${clean}, expanding ${BULLET_CLINICAL_PHRASE} coverage for ${PRIMARY_EMPLOYER} teams partnering with ${TARGET_EMPLOYER} on patient care quality`,
      status: "enhanced",
      reason: "Clinical scope and patient care outcome alignment",
      keywords: ["Patient Care", "Accreditation Readiness"],
    };
  });

  return JSON.stringify(items);
}

/** Phase-2 summary output — also deliberately leaks the target employer. */
function summaryResponse(): string {
  return `Nurse Manager with 12 years of acute care nursing leadership at ${PRIMARY_EMPLOYER}, directing ${SUMMARY_CLINICAL_PHRASE}, accreditation readiness, and clinical operations across medical-surgical units. Combines ${BULLET_CLINICAL_PHRASE} expertise with regulatory compliance rigor. Partnering with ${TARGET_EMPLOYER} to elevate patient satisfaction and quality outcomes.`;
}

function promptToString(prompt: string | string[]): string {
  return Array.isArray(prompt) ? prompt.join("\n") : prompt;
}

function isBulletPrompt(prompt: string): boolean {
  return prompt.includes("STRICT 1-TO-1 MAPPING");
}

function isSummaryPrompt(prompt: string): boolean {
  return prompt.includes("HOLISTIC EXECUTIVE SUMMARY of the candidate's career as an organic whole");
}

/** Real node chain: intake → profiler → planner → surgical tailor (Phase 1 + Phase 2) → reassemble/score. */
async function runHealthcarePipeline() {
  const initialState: AgentState = {
    rawResume: sampleResume,
    rawJobDescription: sampleJob,
    selectedJobDescription: sampleJob,
    jobTitle: "Nurse Manager",
    preferences: DEFAULT_PREFERENCES,
    logs: [],
    errors: [],
  };

  const parsed = await intakeParserNode(initialState);
  const profiled = await candidateProfilerNode({ ...initialState, ...parsed });
  const stated = { ...initialState, ...parsed, ...profiled };

  const planned = bulletPlannerNode(stated);
  const withPlan = { ...stated, ...planned };

  const tailored = await surgicalTailorNode(withPlan);

  const scored = await reassembleAndScoreNode({
    ...withPlan,
    tailoredSummary: tailored.tailoredSummary,
    tailoredBulletsByJob: tailored.tailoredBulletsByJob,
    // Mirror the graph handoff: the two-phase node's Phase-1/Phase-2 outputs are the inputs here.
    suggestions: [],
    baselineScore: 62,
    keywordResult,
  });

  const prompts = vi.mocked(generateWithFallback).mock.calls.map((call) => promptToString(call[0]));

  return { parsed, profiled, planned, tailored, scored, prompts };
}

describe("Universal non-technical domain pipeline (REQ-UBI-01, REQ-UBI-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateWithFallback).mockImplementation(async (prompt) => {
      const text = promptToString(prompt);

      if (text.includes("You are analyzing a resume to extract candidate profile information")) {
        return { text: PROFILE_JSON, modelUsed: "mock-model" };
      }
      if (isBulletPrompt(text)) {
        return { text: bulletResponse(text), modelUsed: "mock-model" };
      }
      if (isSummaryPrompt(text)) {
        return { text: summaryResponse(), modelUsed: "mock-model" };
      }

      throw new Error(`Unexpected prompt routed to generateWithFallback: ${text.slice(0, 80)}`);
    });
  });

  it("parses a clinical resume without tech-domain assumptions", async () => {
    const initialState: AgentState = {
      rawResume: sampleResume,
      rawJobDescription: sampleJob,
      preferences: DEFAULT_PREFERENCES,
      logs: [],
      errors: [],
    };

    const parsed = await intakeParserNode(initialState);

    expect(parsed.resumeAST?.experience.map((exp) => exp.company)).toEqual([
      PRIMARY_EMPLOYER,
      PRIOR_EMPLOYER,
      "Rosedale Community Clinic",
    ]);
    expect(parsed.resumeAST?.experience.map((exp) => exp.title)).toEqual([
      "Nurse Manager",
      "Staff Nurse",
      "Certified Nursing Assistant",
    ]);
    expect(parsed.resumeAST?.experience[0].description).toContain("accreditation readiness");
    expect(parsed.resumeAST?.sections).toEqual(
      expect.arrayContaining(["Summary", "Experience", "Skills", "Education"])
    );
    expect(parsed.resumeAST?.summary).toContain("acute care");
    expect(parsed.resumeAST?.education.length).toBeGreaterThan(0);
  });

  it("classifies a non-technical Nurse Manager into lead_manager with clinical pillars and a career arc", async () => {
    const { profiled } = await runHealthcarePipeline();

    expect(profiled.seniorityTier).toBe("lead_manager");
    expect(profiled.candidateProfile?.seniorityTier).toBe("lead_manager");
    expect(profiled.candidateProfile?.domain).toBe("Healthcare");

    expect(profiled.successPillars?.length).toBeGreaterThanOrEqual(2);
    expect(profiled.successPillars).toEqual(
      expect.arrayContaining([
        "Patient Care & Clinical Excellence",
        "Regulatory Standards & Clinical Compliance",
      ])
    );

    expect(typeof profiled.careerArc).toBe("string");
    expect(profiled.careerArc).toContain(PRIMARY_EMPLOYER);
    expect(profiled.careerArc).toContain("Nurse Manager");
  });

  it("plans every clinical role with graduated recency tiers", async () => {
    const { planned } = await runHealthcarePipeline();

    expect(planned.bulletPlan?.jobBulletChanges.map((change) => change.jobIndex)).toEqual([0, 1, 2]);
    expect(planned.bulletPlan?.jobBulletChanges[0].bulletIndices).toBe("all");
    expect(planned.bulletPlan?.jobBulletChanges.map((change) => change.recencyTier)).toEqual([
      "recent_deep",
      "recent_deep",
      "mid_career",
    ]);
    expect(planned.bulletPlan?.jobAudits).toHaveLength(3);
    expect(planned.bulletPlan?.jobAudits?.every((audit) => audit.hasChanges)).toBe(true);
  });

  it("dispatches a bullet task for every role and keeps the target employer out of all persisted output", async () => {
    const { tailored, prompts } = await runHealthcarePipeline();

    // One Phase-1 task per experience item — no role is skipped.
    expect(prompts.filter(isBulletPrompt)).toHaveLength(3);
    expect(tailored.tailoredBulletsByJob).toHaveLength(3);
    expect(tailored.tailoredBulletsByJob?.every((bullets) => (bullets || "").trim().length > 0)).toBe(
      true
    );

    const tailoredBulletText = (tailored.tailoredBulletsByJob || []).join("\n");

    // REQ-UBI-02: the target employer never survives into persisted bullets, while the candidate's own
    // employer history is preserved verbatim.
    expect(tailoredBulletText).not.toContain(TARGET_EMPLOYER);
    expect(tailoredBulletText).toContain(PRIMARY_EMPLOYER);
    expect(tailoredBulletText).toContain(BULLET_CLINICAL_PHRASE);

    expect(tailored.tailoredSummary).toBeTruthy();
    expect(tailored.tailoredSummary).not.toContain(TARGET_EMPLOYER);
    expect(tailored.tailoredSummary).toContain(PRIMARY_EMPLOYER);
    expect(tailored.tailoredSummary).toContain(SUMMARY_CLINICAL_PHRASE);
  });

  it("injects the privacy mandate plus clinical seniority/recency context and synthesizes the summary last", async () => {
    const { prompts } = await runHealthcarePipeline();

    const bulletPrompts = prompts.filter(isBulletPrompt);
    const firstBulletPrompt = bulletPrompts[0];

    // Prompt-level privacy layer, driven by the JD-derived target employer.
    expect(firstBulletPrompt).toContain(`DO NOT mention "${TARGET_EMPLOYER}"`);
    // Universal profile context injected into every role prompt.
    expect(firstBulletPrompt).toContain("SENIORITY CALIBRATION — TARGET TIER: lead_manager");
    expect(firstBulletPrompt).toContain("RECENCY-ADJUSTED DEPTH — TIER: recent_deep");
    expect(firstBulletPrompt).toContain("CAREER ARC CONTEXT");
    expect(firstBulletPrompt).toContain(PRIMARY_EMPLOYER);

    // REQ-EVT-04: the holistic summary is the FINAL call and is assembled from the SANITIZED Phase-1
    // bullets (not from the pre-tailor resume).
    const summaryCalls = prompts.filter(isSummaryPrompt);
    expect(summaryCalls).toHaveLength(1);
    expect(prompts[prompts.length - 1]).toBe(summaryCalls[0]);
    expect(summaryCalls[0]).toContain(BULLET_CLINICAL_PHRASE);
    expect(summaryCalls[0]).toContain(PRIMARY_EMPLOYER);
  });

  it("reassembles the clinical resume with tailored clinical content and an improved score", async () => {
    const { scored } = await runHealthcarePipeline();

    const finalResume = scored.finalResumeText || "";

    // (a) The candidate's authentic history is preserved.
    expect(finalResume).toContain(PRIMARY_EMPLOYER);
    expect(finalResume).toContain("Nurse Manager");
    expect(finalResume).toContain("Certified Nursing Assistant");
    // (b) The target employer never appears anywhere in the final document.
    expect(finalResume).not.toContain(TARGET_EMPLOYER);
    // (c) Clinical content from BOTH tailored phases reached the document.
    expect(finalResume).toContain(BULLET_CLINICAL_PHRASE);
    expect(finalResume).toContain(SUMMARY_CLINICAL_PHRASE);

    // Scoring is keyword-ratio driven, so the newly introduced clinical keyword registers.
    expect(scored.keywordGap?.foundInResume).toContain("Accreditation Readiness");
    expect(scored.afterScore).toBeGreaterThanOrEqual(scored.beforeScore ?? 0);
    expect(scored.improvementMetrics?.scoreImprovement).toBeGreaterThanOrEqual(0);
  });
});