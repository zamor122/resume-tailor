import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { GamificationProvider, useGamification } from "@/app/contexts/GamificationContext";
import React from "react";

describe("GamificationContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes with default state", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <GamificationProvider>{children}</GamificationProvider>
    );
    const { result } = renderHook(() => useGamification(), { wrapper });
    expect(result.current.streak).toBeGreaterThanOrEqual(1);
    expect(result.current.xp).toBeGreaterThanOrEqual(0);
    expect(result.current.level).toBeGreaterThanOrEqual(1);
  });

  it("awards XP and calculates level up correctly", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <GamificationProvider initialXp={0}>{children}</GamificationProvider>
    );
    const { result } = renderHook(() => useGamification(), { wrapper });
    act(() => {
      result.current.awardXp(600);
    });
    expect(result.current.xp).toBe(600);
    expect(result.current.level).toBe(3); // Level 3 >= 500 XP
  });

  it("toggles audio SFX setting and persists", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <GamificationProvider>{children}</GamificationProvider>
    );
    const { result } = renderHook(() => useGamification(), { wrapper });
    const initial = result.current.sfxEnabled;
    act(() => {
      result.current.toggleSfx();
    });
    expect(result.current.sfxEnabled).toBe(!initial);
  });

  it("awards XP when reading an article and avoids double-counting same slug", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <GamificationProvider initialXp={0}>{children}</GamificationProvider>
    );
    const { result } = renderHook(() => useGamification(), { wrapper });

    let firstReadSuccess = false;
    act(() => {
      firstReadSuccess = result.current.readArticle("ats-keywords-guide", "ATS Keywords");
    });
    expect(firstReadSuccess).toBe(true);
    expect(result.current.xp).toBe(25);
    expect(result.current.readArticleSlugs).toContain("ats-keywords-guide");

    // Second read of same article should return false and not add duplicate XP
    let secondReadSuccess = true;
    act(() => {
      secondReadSuccess = result.current.readArticle("ats-keywords-guide", "ATS Keywords");
    });
    expect(secondReadSuccess).toBe(false);
    expect(result.current.xp).toBe(25);
  });

  it("awards +5 XP for poking TailorBot up to daily limit", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <GamificationProvider initialXp={0}>{children}</GamificationProvider>
    );
    const { result } = renderHook(() => useGamification(), { wrapper });

    act(() => {
      result.current.pokeMascot();
      result.current.pokeMascot();
    });
    expect(result.current.xp).toBe(10);
  });
});
