import { describe, it, expect } from "vitest";
import {
  generateWelcomeEmailHtml,
  generateWelcomeEmailText,
  extractFirstName,
  getInitials,
} from "@/app/utils/welcomeEmailTemplate";

describe("welcomeEmailTemplate", () => {
  it("extracts first name accurately from full name or email username", () => {
    expect(extractFirstName("Ryan Sheikh")).toBe("Ryan");
    expect(extractFirstName("sarah connor")).toBe("Sarah");
    expect(extractFirstName(undefined, "jordan.vance.ops@gmail.com")).toBe("Jordan");
    expect(extractFirstName("", "alex_smith@company.com")).toBe("Alex");
  });

  it("calculates clean candidate initials for avatar pill", () => {
    expect(getInitials("Ryan Sheikh")).toBe("RS");
    expect(getInitials("Sarah")).toBe("SA");
    expect(getInitials(undefined, "jordan@gmail.com")).toBe("JO");
  });

  it("generates personalized HTML email containing candidate HUD and free tier details", () => {
    const html = generateWelcomeEmailHtml({
      name: "Ryan Sheikh",
      email: "ryan.h.sheikh@gmail.com",
      avatarUrl: "https://example.com/avatar.jpg",
    });

    expect(html).toContain("Hey Ryan,");
    expect(html).toContain("Ryan Sheikh");
    expect(html).toContain("ryan.h.sheikh@gmail.com");
    expect(html).toContain("TIER: FREE STARTER");
    expect(html).toContain("FREE PASS UNLOCKED");
    expect(html).toContain("NO CREDIT CARD REQUIRED");
    expect(html).toContain("Instant ATS Match Score &amp; Keyword Gap Diagnostic");
    expect(html).toContain("1 Free High-Impact Bullet Optimization");
    expect(html).toContain("Change Studio &amp; Recruiter Rationale");
    expect(html).toContain("RUN YOUR FREE ATS AUDIT");
    expect(html).toContain("Shayne Zamora");
    expect(html).toContain("Founder • AI Resume Tailor");
    // Verify valid HTML and styling
    expect(html).toContain("#FAF7F0");
    expect(html).toContain("#1C2028");
    expect(html).toContain("#FF5722");
  });

  it("generates fallback text email with personalized greeting and sign-off", () => {
    const text = generateWelcomeEmailText({
      name: "Ryan Sheikh",
      email: "ryan.h.sheikh@gmail.com",
    });

    expect(text).toContain("Hey Ryan,");
    expect(text).toContain("CANDIDATE: Ryan Sheikh");
    expect(text).toContain("ACCOUNT:   ryan.h.sheikh@gmail.com");
    expect(text).toContain("TIER:      FREE STARTER (Active)");
    expect(text).toContain("HERE IS WHAT'S WAITING IN YOUR ACCOUNT 100% FREE");
    expect(text).toContain("1 Free High-Impact Bullet Optimization");
    expect(text).toContain("Shayne Zamora");
    expect(text).toContain("https://airesumetailor.com");
  });
});
