import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveCanonicalTitle,
  getOrSynthesizeJobKnowledge,
  type JobRoleKnowledge,
} from "@/app/services/jobKnowledge";
import { supabaseAdmin } from "@/app/lib/supabase/server";

vi.mock("@/app/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock("@/app/services/model-fallback", () => ({
  generateWithFallback: vi.fn(),
}));

describe("Job Knowledge & Canonical Resolver Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveCanonicalTitle", () => {
    it("maps clinical and nursing variations to standard canonical titles", () => {
      expect(resolveCanonicalTitle("Nursing Lead", "healthcare")).toBe("Nurse Manager / Clinical Lead");
      expect(resolveCanonicalTitle("Charge Nurse", "healthcare")).toBe("Nurse Manager / Clinical Lead");
      expect(resolveCanonicalTitle("ICU Staff Nurse", "healthcare")).toBe("Registered Nurse (Acute Care)");
    });

    it("maps hospitality titles to standard canonical titles", () => {
      expect(resolveCanonicalTitle("Server", "hospitality_service")).toBe("Restaurant Server / Food & Beverage Host");
      expect(resolveCanonicalTitle("Line Cook", "hospitality_service")).toBe("Line Cook / Culinary Specialist");
    });

    it("maps facilities and custodial titles to standard canonical titles", () => {
      expect(resolveCanonicalTitle("Janitor", "trades_facilities")).toBe("Facilities Custodian & Maintenance Specialist");
      expect(resolveCanonicalTitle("Night Custodian", "trades_facilities")).toBe("Facilities Custodian & Maintenance Specialist");
    });

    it("maps aviation titles to standard canonical titles", () => {
      expect(resolveCanonicalTitle("Captain - Boeing 737", "aviation_aerospace")).toBe("Commercial Airline Pilot / Flight Commander");
      expect(resolveCanonicalTitle("First Officer", "aviation_aerospace")).toBe("Commercial Airline Pilot / Flight Commander");
    });

    it("falls back to sanitized title when role is already canonical or unmapped", () => {
      expect(resolveCanonicalTitle("Director of Strategic Initiatives", "general_business")).toBe("Director of Strategic Initiatives");
    });
  });

  describe("getOrSynthesizeJobKnowledge", () => {
    it("retrieves cached knowledge from Supabase when available (cache hit)", async () => {
      const mockRecord = {
        canonical_title: "Nurse Manager / Clinical Lead",
        industry_category: "healthcare",
        power_verbs: ["Triaged", "Administered", "Standardized"],
        authentic_metric_types: ["Patient panel size", "Bed turnover"],
        core_competencies: ["Clinical Quality", "Staff Scheduling"],
      };

      vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      } as any);

      const knowledge = await getOrSynthesizeJobKnowledge({
        title: "Nurse Manager",
        jobDescription: "Leading nursing staff in a 300-bed hospital.",
      });

      expect(knowledge).toBeDefined();
      expect(knowledge.canonicalTitle).toBe("Nurse Manager / Clinical Lead");
      expect(knowledge.industryCategory).toBe("healthcare");
      expect(knowledge.powerVerbs).toContain("Triaged");
      expect(knowledge.authenticMetricTypes).toContain("Patient panel size");
    });

    it("synthesizes role knowledge using domain taxonomy when Supabase yields no records (cache miss)", async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      const knowledge = await getOrSynthesizeJobKnowledge({
        title: "Commercial Airline Pilot",
        jobDescription: "Flying Boeing 737 passenger flights.",
      });

      expect(knowledge).toBeDefined();
      expect(knowledge.industryCategory).toBe("aviation_aerospace");
      expect(knowledge.powerVerbs).toContain("Commanded");
      expect(knowledge.authenticMetricTypes.some((m) => m.toLowerCase().includes("flight hours"))).toBe(true);
    });

    it("gracefully falls back to domain taxonomy defaults if Supabase throws an error", async () => {
      vi.mocked(supabaseAdmin.from).mockImplementation(() => {
        throw new Error("Supabase connection timeout");
      });

      const knowledge = await getOrSynthesizeJobKnowledge({
        title: "Facilities Custodian",
        jobDescription: "Cleaning school grounds.",
      });

      expect(knowledge).toBeDefined();
      expect(knowledge.industryCategory).toBe("trades_facilities");
      expect(knowledge.powerVerbs).toContain("Sanitized");
    });
  });
});
