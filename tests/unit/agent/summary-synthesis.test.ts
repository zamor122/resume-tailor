import { describe, it, expect, vi, beforeEach } from "vitest";
import { getHolisticSummaryPrompt } from "@/app/prompts/tailoringSection";
import { POST } from "@/app/api/agent/synthesize-summary/route";
import { generateWithFallback } from "@/app/services/model-fallback";

vi.mock("@/app/services/model-fallback", () => ({
  generateWithFallback: vi.fn().mockResolvedValue({
    text: "Lead Cloud Architect with 9+ years architecting fault-tolerant distributed platforms. Led engineering teams across Google and Chapman University scaling high-throughput microservices. Expert in TypeScript, Kubernetes, and cloud database optimization.",
    modelUsed: "gemini-1.5-flash",
  }),
}));

describe("Holistic Summary Synthesis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getHolisticSummaryPrompt", () => {
    it("generates prompt instructing full career synthesis without changelog phrasing", () => {
      const prompt = getHolisticSummaryPrompt({
        assembledResume: "Full resume content here...",
        jobDescription: "Staff Cloud Engineer job posting",
        jobTitle: "Staff Cloud Engineer",
        userRequestedKeywords: ["Kubernetes", "Distributed Systems"],
      });

      expect(prompt).toContain("Staff Cloud Engineer");
      expect(prompt).toContain("Kubernetes");
      expect(prompt.toLowerCase()).toContain("executive summary");
      expect(prompt.toLowerCase()).toContain("entire career");
      expect(prompt).toContain("ZERO CONTRADICTIONS");
      expect(prompt).toContain("Full resume content here...");
    });

    it("includes preference lever instructions when preferences are provided", () => {
      const prompt = getHolisticSummaryPrompt({
        assembledResume: "Resume content",
        jobDescription: "Job description",
        preferences: {
          intensity: "targeted",
          metricsMode: "placeholders",
          seniorityLevel: "senior",
          sectionsToModify: { summary: true, experience: true, skills: true },
        },
      });

      expect(prompt).toContain("SENIORITY FRAMING — SENIOR / STAFF");
      expect(prompt).toContain("TRANSFORMATION SCOPE — TARGETED");
    });
  });

  describe("POST /api/agent/synthesize-summary", () => {
    it("synthesizes summary via POST /api/agent/synthesize-summary", async () => {
      vi.mocked(generateWithFallback).mockResolvedValueOnce({
        text: "Lead Cloud Architect with 9+ years architecting fault-tolerant distributed platforms. Led engineering teams scaling high-throughput microservices. Expert in TypeScript, Kubernetes, and cloud database optimization.",
        modelUsed: "gemini-1.5-flash",
      });

      const req = new Request("http://localhost:3000/api/agent/synthesize-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assembledResume: "John Doe\nExperience:\n- Google Architect\n- Chapman Engineer",
          jobDescription: "Staff Cloud Engineer",
          jobTitle: "Staff Cloud Engineer",
          userRequestedKeywords: ["Kubernetes", "TypeScript", "Python"],
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.summaryText).toContain("Lead Cloud Architect");
      expect(json.summaryText.length).toBeGreaterThan(50);
      expect(json.rationale).toBeDefined();
      expect(json.keywords).toEqual(["Kubernetes", "TypeScript"]);
      expect(generateWithFallback).toHaveBeenCalledWith(
        expect.stringContaining("Staff Cloud Engineer"),
        undefined,
        { maxTokens: 400, temperature: 0.2 },
        undefined
      );
    });

    it("passes modelKey and sessionApiKeys to generateWithFallback", async () => {
      vi.mocked(generateWithFallback).mockResolvedValueOnce({
        text: "Seasoned Cloud Architect with proven record in enterprise distributed infrastructure.",
        modelUsed: "gpt-4o",
      });

      const req = new Request("http://localhost:3000/api/agent/synthesize-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assembledResume: "Jane Doe resume",
          jobDescription: "Cloud Architect",
          modelKey: "openai/gpt-4o",
          sessionApiKeys: { openai: "test-key" },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(generateWithFallback).toHaveBeenCalledWith(
        expect.any(String),
        "openai/gpt-4o",
        { maxTokens: 400, temperature: 0.2 },
        { openai: "test-key" }
      );
    });

    it("returns 400 if assembledResume is missing", async () => {
      const req = new Request("http://localhost:3000/api/agent/synthesize-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: "Staff Cloud Engineer",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it("returns 400 if assembledResume is empty whitespace", async () => {
      const req = new Request("http://localhost:3000/api/agent/synthesize-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assembledResume: "   ",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it("handles failure in LLM generation gracefully with 500 error response", async () => {
      vi.mocked(generateWithFallback).mockRejectedValueOnce(new Error("LLM Rate Limit Exceeded"));

      const req = new Request("http://localhost:3000/api/agent/synthesize-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assembledResume: "John Doe resume",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain("LLM Rate Limit Exceeded");
    });
  });
});
