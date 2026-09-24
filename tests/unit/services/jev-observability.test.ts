import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { traceHub } from "@/app/services/observability/traceHub";
import {
  judgeSuggestionWithJev,
  diagnoseChunkWithJev,
  evaluateResumeAlignmentWithJev,
} from "@/app/services/jev";

describe("Jev Telemetry Instrumentation", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    traceHub.clearTraces();
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("records local_fallback span when no API key provided", async () => {
    traceHub.startTrace("trace-jev-1");
    await judgeSuggestionWithJev(
      "Original bullet",
      "Suggested improved bullet point",
      "Target Job Description",
      undefined,
      "trace-jev-1"
    );

    const trace = traceHub.getTrace("trace-jev-1");
    expect(trace?.spans).toHaveLength(1);
    const span = trace?.spans[0];
    expect(span?.type).toBe("jev");
    expect((span?.data as any).mode).toBe("local_fallback");
    expect((span?.data as any).verdict).toBe("accepted");
  });

  it("records rejection span when suggestion is judged unauthentic", async () => {
    traceHub.startTrace("trace-jev-2");
    // Mocking an unauthentic evaluation
    const res = await judgeSuggestionWithJev(
      "Managed databases",
      "Managed 10,000,000 petabytes of data single-handedly with 1000% ROI",
      "Database Administrator role",
      undefined,
      "trace-jev-2"
    );
    expect(res).toBeDefined();
    const trace = traceHub.getTrace("trace-jev-2");
    expect(trace?.jevSummary.totalCalls).toBe(1);
  });

  it("records live_api span with tokens, scores, and accepted verdict when API responds", async () => {
    traceHub.startTrace("trace-jev-live");

    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "jev-system-1",
          usage: { prompt_tokens: 45, completion_tokens: 15, total_tokens: 60 },
          answers: {
            isAuthentic: { type: "noul", noul: 0.95 },
            isBetterThanOriginal: { type: "noul", noul: 0.8 },
            overallImpactScore: { type: "score", score: 4, confidence: 0.9 },
            toneOfVoiceRating: { type: "choice", choice: "strong_authentic" },
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-request-id": "req-jev-123",
          },
        }
      )
    );

    const res = await judgeSuggestionWithJev(
      "Managed databases",
      "Architected fault-tolerant PostgreSQL clusters improving 99.99% uptime",
      "Senior Database Engineer",
      "test-api-key",
      "trace-jev-live"
    );

    expect(res.isAuthentic).toBe(true);
    const trace = traceHub.getTrace("trace-jev-live");
    expect(trace?.spans).toHaveLength(1);
    const span = trace?.spans[0];
    expect(span?.type).toBe("jev");
    expect((span?.data as any).mode).toBe("live_api");
    expect((span?.data as any).verdict).toBe("accepted");
    expect((span?.data as any).operation).toBe("judgeSuggestion");
    expect(trace?.jevSummary.liveCalls).toBe(1);
    expect(trace?.jevSummary.accepted).toBe(1);
  });

  it("records rejection verdict and rationale when API marks suggestion unauthentic", async () => {
    traceHub.startTrace("trace-jev-unauth");

    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "jev-system-1",
          answers: {
            isAuthentic: { type: "noul", noul: 0.1 }, // < 0.35 => false
            isBetterThanOriginal: { type: "noul", noul: 0.9 },
            overallImpactScore: { type: "score", score: 4 },
            toneOfVoiceRating: { type: "choice", choice: "buzzword_heavy" },
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );

    const res = await judgeSuggestionWithJev(
      "Managed databases",
      "Invented quantum databases with 5000% speedup",
      "Database Engineer",
      "test-api-key",
      "trace-jev-unauth"
    );

    expect(res.isAuthentic).toBe(false);
    const trace = traceHub.getTrace("trace-jev-unauth");
    expect(trace?.spans).toHaveLength(1);
    const span = trace?.spans[0];
    expect((span?.data as any).verdict).toBe("rejected");
    expect((span?.data as any).rejectionReason).toContain("isAuthentic=false");
    expect(trace?.jevSummary.rejected).toBe(1);
  });

  it("records diagnoseChunk telemetry spans with TraceHub", async () => {
    traceHub.startTrace("trace-jev-diag");

    await diagnoseChunkWithJev(
      { title: "Senior Developer", company: "Acme", bulletsText: "Led engineering" },
      "Staff Engineer requiring distributed systems",
      "Staff Engineer",
      undefined,
      "trace-jev-diag"
    );

    const trace = traceHub.getTrace("trace-jev-diag");
    expect(trace?.spans).toHaveLength(1);
    const span = trace?.spans[0];
    expect(span?.type).toBe("jev");
    expect((span?.data as any).operation).toBe("diagnoseChunk");
    expect((span?.data as any).mode).toBe("local_fallback");
    expect(span?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("records evaluateResumeAlignment telemetry spans with TraceHub", async () => {
    traceHub.startTrace("trace-jev-align");

    await evaluateResumeAlignmentWithJev(
      "Experienced Node and React engineer",
      "Looking for Node React developer",
      undefined,
      "trace-jev-align"
    );

    const trace = traceHub.getTrace("trace-jev-align");
    expect(trace?.spans).toHaveLength(1);
    const span = trace?.spans[0];
    expect(span?.type).toBe("jev");
    expect((span?.data as any).operation).toBe("evaluateAlignment");
    expect((span?.data as any).mode).toBe("local_fallback");
  });

  it("handles untraced calls gracefully without error when traceId is not provided", async () => {
    const res = await judgeSuggestionWithJev(
      "Original bullet",
      "Suggested improved bullet point",
      "Target Job Description"
    );
    expect(res.isAuthentic).toBe(true);
  });
});
