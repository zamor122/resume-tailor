import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LimitNoticeAlert from "@/app/components/LimitNoticeAlert";
import { classifyTailorError } from "@/app/utils/tailorLimitError";

describe("tailorLimitError & LimitNoticeAlert", () => {
  it("classifies 402 requireUpgrade to open TierSelectionModal and renders Unlock Pass button", () => {
    const err = Object.assign(new Error("You've used your 2 free ATS audits."), {
      statusCode: 402,
      requireUpgrade: true,
    });

    const classified = classifyTailorError(err);
    expect(classified.limitAction).toBe("upgrade");
    expect(classified.openUpgradeModal).toBe(true);
    expect(classified.openAuthModal).toBe(false);

    const onOpenUpgrade = vi.fn();
    render(
      <LimitNoticeAlert
        message={classified.message}
        limitAction={classified.limitAction}
        entryPrice="9.00"
        onOpenUpgrade={onOpenUpgrade}
        onOpenAuth={vi.fn()}
      />
    );

    const btn = screen.getByRole("button", { name: /Unlock Pass From \$9\.00/i });
    expect(btn).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Compare Plans/i })).toHaveAttribute("href", "/pricing");

    fireEvent.click(btn);
    expect(onOpenUpgrade).toHaveBeenCalledTimes(1);
  });

  it("classifies 401 anonymousLimitExceeded to open AuthModal and renders Create Free Account + pricing triggers", () => {
    const err = Object.assign(new Error("You've used your 1 free preview."), {
      statusCode: 401,
      anonymousLimitExceeded: true,
    });

    const classified = classifyTailorError(err);
    expect(classified.limitAction).toBe("auth");
    expect(classified.openAuthModal).toBe(true);

    const onOpenAuth = vi.fn();
    render(
      <LimitNoticeAlert
        message={classified.message}
        limitAction={classified.limitAction}
        entryPrice="9.00"
        onOpenUpgrade={vi.fn()}
        onOpenAuth={onOpenAuth}
      />
    );

    const btn = screen.getByRole("button", { name: /Create Free Account/i });
    fireEvent.click(btn);
    expect(onOpenAuth).toHaveBeenCalledTimes(1);
  });
});
