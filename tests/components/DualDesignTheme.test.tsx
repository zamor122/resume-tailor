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

describe("Dual-Design Theme System (Pomegranate & Warm Paper Risograph)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-design");
    document.body.removeAttribute("data-design");
  });

  it("defaults to Pomegranate and switches cleanly to Warm Paper Risograph with persistence", () => {
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

    const risoRadios = screen.getAllByRole("radio", { name: /Risograph/i });
    fireEvent.click(risoRadios[0]);

    expect(document.documentElement.getAttribute("data-design")).toBe(
      "risograph"
    );
    expect(window.localStorage.getItem(DESIGN_STORAGE_KEY)).toBe("risograph");
    expect(screen.getByText(/Tailor Studio/i)).toBeInTheDocument();

    const pomRadios = screen.getAllByRole("radio", { name: /Pomegranate/i });
    fireEvent.click(pomRadios[0]);

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

    fireEvent.click(screen.getByRole("radio", { name: /Risograph/i }));
    expect(screen.getByText("Tailor")).toBeInTheDocument();
  });
});
