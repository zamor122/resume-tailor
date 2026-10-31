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
