import { AsyncLocalStorage } from "node:async_hooks";

export interface AgentProgressEvent {
  step: string;
  tool?: string;
  message: string;
  progress: number;
}

type ProgressListener = (event: AgentProgressEvent) => void;

const progressStorage = new AsyncLocalStorage<ProgressListener>();

/**
 * Runs an async workflow while forwarding every `emitAgentProgress` call
 * inside its async context to `listener` (used by SSE streaming).
 */
export function runWithProgressEmitter<T>(
  listener: ProgressListener,
  fn: () => Promise<T>
): Promise<T> {
  return progressStorage.run(listener, fn);
}

/**
 * Emits a live step/tool progress update if executing inside an active
 * `runWithProgressEmitter` context; silently no-ops in tests or batch evals.
 */
export function emitAgentProgress(event: AgentProgressEvent): void {
  try {
    const listener = progressStorage.getStore();
    if (listener) {
      listener(event);
    }
  } catch {
    // Never let telemetry/progress emission interrupt pipeline execution
  }
}
