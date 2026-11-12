/**
 * Langfuse tracing — a deliberately dependency-free client.
 *
 * WHY NOT THE SDK: the official Langfuse JS SDK pulls in OpenTelemetry, and this app runs a mix
 * of `runtime = "nodejs"` (the tailoring stream) and `runtime = "edge"` (the free-tool routes)
 * that share the same model choke point. A plain `fetch` to the ingestion API works in both,
 * adds no bundle weight to a function we are trying to keep under a 60s budget, and avoids a
 * cold-start penalty. The integration surface is tiny, so hand-rolling it is cheaper than the dep.
 *
 * DESIGN: env-gated and SILENT when unconfigured. With no keys this module is a no-op — the app
 * behaves exactly as before, so shipping it is risk-free before the keys exist.
 *
 * SERVERLESS PITFALL: route handlers exit before any batched telemetry ships. Callers MUST
 * `await flushLangfuse()` before returning (the tailoring route does).
 */

const INGEST_PATH = "/api/public/ingestion";

type EventType = "trace-create" | "generation-create" | "span-create";

interface IngestEvent {
  id: string;
  type: EventType;
  timestamp: string;
  body: Record<string, unknown>;
}

let buffer: IngestEvent[] = [];

/**
 * The trace currently being served. One tailoring run executes entirely inside one serverless
 * invocation, so a module-level correlation is accurate here and avoids threading a traceId
 * through every LangGraph node and provider call.
 */
let currentTraceId: string | null = null;

export function setCurrentLangfuseTrace(id: string | null): void {
  currentTraceId = id;
}

export function currentLangfuseTrace(): string | null {
  return currentTraceId;
}

function cfg() {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY?.trim();
  const secretKey = process.env.LANGFUSE_SECRET_KEY?.trim();
  const host = (process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASEURL || "https://cloud.langfuse.com")
    .trim()
    .replace(/\/$/, "");
  return { publicKey, secretKey, host };
}

export function langfuseEnabled(): boolean {
  const { publicKey, secretKey } = cfg();
  return !!publicKey && !!secretKey;
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

/** Open a trace for one user-visible run. Returns the traceId (always — so callers never branch). */
export function startLangfuseTrace(input: {
  name: string;
  traceId?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}): string {
  const traceId = input.traceId || newId();
  if (!langfuseEnabled()) return traceId;
  buffer.push({
    id: newId(),
    type: "trace-create",
    timestamp: new Date().toISOString(),
    body: {
      id: traceId,
      name: input.name,
      userId: input.userId,
      sessionId: input.sessionId,
      metadata: input.metadata,
    },
  });
  return traceId;
}

/** Close a trace with its outcome. */
export function endLangfuseTrace(
  traceId: string,
  outcome: { output?: unknown; status?: "completed" | "error"; error?: string; metadata?: Record<string, unknown> }
): void {
  if (!langfuseEnabled()) return;
  buffer.push({
    id: newId(),
    type: "trace-create",
    timestamp: new Date().toISOString(),
    body: {
      id: traceId,
      output: outcome.output,
      metadata: { ...(outcome.metadata || {}), status: outcome.status, error: outcome.error },
    },
  });
}

/**
 * Record ONE model call. This is the money observation — it carries the model actually used,
 * the raw prompt and completion, latency, token usage, and whether a fallback happened. That
 * combination is exactly what was missing when diagnosing why a node took 18s in production.
 */
export function recordLangfuseGeneration(input: {
  traceId: string;
  name: string;
  model: string;
  prompt: string;
  completion?: string;
  startTime: number;
  endTime: number;
  usage?: { input?: number; output?: number; total?: number };
  level?: "DEFAULT" | "WARNING" | "ERROR";
  metadata?: Record<string, unknown>;
}): void {
  if (!langfuseEnabled()) return;
  const prompt = typeof input.prompt === "string" ? input.prompt : String(input.prompt);
  buffer.push({
    id: newId(),
    type: "generation-create",
    timestamp: new Date().toISOString(),
    body: {
      id: newId(),
      traceId: input.traceId,
      name: input.name,
      model: input.model,
      startTime: new Date(input.startTime).toISOString(),
      endTime: new Date(input.endTime).toISOString(),
      // Cap payloads: the raw prompt can be several KB and the free tier bills per unit.
      input: prompt.length > 8000 ? `${prompt.slice(0, 8000)}…[truncated]` : prompt,
      output: typeof input.completion === "string" && input.completion.length > 8000
        ? `${input.completion.slice(0, 8000)}…[truncated]`
        : input.completion,
      usage: input.usage,
      level: input.level || "DEFAULT",
      metadata: input.metadata,
    },
  });
}

/** Ship everything buffered. MUST be awaited before a serverless handler returns. */
export async function flushLangfuse(): Promise<void> {
  const { publicKey, secretKey, host } = cfg();
  if (!publicKey || !secretKey) return;
  if (buffer.length === 0) return;

  const batch = buffer;
  buffer = [];

  try {
    const res = await fetch(`${host}${INGEST_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${publicKey}:${secretKey}`)}`,
      },
      body: JSON.stringify({ batch }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn(`[Langfuse] ingestion failed: ${res.status}`);
    }
  } catch (e) {
    // Never let telemetry break a user request — drop the batch and continue.
    console.warn("[Langfuse] ingestion error (dropped):", e instanceof Error ? e.message : e);
  }
}

/** Test/ops helper. */
export function _bufferSize(): number {
  return buffer.length;
}
