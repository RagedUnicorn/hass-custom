/**
 * ru-washer-card tests, run against the mock-hass harness (dev/harness.html).
 * Service effects are asserted through the harness call log
 * (window.__harness.calls); nothing here touches a real Home Assistant — and
 * in particular nothing ever presses Start on a real washing machine.
 *
 * Harness fixture: a Miele-style washer with base id "washing_machine",
 * device id "mock-miele-washer", IN USE on Cottons, 37 of 149 minutes elapsed,
 * 1400 rpm / 40 °C, door closed, Mobile Start armed. The mock derives the
 * whole entity family from the base the way the integration does:
 * sensor.washing_machine(_program/_program_phase/_remaining_time/_elapsed_time/
 * _finish/_spin_speed/_target_temperature), switch.washing_machine_power,
 * binary_sensor.washing_machine_(door/mobile_start) and
 * button.washing_machine_(start/pause/stop).
 */

import { test, expect, type Page } from "@playwright/test";

const CARD = "#card-washer ru-washer-card";
const BASE = "washing_machine";
const POWER = "switch.washing_machine_power";
const START = "button.washing_machine_start";
const PAUSE = "button.washing_machine_pause";
const STOP = "button.washing_machine_stop";
const DEVICE = "mock-miele-washer";

async function openHarness(page: Page): Promise<void> {
  await page.goto("/dev/harness.html");
  await expect(page.locator(CARD)).toBeVisible();
}

function calls(page: Page) {
  return page.evaluate(() => window.__harness.calls);
}

/** Drive the mock washer without logging a service call. */
async function setWasher(
  page: Page,
  patch: Record<string, unknown>
): Promise<void> {
  await page.evaluate(
    ([base, p]) =>
      window.__harness.setWasher(
        base as string,
        p as Parameters<typeof window.__harness.setWasher>[1]
      ),
    [BASE, patch] as const
  );
}

function control(page: Page, name: string) {
  return page.locator(`${CARD} .control.${name}`);
}

function preset(page: Page, name: string) {
  return page.locator(`${CARD} .preset`, { hasText: name });
}

test.beforeEach(async ({ page }) => {
  await openHarness(page);
});

test("renders status, programme, phase, progress and readouts", async ({
  page,
}) => {
  await expect(page.locator(`${CARD} .title`)).toHaveText("Laundry");
  await expect(page.locator(`${CARD} .summary`)).toHaveText("In use · Cottons");
  await expect(page.locator(`${CARD} .device-name`)).toHaveText(
    "Washing machine"
  );
  await expect(page.locator(`${CARD} .device-status`)).toHaveText("In use");
  await expect(page.locator(`${CARD} .program-name`)).toHaveText("Cottons");
  await expect(page.locator(`${CARD} .program-phase`)).toHaveText("Main wash");

  // 37 of 149 minutes ≈ 25%.
  const width = await page
    .locator(`${CARD} .progress-fill`)
    .evaluate((el) => (el as HTMLElement).style.width);
  expect(Number.parseFloat(width)).toBeGreaterThan(20);
  expect(Number.parseFloat(width)).toBeLessThan(30);

  await expect(page.locator(`${CARD} .time`).first()).toHaveText("37m elapsed");
  await expect(page.locator(`${CARD} .time.remaining`)).toContainText("left");
  await expect(page.locator(`${CARD} .chip`).first()).toHaveText("1400 rpm");
  await expect(page.locator(`${CARD} .chip`).nth(1)).toHaveText("40 °C");
  await expect(page.locator(`${CARD} .preset`)).toHaveCount(4);
});

test("remaining time follows the finish timestamp", async ({ page }) => {
  // The finish sensor is an absolute timestamp, so the countdown is derived
  // rather than read straight off the minutes sensor.
  await setWasher(page, { totalMin: 100, elapsedMin: 10 });
  await expect(page.locator(`${CARD} .time.remaining`)).toHaveText(
    "1h 30m left"
  );

  await setWasher(page, { totalMin: 100, elapsedMin: 95 });
  await expect(page.locator(`${CARD} .time.remaining`)).toHaveText("5m left");
});

test("power toggle turns the machine off and on", async ({ page }) => {
  await page.locator(`${CARD} .toggle`).click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      { domain: "switch", service: "turn_off", data: { entity_id: POWER } },
    ]);
  await expect(page.locator(`${CARD} .device-status`)).toHaveText("Off");
  // Off means no cycle: the progress block is gone entirely.
  await expect(page.locator(`${CARD} .progress`)).toHaveCount(0);

  await page.locator(`${CARD} .toggle`).click();
  await expect(page.locator(`${CARD} .device-status`)).toHaveText(
    "Ready to start"
  );
});

