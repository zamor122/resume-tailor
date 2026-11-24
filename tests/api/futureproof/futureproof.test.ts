import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as POST_ANALYZE } from "@/app/api/futureproof/analyze/route";
import { POST as POST_GENERATE } from "@/app/api/futureproof/generate/route";

const mockGenerateContent = vi.fn();
const mockExtractAuthToken = vi.fn();
const mockGetAuthenticatedUser = vi.fn();
const mockGetAccessInfoServer = vi.fn();

vi.mock("@/app/services/ai-provider", () => ({
  generateContentWithFallback: (...args: unknown[]) => mockGenerateContent(...args),
}));

vi.mock("@/app/utils/auth", () => ({
  extractAuthToken: (...args: unknown[]) => mockExtractAuthToken(...args),
  getAuthenticatedUser: (...args: unknown[]) => mockGetAuthenticatedUser(...args),
}));

vi.mock("@/app/utils/accessManager", () => ({
  getAccessInfoServer: (...args: unknown[]) => mockGetAccessInfoServer(...args),
}));

const SAMPLE_DOCTOR_RESUME = `
Dr. Elena Vance, MD
Attending Physician — Internal Medicine | St. Jude Medical Center (2021 - Present)
- Manage outpatient panel of 480 chronic-care patients using Epic EHR
- Conduct 22 daily patient encounters, clinical charting, and specialty referrals
- Respond to 35+ daily patient portal inquiries regarding labs and prescriptions
Resident Physician | County General Hospital (2018 - 2021)
- Completed inpatient rounds and discharge summaries across telemetry and ICU floors
`;

const SAMPLE_LLM_GENERATE_JSON = JSON.stringify({
  placementMode: "inline_roles",
  bulletUpgrades: [
    {
      roleTitle: "Attending Physician",
      company: "St. Jude Medical Center",
      dateRange: "2021 - Present",
      placementType: "role_experience",
      toolId: "nuance-dax-copilot",
      toolName: "Nuance DAX Copilot",
      originalBullet: "Conduct 22 daily patient encounters, clinical charting, and specialty referrals",
      upgradedBullet:
        "Conducted 22 daily outpatient encounters using HIPAA-compliant ambient clinical documentation (Nuance DAX Copilot) to draft structured Epic SOAP notes while maintaining 100% coding accuracy.",
      rationale: "Directly upgrades outpatient charting with the leading HIPAA ambient scribe.",
    },
    {
      roleTitle: "Attending Physician",
      company: "St. Jude Medical Center",
      dateRange: "2021 - Present",
      placementType: "role_experience",
      toolId: "abridge-clinical",
      toolName: "Abridge",
      originalBullet: "Manage outpatient panel of 480 chronic-care patients using Epic EHR",
      upgradedBullet:
        "Managed a 480-patient chronic-care panel using Abridge ambient AI to generate auditable visit summaries and plain-language patient care instructions.",
      rationale: "Connects chronic-care follow-ups to auditable ambient note generation.",
    },
    {
      roleTitle: "Attending Physician",
      company: "St. Jude Medical Center",
      dateRange: "2021 - Present",
      placementType: "role_experience",
      toolId: "epic-inbasket-ai",
      toolName: "Epic In-Basket & Chart Summary AI",
      originalBullet: "Respond to 35+ daily patient portal inquiries regarding labs and prescriptions",
      upgradedBullet:
        "SECRET_LOCKED_UPGRADE_BULLET_3 using Epic In-Basket AI for 35+ daily portal inquiries.",
      addedHighlight: "SECRET_LOCKED_HIGHLIGHT_3",
      rationale: "SECRET_LOCKED_RATIONALE_3",
    },
  ],
  skillsBlock: [
    "Nuance DAX Copilot (HIPAA Ambient Documentation)",
    "Abridge Clinical AI",
    "Epic EHR & In-Basket AI",
  ],
  mergedResume: "SECRET_FULL_MERGED_RESUME_TEXT_SHOULD_NOT_LEAK_WHEN_LOCKED",
});

