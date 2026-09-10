import { test, expect } from "@playwright/test";

test.describe("Resume Tailor End-to-End Flow", () => {
  const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || "https://resume-tailor-xi-two.vercel.app";

  test("loads tailoring interface and displays inputs", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator("textarea#resume, textarea[aria-label='Your Resume']")).toBeVisible();
    await expect(page.locator("textarea#jobDescription, textarea[aria-label='Job Description']")).toBeVisible();
  });

  test("allows input of resume and job description and enables tailor button", async ({ page }) => {
    await page.goto(BASE_URL);

    const resumeArea = page.locator("textarea#resume, textarea[aria-label='Your Resume']");
    const jobArea = page.locator("textarea#jobDescription, textarea[aria-label='Job Description']");

    await resumeArea.fill(
      "Experienced Senior Full Stack Engineer with 6 years of expertise in TypeScript, React, Next.js, Node.js, and AWS cloud architecture. Led multiple distributed system projects."
    );

    await jobArea.fill(
      "We are seeking a Senior Full Stack Engineer proficient in TypeScript, React, Node.js, and AWS to architect high-performance web applications and cloud microservices."
    );

    const tailorButton = page.locator("button:has-text('Tailor Resume'), button:has-text('Tailoring...')");
    await expect(tailorButton).toBeEnabled();
  });

  test("auto-fetches job description when URL is pasted", async ({ page }) => {
    await page.goto(BASE_URL);

    const jobArea = page.locator("textarea#jobDescription, textarea[aria-label='Job Description']");
    await jobArea.fill("https://www.builtinla.com/job/staff-fullstack-engineer-ruby-vue-js-monetization-engineering-purchase/10944017");

    // Wait for the URL fetch badge or text update
    await expect(
      page.locator("text=Fetching job listing…").or(page.locator("text=Pulled from web")).or(page.locator("text=Pulled via AI"))
    ).toBeVisible({ timeout: 15000 });
  });
});
