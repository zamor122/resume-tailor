import { describe, it, expect, vi, beforeEach } from "vitest";
import { surgicalTailorNode } from "@/app/agent/nodes/surgicalTailor";
import type { AgentState } from "@/app/agent/state";
import { DEFAULT_PREFERENCES } from "@/app/types/tailoringPreferences";
import { generateWithFallback } from "@/app/services/model-fallback";
import * as tailoringSectionPrompts from "@/app/prompts/tailoringSection";

vi.mock("@/app/services/model-fallback", () => ({
  generateWithFallback: vi.fn(),
}));

/** Pre-tailor original bullet — the summary must NEVER be synthesized from this text (REQ-EVT-04). */
const PRE_TAILOR_BULLET = "Built customer dashboards";
/** Phase-1 mocked bullet output, deliberately leaking the target employer name (REQ-UBI-02). */
const PHASE_ONE_SUGGESTED = "Unified customer dashboards at TargetCorp, lifting retention 20%";
/** The same Phase-1 bullet after the privacy scrubber has run. */
const PHASE_ONE_SANITIZED = "Unified customer dashboards at the organization, lifting retention 20%";
/** Phase-2 mocked summary output, deliberately leaking the target employer name. */
const SUMMARY_LEAKED = "Senior Product Analyst driving SQL retention insights at TargetCorp.";
/** The same Phase-2 summary after the privacy scrubber has run. */
const SUMMARY_SANITIZED = "Senior Product Analyst driving SQL retention insights at the organization.";
const FULL_RAW_RESUME = "John Doe Resume Text (full resume)";

/** Builds a 1:1 bullet JSON response for a single input bullet. */
function bulletJson(suggestedText: string) {
  return JSON.stringify([
    {
      index: 0,
      originalText: PRE_TAILOR_BULLET,
      suggestedText,
      status: "enhanced",
      reason: "Added retention metric",
      keywords: ["Retention"],
    },
  ]);
}

