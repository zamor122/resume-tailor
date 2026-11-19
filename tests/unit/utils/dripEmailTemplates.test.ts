import { describe, it, expect } from "vitest";
import { generateDripEmailContent, type DripStage } from "@/app/utils/dripEmailTemplates";

describe("dripEmailTemplates", () => {
  const stages: DripStage[] = ["24h", "48h", "72h", "7d", "30d"];

  it.each(stages)("generates valid content for stage %s", (stage) => {
    const result = generateDripEmailContent({
      stage,
      name: "Ryan Sheikh",
      email: "ryan.h.sheikh@gmail.com",
      avatarUrl: "https://example.com/avatar.jpg",
    });

    expect(result.stage).toBe(stage);
    expect(result.subject).toContain("Ryan");
    expect(result.html).toContain("Hey Ryan,");
    expect(result.html).toContain("ryan.h.sheikh@gmail.com");
    expect(result.html).toContain("FREE STARTER");
    expect(result.html).toContain("NO CARD NEEDED");
    expect(result.html).toContain("Shayne Zamora");
    expect(result.html).toContain("#FAF7F0");
    expect(result.html).toContain("#1C2028");
    expect(result.html).toContain("#FF5722");

    expect(result.text).toContain("Hey Ryan,");
    expect(result.text).toContain("CANDIDATE: Ryan Sheikh (ryan.h.sheikh@gmail.com)");
    expect(result.text).toContain("Shayne Zamora");
  });

  it("customizes specific product hooks per stage", () => {
    const stage24h = generateDripEmailContent({ stage: "24h", email: "candidate@test.com" });
    expect(stage24h.subject).toContain("45 seconds away");
    expect(stage24h.html).toContain("Instant ATS Match & Keyword Gap Scanner");

    const stage48h = generateDripEmailContent({ stage: "48h", email: "candidate@test.com" });
    expect(stage48h.subject).toContain("Change Studio");
    expect(stage48h.html).toContain("Side-by-Side Diff Cards & Recruiter Rationale");

    const stage72h = generateDripEmailContent({ stage: "72h", email: "candidate@test.com" });
    expect(stage72h.subject).toContain("free unlocked bullet");
    expect(stage72h.html).toContain("Google X-Y-Z Metric-Driven Transformation");

    const stage7d = generateDripEmailContent({ stage: "7d", email: "candidate@test.com" });
    expect(stage7d.subject).toContain("Tailor each one in 45s");
    expect(stage7d.html).toContain("Batch Customization at Machine Speed");

    const stage30d = generateDripEmailContent({ stage: "30d", email: "candidate@test.com" });
    expect(stage30d.subject).toContain("New roles just dropped");
    expect(stage30d.html).toContain("On-Demand Recruiter Match Diagnostic");
  });

  it("handles fallback avatar monogram when avatarUrl is absent", () => {
    const result = generateDripEmailContent({
      stage: "24h",
      name: "Sarah Connor",
      email: "sarah@future.com",
    });

    expect(result.html).toContain("SC");
    expect(result.html).not.toContain("<img src=");
  });
});
