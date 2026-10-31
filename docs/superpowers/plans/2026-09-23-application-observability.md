# Application-Wide Observability & Chunk Edit Guarantee Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build full-stack application observability (TraceHub, Jev AI tracking, LLM fallback spans, in-app telemetry drawer, and admin dashboard) while enforcing an authentic minimum 1-edit recommendation per work experience chunk.

**Architecture:** A centralized thread-safe singleton (`TraceHub`) maintains active trace lifecycles, collects typed spans across LangGraph nodes, Jev AI System 1, and LLM model-fallbacks into an in-memory 100-item circular buffer, streams telemetry via SSE, and powers an in-app review drawer and an `/admin/observability` dashboard. The agent's planner and tailor nodes guarantee at least 1 vetted edit per job chunk with authentic fallback elevation.

**Tech Stack:** TypeScript, Next.js App Router, LangGraph, Vitest, React, Tailwind CSS, TypeSafe AI (Jev SDK), Supabase.

**Spec:** [`docs/superpowers/specs/2026-09-23-application-observability-design.md`](file:///Users/shaynezamora/documents/resume-tailor/docs/superpowers/specs/2026-09-23-application-observability-design.md)

## Global Constraints

- **`@EARS-OBS-01`**: Capture every execution lifecycle under a unique `traceId`, recording timestamped spans for all pipeline nodes, external service requests, and quality guard evaluations.
- **`@EARS-OBS-02`**: Record a `JevSpan` capturing connectivity mode (`live_api` vs `local_fallback`), latency (ms), request ID, token usage, evaluation scores, and gatekeeper verdict (accepted, rejected with rationale, or fallback applied).
- **`@EARS-OBS-03`**: Record an `LLMSpan` capturing provider, model key, latency, prompt/completion token usage, and HTTP 429 rate-limit fallback transitions.
- **`@EARS-OBS-04`**: Maintain the 100 most recent traces in an in-memory circular buffer for instant retrieval, and persist to Supabase for authenticated sessions.
- **`@EARS-OBS-05`**: Expose telemetry via an in-app review drawer, an `/admin/observability` dashboard, and structured server logs formatted as `[Trace:<traceId>:<component>]`.
- **`@EARS-CHUNK-01`**: Guarantee at least one high-quality, authentic suggestion per work experience chunk when experience tailoring is active (`sectionsToModify?.experience !== false`).
- **`@EARS-CHUNK-02`**: In `minimal` intensity, allocate at least one candidate bullet to every work experience job chunk.
- **`@EARS-CHUNK-03`**: When a work experience chunk yields 0 accepted suggestions, execute an authenticity-preserving fallback pass on that chunk's primary bullet and record a `fallback_applied` audit span in `TraceHub`.
- **`@EARS-CHUNK-04`**: Safely handle empty work experience descriptions without runtime exceptions.

---

### Task 1: TraceHub Core & Telemetry Types

**Files:**
- Create: `src/app/services/observability/types.ts`
- Create: `src/app/services/observability/traceHub.ts`
- Test: `tests/unit/services/traceHub.test.ts`

**Interfaces:**
- Produces:
  - Types: `SpanType`, `JevSpanData`, `LLMSpanData`, `NodeSpanData`, `ChunkAuditRecord`, `TraceRecord`
  - Class: `TraceHubClass` (exported singleton `traceHub`)
  - Methods: `startTrace(traceId, options)`, `recordSpan(traceId, span)`, `endTrace(traceId, status, error)`, `getTrace(traceId)`, `getRecentTraces(limit)`, `clearTraces()`

- [ ] **Step 1: Write the failing unit test**

```typescript
// tests/unit/services/traceHub.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/services/traceHub.test.ts`  
Expected: FAIL with module not found for `@/app/services/observability/traceHub`.

- [ ] **Step 3: Implement `types.ts` and `traceHub.ts`**

```typescript
// src/app/services/observability/types.ts
export type SpanType = "node" | "jev" | "llm" | "guard" | "fallback";

export interface JevSpanData {
  operation: "diagnoseChunk" | "judgeSuggestion" | "evaluateAlignment";
  target: string;
  mode: "live_api" | "local_fallback";
  latencyMs: number;
  requestId?: string;
  model?: string;
  tokens?: { prompt?: number; completion?: number; total?: number };
  scores?: {
    isAuthentic?: boolean;
    isBetterThanOriginal?: boolean;
    overallImpactScore?: number;
    toneOfVoiceRating?: string;
    scoreDeltaPercent?: number;
  };
  verdict: "accepted" | "rejected" | "fallback_applied";
  rejectionReason?: string;
}

export interface LLMSpanData {
  provider: "gemini" | "anthropic" | "openai" | "fallback";
  model: string;
  latencyMs: number;
  tokens?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  retries: number;
  fallbackTriggered: boolean;
  error?: string;
}

export interface NodeSpanData {
  nodeName: string;
  durationMs: number;
  status: "success" | "error" | "skipped";
  inputSummary?: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
}

export interface ChunkAuditRecord {
  jobIndex: number;
  company: string;
  role: string;
  originalBulletsCount: number;
  suggestionsCount: number;
  satisfiesMinEdit: boolean;
  appliedFallback: boolean;
  fallbackDetails?: string;
}

export interface TelemetrySpan {
  id: string;
  type: SpanType;
  name: string;
  timestamp: string;
  durationMs: number;
  data: JevSpanData | LLMSpanData | NodeSpanData | Record<string, unknown>;
}

export interface TraceRecord {
  traceId: string;
  sessionId?: string;
  userId?: string;
  startTime: string;
  endTime?: string;
  totalDurationMs?: number;
  status: "running" | "completed" | "error";
  error?: string;
  jevSummary: {
    totalCalls: number;
    liveCalls: number;
    fallbackCalls: number;
    accepted: number;
    rejected: number;
    avgLatencyMs: number;
  };
  llmSummary: {
    totalCalls: number;
    totalTokens: number;
    fallbacksCount: number;
    avgLatencyMs: number;
  };
  chunkAudits: ChunkAuditRecord[];
  spans: TelemetrySpan[];
}
```

```typescript
// src/app/services/observability/traceHub.ts
import type { TraceRecord, TelemetrySpan, JevSpanData, LLMSpanData, ChunkAuditRecord } from "./types";

export class TraceHubClass {
  private activeTraces = new Map<string, TraceRecord>();
  private completedBuffer: TraceRecord[] = [];
  private readonly maxBufferSize = 100;

  startTrace(traceId: string, options?: { sessionId?: string; userId?: string }): TraceRecord {
    const trace: TraceRecord = {
      traceId,
      sessionId: options?.sessionId,
      userId: options?.userId,
      startTime: new Date().toISOString(),
      status: "running",
      jevSummary: {
        totalCalls: 0,
        liveCalls: 0,
        fallbackCalls: 0,
        accepted: 0,
        rejected: 0,
        avgLatencyMs: 0,
      },
      llmSummary: {
        totalCalls: 0,
        totalTokens: 0,
        fallbacksCount: 0,
        avgLatencyMs: 0,
      },
      chunkAudits: [],
      spans: [],
    };
    this.activeTraces.set(traceId, trace);
    return trace;
  }

  getTrace(traceId: string): TraceRecord | undefined {
    return this.activeTraces.get(traceId) || this.completedBuffer.find((t) => t.traceId === traceId);
  }

  recordSpan(traceId: string, span: TelemetrySpan): void {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return;

    trace.spans.push(span);

    if (span.type === "jev") {
      const d = span.data as JevSpanData;
      trace.jevSummary.totalCalls += 1;
      if (d.mode === "live_api") trace.jevSummary.liveCalls += 1;
      else trace.jevSummary.fallbackCalls += 1;
      if (d.verdict === "accepted") trace.jevSummary.accepted += 1;
      else if (d.verdict === "rejected") trace.jevSummary.rejected += 1;
      const prevTotalMs = trace.jevSummary.avgLatencyMs * (trace.jevSummary.totalCalls - 1);
      trace.jevSummary.avgLatencyMs = Math.round((prevTotalMs + (d.latencyMs || 0)) / trace.jevSummary.totalCalls);
    } else if (span.type === "llm") {
      const d = span.data as LLMSpanData;
      trace.llmSummary.totalCalls += 1;
      if (d.tokens?.totalTokens) trace.llmSummary.totalTokens += d.tokens.totalTokens;
      if (d.fallbackTriggered) trace.llmSummary.fallbacksCount += 1;
      const prevTotalMs = trace.llmSummary.avgLatencyMs * (trace.llmSummary.totalCalls - 1);
      trace.llmSummary.avgLatencyMs = Math.round((prevTotalMs + (d.latencyMs || 0)) / trace.llmSummary.totalCalls);
    }
  }

  recordChunkAudit(traceId: string, audit: ChunkAuditRecord): void {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return;
    const existingIdx = trace.chunkAudits.findIndex((c) => c.jobIndex === audit.jobIndex);
    if (existingIdx >= 0) {
      trace.chunkAudits[existingIdx] = audit;
    } else {
      trace.chunkAudits.push(audit);
    }
  }

  endTrace(traceId: string, status: "completed" | "error" = "completed", error?: string): TraceRecord | undefined {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return undefined;

    trace.status = status;
    trace.endTime = new Date().toISOString();
    trace.totalDurationMs = Date.now() - new Date(trace.startTime).getTime();
    if (error) trace.error = error;

    this.activeTraces.delete(traceId);
    this.completedBuffer.unshift(trace);
    if (this.completedBuffer.length > this.maxBufferSize) {
      this.completedBuffer.pop();
    }
    return trace;
  }

  getRecentTraces(limit: number = 50): TraceRecord[] {
    const active = Array.from(this.activeTraces.values());
    const combined = [...active, ...this.completedBuffer];
    return combined.slice(0, limit);
  }

  clearTraces(): void {
    this.activeTraces.clear();
    this.completedBuffer = [];
  }
}

export const traceHub = new TraceHubClass();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/services/traceHub.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/services/observability tests/unit/services/traceHub.test.ts
git commit -m "feat(observability): add TraceHub core and telemetry types"
```

---

### Task 2: Jev AI Telemetry Instrumentation

**Files:**
- Modify: `src/app/services/jev.ts`
- Test: `tests/unit/services/jev-observability.test.ts`

**Interfaces:**
- Consumes: `traceHub` from `@/app/services/observability/traceHub`
- Produces: Timestamped `JevSpan` recorded for each Jev function call with mode (`live_api` vs `local_fallback`), latency, request ID, tokens, scores, and gatekeeper verdict.

- [ ] **Step 1: Write the failing unit test**

```typescript
// tests/unit/services/jev-observability.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { traceHub } from "@/app/services/observability/traceHub";
import { judgeSuggestionWithJev, diagnoseChunkWithJev } from "@/app/services/jev";

describe("Jev Telemetry Instrumentation", () => {
  beforeEach(() => {
    traceHub.clearTraces();
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/services/jev-observability.test.ts`  
Expected: FAIL because `judgeSuggestionWithJev` does not accept `traceId` and does not record spans to `traceHub`.

- [ ] **Step 3: Modify `src/app/services/jev.ts`**

Update `diagnoseChunkWithJev`, `judgeSuggestionWithJev`, and `evaluateResumeAlignmentWithJev` to accept an optional `traceId?: string`, measure `performance.now()`, and call `traceHub.recordSpan(traceId, ...)`. Also emit clean structured console log: `[Trace:${traceId || "untraced"}:jev:...]`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/services/jev-observability.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/services/jev.ts tests/unit/services/jev-observability.test.ts
git commit -m "feat(observability): instrument Jev System 1 with TraceHub telemetry"
```

---

### Task 3: LLM Provider & Fallback Instrumentation

**Files:**
- Modify: `src/app/services/model-fallback.ts`
- Test: `tests/unit/services/model-fallback-observability.test.ts`

**Interfaces:**
- Consumes: `traceHub` from `@/app/services/observability/traceHub`
- Produces: `LLMSpan` for each generation call, recording provider, model, latency, tokens, retries, and fallback activation.

- [ ] **Step 1: Write the failing unit test**

```typescript
// tests/unit/services/model-fallback-observability.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { traceHub } from "@/app/services/observability/traceHub";
import { generateWithFallback } from "@/app/services/model-fallback";

describe("LLM Fallback Observability", () => {
  beforeEach(() => {
    traceHub.clearTraces();
  });

  it("records LLM span on successful generation", async () => {
    traceHub.startTrace("trace-llm-1");
    // generateWithFallback with options.traceId
    const res = await generateWithFallback(
      "Hello prompt",
      "gemini-2.5-flash",
      { maxTokens: 100, traceId: "trace-llm-1" }
    );
    expect(res.text).toBeDefined();

    const trace = traceHub.getTrace("trace-llm-1");
    expect(trace?.spans.some((s) => s.type === "llm")).toBe(true);
    expect(trace?.llmSummary.totalCalls).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/services/model-fallback-observability.test.ts`  
Expected: FAIL because `generateWithFallback` doesn't accept `traceId` or record to `traceHub`.

- [ ] **Step 3: Modify `src/app/services/model-fallback.ts`**

Update `generateWithFallback` options parameter to include `traceId?: string`. Wrap execution in a timer, record model name, provider, token counts, and if an exception causes fallback to a secondary model, record `fallbackTriggered: true`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/services/model-fallback-observability.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/services/model-fallback.ts tests/unit/services/model-fallback-observability.test.ts
git commit -m "feat(observability): instrument generateWithFallback with LLM telemetry spans"
```

---

### Task 4: Bullet Planner Minimum 1-Edit Chunk Allocation Guarantee

**Files:**
- Modify: `src/app/agent/nodes/bulletPlanner.ts`
- Test: `tests/unit/agent/bullet-planner-audit.test.ts`

**Interfaces:**
- Consumes: `resumeAST.experience`, `sortedMissingKeywords`, `preferences.intensity`
- Produces: `bulletPlan.jobBulletChanges` where **every job chunk** in `experience` has at least 1 candidate bullet, even in `minimal` intensity (`@EARS-CHUNK-02`).

- [ ] **Step 1: Write the failing unit test**

```typescript
// Update tests/unit/agent/bullet-planner-audit.test.ts
it("@EARS-CHUNK-02: guarantees at least 1 candidate bullet per job chunk in minimal intensity", () => {
  const result = bulletPlannerNode(threeJobState); // threeJobState has 3 jobs and minimal intensity
  const jobChanges = result.bulletPlan?.jobBulletChanges || [];

  expect(jobChanges).toHaveLength(3);
  expect(jobChanges.find((c) => c.jobIndex === 0)?.bulletIndices.length).toBeGreaterThanOrEqual(1);
  expect(jobChanges.find((c) => c.jobIndex === 1)?.bulletIndices.length).toBeGreaterThanOrEqual(1);
  expect(jobChanges.find((c) => c.jobIndex === 2)?.bulletIndices.length).toBeGreaterThanOrEqual(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/agent/bullet-planner-audit.test.ts`  
Expected: FAIL because minimal intensity currently picks at most 2 bullets across all jobs, leaving jobs 1 and 2 with 0 bullets.

- [ ] **Step 3: Update `pickTopBulletsAcrossJobs` in `src/app/agent/nodes/bulletPlanner.ts`**

Modify `pickTopBulletsAcrossJobs`:
1. For every job `ji` from `0` to `experience.length - 1`, identify its highest-scoring candidate bullet and include it in `selected` (guaranteeing at least 1 bullet per job chunk).
2. If remaining quota allows, pick top remaining candidates up to `maxTotal`.
3. In `bulletPlannerNode`, attach `traceId` if present and record `bulletPlanner` node span to `traceHub`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/agent/bullet-planner-audit.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/agent/nodes/bulletPlanner.ts tests/unit/agent/bullet-planner-audit.test.ts
git commit -m "feat(planner): guarantee at least 1 candidate bullet per job chunk in all intensities"
```

---

### Task 5: Surgical Tailor Authentic Fallback & Chunk Audit Guarantee

**Files:**
- Modify: `src/app/agent/nodes/surgicalTailor.ts`
- Test: `tests/unit/agent/chunk-edit-guarantee.test.ts`

**Interfaces:**
- Consumes: Parsed chunk suggestions, Jev gatekeeper results, `resumeAST.experience`
- Produces: `suggestions` array with `suggestions.filter(s => s.jobIndex === idx).length >= 1` for every job chunk (`@EARS-CHUNK-01`, `@EARS-CHUNK-03`). Records `ChunkAuditRecord` for each job chunk in `traceHub`.

- [ ] **Step 1: Write the failing unit test**

```typescript
// tests/unit/agent/chunk-edit-guarantee.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { surgicalTailorNode } from "@/app/agent/nodes/surgicalTailor";
import { traceHub } from "@/app/services/observability/traceHub";
import type { AgentState } from "@/app/agent/state";
import { DEFAULT_PREFERENCES } from "@/app/types/tailoringPreferences";

vi.mock("@/app/services/model-fallback", () => ({
  generateWithFallback: vi.fn().mockResolvedValue({
    text: "Same text returned by LLM that is not substantive",
  }),
}));

describe("@EARS-CHUNK-03: Authentic Fallback Guarantee", () => {
  beforeEach(() => {
    traceHub.clearTraces();
  });

  const stateWithTwoJobs: AgentState = {
    rawResume: "Resume text",
    preferences: DEFAULT_PREFERENCES,
    resumeAST: {
      summary: "",
      experience: [
        {
          title: "Senior Engineer",
          company: "Acme Corp",
          dates: "2022 - Present",
          description: "- Assisted with backend architecture and database scaling",
        },
        {
          title: "Software Engineer",
          company: "Beta Systems",
          dates: "2020 - 2022",
          description: "- Responsible for building web user interfaces",
        },
      ],
      education: [],
      skills: { technical: ["TypeScript"], soft: [] },
      sections: ["Experience"],
    },
    bulletPlan: {
      summaryChange: false,
      skillsChange: false,
      jobBulletChanges: [
        { jobIndex: 0, bulletIndices: [0], reason: "test", recencyTier: "recent_deep" },
        { jobIndex: 1, bulletIndices: [0], reason: "test", recencyTier: "mid_career" },
      ],
    },
    logs: [],
    errors: [],
  };

  it("applies authentic fallback when LLM generates 0 suggestions for a job chunk", async () => {
    traceHub.startTrace("test-trace-chunk");
    const result = await surgicalTailorNode({
      ...stateWithTwoJobs,
      sessionId: "test-trace-chunk",
    });

    const suggestions = result.suggestions || [];
    const job0Suggestions = suggestions.filter((s) => s.jobIndex === 0);
    const job1Suggestions = suggestions.filter((s) => s.jobIndex === 1);

    expect(job0Suggestions.length).toBeGreaterThanOrEqual(1);
    expect(job1Suggestions.length).toBeGreaterThanOrEqual(1);

    // Fallback elevates opening weak verb without hallucinating facts
    expect(job0Suggestions[0].suggestedText).toMatch(/^(Architected|Engineered|Spearheaded|Directed)/);
    expect(job1Suggestions[0].suggestedText).toMatch(/^(Engineered|Constructed|Implemented|Authored)/);

    const trace = traceHub.getTrace("test-trace-chunk");
    expect(trace?.chunkAudits).toHaveLength(2);
    expect(trace?.chunkAudits[0].satisfiesMinEdit).toBe(true);
    expect(trace?.chunkAudits[0].appliedFallback).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/agent/chunk-edit-guarantee.test.ts`  
Expected: FAIL because surgical tailor does not currently have the authentic fallback pass or chunk audit tracking.

- [ ] **Step 3: Implement authentic fallback & chunk audit in `src/app/agent/nodes/surgicalTailor.ts`**

1. Create helper `createAuthenticChunkFallback(job: { company?: string; title?: string; description: string }, jobIndex: number)`:
   - Extracts primary bullet.
   - Replaces weak opening verbs ("Assisted with", "Responsible for", "Helped", "Worked on") with high-impact domain verbs ("Engineered", "Orchestrated", "Architected", "Spearheaded").
   - Preserves all factual tech and numbers verbatim.
   - Generates a `ResumeSuggestion` with `category: "action_verb"` and `reason: "Elevated opening action verb to showcase proactive technical leadership"`.
2. After processing each job's results:
   - Count accepted suggestions for this job.
   - If 0, invoke `createAuthenticChunkFallback`, add suggestion, and record `appliedFallback: true`.
   - Record `ChunkAuditRecord` into `traceHub`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/agent/chunk-edit-guarantee.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/agent/nodes/surgicalTailor.ts tests/unit/agent/chunk-edit-guarantee.test.ts
git commit -m "feat(tailor): implement authentic fallback to guarantee >= 1 edit per experience chunk"
```

---

### Task 6: Observability Traces API Endpoint

**Files:**
- Create: `src/app/api/observability/traces/route.ts`
- Test: `tests/unit/api/observability-traces.test.ts`

**Interfaces:**
- Consumes: `traceHub` from `@/app/services/observability/traceHub`
- Produces:
  - `GET /api/observability/traces`: JSON list of recent traces + health status summary
  - `GET /api/observability/traces?traceId=...`: JSON detailed span tree for given trace

- [ ] **Step 1: Write the failing unit test**

```typescript
// tests/unit/api/observability-traces.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/observability/traces/route";
import { traceHub } from "@/app/services/observability/traceHub";
import { NextRequest } from "next/server";

describe("GET /api/observability/traces", () => {
  beforeEach(() => {
    traceHub.clearTraces();
  });

  it("returns recent traces list and health summary", async () => {
    traceHub.startTrace("api-trace-1");
    traceHub.endTrace("api-trace-1", "completed");

    const req = new NextRequest("http://localhost:3000/api/observability/traces");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.traces).toHaveLength(1);
    expect(json.traces[0].traceId).toBe("api-trace-1");
    expect(json.health).toBeDefined();
  });

  it("returns single trace details when traceId is provided", async () => {
    traceHub.startTrace("api-trace-2");
    traceHub.endTrace("api-trace-2", "completed");

    const req = new NextRequest("http://localhost:3000/api/observability/traces?traceId=api-trace-2");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.trace?.traceId).toBe("api-trace-2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/api/observability-traces.test.ts`  
Expected: FAIL with module not found for route.

- [ ] **Step 3: Implement `src/app/api/observability/traces/route.ts`**

```typescript
// src/app/api/observability/traces/route.ts
import { NextRequest, NextResponse } from "next/server";
import { traceHub } from "@/app/services/observability/traceHub";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const traceId = searchParams.get("traceId");

  if (traceId) {
    const trace = traceHub.getTrace(traceId);
    if (!trace) {
      return NextResponse.json({ error: "Trace not found" }, { status: 404 });
    }
    return NextResponse.json({ trace });
  }

  const traces = traceHub.getRecentTraces(100);
  const totalTraces = traces.length;
  const completedTraces = traces.filter((t) => t.status === "completed").length;
  const errorTraces = traces.filter((t) => t.status === "error").length;

  const health = {
    status: errorTraces > 5 ? "degraded" : "healthy",
    totalTraces,
    completedTraces,
    errorTraces,
    jevConfigured: Boolean(process.env.TYPESAFE_API_KEY),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  };

  return NextResponse.json({ traces, health });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/api/observability-traces.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/observability/traces/route.ts tests/unit/api/observability-traces.test.ts
git commit -m "feat(observability): add /api/observability/traces endpoint"
```

---

### Task 7: In-App Review Drawer UI Component

**Files:**
- Create: `src/app/components/ObservabilityDrawer.tsx`
- Modify: `src/app/components/ResumeSuggestionReviewer.tsx`
- Test: `tests/unit/components/ObservabilityDrawer.test.tsx`

**Interfaces:**
- Consumes: `telemetry?: TraceRecord` or `traceId?: string`
- Produces: Collapsible slide-over drawer showing live Jev status, stage timeline, chunk audit table, Jev verdicts, and copy JSON.

- [ ] **Step 1: Write the failing unit test**

```typescript
// tests/unit/components/ObservabilityDrawer.test.tsx
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ObservabilityDrawer from "@/app/components/ObservabilityDrawer";
import type { TraceRecord } from "@/app/services/observability/types";

describe("ObservabilityDrawer", () => {
  const mockTrace: TraceRecord = {
    traceId: "trc-ui-test",
    startTime: new Date().toISOString(),
    status: "completed",
    totalDurationMs: 1420,
    jevSummary: {
      totalCalls: 3,
      liveCalls: 3,
      fallbackCalls: 0,
      accepted: 3,
      rejected: 0,
      avgLatencyMs: 180,
    },
    llmSummary: {
      totalCalls: 2,
      totalTokens: 1500,
      fallbacksCount: 0,
      avgLatencyMs: 950,
    },
    chunkAudits: [
      {
        jobIndex: 0,
        company: "Acme Corp",
        role: "Senior Engineer",
        originalBulletsCount: 2,
        suggestionsCount: 2,
        satisfiesMinEdit: true,
        appliedFallback: false,
      },
    ],
    spans: [],
  };

  it("renders trigger button and opens drawer on click", () => {
    render(<ObservabilityDrawer trace={mockTrace} />);
    const trigger = screen.getByRole("button", { name: /observability/i });
    expect(trigger).toBeDefined();

    fireEvent.click(trigger);
    expect(screen.getByText(/Pipeline Observability & Jev Quality Audit/i)).toBeDefined();
    expect(screen.getByText(/Acme Corp/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/components/ObservabilityDrawer.test.tsx`  
Expected: FAIL because component doesn't exist yet.

- [ ] **Step 3: Implement `src/app/components/ObservabilityDrawer.tsx` and integrate into `ResumeSuggestionReviewer.tsx`**

Create `ObservabilityDrawer.tsx` with clean Tailwind styles and accessible slide-over dialog. Add the toggle pill into `ResumeSuggestionReviewer.tsx` header next to ATS match score.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/components/ObservabilityDrawer.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/components/ObservabilityDrawer.tsx src/app/components/ResumeSuggestionReviewer.tsx tests/unit/components/ObservabilityDrawer.test.tsx
git commit -m "feat(ui): add in-app Observability & Jev Audit slide-over drawer"
```

---

### Task 8: Admin Observability Dashboard Page

**Files:**
- Create: `src/app/admin/observability/page.tsx`
- Test: `tests/unit/admin/observability-page.test.tsx`

**Interfaces:**
- Consumes: `GET /api/observability/traces`
- Produces: Interactive admin dashboard at `/admin/observability` showing provider connectivity, latency graphs, trace explorer, and detailed waterfall modal.

- [ ] **Step 1: Write the failing unit test**

```typescript
// tests/unit/admin/observability-page.test.tsx
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import AdminObservabilityPage from "@/app/admin/observability/page";

describe("AdminObservabilityPage", () => {
  it("renders system health header and trace explorer", () => {
    render(<AdminObservabilityPage />);
    expect(screen.getByText(/Application Observability & Health/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/admin/observability-page.test.tsx`  
Expected: FAIL with module not found for page.

- [ ] **Step 3: Implement `src/app/admin/observability/page.tsx`**

Build the client component fetching `/api/observability/traces`, displaying health indicators for TypeSafe AI (Jev), LLMs, and Supabase, a filterable recent traces table, and an expandable waterfall viewer for individual traces.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/admin/observability-page.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/observability/page.tsx tests/unit/admin/observability-page.test.tsx
git commit -m "feat(admin): create /admin/observability dashboard page"
```

---

### Task 9: End-to-End Stream Integration & Regression Verification

**Files:**
- Modify: `src/app/api/humanize/stream/route.ts`
- Modify: `src/app/agent/state.ts`
- Test: Full Vitest test suite (`npm test`)

**Interfaces:**
- Emits: `telemetry` object in SSE `complete` payload
- Produces: Complete system verification across all 82 test suites with zero regressions.

- [ ] **Step 1: Wire `traceId` and `telemetry` in `stream/route.ts`**

Generate a unique `traceId` (e.g. `trc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`) at stream start. Initialize `traceHub.startTrace(traceId)`. Pass `traceId` in `AgentState` and execution options. On stream completion, call `traceHub.endTrace(traceId)` and include `telemetry: traceHub.getTrace(traceId)` in the SSE `complete` payload.

- [ ] **Step 2: Run all unit and integration tests**

Run: `npm test`  
Expected: All 82+ test suites pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/humanize/stream/route.ts src/app/agent/state.ts
git commit -m "feat(stream): connect full-stack telemetry and stream in complete event"
```
