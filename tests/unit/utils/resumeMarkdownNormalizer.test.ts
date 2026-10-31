import { describe, it, expect } from "vitest";
import { normalizeResumeMarkdown } from "@/app/utils/resumeMarkdownNormalizer";

describe("normalizeResumeMarkdown", () => {
  it("normalizes raw unformatted resume text with title, headings, and bullets into clean markdown", () => {
    const rawResume = `Jane Doe
jane.doe@example.com | 555-0199 | San Francisco, CA

Professional Summary
Senior Software Engineer with 8+ years leading distributed systems.

Work Experience
Google – Senior Software Engineer
2021 - Present • Mountain View, CA
• Architected high-throughput microservices handling 50k RPS
• Reduced database p99 latency by 35% with Redis caching

Chapman University – Software Engineer
2018 - 2021 • Orange, CA
• Developed and maintained campus portal used by 12,000 students

Technical Skills
TypeScript, React, Node.js, Go, Kubernetes, PostgreSQL

Education
BS in Computer Science, UC Berkeley
`;

    const normalized = normalizeResumeMarkdown(rawResume);

    // Name normalized to H1
    expect(normalized).toContain("# Jane Doe");
    // Section headers normalized to H2
    expect(normalized).toContain("## Professional Summary");
    expect(normalized).toContain("## Work Experience");
    expect(normalized).toContain("## Technical Skills");
    expect(normalized).toContain("## Education");
    // Job headers normalized to H3
    expect(normalized).toContain("### Google – Senior Software Engineer");
    expect(normalized).toContain("### Chapman University – Software Engineer");
    // Bullets normalized to standard markdown list items
    expect(normalized).toContain("- Architected high-throughput microservices");
    expect(normalized).toContain("- Reduced database p99 latency");
    expect(normalized).toContain("- Developed and maintained campus portal");
  });

  it("preserves already well-formatted markdown without duplicating hashes", () => {
    const markdownResume = `# John Smith
john@example.com

## Summary
Experienced data scientist.

## Experience

### Meta – Staff Data Scientist
2020 - Present
- Built recommendation engines
- Deployed ML pipelines

## Skills
Python, PyTorch
`;

    const normalized = normalizeResumeMarkdown(markdownResume);

    expect(normalized).toContain("# John Smith");
    expect(normalized).not.toContain("## # John Smith");
    expect(normalized).toContain("## Summary");
    expect(normalized).not.toContain("## ## Summary");
    expect(normalized).toContain("### Meta – Staff Data Scientist");
    expect(normalized).not.toContain("### ### Meta");
  });

  it("handles uppercase headings like PROFESSIONAL EXPERIENCE and CORE COMPETENCIES", () => {
    const upperResume = `Jane Doe

PROFESSIONAL SUMMARY
Senior architect.

PROFESSIONAL EXPERIENCE
Amazon – Solutions Architect
* Led cloud migrations

CORE COMPETENCIES
AWS, Kubernetes
`;

    const normalized = normalizeResumeMarkdown(upperResume);

    expect(normalized).toContain("## Professional Summary");
    expect(normalized).toContain("## Professional Experience");
    expect(normalized).toContain("## Core Competencies");
    expect(normalized).toContain("- Led cloud migrations");
  });
});
