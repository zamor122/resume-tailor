import { describe, it, expect } from "vitest";
import {
  deriveSuggestionsFromDiff,
  groupSuggestionsBySection,
  applySuggestionsToOriginal,
} from "@/app/utils/resumeReassemble";
import type { ResumeSuggestion } from "@/app/agent/state";

describe("resumeReassemble - Section-Scoped 1:1 Diff & Grouping", () => {
  const sampleOriginal = `# John Doe
john@example.com | 555-123-4567 | San Francisco, CA

## Summary
Software Engineer with 4 years of experience building web applications.

## Experience
Senior Full Stack Engineer - Acme Tech - 2022 - Present
- Built and maintained React frontend applications.
- Designed RESTful backend services using Node.js.

Software Developer - Startup Labs - 2020 - 2022
- Developed responsive web interfaces.
- Collaborated with QA team to fix bugs.

## Skills
JavaScript, TypeScript, React, Node.js, PostgreSQL
`;

  const sampleTailored = `# John Doe
john@example.com | 555-123-4567 | San Francisco, CA

## Summary
Results-driven Senior Full Stack Engineer with 4+ years of experience scaling enterprise applications.

## Experience
Senior Full Stack Engineer - Acme Tech - 2022 - Present
- Architected enterprise React frontend applications improving page load speed by 35%.
- Scaled distributed RESTful backend microservices in Node.js processing 10k req/sec.

Software Developer - Startup Labs - 2020 - 2022
- Spearheaded high-performance responsive web interfaces for 50k+ active users.
- Partnered with cross-functional QA teams to remediate critical defects.

## Skills
JavaScript, TypeScript, React, Node.js, PostgreSQL, AWS, Docker
`;

  describe("deriveSuggestionsFromDiff", () => {
    it("pairs modified bullets 1-to-1 without leaking the full resume into originalText", () => {
      const suggestions = deriveSuggestionsFromDiff(sampleOriginal, sampleTailored);

      expect(suggestions.length).toBeGreaterThan(0);

      // Verify that NO suggestion contains the full resume in originalText
      suggestions.forEach((sug) => {
        expect(sug.originalText).toBeDefined();
        expect(sug.originalText.length).toBeLessThan(300);
        expect(sug.originalText).not.toContain("## Summary");
        expect(sug.originalText).not.toContain("## Experience");
        expect(sug.originalText).not.toContain("## Skills");
        expect(sug.suggestedText).toBeDefined();
      });

      // Verify specific 1:1 pairings
      const reactSug = suggestions.find((s) => s.suggestedText.includes("Architected enterprise React"));
      expect(reactSug).toBeDefined();
      expect(reactSug?.originalText.toLowerCase()).toContain("built and maintained react");

      const nodeSug = suggestions.find((s) => s.suggestedText.includes("Scaled distributed RESTful"));
      expect(nodeSug).toBeDefined();
      expect(nodeSug?.originalText.toLowerCase()).toContain("designed restful backend services");
    });

    it("handles brand new bullets gracefully without grabbing unrelated lines from elsewhere", () => {
      const orig = `## Experience\nAcme Corp\n- Built React components`;
      const tailored = `## Experience\nAcme Corp\n- Built React components\n- Added cloud infrastructure on AWS`;

      const suggestions = deriveSuggestionsFromDiff(orig, tailored);
      const addedSug = suggestions.find((s) => s.suggestedText.includes("Added cloud infrastructure"));
      expect(addedSug).toBeDefined();
      // Should not steal "Built React components" or anything outside
      expect(addedSug?.originalText).not.toContain("Built React components");
    });
  });

  describe("groupSuggestionsBySection with rawResume fallback", () => {
    it("automatically parses rawResume into section groups when resumeAST is undefined", () => {
      const suggestions: ResumeSuggestion[] = [
        {
          id: "sug-1",
          section: "Acme Tech",
          originalText: "Built and maintained React frontend applications.",
          suggestedText: "Architected enterprise React frontend applications.",
          reason: "High impact",
          keywords: ["React"],
          status: "accepted",
        },
      ];

      // Pass undefined resumeAST but provide sampleOriginal as rawResume
      const groups = groupSuggestionsBySection(suggestions, undefined, sampleOriginal);

      expect(groups.length).toBeGreaterThan(1);
      const expGroups = groups.filter((g) => g.sectionType === "experience");
      expect(expGroups.length).toBeGreaterThanOrEqual(2);

      // originalContent for Acme Tech MUST NOT be the whole resume
      const acmeGroup = expGroups.find((g) => g.title.includes("Acme Tech"));
      expect(acmeGroup).toBeDefined();
      expect(acmeGroup?.originalContent).not.toContain("## Summary");
      expect(acmeGroup?.originalContent).not.toContain("Startup Labs");
      expect(acmeGroup?.originalContent.toLowerCase()).toContain("built and maintained react");
    });
  });
});
