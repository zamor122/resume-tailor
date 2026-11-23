import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ChangedAndWhy from "@/app/components/ChangedAndWhy";
import { LOCKED_SUGGESTION_PLACEHOLDER } from "@/app/utils/gatingSanitizer";
import type { ResumeSuggestion } from "@/app/agent/state";

describe("ChangedAndWhy — original accessibility vs locked AI changes", () => {
  it("always keeps uploaded original content accessible while locking AI improvements and offering unlock", () => {
    const onUnlockRequest = vi.fn();
    const suggestions: ResumeSuggestion[] = [
      {
        id: "sug-1",
        section: "FreightPulse Systems – Senior Software Engineer",
        originalText:
          "Architected high-volume webhook ingestion handlers in TypeScript and PostgreSQL processing 180k events per hour.",
        suggestedText: LOCKED_SUGGESTION_PLACEHOLDER,
        reason: "Adds fault-tolerance framing",
        keywords: ["TypeScript", "PostgreSQL"],
        status: "accepted",
        isLocked: true,
      } as ResumeSuggestion,
    ];

    render(
      <ChangedAndWhy
        suggestions={suggestions}
        originalResume="Architected high-volume webhook ingestion handlers in TypeScript and PostgreSQL processing 180k events per hour."
        onUnlockRequest={onUnlockRequest}
      />
    );

    expect(screen.getByText("ORIGINAL")).toBeInTheDocument();
    expect(
      screen.getByText(/Architected high-volume webhook ingestion handlers in TypeScript/i)
    ).toBeInTheDocument();

    expect(screen.getByText(/TAILORED \(LOCKED\)/i)).toBeInTheDocument();
    expect(screen.queryByText("✓ TAILORED")).not.toBeInTheDocument();

    const unlockBtn = screen.getByRole("button", { name: /Unlock Full Changes/i });
    fireEvent.click(unlockBtn);
    expect(onUnlockRequest).toHaveBeenCalledTimes(1);
  });
});
