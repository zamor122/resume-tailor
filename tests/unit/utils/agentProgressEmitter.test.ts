import { describe, it, expect, vi } from "vitest";
import {
  emitAgentProgress,
  runWithProgressEmitter,
  type AgentProgressEvent,
} from "@/app/utils/agentProgressEmitter";

describe("agentProgressEmitter", () => {
  it("forwards live tool progress events inside runWithProgressEmitter", async () => {
    const listener = vi.fn<(event: AgentProgressEvent) => void>();

    const result = await runWithProgressEmitter(listener, async () => {
      emitAgentProgress({
        step: "intake",
        tool: "Resume Extractor",
        message: "Extracting sections and dates from your resume...",
        progress: 14,
      });

      await Promise.resolve();

      emitAgentProgress({
        step: "keyword_analysis",
        tool: "Keyword & Gap Analyzer",
        message: "Comparing resume keywords against role requirements...",
        progress: 34,
      });

      return "done";
    });

    expect(result).toBe("done");
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, {
      step: "intake",
      tool: "Resume Extractor",
      message: "Extracting sections and dates from your resume...",
      progress: 14,
    });
    expect(listener).toHaveBeenNthCalledWith(2, {
      step: "keyword_analysis",
      tool: "Keyword & Gap Analyzer",
      message: "Comparing resume keywords against role requirements...",
      progress: 34,
    });
  });

  it("no-ops safely when emitAgentProgress is called outside an active listener", () => {
    expect(() =>
      emitAgentProgress({
        step: "intake",
        tool: "Resume Extractor",
        message: "Running standalone unit test...",
        progress: 10,
      })
    ).not.toThrow();
  });
});
