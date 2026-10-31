import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import ProgressStepper, { TAILORING_STEPS } from "@/app/components/ProgressStepper";

describe("ProgressStepper (Human-Readable Progress Tracker)", () => {
  it("renders non-technical human-readable steps", () => {
    render(<ProgressStepper isActive={true} />);

    // Steps should be human readable, not technical AST/LangGraph jargon
    expect(screen.getByText(/Analyzing Career Experience/i)).toBeInTheDocument();
    expect(screen.getByText(/Aligning to Target Role Qualifications/i)).toBeInTheDocument();
    expect(screen.getByText(/Enhancing Accomplishments & Impact/i)).toBeInTheDocument();
    expect(screen.getByText(/Verifying Authenticity with Jev AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Polishing Resume & Measuring Score Boost/i)).toBeInTheDocument();

    // No technical jargon in step titles
    expect(screen.queryByText(/AST/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/LangGraph Agent Running/i)).not.toBeInTheDocument();
  });

  it("calculates current step based on agentProgress and displays percentage", () => {
    render(<ProgressStepper isActive={true} agentProgress={45} />);

    // Step 2 or 3 should be active for 45%
    expect(screen.getByText("45%")).toBeInTheDocument();
    expect(screen.getAllByText(/In Progress/i).length).toBeGreaterThanOrEqual(1);
  });

  it("sanitizes technical agent messages into user-friendly text", () => {
    render(
      <ProgressStepper
        isActive={true}
        agentMessage="Parsing resume AST and extracting structure..."
      />
    );

    // Should display human-friendly phrasing
    expect(screen.queryByText(/AST/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Analyzing work experience and skills/i)).toBeInTheDocument();
  });

  it("displays Jev AI authenticity verification promise", () => {
    render(<ProgressStepper isActive={true} />);

    expect(screen.getByText(/Zero Hallucination Guarantee/i)).toBeInTheDocument();
    expect(screen.getByText(/Jev AI Verified/i)).toBeInTheDocument();
  });
});
