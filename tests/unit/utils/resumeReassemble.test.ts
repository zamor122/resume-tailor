import { describe, it, expect } from "vitest";
import {
  deriveSuggestionsFromDiff,
  groupSuggestionsBySection,
  applySuggestionsToOriginal,
  isSubstantiveChange,
  isolatePreciseOriginalChange,
  buildContactFromOriginal,
  reassembleResumeFromSections,
} from "@/app/utils/resumeReassemble";
import { sanitizeContactBlock } from "@/app/utils/contactBlockSanitizer";
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

  describe("EARS - User-Driven Suggestion Application Lifecycle", () => {
    it("deriveSuggestionsFromDiff initializes all suggestions with status 'pending'", () => {
      const suggestions = deriveSuggestionsFromDiff(sampleOriginal, sampleTailored);
      expect(suggestions.length).toBeGreaterThan(0);
      suggestions.forEach((sug) => {
        expect(sug.status).toBe("pending");
      });
    });

    it("applySuggestionsToOriginal leaves original text unchanged when status is 'pending' or 'rejected'", () => {
      const orig = "Senior Engineer\n- Built React UI for 100 users.";
      const pendingSug: ResumeSuggestion = {
        id: "sug-p",
        section: "Experience",
        originalText: "Built React UI for 100 users.",
        suggestedText: "Architected enterprise React UI for 100k users.",
        reason: "Scale",
        keywords: ["React"],
        status: "pending",
      };
      const rejectedSug: ResumeSuggestion = {
        id: "sug-r",
        section: "Experience",
        originalText: "Built React UI for 100 users.",
        suggestedText: "Architected enterprise React UI for 100k users.",
        reason: "Scale",
        keywords: ["React"],
        status: "rejected",
      };

      // When pending, original text must be preserved
      const pendingResult = applySuggestionsToOriginal(orig, [pendingSug]);
      expect(pendingResult).toBe(orig);
      expect(pendingResult).not.toContain("Architected enterprise React UI");

      // When rejected, original text must be preserved
      const rejectedResult = applySuggestionsToOriginal(orig, [rejectedSug]);
      expect(rejectedResult).toBe(orig);
    });

    it("applySuggestionsToOriginal replaces original text ONLY when status is 'accepted'", () => {
      const orig = "Senior Engineer\n- Built React UI for 100 users.";
      const acceptedSug: ResumeSuggestion = {
        id: "sug-a",
        section: "Experience",
        originalText: "Built React UI for 100 users.",
        suggestedText: "Architected enterprise React UI for 100k users.",
        reason: "Scale",
        keywords: ["React"],
        status: "accepted",
      };

      const result = applySuggestionsToOriginal(orig, [acceptedSug]);
      expect(result).toContain("Architected enterprise React UI for 100k users.");
      expect(result).not.toContain("Built React UI for 100 users.");
    });

    it("preserves custom circle bullets (●, ○) and exact document formatting in-place", () => {
      const orig = `Summary\n● 11+ Years of Leadership\nTicketmaster\n○ AI-SDLC Framework & SDD Standardization : Authored company framework.`;
      const acceptedSug: ResumeSuggestion = {
        id: "sug-circle",
        section: "Ticketmaster",
        originalText: "AI-SDLC Framework & SDD Standardization : Authored company framework.",
        suggestedText: "• AI-SDLC Framework & SDD Standardization : Architected enterprise-wide framework, 2x delivery throughput.",
        reason: "Metric",
        keywords: [],
        status: "accepted",
      };

      const result = applySuggestionsToOriginal(orig, [acceptedSug]);
      // Must preserve the original ○ bullet glyph in-place
      expect(result).toContain("○ AI-SDLC Framework & SDD Standardization : Architected enterprise-wide framework, 2x delivery throughput.");
      // Must preserve the summary ● bullet
      expect(result).toContain("● 11+ Years of Leadership");
      expect(result).not.toContain("Authored company framework.");
    });
  });

  describe("EARS - Substantive vs Trivial Change Filtering", () => {
    it("isSubstantiveChange returns false for identical strings or whitespace-only changes", () => {
      expect(isSubstantiveChange("Built React apps", "Built React apps")).toBe(false);
      expect(isSubstantiveChange("  Built React apps  ", "Built React apps")).toBe(false);
      expect(isSubstantiveChange("Built   React   apps", "Built React apps")).toBe(false);
      expect(isSubstantiveChange("", "")).toBe(false);
    });

    it("isSubstantiveChange returns false for newline and line break differences", () => {
      expect(isSubstantiveChange("Built React apps.\nProcessed data.", "Built React apps. Processed data.")).toBe(false);
      expect(isSubstantiveChange("Built React apps\r\nProcessed data", "Built React apps Processed data")).toBe(false);
      expect(isSubstantiveChange("- Line 1\n- Line 2", "- Line 1 - Line 2")).toBe(false);
    });

    it("isSubstantiveChange returns false for bullet character or trailing punctuation differences", () => {
      expect(isSubstantiveChange("- Built React apps", "* Built React apps")).toBe(false);
      expect(isSubstantiveChange("• Built React apps.", "- Built React apps")).toBe(false);
      expect(isSubstantiveChange("Built React apps.", "Built React apps")).toBe(false);
      expect(isSubstantiveChange("Built React apps;", "Built React apps")).toBe(false);
    });

    it("isSubstantiveChange returns false for case-only changes", () => {
      expect(isSubstantiveChange("Built React apps", "built react apps")).toBe(false);
    });

    it("isSubstantiveChange returns true for meaningful, substantive changes", () => {
      expect(
        isSubstantiveChange(
          "Built React apps",
          "Architected enterprise React applications improving load performance by 40%"
        )
      ).toBe(true);

      expect(
        isSubstantiveChange(
          "Led backend microservices",
          "Engineered Go and Kubernetes microservices handling 10k req/sec"
        )
      ).toBe(true);
    });

    it("deriveSuggestionsFromDiff filters out bullets that only have newline or whitespace differences", () => {
      const orig = `## Experience
Acme Corp - Software Engineer
- Built React applications.
- Managed SQL database.`;

      // Second bullet only has a newline and trailing period difference; first bullet has a real enhancement
      const tailored = `## Experience
Acme Corp - Software Engineer
- Architected enterprise React applications with 99.9% uptime.
- Managed SQL\ndatabase`;

      const suggestions = deriveSuggestionsFromDiff(orig, tailored);

      // Only the first bullet should be a suggestion; the second is a trivial newline diff
      expect(suggestions.length).toBe(1);
      expect(suggestions[0].suggestedText).toContain("Architected enterprise React");
    });

    it("ensures originalText is strictly line-by-line and never leaks full document or uses fake placeholder strings", () => {
      const orig = `SHAYNE ZAMORA
Full Stack Engineer | shayne@example.com

SUMMARY
Full stack engineer building modern web applications.

PROFESSIONAL EXPERIENCE
Acme Software Inc. — Senior Engineer
Jan 2021 – Present
- Built React frontend applications.
- Managed database queries.

EDUCATION
University of California
B.S. in Computer Science`;

      const tailored = `SHAYNE ZAMORA
Full Stack Engineer | shayne@example.com

SUMMARY
Full stack engineer building high-availability web applications in React and Node.js.

PROFESSIONAL EXPERIENCE
Acme Software Inc. — Senior Engineer
Jan 2021 – Present
- Architected enterprise React frontend applications for 100k users.
- Optimized PostgreSQL queries reducing latency by 45%.
- Implemented automated CI/CD deployment pipelines.

EDUCATION
University of California
B.S. in Computer Science`;

      const suggestions = deriveSuggestionsFromDiff(orig, tailored);

      // Verify no suggestion has the full resume as originalText
      for (const s of suggestions) {
        expect(s.originalText.length).toBeLessThan(250);
        expect(s.originalText).not.toContain("PROFESSIONAL EXPERIENCE");
        expect(s.originalText).not.toContain("EDUCATION");
        expect(s.originalText).not.toContain("(New bullet added");
        expect(s.originalText).not.toContain("(New line added");
      }

      // Check section name is clean and not a mangled date
      const expSuggestions = suggestions.filter((s) => s.category !== "summary");
      for (const s of expSuggestions) {
        expect(s.section).toContain("Acme Software Inc.");
        expect(s.section).not.toContain("Present – Jan 2021");
      }

      // Check the newly added bullet has empty originalText
      const addedSug = suggestions.find((s) => s.suggestedText.includes("automated CI/CD"));
      expect(addedSug).toBeDefined();
      expect(addedSug?.originalText).toBe("");
    });
  });

  describe("isolatePreciseOriginalChange", () => {
    const fullResumeDoc = `SHAYNE ZAMORA
Full Stack Engineer | shayne@example.com

SUMMARY
Full stack engineer building modern web applications.

PROFESSIONAL EXPERIENCE
Acme Software Inc. — Senior Engineer
Jan 2021 – Present
- Built React frontend applications.
- Managed database queries.

EDUCATION
University of California
B.S. in Computer Science`;

    it("isolates the single matching bullet when passed a full resume document", () => {
      const isolated = isolatePreciseOriginalChange(
        fullResumeDoc,
        "Architected enterprise React frontend applications serving 100k daily users.",
        fullResumeDoc
      );

      expect(isolated).toBe("Built React frontend applications.");
      expect(isolated).not.toContain("SHAYNE ZAMORA");
      expect(isolated).not.toContain("PROFESSIONAL EXPERIENCE");
      expect(isolated).not.toContain("EDUCATION");
    });

    it("returns empty string (treating as addition) when full resume does not match suggested text", () => {
      const isolated = isolatePreciseOriginalChange(
        fullResumeDoc,
        "Spearheaded enterprise Kubernetes cluster migration with zero downtime.",
        fullResumeDoc
      );

      expect(isolated).toBe("");
    });

    it("strips bullet prefixes and selects the matching line from multi-line text", () => {
      const multiLine = `- Built React frontend applications.\n- Managed database queries.`;
      const isolated = isolatePreciseOriginalChange(
        multiLine,
        "Optimized complex PostgreSQL queries reducing p99 latency by 50%."
      );

      expect(isolated).toBe("Managed database queries.");
    });

    it("extracts the specific sentence when original is a multi-sentence paragraph", () => {
      const longSummary =
        "Results-oriented Senior Software Engineer with 8+ years of extensive experience designing web applications. Proven track record leading distributed microservices and scaling database architecture. Passionate about automated testing and mentoring junior engineers.";
      const tailoredSentence =
        "Proven track record architecting high-throughput distributed microservices and optimizing database performance.";

      const isolated = isolatePreciseOriginalChange(longSummary, tailoredSentence);
      expect(isolated).toBe(
        "Proven track record leading distributed microservices and scaling database architecture."
      );
    });

    it("returns empty string for placeholder strings like (New bullet added)", () => {
      expect(isolatePreciseOriginalChange("(New bullet added)", "Added bullet")).toBe("");
      expect(isolatePreciseOriginalChange("(New line added)", "Added line")).toBe("");
    });

    it("never leaks full resume when diffing unformatted single-string resumes with circle bullets", () => {
      const userRawResume = `Shayne Zamora Orange County, CA | (714) 625-2593 | shaynezamora@sbcglobal.net B.S Software Engineering | Chapman University | github:zamor122 Summary ● 11+ Years of Software Engineering Leadership : Architected and scaled high-availability web, mobile, and cloud applications serving 1,000,000+ global users across complex enterprise environments. ● 3+ Years of AI Architecture & Agentic Engineering : Pioneer in deploying production-grade AI-SDLC frameworks, Spec-Driven Development (SDD), and autonomous agent workflows using modern AI tools (Claude Code, Cursor, Codex). Ticketmaster | LiveNation Technical Manager— AI Innovation Pipeline (Sponsorship) | April 2026 – Present ○ AI-SDLC Framework & SDD Standardization : Authored and operationalized the company-wide AI-Software Development Life Cycle (AI-SDLC) framework and Spec-Driven Development (SDD) skills across Ticketmaster, doubling feature delivery throughput (2x) for initial adoption teams.`;

      const tailoredTicketmaster = `Shayne Zamora Orange County, CA | (714) 625-2593 | shaynezamora@sbcglobal.net
## Summary
- 11+ Years of Software Engineering Leadership : Architected high-availability web and cloud applications.
- 3+ Years of AI Architecture & Agentic Engineering : Pioneer in deploying production-grade AI-SDLC frameworks.

## Experience
Ticketmaster | LiveNation Technical Manager — AI Innovation Pipeline
April 2026 – Present
- AI-SDLC Framework & SDD Standardization : Authored enterprise AI-SDLC framework doubling velocity by 2.5x.`;

      const sugs = deriveSuggestionsFromDiff(userRawResume, tailoredTicketmaster);
      expect(sugs.length).toBeGreaterThan(0);
      sugs.forEach((sug) => {
        expect(sug.originalText.length).toBeLessThan(300);
        expect(sug.originalText).not.toContain("Chapman University");
      });
    });
  });

  describe("EARS Requirements: Summary Injection & Personal Info Preservation", () => {
    const rawResumeWithFullHeader = `Shayne Zamora
Senior Software Engineer & AI Architect | Distributed Systems
Orange County, CA | (714) 625-2593 | shaynezamora@sbcglobal.net
github:zamor122 | portfolio.dev | B.S. Software Engineering | Chapman University
Security Clearance: Secret | US Citizen

## Experience
Acme Corp — Lead Engineer
Jan 2022 – Present
- Built high-availability distributed systems in Go.
- Optimized query latency by 45%.`;

    it("@EARS-SUM-02 & @EARS-EVT-04: buildContactFromOriginal preserves 100% of original preamble without dropping links or truncating", () => {
      const contact = buildContactFromOriginal(rawResumeWithFullHeader, {
        contactInfo: {
          name: "Shayne Zamora",
          email: "shaynezamora@sbcglobal.net",
          phone: "(714) 625-2593",
          location: "Orange County, CA",
        },
      });

      // Must preserve GitHub, portfolio, clearance, title, degrees
      expect(contact).toContain("Senior Software Engineer & AI Architect | Distributed Systems");
      expect(contact).toContain("github:zamor122");
      expect(contact).toContain("portfolio.dev");
      expect(contact).toContain("B.S. Software Engineering | Chapman University");
      expect(contact).toContain("Security Clearance: Secret | US Citizen");
    });

    it("@EARS-SUM-01 & @EARS-EVT-02: reassembleResumeFromSections does NOT inject a Summary section when original resume had no summary", () => {
      const result = reassembleResumeFromSections({
        originalResume: rawResumeWithFullHeader,
        parsed: {
          contactInfo: { name: "Shayne Zamora" },
          experience: [
            {
              company: "Acme Corp",
              title: "Lead Engineer",
              dates: "Jan 2022 – Present",
              description: "- Built high-availability distributed systems in Go.",
            },
          ],
          summary: null, // No summary in original!
        },
        tailoredSummary: "Synthesized executive summary that should NOT be injected.",
        tailoredBulletsByJob: ["- Built high-availability distributed systems in Go."],
      });

      expect(result).not.toContain("## Summary");
      expect(result).not.toContain("Synthesized executive summary");
      expect(result).toContain("## Experience");
      expect(result).toContain("github:zamor122");
    });

    it("@EARS-EVT-03: groupSuggestionsBySection omits section-summary when AST has no summary and no summary suggestions exist", () => {
      const groups = groupSuggestionsBySection(
        [
          {
            id: "sug-exp-0",
            section: "Acme Corp – Lead Engineer",
            originalText: "Built high-availability distributed systems in Go.",
            suggestedText: "Architected high-availability distributed systems in Go.",
            status: "accepted",
            jobIndex: 0,
          },
        ],
        {
          experience: [
            {
              company: "Acme Corp",
              title: "Lead Engineer",
              dates: "Jan 2022 – Present",
              description: "- Built high-availability distributed systems in Go.",
            },
          ],
          summary: null, // No original summary
        }
      );

      const summaryGroup = groups.find((g) => g.sectionType === "summary" || g.id === "section-summary");
      expect(summaryGroup).toBeUndefined();
    });

    it("@EARS-ERR-02: sanitizeContactBlock does NOT delete lines with state abbreviations like Boston, MA or credentials", () => {
      const resumeWithMA = `Jane Doe
Senior Full Stack Engineer
Boston, MA | (555) 123-4567 | jane@example.com
B.S. Computer Science | MIT

## Experience
Acme Tech - Lead Engineer
2020 - Present
- Built web apps`;

      const sanitized = sanitizeContactBlock(resumeWithMA, {
        contactInfo: { location: "Boston, MA" },
        education: [{ institution: "MIT", degree: "B.S." }],
      });

      expect(sanitized).toContain("Boston, MA");
    });
  });
});