test("start is disabled while running and enabled once paused", async ({
  page,
}) => {
  await expect(control(page, "start")).toBeDisabled();
  await expect(control(page, "pause")).toBeEnabled();
  await expect(control(page, "stop")).toBeEnabled();

  await control(page, "pause").click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      { domain: "button", service: "press", data: { entity_id: PAUSE } },
    ]);
  await expect(page.locator(`${CARD} .device-status`)).toHaveText("Paused");
  await expect(control(page, "start")).toBeEnabled();
  await expect(control(page, "pause")).toBeDisabled();

  await control(page, "start").click();
  await expect
    .poll(() => calls(page))
    .toContainEqual({
      domain: "button",
      service: "press",
      data: { entity_id: START },
    });
  await expect(page.locator(`${CARD} .device-status`)).toHaveText("In use");
});

test("stop ends the cycle and re-arms the machine", async ({ page }) => {
  await control(page, "stop").click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      { domain: "button", service: "press", data: { entity_id: STOP } },
    ]);
  await expect(page.locator(`${CARD} .device-status`)).toHaveText(
    "Ready to start"
  );
  await expect(control(page, "stop")).toBeDisabled();
});

test("a preset sets the programme through miele.set_program", async ({
  page,
}) => {
  // Cottons is the running programme, so its chip is the highlighted one.
  await expect(preset(page, "Cottons")).toHaveClass(/active/);
  await expect(preset(page, "Underwear")).not.toHaveClass(/active/);

  await preset(page, "Underwear").click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      {
        domain: "miele",
        service: "set_program",
        data: { device_id: DEVICE, program_id: 4 },
      },
    ]);

  // The mock arms the machine; once HA reports the new programme the
  // highlight follows the entity, not the click.
  await setWasher(page, { program: "delicates" });
  await expect(preset(page, "Underwear")).toHaveClass(/active/);
  await expect(preset(page, "Cottons")).not.toHaveClass(/active/);
});

test("preset chips carry the programme's spin and temperature as labels", async ({
  page,
}) => {
  // Spin and temperature are read-only in the Miele API — these are labels
  // describing the programme, not settings the card can push.
  await expect(preset(page, "Underwear").locator(".preset-meta")).toHaveText(
    "600 rpm · 30 °C"
  );
  await expect(preset(page, "Quick").locator(".preset-meta")).toHaveText(
    "1200 rpm · 40 °C"
  );
});

test("start is blocked and explained when Mobile Start is not armed", async ({
  page,
}) => {
  await setWasher(page, { status: "programmed", mobileStart: false });
  await expect(control(page, "start")).toBeDisabled();
  await expect(page.locator(`${CARD} .blocked`)).toContainText(
    "Mobile Start is not armed"
  );

  await setWasher(page, { mobileStart: true });
  await expect(page.locator(`${CARD} .blocked`)).toHaveCount(0);
  await expect(control(page, "start")).toBeEnabled();
});

test("an open door is called out while the machine waits to start", async ({
  page,
}) => {
  await setWasher(page, { status: "programmed", doorOpen: true });
  await expect(page.locator(`${CARD} .blocked`)).toContainText("door is open");

  await setWasher(page, { doorOpen: false });
  await expect(page.locator(`${CARD} .blocked`)).toHaveCount(0);
});

test("a finished programme reads as done with a full bar", async ({ page }) => {
  await setWasher(page, { status: "program_ended" });
  await expect(page.locator(`${CARD} .device-status`)).toHaveText(
    "Programme ended"
  );
  await expect(page.locator(`${CARD} .program-phase`)).toHaveText("Finished");
  await expect(page.locator(`${CARD} .time.remaining`)).toHaveText("Done");
  await expect(
    page.locator(`${CARD} .progress-fill`)
  ).toHaveClass(/done/);
});

test("unavailable machine renders grayed out with disabled controls", async ({
  page,
}) => {
  await setWasher(page, { available: false });
  await expect(page.locator(`${CARD} .device-status`)).toHaveText(
    "Unavailable"
  );
  await expect(page.locator(`${CARD} .panel`).first()).toHaveClass(
    /unavailable/
  );
  await expect(control(page, "start")).toBeDisabled();
  await expect(control(page, "pause")).toBeDisabled();
  await expect(control(page, "stop")).toBeDisabled();
  await expect(preset(page, "Underwear")).toBeDisabled();
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

    await page.evaluate(() => {
      document
        .querySelector("ru-washer-card")!
        .setAttribute("style", "--ru-washer-bg: rgb(1, 2, 3)");
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
