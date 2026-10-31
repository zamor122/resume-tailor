import { test, expect } from "@playwright/test";

test.describe("Resume Tailor Gating & Anti-Fraud Flow", () => {
  const lockedResumeId = "locked-resume-test-123";
  const unlockedResumeId = "unlocked-resume-test-456";

  test("enforces strict gating on locked resumes and opens plan modal on apply attempts", async ({ page }) => {
    // Intercept retrieve endpoint to simulate locked resume response
    await page.route("**/api/resume/retrieve", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          originalResume: `# Alex Rivera\nSenior Software Engineer\n\n## Experience\nGoogle\n- Led backend services handling 10k requests per second`,
          tailoredResume: `# Alex Rivera\nSenior Software Engineer\n\n## Experience\nGoogle\n- 🔒 AI-optimized content locked — unlock to reveal ████████`,
          obfuscatedResume: `# Alex Rivera\nSenior Software Engineer\n\n## Experience\nGoogle\n- 🔒 AI-optimized content locked — unlock to reveal ████████`,
          contentMap: [
            {
              obfuscatedText: "🔒 AI-optimized content locked — unlock to reveal ████████",
              position: { start: 70, end: 120 },
              section: "Experience",
              isFreeReveal: false,
            },
          ],
          jobDescription: "Senior Distributed Systems Engineer at Scale",
          jobTitle: "Senior Software Engineer",
          matchScore: 89,
          suggestions: [
            {
              id: "sug-locked-1",
              section: "Google",
              originalText: "Led backend services handling 10k requests per second",
              suggestedText: "🔒 AI-tailored accomplishment locked. Upgrade to unlock full metrics and bullet improvements.",
              reason: "Adds high-scale RPS throughput and latency metrics",
              keywords: ["microservices", "throughput"],
              status: "pending",
              isLocked: true,
              isFreeReveal: false,
            },
          ],
          sectionGroups: [
            {
              id: "section-exp-0",
              sectionType: "experience",
              title: "Google",
              orderIndex: 0,
              status: "ready",
              auditRationale: "Targeted distributed backend scalability (+35% p99 latency) and 50k RPS throughput",
              suggestions: [
                {
                  id: "sug-locked-1",
                  section: "Google",
                  originalText: "Led backend services handling 10k requests per second",
                  suggestedText: "🔒 AI-tailored accomplishment locked. Upgrade to unlock full metrics and bullet improvements.",
                  status: "pending",
                  isLocked: true,
                  isFreeReveal: false,
                },
              ],
              hasChanges: true,
            },
          ],
          resumeId: lockedResumeId,
          isUnlocked: false,
          accessInfo: null,
        }),
      });
    });

    // Navigate to the resume detail page
    await page.goto(`/resume/${lockedResumeId}`);

    // 1. Verify "Locked" status indicator
    await expect(page.locator("text=Locked").first()).toBeVisible();

    // 2. Verify "Unlock Your Full Resume" upgrade container is displayed
    await expect(page.getByRole("heading", { name: "Unlock Your Full Resume" })).toBeVisible();
    await expect(page.locator("button:has-text('Choose Access Plan')")).toBeVisible();

    // 3. Verify download button is NOT shown for locked resumes
    await expect(page.locator("button:has-text('Download PDF')")).not.toBeVisible();

    // 4. Verify Review Cockpit displays locked accomplishment indicators
    await expect(page.locator("text=Tailored Accomplishment (Locked):")).toBeVisible();
    await expect(page.locator("text=Access pass required")).toBeVisible();

    // 5. Verify the accept button displays "Unlock Plan to Apply"
    const unlockApplyButton = page.locator("button:has-text('Unlock Plan to Apply')");
    await expect(unlockApplyButton).toBeVisible();

    // 6. Click "Unlock Plan to Apply" and verify TierSelectionModal opens with pricing passes
    await unlockApplyButton.click();
    await expect(page.locator("text=Choose Access Plan").first()).toBeVisible();
    await expect(page.locator("text=2-Day Access")).toBeVisible();
    await expect(page.locator("text=1-Week Access")).toBeVisible();
    await expect(page.locator("text=1-Month Access")).toBeVisible();
  });

  test("allows full access, unredacted review, and downloads when resume is unlocked", async ({ page }) => {
    // Intercept retrieve endpoint to simulate unlocked resume response
    await page.route("**/api/resume/retrieve", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          originalResume: `# Alex Rivera\nSenior Software Engineer\n\n## Experience\nGoogle\n- Led backend services handling 10k requests per second`,
          tailoredResume: `# Alex Rivera\nSenior Software Engineer\n\n## Experience\nGoogle\n- Spearheaded distributed backend microservices handling 50k RPS, reducing p99 latency by 35%`,
          obfuscatedResume: `# Alex Rivera\nSenior Software Engineer\n\n## Experience\nGoogle\n- Spearheaded distributed backend microservices handling 50k RPS, reducing p99 latency by 35%`,
          jobDescription: "Senior Distributed Systems Engineer at Scale",
          jobTitle: "Senior Software Engineer",
          matchScore: 92,
          suggestions: [
            {
              id: "sug-unlocked-1",
              section: "Google",
              originalText: "Led backend services handling 10k requests per second",
              suggestedText: "Spearheaded distributed backend microservices handling 50k RPS, reducing p99 latency by 35%",
              reason: "Adds high-scale RPS throughput and latency metrics",
              keywords: ["microservices", "throughput"],
              status: "pending",
            },
          ],
          sectionGroups: [
            {
              id: "section-exp-0",
              sectionType: "experience",
              title: "Google",
              orderIndex: 0,
              status: "ready",
              auditRationale: "Targeted distributed backend scalability",
              suggestions: [
                {
                  id: "sug-unlocked-1",
                  section: "Google",
                  originalText: "Led backend services handling 10k requests per second",
                  suggestedText: "Spearheaded distributed backend microservices handling 50k RPS, reducing p99 latency by 35%",
                  status: "pending",
                },
              ],
              hasChanges: true,
            },
          ],
          resumeId: unlockedResumeId,
          isUnlocked: true,
          accessInfo: {
            tier: "7D",
            tierLabel: "1-Week Access",
            expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
            remainingTime: 86400000 * 7,
            isExpired: false,
          },
        }),
      });
    });

    await page.goto(`/resume/${unlockedResumeId}`);

    // 1. Verify "Unlocked" status indicator
    await expect(page.locator("text=Unlocked").first()).toBeVisible();

    // 2. Verify Download PDF button is visible
    await expect(page.locator("button:has-text('Download PDF')")).toBeVisible();

    // 3. Verify normal "Accept Change" button is active (not locked)
    const acceptButton = page.locator("button:has-text('Accept Change')").first();
    await expect(acceptButton).toBeVisible();
    await acceptButton.click();
    await expect(page.locator("button:has-text('✓ Accepted')")).toBeVisible();
  });
});
