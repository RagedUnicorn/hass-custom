/**
 * ru-purifier-card tests, run against the mock-hass harness
 * (dev/harness.html). Service effects are asserted through the harness call
 * log (window.__harness.calls); nothing here touches a real Home Assistant.
 *
 * Harness fixture: fan.bedroom_dyson_purifier ON in Auto at 40% (step 10 →
 * 10 ticks, speed 4), oscillating; switch.bedroom_purifier_night_mode OFF;
 * PM2.5 = 8 µg/m³, PM10 = 12 µg/m³ (air quality "Good").
 */

import { test, expect, type Page } from "@playwright/test";

const CARD = "ru-purifier-card";
const FAN = "fan.bedroom_dyson_purifier";
const NIGHT = "switch.bedroom_purifier_night_mode";

async function openHarness(page: Page): Promise<void> {
  await page.goto("/dev/harness.html");
  await expect(page.locator(CARD)).toBeVisible();
}

function calls(page: Page) {
  return page.evaluate(() => window.__harness.calls);
}

function mode(page: Page, name: string) {
  return page.locator(`${CARD} .mode`, { hasText: name });
}

test.beforeEach(async ({ page }) => {
  await openHarness(page);
});

test("renders title, summary, device state and air quality", async ({
  page,
}) => {
  await expect(page.locator(`${CARD} .title`)).toHaveText("Air");
  await expect(page.locator(`${CARD} .summary`)).toHaveText("Auto · Good");
  await expect(page.locator(`${CARD} .device-name`)).toHaveText(
    "Bedroom Purifier"
  );
  await expect(page.locator(`${CARD} .device-status`)).toHaveText(
    "Auto · speed 4 · oscillating"
  );
  await expect(page.locator(`${CARD} .speed-value`)).toHaveText("Auto · 4");
  await expect(page.locator(`${CARD} .tick`)).toHaveCount(10);
  await expect(page.locator(`${CARD} .tick.on`)).toHaveCount(4);
  await expect(page.locator(`${CARD} .mode`)).toHaveCount(3);
  await expect(page.locator(`${CARD} .mode.active`)).toHaveText("Auto");
  await expect(page.locator(`${CARD} .aq-word`)).toHaveText("Good");
  await expect(page.locator(`${CARD} .aq-value`).nth(0)).toHaveText(
    "8 µg/m³"
  );
  await expect(page.locator(`${CARD} .aq-value`).nth(1)).toHaveText(
    "12 µg/m³"
  );
});

test("power toggle turns the fan off and on", async ({ page }) => {
  const power = page.locator(`${CARD} .device-row .toggle`);
  const spinner = page.locator(`${CARD} .spinner`);

  await power.click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      { domain: "fan", service: "turn_off", data: { entity_id: FAN } },
    ]);
  await expect(page.locator(`${CARD} .device-status`)).toHaveText("Off");
  await expect(page.locator(`${CARD} .summary`)).toHaveText("Off · Good");
  await expect(spinner).toHaveClass(/off/);
  await expect(page.locator(`${CARD} .tick.on`)).toHaveCount(0);

  await power.click();
  await expect
    .poll(() => calls(page))
    .toContainEqual({
      domain: "fan",
      service: "turn_on",
      data: { entity_id: FAN },
    });
  await expect(page.locator(`${CARD} .device-status`)).toHaveText(
    "Auto · speed 4 · oscillating"
  );
});

test("tapping a speed tick sets the percentage and switches to manual", async ({
  page,
}) => {
  await page.locator(`${CARD} .tick`).nth(6).click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      {
        domain: "fan",
        service: "set_percentage",
        data: { entity_id: FAN, percentage: 70 },
      },
    ]);
  // The mock clears the preset on set_percentage — the card reads manual.
  await expect(page.locator(`${CARD} .speed-value`)).toHaveText("7 of 10");
  await expect(page.locator(`${CARD} .tick.on`)).toHaveCount(7);
  await expect(page.locator(`${CARD} .mode.active`)).toHaveText("Manual");
  await expect(page.locator(`${CARD} .device-status`)).toHaveText(
    "Manual · speed 7 · oscillating"
  );
});

test("mode chips switch between Auto, Manual and Night exclusively", async ({
  page,
}) => {
  // Auto → Manual re-asserts the current speed as a percentage.
  await mode(page, "Manual").click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      {
        domain: "fan",
        service: "set_percentage",
        data: { entity_id: FAN, percentage: 40 },
      },
    ]);
  await expect(page.locator(`${CARD} .mode.active`)).toHaveText("Manual");

  // Manual → Night turns the night-mode switch on.
  await mode(page, "Night").click();
  await expect
    .poll(() => calls(page))
    .toContainEqual({
      domain: "switch",
      service: "turn_on",
      data: { entity_id: NIGHT },
    });
  await expect(page.locator(`${CARD} .mode.active`)).toHaveText("Night");
  await expect(page.locator(`${CARD} .device-status`)).toHaveText(
    "Night · speed 4 · oscillating"
  );

  // Night → Auto leaves night mode and re-enters the Auto preset.
  await mode(page, "Auto").click();
  const log = await calls(page);
  expect(log).toContainEqual({
    domain: "switch",
    service: "turn_off",
    data: { entity_id: NIGHT },
  });
  expect(log).toContainEqual({
    domain: "fan",
    service: "set_preset_mode",
    data: { entity_id: FAN, preset_mode: "Auto" },
  });
  await expect(page.locator(`${CARD} .mode.active`)).toHaveText("Auto");
  await expect(page.locator(`${CARD} .speed-value`)).toHaveText("Auto · 4");
});

test("oscillation toggle calls fan.oscillate with the inverse", async ({
  page,
}) => {
  const osc = page.locator(`${CARD} .osc-row .toggle`);
  await expect(osc).toHaveClass(/on/);

  await osc.click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      {
        domain: "fan",
        service: "oscillate",
        data: { entity_id: FAN, oscillating: false },
      },
    ]);
  await expect(osc).not.toHaveClass(/on/);
  await expect(page.locator(`${CARD} .device-status`)).toHaveText(
    "Auto · speed 4"
  );
});

test("air quality rating follows the PM2.5 sensor", async ({ page }) => {
  await page.evaluate(() =>
    window.__harness.setSensor("sensor.bedroom_purifier_pm_2_5", 25)
  );
  await expect(page.locator(`${CARD} .aq-word`)).toHaveText("Fair");
  await expect(page.locator(`${CARD} .summary`)).toHaveText("Auto · Fair");

  await page.evaluate(() =>
    window.__harness.setSensor("sensor.bedroom_purifier_pm_2_5", 40)
  );
  await expect(page.locator(`${CARD} .aq-word`)).toHaveText("Poor");
  await expect(page.locator(`${CARD} .aq-value`).nth(0)).toHaveText(
    "40 µg/m³"
  );
});

test("unavailable fan renders grayed out with disabled controls", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.__harness.setFan("fan.bedroom_dyson_purifier", {
      available: false,
    })
  );
  await expect(page.locator(`${CARD} .device-status`)).toHaveText(
    "Unavailable"
  );
  await expect(page.locator(`${CARD} .panel`).first()).toHaveClass(
    /unavailable/
  );
  await expect(page.locator(`${CARD} .device-row .toggle`)).toBeDisabled();
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
        .querySelector("ru-purifier-card")!
        .setAttribute("style", "--ru-purifier-bg: rgb(1, 2, 3)");
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
