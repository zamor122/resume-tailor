import { describe, it, expect } from "vitest";
import {
  parseBlogPostResponse,
  extractFaqItemsFromMarkdown,
} from "@/app/utils/blogPostParser";
import { BLOG_SEO_TOPICS, pickNextSeoTopic } from "@/app/config/blogSeoTopics";

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

describe("extractFaqItemsFromMarkdown", () => {
  it("extracts Q&A pairs under ## Frequently Asked Questions for FAQPage JSON-LD", () => {
    const md = `## Intro
Some article text.

## Frequently Asked Questions

### How many keywords should I include on my resume?
Include 10 to 15 high-priority keywords that match your real experience naturally across your summary, skills, and bullets.

### Does AI Resume Tailor invent fake experience?
No. [AI Resume Tailor](https://airesumetailor.com) rewrites your existing accomplishments to align with the job description without fabricating facts.
`;
    const items = extractFaqItemsFromMarkdown(md);
    expect(items).toHaveLength(2);
    expect(items[0].question).toBe("How many keywords should I include on my resume?");
    expect(items[1].answer).toContain("AI Resume Tailor rewrites your existing accomplishments");
  });
});

describe("pickNextSeoTopic", () => {
  it("skips already-covered slugs and primary keywords", () => {
    const first = BLOG_SEO_TOPICS[0];
    const second = BLOG_SEO_TOPICS[1];
    const next = pickNextSeoTopic([first.slugHint], []);
    expect(next?.slugHint).toBe(second.slugHint);
  });
});
