import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import {
  ThemeProvider,
  DESIGN_STORAGE_KEY,
} from "@/app/components/ThemeProvider";
import DesignSwitcher from "@/app/components/DesignSwitcher";
import Footer from "@/app/components/Footer";
import MobileBottomNav from "@/app/components/MobileBottomNav";

describe("Dual-Design Theme System (Modern & Classic)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-design");
    document.body.removeAttribute("data-design");
  });

  it("defaults to Modern (pomegranate) and switches cleanly to Classic (risograph) with persistence", () => {
    render(
      <ThemeProvider>
        <DesignSwitcher variant="compact" />
        <Footer />
      </ThemeProvider>
    );

    expect(document.documentElement.getAttribute("data-design")).toBe(
      "pomegranate"
    );
    expect(screen.getByText("AI Resume Tailor")).toBeInTheDocument();

    const classicRadio = screen.getByRole("radio", { name: /Classic/i });
    fireEvent.click(classicRadio);

    expect(document.documentElement.getAttribute("data-design")).toBe(
      "risograph"
    );
    expect(window.localStorage.getItem(DESIGN_STORAGE_KEY)).toBe("risograph");
    expect(screen.getByText("Tailor Studio")).toBeInTheDocument();

    const modernRadio = screen.getByRole("radio", { name: /Modern/i });
    fireEvent.click(modernRadio);

    expect(document.documentElement.getAttribute("data-design")).toBe(
      "pomegranate"
    );
    expect(window.localStorage.getItem(DESIGN_STORAGE_KEY)).toBe("pomegranate");
  });

  it("renders MobileBottomNav with accessible current-page semantics in both designs", () => {
    render(
      <ThemeProvider>
        <DesignSwitcher variant="compact" />
        <MobileBottomNav />
      </ThemeProvider>
    );

    expect(
      screen.getByRole("navigation", { name: /Mobile quick navigation/i })
    ).toBeInTheDocument();
    expect(screen.getByText("TAILOR")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Classic/i }));
    expect(screen.getByText("Tailor")).toBeInTheDocument();
  });
});
