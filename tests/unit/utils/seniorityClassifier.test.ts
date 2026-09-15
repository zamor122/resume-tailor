import { describe, it, expect } from "vitest";
import {
  classifySeniorityTier,
  extractSuccessPillars,
  buildCareerArcContext,
} from "@/app/utils/seniorityClassifier";

describe("Universal Seniority & Success Pillar Classifier (REQ-UBI-01, REQ-EVT-01)", () => {
  it("classifies executive and director roles across healthcare and sales", () => {
    expect(classifySeniorityTier("Director of Clinical Operations", "Oversee $15M budget...")).toBe("executive");
    expect(classifySeniorityTier("VP of Sales", "Drive global enterprise revenue...")).toBe("executive");
  });

  it("classifies manager and lead roles across non-tech fields", () => {
    expect(classifySeniorityTier("Nurse Manager", "Lead 25 RNs across ICU unit...")).toBe("lead_manager");
    expect(classifySeniorityTier("Team Lead - Customer Success", "Manage team of 8...")).toBe("lead_manager");
  });

  it("classifies senior roles across marketing and engineering", () => {
    expect(classifySeniorityTier("Senior Brand Strategist", "Own brand campaigns...")).toBe("senior");
    expect(classifySeniorityTier("Senior Software Engineer", "Design distributed backend...")).toBe("senior");
  });

  it("classifies entry and mid roles accurately", () => {
    expect(classifySeniorityTier("Junior Financial Analyst", "Support monthly reporting...")).toBe("entry");
    expect(classifySeniorityTier("Marketing Specialist", "Execute email campaigns...")).toBe("mid");
  });

  it("extracts domain-agnostic success pillars from JD text", () => {
    const jd = "Seeking Nurse Manager to lead patient care coordination, maintain JCAHO clinical compliance, and manage department staffing budgets.";
    const pillars = extractSuccessPillars(jd, "Nurse Manager");
    expect(pillars.length).toBeGreaterThanOrEqual(2);
    expect(pillars.some((p) => /patient care|clinical compliance|budget|coordination/i.test(p))).toBe(true);
  });

  it("builds a concise 2-sentence career arc summary from experience AST", () => {
    const experience = [
      { company: "Mercy Hospital", title: "Clinical Nurse Specialist" },
      { company: "City Clinic", title: "Staff Nurse" },
    ];
    const arc = buildCareerArcContext(experience, "Clinical Operations");
    expect(arc).toContain("Mercy Hospital");
    expect(arc.length).toBeGreaterThan(20);
  });

  it("handles empty or missing inputs gracefully", () => {
    expect(classifySeniorityTier()).toBe("mid");
    expect(classifySeniorityTier("", "")).toBe("mid");
    expect(extractSuccessPillars("")).toEqual(["Operational Excellence", "Stakeholder Delivery"]);
    expect(buildCareerArcContext([])).toContain("Candidate possesses foundational experience");
  });

  it("classifies roles based on JD semantic markers when title is generic", () => {
    expect(classifySeniorityTier("Lead", "Responsible for executive leadership and board of directors")).toBe("executive");
    expect(classifySeniorityTier("Analyst", "Lead people management and direct reports")).toBe("lead_manager");
    expect(classifySeniorityTier("Specialist", "Senior-level strategic decision and cross-functional initiative")).toBe("senior");
  });

  it("extracts pillars across diverse domains: sales, finance, engineering", () => {
    const salesJd = "Drive B2B sales pipeline, quota attainment, and executive stakeholder client relationships.";
    const salesPillars = extractSuccessPillars(salesJd);
    expect(salesPillars).toContain("Revenue Generation & Pipeline Acceleration");
    expect(salesPillars).toContain("Client Relationship & Account Expansion");

    const engJd = "Design distributed system architecture for scalability, fault-tolerant reliability, and developer velocity CI/CD.";
    const engPillars = extractSuccessPillars(engJd);
    expect(engPillars).toContain("System Reliability & Architecture Scale");
    expect(engPillars).toContain("Delivery Velocity & Automation");
  });
});
