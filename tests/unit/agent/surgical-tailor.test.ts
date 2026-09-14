import { describe, it, expect, vi, beforeEach } from "vitest";
import { surgicalTailorNode } from "@/app/agent/nodes/surgicalTailor";
import type { AgentState } from "@/app/agent/state";
import { DEFAULT_PREFERENCES } from "@/app/types/tailoringPreferences";
import { generateWithFallback } from "@/app/services/model-fallback";
import * as tailoringSectionPrompts from "@/app/prompts/tailoringSection";

vi.mock("@/app/services/model-fallback", () => ({
  generateWithFallback: vi.fn(),
}));

describe("surgicalTailorNode with isolated chunk context and 1:1 JSON parser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseState: AgentState = {
    rawResume: "John Doe Resume Text (full resume)",
    selectedJobDescription: "Staff Software Engineer with Go and Kubernetes experience",
    jobTitle: "Staff Software Engineer",
    preferences: DEFAULT_PREFERENCES,
    sortedMissingKeywords: ["Go", "Kubernetes", "PostgreSQL"],
    resumeAST: {
      summary: "Experienced developer",
      experience: [
        {
          title: "Senior Engineer",
          company: "Acme Corp",
          dates: "2021 - Present",
          description: "- Built backend APIs\n- Maintained database servers",
        },
      ],
      skills: { technical: ["TypeScript", "Go"], soft: [] },
      education: [],
      sections: ["Summary", "Experience", "Skills"],
    },
    bulletPlan: {
      summaryChange: false,
      jobBulletChanges: [
        {
          jobIndex: 0,
          bulletIndices: "all",
          reason: "Enhance backend API bullets with Go metrics",
        },
      ],
      jobAudits: [
        {
          jobIndex: 0,
          auditRationale: "Align Acme Corp tenure with Go and cloud scalability",
          hasChanges: true,
        },
      ],
    },
    logs: [],
    errors: [],
  };

  it("calls getExperienceBulletsPrompt WITHOUT passing rawResume (isolated chunk sandbox)", async () => {
    const promptSpy = vi.spyOn(tailoringSectionPrompts, "getExperienceBulletsPrompt");

    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: JSON.stringify([
        {
          index: 0,
          originalText: "Built backend APIs",
          suggestedText: "Architected Go backend APIs processing 50k RPS",
          status: "enhanced",
          reason: "Added Go and metrics",
          keywords: ["Go"],
        },
        {
          index: 1,
          originalText: "Maintained database servers",
          suggestedText: "Managed PostgreSQL database servers with 99.99% uptime",
          status: "enhanced",
          reason: "Added PostgreSQL and uptime",
          keywords: ["PostgreSQL"],
        },
      ]),
      modelUsed: "mock-model",
    });

    const result = await surgicalTailorNode(baseState);

    expect(promptSpy).toHaveBeenCalledTimes(1);
    const calledArgs = promptSpy.mock.calls[0][0];
    // Must NOT contain resumeContext or full raw resume
    expect((calledArgs as any).resumeContext).toBeUndefined();
    expect(calledArgs.jobTitle).toBe("Senior Engineer");
    expect(calledArgs.company).toBe("Acme Corp");
    expect(calledArgs.bulletsText).toBe("- Built backend APIs\n- Maintained database servers");

    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions![0].originalText).toBe("Built backend APIs");
    expect(result.suggestions![0].suggestedText).toBe("Architected Go backend APIs processing 50k RPS");
    expect(result.suggestions![0].jobIndex).toBe(0);
    expect(result.suggestions![0].bulletIndex).toBe(0);
    expect(result.suggestions![1].originalText).toBe("Maintained database servers");
    expect(result.suggestions![1].suggestedText).toBe("Managed PostgreSQL database servers with 99.99% uptime");
    expect(result.suggestions![1].jobIndex).toBe(0);
    expect(result.suggestions![1].bulletIndex).toBe(1);

    expect(result.tailoredBulletsByJob?.[0]).toContain("Architected Go backend APIs processing 50k RPS");
    expect(result.sectionGroups).toBeDefined();
    expect(result.sectionGroups![0].auditRationale).toBe("Align Acme Corp tenure with Go and cloud scalability");
  });

  it("handles fallback plain-text bullet output from LLM gracefully", async () => {
    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: "- Architected scalable services in Go\n- Optimized database query performance by 40%",
      modelUsed: "mock-model",
    });

    const result = await surgicalTailorNode(baseState);

    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions![0].suggestedText).toBe("Architected scalable services in Go");
    expect(result.suggestions![1].suggestedText).toBe("Optimized database query performance by 40%");
    expect(result.suggestions![1].category).toBe("metric");
  });

  it("calls getSummaryTailoringPrompt with isolated summary chunk, NEVER the full rawResume", async () => {
    const summarySpy = vi.spyOn(tailoringSectionPrompts, "getSummaryTailoringPrompt");

    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: "Tailored summary with Go and cloud experience.",
      modelUsed: "mock-model",
    });

    const stateWithSummary: AgentState = {
      ...baseState,
      bulletPlan: {
        summaryChange: true,
        jobBulletChanges: [],
      },
    };

    const result = await surgicalTailorNode(stateWithSummary);

    expect(summarySpy).toHaveBeenCalledTimes(1);
    const calledArgs = summarySpy.mock.calls[0][0];
    expect(calledArgs.summaryText).toBe("Experienced developer");
    expect((calledArgs as any).resume).toBeUndefined();
    expect(calledArgs.summaryText).not.toContain("John Doe");

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions![0].id).toBe("sug-summary");
    expect(result.suggestions![0].originalText).toBe("Experienced developer");
    expect(result.suggestions![0].suggestedText).toBe("Tailored summary with Go and cloud experience.");
  });
});
