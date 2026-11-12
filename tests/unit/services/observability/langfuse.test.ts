import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const MODULE = "@/app/services/observability/langfuse";

describe("langfuse observability (env-gated, dependency-free)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("is a SILENT no-op when unconfigured — shipping it cannot change app behaviour", async () => {
    vi.stubEnv("LANGFUSE_PUBLIC_KEY", "");
    vi.stubEnv("LANGFUSE_SECRET_KEY", "");
    const m = await import(MODULE);

    expect(m.langfuseEnabled()).toBe(false);

    const traceId = m.startLangfuseTrace({ name: "tailor-resume", userId: "u1" });
    expect(traceId).toBeTruthy(); // always returns an id so callers never branch

    m.setCurrentLangfuseTrace(traceId);
    m.recordLangfuseGeneration({
      traceId,
      name: "llm.generate",
      model: "gemini:gemini-2.5-flash",
      prompt: "hi",
      completion: "ok",
      startTime: Date.now(),
      endTime: Date.now(),
    });
    m.endLangfuseTrace(traceId, { status: "completed" });

    expect(m._bufferSize()).toBe(0);

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await m.flushLangfuse();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("records one trace, one generation and an outcome, then ships them on flush", async () => {
    vi.stubEnv("LANGFUSE_PUBLIC_KEY", "pk-lf-test");
    vi.stubEnv("LANGFUSE_SECRET_KEY", "sk-lf-test");
    vi.stubEnv("LANGFUSE_HOST", "https://cloud.langfuse.com");

    const fetchMock = vi.fn(async () => new Response("{}", { status: 207 }));
    vi.stubGlobal("fetch", fetchMock);

    const m = await import(MODULE);
    expect(m.langfuseEnabled()).toBe(true);

    const traceId = m.startLangfuseTrace({ name: "tailor-resume", userId: "u1", sessionId: "s1" });
    m.setCurrentLangfuseTrace(traceId);
    m.recordLangfuseGeneration({
      traceId,
      name: "llm.generate",
      model: "gemini:gemini-2.5-flash-lite",
      prompt: "PROMPT",
      completion: "COMPLETION",
      startTime: 1000,
      endTime: 1500,
      usage: { input: 10, output: 20, total: 30 },
    });
    m.endLangfuseTrace(traceId, { status: "completed", output: { suggestions: 3 } });

    expect(m._bufferSize()).toBe(3);
    await m.flushLangfuse();

    expect(m._bufferSize()).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(init.headers && (init.headers as Record<string, string>).Authorization)).toMatch(/^Basic /);
    const body = JSON.parse(String(init.body));
    expect(body.batch).toHaveLength(3);

    const generation = body.batch.find((e: { type: string }) => e.type === "generation-create");
    expect(generation.body.model).toBe("gemini:gemini-2.5-flash-lite");
    expect(generation.body.input).toBe("PROMPT");
    expect(generation.body.output).toBe("COMPLETION");
    expect(generation.body.usage.total).toBe(30);

    // The trace id on the generation must match the trace so the dashboard joins them.
    expect(generation.body.traceId).toBe(traceId);
  });

  it("never throws into the request path when ingestion fails", async () => {
    vi.stubEnv("LANGFUSE_PUBLIC_KEY", "pk");
    vi.stubEnv("LANGFUSE_SECRET_KEY", "sk");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    const m = await import(MODULE);
    m.startLangfuseTrace({ name: "x" });
    await expect(m.flushLangfuse()).resolves.toBeUndefined();
    expect(m._bufferSize()).toBe(0); // batch dropped, not retried forever
  });
});
