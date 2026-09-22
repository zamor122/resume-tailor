import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import ResumeSuggestionReviewer from "@/app/components/ResumeSuggestionReviewer";
import TailoredResumeChanges from "@/app/components/TailoredResumeChanges";

describe("ResumeSuggestionReviewer Jev Badges (REQ-STA-02)", () => {
  const mockSuggestions = [
    {
      id: "sug-1",
      section: "Acme Corp – Senior Engineer",
      originalText: "Managed web services.",
      suggestedText: "Architected resilient web microservices cutting latency.",
      reason: "Emphasize architectural leadership",
      keywords: ["Microservices", "Latency"],
      status: "accepted" as const,
      jevJudge: {
        isAuthentic: true,
        contentMatchScore: 5,
        toneOfVoiceRating: "strong_authentic" as const,
        isBetterThanOriginal: true,
        overallImpactScore: 4.8,
        scoreDeltaPercent: 28,
      },
    },
  ];

  it("renders Jev verification badge with match delta and impact score", () => {
    render(
      <ResumeSuggestionReviewer
        suggestions={mockSuggestions}
        onAcceptSuggestion={() => {}}
        onRejectSuggestion={() => {}}
        onResetAll={() => {}}
      />
    );

    expect(screen.getByText(/Jev Verified/i)).toBeInTheDocument();
    expect(screen.getByText(/\+28% Match/i)).toBeInTheDocument();
    expect(screen.getByText(/Authentic Tone/i)).toBeInTheDocument();
    expect(screen.getByText(/4\.8\/5 Impact/i)).toBeInTheDocument();
  });

  it("renders Professional Tone when tone rating is neutral or buzzword_heavy", () => {
    const neutralSuggestion = [
      {
        id: "sug-2",
        section: "Acme Corp – Senior Engineer",
        originalText: "Managed web services.",
        suggestedText: "Architected resilient web microservices cutting latency.",
        reason: "Emphasize architectural leadership",
        keywords: ["Microservices", "Latency"],
        status: "accepted" as const,
        jevJudge: {
          isAuthentic: true,
          contentMatchScore: 4,
          toneOfVoiceRating: "neutral" as const,
          isBetterThanOriginal: true,
          overallImpactScore: 4.0,
          scoreDeltaPercent: 15,
        },
      },
    ];

    render(
      <ResumeSuggestionReviewer
        suggestions={neutralSuggestion}
        onAcceptSuggestion={() => {}}
        onRejectSuggestion={() => {}}
        onResetAll={() => {}}
      />
    );

    expect(screen.getByText(/Professional Tone/i)).toBeInTheDocument();
    expect(screen.getByText(/\+15% Match/i)).toBeInTheDocument();
    expect(screen.getByText(/4\/5 Impact/i)).toBeInTheDocument();
  });

  it("does not render Jev verification badge when jevJudge is not present", () => {
    const unverifiedSuggestion = [
      {
        id: "sug-3",
        section: "Acme Corp – Senior Engineer",
        originalText: "Managed web services.",
        suggestedText: "Architected resilient web microservices cutting latency.",
        reason: "Emphasize architectural leadership",
        keywords: ["Microservices", "Latency"],
        status: "pending" as const,
      },
    ];

    render(
      <ResumeSuggestionReviewer
        suggestions={unverifiedSuggestion}
        onAcceptSuggestion={() => {}}
        onRejectSuggestion={() => {}}
        onResetAll={() => {}}
      />
    );

    expect(screen.queryByText(/Jev Verified/i)).not.toBeInTheDocument();
  });
});

describe("TailoredResumeChanges Jev Indicators (REQ-STA-02)", () => {
  it("renders Jev Verified badge on change items when jevJudge is present", () => {
    const changes = [
      {
        changeDescription: "Quantified impact",
        changeDetails: "Added metrics to project bullets",
        jevJudge: {
          isAuthentic: true,
          contentMatchScore: 5,
          toneOfVoiceRating: "strong_authentic" as const,
          isBetterThanOriginal: true,
          overallImpactScore: 4.5,
          scoreDeltaPercent: 20,
        },
      },
    ];

    render(<TailoredResumeChanges changes={changes} />);

    expect(screen.getByText(/Jev Verified/i)).toBeInTheDocument();
    expect(screen.getByText(/\+20% Match/i)).toBeInTheDocument();
    expect(screen.getByText(/Authentic Tone/i)).toBeInTheDocument();
  });

  it("renders Jev Verified indicator on summary and score improvement callouts", () => {
    render(
      <TailoredResumeChanges
        changes={[]}
        summary="Synthesized experience aligning with senior engineering requirements."
        scoreImprovement={18}
        isJevVerified={true}
      />
    );

    expect(screen.getAllByText(/Jev Verified/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Score Improvement/i)).toBeInTheDocument();
    expect(screen.getByText(/\+18% match boost/i)).toBeInTheDocument();
    expect(screen.getByText(/Synthesized experience aligning with senior engineering requirements./i)).toBeInTheDocument();
  });

  it("renders Jev Verified badges when suggestions array with jevJudge is passed", () => {
    const suggestions = [
      {
        id: "sug-10",
        section: "Summary",
        originalText: "Passionate engineer",
        suggestedText: "Experienced engineer delivering distributed systems",
        reason: "Improve tone",
        keywords: ["Distributed Systems"],
        jevJudge: {
          isAuthentic: true,
          contentMatchScore: 4.5,
          toneOfVoiceRating: "strong_authentic" as const,
          isBetterThanOriginal: true,
          overallImpactScore: 4.2,
          scoreDeltaPercent: 22,
        },
      },
    ];

    render(<TailoredResumeChanges changes={[]} suggestions={suggestions} />);

    expect(screen.getByText(/Jev Verified/i)).toBeInTheDocument();
    expect(screen.getByText(/\+22% Match/i)).toBeInTheDocument();
    expect(screen.getByText(/Experienced engineer delivering distributed systems/i)).toBeInTheDocument();
  });
});
