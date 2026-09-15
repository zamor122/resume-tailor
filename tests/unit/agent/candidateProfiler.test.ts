import { describe, it, expect, vi, beforeEach } from "vitest";
import { candidateProfilerNode } from "@/app/agent/nodes/candidateProfiler";
import type { AgentState } from "@/app/agent/state";
import { DEFAULT_PREFERENCES } from "@/app/types/tailoringPreferences";
import { generateWithFallback } from "@/app/services/model-fallback";

vi.mock("@/app/services/model-fallback", () => ({
  generateWithFallback: vi.fn(),
}));

describe("candidateProfilerNode (REQ-UBI-01, REQ-EVT-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseState: AgentState = {
    rawResume: "Jane Doe\nDirector of Clinical Operations\nMercy Hospital\nLed nursing operations.",
    rawJobDescription: "Hiring Director of Clinical Operations to oversee $15M budget and JCAHO clinical compliance.",
    preferences: DEFAULT_PREFERENCES,
    resumeAST: {
      summary: "Healthcare executive",
      experience: [
        { company: "Mercy Hospital", title: "Clinical Nurse Specialist" },
        { company: "City Clinic", title: "Staff Nurse" },
      ],
      education: [],
      skills: { technical: ["Nursing", "Triage"], soft: ["Leadership"] },
      sections: ["Summary", "Experience", "Skills"],
    },
    logs: [],
    errors: [],
  };

  it("extracts profile, classifies seniority tier, extracts success pillars, and builds career arc", async () => {
    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: JSON.stringify({
        primaryTitle: "Director of Clinical Operations",
        seniorityLevel: "executive",
        topSkills: ["Clinical Operations", "Budgeting", "Compliance"],
        domain: "Healthcare",
        searchQuery: "Director of Clinical Operations",
      }),
      modelUsed: "cerebras-llama3.3-70b",
    });

    const result = await candidateProfilerNode(baseState);

    expect(result.candidateProfile).toBeDefined();
    expect(result.candidateProfile?.primaryTitle).toBe("Director of Clinical Operations");
    expect(result.candidateProfile?.seniorityTier).toBe("executive");
    expect(result.candidateProfile?.seniorityLevel).toBe("executive");
    expect(result.candidateProfile?.successPillars?.length).toBeGreaterThanOrEqual(2);
    expect(result.candidateProfile?.successPillars?.some(p => /compliance|care|budget/i.test(p))).toBe(true);
    expect(result.candidateProfile?.careerArc).toContain("Mercy Hospital");
    expect(result.jobTitle).toBe("Director of Clinical Operations");
  });

  it("falls back gracefully when LLM generation fails, retaining seniority tier and career arc", async () => {
    vi.mocked(generateWithFallback).mockRejectedValueOnce(new Error("API timeout"));

    const result = await candidateProfilerNode({
      ...baseState,
      jobTitle: "Nurse Manager",
      rawJobDescription: "Seeking Nurse Manager to lead patient care coordination.",
    });

    expect(result.candidateProfile).toBeDefined();
    expect(result.candidateProfile?.seniorityTier).toBe("lead_manager");
    expect(result.candidateProfile?.seniorityLevel).toBe("lead_manager");
    expect(result.candidateProfile?.careerArc).toContain("Mercy Hospital");
    expect(result.candidateProfile?.successPillars?.some(p => /patient care/i.test(p))).toBe(true);
    expect(result.errors?.[0]).toContain("Fallback used: API timeout");
  });
});
