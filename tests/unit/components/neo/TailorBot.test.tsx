import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TailorBot from "@/app/components/neo/TailorBot";
import React from "react";

describe("TailorBot Component", () => {
  it("renders SVG mascot with accessible label", () => {
    render(<TailorBot state="idle" />);
    expect(screen.getByLabelText(/TailorBot MK-II/i)).toBeInTheDocument();
  });

  it("handles poke interaction click", () => {
    const onPoke = vi.fn();
    render(<TailorBot state="idle" onPoke={onPoke} />);
    const bot = screen.getByRole("button", { name: /Poke TailorBot/i });
    fireEvent.click(bot);
    expect(onPoke).toHaveBeenCalledTimes(1);
  });

  it("adapts visual state when celebrating", () => {
    const { container } = render(<TailorBot state="celebrating" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
