import { describe, it, expect } from "vitest";
import { obfuscateResume, revealContent } from "@/app/utils/resumeObfuscator";

describe("resumeObfuscator - obfuscateResume & revealContent", () => {
  it("never produces an overlapping full-resume blob or null freeReveal on flattened single-line resumes", () => {
    const originalSingleLine =
      "JORDAN M. TAYLOR [City, State, Zip] • [Phone] • [Email] " +
      "PROFESSIONAL SUMMARY Dedicated support specialist with 4 years of retail experience. " +
      "EXPERIENCE Senior Support Associate June 2023 – Present " +
      "Handle escalated customer tickets and maintain high CSAT scores across channels. " +
      "Help team members learn daily escalation tools during onboarding. " +
      "Managed 65 inbound tickets per day across chat and email queues.";

    const tailoredSingleLine =
      "JORDAN M. TAYLOR [City, State, Zip] - [Phone] - [Email] " +
      "PROFESSIONAL SUMMARY Customer Experience specialist with 4+ years scaling omnichannel support operations and driving retention. " +
      "EXPERIENCE Senior Support Associate June 2023 – Present " +
      "Resolved top 10% of escalated customer inquiries, preserving a 94% CSAT retention rate across live channels. " +
      "Mentored 12 incoming support associates during 30-day onboarding cohorts, cutting ramp time by 25%. " +
      "Directed 65+ daily inbound tickets across live chat, email, and voice with sub-2-minute response SLA.";

    const res = obfuscateResume(originalSingleLine, tailoredSingleLine);

    expect(res.freeReveal).not.toBeNull();
    expect(res.freeReveal!.improvedText.length).toBeLessThanOrEqual(1500);
    expect(res.contentMap.length).toBeGreaterThanOrEqual(2);
    expect(res.contentMap.filter((c) => c.isFreeReveal)).toHaveLength(1);
    expect(res.obfuscatedResume).toContain("🔒 AI-optimized content locked");
    expect(res.obfuscatedResume).toContain(res.freeReveal!.improvedText);

    // Byte-exact roundtrip unlock
    const unlocked = revealContent(res.obfuscatedResume, res.contentMap);
    expect(unlocked).toBe(tailoredSingleLine);
  });

  it("picks the strongest metric bullet as freeReveal and cleanly roundtrips multi-line resumes", () => {
    const original = `# Alex Rivera
alex@example.com

## Experience
Acme Corp — Support Lead
- Answered customer emails daily.
- Tracked bugs in spreadsheets for engineering.
- Helped onboard new support staff.`;

    const tailored = `# Alex Rivera
alex@example.com

## Experience
Acme Corp — Support Lead
- Resolved 120+ tier-2 customer escalations weekly, improving SLA adherence by 28%.
- Built structured Jira defect triage workflows, reducing engineering handoff latency by 35%.
- Designed 2-week customer experience onboarding curriculum across 4 support cohorts.`;

    const res = obfuscateResume(original, tailored);

    expect(res.freeReveal).not.toBeNull();
    expect(res.freeReveal!.improvedText.length).toBeGreaterThanOrEqual(25);
    expect(res.freeReveal!.originalText.length).toBeGreaterThan(0);
    expect(res.contentMap.some((e) => e.isFreeReveal)).toBe(true);
    expect(res.obfuscatedResume).toContain("# Alex Rivera");
    expect(revealContent(res.obfuscatedResume, res.contentMap)).toBe(tailored);
  });
});
