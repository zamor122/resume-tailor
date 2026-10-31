import {
  buildIntensityInstruction,
  buildMetricsInstruction,
  buildSeniorityInstruction,
  buildLeverInstructions,
} from "@/app/prompts/tailoringPresets";
import { DEFAULT_PREFERENCES } from "@/app/types/tailoringPreferences";

describe("Tailoring Preferences & Controlling Levers", () => {
  test("buildIntensityInstruction generates correct prompt guidance per level", () => {
    const minimal = buildIntensityInstruction("minimal");
    expect(minimal).toContain("TRANSFORMATION SCOPE — MINIMAL");
    expect(minimal).toContain("1–2 bullet points");

    const targeted = buildIntensityInstruction("targeted");
    expect(targeted).toContain("TRANSFORMATION SCOPE — TARGETED");
    // REQ-EVT-02/REQ-STA-01: the planner now dispatches every job chunk with 1:1 bullet mapping, so the
    // targeted lever must NOT restate the old 3–5-bullet cap (it capped production coverage).
    expect(targeted).toContain("EVERY bullet supplied");
    expect(targeted).not.toContain("3–5");

    const overhaul = buildIntensityInstruction("overhaul");
    expect(overhaul).toContain("TRANSFORMATION SCOPE — COMPLETE OVERHAUL");
    expect(overhaul).toContain("CRITICAL AUTHENTICITY GUARDRAIL");
  });

  test("buildMetricsInstruction generates correct prompt guidance per mode", () => {
    const strict = buildMetricsInstruction("strict");
    expect(strict).toContain("STRICT (KEEP ORIGINAL NUMBERS ONLY)");

    const placeholders = buildMetricsInstruction("placeholders");
    expect(placeholders).toContain("SMART PLACEHOLDERS [X%]");
    expect(placeholders).toContain("bracketed placeholder");

    const benchmarks = buildMetricsInstruction("benchmarks");
    expect(benchmarks).toContain("INDUSTRY KPI BENCHMARKS");
  });

  test("buildSeniorityInstruction generates correct prompt guidance per level", () => {
    const mid = buildSeniorityInstruction("mid");
    expect(mid).toContain("MID-LEVEL");

    const senior = buildSeniorityInstruction("senior");
    expect(senior).toContain("SENIOR / STAFF");

    const executive = buildSeniorityInstruction("executive");
    expect(executive).toContain("LEAD / EXECUTIVE");
  });

  test("buildLeverInstructions composes all three dimensions", () => {
    const combined = buildLeverInstructions(DEFAULT_PREFERENCES);
    expect(combined).toContain("TRANSFORMATION SCOPE");
    expect(combined).toContain("METRICS MODE");
    expect(combined).toContain("SENIORITY FRAMING");
  });
});
