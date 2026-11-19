import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LaunchOfferBanner from "@/app/components/LaunchOfferBanner";
import React from "react";

// Mock audioSfx
vi.mock("@/app/utils/audioSfx", () => ({
  playAudioSfx: vi.fn(),
}));

describe("LaunchOfferBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("does not render when user has active paid access", () => {
    const recent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { container } = render(
      <LaunchOfferBanner userCreatedAt={recent} hasActiveAccess={true} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("does not render when user was created over 24 hours ago", () => {
    const expired = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
    const { container } = render(
      <LaunchOfferBanner userCreatedAt={expired} hasActiveAccess={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("does not render if dismissed in localStorage", () => {
    localStorage.setItem("dismissed_launch_offer_v1", "true");
    const recent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { container } = render(
      <LaunchOfferBanner userCreatedAt={recent} hasActiveAccess={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders with offer details and countdown when candidate qualifies", () => {
    const recent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    render(<LaunchOfferBanner userCreatedAt={recent} hasActiveAccess={false} />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText(/24H Launch Special/i)).toBeInTheDocument();
    expect(screen.getByText(/Save 33%/i)).toBeInTheDocument();
  });

  it("handles dismissal click and persists to localStorage", () => {
    const recent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    render(<LaunchOfferBanner userCreatedAt={recent} hasActiveAccess={false} />);
    const dismissBtn = screen.getByRole("button", { name: /Dismiss banner/i });
    fireEvent.click(dismissBtn);
    expect(localStorage.getItem("dismissed_launch_offer_v1")).toBe("true");
    expect(screen.queryByRole("banner")).toBeNull();
  });

  it("triggers onClaim callback when clicked", () => {
    const recent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const onClaim = vi.fn();
    render(
      <LaunchOfferBanner
        userCreatedAt={recent}
        hasActiveAccess={false}
        onClaim={onClaim}
      />
    );
    const claimBtn = screen.getByRole("button", { name: /Claim \$6 Pass/i });
    fireEvent.click(claimBtn);
    expect(onClaim).toHaveBeenCalled();
  });
});
