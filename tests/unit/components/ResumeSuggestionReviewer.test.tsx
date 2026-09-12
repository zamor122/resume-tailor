import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResumeSuggestionReviewer from "@/app/components/ResumeSuggestionReviewer";
import type { ResumeSectionGroup, ResumeSuggestion } from "@/app/agent/state";

describe("ResumeSuggestionReviewer Section Studio", () => {
  const mockGroups: ResumeSectionGroup[] = [
    {
      id: "section-exp-1",
      sectionType: "experience",
      title: "Chapman University – Software Engineer",
      subtitle: "2018 - 2021 • Orange, CA",
      jobIndex: 1,
      orderIndex: 0,
      status: "ready",
      auditRationale: "Early career foundation; highlighted student portal impact",
      suggestions: [
        {
          id: "sug-chapman-1",
          section: "Chapman University – Software Engineer",
          originalText: "Built campus web apps",
          suggestedText: "Engineered high-concurrency student portal serving 10k users",
          reason: "Quantified scale",
          keywords: ["Scale"],
          category: "metric",
          status: "accepted",
          jobIndex: 1,
          bulletIndex: 0,
        },
      ],
      originalContent: "Built campus web apps\nMaintained databases",
      hasChanges: true,
    },
    {
      id: "section-exp-0",
      sectionType: "experience",
      title: "Google – Senior Software Engineer",
      subtitle: "2021 - Present • Mountain View, CA",
      jobIndex: 0,
      orderIndex: 1,
      status: "ready",
      auditRationale: "Elevated distributed systems and gRPC throughput",
      suggestions: [
        {
          id: "sug-google-1",
          section: "Google – Senior Software Engineer",
          originalText: "Led service architecture",
          suggestedText: "Spearheaded fault-tolerant cloud architecture delivering 99.99% uptime",
          reason: "High availability metric",
          keywords: ["High Availability"],
          category: "metric",
          status: "accepted",
          jobIndex: 0,
          bulletIndex: 0,
        },
      ],
      originalContent: "Led service architecture",
      hasChanges: true,
    },
    {
      id: "section-summary",
      sectionType: "summary",
      title: "Professional Summary Synthesis",
      subtitle: "Holistic Career Overview",
      orderIndex: 2,
      status: "ready",
      auditRationale: "Executive synthesis aligning career arc with target cloud architect profile",
      suggestions: [
        {
          id: "sug-summary-1",
          section: "Professional Summary",
          originalText: "Experienced engineer with passion for building apps.",
          suggestedText: "Senior Cloud Architect with 6+ years designing resilient distributed platforms.",
          reason: "Aligned career narrative",
          keywords: ["Cloud Architect", "Distributed Systems"],
          category: "summary",
          status: "accepted",
        },
      ],
      originalContent: "Experienced engineer with passion for building apps.",
      tailoredContent: "Senior Cloud Architect with 6+ years designing resilient distributed platforms.",
      hasChanges: true,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the earliest role first with audit rationale and stepper count", () => {
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockGroups.flatMap((g) => g.suggestions)}
        sectionGroups={mockGroups}
        onSuggestionsChange={vi.fn()}
      />
    );

    // Should display Chapman University first (orderIndex 0)
    expect(screen.getByText(/Chapman University – Software Engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/Early career foundation; highlighted student portal impact/i)).toBeInTheDocument();
    expect(screen.getByText(/Section 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByText(/2018 - 2021 • Orange, CA/i)).toBeInTheDocument();
  });

  it("displays tailored rationale banner for modified sections and preserved authenticity banner for unchanged sections", () => {
    const untouchedGroup: ResumeSectionGroup = {
      id: "section-exp-preserved",
      sectionType: "experience",
      title: "Early Startup – Junior Intern",
      subtitle: "2017",
      jobIndex: 2,
      orderIndex: 0,
      status: "unchanged",
      auditRationale: "Foundational early tenure preserved to maintain genuine career history",
      suggestions: [],
      originalContent: "Fixed bug backlog and supported QA testing.",
      hasChanges: false,
    };

    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={[]}
        sectionGroups={[untouchedGroup]}
        onSuggestionsChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Preserved Authenticity/i)).toBeInTheDocument();
    expect(screen.getByText(/Foundational early tenure preserved/i)).toBeInTheDocument();
    expect(screen.getByText(/Fixed bug backlog and supported QA testing/i)).toBeInTheDocument();
  });

  it("advances to the next section when clicking Accept Section & Continue", () => {
    const onSuggestionsChange = vi.fn();
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockGroups.flatMap((g) => g.suggestions)}
        sectionGroups={mockGroups}
        onSuggestionsChange={onSuggestionsChange}
      />
    );

    const acceptSectionBtn = screen.getByRole("button", { name: /Accept Section & Continue/i });
    fireEvent.click(acceptSectionBtn);

    // Should call onSuggestionsChange with the active section's suggestions marked accepted
    expect(onSuggestionsChange).toHaveBeenCalled();

    // Should advance to Section 2 (Google)
    expect(screen.getByText(/Google – Senior Software Engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/Section 2 of 3/i)).toBeInTheDocument();
  });

  it("marks suggestions as rejected and advances when clicking Keep Original Section & Continue", () => {
    const onSuggestionsChange = vi.fn();
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockGroups.flatMap((g) => g.suggestions)}
        sectionGroups={mockGroups}
        onSuggestionsChange={onSuggestionsChange}
      />
    );

    const keepOriginalBtn = screen.getByRole("button", { name: /Keep Original Section & Continue/i });
    fireEvent.click(keepOriginalBtn);

    expect(onSuggestionsChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "sug-chapman-1",
          status: "rejected",
        }),
      ])
    );

    // Advances to Section 2
    expect(screen.getByText(/Google – Senior Software Engineer/i)).toBeInTheDocument();
  });

  it("allows navigating backward with Previous Section button", () => {
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockGroups.flatMap((g) => g.suggestions)}
        sectionGroups={mockGroups}
        onSuggestionsChange={vi.fn()}
      />
    );

    // On section 1, Previous button should be disabled
    const prevBtn = screen.getByRole("button", { name: /Previous Section/i });
    expect(prevBtn).toBeDisabled();

    // Advance to section 2
    fireEvent.click(screen.getByRole("button", { name: /Accept Section & Continue/i }));
    expect(screen.getByText(/Section 2 of 3/i)).toBeInTheDocument();

    // Click Previous Section
    expect(prevBtn).not.toBeDisabled();
    fireEvent.click(prevBtn);
    expect(screen.getByText(/Section 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Chapman University – Software Engineer/i)).toBeInTheDocument();
  });

  it("allows direct navigation via clickable stepper breadcrumbs", () => {
    const onActiveSectionChange = vi.fn();
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockGroups.flatMap((g) => g.suggestions)}
        sectionGroups={mockGroups}
        onSuggestionsChange={vi.fn()}
        onActiveSectionChange={onActiveSectionChange}
      />
    );

    // Click breadcrumb for Google (section 2)
    const googleBreadcrumb = screen.getByRole("button", { name: /Google/i });
    fireEvent.click(googleBreadcrumb);

    expect(screen.getByText(/Section 2 of 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Google – Senior Software Engineer/i)).toBeInTheDocument();
    expect(onActiveSectionChange).toHaveBeenCalledWith("section-exp-0");
  });

  it("synchronizes current section when parent updates activeSectionId", () => {
    const { rerender } = render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockGroups.flatMap((g) => g.suggestions)}
        sectionGroups={mockGroups}
        activeSectionId="section-exp-1"
        onSuggestionsChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Chapman University – Software Engineer/i)).toBeInTheDocument();

    rerender(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockGroups.flatMap((g) => g.suggestions)}
        sectionGroups={mockGroups}
        activeSectionId="section-exp-0"
        onSuggestionsChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Google – Senior Software Engineer/i)).toBeInTheDocument();
    expect(screen.getByText(/Section 2 of 3/i)).toBeInTheDocument();
  });

  it("allows toggling individual bullet suggestions between accepted and rejected", () => {
    const onSuggestionsChange = vi.fn();
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockGroups.flatMap((g) => g.suggestions)}
        sectionGroups={mockGroups}
        onSuggestionsChange={onSuggestionsChange}
      />
    );

    // Toggle bullet to Keep Original
    const keepOriginalBulletBtn = screen.getByRole("button", { name: /^✕ Keep Original$/i });
    fireEvent.click(keepOriginalBulletBtn);

    expect(onSuggestionsChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "sug-chapman-1",
          status: "rejected",
        }),
      ])
    );
  });

  it("supports inline editing of suggestion text", () => {
    const onSuggestionsChange = vi.fn();
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockGroups.flatMap((g) => g.suggestions)}
        sectionGroups={mockGroups}
        onSuggestionsChange={onSuggestionsChange}
      />
    );

    const editBtn = screen.getByRole("button", { name: /Adjust \/ Edit|Edit inline/i });
    fireEvent.click(editBtn);

    const textarea = screen.getByDisplayValue(/Engineered high-concurrency student portal/i);
    fireEvent.change(textarea, { target: { value: "Engineered high-concurrency portal serving 50k users" } });

    const saveBtn = screen.getByRole("button", { name: /Save & Accept|Save/i });
    fireEvent.click(saveBtn);

    expect(onSuggestionsChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "sug-chapman-1",
          suggestedText: "Engineered high-concurrency portal serving 50k users",
          status: "accepted",
        }),
      ])
    );
  });

  it("triggers background prefetch for next pending section", async () => {
    const pendingGroups: ResumeSectionGroup[] = [
      mockGroups[0],
      {
        ...mockGroups[1],
        status: "pending",
        suggestions: [],
      },
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sectionGroup: {
          ...mockGroups[1],
          status: "ready",
        },
      }),
    });
    global.fetch = mockFetch;

    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume Content"
        suggestions={mockGroups[0].suggestions}
        sectionGroups={pendingGroups}
        onSuggestionsChange={vi.fn()}
        jobDescription="Target Job Description"
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/agent/tailor-chunk",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
          body: expect.stringContaining("section-exp-0"),
        })
      );
    });
  });

  it("displays shimmer skeleton card when viewing a pending or tailoring section", () => {
    const tailoringGroups: ResumeSectionGroup[] = [
      {
        id: "section-exp-tailoring",
        sectionType: "experience",
        title: "Netflix – Distributed Systems Engineer",
        subtitle: "2022 - Present",
        jobIndex: 0,
        orderIndex: 0,
        status: "tailoring",
        auditRationale: "Aligning with streaming architecture requirements",
        suggestions: [],
        originalContent: "Worked on streaming pipelines",
        hasChanges: true,
      },
    ];

    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={[]}
        sectionGroups={tailoringGroups}
        onSuggestionsChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Analyzing Netflix experience/i)).toBeInTheDocument();
  });

  it("renders Summary finale stage with re-synthesize and approve buttons", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        summaryText: "Executive Cloud Architect with 10+ years scaling high-availability microservices.",
        rationale: "Holistic career alignment",
        keywords: ["Microservices"],
      }),
    });
    global.fetch = mockFetch;

    const onSuggestionsChange = vi.fn();
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockGroups.flatMap((g) => g.suggestions)}
        sectionGroups={mockGroups}
        activeSectionId="section-summary"
        onSuggestionsChange={onSuggestionsChange}
        jobDescription="Senior Cloud Engineer"
      />
    );

    expect(screen.getByText(/Professional Summary Synthesis/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approve & Finalize Resume/i })).toBeInTheDocument();

    const reSynthBtn = screen.getByRole("button", { name: /Re-Synthesize Summary/i });
    fireEvent.click(reSynthBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/agent/synthesize-summary",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
        })
      );
    });
  });

  it("dynamically derives section groups when sectionGroups prop is omitted", () => {
    render(
      <ResumeSuggestionReviewer
        originalResume="Original Resume"
        suggestions={mockGroups.flatMap((g) => g.suggestions)}
        onSuggestionsChange={vi.fn()}
      />
    );

    // Should derive groups and render first section
    expect(screen.getByText(/Section 1 of/i)).toBeInTheDocument();
  });
});
