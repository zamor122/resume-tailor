import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import NeoButton from "@/app/components/neo/NeoButton";
import NeoCard from "@/app/components/neo/NeoCard";
import NeoBadge from "@/app/components/neo/NeoBadge";
import NeoGauge from "@/app/components/neo/NeoGauge";
import React from "react";

describe("Neo Primitives", () => {
  it("renders NeoButton with tactile classes and handles click", () => {
    const onClick = vi.fn();
    render(
      <NeoButton variant="orange" onClick={onClick}>
        Activate Console
      </NeoButton>
    );
    const btn = screen.getByRole("button", { name: /Activate Console/i });
    expect(btn).toHaveClass("neo-btn");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
  });

  it("renders NeoCard with children", () => {
    render(
      <NeoCard>
        <p>Telemetry Card</p>
      </NeoCard>
    );
    expect(screen.getByText("Telemetry Card")).toBeInTheDocument();
  });

  it("renders NeoBadge with variant styling", () => {
    render(<NeoBadge variant="green">Online</NeoBadge>);
    expect(screen.getByText("Online")).toHaveClass("neo-tag");
  });

  it("renders NeoGauge with numeric score and label", () => {
    render(<NeoGauge score={94} label="Recruiter Ready" />);
    expect(screen.getByText("94")).toBeInTheDocument();
    expect(screen.getByText("Recruiter Ready")).toBeInTheDocument();
  });
});
