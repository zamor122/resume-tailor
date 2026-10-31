import { describe, it, expect } from "vitest";
import { getHolisticSummaryPrompt } from "@/app/prompts/tailoringSection";
import { enforceBriefSummary } from "@/app/agent/nodes/surgicalTailor";

describe("Brief Holistic Summary Prompting (REQ-UBI-02, REQ-EVT-03)", () => {
  const originalSummary = "Experienced nurse with 10 years in clinical operations and team leadership.";
  const tailoredBullets = [
    "• Directed clinical oncology nursing operations across 4 medical centers.",
    "• Oversaw compliance audits resulting in zero deficiency findings.",
  ];
  const targetJD = "Director of Nursing Operations.";

  it("instructs LLM to write strictly 2 to 3 punchy sentences highlighting top relevant accomplishments", () => {
    const prompt = getHolisticSummaryPrompt(originalSummary, tailoredBullets, targetJD, {
      seniorityTier: "executive",
      careerArc: "Staff RN -> Nurse Manager -> Clinical Director",
    });

    expect(prompt).toContain("STRICT LENGTH CONSTRAINT: Write exactly 2 to 3 concise, punchy sentences");
    expect(prompt).toContain("highlight the candidate's most relevant qualifications");
    expect(prompt).toContain("Prohibit generic fluff");
  });

  it("also supports object parameters format for backward compatibility", () => {
    const prompt = getHolisticSummaryPrompt({
      assembledResume: originalSummary,
      jobDescription: targetJD,
      seniorityTier: "executive",
      careerArc: "Staff RN -> Nurse Manager -> Clinical Director",
    });

    expect(prompt).toContain("STRICT LENGTH CONSTRAINT: Write exactly 2 to 3 concise, punchy sentences");
    expect(prompt).toContain("highlight the candidate's most relevant qualifications");
  });

  describe("enforceBriefSummary safety trimmer", () => {
    it("trims summaries with more than 3 sentences to at most 3 sentences", () => {
      const fiveSentenceSummary =
        "Led nursing department across 4 regional hospitals. Directed 150 clinical staff members with 98% retention. Implemented electronic health record compliance system. Spearheaded state audit preparation. Managed $12M annual operating budget.";
      const trimmed = enforceBriefSummary(fiveSentenceSummary);
      expect(trimmed).toBe(
        "Led nursing department across 4 regional hospitals. Directed 150 clinical staff members with 98% retention. Implemented electronic health record compliance system."
      );
    });

    it("leaves summaries with 2 to 3 sentences unchanged", () => {
      const twoSentenceSummary =
        "Director of Nursing with 10+ years directing multi-site clinical operations. Orchestrated compliance audits resulting in zero deficiency findings across 4 regional hospitals.";
      const trimmed = enforceBriefSummary(twoSentenceSummary);
      expect(trimmed).toBe(twoSentenceSummary);
    });
  });
});
