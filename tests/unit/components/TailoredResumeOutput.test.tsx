import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import TailoredResumeOutput from "@/app/components/TailoredResumeOutput";
import type { ResumeSectionGroup, ResumeSuggestion } from "@/app/agent/state";

describe("TailoredResumeOutput Document Spotlight & Synchronized Scrolling", () => {
  const sampleResume = `# Jane Doe
jane@example.com • 555-0199 • San Francisco, CA

## Summary
Experienced full-stack engineer specialized in distributed systems and cloud architecture.

## Experience

### Google – Senior Software Engineer
2021 - Present • Mountain View, CA
- Architected high-throughput microservices handling 50k RPS
- Reduced database p99 latency by 35% with Redis caching

### Chapman University – Software Engineer
2018 - 2021 • Orange, CA
- Developed and maintained campus portal used by 12,000 students
- Migrated monolith backend to containerized Docker services

## Skills
TypeScript, React, Node.js, Go, Kubernetes, PostgreSQL, GraphQL
`;

  const mockSectionGroups: ResumeSectionGroup[] = [
    {
      id: "section-exp-1",
      sectionType: "experience",
      title: "Chapman University – Software Engineer",
      subtitle: "2018 - 2021 • Orange, CA",
      jobIndex: 1,
      orderIndex: 0,
      status: "ready",
      auditRationale: "Early career foundation",
      suggestions: [],
      originalContent: "Developed and maintained campus portal",
      hasChanges: false,
    },
    {
      id: "section-exp-0",
      sectionType: "experience",
      title: "Google – Senior Software Engineer",
      subtitle: "2021 - Present • Mountain View, CA",
      jobIndex: 0,
      orderIndex: 1,
      status: "ready",
      auditRationale: "Elevated distributed systems",
      suggestions: [],
      originalContent: "Architected high-throughput microservices",
      hasChanges: false,
    },
    {
      id: "section-skills",
      sectionType: "skills",
      title: "Skills & Core Competencies",
      subtitle: "Technical Proficiencies",
      orderIndex: 2,
      status: "ready",
      auditRationale: "Target role keyword alignment",
      suggestions: [],
      originalContent: "TypeScript, React, Node.js",
      hasChanges: false,
    },
    {
      id: "section-summary",
      sectionType: "summary",
      title: "Professional Summary Synthesis",
      subtitle: "Holistic Career Overview",
      orderIndex: 3,
      status: "ready",
      auditRationale: "Executive synthesis",
      suggestions: [],
      originalContent: "Experienced full-stack engineer",
      hasChanges: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders section containers with stable anchor IDs and data-section-id attributes", () => {
    const { container } = render(
      <TailoredResumeOutput
        newResume={sampleResume}
        originalResume={sampleResume}
        loading={false}
      />
    );

    // Verify sections have stable IDs / data-section-id attributes
    const summarySection = container.querySelector('[data-section-id="section-summary"]');
    const exp0Section = container.querySelector('[data-section-id="section-exp-0"]');
    const exp1Section = container.querySelector('[data-section-id="section-exp-1"]');
    const skillsSection = container.querySelector('[data-section-id="section-skills"]');

    expect(summarySection).toBeInTheDocument();
    expect(summarySection).toHaveAttribute("id", "section-summary");

    expect(exp0Section).toBeInTheDocument();
    expect(exp0Section).toHaveAttribute("id", "section-exp-0");
    expect(exp0Section).toHaveTextContent(/Google – Senior Software Engineer/i);

    expect(exp1Section).toBeInTheDocument();
    expect(exp1Section).toHaveAttribute("id", "section-exp-1");
    expect(exp1Section).toHaveTextContent(/Chapman University – Software Engineer/i);

    expect(skillsSection).toBeInTheDocument();
    expect(skillsSection).toHaveAttribute("id", "section-skills");
  });

  it("applies spotlight styling when activeSectionId matches a section", () => {
    const { container, rerender } = render(
      <TailoredResumeOutput
        newResume={sampleResume}
        originalResume={sampleResume}
        activeSectionId="section-exp-0"
        loading={false}
      />
    );

    const exp0Section = container.querySelector('[data-section-id="section-exp-0"]');
    const exp1Section = container.querySelector('[data-section-id="section-exp-1"]');

    // Expected spotlight glow styling from task brief
    expect(exp0Section?.className).toContain("border-l-4");
    expect(exp0Section?.className).toContain("border-cyan-500");
    expect(exp0Section?.className).toContain("bg-cyan-500/10");
    expect(exp0Section?.className).toContain("rounded-r-xl");

    // Inactive section should not have cyan spotlight
    expect(exp1Section?.className).not.toContain("border-cyan-500");
    expect(exp1Section?.className).not.toContain("bg-cyan-500/10");

    // Rerender with Chapman active
    rerender(
      <TailoredResumeOutput
        newResume={sampleResume}
        originalResume={sampleResume}
        activeSectionId="section-exp-1"
        loading={false}
      />
    );

    expect(exp1Section?.className).toContain("border-cyan-500");
    expect(exp1Section?.className).toContain("bg-cyan-500/10");
    expect(exp0Section?.className).not.toContain("border-cyan-500");
  });

  it("normalizes activeSectionId with hash prefix (#section-summary)", () => {
    const { container } = render(
      <TailoredResumeOutput
        newResume={sampleResume}
        originalResume={sampleResume}
        activeSectionId="#section-summary"
        loading={false}
      />
    );

    const summarySection = container.querySelector('[data-section-id="section-summary"]');
    expect(summarySection?.className).toContain("border-cyan-500");
    expect(summarySection?.className).toContain("bg-cyan-500/10");
  });

  it("smooth-scrolls right-hand document preview to center active section when activeSectionId changes", () => {
    const scrollMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollMock;

    const { rerender } = render(
      <TailoredResumeOutput
        newResume={sampleResume}
        originalResume={sampleResume}
        activeSectionId="section-exp-0"
        loading={false}
      />
    );

    expect(scrollMock).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });

    scrollMock.mockClear();

    rerender(
      <TailoredResumeOutput
        newResume={sampleResume}
        originalResume={sampleResume}
        activeSectionId="section-skills"
        loading={false}
      />
    );

    expect(scrollMock).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  });

  it("triggers onActiveSectionChange when a section in document preview is clicked (bi-directional focus)", () => {
    const handleActiveChange = vi.fn();

    const { container } = render(
      <TailoredResumeOutput
        newResume={sampleResume}
        originalResume={sampleResume}
        onActiveSectionChange={handleActiveChange}
        loading={false}
      />
    );

    const exp1Section = container.querySelector('[data-section-id="section-exp-1"]');
    expect(exp1Section).toBeInTheDocument();

    fireEvent.click(exp1Section!);
    expect(handleActiveChange).toHaveBeenCalledWith("section-exp-1");

    const skillsSection = container.querySelector('[data-section-id="section-skills"]');
    expect(skillsSection).toBeInTheDocument();

    fireEvent.click(skillsSection!);
    expect(handleActiveChange).toHaveBeenCalledWith("section-skills");
  });

  it("passes sectionGroups and activeSectionId props to ResumeSuggestionReviewer in cockpit mode", () => {
    const mockSuggestions: ResumeSuggestion[] = [
      {
        id: "sug-1",
        section: "Google – Senior Software Engineer",
        originalText: "Architected high-throughput microservices",
        suggestedText: "Spearheaded distributed microservices handling 50k RPS",
        reason: "Stronger action verb",
        keywords: ["Microservices"],
        category: "action_verb",
        status: "accepted",
        jobIndex: 0,
        bulletIndex: 0,
      },
    ];

    const handleGroupsChange = vi.fn();
    const handleActiveChange = vi.fn();

    const { container } = render(
      <TailoredResumeOutput
        newResume={sampleResume}
        originalResume={sampleResume}
        suggestions={mockSuggestions}
        sectionGroups={mockSectionGroups}
        onSectionGroupsChange={handleGroupsChange}
        activeSectionId="section-exp-0"
        onActiveSectionChange={handleActiveChange}
        loading={false}
      />
    );

    // Verify Reviewer is rendered and shows step-by-step header
    expect(screen.getAllByText(/Change 1 of/i).length).toBeGreaterThan(0);
    // Verify document preview on the right also has spotlighted section-exp-0
    const exp0Section = container.querySelector('[data-section-id="section-exp-0"]');
    expect(exp0Section?.className).toContain("border-cyan-500");
  });

  it("handles resumes where experience has no subsections and treats it as a single block", () => {
    const flatResume = `## Summary
Experienced engineer.

## Experience
- Spearheaded company-wide cloud migration
- Designed distributed pub-sub pipeline

## Skills
Go, Docker`;

    const { container } = render(
      <TailoredResumeOutput
        newResume={flatResume}
        originalResume={flatResume}
        loading={false}
      />
    );

    const expSection = container.querySelector('[data-section-id="section-exp-0"]');
    expect(expSection).toBeInTheDocument();
    expect(expSection).toHaveTextContent(/Spearheaded company-wide cloud migration/i);
  });

  it("matches custom group IDs from sectionGroups by title", () => {
    const customResume = `## Experience

### Amazon – Principal Engineer
- Designed hyper-scale storage architecture

### Google – Senior Software Engineer
- Scaled indexing services`;

    const customGroups: ResumeSectionGroup[] = [
      {
        id: "section-exp-preserved",
        sectionType: "experience",
        title: "Amazon – Principal Engineer",
        orderIndex: 0,
        status: "unchanged",
        auditRationale: "Preserved role",
        suggestions: [],
        originalContent: "Designed hyper-scale storage architecture",
        hasChanges: false,
      },
      {
        id: "section-exp-tailored",
        sectionType: "experience",
        title: "Google – Senior Software Engineer",
        orderIndex: 1,
        status: "ready",
        auditRationale: "Tailored indexing",
        suggestions: [],
        originalContent: "Scaled indexing services",
        hasChanges: false,
      },
    ];

    const { container } = render(
      <TailoredResumeOutput
        newResume={customResume}
        originalResume={customResume}
        sectionGroups={customGroups}
        activeSectionId="section-exp-preserved"
        loading={false}
      />
    );

    const amazonSection = container.querySelector('[data-section-id="section-exp-preserved"]');
    expect(amazonSection).toBeInTheDocument();
    expect(amazonSection?.className).toContain("border-cyan-500");

    const googleSection = container.querySelector('[data-section-id="section-exp-tailored"]');
    expect(googleSection).toBeInTheDocument();
    expect(googleSection?.className).not.toContain("border-cyan-500");
  });

  it("updates spotlight visual state internally when activeSectionId is uncontrolled", () => {
    const { container } = render(
      <TailoredResumeOutput
        newResume={sampleResume}
        originalResume={sampleResume}
        loading={false}
      />
    );

    const exp1Section = container.querySelector('[data-section-id="section-exp-1"]');
    expect(exp1Section?.className).not.toContain("border-cyan-500");

    // Click section-exp-1
    fireEvent.click(exp1Section!);

    // Should now receive active spotlight glow
    expect(exp1Section?.className).toContain("border-cyan-500");
    expect(exp1Section?.className).toContain("bg-cyan-500/10");
  });

  it("renders clean, non-interactive paper-style canvas without embedded action buttons (REQ-UBI-03, REQ-STA-04)", () => {
    const multiSuggestions: ResumeSuggestion[] = [
      {
        id: "sug-1",
        section: "Google – Senior Software Engineer",
        originalText: "Architected high-throughput microservices handling 50k RPS",
        suggestedText: "Spearheaded fault-tolerant microservices handling 100k RPS",
        reason: "Elevated performance metrics",
        keywords: ["Fault-Tolerant"],
        category: "metric",
        status: "pending",
        jobIndex: 0,
        bulletIndex: 0,
      },
      {
        id: "sug-2",
        section: "Chapman University – Software Engineer",
        originalText: "Developed and maintained campus portal used by 12,000 students",
        suggestedText: "Engineered scalable campus portal serving 20,000 active students",
        reason: "Enhanced scale metrics",
        keywords: ["Scalable"],
        category: "metric",
        status: "pending",
        jobIndex: 1,
        bulletIndex: 0,
      },
    ];

    const { container } = render(
      <TailoredResumeOutput
        newResume={sampleResume}
        originalResume={sampleResume}
        suggestions={multiSuggestions}
        sectionGroups={mockSectionGroups}
        loading={false}
      />
    );

    // Initial state: Only sug-1 has active focus
    const activeHighlight1 = container.querySelector("#change-highlight-sug-1");
    expect(activeHighlight1).toBeInTheDocument();
    expect(activeHighlight1?.className).toContain("ring-cyan-500");

    // sug-2 should NOT have an active highlight container
    const inactiveHighlight2 = container.querySelector("#change-highlight-sug-2");
    expect(inactiveHighlight2).toBeNull();

    // The document preview canvas should NOT contain embedded interactive buttons (REQ-UBI-03)
    const canvas = container.querySelector(".resume-prose");
    const canvasButtons = canvas?.querySelectorAll("button");
    expect(canvasButtons?.length).toBe(0);

    // Click the inactive second bullet text in canvas to shift focus to Change 2
    const inactiveBullet = screen.getByText(/Developed and maintained campus portal used by 12,000 students/i);
    fireEvent.click(inactiveBullet);

    // Now only sug-2 is active
    expect(container.querySelector("#change-highlight-sug-2")).toBeInTheDocument();
    expect(container.querySelector("#change-highlight-sug-1")).toBeNull();
  });

  it("updates document preview text live when suggestions are accepted vs original (REQ-EVT-01, REQ-EVT-02, REQ-STA-01, REQ-STA-02)", () => {
    const singleSug: ResumeSuggestion[] = [
      {
        id: "sug-1",
        section: "Google – Senior Software Engineer",
        originalText: "Architected high-throughput microservices handling 50k RPS",
        suggestedText: "Spearheaded fault-tolerant microservices handling 100k RPS",
        reason: "Elevated performance metrics",
        keywords: ["Fault-Tolerant"],
        category: "metric",
        status: "pending",
        jobIndex: 0,
        bulletIndex: 0,
      },
    ];

    const onSuggestionsChange = vi.fn();

    const { container, rerender } = render(
      <TailoredResumeOutput
        newResume={sampleResume}
        originalResume={sampleResume}
        suggestions={singleSug}
        sectionGroups={mockSectionGroups}
        onSuggestionsChange={onSuggestionsChange}
        loading={false}
      />
    );

    const canvas = container.querySelector(".resume-prose");
    expect(canvas).toBeInTheDocument();

    // Initially with pending suggestion: Preview renders original text and shows original version in badge (REQ-STA-01, REQ-STA-05)
    expect(within(canvas as HTMLElement).getByText(/Architected high-throughput microservices handling 50k RPS/i)).toBeInTheDocument();
    expect(screen.getByTestId("live-sync-badge")).toHaveTextContent(/Original version/i);

    // Accept change via reviewer panel (left side)
    const reviewerAcceptBtn = screen.getByRole("button", { name: /Accept Change/i });
    fireEvent.click(reviewerAcceptBtn);

    expect(onSuggestionsChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "sug-1", status: "accepted" })])
    );

    // Rerender with accepted status: Preview updates live to tailored text and updates badge (REQ-EVT-01, REQ-STA-02, REQ-STA-05)
    const acceptedSug = [{ ...singleSug[0], status: "accepted" as const }];
    rerender(
      <TailoredResumeOutput
        newResume={sampleResume}
        originalResume={sampleResume}
        suggestions={acceptedSug}
        sectionGroups={mockSectionGroups}
        onSuggestionsChange={onSuggestionsChange}
        loading={false}
      />
    );

    const canvasAccepted = container.querySelector(".resume-prose");
    expect(within(canvasAccepted as HTMLElement).getByText(/Spearheaded fault-tolerant microservices handling 100k RPS/i)).toBeInTheDocument();
    expect(screen.getByTestId("live-sync-badge")).toHaveTextContent(/1 change applied/i);

    // Rerender with rejected / kept original: Preview reverts back to original text (REQ-EVT-02, REQ-STA-03)
    const rejectedSug = [{ ...singleSug[0], status: "rejected" as const }];
    rerender(
      <TailoredResumeOutput
        newResume={sampleResume}
        originalResume={sampleResume}
        suggestions={rejectedSug}
        sectionGroups={mockSectionGroups}
        onSuggestionsChange={onSuggestionsChange}
        loading={false}
      />
    );

    const canvasRejected = container.querySelector(".resume-prose");
    expect(within(canvasRejected as HTMLElement).getByText(/Architected high-throughput microservices handling 50k RPS/i)).toBeInTheDocument();
    expect(screen.getByTestId("live-sync-badge")).toHaveTextContent(/Original version/i);
  });

  it("synchronizes document preview when external suggestions prop changes (REQ-EVT-04)", () => {
    const initialSug: ResumeSuggestion[] = [
      {
        id: "sug-1",
        section: "Google – Senior Software Engineer",
        originalText: "Architected high-throughput microservices handling 50k RPS",
        suggestedText: "Spearheaded fault-tolerant microservices handling 100k RPS",
        reason: "Elevated metrics",
        keywords: ["Fault-Tolerant"],
        category: "metric",
        status: "pending",
        jobIndex: 0,
        bulletIndex: 0,
      },
    ];

    const { container, rerender } = render(
      <TailoredResumeOutput
        newResume={sampleResume}
        originalResume={sampleResume}
        suggestions={initialSug}
        sectionGroups={mockSectionGroups}
        loading={false}
      />
    );

    const canvas = container.querySelector(".resume-prose") as HTMLElement;
    expect(within(canvas).getByText(/Architected high-throughput microservices handling 50k RPS/i)).toBeInTheDocument();

    // External suggestions update with accepted status
    const updatedSug: ResumeSuggestion[] = [
      {
        ...initialSug[0],
        status: "accepted",
      },
    ];

    rerender(
      <TailoredResumeOutput
        newResume={sampleResume}
        originalResume={sampleResume}
        suggestions={updatedSug}
        sectionGroups={mockSectionGroups}
        loading={false}
      />
    );

    const canvasUpdated = container.querySelector(".resume-prose") as HTMLElement;
    expect(within(canvasUpdated).getByText(/Spearheaded fault-tolerant microservices handling 100k RPS/i)).toBeInTheDocument();
    expect(screen.getByTestId("live-sync-badge")).toHaveTextContent(/1 change applied/i);
  });

  it("falls back to newResume when originalResume is absent (REQ-ERR-01)", () => {
    const tailoredOnlyResume = `# Jane Doe
## Experience
- Spearheaded fault-tolerant microservices handling 100k RPS
`;
    const { container } = render(
      <TailoredResumeOutput
        newResume={tailoredOnlyResume}
        loading={false}
      />
    );

    const canvas = container.querySelector(".resume-prose") as HTMLElement;
    expect(within(canvas).getByText(/Spearheaded fault-tolerant microservices handling 100k RPS/i)).toBeInTheDocument();
  });

  it("structures unformatted plain text into clean sections instead of raw text blobs", () => {
    const rawBlobResume = `Jane Doe
jane.doe@email.com | 555-0199 | San Francisco, CA

Professional Summary
Senior Software Engineer leading distributed systems.

Work Experience
Google – Senior Software Engineer
2021 - Present • Mountain View, CA
• Architected high-throughput microservices handling 50k RPS

Technical Skills
TypeScript, React, Node.js, Go
`;

    const { container } = render(
      <TailoredResumeOutput
        newResume={rawBlobResume}
        originalResume={rawBlobResume}
        loading={false}
      />
    );

    // Should have parsed distinct section IDs instead of lump sum
    const summarySection = container.querySelector('[data-section-id="section-summary"]');
    const exp0Section = container.querySelector('[data-section-id="section-exp-0"]');
    const skillsSection = container.querySelector('[data-section-id="section-skills"]');

    expect(summarySection).toBeInTheDocument();
    expect(exp0Section).toBeInTheDocument();
    expect(skillsSection).toBeInTheDocument();

    // Verify H1, H2, H3 elements are rendered
    expect(container.querySelector("h1")).toHaveTextContent("Jane Doe");
    expect(container.querySelector("h2")).toBeInTheDocument();
  });

  it("renders immediate download (PDF, Markdown) and copy actions by default", () => {
    const { container } = render(
      <TailoredResumeOutput
        newResume={sampleResume}
        originalResume={sampleResume}
        loading={false}
      />
    );

    // Download PDF button present
    expect(screen.getByRole("button", { name: /PDF/i })).toBeInTheDocument();
    // Copy button present
    expect(container.querySelector('[aria-label="Copy resume to clipboard"]') || screen.getByText(/Copy/i)).toBeInTheDocument();
  });
});
