import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChangedAndWhy from "@/app/components/ChangedAndWhy";
import ResumeSuggestionReviewer from "@/app/components/ResumeSuggestionReviewer";
import type { ResumeSuggestion } from "@/app/agent/state";

vi.mock("@/app/contexts/GamificationContext", () => ({
  useGamification: () => ({
    playSfx: vi.fn(),
    awardXp: vi.fn(),
  }),
}));

vi.mock("@/app/services/analytics", () => ({
  analytics: {
    events: {
      SUGGESTION_KEYWORD_REACTION: "suggestion_keyword_reaction",
    },
    getTrackingContext: () => ({ page: "/resume/test" }),
    trackEvent: vi.fn(),
  },
}));

describe("Missing JD keyword awareness & reactions", () => {
  const suggestionWithAddedKeywords: ResumeSuggestion = {
    id: "sug-job-0-bullet-2",
    section: "FreightPulse Systems – Senior Software Engineer",
    originalText: "Maintained 99.4% service availability across core REST endpoints.",
    suggestedText:
      "Maintained 99.4% service availability supporting CI/CD deployment gates and HIPAA compliance practices.",
    reason: "Aligned reliability experience with target posting compliance keywords",
    keywords: ["CI/CD", "HIPAA"],
    addedMissingKeywords: ["CI/CD", "HIPAA"],
    status: "accepted",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }) as any;
  });

  it("displays explicit added-keyword callout in ChangedAndWhy and captures helpful/not_helpful reactions", () => {
    const onSuggestionsChange = vi.fn();

    render(
      <ChangedAndWhy
        suggestions={[suggestionWithAddedKeywords]}
        originalResume="Backend engineer using REST endpoints."
        resumeId="res-123"
        sessionId="sess-123"
        onSuggestionsChange={onSuggestionsChange}
      />
    );

    expect(screen.getByTestId("added-keyword-callout")).toBeInTheDocument();
    expect(screen.getByText("+CI/CD")).toBeInTheDocument();
    expect(screen.getByText("+HIPAA")).toBeInTheDocument();
    expect(screen.getByText(/didn’t have/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /👍 Helpful/i }));
    expect(onSuggestionsChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: "sug-job-0-bullet-2", reaction: "helpful" }),
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/resume/suggestion-reaction",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("displays added-keyword awareness and captures Not helpful reaction in ResumeSuggestionReviewer", () => {
    const onSuggestionsChange = vi.fn();

    render(
      <ResumeSuggestionReviewer
        originalResume="Backend engineer using REST endpoints."
        suggestions={[suggestionWithAddedKeywords]}
        resumeId="res-123"
        sessionId="sess-123"
        onSuggestionsChange={onSuggestionsChange}
      />
    );

    expect(screen.getByTestId("added-keyword-callout")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Not helpful/i }));

    expect(onSuggestionsChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: "sug-job-0-bullet-2", reaction: "not_helpful" }),
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/resume/suggestion-reaction",
      expect.objectContaining({ method: "POST" })
    );
  });
});
