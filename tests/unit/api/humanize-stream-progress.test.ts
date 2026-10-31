import { describe, it, expect, vi } from "vitest";
import { MODEL_CONFIGS, FALLBACK_MODELS } from "@/app/config/models";
import { surgicalTailorNode } from "@/app/agent/nodes/surgicalTailor";
import type { AgentState } from "@/app/agent/state";
import { DEFAULT_PREFERENCES } from "@/app/types/tailoringPreferences";
import { generateWithFallback } from "@/app/services/model-fallback";

vi.mock("@/app/services/model-fallback", () => ({
  generateWithFallback: vi.fn(),
}));

describe("Humanize Stream & Models Configuration", () => {
  it("includes valid gemini-1.5-flash in MODEL_CONFIGS and FALLBACK_MODELS without deprecated models", () => {
    expect(MODEL_CONFIGS["gemini:gemini-1.5-flash"]).toBeDefined();
    expect(MODEL_CONFIGS["gemini:gemini-1.5-flash"].modelId).toBe("gemini-1.5-flash");

    // FALLBACK_MODELS should prioritize working models and not include deprecated gemini-2.5-flash-lite
    expect(FALLBACK_MODELS).toContain("gemini:gemini-1.5-flash");
    expect(FALLBACK_MODELS).not.toContain("gemini:gemini-2.5-flash-lite");
  });

  it("bounds concurrency in surgicalTailorNode to at most 2 parallel calls", async () => {
    let currentConcurrent = 0;
    let maxObservedConcurrent = 0;

    vi.mocked(generateWithFallback).mockImplementation(async () => {
      currentConcurrent++;
      maxObservedConcurrent = Math.max(maxObservedConcurrent, currentConcurrent);
      // Simulate asynchronous LLM latency
      await new Promise((resolve) => setTimeout(resolve, 20));
      currentConcurrent--;
      return {
        text: JSON.stringify([
          {
            index: 0,
            originalText: "Led engineering projects",
            suggestedText: "Spearheaded high-impact cloud projects delivering 40% efficiency gains",
            status: "enhanced",
            reason: "Added quantified metrics",
            keywords: ["Cloud"],
          },
        ]),
        modelUsed: "gemini:gemini-1.5-flash",
      };
    });

    const testState: AgentState = {
      rawResume: "Resume text",
      selectedJobDescription: "Senior Cloud Engineer",
      preferences: { ...DEFAULT_PREFERENCES, intensity: "targeted" },
      sortedMissingKeywords: ["Cloud", "Kubernetes"],
      seniorityTier: "lead_manager",
      careerArc: "10 years in engineering",
      resumeAST: {
        summary: "Old summary",
        experience: [
          { title: "Role 1", company: "Company 1", dates: "2022 - Present", description: "- Led engineering projects" },
          { title: "Role 2", company: "Company 2", dates: "2020 - 2022", description: "- Maintained services" },
          { title: "Role 3", company: "Company 3", dates: "2018 - 2020", description: "- Built backend APIs" },
          { title: "Role 4", company: "Company 4", dates: "2016 - 2018", description: "- Wrote database queries" },
        ],
        skills: { technical: ["Cloud"], soft: [] },
        education: [],
        sections: ["Summary", "Experience", "Skills"],
      },
      bulletPlan: {
        summaryChange: false,
        skillsChange: false,
        jobBulletChanges: [
          { jobIndex: 0, bulletIndices: "all", reason: "Tier 1", recencyTier: "recent_deep" },
          { jobIndex: 1, bulletIndices: "all", reason: "Tier 2", recencyTier: "recent_deep" },
          { jobIndex: 2, bulletIndices: "all", reason: "Tier 3", recencyTier: "mid_career" },
          { jobIndex: 3, bulletIndices: "all", reason: "Tier 4", recencyTier: "foundational" },
        ],
      },
      logs: [],
      errors: [],
    };

    const result = await surgicalTailorNode(testState);

    expect(result.tailoredBulletsByJob).toBeDefined();
    expect(result.tailoredBulletsByJob?.length).toBe(4);
    // Concurrency must never exceed 2!
    expect(maxObservedConcurrent).toBeLessThanOrEqual(2);
  });
});
