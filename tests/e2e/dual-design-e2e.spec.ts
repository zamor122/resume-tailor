import { test, expect, Page } from "@playwright/test";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR =
  process.env.VISUAL_QA_DIR ||
  "/Users/shaynezamora/.gemini/antigravity/brain/dad590fc-1d52-41f6-9b04-aaba8342e83b/scratch/visual-qa-v2";

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

test.describe("Full-Site Dual-Design E2E & Visual Verification (Modern & Classic)", () => {
  test.beforeAll(() => {
    ensureScreenshotDir();
  });

  test("Desktop (1440x900): Single central top-nav Modern/Classic switcher, menu Futureproof navigation, readable typography & progressive disclosure", async ({
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

    // 1. Load Home in default Modern (pomegranate) design
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute(
      "data-design",
      "pomegranate"
    );

    // Assert ONLY ONE visible theme switcher on desktop (inside top header)
    const visibleSwitchers = await page
      .locator('[role="radiogroup"][aria-label*="design" i]:visible')
      .count();
    expect(visibleSwitchers).toBe(1);

    const pomCanvasBg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor
    );
    expect(pomCanvasBg).toBe("rgb(255, 253, 245)"); // #FFFDF5

    await assertNoHorizontalOverflow(page, "Desktop / (Modern)");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "desktop-home-modern.png"),
      fullPage: false,
    });

    // Test Progressive Disclosure FAQ accordion below the fold
    const faqBtn = page.getByRole("button", {
      name: /Why tailor your resume for every job/i,
    });
    await faqBtn.scrollIntoViewIfNeeded();
    await expect(faqBtn).toHaveAttribute("aria-expanded", "false");
    await faqBtn.click();
    await expect(faqBtn).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(/applicant tracking systems/i)).toBeVisible();

    // Scroll back up and test Menu Drawer + Futureproof Button navigation
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole("button", { name: /Open menu/i }).click();
    const menu = page.locator("#site-nav-menu");
    await expect(menu).toBeVisible();
    // On desktop, theme switcher is hidden inside menu (stays only in top nav)
    await expect(
      menu.locator('[role="radiogroup"]:visible')
    ).toHaveCount(0);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "desktop-menu-modern.png"),
      fullPage: false,
    });

    // Click the Futureproof service button in the menu -> navigates to /futureproof & closes menu
    await expect(menu.getByRole("link", { name: /Tailor.*Match any job/i })).toBeVisible();
    await menu.getByRole("link", { name: /Futureproof.*Add AI skills/i }).click();
    await page.waitForURL(/\/futureproof/);
    await expect(menu).toBeHidden();

    // Re-open menu on /futureproof and click Tailor service button -> navigates back to /
    await page.getByRole("button", { name: /Open menu/i }).click();
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: /Tailor.*Match any job/i }).click();
    await page.waitForURL(/\/$/);
    await expect(menu).toBeHidden();

    // 2. Switch to Classic (risograph) via Top Nav Switcher
    await page
      .locator("header")
      .getByRole("radio", { name: /Classic/i })
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

    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute(
      "data-design",
      "risograph"
    );
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "desktop-home-classic.png"),
      fullPage: false,
    });

    // 3. Pricing page: verify All-Access Passes + progressive disclosure toggle
    await page.goto("/pricing", { waitUntil: "networkidle" });
    await expect(page.getByText(/One-Time All-Access/i)).toBeVisible();
    await expect(page.getByText(/2-Day All-Access Pass/i)).toBeVisible();
    await expect(page.getByText(/7-Day All-Access Pass/i)).toBeVisible();
    await expect(page.getByText(/30-Day All-Access Pass/i)).toBeVisible();
    const whyToggle = page.getByRole("button", {
      name: /Why job seekers switch/i,
    });
    await expect(whyToggle).toHaveAttribute("aria-expanded", "false");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "desktop-pricing-classic.png"),
      fullPage: false,
    });
    await whyToggle.click();
    await expect(
      page.getByRole("button", { name: /Hide details/i })
    ).toHaveAttribute("aria-expanded", "true");

    // 4. Verify ?design=modern and ?design=classic URL aliases
    await page.goto("/pricing?design=modern", { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute(
      "data-design",
      "pomegranate"
    );
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "desktop-pricing-modern.png"),
      fullPage: false,
    });

    expect(pageErrors, `Uncaught page errors: ${pageErrors.join("; ")}`).toEqual([]);
    expect(serverErrors, `5xx server errors: ${serverErrors.join("; ")}`).toEqual([]);
  });

  test("Mobile (390x844): Theme switcher ONLY in menu drawer, Futureproof menu button navigates, zero overlap/overflow", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 390, height: 844 });

    // 1. Mobile Home in Modern design
    await page.goto("/?design=modern", { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute(
      "data-design",
      "pomegranate"
    );
    await assertNoHorizontalOverflow(page, "Mobile / (Modern)");

    // Zero theme switchers visible before opening menu on mobile
    await expect(
      page.locator('[role="radiogroup"][aria-label*="design" i]:visible')
    ).toHaveCount(0);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "mobile-home-modern.png"),
      fullPage: false,
    });

    // 2. Open Mobile Menu -> ONE theme switcher visible inside menu
    await page.getByRole("button", { name: /Open menu/i }).click();
    const menu = page.locator("#site-nav-menu");
    await expect(menu).toBeVisible();
    await expect(
      page.locator('[role="radiogroup"][aria-label*="design" i]:visible')
    ).toHaveCount(1);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "mobile-menu-modern.png"),
      fullPage: false,
    });

    // Switch to Classic inside Mobile Menu
    await menu.getByRole("radio", { name: /Classic/i }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-design",
      "risograph"
    );
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "mobile-menu-classic.png"),
      fullPage: false,
    });

    // Click Futureproof CTA button inside Mobile Menu -> navigates to /futureproof
    await menu.getByRole("link", { name: /Futureproof/i }).click();
    await page.waitForURL(/\/futureproof/);
    await expect(menu).toBeHidden();
    await assertNoHorizontalOverflow(page, "Mobile /futureproof (Classic)");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "mobile-futureproof-classic.png"),
      fullPage: false,
    });

    // Verify Mobile Bottom Nav works cleanly
    const mobileNav = page.getByRole("navigation", {
      name: /Mobile quick navigation/i,
    });
    await expect(mobileNav).toBeVisible();
    await mobileNav.getByRole("link", { name: /Tailor/i }).click();
    await page.waitForURL(/\/$/);
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "mobile-home-classic.png"),
      fullPage: false,
    });

    expect(pageErrors, `Mobile page errors: ${pageErrors.join("; ")}`).toEqual([]);
  });
});
