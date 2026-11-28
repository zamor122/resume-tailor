import { test, expect, Page } from "@playwright/test";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR =
  process.env.VISUAL_QA_DIR ||
  "/Users/shaynezamora/.gemini/antigravity/brain/dad590fc-1d52-41f6-9b04-aaba8342e83b/scratch/visual-qa";

function ensureScreenshotDir() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function assertNoHorizontalOverflow(page: Page, label: string) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    metrics.scrollWidth,
    `Horizontal overflow detected on ${label}: scrollWidth=${metrics.scrollWidth} > clientWidth=${metrics.clientWidth}`
  ).toBeLessThanOrEqual(metrics.clientWidth + 2);
}

test.describe("Full-Site Dual-Design E2E & Visual Verification", () => {
  test.beforeAll(() => {
    ensureScreenshotDir();
  });

  test("Desktop (1440x900): Full Pomegranate & Risograph switching, persistence, core routes, and visual captures", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const serverErrors: string[] = [];

    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("response", (res) => {
      if (res.status() >= 500 && res.url().includes("airesumetailor.com")) {
        serverErrors.push(`${res.status()} ${res.url()}`);
      }
    });

    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Load Home in default Pomegranate design
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute(
      "data-design",
      "pomegranate"
    );

    const pomCanvasBg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor
    );
    expect(pomCanvasBg).toBe("rgb(255, 253, 245)"); // #FFFDF5

    await assertNoHorizontalOverflow(page, "Desktop / (Pomegranate)");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "desktop-home-pomegranate.png"),
      fullPage: false,
    });

    // Test interactive Resume + Job Description input flow on Home
    const resumeArea = page.locator("textarea").first();
    const jobArea = page.locator("textarea").nth(1);
    await resumeArea.fill(
      "Board-Certified Internal Medicine Physician with 7 years of outpatient clinical experience using Epic EHR, chronic disease panel management for 520+ patients, and HIPAA-compliant clinical workflows."
    );
    await jobArea.fill(
      "Lead Outpatient Internal Medicine Physician at Beacon Health Systems. Requirements: Epic EHR, Value-Based Care, HCC Coding Accuracy, Ambient Clinical AI, and Same-Day Access."
    );
    await expect(page.getByText(/RESUME READY/i)).toBeVisible();
    await expect(page.getByText(/JOB READY/i)).toBeVisible();

    // Test menu drawer opens cleanly with Streak/XP/DesignSwitcher
    await page.getByRole("button", { name: /Open menu/i }).click();
    await expect(page.locator("#site-nav-menu")).toBeVisible();
    await expect(page.locator("#site-nav-menu").getByText(/Site Design/i)).toBeVisible();
    await expect(page.locator("#site-nav-menu").getByText(/Streak/i)).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "desktop-menu-pomegranate.png"),
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    await expect(page.locator("#site-nav-menu")).toBeHidden();

    // 2. Switch to Warm Paper Risograph via Header Switcher
    await page
      .locator("header")
      .getByRole("radio", { name: /Risograph/i })
      .click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-design",
      "risograph"
    );

    await expect
      .poll(
        () =>
          page.evaluate(() => getComputedStyle(document.body).backgroundColor),
        { timeout: 3000 }
      )
      .toBe("rgb(246, 240, 228)"); // #F6F0E4

    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "desktop-home-risograph.png"),
      fullPage: false,
    });

    // 3. Verify persistence across hard reload
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute(
      "data-design",
      "risograph"
    );

    // 4. Traverse all core routes in Risograph & capture visual QA screenshots
    const coreRoutes: Array<{ path: string; slug: string; expectedText: RegExp }> = [
      { path: "/futureproof", slug: "futureproof", expectedText: /AI/i },
      { path: "/pricing", slug: "pricing", expectedText: /One-Time/i },
      { path: "/profile", slug: "profile", expectedText: /Sign In|Profile/i },
      { path: "/agents", slug: "agents", expectedText: /Agent|OpenAPI/i },
      { path: "/faq", slug: "faq", expectedText: /FAQ|Questions/i },
      { path: "/blog", slug: "blog", expectedText: /Blog|Resume/i },
    ];

    for (const route of coreRoutes) {
      await page.goto(route.path, { waitUntil: "networkidle" });
      await expect(page.locator("html")).toHaveAttribute(
        "data-design",
        "risograph"
      );
      await expect(page.locator("main")).toContainText(route.expectedText);
      await assertNoHorizontalOverflow(
        page,
        `Desktop ${route.path} (Risograph)`
      );
      if (["futureproof", "pricing", "profile", "agents"].includes(route.slug)) {
        await page.screenshot({
          path: path.join(
            SCREENSHOT_DIR,
            `desktop-${route.slug}-risograph.png`
          ),
          fullPage: false,
        });
      }
    }

    // 5. Switch back to Pomegranate via URL param ?design=pomegranate & capture key routes
    for (const route of coreRoutes.slice(0, 4)) {
      await page.goto(`${route.path}?design=pomegranate`, {
        waitUntil: "networkidle",
      });
      await expect(page.locator("html")).toHaveAttribute(
        "data-design",
        "pomegranate"
      );
      await assertNoHorizontalOverflow(
        page,
        `Desktop ${route.path} (Pomegranate)`
      );
      await page.screenshot({
        path: path.join(
          SCREENSHOT_DIR,
          `desktop-${route.slug}-pomegranate.png`
        ),
        fullPage: false,
      });
    }

    // 6. Scroll to Footer & SiteLinks and capture bottom section in both themes
    await page.goto("/?design=pomegranate", { waitUntil: "networkidle" });
    await page.locator("footer").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "desktop-footer-pomegranate.png"),
      fullPage: false,
    });
    await page.locator("footer").getByRole("radio", { name: /Risograph/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-design", "risograph");
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "desktop-footer-risograph.png"),
      fullPage: false,
    });

    expect(pageErrors, `Uncaught page errors: ${pageErrors.join("; ")}`).toEqual([]);
    expect(serverErrors, `5xx server errors: ${serverErrors.join("; ")}`).toEqual([]);
  });

  test("Mobile (390x844): Native mobile layout, floating bottom nav, 1-tap theme switch, zero overflow", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 390, height: 844 });

    // 1. Mobile Home in Pomegranate
    await page.goto("/?design=pomegranate", { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute(
      "data-design",
      "pomegranate"
    );
    await assertNoHorizontalOverflow(page, "Mobile / (Pomegranate)");

    const mobileNav = page.getByRole("navigation", {
      name: /Mobile quick navigation/i,
    });
    await expect(mobileNav).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "mobile-home-pomegranate.png"),
      fullPage: false,
    });

    // 2. Tap 1-tap theme flip button in Mobile Header -> switches to Risograph
    await page
      .getByRole("button", { name: /Switch to Warm Paper Risograph design/i })
      .click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-design",
      "risograph"
    );
    await page.waitForTimeout(250);
    await assertNoHorizontalOverflow(page, "Mobile / (Risograph)");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "mobile-home-risograph.png"),
      fullPage: false,
    });

    // 3. Navigate via Mobile Bottom Nav -> Add AI (/futureproof) & Passes (/pricing)
    await mobileNav.getByRole("link", { name: /Add AI/i }).click();
    await page.waitForURL(/\/futureproof/);
    await expect(page.locator("html")).toHaveAttribute("data-design", "risograph");
    await assertNoHorizontalOverflow(page, "Mobile /futureproof (Risograph)");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "mobile-futureproof-risograph.png"),
      fullPage: false,
    });

    await mobileNav.getByRole("link", { name: /Passes/i }).click();
    await page.waitForURL(/\/pricing/);
    await assertNoHorizontalOverflow(page, "Mobile /pricing (Risograph)");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "mobile-pricing-risograph.png"),
      fullPage: false,
    });

    // Switch back to Pomegranate on mobile Pricing
    await page
      .getByRole("button", { name: /Switch to Pomegranate design/i })
      .click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-design",
      "pomegranate"
    );
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "mobile-pricing-pomegranate.png"),
      fullPage: false,
    });

    expect(pageErrors, `Mobile page errors: ${pageErrors.join("; ")}`).toEqual([]);
  });

  test("Design Lab (/design-lab): Isolated prototypes, Compare Both, interactive Talent guardrails, and Apply Live", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/design-lab", { waitUntil: "networkidle" });

    // Verify Compare Both side-by-side renders both interactive phones
    await page.getByRole("tab", { name: /Compare Both/i }).click();
    await expect(page.getByText(/Side-by-Side Live Comparison/i)).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "desktop-design-lab-compare.png"),
      fullPage: false,
    });

    // Switch to Desktop Site view of Pomegranate & test Talent Network guardrails
    await page.getByRole("tab", { name: /Desktop Site/i }).click();
    await page
      .getByRole("navigation", { name: /Pomegranate primary navigation/i })
      .getByRole("button", { name: /Talent/i })
      .click();
    await page.getByRole("tab", { name: /LinkedIn Card/i }).click();
    await page
      .getByRole("button", { name: /Request Double-Opt-In Intro/i })
      .click();

    await page.getByRole("button", { name: /gmail \(blocked\)/i }).click();
    await page
      .getByRole("button", { name: /Send Verified Intro Request/i })
      .click();
    await expect(page.getByText(/Blocked: Please use a verified/i)).toBeVisible();

    await page.getByRole("button", { name: /employer \(stealth\)/i }).click();
    await page
      .getByRole("button", { name: /Send Verified Intro Request/i })
      .click();
    await expect(page.getByText(/Stealth Guard/i)).toBeVisible();

    await page.getByRole("button", { name: /valid work/i }).click();
    await page
      .getByRole("button", { name: /Send Verified Intro Request/i })
      .click();
    await expect(page.getByText(/Verified! Candidate received/i)).toBeVisible();

    // Test "Use Live on Site ->" in Risograph mode
    await page.getByRole("button", { name: /Close intro modal/i }).click();
    await page.getByRole("tab", { name: /02 · Warm Paper Risograph/i }).click();
    await page.getByRole("button", { name: /Use Live on Site/i }).click();
    await page.waitForURL(/\?design=risograph/);
    await expect(page.locator("html")).toHaveAttribute(
      "data-design",
      "risograph"
    );

    expect(pageErrors, `Design Lab page errors: ${pageErrors.join("; ")}`).toEqual([]);
  });
});
