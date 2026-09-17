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

  it("derives a sentence-final employer WITHOUT swallowing the trailing period, then scrubs it everywhere (PERIOD-LEAK, REQ-UBI-02)", async () => {
    const bulletSpy = vi.spyOn(tailoringSectionPrompts, "getExperienceBulletsPrompt");

    // KissMetrics-style JD: the employer name is followed by a sentence-boundary period.
    const jd = "We are hiring a Clinical Operations Manager at Kaiser Permanente. Apply today.";
    const leakyBullet = "- Partnered with Kaiser Permanente on cloud migration";
    const leakySummary = "Clinical Operations Manager driving outcomes at Kaiser Permanente.";

    vi.mocked(generateWithFallback)
      .mockResolvedValueOnce({
        text: JSON.stringify([
          {
            index: 0,
            originalText: PRE_TAILOR_BULLET,
            suggestedText: leakyBullet,
            status: "enhanced",
            reason: "Reframed around target employer",
            keywords: ["Clinical Operations"],
          },
        ]),
        modelUsed: "mock-model",
      })
      .mockResolvedValueOnce({ text: leakySummary, modelUsed: "mock-model" });

    const result = await surgicalTailorNode({
      ...baseState,
      selectedJobDescription: jd,
      jobTitle: "Clinical Operations Manager",
    });

    // The heuristic must capture EXACTLY the company name — no trailing sentence punctuation, no next word.
    expect(bulletSpy).toHaveBeenCalledTimes(1);
    expect(bulletSpy.mock.calls[0][0].targetCompany).toBe("Kaiser Permanente");

    // Persisted outputs must not leak the target employer.
    expect(result.tailoredBulletsByJob![0]).not.toContain("Kaiser Permanente");
    expect(result.tailoredBulletsByJob![0]).toContain("the organization");
    expect(result.tailoredSummary).not.toContain("Kaiser Permanente");
    expect(result.tailoredSummary).toContain("the organization");
    result.suggestions!.forEach((sug) => {
      expect(sug.suggestedText).not.toContain("Kaiser Permanente");
    });
  });

  it("derives a capitalized sentence-initial employer and does not swallow the trailing comma (REQ-UBI-02)", async () => {
    const bulletSpy = vi.spyOn(tailoringSectionPrompts, "getExperienceBulletsPrompt");

    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: bulletJson(PHASE_ONE_SUGGESTED),
      modelUsed: "mock-model",
    });

    await surgicalTailorNode({
      ...baseState,
      selectedJobDescription: "At Salesforce, we build customer success.",
      bulletPlan: { ...baseState.bulletPlan!, summaryChange: false },
    });

    // Capitalized "At" must still anchor a match, and the trailing comma must be excluded.
    expect(bulletSpy.mock.calls[0][0].targetCompany).toBe("Salesforce");
  });

  it("rejects location and role-phrase false positives that would corrupt legitimate content (REQ-UBI-02)", async () => {
    const bulletSpy = vi.spyOn(tailoringSectionPrompts, "getExperienceBulletsPrompt");

    // Negative corpus: a false positive is SEVERE because the scrubber replaces the token globally.
    const negativeJds: Array<[string, string]> = [
      ["sentence-initial geography", "We are hiring a Senior Data Analyst at Denver."],
      ["another geography", "Join our team at Boston to grow the business."],
      ["generic level phrase", "We need a leader at Senior Manager level to drive delivery."],
      ["forefront idiom", "We are at the forefront of innovation."],
      ["scale idiom", "Partner with us at scale to accelerate growth."],
    ];

    for (const [label, jd] of negativeJds) {
      bulletSpy.mockClear();
      vi.mocked(generateWithFallback).mockResolvedValueOnce({
        text: bulletJson(PHASE_ONE_SUGGESTED),
        modelUsed: "mock-model",
      });

      await surgicalTailorNode({
        ...baseState,
        selectedJobDescription: jd,
        bulletPlan: { ...baseState.bulletPlan!, summaryChange: false },
      });

      expect(bulletSpy.mock.calls[0][0].targetCompany, `unexpected company for ${label}: "${jd}"`).toBeUndefined();
    }
  });

  it("scrubs acronym employers (IBM/SAP/GM) instead of letting them leak unscrubbed (REQ-UBI-02)", async () => {
    const bulletSpy = vi.spyOn(tailoringSectionPrompts, "getExperienceBulletsPrompt");

    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: bulletJson(PHASE_ONE_SUGGESTED),
      modelUsed: "mock-model",
    });

    await surgicalTailorNode({
      ...baseState,
      selectedJobDescription: "Join us at IBM",
      bulletPlan: { ...baseState.bulletPlan!, summaryChange: false },
    });

    // 2-3 char real employers must clear the plausibility floor (consistent with the > 1 scrubber threshold).
    expect(bulletSpy.mock.calls[0][0].targetCompany).toBe("IBM");
  });

  it("scrubs the explicit-array bulletIndices seam and maps bulletIndex back to ORIGINAL indices (REQ-UBI-02)", async () => {
    // Three bullets; only indices 0 and 2 are planned for rewrite.
    const origDescription = [
      "- Built customer dashboards",
      "- Managed vendor relationships",
      "- Reduced reporting time",
    ].join("\n");

    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: JSON.stringify([
        {
          index: 0,
          originalText: "- Built customer dashboards",
          suggestedText: "- Unified customer dashboards at TargetCorp",
          status: "enhanced",
          reason: "Unified reporting",
          keywords: ["Dashboards"],
        },
        {
          index: 1,
          originalText: "- Reduced reporting time",
          suggestedText: "- Reduced reporting time by 30% at TargetCorp",
          status: "enhanced",
          reason: "Quantified impact",
          keywords: ["Reporting"],
        },
      ]),
      modelUsed: "mock-model",
    });

    const result = await surgicalTailorNode({
      ...baseState,
      selectedJobDescription: "Role at TargetCorp looking for Senior Product Analyst",
      resumeAST: {
        ...baseState.resumeAST!,
        experience: [
          {
            title: "Product Analyst",
            company: "Acme Corp",
            dates: "2021 - Present",
            description: origDescription,
          },
        ],
      },
      bulletPlan: {
        summaryChange: false,
        skillsChange: false,
        jobBulletChanges: [
          { jobIndex: 0, bulletIndices: [0, 2], reason: "Sharpen top and bottom bullets", recencyTier: "recent_deep" },
        ],
        jobAudits: [
          {
            jobIndex: 0,
            hasChanges: true,
            bulletIndices: [0, 2],
            auditRationale: "Recent role carries the strongest target alignment",
            recencyTier: "recent_deep",
          },
        ],
      },
    });

    const tailored = result.tailoredBulletsByJob![0];
    // Seam must scrub the rewritten bullets...
    expect(tailored).not.toContain("TargetCorp");
    expect(tailored).toContain("the organization");
    // ...while the unplanned middle bullet is preserved verbatim.
    expect(tailored).toContain("Managed vendor relationships");

    // Suggestions map back to the ORIGINAL indices (0 and 2), never the compacted list positions (0 and 1).
    const jobSuggestions = result.suggestions!.filter((s) => s.jobIndex === 0);
    expect(jobSuggestions.map((s) => s.bulletIndex).sort()).toEqual([0, 2]);
  });

  it("honors the original summary and emits NO phantom summary suggestion when synthesis fails (REQ-EVT-04)", async () => {
    vi.mocked(generateWithFallback)
      .mockResolvedValueOnce({ text: bulletJson(PHASE_ONE_SUGGESTED), modelUsed: "mock-model" })
      .mockRejectedValueOnce(new Error("summary synthesis exploded"));

    const result = await surgicalTailorNode(baseState);

    // Fallback honored.
    expect(result.tailoredSummary).toBe("Old summary");
    // A suggestion claiming a change that never happened must NOT be emitted.
    expect(result.suggestions!.find((s) => s.id === "sug-summary")).toBeUndefined();
    // Phase-1 bullet suggestions are still present.
    expect(result.suggestions!.find((s) => s.id === "sug-job-0-bullet-0")).toBeDefined();
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

  it("derives an employer across a line break without capturing the newline, then scrubs it (REQ-UBI-02)", async () => {
    const bulletSpy = vi.spyOn(tailoringSectionPrompts, "getExperienceBulletsPrompt");

    // A pasted/scraped JD that wraps after the employer name. Capturing the newline previously built an
    // unmatchable scrub regex ("TargetCorp\nApply"), leaking the employer verbatim into the output.
    const jd = "We are hiring a Senior Product Analyst\nat TargetCorp\nApply today.";

    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: bulletJson(PHASE_ONE_SUGGESTED),
      modelUsed: "mock-model",
    });

    const result = await surgicalTailorNode({
      ...baseState,
      selectedJobDescription: jd,
      bulletPlan: { ...baseState.bulletPlan!, summaryChange: false },
    });

    expect(bulletSpy.mock.calls[0][0].targetCompany).toBe("TargetCorp");
    expect(bulletSpy.mock.calls[0][0].targetCompany).not.toMatch(/[\r\n]/);

    // The scrub must actually take effect end-to-end.
    expect(result.tailoredBulletsByJob![0]).not.toContain("TargetCorp");
    expect(result.tailoredBulletsByJob![0]).toContain("the organization");
  });

  it("derives dotted and digit-leading employers while rejecting bare numerics (REQ-UBI-02)", async () => {
    const bulletSpy = vi.spyOn(tailoringSectionPrompts, "getExperienceBulletsPrompt");

    const cases: Array<[string, string, string | undefined]> = [
      ["dotted abbreviation", "We are hiring at U.S. Bank for our payments team.", "U.S. Bank"],
      ["digit-leading employer", "Join us at 3M building the future of work", "3M"],
      ["hyphenated employer", "We are hiring at Hewlett-Packard in storage.", "Hewlett-Packard"],
      ["ampersand employer", "Join us at AT&T as a network engineer.", "AT&T"],
      ["un-dotted sentence period is NOT extended", "We are hiring at Meta. Apply today.", "Meta"],
      ["rejection guard: acronym period is NOT extended", "Join us at BP. Apply now.", "BP"],
      ["bare numeric is not an employer", "We are hiring at 3 people for the team.", undefined],
      ["multi-digit numeric is not an employer", "We are hiring at 20 locations nationwide.", undefined],
    ];

    for (const [label, jd, expected] of cases) {
      bulletSpy.mockClear();
      vi.mocked(generateWithFallback).mockResolvedValueOnce({
        text: bulletJson(PHASE_ONE_SUGGESTED),
        modelUsed: "mock-model",
      });

      await surgicalTailorNode({
        ...baseState,
        selectedJobDescription: jd,
        bulletPlan: { ...baseState.bulletPlan!, summaryChange: false },
      });

      expect(bulletSpy.mock.calls[0][0].targetCompany, `unexpected company for ${label}: "${jd}"`).toBe(expected);
    }
  });

  it("rejects idiom and generic-scope false positives that would globally corrupt resume text (REQ-UBI-02)", async () => {
    const bulletSpy = vi.spyOn(tailoringSectionPrompts, "getExperienceBulletsPrompt");

    // A false positive is SEVERE: the scrubber replaces the token across every bullet and the summary,
    // so deriving "Scale" or "AI" would rewrite legitimate resume wording to "the organization".
    const negativeJds: Array<[string, string]> = [
      ["scale idiom after a hiring cue", "We are hiring engineers who love Data at Scale is our craft."],
      ["AI-scope idiom", "Join our team to build models that operate at AI scale."],
      ["bare location after a hiring cue", "We are hiring a Senior Data Analyst at Denver."],
      ["generic level phrase", "We need a leader at Senior Manager level to drive delivery."],
      ["forefront idiom", "We are at the forefront of innovation."],
      ["partner idiom", "Partner with us at scale to accelerate growth."],
    ];

    for (const [label, jd] of negativeJds) {
      bulletSpy.mockClear();
      vi.mocked(generateWithFallback).mockResolvedValueOnce({
        text: bulletJson(PHASE_ONE_SUGGESTED),
        modelUsed: "mock-model",
      });

      await surgicalTailorNode({
        ...baseState,
        selectedJobDescription: jd,
        bulletPlan: { ...baseState.bulletPlan!, summaryChange: false },
      });

      expect(bulletSpy.mock.calls[0][0].targetCompany, `unexpected company for ${label}: "${jd}"`).toBeUndefined();
    }
  });

  it("derives the employer for common JD phrasings that carry no hiring-cue keyword (REQ-UBI-02)", async () => {
    const bulletSpy = vi.spyOn(tailoringSectionPrompts, "getExperienceBulletsPrompt");

    // Regression guard: a previous revision required a "hiring cue" near the match, which silently
    // disabled BOTH privacy layers (the prompt-level mandate and the scrubber) for these very common
    // phrasings. Dropping the derived company is worse than the idioms it was meant to filter.
    const cases: Array<[string, string, string]> = [
      ["work at", "As a Clinical Operations Manager you will work at Mercy Health in Denver.", "Mercy Health"],
      ["opportunity at", "This is an exciting opportunity at Northwind Traders.", "Northwind Traders"],
      ["based at", "You will be based at Northwind Traders.", "Northwind Traders"],
      ["headquartered at", "We are headquartered at Northwind Traders.", "Northwind Traders"],
      ["reports to at", "Location: Remote. Reports to the VP at Northwind Traders.", "Northwind Traders"],
    ];

    for (const [label, jd, expected] of cases) {
      bulletSpy.mockClear();
      vi.mocked(generateWithFallback).mockResolvedValueOnce({
        text: bulletJson(PHASE_ONE_SUGGESTED),
        modelUsed: "mock-model",
      });

      await surgicalTailorNode({
        ...baseState,
        selectedJobDescription: jd,
        bulletPlan: { ...baseState.bulletPlan!, summaryChange: false },
      });

      expect(bulletSpy.mock.calls[0][0].targetCompany, `unexpected company for ${label}: "${jd}"`).toBe(expected);
    }
  });

  it("never captures an employer name across a tab or a line break (REQ-UBI-02)", async () => {
    const bulletSpy = vi.spyOn(tailoringSectionPrompts, "getExperienceBulletsPrompt");

    // A tab or newline inside the derived name rebuilds an unmatchable scrub regex
    // ("TargetCorp\tApply"), leaking the employer verbatim into bullets and the summary.
    const separators: Array<[string, string]> = [
      ["tab", "\t"],
      ["newline", "\n"],
      ["carriage return + newline", "\r\n"],
    ];

    for (const [label, separator] of separators) {
      bulletSpy.mockClear();
      vi.mocked(generateWithFallback).mockResolvedValueOnce({
        text: bulletJson(PHASE_ONE_SUGGESTED),
        modelUsed: "mock-model",
      });

      await surgicalTailorNode({
        ...baseState,
        selectedJobDescription: `We are hiring at TargetCorp${separator}Apply today.`,
        bulletPlan: { ...baseState.bulletPlan!, summaryChange: false },
      });

      const derived = bulletSpy.mock.calls[0][0].targetCompany;
      expect(derived, `unexpected company for ${label}`).toBe("TargetCorp");
      expect(derived, `${label} leaked into the derived name`).not.toMatch(/[\r\n\t]/);
    }
  });
});