describe("Futureproof API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExtractAuthToken.mockReturnValue(null);
    mockGetAuthenticatedUser.mockResolvedValue(null);
    mockGetAccessInfoServer.mockResolvedValue({ hasAccess: false, isExpired: true });
  });

  describe("POST /api/futureproof/analyze", () => {
    it("returns 400 when resumeText is too short", async () => {
      const req = new NextRequest("http://localhost:3000/api/futureproof/analyze", {
        method: "POST",
        body: JSON.stringify({ resumeText: "too short" }),
      });
      const res = await POST_ANALYZE(req);
      expect(res.status).toBe(400);
    });

    it("detects healthcare industry, flags pre-2023 roles, and pre-selects industry standards", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          industry: "healthcare",
          subRoleLabel: "Internal Medicine Physician",
          roles: [
            {
              title: "Attending Physician",
              company: "St. Jude Medical Center",
              dateRange: "2021 - Present",
            },
            {
              title: "Resident Physician",
              company: "County General Hospital",
              dateRange: "2018 - 2021",
            },
          ],
          fitReasons: {
            "nuance-dax-copilot":
              "Ideal for your 22 daily Epic outpatient encounters and SOAP charting.",
          },
        }),
      });

      const req = new NextRequest("http://localhost:3000/api/futureproof/analyze", {
        method: "POST",
        body: JSON.stringify({ resumeText: SAMPLE_DOCTOR_RESUME, comfortLevel: "everyday" }),
      });
      const res = await POST_ANALYZE(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.industry).toBe("healthcare");
      expect(data.subRoleLabel).toBe("Internal Medicine Physician");
      expect(data.detectedRoles[0].isRecentForAi).toBe(true);
      expect(data.detectedRoles[1].isRecentForAi).toBe(false);
      expect(data.recommendedTools.some((t: any) => t.id === "nuance-dax-copilot")).toBe(true);
      expect(data.recommendedTools.some((t: any) => t.preselected)).toBe(true);
    });
  });

  describe("POST /api/futureproof/generate", () => {
    it("strips locked bullets, mergedResume, and interview scripts for free/unauthenticated users", async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: SAMPLE_LLM_GENERATE_JSON });

      const req = new NextRequest("http://localhost:3000/api/futureproof/generate", {
        method: "POST",
        body: JSON.stringify({
          resumeText: SAMPLE_DOCTOR_RESUME,
          industry: "healthcare",
          useIndustryStandards: true,
        }),
      });

      const res = await POST_GENERATE(req);
      const data = await res.json();
      const rawBody = JSON.stringify(data);

      expect(res.status).toBe(200);
      expect(data.isUnlocked).toBe(false);
      expect(data.unlockedCount).toBe(2);
      expect(data.totalUpgrades).toBe(3);

      // First 2 upgrades are visible; 3rd is strictly sanitized server-side
      expect(data.bulletUpgrades[0].isLocked).toBe(false);
      expect(data.bulletUpgrades[1].isLocked).toBe(false);
      expect(data.bulletUpgrades[2].isLocked).toBe(true);
      expect(data.mergedResume).toBeNull();
      expect(data.interviewTalkingPoints[0].isLocked).toBe(true);

      // Zero leakage of locked strings anywhere in the HTTP payload
      expect(rawBody).not.toContain("SECRET_LOCKED_UPGRADE_BULLET_3");
      expect(rawBody).not.toContain("SECRET_LOCKED_HIGHLIGHT_3");
      expect(rawBody).not.toContain("SECRET_FULL_MERGED_RESUME_TEXT");
    });

    it("returns full unlocked bullets, mergedResume, and interview scripts when user has an active pass", async () => {
      mockExtractAuthToken.mockReturnValue("valid-jwt");
      mockGetAuthenticatedUser.mockResolvedValue({ id: "paid-user-1" });
      mockGetAccessInfoServer.mockResolvedValue({ hasAccess: true, isExpired: false });
      mockGenerateContent.mockResolvedValueOnce({ text: SAMPLE_LLM_GENERATE_JSON });

      const req = new NextRequest("http://localhost:3000/api/futureproof/generate", {
        method: "POST",
        headers: { Authorization: "Bearer valid-jwt" },
        body: JSON.stringify({
          resumeText: SAMPLE_DOCTOR_RESUME,
          industry: "healthcare",
          selectedToolIds: ["nuance-dax-copilot", "abridge-clinical"],
        }),
      });

      const res = await POST_GENERATE(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.isUnlocked).toBe(true);
      expect(data.bulletUpgrades[2].upgradedBullet).toContain("SECRET_LOCKED_UPGRADE_BULLET_3");
      expect(data.mergedResume).toContain("SECRET_FULL_MERGED_RESUME_TEXT");
      expect(data.interviewTalkingPoints[0].isLocked).toBe(false);
      expect(data.interviewTalkingPoints[0].thirtySecondAnswer.length).toBeGreaterThan(40);
    });
  });
});
