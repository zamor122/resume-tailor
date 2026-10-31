import { describe, it, expect, beforeEach } from "vitest";
import { traceHub } from "@/app/services/observability/traceHub";

describe("TraceHub Singleton", () => {
  beforeEach(() => {
    traceHub.clearTraces();
  });

  it("creates and retrieves an active trace", () => {
    const trace = traceHub.startTrace("test-trace-1", { sessionId: "sess-1", userId: "user-1" });
    expect(trace.traceId).toBe("test-trace-1");
    expect(trace.status).toBe("running");
    expect(trace.spans).toEqual([]);

    const retrieved = traceHub.getTrace("test-trace-1");
    expect(retrieved).toBeDefined();
    expect(retrieved?.traceId).toBe("test-trace-1");
  });

  it("records spans and updates aggregate metrics", () => {
    traceHub.startTrace("test-trace-2");
    traceHub.recordSpan("test-trace-2", {
      id: "span-1",
      type: "jev",
      name: "judgeSuggestionWithJev",
      timestamp: new Date().toISOString(),
      durationMs: 120,
      data: {
        operation: "judgeSuggestion",
        target: "Job 0 Bullet 1",
        mode: "live_api",
        latencyMs: 120,
        verdict: "accepted",
        scores: { isAuthentic: true, overallImpactScore: 4 },
      },
    });

    const trace = traceHub.getTrace("test-trace-2");
    expect(trace?.spans).toHaveLength(1);
    expect(trace?.jevSummary.totalCalls).toBe(1);
    expect(trace?.jevSummary.liveCalls).toBe(1);
    expect(trace?.jevSummary.accepted).toBe(1);
    expect(trace?.jevSummary.avgLatencyMs).toBe(120);
  });

  it("records llm spans and calculates token and latency aggregates", () => {
    traceHub.startTrace("test-trace-llm");
    traceHub.recordSpan("test-trace-llm", {
      id: "span-llm-1",
      type: "llm",
      name: "generateDraft",
      timestamp: new Date().toISOString(),
      durationMs: 200,
      data: {
        provider: "gemini",
        model: "gemini-1.5-pro",
        latencyMs: 200,
        tokens: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        retries: 0,
        fallbackTriggered: false,
      },
    });
    traceHub.recordSpan("test-trace-llm", {
      id: "span-llm-2",
      type: "llm",
      name: "generateDraftFallback",
      timestamp: new Date().toISOString(),
      durationMs: 400,
      data: {
        provider: "fallback",
        model: "mock-fallback",
        latencyMs: 400,
        tokens: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
        retries: 1,
        fallbackTriggered: true,
      },
    });

    const trace = traceHub.getTrace("test-trace-llm");
    expect(trace?.spans).toHaveLength(2);
    expect(trace?.llmSummary.totalCalls).toBe(2);
    expect(trace?.llmSummary.totalTokens).toBe(225);
    expect(trace?.llmSummary.fallbacksCount).toBe(1);
    expect(trace?.llmSummary.avgLatencyMs).toBe(300);
  });

  it("records and updates chunk audits", () => {
    traceHub.startTrace("test-trace-chunk");
    traceHub.recordChunkAudit("test-trace-chunk", {
      jobIndex: 0,
      company: "Acme Corp",
      role: "Engineer",
      originalBulletsCount: 3,
      suggestionsCount: 3,
      satisfiesMinEdit: true,
      appliedFallback: false,
    });

    let trace = traceHub.getTrace("test-trace-chunk");
    expect(trace?.chunkAudits).toHaveLength(1);
    expect(trace?.chunkAudits[0].company).toBe("Acme Corp");

    // Overwrite for same jobIndex
    traceHub.recordChunkAudit("test-trace-chunk", {
      jobIndex: 0,
      company: "Acme Corp Updated",
      role: "Senior Engineer",
      originalBulletsCount: 3,
      suggestionsCount: 3,
      satisfiesMinEdit: true,
      appliedFallback: false,
    });

    trace = traceHub.getTrace("test-trace-chunk");
    expect(trace?.chunkAudits).toHaveLength(1);
    expect(trace?.chunkAudits[0].company).toBe("Acme Corp Updated");
  });

  it("ends trace and transitions to completedBuffer with duration and status", () => {
    traceHub.startTrace("test-trace-end");
    const ended = traceHub.endTrace("test-trace-end", "error", "Simulated failure");

    expect(ended).toBeDefined();
    expect(ended?.status).toBe("error");
    expect(ended?.error).toBe("Simulated failure");
    expect(ended?.endTime).toBeDefined();
    expect(ended?.totalDurationMs).toBeGreaterThanOrEqual(0);

    const retrieved = traceHub.getTrace("test-trace-end");
    expect(retrieved).toBeDefined();
    expect(retrieved?.status).toBe("error");
  });

  it("caps in-memory buffer at 100 traces", () => {
    for (let i = 0; i < 110; i++) {
      traceHub.startTrace(`trace-${i}`);
      traceHub.endTrace(`trace-${i}`, "completed");
    }
    const recent = traceHub.getRecentTraces(200);
    expect(recent.length).toBe(100);
    expect(recent[0].traceId).toBe("trace-109");
  });
});
