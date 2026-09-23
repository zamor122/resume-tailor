import { describe, it, expect } from "vitest";
import { getExperienceBulletsPrompt } from "@/app/prompts/tailoringSection";
import { getDomainTaxonomy } from "@/app/config/domainTaxonomy";
import type { JobRoleKnowledge } from "@/app/services/jobKnowledge";

describe("Universal Domain-Calibrated Experience Prompting (REQ-UNI-01 through REQ-UNI-05)", () => {
  const baseParams = {
    jobTitle: "Nurse Manager",
    company: "Mercy Hospital",
    dates: "2021 - Present",
    bulletsText: "- Supervised 24 staff nurses in acute cardiac care unit\n- Monitored patient intake and compliance workflows",
    jobDescription: "Leading inpatient acute care unit with focus on patient throughput and clinical quality.",
  };

  it("injects healthcare-native verbs and authentic clinical metrics for healthcare roles", () => {
    const healthcareTaxonomy = getDomainTaxonomy("healthcare");
    const healthcareKnowledge: JobRoleKnowledge = {
      canonicalTitle: "Nurse Manager / Clinical Lead",
      industryCategory: "healthcare",
      powerVerbs: ["Triaged", "Administered", "Standardized", "Coordinated"],
      authenticMetricTypes: ["Patient panel size", "Bed turnover time", "Medication error rate"],
      coreCompetencies: ["Clinical Quality", "Staff Scheduling"],
    };

    const prompt = getExperienceBulletsPrompt({
      ...baseParams,
      domainTaxonomy: healthcareTaxonomy,
      jobKnowledge: healthcareKnowledge,
    });

    // Healthcare verbs injected
    expect(prompt).toContain("Triaged");
    expect(prompt).toContain("Administered");

    // Authentic metrics injected
    expect(prompt).toContain("Patient panel size");
    expect(prompt).toContain("Bed turnover");

    // Strictly bans tech jargon on non-tech roles
    expect(prompt).toMatch(/DO NOT use software-engineering or tech jargon/i);

    // Google X-Y-Z framework
    expect(prompt).toContain("Accomplished [X], as measured by [Y], by doing [Z]");

    // Distinct opening verbs mandate
    expect(prompt).toContain("NEVER repeat the same opening verb");
  });

  it("injects trades/facilities-native verbs and metrics for custodial/facilities roles", () => {
    const facilitiesTaxonomy = getDomainTaxonomy("trades_facilities");
    const facilitiesKnowledge: JobRoleKnowledge = {
      canonicalTitle: "Facilities Custodian & Maintenance Specialist",
      industryCategory: "trades_facilities",
      powerVerbs: ["Sanitized", "Disinfected", "Maintained", "Inspected", "Restored"],
      authenticMetricTypes: ["Square footage cleaned", "Inspection pass rate", "Chemical safety compliance"],
      coreCompetencies: ["OSHA Compliance", "Preventive Maintenance"],
    };

    const prompt = getExperienceBulletsPrompt({
      jobTitle: "Lead Custodian",
      company: "West High School",
      dates: "2019 - Present",
      bulletsText: "- Cleaned classrooms and hallways\n- Managed maintenance requests",
      jobDescription: "Maintain high sanitation standards across 120,000 sq ft campus.",
      domainTaxonomy: facilitiesTaxonomy,
      jobKnowledge: facilitiesKnowledge,
    });

    expect(prompt).toContain("Sanitized");
    expect(prompt).toContain("Maintained");
    expect(prompt).toContain("Square footage");
    expect(prompt).toMatch(/DO NOT use software-engineering or tech jargon/i);
  });

  it("strictly bans passive and subordinate openers across all domains", () => {
    const prompt = getExperienceBulletsPrompt(baseParams);

    const passiveOpeners = [
      "Responsible for",
      "Assisted with",
      "Helped",
      "Worked on",
      "Participated in",
      "Handled",
      "Supported",
    ];

    for (const phrase of passiveOpeners) {
      expect(prompt).toContain(phrase);
    }
    expect(prompt).toContain("BAN WEAK & PASSIVE PHRASING");
  });

  it("injects technology-engineering verbs when category is tech", () => {
    const techTaxonomy = getDomainTaxonomy("technology_engineering");
    const prompt = getExperienceBulletsPrompt({
      jobTitle: "Senior Software Engineer",
      company: "Acme Corp",
      dates: "2020 - Present",
      bulletsText: "- Built distributed backend services\n- Improved system latency",
      jobDescription: "Hiring distributed systems engineer to scale microservices.",
      domainTaxonomy: techTaxonomy,
    });

    expect(prompt).toContain("Architected");
    expect(prompt).toContain("Engineered");
    // Should NOT ban tech jargon for tech roles
    expect(prompt).not.toMatch(/DO NOT use software-engineering or tech jargon/i);
  });
});
