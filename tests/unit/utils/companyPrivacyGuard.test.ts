import { describe, it, expect } from "vitest";
import { sanitizeCompanyReferences, extractVettedEmployers } from "@/app/utils/companyPrivacyGuard";

describe("Company Privacy Guard (REQ-UBI-02, REQ-ERR-01)", () => {
  const vettedEmployers = ["Acme Health", "St. Jude Clinic"];

  describe("extractVettedEmployers", () => {
    it("extracts vetted employers cleanly from experience AST", () => {
      const experience = [
        { company: "Acme Health", title: "Nurse Manager" },
        { company: "St. Jude Clinic", title: "Staff RN" },
      ];
      const employers = extractVettedEmployers(experience);
      expect(employers).toEqual(["Acme Health", "St. Jude Clinic"]);
    });

    it("handles undefined, empty, or whitespace-only company entries", () => {
      expect(extractVettedEmployers(undefined)).toEqual([]);
      expect(extractVettedEmployers([])).toEqual([]);
      expect(extractVettedEmployers([{ company: "   " }, { company: "A" }])).toEqual([]);
    });

    it("deduplicates company names across roles and trims whitespace", () => {
      const experience = [
        { company: "Acme Health ", title: "Director" },
        { company: "Acme Health", title: "Manager" },
        { company: "St. Jude Clinic", title: "Nurse" },
      ];
      expect(extractVettedEmployers(experience)).toEqual(["Acme Health", "St. Jude Clinic"]);
    });
  });

  describe("sanitizeCompanyReferences", () => {
    it("permits vetted employers that the candidate actually worked for", () => {
      const text = "Led nursing staff at Acme Health during EHR transition.";
      const cleaned = sanitizeCompanyReferences(text, vettedEmployers, "Kaiser Permanente");
      expect(cleaned).toBe("Led nursing staff at Acme Health during EHR transition.");
    });

    it("permits target company if candidate actually worked there (vetted)", () => {
      const text = "Led clinical initiatives at Acme Health during EHR transition.";
      const cleaned = sanitizeCompanyReferences(text, vettedEmployers, "Acme Health");
      expect(cleaned).toBe("Led clinical initiatives at Acme Health during EHR transition.");
    });

    it("scrubs the target company name if it leaks into a bullet", () => {
      const text = "Spearheaded clinical compliance protocols tailored for Kaiser Permanente oncology ward.";
      const cleaned = sanitizeCompanyReferences(text, vettedEmployers, "Kaiser Permanente");
      expect(cleaned).not.toContain("Kaiser Permanente");
      expect(cleaned).toContain("the organization");
    });

    it("scrubs bare mentions of the target company name", () => {
      const text = "Optimized patient intake workflows across Kaiser Permanente facilities.";
      const cleaned = sanitizeCompanyReferences(text, vettedEmployers, "Kaiser Permanente");
      expect(cleaned).not.toContain("Kaiser Permanente");
      expect(cleaned).toContain("the organization");
    });

    it("scrubs unvetted external employers not present in candidate history", () => {
      const text = "Collaborated with Mayo Clinic partners on triage protocols.";
      const cleaned = sanitizeCompanyReferences(text, vettedEmployers, "Kaiser Permanente");
      expect(cleaned).not.toContain("Mayo Clinic");
      expect(cleaned).toContain("external partners");
    });

    it("handles empty or falsy text gracefully", () => {
      expect(sanitizeCompanyReferences("", vettedEmployers, "Kaiser Permanente")).toBe("");
      expect(sanitizeCompanyReferences("   ", vettedEmployers)).toBe("");
    });
  });
});
