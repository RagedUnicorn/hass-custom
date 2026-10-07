/**
 * ru-header-card tests, run against the mock-hass harness (dev/harness.html).
 *
 * Harness fixture: title "Home", one presence pill for person.me (friendly
 * name "Me", home). The mock's profile is en / DMY / 24 h, so the date line
 * is deterministic once the clock is pinned.
 */

import { test, expect, type Page } from "@playwright/test";

const CARD = "#card-header ru-header-card";
const PERSON = "person.me";

function pill(page: Page) {
  return page.locator(`${CARD} .pill[data-entity="${PERSON}"]`);
}

async function setPerson(page: Page, state: string): Promise<void> {
  await page.evaluate(
    ([e, s]) => window.__harness.setPerson(e, s),
    [PERSON, state] as const
  );
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-07T19:42:00"));
  await page.goto("/dev/harness.html");
  await expect(page.locator(CARD)).toBeVisible();
});

test("renders the title and the date line in the profile's format", async ({
  page,
}) => {
  await expect(page.locator(`${CARD} .title`)).toHaveText("Home");
  await expect(page.locator(`${CARD} .date`)).toHaveText("Wed 7 Oct · 19:42");
});

test("a person at home gets a green pill", async ({ page }) => {
  await expect(pill(page).locator(".name")).toHaveText("Me");
  await expect(pill(page).locator(".state")).toHaveText("Home");
  await expect(pill(page)).toHaveClass(/\bhome\b/);
});

test("away, a zone and an unknown state read as such, grey", async ({
  page,
}) => {
  await setPerson(page, "not_home");
  await expect(pill(page).locator(".state")).toHaveText("Away");
  await expect(pill(page)).toHaveClass(/\baway\b/);

  await setPerson(page, "Work");
  await expect(pill(page).locator(".state")).toHaveText("Work");

  await setPerson(page, "unknown");
  await expect(pill(page).locator(".state")).toHaveText("Unknown");
});

test("tapping a pill fires hass-more-info for the person", async ({ page }) => {
  await page.evaluate(() => {
    document.addEventListener("hass-more-info", (event) => {
      (window as unknown as { __moreInfo: string }).__moreInfo = (
        event as CustomEvent<{ entityId: string }>
      ).detail.entityId;
    });
  });
  await pill(page).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { __moreInfo?: string }).__moreInfo
    )
  ).toBe(PERSON);
});

test("dark mode switches to the dark palette", async ({ page }) => {
  await page.evaluate(() => window.__harness.setDarkMode(true));
  await expect(page.locator(CARD)).toHaveAttribute("dark", "");
  expect(
    await pill(page)
      .locator(".dot")
      .evaluate((el) => getComputedStyle(el).backgroundColor)
  ).toBe("rgb(79, 209, 143)");
});
