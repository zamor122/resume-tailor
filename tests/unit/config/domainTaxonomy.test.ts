import { describe, it, expect } from "vitest";
import {
  detectIndustryCategory,
  getDomainTaxonomy,
  type IndustryCategory,
} from "@/app/config/domainTaxonomy";

describe("Domain Taxonomy & Industry Calibration Engine", () => {
  describe("detectIndustryCategory", () => {
    const testCases: Array<{ title: string; expected: IndustryCategory }> = [
      // Healthcare
      { title: "Nurse Manager", expected: "healthcare" },
      { title: "Registered Nurse (RN)", expected: "healthcare" },
      { title: "Physician / Hospitalist", expected: "healthcare" },
      { title: "Medical Assistant", expected: "healthcare" },

      // Hospitality & Food Service
      { title: "Restaurant Server / Waiter", expected: "hospitality_service" },
      { title: "Head Bartender", expected: "hospitality_service" },
      { title: "Executive Chef", expected: "hospitality_service" },

      // Trades & Facilities
      { title: "Facilities Custodian", expected: "trades_facilities" },
      { title: "Lead Janitor", expected: "trades_facilities" },
      { title: "HVAC Maintenance Technician", expected: "trades_facilities" },

      // Aviation & Aerospace
      { title: "Commercial Airline Pilot (Captain)", expected: "aviation_aerospace" },
      { title: "First Officer - Boeing 737", expected: "aviation_aerospace" },
      { title: "Flight Attendant", expected: "aviation_aerospace" },

      // Education & Coaching
      { title: "Varsity Basketball Coach", expected: "education_coaching" },
      { title: "High School Biology Teacher", expected: "education_coaching" },
      { title: "Athletic Director", expected: "education_coaching" },

      // Finance & Accounting
      { title: "Senior Accountant", expected: "finance_accounting" },
      { title: "Financial Analyst", expected: "finance_accounting" },
      { title: "Staff Auditor", expected: "finance_accounting" },

      // Sales & Marketing
      { title: "Enterprise Account Executive", expected: "sales_marketing" },
      { title: "VP of Sales & Business Development", expected: "sales_marketing" },
      { title: "Growth Marketing Specialist", expected: "sales_marketing" },

      // Operations & Logistics
      { title: "Supply Chain Manager", expected: "operations_logistics" },
      { title: "Warehouse Logistics Supervisor", expected: "operations_logistics" },

      // Legal & Compliance
      { title: "Corporate Counsel", expected: "legal_compliance" },
      { title: "Paralegal Specialist", expected: "legal_compliance" },

      // Technology & Engineering
      { title: "Staff Backend Engineer", expected: "technology_engineering" },
      { title: "DevOps Engineer", expected: "technology_engineering" },

      // Fallback
      { title: "General Coordinator", expected: "general_business" },
    ];

    testCases.forEach(({ title, expected }) => {
      it(`detects "${title}" as category "${expected}"`, () => {
        expect(detectIndustryCategory(title)).toBe(expected);
      });
    });

    it("uses job description context when title is generic", () => {
      const category = detectIndustryCategory(
        "Operations Specialist",
        "Responsibilities include scheduling surgical suites, coordinating patient intake, and maintaining HIPAA compliance."
      );
      expect(category).toBe("healthcare");
    });
  });

  describe("getDomainTaxonomy", () => {
    it("returns healthcare-specific action verbs and authentic metric dimensions", () => {
      const taxonomy = getDomainTaxonomy("healthcare");
      expect(taxonomy.category).toBe("healthcare");
      expect(taxonomy.primaryVerbs).toContain("Triaged");
      expect(taxonomy.primaryVerbs).toContain("Administered");
      expect(taxonomy.primaryVerbs).not.toContain("Refactored");
      expect(taxonomy.authenticMetricExamples.some((m) => m.toLowerCase().includes("patient"))).toBe(true);
    });

    it("returns aviation-specific action verbs and authentic metric dimensions", () => {
      const taxonomy = getDomainTaxonomy("aviation_aerospace");
      expect(taxonomy.category).toBe("aviation_aerospace");
      expect(taxonomy.primaryVerbs).toContain("Commanded");
      expect(taxonomy.primaryVerbs).toContain("Navigated");
      expect(taxonomy.authenticMetricExamples.some((m) => m.toLowerCase().includes("flight"))).toBe(true);
    });

    it("returns facilities-specific action verbs and authentic metric dimensions", () => {
      const taxonomy = getDomainTaxonomy("trades_facilities");
      expect(taxonomy.category).toBe("trades_facilities");
      expect(taxonomy.primaryVerbs).toContain("Sanitized");
      expect(taxonomy.primaryVerbs).toContain("Maintained");
      expect(taxonomy.authenticMetricExamples.some((m) => m.toLowerCase().includes("square feet") || m.toLowerCase().includes("osha"))).toBe(true);
    });

    it("returns hospitality-specific action verbs and authentic metric dimensions", () => {
      const taxonomy = getDomainTaxonomy("hospitality_service");
      expect(taxonomy.category).toBe("hospitality_service");
      expect(taxonomy.primaryVerbs).toContain("Delivered");
      expect(taxonomy.primaryVerbs).toContain("Coordinated");
      expect(taxonomy.authenticMetricExamples.some((m) => m.toLowerCase().includes("covers") || m.toLowerCase().includes("ticket"))).toBe(true);
    });

    it("returns general business fallback for invalid or undefined categories", () => {
      const taxonomy = getDomainTaxonomy("unknown_category" as any);
      expect(taxonomy.category).toBe("general_business");
      expect(taxonomy.primaryVerbs.length).toBeGreaterThan(0);
    });
  });
});
