import { describe, it, expect } from "vitest";
import { parseBlogPostResponse } from "@/app/utils/blogPostParser";

describe("parseBlogPostResponse", () => {
  it("parses valid JSON responses cleanly", () => {
    const raw = JSON.stringify({
      title: "How to Tailor Your Resume for ATS",
      slug: "tailor-resume-ats-2026",
      description: "Learn how to match job descriptions.",
      summary: "A guide to ATS keyword alignment.",
      body: "## Intro\n\nUse [AI Resume Tailor](https://airesumetailor.com).",
    });

    const parsed = parseBlogPostResponse(raw);
    expect(parsed).toEqual({
      title: "How to Tailor Your Resume for ATS",
      slug: "tailor-resume-ats-2026",
      description: "Learn how to match job descriptions.",
      summary: "A guide to ATS keyword alignment.",
      body: "## Intro\n\nUse [AI Resume Tailor](https://airesumetailor.com).",
    });
  });

  it("recovers articles when the LLM emits unescaped literal newlines inside body", () => {
    const raw = `\`\`\`json
{
  "title": "Beating ATS Filters in 2026",
  "slug": "beating-ats-filters-2026",
  "description": "Practical strategies to pass ATS scans.",
  "summary": "Covers ATS formatting and keyword matching.",
  "body": "## Why ATS Matters

Most resumes are filtered before a human sees them.

- Match "exact" role keywords
- Try [AI Resume Tailor](https://airesumetailor.com) today."
}
\`\`\``;

    const parsed = parseBlogPostResponse(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.title).toBe("Beating ATS Filters in 2026");
    expect(parsed?.slug).toBe("beating-ats-filters-2026");
    expect(parsed?.body).toContain("## Why ATS Matters");
    expect(parsed?.body).toContain('Match "exact" role keywords');
  });

  it("returns null for empty or incomplete responses", () => {
    expect(parseBlogPostResponse("")).toBeNull();
    expect(parseBlogPostResponse('{"title": "Only title"}')).toBeNull();
  });
});
