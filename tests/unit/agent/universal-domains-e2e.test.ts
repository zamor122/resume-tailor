import { describe, it, expect, vi, beforeEach } from "vitest";
import { candidateProfilerNode } from "@/app/agent/nodes/candidateProfiler";
import { surgicalTailorNode } from "@/app/agent/nodes/surgicalTailor";
import type { AgentState } from "@/app/agent/state";
import { DEFAULT_PREFERENCES } from "@/app/types/tailoringPreferences";
import { generateWithFallback } from "@/app/services/model-fallback";

vi.mock("@/app/services/model-fallback", () => ({
  generateWithFallback: vi.fn(),
}));

vi.mock("@/app/services/jev", () => ({
  diagnoseChunkWithJev: vi.fn().mockResolvedValue({
    enhancementFocus: "Domain-aligned excellence",
    missingSkills: ["Domain Skill"],
    seniorityScore: 4,
  }),
  judgeSuggestionWithJev: vi.fn().mockResolvedValue({
    isAuthentic: true,
    isBetterThanOriginal: true,
    scoreDeltaPercent: 15,
    overallImpactScore: 4,
  }),
}));

describe("Universal Multi-Industry End-to-End Suite (REQ-UNI-01 through REQ-UNI-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const BANNED_TECH_JARGON = [
    "\\barchitected\\b",
    "\\brefactored\\b",
    "\\bmicroservices\\b",
    "\\bcodebase\\b",
    "\\bfull stack\\b",
  ];

  const BANNED_PASSIVE_OPENERS = [
    "^responsible for\\b",
    "^assisted with\\b",
    "^helped with\\b",
    "^worked on\\b",
    "^participated in\\b",
  ];

  const rolesToTest = [
    {
      domain: "Healthcare",
      title: "Nurse Manager",
      company: "Mercy General Hospital",
      jd: "Hospital acute care unit seeking Clinical Nurse Manager to oversee patient triage and nurse staffing.",
      profileMock: {
        primaryTitle: "Nurse Manager",
        seniorityLevel: "lead_manager",
        topSkills: ["Patient Triage", "Staff Scheduling"],
        domain: "Healthcare",
        searchQuery: "Nurse Manager hospital",
      },
      originalBullets: "- Responsible for supervising 20 nurses\n- Assisted with patient intake",
      expectedCategory: "healthcare",
      expectedCanonical: "Nurse Manager / Clinical Lead",
      expectedVerbs: ["Triaged", "Administered", "Standardized"],
      suggestedBullets: [
        {
          index: 0,
          originalText: "Responsible for supervising 20 nurses",
          suggestedText: "Coordinated 20 acute care nurses across a 40-bed clinical floor, maintaining full shift coverage.",
          status: "enhanced",
          reason: "Active ownership verb with clinical bed capacity metric",
        },
        {
          index: 1,
          originalText: "Assisted with patient intake",
          suggestedText: "Triaged patient admissions and accelerated bed turnover across 40 inpatient beds, reducing intake backlog.",
          status: "enhanced",
          reason: "Clinical triage verb and authentic operational metric",
        },
      ],
    },
    {
      domain: "Hospitality",
      title: "Restaurant Server",
      company: "Bistro Lumiere",
      jd: "High-volume fine dining bistro hiring experienced Head Server for table section management and guest wine pairing.",
      profileMock: {
        primaryTitle: "Restaurant Server",
        seniorityLevel: "mid",
        topSkills: ["Table Service", "Wine Pairing", "POS Systems"],
        domain: "Hospitality",
        searchQuery: "Restaurant Server fine dining",
      },
      originalBullets: "- Responsible for serving food and beverages\n- Helped bus tables during rush",
      expectedCategory: "hospitality_service",
      expectedCanonical: "Restaurant Server / Food & Beverage Host",
      expectedVerbs: ["Delivered", "Curated", "Upsold"],
      suggestedBullets: [
        {
          index: 0,
          originalText: "Responsible for serving food and beverages",
          suggestedText: "Managed high-volume 6-table dining station serving 80+ covers nightly, guiding guests through curated wine pairings.",
          status: "enhanced",
          reason: "Hospitality ownership with authentic covers metric",
        },
        {
          index: 1,
          originalText: "Helped bus tables during rush",
          suggestedText: "Expedited table turns and synchronized floor service during peak dinner rushes, sustaining 98% positive guest feedback.",
          status: "enhanced",
          reason: "Turnover metric and active hospitality verb",
        },
      ],
    },
    {
      domain: "Facilities",
      title: "School Janitor",
      company: "Lincoln Middle School",
      jd: "Public school district hiring head custodian to maintain sanitation standards across 90,000 sq ft facilities.",
      profileMock: {
        primaryTitle: "School Janitor",
        seniorityLevel: "mid",
        topSkills: ["Sanitation", "Floor Buffing", "OSHA Safety"],
        domain: "Facilities",
        searchQuery: "School Custodian Janitor",
      },
      originalBullets: "- Responsible for cleaning floors\n- Assisted maintenance with repairs",
      expectedCategory: "trades_facilities",
      expectedCanonical: "Facilities Custodian & Maintenance Specialist",
      expectedVerbs: ["Sanitized", "Maintained", "Inspected"],
      suggestedBullets: [
        {
          index: 0,
          originalText: "Responsible for cleaning floors",
          suggestedText: "Sanitized and maintained 90,000 sq ft of instructional facilities, executing daily OSHA-compliant floor care.",
          status: "enhanced",
          reason: "Square footage scale with custodial sanitation verb",
        },
        {
          index: 1,
          originalText: "Assisted maintenance with repairs",
          suggestedText: "Resolved 25+ weekly work orders and conducted preventative HVAC inspections, minimizing classroom downtime.",
          status: "enhanced",
          reason: "Concrete work order volume metric",
        },
      ],
    },
    {
      domain: "Aviation",
      title: "Commercial Airline Pilot",
      company: "Skyline Airways",
      jd: "Regional airline hiring Boeing 737 Captain to command scheduled passenger routes with uncompromising safety.",
      profileMock: {
        primaryTitle: "Commercial Airline Pilot",
        seniorityLevel: "senior",
        topSkills: ["Boeing 737", "FAA Part 121", "Crew Resource Management"],
        domain: "Aviation",
        searchQuery: "Commercial Airline Pilot B737 Captain",
      },
      originalBullets: "- Responsible for flying passenger planes\n- Helped copilot with checklists",
      expectedCategory: "aviation_aerospace",
      expectedCanonical: "Commercial Airline Pilot / Flight Commander",
      expectedVerbs: ["Commanded", "Navigated", "Executed"],
      suggestedBullets: [
        {
          index: 0,
          originalText: "Responsible for flying passenger planes",
          suggestedText: "Commanded 650+ scheduled Boeing 737 flight hours under FAA Part 121, maintaining a 99.4% on-time flight record.",
          status: "enhanced",
          reason: "Aviation command verb with flight hours metric",
        },
        {
          index: 1,
          originalText: "Helped copilot with checklists",
          suggestedText: "Executed rigorous pre-flight safety protocols and cockpit Crew Resource Management with zero FAA safety discrepancies.",
          status: "enhanced",
          reason: "FAA compliance audit metric",
        },
      ],
    },
    {
      domain: "Finance",
      title: "Senior Financial Analyst",
      company: "Apex Capital Management",
      jd: "Asset management firm hiring Senior Financial Analyst for portfolio valuation, variance analysis, and quarterly SEC reporting.",
      profileMock: {
        primaryTitle: "Senior Financial Analyst",
        seniorityLevel: "senior",
        topSkills: ["Variance Analysis", "Financial Modeling", "SEC Reporting"],
        domain: "Finance",
        searchQuery: "Senior Financial Analyst portfolio",
      },
      originalBullets: "- Responsible for weekly budget reports\n- Assisted with quarterly close",
      expectedCategory: "finance_accounting",
      expectedCanonical: "Financial Analyst & FP&A Specialist",
      expectedVerbs: ["Reconciled", "Forecasted", "Audited"],
      suggestedBullets: [
        {
          index: 0,
          originalText: "Responsible for weekly budget reports",
          suggestedText: "Forecasted monthly variance trends and cash-flow trajectories across a $45M operating budget, identifying $350K in savings.",
          status: "enhanced",
          reason: "Capital volume metric with financial forecasting verb",
        },
        {
          index: 1,
          originalText: "Assisted with quarterly close",
          suggestedText: "Reconciled ledger accounts and structured SEC 10-Q documentation, accelerating close turnaround by 3 business days.",
          status: "enhanced",
          reason: "Regulatory timeline metric with reconciliation verb",
        },
      ],
    },
    {
      domain: "Athletics",
      title: "Varsity Basketball Coach",
      company: "Oakridge High School",
      jd: "High school athletic program hiring Head Varsity Basketball Coach to develop student-athletes, plan offensive schemes, and direct conditioning.",
      profileMock: {
        primaryTitle: "Varsity Basketball Coach",
        seniorityLevel: "lead_manager",
        topSkills: ["Game Strategy", "Athletic Conditioning", "Player Mentorship"],
        domain: "Education",
        searchQuery: "Varsity Basketball Head Coach",
      },
      originalBullets: "- Responsible for running basketball practices\n- Helped players with conditioning",
      expectedCategory: "education_coaching",
      expectedCanonical: "Varsity Athletic Coach & Player Development Director",
      expectedVerbs: ["Instructed", "Directed", "Mentored"],
      suggestedBullets: [
        {
          index: 0,
          originalText: "Responsible for running basketball practices",
          suggestedText: "Directed comprehensive game-strategy drills and video review sessions for a 15-player varsity roster, leading team to regional playoffs.",
          status: "enhanced",
          reason: "Coaching leadership verb with roster size and postseason milestone",
        },
        {
          index: 1,
          originalText: "Helped players with conditioning",
          suggestedText: "Conditioned student-athletes with sports-specific injury-prevention protocols, achieving 100% academic eligibility across the roster.",
          status: "enhanced",
          reason: "Athletic conditioning metric and academic eligibility outcome",
        },
      ],
    },
  ];

  for (const config of rolesToTest) {
    it(`profiles, tailors, and elevates ${config.domain} (${config.title}) with authentic vocabulary and zero tech bias`, async () => {
      // 1. Mock Profiler Call
      vi.mocked(generateWithFallback).mockResolvedValueOnce({
        text: JSON.stringify(config.profileMock),
        modelUsed: "gemini:gemini-1.5-flash",
      });

      const profilerResult = await candidateProfilerNode({
        rawResume: `Experience for ${config.title}`,
        rawJobDescription: config.jd,
        selectedJobDescription: config.jd,
        jobTitle: config.title,
        preferences: DEFAULT_PREFERENCES,
        logs: [],
        errors: [],
      });

      expect(profilerResult.industryCategory).toBe(config.expectedCategory);
      expect(profilerResult.canonicalRole).toBe(config.expectedCanonical);
      expect(profilerResult.jobKnowledge).toBeDefined();

      // Verify domain power verbs are populated
      for (const verb of config.expectedVerbs) {
        expect(profilerResult.jobKnowledge?.powerVerbs).toContain(verb);
      }

      // 2. Mock Tailoring Call
      vi.mocked(generateWithFallback).mockResolvedValueOnce({
        text: JSON.stringify(config.suggestedBullets),
        modelUsed: "gemini:gemini-1.5-flash",
      });

      const tailorResult = await surgicalTailorNode({
        rawResume: `Experience for ${config.title}`,
        rawJobDescription: config.jd,
        selectedJobDescription: config.jd,
        jobTitle: config.title,
        canonicalRole: profilerResult.canonicalRole,
        industryCategory: profilerResult.industryCategory,
        jobKnowledge: profilerResult.jobKnowledge,
        seniorityTier: profilerResult.seniorityTier,
        preferences: DEFAULT_PREFERENCES,
        resumeAST: {
          rawText: "Sample text",
          contact: {},
          experience: [
            {
              title: config.title,
              company: config.company,
              dates: "2020 - Present",
              description: config.originalBullets,
            },
          ],
          skills: [],
        },
        bulletPlan: {
          intensity: "targeted",
          summaryChange: false,
          skillsChange: false,
          totalBulletsToModify: 2,
          jobBulletChanges: [
            {
              jobIndex: 0,
              bulletIndices: "all",
              recencyTier: "tier1_recent",
            },
          ],
        },
        logs: [],
        errors: [],
      });

      // Verify prompt passed to LLM had domain calibration and zero tech bias
      expect(generateWithFallback).toHaveBeenCalled();
      const promptPassed = vi.mocked(generateWithFallback).mock.calls[1][0];

      expect(promptPassed).toContain("DOMAIN-SPECIFIC CALIBRATION");
      expect(promptPassed).toMatch(/DO NOT use software-engineering or tech jargon/i);

      // Verify generated suggestions
      const suggestions = tailorResult.suggestions || [];
      expect(suggestions.length).toBe(2);

      for (const sug of suggestions) {
        const text = sug.suggestedText.toLowerCase();

        // Must NOT contain tech jargon
        for (const techWord of BANNED_TECH_JARGON) {
          expect(text).not.toMatch(new RegExp(techWord, "i"));
        }

        // Must NOT start with passive openers
        for (const passive of BANNED_PASSIVE_OPENERS) {
          expect(text).not.toMatch(new RegExp(passive, "i"));
        }
      }
    });
  }
});
