"use client";

import { useState, useEffect, useRef } from "react";
import { analytics } from "../services/analytics";

interface StreamingResumeViewProps {
  resume: string;
  jobDescription: string;
  sessionId?: string;
  modelKey?: string;
  userId?: string;
  quickDraft?: boolean;
  onComplete?: (data: {
    tailoredResume: string;
    improvementMetrics: any;
    matchScore: { before: number; after: number };
    validationResult: any;
  }) => void;
  onError?: (error: string) => void;
}

export default function StreamingResumeView({
  resume,
  jobDescription,
  sessionId,
  modelKey,
  userId,
  quickDraft = false,
  onComplete,
  onError,
}: StreamingResumeViewProps) {
  const [status, setStatus] = useState<{
    stage: string;
    message: string;
    progress: number;
  }>({
    stage: "initializing",
    message: "Starting...",
    progress: 0,
  });
  const [sections, setSections] = useState<Array<{
    index: number;
    total: number;
    content: string;
    sectionName: string;
  }>>([]);
  const [completeData, setCompleteData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Start streaming
    const startStreaming = async () => {
      try {
        const abortController = new AbortController();
        abortRef.current = abortController;

        const response = await fetch("/api/humanize/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            resume,
            jobDescription,
            sessionId,
            modelKey,
            userId,
            quickDraft,
          }),
        });

        if (!response.ok) {
          let errText = '';
          try {
            errText = await response.text();
          } catch {}
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No reader available");
        }

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              const eventType = line.substring(7).trim();
              continue;
            }

            if (line.startsWith("data: ")) {
              const data = line.substring(6).trim();
              try {
                const parsed = JSON.parse(data);

                if (parsed.stage) {
                  // Status update
                  setStatus({
                    stage: parsed.stage,
                    message: parsed.message || "",
                    progress: parsed.progress || 0,
                  });
                } else if (parsed.index !== undefined) {
                  // Section update
                  setSections((prev) => {
                    const existing = prev.findIndex(
                      (s) => s.index === parsed.index
                    );
                    if (existing >= 0) {
                      const updated = [...prev];
                      updated[existing] = parsed;
                      return updated;
                    }
                    return [...prev, parsed].sort((a, b) => a.index - b.index);
                  });
                } else if (parsed.tailoredResume) {
                  // Complete
                  setCompleteData(parsed);
                  if (onComplete) {
                    onComplete({
                      tailoredResume: parsed.tailoredResume,
                      improvementMetrics: parsed.improvementMetrics,
                      matchScore: parsed.matchScore,
                      validationResult: parsed.validationResult,
                      ...(parsed.contentMap && { contentMap: parsed.contentMap }),
                      ...(parsed.freeReveal && { freeReveal: parsed.freeReveal }),
                      ...(parsed.resumeId && { resumeId: parsed.resumeId }),
                    });
                  }
                } else if (parsed.error) {
                  // Error
                  setError(parsed.error);
                  if (onError) {
                    onError(parsed.error);
                  }
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        // If the request was aborted (e.g., StrictMode double-effect), don't surface as an error.
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      }
    };

    startStreaming();

    // Cleanup
    return () => {
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch {}
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [resume, jobDescription, sessionId, modelKey, userId, quickDraft]);

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <div className="text-red-400 font-semibold">Error</div>
        <div className="text-red-300 text-sm mt-1">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Progress indicator */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-300">
            {status.message}
          </div>
          <div className="text-sm text-gray-400">{status.progress}%</div>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${status.progress}%` }}
          />
        </div>
      </div>

      {/* Streaming sections */}
      {sections.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-300">
            Sections ({sections.length}/{sections[sections.length - 1]?.total || 0})
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {sections.map((section) => (
              <div
                key={section.index}
                className="p-3 bg-gray-800/50 rounded border border-gray-700 animate-pulse"
              >
                <div className="text-xs text-gray-400 mb-1">
                  Section {section.index}: {section.sectionName}
                </div>
                <div className="text-sm text-gray-300 whitespace-pre-wrap">
                  {section.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complete result */}
      {completeData && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="text-green-400 font-semibold mb-2">
            ✓ Resume tailored successfully!
          </div>
          {completeData.matchScore && (
            <div className="text-sm text-gray-300">
              ATS Score: {completeData.matchScore.before} →{" "}
              {completeData.matchScore.after}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

