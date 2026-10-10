import { test, expect } from "@playwright/test";

test.describe("Resume Tailor E2E - Live Preview & Agentic Review Studio Flow", () => {
  const sampleOriginalResume = `# Alex Rivera
alex@example.com • (555) 019-2834 • San Francisco, CA

## Summary
Software Engineer with 4 years building web services.

## Experience

### Google – Senior Software Engineer
2021 - Present • Mountain View, CA
- Led backend services handling 10k requests per second
- Maintained database storage and caching layers

### Chapman University – Software Engineer
2019 - 2021 • Orange, CA
- Built internal university student applications
- Managed campus portal database queries

## Skills
TypeScript, React, Node.js, Go, Kubernetes, PostgreSQL
`;

  const sampleJobDescription = `Senior Cloud Backend Engineer at Acme Cloud.
Requirements:
- 4+ years designing high-throughput distributed systems
- Proven experience with Kubernetes, microservices architecture, and p99 latency optimization
- Strong database scaling and cache management
`;

  const mockCompletePayload = {
    tailoredResume: `# Alex Rivera
alex@example.com • (555) 019-2834 • San Francisco, CA

## Summary
Senior Cloud Backend Engineer with 4+ years architecting high-throughput distributed systems and cloud platforms.

## Experience

### Google – Senior Software Engineer
2021 - Present • Mountain View, CA
- Spearheaded distributed backend microservices handling 50k RPS, reducing p99 latency by 35%
- Maintained database storage and caching layers

### Chapman University – Software Engineer
2019 - 2021 • Orange, CA
- Engineered resilient student applications serving 12,000 active campus users
- Managed campus portal database queries

## Skills
TypeScript, React, Node.js, Go, Kubernetes, PostgreSQL, Distributed Systems, Microservices
`,
    beforeScore: 52,
    matchScore: 89,
    suggestions: [
      {
        id: "sug-job-0-bullet-0",
        section: "Google – Senior Software Engineer",
        originalText: "Led backend services handling 10k requests per second",
        suggestedText: "Spearheaded distributed backend microservices handling 50k RPS, reducing p99 latency by 35%",
        reason: "Google X-Y-Z framework with quantified throughput and latency metrics",
        category: "metric",
        status: "pending",
        jobIndex: 0,
        bulletIndex: 0,
      },
      {
        id: "sug-job-1-bullet-0",
        section: "Chapman University – Software Engineer",
        originalText: "Built internal university student applications",
        suggestedText: "Engineered resilient student applications serving 12,000 active campus users",
        reason: "Active action verb and scale quantification",
        category: "metric",
        status: "pending",
        jobIndex: 1,
        bulletIndex: 0,
      },
    ],
    sectionGroups: [
      {
        id: "section-exp-0",
        sectionType: "experience",
        title: "Google – Senior Software Engineer",
        subtitle: "2021 - Present • Mountain View, CA",
        jobIndex: 0,
        orderIndex: 0,
        status: "ready",
        auditRationale: "Targeted distributed backend scalability (+35% p99 latency) and 50k RPS throughput",
        suggestions: [
          {
            id: "sug-job-0-bullet-0",
            section: "Google – Senior Software Engineer",
            originalText: "Led backend services handling 10k requests per second",
            suggestedText: "Spearheaded distributed backend microservices handling 50k RPS, reducing p99 latency by 35%",
            status: "pending",
            jobIndex: 0,
          },
        ],
        hasChanges: true,
      },
      {
        id: "section-exp-1",
        sectionType: "experience",
        title: "Chapman University – Software Engineer",
        subtitle: "2019 - 2021 • Orange, CA",
        jobIndex: 1,
        orderIndex: 1,
        status: "ready",
        auditRationale: "Quantified student tenure impact serving 12,000 campus users",
        suggestions: [
          {
            id: "sug-job-1-bullet-0",
            section: "Chapman University – Software Engineer",
            originalText: "Built internal university student applications",
            suggestedText: "Engineered resilient student applications serving 12,000 active campus users",
            status: "pending",
            jobIndex: 1,
          },
        ],
        hasChanges: true,
      },
      {
        id: "section-skills",
        sectionType: "skills",
        title: "Skills & Core Competencies",
        orderIndex: 2,
        status: "unchanged",
        auditRationale: "Preserved core technical proficiencies matrix",
        suggestions: [],
        hasChanges: false,
      },
      {
        id: "section-summary",
        sectionType: "summary",
        title: "Professional Summary Synthesis",
        orderIndex: 3,
        status: "ready",
        auditRationale: "Holistic cloud backend narrative synthesis",
        suggestions: [],
        hasChanges: true,
      },
    ],
    improvementMetrics: {
      quantifiedBulletsAdded: 2,
      atsKeywordsMatched: 4,
      activeVoiceConversions: 2,
      sectionsOptimized: 2,
    },
    logs: [
      "[intakeParser] Parsed experience and skills AST",
      "[bulletPlanner] Formulated bottom-to-top accomplishment plan",
      "[surgicalTailor] Jev System 1 verified 2 enhanced bullets",
    ],
  };

  test("loads the application and displays the tailoring studio inputs", async ({ page }) => {
    await page.goto("/");

    // Verify presence of title and key components
    await expect(page.locator("h1")).toContainText(/AI Resume Tailor/i);
    await expect(page.locator("textarea#resume, textarea[aria-label='Your Resume']")).toBeVisible();
    await expect(page.locator("textarea#jobDescription, textarea[aria-label='Job Description']")).toBeVisible();
  });

  test("tailors resume, renders live preview cockpit, agent audit banner, and handles bi-directional sync", async ({ page }) => {
    // Intercept SSE streaming route to simulate deterministic agent stream
    await page.route("**/api/humanize/stream", async (route) => {
      const sseBody = [
        `event: agent_step\ndata: ${JSON.stringify({ step: "analyzing", message: "Analyzing career experience...", progress: 30 })}\n\n`,
        `event: agent_step\ndata: ${JSON.stringify({ step: "tailoring", message: "Elevating accomplishment bullets with Jev AI...", progress: 85 })}\n\n`,
        `event: complete\ndata: ${JSON.stringify(mockCompletePayload)}\n\n`,
      ].join("");

      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: sseBody,
      });
    });

    await page.goto("/");

    // Fill resume and job description
    const resumeTextarea = page.locator("textarea#resume, textarea[aria-label='Your Resume']");
    await resumeTextarea.fill(sampleOriginalResume);

    const jdTextarea = page.locator("textarea#jobDescription, textarea[aria-label='Job Description']");
    await jdTextarea.fill(sampleJobDescription);

    // Click Tailor Resume button
    const tailorButton = page.locator('[data-testid="tailor-button"]');
    await expect(tailorButton).toBeEnabled();
    await tailorButton.click();

    // 1. Verify Review Cockpit loads
    await expect(page.getByRole("heading", { name: "Tailored Resume", exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("button:has-text('Review Cockpit')")).toBeVisible();

    // 2. Verify Agent Audit Rationale Banner renders with robot icon and reason
    await expect(page.locator("text=Agent Audit Rationale").first()).toBeVisible();
    await expect(
      page.locator("text=Targeted distributed backend scalability (+35% p99 latency) and 50k RPS throughput")
    ).toBeVisible();

    // 3. Verify Live Document Preview canvas and sync status badge
    await expect(page.locator("text=Live Document Preview")).toBeVisible();
    const liveSyncBadge = page.locator('[data-testid="live-sync-badge"]');
    await expect(liveSyncBadge).toBeVisible();
    await expect(liveSyncBadge).toContainText(/Original version/i);

    // 4. Accept the first change and verify live preview update
    const acceptButton = page.locator("button:has-text('Accept Change')").first();
    await acceptButton.click();

    // Verify button transitions to accepted state
    await expect(page.locator("button:has-text('✓ Accepted')")).toBeVisible();

    // Verify live sync status badge reflects the applied change
    await expect(liveSyncBadge).toContainText(/1 change applied/i);

    // 5. Navigate to Next Change and verify agent audit banner updates for Chapman
    const nextButton = page.locator("button:has-text('Next →')");
    await nextButton.click();

    await expect(page.locator("text=Change 2 of 2")).toBeVisible();
    await expect(
      page.locator("text=Quantified student tenure impact serving 12,000 campus users")
    ).toBeVisible();

    // 6. Test Bi-directional click: click Google section in the right document canvas
    const googleSectionInCanvas = page.locator('[data-section-id="section-exp-0"]');
    await expect(googleSectionInCanvas).toBeVisible();
    await googleSectionInCanvas.click();

    // Reviewer should focus back on Change 1 (Google)
    await expect(page.locator("text=Change 1 of 2")).toBeVisible();

    // 7. Test Layout Toggle: switch to Full Document view
    const fullDocToggle = page.locator("button:has-text('📄 Full Document')");
    await fullDocToggle.click();

    // Full document canvas remains visible
    await expect(page.getByRole("heading", { name: "Alex Rivera" })).toBeVisible();
    await expect(page.locator("text=Spearheaded distributed backend microservices").first()).toBeVisible();

    // Switch back to Review Cockpit
    const cockpitToggle = page.locator("button:has-text('Review Cockpit')");
    await cockpitToggle.click();
    await expect(page.locator("text=Change 1 of 2")).toBeVisible();
  });
});
