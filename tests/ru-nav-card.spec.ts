/**
 * ru-nav-card tests, run against the mock-hass harness (dev/harness.html).
 *
 * Harness fixture: one route config mounted twice — #card-nav (360px, compact)
 * and #card-nav-wide (720px, labels on the desktop project). Main points at the
 * harness page itself so it starts active; Lights/Climate/Media are fake paths
 * the card pushes without a reload; Settings is admin_only (the mock user is
 * an admin until setAdmin(false)).
 */

import { test, expect, type Page } from "@playwright/test";

const CARD = "#card-nav ru-nav-card";
const WIDE = "#card-nav-wide ru-nav-card";

function item(page: Page, card: string, path: string) {
  return page.locator(`${card} .item[data-path="${path}"]`);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/dev/harness.html");
  await expect(page.locator(CARD)).toBeVisible();
});

test("the route matching the current location is active", async ({ page }) => {
  await expect(item(page, CARD, "/dev/harness.html")).toHaveClass(/\bactive\b/);
  await expect(item(page, CARD, "/dev/harness.html")).toHaveAttribute(
    "aria-current",
    "page"
  );
  await expect(item(page, CARD, "/dev/nav/lights")).not.toHaveClass(
    /\bactive\b/
  );
});

test("tapping a route navigates and moves the highlight on every dock", async ({
  page,
}) => {
  // Listener registered (and awaited) before the click, so it can't miss it.
  await page.evaluate(() => {
    window.addEventListener("location-changed", () => {
      (window as unknown as { __navigated: number }).__navigated =
        ((window as unknown as { __navigated?: number }).__navigated ?? 0) + 1;
    });
  });
  await item(page, CARD, "/dev/nav/lights").click();

  expect(new URL(page.url()).pathname).toBe("/dev/nav/lights");
  expect(
    await page.evaluate(
      () => (window as unknown as { __navigated?: number }).__navigated
    )
  ).toBe(1);
  await expect(item(page, CARD, "/dev/nav/lights")).toHaveClass(/\bactive\b/);
  await expect(item(page, CARD, "/dev/harness.html")).not.toHaveClass(
    /\bactive\b/
  );
  // The second dock heard the same location-changed and follows along.
  await expect(item(page, WIDE, "/dev/nav/lights")).toHaveClass(/\bactive\b/);
});

test("tapping the active route does not navigate again", async ({ page }) => {
  await page.evaluate(() => {
    window.addEventListener("location-changed", () => {
      (window as unknown as { __navigated: boolean }).__navigated = true;
    });
  });
  await item(page, CARD, "/dev/harness.html").click();
  expect(
    await page.evaluate(
      () => (window as unknown as { __navigated?: boolean }).__navigated
    )
  ).toBeUndefined();
});

test("back follows the browser history", async ({ page }) => {
  await item(page, CARD, "/dev/nav/climate").click();
  await expect(item(page, CARD, "/dev/nav/climate")).toHaveClass(/\bactive\b/);
  await page.goBack();
  await expect(item(page, CARD, "/dev/harness.html")).toHaveClass(/\bactive\b/);
});

test("a subview path keeps its parent route active", async ({ page }) => {
  await page.evaluate(() => {
    window.history.pushState(null, "", "/dev/nav/media/remote");
    window.dispatchEvent(new CustomEvent("location-changed"));
  });
  await expect(item(page, CARD, "/dev/nav/media")).toHaveClass(/\bactive\b/);
});

test("compact shows icons only, the active route keeps its label", async ({
  page,
}) => {
  await expect(
    item(page, CARD, "/dev/harness.html").locator(".label")
  ).toBeVisible();
  await expect(
    item(page, CARD, "/dev/nav/lights").locator(".label")
  ).toBeHidden();
});

test("a wide card shows every label", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile-chromium",
    "the 390px viewport keeps the wide slot below the 600px label width"
  );
  await expect(
    item(page, WIDE, "/dev/nav/lights").locator(".label")
  ).toBeVisible();
  await expect(item(page, WIDE, "/dev/nav/lights").locator(".label")).toHaveText(
    "Lights"
  );
});

test("admin_only routes are hidden from non-admin users", async ({ page }) => {
  await expect(item(page, CARD, "/dev/nav/settings")).toHaveCount(1);
  await page.evaluate(() => window.__harness.setAdmin(false));
  await expect(item(page, CARD, "/dev/nav/settings")).toHaveCount(0);
});

test("dark mode switches to the dark palette", async ({ page }) => {
  await page.evaluate(() => window.__harness.setDarkMode(true));
  await expect(page.locator(CARD)).toHaveAttribute("dark", "");
  expect(
    await item(page, CARD, "/dev/harness.html").evaluate(
      (el) => getComputedStyle(el).backgroundColor
    )
  ).toBe("rgb(124, 144, 255)");
});
