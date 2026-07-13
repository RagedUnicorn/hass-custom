/**
 * ru-lights-card tests, run against the mock-hass harness
 * (dev/harness.html). Service effects are asserted through the harness call
 * log (window.__harness.calls); nothing here touches a real Home Assistant.
 *
 * Harness fixture: Kitchen (2 bulbs on at 80% + 1 off), Bedroom (1 off +
 * 1 UNAVAILABLE), Living room (strip on at 65% with Static/Flow/Pulse
 * effects, Flow active), Office (1 on at 100%), Entry (1 NON-DIMMABLE, off);
 * scenes Relax / Focus / Movie / Everything.
 */

import { test, expect, type Page } from "@playwright/test";

const CARD = "ru-lights-card";

async function openHarness(page: Page): Promise<void> {
  await page.goto("/dev/harness.html");
  await expect(page.locator(CARD)).toBeVisible();
}

function calls(page: Page) {
  return page.evaluate(() => window.__harness.calls);
}

function room(page: Page, name: string) {
  return page.locator(`${CARD} .room`, {
    has: page.locator(".room-name", { hasText: name }),
  });
}

test.beforeEach(async ({ page }) => {
  await openHarness(page);
});

test("renders title, summary and all rooms", async ({ page }) => {
  await expect(page.locator(`${CARD} .title`)).toHaveText("Lights");
  // 4 of the 7 available lights are on (2 kitchen bulbs, strip, office).
  await expect(page.locator(`${CARD} .summary`)).toHaveText("4 of 7 lights on");
  await expect(page.locator(`${CARD} .room`)).toHaveCount(5);
  await expect(room(page, "Kitchen").locator(".room-status")).toHaveText(
    "2 of 3 on · 80%"
  );
  await expect(room(page, "Living room").locator(".room-status")).toHaveText(
    "On · 65%"
  );
  await expect(room(page, "Bedroom").locator(".room-status")).toHaveText("Off");
});

test("room dot toggles the room's available lights only", async ({ page }) => {
  // Kitchen has lights on → toggling turns the whole room off.
  await room(page, "Kitchen").locator(".dot-circle").click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      {
        domain: "light",
        service: "turn_off",
        data: {
          entity_id: ["light.kitchen_1", "light.kitchen_2", "light.kitchen_3"],
        },
      },
    ]);

  // Bedroom is off → toggling turns on, excluding its unavailable bulb.
  await room(page, "Bedroom").locator(".dot-circle").click();
  await expect
    .poll(() => calls(page))
    .toContainEqual({
      domain: "light",
      service: "turn_on",
      data: { entity_id: ["light.bedroom_1"] },
    });
});

test("global chips target every available light", async ({ page }) => {
  await page.locator(`${CARD} .chip`, { hasText: "All off" }).click();
  const [call] = await calls(page);
  expect(call.domain).toBe("light");
  expect(call.service).toBe("turn_off");
  expect(call.data?.entity_id).toEqual([
    "light.kitchen_1",
    "light.kitchen_2",
    "light.kitchen_3",
    "light.bedroom_1",
    "light.livingroom_strip",
    "light.office_1",
    "light.entry_1",
  ]);
  await expect(page.locator(`${CARD} .summary`)).toHaveText("All off");
});

test("dragging a room slider sends one turn_on with brightness_pct on release", async ({
  page,
}) => {
  const slider = room(page, "Kitchen").locator(".slider");
  const box = (await slider.boundingBox())!;

  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, {
    steps: 5,
  });
  await page.mouse.up();

  const log = await calls(page);
  expect(log).toHaveLength(1);
  expect(log[0].service).toBe("turn_on");
  expect(log[0].data?.entity_id).toEqual([
    "light.kitchen_1",
    "light.kitchen_2",
    "light.kitchen_3",
  ]);
  expect(Number(log[0].data?.brightness_pct)).toBeGreaterThanOrEqual(25);
  expect(Number(log[0].data?.brightness_pct)).toBeLessThanOrEqual(35);
});

test("dragging a room slider to zero turns the room off", async ({ page }) => {
  const slider = room(page, "Kitchen").locator(".slider");
  const box = (await slider.boundingBox())!;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 30, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();

  const log = await calls(page);
  expect(log).toHaveLength(1);
  expect(log[0].service).toBe("turn_off");
  expect(log[0].data?.brightness_pct).toBeUndefined();
});

