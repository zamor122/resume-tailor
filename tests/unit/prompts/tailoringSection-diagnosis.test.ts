// tests/unit/prompts/tailoringSection-diagnosis.test.ts
import { describe, it, expect } from "vitest";
import { getExperienceBulletsPrompt } from "@/app/prompts/tailoringSection";
import type { JevDiagnosticResult } from "@/app/services/jev";

describe("Diagnosis-Guided Experience Prompting (REQ-EVT-01, REQ-EVT-02)", () => {
  const mockExp = {
    title: "Project Lead",
    company: "Acme Health",
    description: "• Coordinated EHR software rollout across 3 clinics.",
  };
  const mockJd = "Healthcare Operations Manager overseeing clinical informatics.";

  it("injects Jev diagnostic directives when provided", () => {
    const diagnosis: JevDiagnosticResult = {
      matchedSkills: ["EHR"],
      missingSkills: ["Regulatory Compliance", "Cross-Functional Leadership"],
      seniorityScore: 4,
      enhancementFocus: "elevate_ownership",
      confidence: 0.92,
    };

    const prompt = getExperienceBulletsPrompt(mockExp, mockJd, {
      recencyTier: "tier1_recent",
      seniorityTier: "senior",
      successPillars: ["Clinical Excellence", "Regulatory Compliance"],
      diagnosis,
    });

    expect(prompt).toContain("JEV SYSTEM 1 DIAGNOSTIC DIRECTIVES");
    expect(prompt).toContain("elevate_ownership");
    expect(prompt).toContain("Regulatory Compliance, Cross-Functional Leadership");
  });

  it("gracefully generates valid prompt without diagnosis", () => {
    const prompt = getExperienceBulletsPrompt(mockExp, mockJd, {
      recencyTier: "tier1_recent",
      seniorityTier: "senior",
    });

    expect(prompt).not.toContain("JEV SYSTEM 1 DIAGNOSTIC DIRECTIVES");
    expect(prompt).toContain("Acme Health");
  });

  it("handles empty missingSkills by falling back to JD priorities", () => {
    const diagnosis: JevDiagnosticResult = {
      matchedSkills: ["EHR"],
      missingSkills: [],
      seniorityScore: 3,
      enhancementFocus: "clarify_outcomes",
      confidence: 0.85,
    };

    const prompt = getExperienceBulletsPrompt(mockExp, mockJd, {
      diagnosis,
    });

    expect(prompt).toContain("JEV SYSTEM 1 DIAGNOSTIC DIRECTIVES");
    expect(prompt).toContain("High-Priority Competencies to Highlight (if supported by background): Align with JD priorities");
    expect(prompt).toContain("Historical Scope Calibration: Match Rating 3/5 for target role");
  });

  it("injects diagnosis directives when called via single-object params", () => {
    const diagnosis: JevDiagnosticResult = {
      matchedSkills: ["Python"],
      missingSkills: ["Kubernetes"],
      seniorityScore: 5,
      enhancementFocus: "showcase_scale",
      confidence: 0.95,
    };

    const prompt = getExperienceBulletsPrompt({
      jobTitle: "Senior Architect",
      company: "CloudScale Inc",
      dates: "2020 - Present",
      bulletsText: "- Architected cloud platform",
      jobDescription: "Staff Infrastructure Engineer",
      seniorityTier: "executive",
      diagnosis,
    });

    expect(prompt).toContain("JEV SYSTEM 1 DIAGNOSTIC DIRECTIVES");
    expect(prompt).toContain("showcase_scale");
    expect(prompt).toContain("Kubernetes");
    expect(prompt).toContain("Match Rating 5/5 for target executive");
  });
});
