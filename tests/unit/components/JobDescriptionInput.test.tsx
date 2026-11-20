import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import JobDescriptionInput, { SAMPLE_JOB_PRESETS } from "@/app/components/JobDescriptionInput";
import React from "react";

describe("JobDescriptionInput", () => {
  it("renders sample role presets when value is empty", () => {
    render(
      <JobDescriptionInput
        label="Job Description"
        placeholder="Paste here..."
        value=""
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Try a sample target role/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ Full Stack Engineer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ Product Manager/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ Account Executive/i })).toBeInTheDocument();
  });

  it("calls onValueChange and onTitleDetected when a preset is clicked", () => {
    const onValueChange = vi.fn();
    const onTitleDetected = vi.fn();

    render(
      <JobDescriptionInput
        label="Job Description"
        placeholder="Paste here..."
        value=""
        onChange={vi.fn()}
        onValueChange={onValueChange}
        onTitleDetected={onTitleDetected}
      />
    );

    const fseBtn = screen.getByRole("button", { name: /\+ Full Stack Engineer/i });
    fireEvent.click(fseBtn);

    expect(onValueChange).toHaveBeenCalledWith(SAMPLE_JOB_PRESETS[0].text);
    expect(onTitleDetected).toHaveBeenCalledWith("Full Stack Engineer", 0.95);
  });

  it("does not render sample role presets when input already has content", () => {
    render(
      <JobDescriptionInput
        label="Job Description"
        placeholder="Paste here..."
        value="Existing job description text here..."
        onChange={vi.fn()}
      />
    );

    expect(screen.queryByText(/Try a sample target role/i)).toBeNull();
  });
});
