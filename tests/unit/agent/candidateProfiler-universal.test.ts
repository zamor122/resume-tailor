import { describe, it, expect, vi, beforeEach } from "vitest";
import { candidateProfilerNode } from "@/app/agent/nodes/candidateProfiler";
import type { AgentState } from "@/app/agent/state";
import { DEFAULT_PREFERENCES } from "@/app/types/tailoringPreferences";
import { generateWithFallback } from "@/app/services/model-fallback";

vi.mock("@/app/services/model-fallback", () => ({
  generateWithFallback: vi.fn(),
}));

describe("candidateProfilerNode - Universal Category Resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseState: AgentState = {
    rawResume: "Candidate with 8 years of experience in the field.",
    rawJobDescription: "Role overview and responsibilities.",
    preferences: DEFAULT_PREFERENCES,
    logs: [],
    errors: [],
  };

  it("extracts healthcare category and canonical role for a nursing leader", async () => {
    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: JSON.stringify({
        primaryTitle: "Nurse Manager",
        seniorityLevel: "lead_manager",
        topSkills: ["Patient Triage", "Staff Scheduling", "HIPAA"],
        domain: "Healthcare",
        searchQuery: "Nurse Manager acute care",
      }),
      modelUsed: "gemini:gemini-1.5-flash",
    });

    const result = await candidateProfilerNode({
      ...baseState,
      jobTitle: "Nurse Manager",
      selectedJobDescription: "Hospital unit needing acute care nurse manager.",
    });

    expect(result.industryCategory).toBe("healthcare");
    expect(result.canonicalRole).toBe("Nurse Manager / Clinical Lead");
    expect(result.candidateProfile?.industryCategory).toBe("healthcare");
    expect(result.candidateProfile?.canonicalRole).toBe("Nurse Manager / Clinical Lead");
    expect(result.jobKnowledge).toBeDefined();
    expect(result.jobKnowledge?.powerVerbs).toContain("Triaged");
  });

  it("extracts trades_facilities category for a custodian or janitor", async () => {
    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: JSON.stringify({
        primaryTitle: "Lead Custodian",
        seniorityLevel: "senior",
        topSkills: ["Floor Care", "OSHA Safety", "Sanitation"],
        domain: "Facilities",
        searchQuery: "Facilities Custodian school",
      }),
      modelUsed: "gemini:gemini-1.5-flash",
    });

    const result = await candidateProfilerNode({
      ...baseState,
      jobTitle: "Lead Custodian",
      selectedJobDescription: "School district hiring facilities custodian.",
    });

    expect(result.industryCategory).toBe("trades_facilities");
    expect(result.canonicalRole).toBe("Facilities Custodian & Maintenance Specialist");
    expect(result.jobKnowledge?.powerVerbs).toContain("Sanitized");
  });

  it("extracts aviation_aerospace category for a commercial airline pilot", async () => {
    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: JSON.stringify({
        primaryTitle: "Commercial Airline Pilot",
        seniorityLevel: "senior",
        topSkills: ["Boeing 737", "FAA Part 121", "CRM"],
        domain: "Aviation",
        searchQuery: "Commercial Airline Pilot B737",
      }),
      modelUsed: "gemini:gemini-1.5-flash",
    });

    const result = await candidateProfilerNode({
      ...baseState,
      jobTitle: "Commercial Airline Pilot",
      selectedJobDescription: "Passenger airline hiring Boeing 737 Captain.",
    });

    expect(result.industryCategory).toBe("aviation_aerospace");
    expect(result.canonicalRole).toBe("Commercial Airline Pilot / Flight Commander");
    expect(result.jobKnowledge?.powerVerbs).toContain("Commanded");
  });
});
