import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/agent/tailor-chunk/route";
import type { ResumeSectionGroup } from "@/app/agent/state";
import { generateWithFallback } from "@/app/services/model-fallback";

vi.mock("@/app/services/model-fallback", () => ({
  generateWithFallback: vi.fn(),
}));

describe("POST /api/agent/tailor-chunk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockGroup: ResumeSectionGroup = {
    id: "section-exp-0",
    sectionType: "experience",
    title: "Google – Senior Software Engineer",
    subtitle: "2021 - Present",
    jobIndex: 0,
    orderIndex: 0,
    status: "pending",
    auditRationale: "Align with cloud scalability requirements",
    suggestions: [],
    originalContent: "- Built services\n- Worked with databases",
    hasChanges: true,
  };

  it("tailors experience bullets on demand and returns populated suggestions with status ready", async () => {
    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: "- Engineered resilient distributed systems serving 50k RPS\n- Optimized database query latency by 45%",
      modelUsed: "gemini-1.5-flash",
    });

    const req = new Request("http://localhost:3000/api/agent/tailor-chunk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionGroup: mockGroup,
        resumeContext: "John Doe resume",
        jobDescription: "Staff Cloud Engineer needed with microservices and PostgreSQL experience",
        sortedMissingKeywords: ["Microservices", "PostgreSQL"],
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.sectionGroup).toBeDefined();
    expect(json.sectionGroup.status).toBe("ready");
    expect(json.sectionGroup.suggestions.length).toBeGreaterThan(0);
    expect(json.sectionGroup.suggestions[0].suggestedText).toContain("Engineered resilient");
    expect(json.sectionGroup.tailoredContent).toContain("Engineered resilient");
    expect(generateWithFallback).toHaveBeenCalledTimes(1);
  });

  it("returns 400 if sectionGroup is missing", async () => {
    const req = new Request("http://localhost:3000/api/agent/tailor-chunk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 400 if sectionGroup.originalContent is missing", async () => {
    const invalidGroup = { ...mockGroup, originalContent: "" };
    const req = new Request("http://localhost:3000/api/agent/tailor-chunk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionGroup: invalidGroup }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns immediately with status ready if hasChanges is false and suggestions is empty", async () => {
    const unchangedGroup: ResumeSectionGroup = {
      ...mockGroup,
      hasChanges: false,
      suggestions: [],
    };

    const req = new Request("http://localhost:3000/api/agent/tailor-chunk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionGroup: unchangedGroup,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sectionGroup.status).toBe("ready");
    expect(generateWithFallback).not.toHaveBeenCalled();
  });

  it("extracts company and jobTitle correctly with hyphen separator", async () => {
    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: "- Spearheaded scalable API architecture",
      modelUsed: "gemini-1.5-flash",
    });

    const hyphenGroup: ResumeSectionGroup = {
      ...mockGroup,
      title: "Amazon - Software Development Engineer II",
    };

    const req = new Request("http://localhost:3000/api/agent/tailor-chunk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionGroup: hyphenGroup,
        jobDescription: "AWS Cloud architect",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(generateWithFallback).toHaveBeenCalledWith(
      expect.stringContaining("Amazon"),
      undefined,
      { maxTokens: 600, temperature: 0.2 },
      undefined
    );
  });

  it("categorizes suggestions accurately for metrics and keywords", async () => {
    vi.mocked(generateWithFallback).mockResolvedValueOnce({
      text: "- Accelerated API performance by 50% using Redis caching\n- Implemented Kubernetes clustering for high availability",
      modelUsed: "gemini-1.5-flash",
    });

    const req = new Request("http://localhost:3000/api/agent/tailor-chunk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionGroup: mockGroup,
        sortedMissingKeywords: ["Kubernetes", "Redis"],
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    const suggestions = json.sectionGroup.suggestions;
    expect(suggestions).toHaveLength(2);

    // First bullet has "50%" metric
    expect(suggestions[0].category).toBe("metric");
    expect(suggestions[0].keywords).toContain("Redis");

    // Second bullet has keyword "Kubernetes" and no metric
    expect(suggestions[1].category).toBe("keyword");
    expect(suggestions[1].keywords).toContain("Kubernetes");
  });

  it("handles LLM generation failure gracefully with 500 error response", async () => {
    vi.mocked(generateWithFallback).mockRejectedValueOnce(new Error("LLM Rate Limit Exceeded"));

    const req = new Request("http://localhost:3000/api/agent/tailor-chunk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionGroup: mockGroup,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("LLM Rate Limit Exceeded");
  });
});
