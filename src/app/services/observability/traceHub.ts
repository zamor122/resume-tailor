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
