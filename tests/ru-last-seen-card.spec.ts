/**
 * ru-last-seen-card tests, run against the mock-hass harness
 * (dev/harness.html).
 *
 * Harness fixture: four timestamp sensors aged relative to page load —
 * sensor.front_door_last_seen 5 min, sensor.back_door_last_seen 5 h,
 * sensor.cellar_last_seen 2 d, sensor.attic_last_seen unavailable (named
 * "Attic sensor" via config). Mounted twice: #card-last-seen with the default
 * thresholds (2 h / 24 h) and #card-last-seen-strict with 1 h / 4 h.
 */

import { test, expect, type Page } from "@playwright/test";

const CARD = "#card-last-seen ru-last-seen-card";
const STRICT = "#card-last-seen-strict ru-last-seen-card";
const FRONT = "sensor.front_door_last_seen";
const BACK = "sensor.back_door_last_seen";
const CELLAR = "sensor.cellar_last_seen";
const ATTIC = "sensor.attic_last_seen";

function row(page: Page, entity: string, card = CARD) {
  return page.locator(`${card} .row[data-entity="${entity}"]`);
}

async function setTimestamp(
  page: Page,
  entity: string,
  iso: string | null
): Promise<void> {
  await page.evaluate(
    ([e, i]) => window.__harness.setTimestamp(e as string, i as string | null),
    [entity, iso] as const
  );
}

function statusColor(page: Page, entity: string): Promise<string> {
  return row(page, entity)
    .locator(".row-status")
    .evaluate((el) => getComputedStyle(el).color);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/dev/harness.html");
  await expect(page.locator(CARD)).toBeVisible();
});

test("each age lands in its color at the default thresholds", async ({
  page,
}) => {
  await expect(row(page, FRONT)).toHaveClass(/\bfresh\b/);
  await expect(row(page, FRONT).locator(".row-status")).toHaveText(
    "Seen 5 min ago"
  );
  await expect(row(page, BACK)).toHaveClass(/\bstale\b/);
  await expect(row(page, BACK).locator(".row-status")).toHaveText(
    "Not seen for 5 h"
  );
  await expect(row(page, CELLAR)).toHaveClass(/\bdead\b/);
  await expect(row(page, CELLAR).locator(".row-status")).toHaveText(
    "Not seen for 2 d"
  );

  expect(await statusColor(page, FRONT)).toBe("rgb(31, 157, 92)");
  expect(await statusColor(page, BACK)).toBe("rgb(178, 116, 0)");
  expect(await statusColor(page, CELLAR)).toBe("rgb(224, 54, 42)");
});

test("an unavailable timestamp is grey and uses the configured name", async ({
  page,
}) => {
  await expect(row(page, ATTIC)).toHaveClass(/\bunknown\b/);
  await expect(row(page, ATTIC).locator(".row-name")).toHaveText(
    "Attic sensor"
  );
  await expect(row(page, ATTIC).locator(".row-status")).toHaveText(
    "No last-seen time"
  );
});

test("names default to the friendly name", async ({ page }) => {
  await expect(row(page, FRONT).locator(".row-name")).toHaveText("Front Door");
});

test("the summary counts rows that aren't fresh", async ({ page }) => {
  await expect(page.locator(`${CARD} .summary`)).toHaveText(
    "3 of 4 not reporting"
  );
  await expect(page.locator(`${CARD} .summary`)).toHaveClass(/\bdead\b/);

  const now = new Date().toISOString();
  for (const entity of [BACK, CELLAR, ATTIC]) {
    await setTimestamp(page, entity, now);
  }
  await expect(page.locator(`${CARD} .summary`)).toHaveText("All reporting");
  await expect(row(page, CELLAR).locator(".row-status")).toHaveText(
    "Seen just now"
  );
});

test("custom thresholds shift the colors", async ({ page }) => {
  // 5 h old: yellow at 2 h / 24 h, red at 1 h / 4 h.
  await expect(row(page, BACK)).toHaveClass(/\bstale\b/);
  await expect(row(page, BACK, STRICT)).toHaveClass(/\bdead\b/);
  // 5 min old: green under both.
  await expect(row(page, FRONT, STRICT)).toHaveClass(/\bfresh\b/);
});

test("a device coming back turns its row green", async ({ page }) => {
  await setTimestamp(page, CELLAR, new Date().toISOString());
  await expect(row(page, CELLAR)).toHaveClass(/\bfresh\b/);
});

test("hovering shows the exact last-seen time", async ({ page }) => {
  await expect(row(page, FRONT)).toHaveAttribute("title", /^Last seen /);
  await expect(row(page, ATTIC)).toHaveAttribute("title", "");
});

test("dark mode switches to the dark palette", async ({ page }) => {
  await page.evaluate(() => window.__harness.setDarkMode(true));
  await expect(page.locator(CARD)).toHaveAttribute("dark", "");
  expect(await statusColor(page, BACK)).toBe("rgb(245, 165, 36)");
});

test("tapping a row fires hass-more-info for its entity", async ({ page }) => {
  // Listener registered (and awaited) before the click, so it can't miss it.
  await page.evaluate(() => {
    document.addEventListener("hass-more-info", (event) => {
      (window as unknown as { __moreInfo: string }).__moreInfo = (
        event as CustomEvent<{ entityId: string }>
      ).detail.entityId;
    });
  });
  await row(page, CELLAR).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { __moreInfo?: string }).__moreInfo
    )
  ).toBe(CELLAR);
});
