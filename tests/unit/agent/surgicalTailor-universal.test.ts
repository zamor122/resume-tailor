import { describe, it, expect, vi, beforeEach } from "vitest";
import { surgicalTailorNode } from "@/app/agent/nodes/surgicalTailor";
import type { AgentState } from "@/app/agent/state";
import { DEFAULT_PREFERENCES } from "@/app/types/tailoringPreferences";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getDomainTaxonomy } from "@/app/config/domainTaxonomy";

vi.mock("@/app/services/model-fallback", () => ({
  generateWithFallback: vi.fn(),
}));

vi.mock("@/app/services/jev", () => ({
  diagnoseChunkWithJev: vi.fn().mockResolvedValue({
    enhancementFocus: "Clinical operations leadership",
    missingSkills: ["Triage", "Staff Scheduling"],
    seniorityScore: 4,
  }),
  judgeSuggestionWithJev: vi.fn().mockResolvedValue({
    isAuthentic: true,
    isBetterThanOriginal: true,
    scoreDeltaPercent: 18,
    overallImpactScore: 4,
  }),
}));

describe("surgicalTailorNode - Universal Domain Calibration Wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const healthcareState: AgentState = {
    rawResume: "Clinical Nurse Leader with 7 years acute care experience.",
    rawJobDescription: "Hospital unit manager needed.",
    selectedJobDescription: "Hospital unit manager needed.",
    jobTitle: "Nurse Manager",
    canonicalRole: "Nurse Manager / Clinical Lead",
    industryCategory: "healthcare",
    jobKnowledge: {
      canonicalTitle: "Nurse Manager / Clinical Lead",
      industryCategory: "healthcare",
      powerVerbs: ["Triaged", "Administered", "Standardized", "Coordinated"],
      authenticMetricTypes: ["Patient panel size", "Bed turnover time"],
      coreCompetencies: ["Clinical Quality", "Staff Scheduling"],
    },
    preferences: DEFAULT_PREFERENCES,
    resumeAST: {
      rawText: "Clinical Nurse Leader...",
      contact: {},
      summary: "Compassionate healthcare professional.",
      experience: [
        {
          title: "Charge Nurse",
          company: "General Hospital",
          dates: "2020 - Present",
          description: "- Supervised 15 nurses on night shift\n- Managed bed assignments",
        },
      ],
      skills: ["BLS", "ACLS"],
    },
    bulletPlan: {
      intensity: "moderate",
      summaryChange: false,
      skillsChange: false,
      totalBulletsToModify: 2,
      jobBulletChanges: [
        {
          jobIndex: 0,
          bulletIndices: "all",
          recencyTier: "tier1_recent",
        },
      ],
      jobAudits: [
        {
          jobIndex: 0,
          company: "General Hospital",
          roleTitle: "Charge Nurse",
          dates: "2020 - Present",
          tenureOrder: 0,
          recencyTier: "tier1_recent",
          hasChanges: true,
          rationale: "Align with healthcare clinical leadership standards",
        },
      ],
    },
    logs: [],
    errors: [],
  };

  it("passes domain taxonomy and job knowledge into getExperienceBulletsPrompt during execution", async () => {
    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: JSON.stringify([
        {
          index: 0,
          originalText: "Supervised 15 nurses on night shift",
          suggestedText: "Coordinated 15 acute care nurses across a 35-bed inpatient unit, optimizing shift coverage and patient intake protocols.",
          status: "enhanced",
          reason: "Framed via Google X-Y-Z with authentic clinical metrics",
          keywords: ["Staff Scheduling"],
        },
        {
          index: 1,
          originalText: "Managed bed assignments",
          suggestedText: "Triaged patient admissions and managed bed turnover across 35 inpatient beds, decreasing intake wait times by 20 minutes.",
          status: "enhanced",
          reason: "Added clinical power verb and operational throughput metric",
          keywords: ["Triage"],
        },
      ]),
      modelUsed: "gemini:gemini-1.5-flash",
    });

    const result = await surgicalTailorNode(healthcareState);

    expect(generateWithFallback).toHaveBeenCalledTimes(1);
    const promptPassed = vi.mocked(generateWithFallback).mock.calls[0][0];

    // Verify domain taxonomy directives and verbs are present in the prompt
    expect(promptPassed).toContain("DOMAIN-SPECIFIC CALIBRATION");
    expect(promptPassed).toContain("Triaged");
    expect(promptPassed).toContain("Administered");
    expect(promptPassed).toContain("Patient panel size");
    expect(promptPassed).toMatch(/DO NOT use software-engineering or tech jargon/i);

    // Verify suggestions were successfully produced
    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions?.[0].suggestedText).toContain("Coordinated 15 acute care nurses");
  });
});
