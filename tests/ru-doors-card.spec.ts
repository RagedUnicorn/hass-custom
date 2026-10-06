/**
 * ru-doors-card tests, run against the mock-hass harness (dev/harness.html).
 *
 * Harness fixture: binary_sensor.workshop_door (closed) and
 * binary_sensor.workshop_safe_door (open, custom mdi:safe icon), presence
 * person.me (home). Both doors last changed 12 minutes before page load.
 */

import { test, expect, type Page } from "@playwright/test";

const CARD = "#card-doors ru-doors-card";
const DOOR = "binary_sensor.workshop_door";
const SAFE = "binary_sensor.workshop_safe_door";
const PERSON = "person.me";

function door(page: Page, entity: string) {
  return page.locator(`${CARD} .door[data-entity="${entity}"]`);
}

async function setDoor(
  page: Page,
  entity: string,
  patch: { open?: boolean; available?: boolean }
): Promise<void> {
  await page.evaluate(
    ([e, p]) => window.__harness.setDoor(e as string, p as { open?: boolean }),
    [entity, patch] as const
  );
}

async function setPerson(page: Page, state: string): Promise<void> {
  await page.evaluate(
    ([e, s]) => window.__harness.setPerson(e, s),
    [PERSON, state] as const
  );
}

/** The resolved color of a door's status line — what the user actually sees. */
function statusColor(page: Page, entity: string): Promise<string> {
  return door(page, entity)
    .locator(".door-status")
    .evaluate((el) => getComputedStyle(el).color);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/dev/harness.html");
  await expect(page.locator(CARD)).toBeVisible();
});

test("renders each door with its friendly name and the since text", async ({
  page,
}) => {
  await expect(door(page, DOOR).locator(".door-name")).toHaveText(
    "Workshop Door"
  );
  await expect(door(page, SAFE).locator(".door-name")).toHaveText(
    "Workshop Safe Door"
  );
  await expect(door(page, DOOR).locator(".door-since")).toHaveText("12 min");
});

test("closed is green, open while home is yellow", async ({ page }) => {
  await expect(door(page, DOOR)).toHaveClass(/\bclosed\b/);
  await expect(door(page, DOOR).locator(".door-status")).toHaveText("Closed");
  await expect(door(page, SAFE)).toHaveClass(/\bopen-home\b/);
  await expect(door(page, SAFE).locator(".door-status")).toHaveText("Open");

  expect(await statusColor(page, DOOR)).toBe("rgb(31, 157, 92)");
  expect(await statusColor(page, SAFE)).toBe("rgb(178, 116, 0)");
  await expect(page.locator(`${CARD} .summary`)).toHaveText("1 open");
});

test("leaving home turns an open door red, coming back turns it yellow", async ({
  page,
}) => {
  await setPerson(page, "not_home");
  await expect(door(page, SAFE)).toHaveClass(/\bopen-away\b/);
  await expect(door(page, SAFE).locator(".door-status")).toHaveText(
    "Open, you're away"
  );
  expect(await statusColor(page, SAFE)).toBe("rgb(224, 54, 42)");
  // A closed door stays green regardless of presence.
  await expect(door(page, DOOR)).toHaveClass(/\bclosed\b/);

  await setPerson(page, "home");
  await expect(door(page, SAFE)).toHaveClass(/\bopen-home\b/);
});

test("a named zone and an unknown presence both count as away", async ({
  page,
}) => {
  await setPerson(page, "Work");
  await expect(door(page, SAFE)).toHaveClass(/\bopen-away\b/);
  await setPerson(page, "unknown");
  await expect(door(page, SAFE)).toHaveClass(/\bopen-away\b/);
});

test("opening and closing a door follows the contact", async ({ page }) => {
  await setDoor(page, DOOR, { open: true });
  await expect(door(page, DOOR)).toHaveClass(/\bopen-home\b/);
  await expect(door(page, DOOR).locator(".door-since")).toHaveText("just now");
  await expect(page.locator(`${CARD} .summary`)).toHaveText("2 open");

  await setDoor(page, DOOR, { open: false });
  await setDoor(page, SAFE, { open: false });
  await expect(door(page, SAFE)).toHaveClass(/\bclosed\b/);
  await expect(page.locator(`${CARD} .summary`)).toHaveText("All closed");
});

test("an unavailable contact is grey with no since text", async ({ page }) => {
  await setDoor(page, DOOR, { available: false });
  await expect(door(page, DOOR)).toHaveClass(/\bunknown\b/);
  await expect(door(page, DOOR).locator(".door-status")).toHaveText(
    "Unavailable"
  );
  await expect(door(page, DOOR).locator(".door-since")).toHaveCount(0);
});

test("dark mode switches to the dark palette", async ({ page }) => {
  await page.evaluate(() => window.__harness.setDarkMode(true));
  await expect(page.locator(CARD)).toHaveAttribute("dark", "");
  expect(await statusColor(page, SAFE)).toBe("rgb(245, 165, 36)");
});

test("tapping a door fires hass-more-info for its entity", async ({ page }) => {
  // Listener registered (and awaited) before the click, so it can't miss it.
  await page.evaluate(() => {
    document.addEventListener("hass-more-info", (event) => {
      (window as unknown as { __moreInfo: string }).__moreInfo = (
        event as CustomEvent<{ entityId: string }>
      ).detail.entityId;
    });
  });
  await door(page, SAFE).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { __moreInfo?: string }).__moreInfo
    )
  ).toBe(SAFE);
});
