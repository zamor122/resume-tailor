import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ResumeSuggestionReviewer from "@/app/components/ResumeSuggestionReviewer";
import type { ResumeSuggestion } from "@/app/agent/state";

describe("ResumeSuggestionReviewer - Unified Step-by-Step Flow", () => {
  const mockSuggestions: ResumeSuggestion[] = [
    {
      id: "sug-1",
      section: "Chapman University – Software Engineer",
      originalText: "Built campus web apps",
      suggestedText: "Engineered high-concurrency student portal serving 10k users",
      reason: "Quantified scale with measurable user metric",
      keywords: ["Scale"],
      category: "metric",
      status: "pending",
      jobIndex: 1,
      bulletIndex: 0,
    },
    {
      id: "sug-2",
      section: "Google – Senior Software Engineer",
      originalText: "Led service architecture",
      suggestedText: "Spearheaded fault-tolerant cloud architecture delivering 99.99% uptime",
      reason: "Highlighted high-availability cloud architecture",
      keywords: ["High Availability"],
      category: "metric",
      status: "pending",
      jobIndex: 0,
      bulletIndex: 0,
    },
    {
      id: "sug-3",
      section: "Professional Summary",
      originalText: "Experienced engineer with passion for building apps.",
      suggestedText: "Senior Cloud Architect with 6+ years designing resilient distributed platforms.",
      reason: "Aligned career narrative with target role",
      keywords: ["Cloud Architect"],
      category: "summary",
      status: "pending",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders tri-color progress bar with accepted (green), kept (red), and remaining (gray) counts", () => {
    const sugsWithStatuses: ResumeSuggestion[] = [
      { ...mockSuggestions[0], status: "accepted" },
      { ...mockSuggestions[1], status: "rejected" },
      { ...mockSuggestions[2], status: "pending" },
    ];

    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={sugsWithStatuses}
        beforeScore={50}
        matchScore={80}
        onSuggestionsChange={vi.fn()}
      />
    );

    // Should display counters: 1 Accepted, 1 Kept, 1 Remaining out of 3
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Accepted/i)).toBeInTheDocument();
    expect(screen.getByText(/Kept/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Remaining/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Change 1 of 3/i)).toBeInTheDocument();

    // Progress bar segment indicators
    const progressTicks = screen.getAllByRole("button", { name: /Change \d/i });
    expect(progressTicks.length).toBe(3);
  });

  it("calculates upfront score boost divided proportionally per change", () => {
    // 3 changes, boost is 80 - 50 = 30. Boost per change = 10%.
    // With 1 accepted change, score should be 50 + 10 = 60%.
    const sugsWithOneAccepted: ResumeSuggestion[] = [
      { ...mockSuggestions[0], status: "accepted" },
      { ...mockSuggestions[1], status: "pending" },
      { ...mockSuggestions[2], status: "pending" },
    ];

    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={sugsWithOneAccepted}
        beforeScore={50}
        matchScore={80}
        onSuggestionsChange={vi.fn()}
      />
    );

    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("+10%")).toBeInTheDocument();
  });

  it("renders symmetrical side-by-side comparison for the active change", () => {
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockSuggestions}
        beforeScore={50}
        matchScore={80}
        onSuggestionsChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Change 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Original \(Before\):/i)).toBeInTheDocument();
    expect(screen.getByText(/Tailored \(Enhanced\):/i)).toBeInTheDocument();
    expect(screen.getByText("Built campus web apps")).toBeInTheDocument();
    expect(screen.getByText(/Engineered high-concurrency student portal/i)).toBeInTheDocument();
    expect(screen.getByText(/Quantified scale with measurable user metric/i)).toBeInTheDocument();
  });

  it("advances step-by-step when user clicks Accept Change", () => {
    const onSuggestionsChange = vi.fn();
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockSuggestions}
        beforeScore={50}
        matchScore={80}
        onSuggestionsChange={onSuggestionsChange}
      />
    );

    const acceptBtn = screen.getByRole("button", { name: /✓ Accept Change/i });
    fireEvent.click(acceptBtn);

    expect(onSuggestionsChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "sug-1",
          status: "accepted",
        }),
      ])
    );

    // Automatically advances to Change 2
    expect(screen.getByText(/Change 2 of 3/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Google – Senior Software Engineer/i).length).toBeGreaterThanOrEqual(1);
  });

  it("advances step-by-step when user clicks Keep Original", () => {
    const onSuggestionsChange = vi.fn();
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockSuggestions}
        beforeScore={50}
        matchScore={80}
        onSuggestionsChange={onSuggestionsChange}
      />
    );

    const keepBtn = screen.getByRole("button", { name: /✕ Keep Original/i });
    fireEvent.click(keepBtn);

    expect(onSuggestionsChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "sug-1",
          status: "rejected",
        }),
      ])
    );

    // Automatically advances to Change 2
    expect(screen.getByText(/Change 2 of 3/i)).toBeInTheDocument();
  });

  it("allows previous and next step navigation without altering state", () => {
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockSuggestions}
        beforeScore={50}
        matchScore={80}
        onSuggestionsChange={vi.fn()}
      />
    );

    const prevBtn = screen.getByRole("button", { name: /Previous/i });
    const nextBtn = screen.getByRole("button", { name: /Next/i });

    // On change 1, previous is disabled
    expect(prevBtn).toBeDisabled();

    // Click next -> advances to Change 2
    fireEvent.click(nextBtn);
    expect(screen.getByText(/Change 2 of 3/i)).toBeInTheDocument();
    expect(prevBtn).not.toBeDisabled();

    // Click previous -> goes back to Change 1
    fireEvent.click(prevBtn);
    expect(screen.getByText(/Change 1 of 3/i)).toBeInTheDocument();
  });

  it("allows direct navigation by clicking progress bar segment", () => {
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockSuggestions}
        beforeScore={50}
        matchScore={80}
        onSuggestionsChange={vi.fn()}
      />
    );

    const progressTicks = screen.getAllByRole("button", { name: /Change \d/i });
    // Click 3rd segment (Summary)
    fireEvent.click(progressTicks[2]);

    expect(screen.getByText(/Change 3 of 3/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Professional Summary/i).length).toBeGreaterThanOrEqual(1);
  });

  it("supports inline editing of suggestion text", () => {
    const onSuggestionsChange = vi.fn();
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockSuggestions}
        beforeScore={50}
        matchScore={80}
        onSuggestionsChange={onSuggestionsChange}
      />
    );

    const editBtn = screen.getByRole("button", { name: /Adjust \/ Edit|Edit/i });
    fireEvent.click(editBtn);

    const textarea = screen.getByDisplayValue(/Engineered high-concurrency student portal/i);
    fireEvent.change(textarea, { target: { value: "Engineered high-concurrency portal serving 50k users" } });

    const saveBtn = screen.getByRole("button", { name: /Save & Accept|Save/i });
    fireEvent.click(saveBtn);

    expect(onSuggestionsChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "sug-1",
          suggestedText: "Engineered high-concurrency portal serving 50k users",
          status: "accepted",
        }),
      ])
    );
  });

  it("calls onFinalize when clicking Finish Review button", () => {
    const onFinalize = vi.fn();
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockSuggestions}
        beforeScore={50}
        matchScore={80}
        onSuggestionsChange={vi.fn()}
        onFinalize={onFinalize}
      />
    );

    const finishBtn = screen.getByRole("button", { name: /Finish & View Resume/i });
    fireEvent.click(finishBtn);

    expect(onFinalize).toHaveBeenCalledTimes(1);
  });

  it("filters out non-substantive (newline, whitespace, trailing punctuation) suggestions from review counts", () => {
    const sugsWithTrivial: ResumeSuggestion[] = [
      ...mockSuggestions,
      {
        id: "sug-trivial-1",
        section: "Chapman University – Software Engineer",
        originalText: "Managed Postgres database.",
        suggestedText: "Managed Postgres\ndatabase",
        reason: "Trivial newline",
        keywords: [],
        category: "keyword",
        status: "pending",
      },
      {
        id: "sug-trivial-2",
        section: "Professional Summary",
        originalText: "Experienced engineer.",
        suggestedText: "Experienced engineer",
        reason: "Trailing punctuation only",
        keywords: [],
        category: "summary",
        status: "pending",
      },
    ];

    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={sugsWithTrivial}
        beforeScore={50}
        matchScore={80}
        onSuggestionsChange={vi.fn()}
      />
    );

    // Only 3 substantive suggestions should be counted and shown in progress bar
    expect(screen.getByText(/Change 1 of 3/i)).toBeInTheDocument();
    const progressTicks = screen.getAllByRole("button", { name: /Change \d/i });
    expect(progressTicks.length).toBe(3);
  });
});