describe("surgicalTailorNode two-phase recency tailoring (REQ-EVT-04, REQ-UBI-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseState: AgentState = {
    rawResume: FULL_RAW_RESUME,
    selectedJobDescription: "Role at TargetCorp looking for Senior Product Analyst",
    jobTitle: "Senior Product Analyst",
    preferences: DEFAULT_PREFERENCES,
    sortedMissingKeywords: ["SQL", "Retention"],
    seniorityTier: "lead_manager",
    careerArc: "Candidate has 10 years experience.",
    resumeAST: {
      summary: "Old summary",
      experience: [
        {
          title: "Product Analyst",
          company: "Acme Corp",
          dates: "2021 - Present",
          description: `- ${PRE_TAILOR_BULLET}`,
        },
      ],
      skills: { technical: ["SQL"], soft: [] },
      education: [],
      sections: ["Summary", "Experience", "Skills"],
    },
    bulletPlan: {
      summaryChange: true,
      skillsChange: false,
      jobBulletChanges: [
        {
          jobIndex: 0,
          bulletIndices: "all",
          reason: "Add retention metrics",
          recencyTier: "recent_deep",
        },
      ],
      jobAudits: [
        {
          jobIndex: 0,
          hasChanges: true,
          bulletIndices: "all",
          auditRationale: "Recent role carries the strongest target alignment",
          recencyTier: "recent_deep",
        },
      ],
    },
    logs: [],
    errors: [],
  };

  it("synthesizes the summary AFTER bullets resolve, feeding post-tailor experience (REQ-EVT-04)", async () => {
    const summarySpy = vi.spyOn(tailoringSectionPrompts, "getHolisticSummaryPrompt");

    vi.mocked(generateWithFallback)
      .mockResolvedValueOnce({ text: bulletJson(PHASE_ONE_SUGGESTED), modelUsed: "mock-model" })
      .mockResolvedValueOnce({ text: SUMMARY_LEAKED, modelUsed: "mock-model" });

    const result = await surgicalTailorNode(baseState);

    expect(result.tailoredBulletsByJob).toBeDefined();
    expect(result.tailoredBulletsByJob![0]).toContain(PHASE_ONE_SANITIZED);
    expect(result.tailoredSummary).toBe(SUMMARY_SANITIZED);

    // Ordering proof: the holistic summary prompt was assembled from PHASE-1 TAILORED output.
    expect(summarySpy).toHaveBeenCalledTimes(1);
    const { assembledResume } = summarySpy.mock.calls[0][0];
    expect(assembledResume).toContain(PHASE_ONE_SANITIZED);
    expect(assembledResume).not.toContain(PRE_TAILOR_BULLET);
    expect(assembledResume).not.toContain(FULL_RAW_RESUME);

    // Strict phase ordering at the LLM boundary: bullets first, holistic summary last.
    const prompts = vi.mocked(generateWithFallback).mock.calls.map((call) => call[0] as string);
    expect(prompts).toHaveLength(2);
    expect(prompts[0]).toContain("STRICT 1-TO-1 MAPPING");
    expect(prompts[1]).toContain("Assembled Resume");

    const summarySuggestion = result.suggestions!.find((s) => s.id === "sug-summary");
    expect(summarySuggestion).toBeDefined();
    expect(summarySuggestion!.originalText).toBe("Old summary");
    expect(summarySuggestion!.suggestedText).toBe(SUMMARY_SANITIZED);
  });

  it("scrubs leaked target-company references from bullets and summary while preserving originalText (REQ-UBI-02, REQ-ERR-01)", async () => {
    vi.mocked(generateWithFallback)
      .mockResolvedValueOnce({ text: bulletJson(PHASE_ONE_SUGGESTED), modelUsed: "mock-model" })
      .mockResolvedValueOnce({ text: SUMMARY_LEAKED, modelUsed: "mock-model" });

    const result = await surgicalTailorNode(baseState);

    // No persisted output may leak the target employer.
    expect(result.tailoredSummary).not.toContain("TargetCorp");
    expect(result.tailoredSummary).toContain("the organization");
    expect(result.tailoredBulletsByJob![0]).not.toContain("TargetCorp");
    expect(result.tailoredBulletsByJob![0]).toContain("the organization");
    result.suggestions!.forEach((sug) => {
      expect(sug.suggestedText).not.toContain("TargetCorp");
    });

    const bulletSuggestion = result.suggestions!.find((s) => s.id === "sug-job-0-bullet-0");
    expect(bulletSuggestion).toBeDefined();
    expect(bulletSuggestion!.suggestedText).toBe(PHASE_ONE_SANITIZED);

    // Candidate authenticity: originalText is anchored to the untouched original, never scrubbed.
    expect(bulletSuggestion!.originalText).toBe(PRE_TAILOR_BULLET);
    expect(result.suggestions!.find((s) => s.id === "sug-summary")!.originalText).toBe("Old summary");
    // originalText must never be rewritten into the scrubbed variant.
    expect(result.suggestions!.some((sug) => sug.originalText.includes("the organization"))).toBe(false);
  });

  it("threads recencyTier, seniorityTier, careerArc and the derived targetCompany into the bullet prompt (REQ-EVT-02, REQ-EVT-03, REQ-STA-01)", async () => {
    const bulletSpy = vi.spyOn(tailoringSectionPrompts, "getExperienceBulletsPrompt");

    vi.mocked(generateWithFallback)
      .mockResolvedValueOnce({ text: bulletJson(PHASE_ONE_SUGGESTED), modelUsed: "mock-model" })
      .mockResolvedValueOnce({ text: SUMMARY_LEAKED, modelUsed: "mock-model" });

    await surgicalTailorNode(baseState);

    expect(bulletSpy).toHaveBeenCalledTimes(1);
    const bulletArgs = bulletSpy.mock.calls[0][0];
    expect(bulletArgs.recencyTier).toBe("recent_deep");
    expect(bulletArgs.seniorityTier).toBe("lead_manager");
    expect(bulletArgs.careerArc).toBe("Candidate has 10 years experience.");
    expect(bulletArgs.targetCompany).toBe("TargetCorp");
    // Existing isolated-chunk contract is preserved.
    expect(bulletArgs.jobTitle).toBe("Product Analyst");
    expect(bulletArgs.company).toBe("Acme Corp");
    expect(bulletArgs.dates).toBe("2021 - Present");
    expect(bulletArgs.bulletsText).toBe(`- ${PRE_TAILOR_BULLET}`);

    const prompts = vi.mocked(generateWithFallback).mock.calls.map((call) => call[0] as string);
    expect(prompts[0]).toContain("RECENCY-ADJUSTED DEPTH — TIER: recent_deep");
  });

  it("prefers companyResearch then discoveredJobs over the job-description heuristic", async () => {
    const bulletSpy = vi.spyOn(tailoringSectionPrompts, "getExperienceBulletsPrompt");

    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: bulletJson(PHASE_ONE_SUGGESTED),
      modelUsed: "mock-model",
    });

    await surgicalTailorNode({
      ...baseState,
      companyResearch: { name: "ResearchCorp" },
      discoveredJobs: [
        {
          title: "Senior Product Analyst",
          company: "DiscoveredCorp",
          location: "Remote",
          url: "https://example.com",
          snippet: "",
        },
      ],
      bulletPlan: { ...baseState.bulletPlan!, summaryChange: false },
    });

    expect(bulletSpy.mock.calls[0][0].targetCompany).toBe("ResearchCorp");

    bulletSpy.mockClear();
    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: bulletJson(PHASE_ONE_SUGGESTED),
      modelUsed: "mock-model",
    });

    await surgicalTailorNode({
      ...baseState,
      discoveredJobs: [
        {
          title: "Senior Product Analyst",
          company: "DiscoveredCorp",
          location: "Remote",
          url: "https://example.com",
          snippet: "",
        },
      ],
      bulletPlan: { ...baseState.bulletPlan!, summaryChange: false },
    });

    expect(bulletSpy.mock.calls[0][0].targetCompany).toBe("DiscoveredCorp");

    bulletSpy.mockClear();
    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: bulletJson(PHASE_ONE_SUGGESTED),
      modelUsed: "mock-model",
    });

    await surgicalTailorNode({
      ...baseState,
      selectedJobDescription: "Role at Senior level looking for an analyst",
      bulletPlan: { ...baseState.bulletPlan!, summaryChange: false },
    });

    // Generic role/level prose must not be mistaken for an employer name.
    expect(bulletSpy.mock.calls[0][0].targetCompany).toBeUndefined();
  });

  it("routes each job its own recencyTier and falls back to the audit tier (REQ-EVT-02)", async () => {
    const bulletSpy = vi.spyOn(tailoringSectionPrompts, "getExperienceBulletsPrompt");

    vi.mocked(generateWithFallback)
      .mockResolvedValueOnce({
        text: bulletJson("Unified customer dashboards serving 40 stakeholders"),
        modelUsed: "mock-model",
      })
      .mockResolvedValueOnce({
        text: bulletJson("Compiled weekly reports across 12 teams"),
        modelUsed: "mock-model",
      });

    const multiJobState: AgentState = {
      ...baseState,
      bulletPlan: {
        summaryChange: false,
        skillsChange: false,
        jobBulletChanges: [
          { jobIndex: 0, bulletIndices: "all", reason: "Deepen recent role", recencyTier: "recent_deep" },
          { jobIndex: 1, bulletIndices: "all", reason: "Condense mid-career role" },
        ],
        jobAudits: [
          {
            jobIndex: 0,
            hasChanges: true,
            bulletIndices: "all",
            auditRationale: "Recent role carries the strongest target alignment",
            recencyTier: "recent_deep",
          },
          {
            jobIndex: 1,
            hasChanges: true,
            bulletIndices: "all",
            auditRationale: "Mid-career role condensed for relevance",
            recencyTier: "mid_career",
          },
        ],
      },
      resumeAST: {
        ...baseState.resumeAST!,
        experience: [
          {
            title: "Product Analyst",
            company: "Acme Corp",
            dates: "2021 - Present",
            description: `- ${PRE_TAILOR_BULLET}`,
          },
          {
            title: "Junior Analyst",
            company: "Beta Inc",
            dates: "2018 - 2021",
            description: "- Compiled weekly reports",
          },
        ],
      },
    };

    const result = await surgicalTailorNode(multiJobState);

    expect(bulletSpy).toHaveBeenCalledTimes(2);
    expect(bulletSpy.mock.calls[0][0].company).toBe("Acme Corp");
    expect(bulletSpy.mock.calls[0][0].recencyTier).toBe("recent_deep");
    expect(bulletSpy.mock.calls[0][0].seniorityTier).toBe("lead_manager");
    expect(bulletSpy.mock.calls[0][0].careerArc).toBe("Candidate has 10 years experience.");
    expect(bulletSpy.mock.calls[1][0].company).toBe("Beta Inc");
    expect(bulletSpy.mock.calls[1][0].recencyTier).toBe("mid_career");

    // summaryChange is false → Phase 2 never dispatches a synthesis call.
    expect(generateWithFallback).toHaveBeenCalledTimes(2);

    expect(result.tailoredBulletsByJob![0]).toContain("Unified customer dashboards serving 40 stakeholders");
    expect(result.tailoredBulletsByJob![1]).toContain("Compiled weekly reports across 12 teams");
  });
});