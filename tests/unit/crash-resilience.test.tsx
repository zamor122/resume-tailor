import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import ResumeDiffView from "@/app/components/ResumeDiffView";
import AppError from "@/app/error";
import { fetchResumeById, fetchResumeList } from "@/app/lib/swr-fetchers";

describe("Crash resilience regressions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ResumeDiffView safely handles null/undefined inputs without throwing diff_main Null input", () => {
    expect(() =>
      render(
        <ResumeDiffView
          originalText={undefined as unknown as string}
          tailoredText={null as unknown as string}
          layout="side-by-side"
        />
      )
    ).not.toThrow();
  });

  it("fetchResumeById handles non-JSON 504 HTML responses cleanly without JSON SyntaxError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html><body>504 Gateway Timeout</body></html>", {
        status: 504,
        headers: { "Content-Type": "text/html" },
      })
    );

    await expect(fetchResumeById("res-1", "user-1", "tok-1")).rejects.toMatchObject({
      message: expect.stringContaining("504"),
      status: 504,
    });
  });

  it("fetchResumeList handles non-JSON 502 HTML responses cleanly without JSON SyntaxError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Bad Gateway", {
        status: 502,
        headers: { "Content-Type": "text/plain" },
      })
    );

    await expect(fetchResumeList("user-1", 1, 10, "tok-1")).rejects.toMatchObject({
      message: expect.stringContaining("502"),
      status: 502,
    });
  });

  it("AppError boundary renders recovery UI and triggers reset()", () => {
    const reset = vi.fn();
    const err = new Error("Simulated render crash");
    render(<AppError error={err} reset={reset} />);

    expect(screen.getByText(/Something went wrong on this screen/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Try Again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
