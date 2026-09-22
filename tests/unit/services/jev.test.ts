import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  diagnoseChunkWithJev,
  judgeSuggestionWithJev,
  evaluateResumeAlignmentWithJev,
} from "@/app/services/jev";

describe("Jev Service Layer (REQ-UBI-01, REQ-ERR-01)", () => {
  const originalEnv = process.env.TYPESAFE_API_KEY;
  const originalUrl = process.env.TYPESAFE_API_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.TYPESAFE_API_KEY;
    } else {
      process.env.TYPESAFE_API_KEY = originalEnv;
    }
    if (originalUrl === undefined) {
      delete process.env.TYPESAFE_API_URL;
    } else {
      process.env.TYPESAFE_API_URL = originalUrl;
    }
    global.fetch = originalFetch;
  });

  it("returns fallback diagnosis when API key is missing or call fails gracefully", async () => {
    delete process.env.TYPESAFE_API_KEY;

    const chunk = {
      title: "Software Engineer",
      company: "Acme",
      bulletsText: "Built web services with React and Node.js.",
    };
    const jd = "Senior Full Stack Engineer requiring React, TypeScript, and AWS cloud architectures.";

    const result = await diagnoseChunkWithJev(chunk, jd, "Senior Full Stack Engineer");
    expect(result).toBeDefined();
    expect(result.seniorityScore).toBeGreaterThanOrEqual(1);
    expect(result.seniorityScore).toBeLessThanOrEqual(5);
    expect([
      "elevate_ownership",
      "clarify_outcomes",
      "highlight_transferable_competencies",
      "showcase_scale",
    ]).toContain(result.enhancementFocus);
  });

  it("returns fallback judge result when API key is missing", async () => {
    delete process.env.TYPESAFE_API_KEY;

    const original = "Assisted team with React features.";
    const suggested = "Engineered responsive React web interfaces improving load times.";
    const jd = "React developer with performance optimization experience.";

    const result = await judgeSuggestionWithJev(original, suggested, jd);
    expect(result).toBeDefined();
    expect(result.isAuthentic).toBe(true);
    expect(result.isBetterThanOriginal).toBe(true);
    expect(result.overallImpactScore).toBeGreaterThanOrEqual(1);
  });

  it("evaluates resume alignment score within 0-100 bounds", async () => {
    delete process.env.TYPESAFE_API_KEY;

    const resume = "Experienced Engineer with TypeScript, React, and Node.js.";
    const jd = "Looking for TypeScript and Node developer.";

    const result = await evaluateResumeAlignmentWithJev(resume, jd);
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.matchScore).toBeLessThanOrEqual(100);
  });

  it("parses valid Jev REST API response correctly for diagnosis", async () => {
    process.env.TYPESAFE_API_KEY = "test-key";

    // Mock global fetch for Jev System 1 endpoint
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        matchedSkills: ["React", "Node.js"],
        missingSkills: ["AWS"],
        seniorityScore: 4,
        enhancementFocus: "elevate_ownership",
        confidence: 0.95,
      }),
    } as any);

    const chunk = {
      title: "Senior Dev",
      company: "Acme",
      bulletsText: "Built cloud services.",
    };
    const result = await diagnoseChunkWithJev(chunk, "AWS cloud role", "Senior Dev");
    expect(result.enhancementFocus).toBe("elevate_ownership");
    expect(result.seniorityScore).toBe(4);
    expect(result.confidence).toBe(0.95);
    expect(result.matchedSkills).toEqual(["React", "Node.js"]);
    expect(result.missingSkills).toEqual(["AWS"]);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.typesafe.ai/v1/systemone",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      })
    );
  });

  it("parses valid Jev REST API response correctly for judge suggestion", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isAuthentic: true,
        contentMatchScore: 5,
        toneOfVoiceRating: "strong_authentic",
        isBetterThanOriginal: true,
        overallImpactScore: 5,
        scoreDeltaPercent: 30,
      }),
    } as any);
    global.fetch = fetchMock;

    const result = await judgeSuggestionWithJev(
      "Old bullet",
      "New bullet with metrics",
      "Job description",
      "override-key"
    );

    expect(result.isAuthentic).toBe(true);
    expect(result.contentMatchScore).toBe(5);
    expect(result.toneOfVoiceRating).toBe("strong_authentic");
    expect(result.isBetterThanOriginal).toBe(true);
    expect(result.overallImpactScore).toBe(5);
    expect(result.scoreDeltaPercent).toBe(30);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.typesafe.ai/v1/systemone",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer override-key",
        }),
      })
    );
  });

  it("parses valid Jev REST API response correctly for resume alignment", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        matchScore: 88,
        confidence: 0.92,
      }),
    } as any);

    const result = await evaluateResumeAlignmentWithJev(
      "Full stack engineer resume",
      "Full stack engineer JD",
      "key-123"
    );

    expect(result.matchScore).toBe(88);
    expect(result.confidence).toBe(0.92);
  });

  it("uses custom TYPESAFE_API_URL when set in environment", async () => {
    process.env.TYPESAFE_API_KEY = "test-key";
    process.env.TYPESAFE_API_URL = "https://custom-proxy.internal/v1/systemone";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        matchedSkills: ["React"],
        missingSkills: [],
        seniorityScore: 3,
        enhancementFocus: "clarify_outcomes",
        confidence: 0.9,
      }),
    } as any);
    global.fetch = fetchMock;

    await diagnoseChunkWithJev(
      { bulletsText: "Built UI in React" },
      "React Engineer",
      "Software Engineer"
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://custom-proxy.internal/v1/systemone",
      expect.anything()
    );
  });

  it("falls back gracefully when API returns HTTP error or throws (REQ-ERR-01)", async () => {
    process.env.TYPESAFE_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as any);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const chunk = {
      title: "Senior Software Engineer",
      company: "Acme",
      bulletsText: "Led engineering teams.",
    };
    const diagResult = await diagnoseChunkWithJev(chunk, "Engineering manager role", "Senior Lead");
    expect(diagResult).toBeDefined();
    expect(diagResult.seniorityScore).toBe(4);
    expect(diagResult.enhancementFocus).toBe("elevate_ownership");

    global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));
    const judgeResult = await judgeSuggestionWithJev("Assisted team", "Engineered scalable cloud services", "jd");
    expect(judgeResult).toBeDefined();
    expect(judgeResult.isBetterThanOriginal).toBe(true);

    const alignResult = await evaluateResumeAlignmentWithJev("resume", "jd");
    expect(alignResult).toBeDefined();
    expect(alignResult.matchScore).toBeGreaterThanOrEqual(0);

    warnSpy.mockRestore();
  });
});
