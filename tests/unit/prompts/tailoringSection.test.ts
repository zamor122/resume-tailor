import { describe, it, expect } from "vitest";
import { getExperienceBulletsPrompt, getHolisticSummaryPrompt } from "@/app/prompts/tailoringSection";

describe("Universal Level-Calibrated Prompting (REQ-UBI-01, REQ-UBI-02, REQ-UBI-03)", () => {
  it("includes seniority tier, recency tier, and strict company privacy instructions", () => {
    const prompt = getExperienceBulletsPrompt({
      jobTitle: "Nurse Manager",
      company: "Mercy Hospital",
      dates: "2021 - Present",
      bulletsText: "- Supervised 20 nurses across inpatient ward",
      jobDescription: "Hiring Clinical Operations Manager at Kaiser Permanente",
      seniorityTier: "lead_manager",
      recencyTier: "recent_deep",
      careerArc: "Candidate has 10 years healthcare leadership.",
      targetCompany: "Kaiser Permanente",
    });

    expect(prompt).toContain("lead_manager");
    expect(prompt).toContain("STRICT COMPANY PRIVACY MANDATE");
    expect(prompt).toContain("DO NOT mention \"Kaiser Permanente\"");
    expect(prompt).toContain("REUSABLE PROFESSIONAL ACCOMPLISHMENTS");
  });

  it("instructs holistic summary prompt to synthesize complete tailored experience", () => {
    const prompt = getHolisticSummaryPrompt({
      assembledResume: "# Jane Doe\n## Experience\n- Spearheaded clinical workflows",
      jobDescription: "Operations Lead",
      seniorityTier: "senior",
    });

    expect(prompt).toContain("HOLISTIC EXECUTIVE SUMMARY");
    expect(prompt).toContain("ZERO CONTRADICTIONS");
  });
});
