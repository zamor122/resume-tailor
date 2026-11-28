import { describe, it, expect } from "vitest";
import {
  AI_TOOL_REGISTRY,
  getRecommendedToolsForResume,
  isRoleRecentForAi,
  resolveVerifiedTools,
} from "@/app/config/aiToolRegistry";
import { getFutureproofVariant } from "@/app/config/futureproofVariants";
import { DOMAIN_TAXONOMIES, type IndustryCategory } from "@/app/config/domainTaxonomy";

describe("Futureproof AI Tool Registry", () => {
  it("provides at least 2 industry-standard tools for every IndustryCategory", () => {
    const categories = Object.keys(DOMAIN_TAXONOMIES) as IndustryCategory[];
    for (const category of categories) {
      const standards = AI_TOOL_REGISTRY.filter(
        (t) => t.category === category && t.isIndustryStandard
      );
      expect(standards.length).toBeGreaterThanOrEqual(2);
      for (const tool of standards) {
        expect(tool.complianceBadges.length).toBeGreaterThan(0);
        expect(tool.interviewTalkingPoint.length).toBeGreaterThan(30);
        expect(tool.workflowUseCases.length).toBeGreaterThan(0);
      }
    }
  });

  it("recommends HIPAA-compliant ambient clinical scribes for a physician resume", () => {
    const doctorResume = `
      Dr. Elena Vance, MD
      Attending Physician — Internal Medicine | St. Jude Medical Center (2020 - Present)
      - Manage outpatient panel of 500+ primary care patients using Epic EHR
      - Conduct 22 daily patient encounters, SOAP documentation, and chronic care coordination
    `;
    const result = getRecommendedToolsForResume({ resumeText: doctorResume });
    expect(result.industry).toBe("healthcare");
    const ids = result.tools.map((t) => t.id);
    expect(ids).toContain("nuance-dax-copilot");
    expect(ids).toContain("abridge-clinical");
    expect(result.tools.filter((t) => t.preselected).length).toBe(2);
  });

  it("recommends Claude Enterprise, Microsoft 365 Copilot, and Zapier AI for an administrative assistant", () => {
    const adminResume = `
      Jordan Blake
      Senior Executive Administrative Assistant | Acme Corp (2021 - Present)
      - Manage complex C-suite calendars, board meeting agendas, travel logistics, and vendor coordination
      - Prepare executive briefings, standardize office SOPs, and triage incoming leadership email
    `;
    const result = getRecommendedToolsForResume({ resumeText: adminResume });
    expect(result.industry).toBe("general_business");
    const ids = result.tools.map((t) => t.id);
    expect(ids).toContain("claude-enterprise-cowork");
    expect(ids).toContain("microsoft-365-copilot");
    expect(ids).toContain("zapier-ai-automation");
  });

  it("guards timelines so pre-2023 roles are flagged as not recent for modern AI tools", () => {
    expect(isRoleRecentForAi("2021 - Present")).toBe(true);
    expect(isRoleRecentForAi("Jan 2023 - Aug 2025")).toBe(true);
    expect(isRoleRecentForAi("2017 - 2020")).toBe(false);
    expect(isRoleRecentForAi("2015 - 2022")).toBe(false);
  });

  it("auto-selects verified industry standards when useIndustryStandards is true or IDs are unknown", () => {
    const adminResume =
      "Executive Administrative Assistant managing calendars, SOPs, and executive correspondence (2022 - Present).";

    const autoSelected = resolveVerifiedTools({
      resumeText: adminResume,
      useIndustryStandards: true,
    });
    expect(autoSelected.tools.length).toBeGreaterThanOrEqual(2);
    expect(autoSelected.tools.every((t) => t.isIndustryStandard)).toBe(true);

    const unknownFallback = resolveVerifiedTools({
      resumeText: adminResume,
      selectedToolIds: ["fake-hallucinated-tool-9000"],
      useIndustryStandards: false,
    });
    expect(unknownFallback.tools.every((t) => t.id !== "fake-hallucinated-tool-9000")).toBe(
      true
    );
    expect(unknownFallback.tools.length).toBeGreaterThanOrEqual(2);
  });

  it("resolves dynamic ad-matched hero variants for ?role=doctor, ?role=admin, and unknown fallback", () => {
    const doctor = getFutureproofVariant("doctor");
    expect(doctor.headline).toContain("HIPAA-Compliant");
    const admin = getFutureproofVariant("ADMIN");
    expect(admin.headline).toContain("Claude Enterprise");
    const fallback = getFutureproofVariant("unknown-role");
    expect(fallback.key).toBe("default");
  });

  it("classifies a paralegal resume mentioning case management software as legal_compliance", () => {
    const paralegalResume = `
      LEGAL ASSISTANT | PARALEGAL | LITIGATION SUPPORT
      Detail-oriented Paralegal with experience in Small Claims Court filings, CanLII legal research,
      and client file management using Clio legal software and Microsoft Office software.
    `;
    const result = getRecommendedToolsForResume({ resumeText: paralegalResume });
    expect(result.industry).toBe("legal_compliance");
  });
});
