import { describe, it, expect } from "vitest";
import { groupSuggestionsBySection } from "@/app/utils/resumeReassemble";
import type { ResumeSuggestion } from "@/app/agent/state";
import type { ParsedResumeForReassemble } from "@/app/utils/resumeReassemble";

describe("groupSuggestionsBySection", () => {
  const mockAST: ParsedResumeForReassemble = {
    summary: "Senior developer with 8 years of experience.",
    experience: [
      {
        title: "Senior Software Engineer",
        company: "Google",
        dates: "2021 - Present",
        location: "Mountain View, CA",
        description: "- Architected scalable services\n- Led team of 5",
      },
      {
        title: "Software Engineer",
        company: "Chapman University",
        dates: "2018 - 2021",
        location: "Orange, CA",
        description: "- Built campus web apps\n- Maintained SQL databases",
      },
    ],
    skills: "TypeScript, React, Python, Docker",
  };

  const mockSuggestions: ResumeSuggestion[] = [
    {
      id: "sug-summary",
      section: "Professional Summary",
      originalText: "Senior developer with 8 years of experience.",
      suggestedText: "Senior Cloud Architect specializing in distributed systems.",
      reason: "Aligned with target cloud role",
      keywords: ["Cloud Architecture", "Distributed Systems"],
      category: "summary",
      status: "accepted",
    },
    {
      id: "sug-job-0-bullet-0",
      section: "Google – Senior Software Engineer",
      originalText: "Architected scalable services",
      suggestedText: "Architected fault-tolerant microservices delivering 99.99% uptime",
      reason: "Injected uptime metrics",
      keywords: ["Microservices", "Uptime"],
      category: "metric",
      status: "accepted",
      jobIndex: 0,
      bulletIndex: 0,
    },
    {
      id: "sug-job-1-bullet-0",
      section: "Chapman University – Software Engineer",
      originalText: "Built campus web apps",
      suggestedText: "Engineered student portal serving 10,000+ daily active users",
      reason: "Quantified campus impact",
      keywords: ["Scale"],
      category: "metric",
      status: "accepted",
      jobIndex: 1,
      bulletIndex: 0,
    },
  ];

  it("orders section groups bottom-to-top (earliest role -> recent role -> skills -> summary)", () => {
    const groups = groupSuggestionsBySection(mockSuggestions, mockAST);

    expect(groups.length).toBe(4);
    // 1. Earliest experience (Chapman University, jobIndex: 1)
    expect(groups[0].sectionType).toBe("experience");
    expect(groups[0].jobIndex).toBe(1);
    expect(groups[0].title).toContain("Chapman University");
    expect(groups[0].orderIndex).toBe(0);

    // 2. Recent experience (Google, jobIndex: 0)
    expect(groups[1].sectionType).toBe("experience");
    expect(groups[1].jobIndex).toBe(0);
    expect(groups[1].title).toContain("Google");
    expect(groups[1].orderIndex).toBe(1);

    // 3. Skills section
    expect(groups[2].sectionType).toBe("skills");
    expect(groups[2].orderIndex).toBe(2);

    // 4. Professional Summary (finale at the top)
    expect(groups[3].sectionType).toBe("summary");
    expect(groups[3].orderIndex).toBe(3);
    expect(groups[3].title).toContain("Summary");
  });

  it("assigns suggestions to their matching section groups", () => {
    const groups = groupSuggestionsBySection(mockSuggestions, mockAST);
    const chapmanGroup = groups.find((g) => g.jobIndex === 1);
    const googleGroup = groups.find((g) => g.jobIndex === 0);
    const summaryGroup = groups.find((g) => g.sectionType === "summary");

    expect(chapmanGroup?.suggestions.length).toBe(1);
    expect(chapmanGroup?.suggestions[0].id).toBe("sug-job-1-bullet-0");

    expect(googleGroup?.suggestions.length).toBe(1);
    expect(googleGroup?.suggestions[0].id).toBe("sug-job-0-bullet-0");

    expect(summaryGroup?.suggestions.length).toBe(1);
    expect(summaryGroup?.suggestions[0].id).toBe("sug-summary");
  });

  it("handles sections without suggestions (unchanged status with auditRationale)", () => {
    const emptySuggestions: ResumeSuggestion[] = [];
    const groups = groupSuggestionsBySection(emptySuggestions, mockAST);

    expect(groups.length).toBe(4);
    expect(groups[0].status).toBe("unchanged");
    expect(groups[0].hasChanges).toBe(false);
    expect(groups[0].auditRationale).toBeDefined();
    expect(groups[0].auditRationale.length).toBeGreaterThan(0);
  });

  it("handles resumeAST without skills or experience gracefully", () => {
    const minimalAST: ParsedResumeForReassemble = {
      summary: "Developer",
    };
    const groups = groupSuggestionsBySection([], minimalAST);

    expect(groups.length).toBe(1);
    expect(groups[0].sectionType).toBe("summary");
  });
});