test.describe("drilldown", () => {
  test("opens on room tap and closes via ✕, scrim and Escape", async ({
    page,
  }) => {
    const sheet = page.locator(`${CARD} .sheet`);

    await room(page, "Kitchen").locator(".room-row").click();
    await expect(sheet).toBeVisible();
    await expect(page.locator(`${CARD} .sheet-name`)).toHaveText("Kitchen");
    await page.locator(`${CARD} .close`).click();
    await expect(sheet).toBeHidden();

    await room(page, "Kitchen").locator(".room-row").click();
    await expect(sheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    await room(page, "Kitchen").locator(".room-row").click();
    await expect(sheet).toBeVisible();
    await page.locator(`${CARD} .scrim`).click({ position: { x: 5, y: 5 } });
    await expect(sheet).toBeHidden();
  });

  test("bottom sheet on narrow viewports, centered dialog on wide", async ({
    page,
  }, testInfo) => {
    await room(page, "Kitchen").locator(".room-row").click();
    const sheet = page.locator(`${CARD} .sheet`);
    await expect(sheet).toBeVisible();
    const box = (await sheet.boundingBox())!;
    const viewport = page.viewportSize()!;
    const gapBelow = viewport.height - (box.y + box.height);
    if (testInfo.project.name.startsWith("mobile")) {
      expect(gapBelow).toBeLessThan(2); // flush with the bottom
    } else {
      expect(gapBelow).toBeGreaterThan(20); // floating, not docked
      expect(box.y).toBeGreaterThan(20);
    }
  });

  test("dragging a bulb bar sends one turn_on with brightness_pct on release", async ({
    page,
  }) => {
    await room(page, "Kitchen").locator(".room-row").click();
    const bar = page.locator(`${CARD} .bulb .bar`).first();
    const box = (await bar.boundingBox())!;

    // Drag from the middle to 25% from the bottom → brightness ≈ 25.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.75, {
      steps: 5,
    });
    await page.mouse.up();

    const log = await calls(page);
    expect(log).toHaveLength(1);
    expect(log[0].service).toBe("turn_on");
    expect(log[0].data?.entity_id).toEqual(["light.kitchen_1"]);
    expect(Number(log[0].data?.brightness_pct)).toBeGreaterThanOrEqual(20);
    expect(Number(log[0].data?.brightness_pct)).toBeLessThanOrEqual(30);
  });

  test("bulb toggles switch individual lights", async ({ page }) => {
    await room(page, "Kitchen").locator(".room-row").click();
    const bulbs = page.locator(`${CARD} .bulb`);

    await bulbs.nth(0).locator(".toggle").click(); // kitchen_1 is on
    await bulbs.nth(2).locator(".toggle").click(); // kitchen_3 is off
    await expect
      .poll(() => calls(page))
      .toEqual([
        {
          domain: "light",
          service: "turn_off",
          data: { entity_id: ["light.kitchen_1"] },
        },
        {
          domain: "light",
          service: "turn_on",
          data: { entity_id: ["light.kitchen_3"] },
        },
      ]);
  });

  test("effect chips render for the strip and set the effect", async ({
    page,
  }) => {
    await room(page, "Living room").locator(".room-row").click();
    const chips = page.locator(`${CARD} .effect`);
    await expect(chips).toHaveCount(3);
    await expect(page.locator(`${CARD} .effect.active`)).toHaveText("Flow");

    await chips.filter({ hasText: "Pulse" }).click();
    await expect
      .poll(() => calls(page))
      .toContainEqual({
        domain: "light",
        service: "turn_on",
        data: { entity_id: ["light.livingroom_strip"], effect: "Pulse" },
      });
    // The mock applies the effect, so the active chip follows.
    await expect(page.locator(`${CARD} .effect.active`)).toHaveText("Pulse");
  });

  test("non-dimmable light gets a toggle but no drag bar", async ({ page }) => {
    await room(page, "Entry").locator(".room-row").click();
    const bulb = page.locator(`${CARD} .bulb`);
    await expect(bulb).toHaveCount(1);
    await expect(bulb.locator(".bar")).toHaveCount(0);
    await expect(bulb.locator(".toggle")).toHaveCount(1);
  });

  test("unavailable light renders grayed out with a disabled toggle", async ({
    page,
  }) => {
    await room(page, "Bedroom").locator(".room-row").click();
    const unavailable = page.locator(`${CARD} .bulb.unavailable`);
    await expect(unavailable).toHaveCount(1);
    await expect(unavailable.locator(".bulb-status")).toHaveText("Unavailable");
    await expect(unavailable.locator(".toggle")).toBeDisabled();
  });
});

test.describe("scenes", () => {
  test("activating a scene calls scene.turn_on and moves the recency ring", async ({
    page,
  }) => {
    const scenes = page.locator(`${CARD} .scene`);
    await expect(scenes).toHaveCount(4);
    await expect(page.locator(`${CARD} .scene.active`)).toHaveCount(0);

    await scenes.filter({ hasText: "Movie" }).click();
    await expect
      .poll(() => calls(page))
      .toContainEqual({
        domain: "scene",
        service: "turn_on",
        data: { entity_id: "scene.movie" },
      });
    await expect(page.locator(`${CARD} .scene.active`)).toHaveText("Movie");
    // The mock applied the scene: kitchen off, strip dimmed to 40%.
    await expect(room(page, "Kitchen").locator(".room-status")).toHaveText(
      "Off"
    );
    await expect(room(page, "Living room").locator(".room-status")).toHaveText(
      "On · 40%"
    );

    // The ring follows the most recently activated scene.
    await scenes.filter({ hasText: "Relax" }).click();
    await expect(page.locator(`${CARD} .scene.active`)).toHaveText("Relax");
  });
});

test.describe("dark mode", () => {
  test("follows hass.themes.darkMode and keeps explicit overrides", async ({
    page,
  }) => {
    const card = page.locator(CARD);
    const cardSurface = page.locator(`${CARD} .card`);
    const lightBg = await cardSurface.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );

    await page.evaluate(() => window.__harness.setDarkMode(true));
    await expect(card).toHaveAttribute("dark", "");
    const darkBg = await cardSurface.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    expect(darkBg).not.toBe(lightBg);

    // An explicit per-property override must win over both palettes.
    await page.evaluate(() => {
      document
        .querySelector("ru-lights-card")!
        .setAttribute("style", "--ru-lights-bg: rgb(1, 2, 3)");
    });
    await expect
      .poll(() =>
        cardSurface.evaluate((el) => getComputedStyle(el).backgroundColor)
      )
      .toBe("rgb(1, 2, 3)");

    await page.evaluate(() => window.__harness.setDarkMode(false));
    await expect(card).not.toHaveAttribute("dark");
  });
});
