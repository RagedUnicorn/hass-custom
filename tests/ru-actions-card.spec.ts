/**
 * ru-actions-card tests, run against the mock-hass harness (dev/harness.html).
 *
 * Harness fixture: four actions — Shutters down (label t_shutter: on four
 * cover devices, three open and one closed), Office closed (area office: one
 * cover through its device, one on the entity itself, both closed), All
 * lights off (entity_id all: 4 of the 7 available lights on, amber) and Movie
 * (a scene with a fixed subtitle, green).
 */

import { test, expect, type Page } from "@playwright/test";

const CARD = "#card-actions ru-actions-card";

function tile(page: Page, name: string) {
  return page.locator(`${CARD} .tile`, {
    has: page.locator(".name", { hasText: name }),
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/dev/harness.html");
  await expect(page.locator(CARD)).toBeVisible();
});

test("renders the title and one tile per action", async ({ page }) => {
  await expect(page.locator(`${CARD} .title`)).toHaveText("Quick actions");
  await expect(page.locator(`${CARD} .tile`)).toHaveCount(4);
});

test("a label target counts covers labelled directly or through their device", async ({
  page,
}) => {
  await expect(tile(page, "Shutters down").locator(".status")).toHaveText(
    "3 of 4 open"
  );
});

test("an area target counts the device's area and the entity's own", async ({
  page,
}) => {
  await expect(tile(page, "Office closed").locator(".status")).toHaveText(
    "All 2 closed"
  );
});

test("entity_id all counts every light of the domain", async ({ page }) => {
  await expect(tile(page, "All lights off").locator(".status")).toHaveText(
    "4 lights on"
  );
  await expect(tile(page, "All lights off")).toHaveClass(/\bamber\b/);
});

test("a fixed subtitle replaces the derived status", async ({ page }) => {
  await expect(tile(page, "Movie").locator(".status")).toHaveText(
    "Dim and close"
  );
  await expect(tile(page, "Movie")).toHaveClass(/\bgreen\b/);
});

test("tapping a tile performs the action with its target", async ({ page }) => {
  await tile(page, "Shutters down").click();
  await tile(page, "All lights off").click();
  await expect
    .poll(() => page.evaluate(() => window.__harness.calls))
    .toEqual([
      { domain: "cover", service: "close_cover", data: { label_id: "t_shutter" } },
      { domain: "light", service: "turn_off", data: { entity_id: "all" } },
    ]);
});

test("the tile pulses until Home Assistant answers", async ({ page }) => {
  // Swap in a callService that answers only when the test says so.
  await page.evaluate(() => {
    const card = document.querySelector("#card-actions ru-actions-card") as
      | (HTMLElement & { hass: Record<string, unknown> })
      | null;
    card!.hass = {
      ...card!.hass,
      callService: () =>
        new Promise<void>((resolve) => {
          (window as unknown as { __answer: () => void }).__answer = resolve;
        }),
    };
  });
  await tile(page, "Shutters down").click();
  await expect(tile(page, "Shutters down")).toHaveClass(/\bpending\b/);
  await page.evaluate(() =>
    (window as unknown as { __answer: () => void }).__answer()
  );
  await expect(tile(page, "Shutters down")).not.toHaveClass(/\bpending\b/);
});

test("dark mode switches to the dark palette", async ({ page }) => {
  await page.evaluate(() => window.__harness.setDarkMode(true));
  await expect(page.locator(CARD)).toHaveAttribute("dark", "");
  expect(
    await tile(page, "All lights off")
      .locator(".status")
      .evaluate((el) => getComputedStyle(el).color)
  ).toBe("rgb(255, 198, 92)");
});

test("light and cover groups are left out of the count", async ({ page }) => {
  // statusText straight off the dev server — the harness fixture has no
  // group entities, so the fake states live here.
  const text = await page.evaluate(async () => {
    // A variable keeps tsc from resolving the dev server path.
    const modulePath = "/src/cards/ru-actions-card/action-state.ts";
    const { statusText } = await import(/* @vite-ignore */ modulePath);
    const light = (state: string, members?: string[]) => ({
      entity_id: "",
      state,
      attributes: members ? { entity_id: members } : {},
    });
    const hass = {
      states: {
        "light.a": light("on"),
        "light.b": light("on"),
        "light.c": light("off"),
        "light.room": light("on", ["light.a", "light.b"]),
      },
      callService: async () => undefined,
    };
    return statusText(hass, "light", Object.keys(hass.states));
  });
  expect(text).toBe("2 lights on");
});
