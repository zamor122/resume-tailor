// tests/unit/agent/surgicalTailor-jev-flow.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { surgicalTailorNode } from "@/app/agent/nodes/surgicalTailor";
import * as jevService from "@/app/services/jev";
import * as tailoringSectionPrompts from "@/app/prompts/tailoringSection";
import { generateWithFallback } from "@/app/services/model-fallback";

vi.mock("@/app/services/model-fallback", () => ({
  generateWithFallback: vi.fn().mockImplementation((prompt: any) => {
    const promptStr = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
    if (promptStr.includes("Professional Summary") || promptStr.includes("holistic") || promptStr.includes("executive resume writer. Write a cohesive")) {
      return Promise.resolve({
        text: "Staff Software Engineer with Next.js and React expertise leading scalable web applications.",
        modelUsed: "mock-model",
      });
    }
    return Promise.resolve({
      text: JSON.stringify([
        {
          index: 0,
          originalText: "Built web apps with React.",
          suggestedText: "Engineered scalable web applications with React and Next.js.",
          status: "enhanced",
          reason: "Added Next.js",
          keywords: ["React", "Next.js"],
        },
      ]),
      modelUsed: "mock-model",
    });
  }),
}));

describe("surgicalTailorNode with Jev Pre-Diagnosis & Quality Gate (REQ-EVT-01, REQ-EVT-04, REQ-ERR-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("diagnoses chunks before tailoring and attaches Jev evaluation to accepted suggestions", async () => {
    const promptSpy = vi.spyOn(tailoringSectionPrompts, "getExperienceBulletsPrompt");

    const mockDiagnosis = {
      matchedSkills: ["React"],
      missingSkills: ["Next.js"],
      seniorityScore: 4,
      enhancementFocus: "elevate_ownership" as const,
      confidence: 0.95,
    };

    const diagnoseSpy = vi.spyOn(jevService, "diagnoseChunkWithJev").mockResolvedValue(mockDiagnosis);

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
    expect(diagnoseSpy).toHaveBeenCalledTimes(1);
    expect(promptSpy).toHaveBeenCalled();
    const promptCallArg = promptSpy.mock.calls[0][0];
    expect(promptCallArg.diagnosis).toEqual(mockDiagnosis);

    expect(judgeSpy).toHaveBeenCalled();
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions!.length).toBeGreaterThan(0);
    expect(result.suggestions![0].jevJudge).toBeDefined();
    expect(result.suggestions![0].jevJudge?.isAuthentic).toBe(true);

    // Summary suggestion should also have jevJudge attached
    const summarySug = result.suggestions?.find((s) => s.id === "sug-summary");
    expect(summarySug).toBeDefined();
    expect(summarySug?.jevJudge?.isAuthentic).toBe(true);
  });

  it("filters out suggestions rejected by Jev quality gate", async () => {
    const judgeSpy = vi.spyOn(jevService, "judgeSuggestionWithJev").mockResolvedValue({
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
    expect(judgeSpy).toHaveBeenCalled();
    // Suggestion failing authenticity check must not be emitted as an accepted change
    expect(result.suggestions?.filter((s) => s.jevJudge?.isAuthentic === false)).toHaveLength(0);
    expect(result.suggestions).toHaveLength(0);
    // Original bullet is kept in tailoredBulletsByJob
    expect(result.tailoredBulletsByJob?.[0]).toContain("Analyzed data.");
  });
});
