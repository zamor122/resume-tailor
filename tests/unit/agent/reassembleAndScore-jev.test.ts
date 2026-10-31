// tests/unit/agent/reassembleAndScore-jev.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { reassembleAndScoreNode } from "@/app/agent/nodes/reassembleAndScore";
import * as jevService from "@/app/services/jev";

describe("reassembleAndScoreNode Jev Match Scoring (REQ-STA-01)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("derives beforeScore and afterScore from Jev evaluation", async () => {
    const jevSpy = vi.spyOn(jevService, "evaluateResumeAlignmentWithJev")
      .mockResolvedValueOnce({ matchScore: 54, confidence: 0.95 }) // baseline before
      .mockResolvedValueOnce({ matchScore: 88, confidence: 0.95 }); // tailored after

    const mockState: any = {
      rawResume: "Original resume text with basic keywords.",
      selectedJobDescription: "Target job description looking for Senior Lead.",
      baselineScore: 50,
      suggestions: [
        {
          id: "sug-1",
          section: "Experience",
          originalText: "basic keywords",
          suggestedText: "advanced strategic keywords and outcomes",
          status: "accepted",
          jevJudge: {
            isAuthentic: true,
            contentMatchScore: 5,
            toneOfVoiceRating: "strong_authentic",
            isBetterThanOriginal: true,
            overallImpactScore: 5,
            scoreDeltaPercent: 34,
          },
        },
      ],
      preferences: { intensity: "targeted" },
      sessionApiKeys: { TYPESAFE_API_KEY: "test-jev-key" },
    };

    const result = await reassembleAndScoreNode(mockState);
    expect(jevSpy).toHaveBeenCalledTimes(2);
    expect(jevSpy).toHaveBeenNthCalledWith(
      1,
      mockState.rawResume,
      mockState.selectedJobDescription,
      "test-jev-key"
    );
    expect(jevSpy).toHaveBeenNthCalledWith(
      2,
      result.finalResumeText,
      mockState.selectedJobDescription,
      "test-jev-key"
    );

    expect(result.beforeScore).toBe(54);
    expect(result.afterScore).toBe(88);
    expect(result.improvementMetrics?.scoreImprovement).toBe(34);
  });

  it("enforces minimum +5 score improvement when afterScore is lower or close to beforeScore", async () => {
    vi.spyOn(jevService, "evaluateResumeAlignmentWithJev")
      .mockResolvedValueOnce({ matchScore: 70, confidence: 0.9 })
      .mockResolvedValueOnce({ matchScore: 72, confidence: 0.9 }); // 72 < 70 + 5

    const mockState: any = {
      rawResume: "Original resume content.",
      selectedJobDescription: "Target JD",
      baselineScore: 50,
      preferences: { intensity: "targeted" },
    };

    const result = await reassembleAndScoreNode(mockState);
    expect(result.beforeScore).toBe(70);
    expect(result.afterScore).toBe(75); // Math.max(70 + 5, 72)
    expect(result.improvementMetrics?.scoreImprovement).toBe(5);
  });

  it("falls back gracefully to baseline token scoring when selectedJobDescription is missing or empty", async () => {
    const jevSpy = vi.spyOn(jevService, "evaluateResumeAlignmentWithJev");

    const mockState: any = {
      rawResume: "Original resume content.",
      selectedJobDescription: "",
      baselineScore: 60,
      preferences: { intensity: "targeted" },
      keywordResult: { criticalKeywords: ["cloud", "react"] },
    };

    const result = await reassembleAndScoreNode(mockState);
    expect(jevSpy).not.toHaveBeenCalled();
    expect(result.beforeScore).toBe(60);
    expect(result.afterScore).toBeGreaterThanOrEqual(70);
    expect(result.improvementMetrics?.scoreImprovement).toBe(result.afterScore! - 60);
  });

  it("falls back gracefully when evaluateResumeAlignmentWithJev throws", async () => {
    const jevSpy = vi.spyOn(jevService, "evaluateResumeAlignmentWithJev")
      .mockRejectedValue(new Error("Jev service unavailable"));

    const mockState: any = {
      rawResume: "Original resume content.",
      selectedJobDescription: "Target JD",
      baselineScore: 65,
      preferences: { intensity: "targeted" },
    };

    const result = await reassembleAndScoreNode(mockState);
    expect(jevSpy).toHaveBeenCalled();
    expect(result.beforeScore).toBe(65);
    expect(result.afterScore).toBeGreaterThanOrEqual(75);
    expect(result.improvementMetrics?.scoreImprovement).toBe(result.afterScore! - 65);
  });
});
