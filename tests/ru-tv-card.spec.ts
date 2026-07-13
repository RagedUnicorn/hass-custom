/**
 * ru-tv-card tests, run against the mock-hass harness (dev/harness.html).
 * Service effects are asserted through the harness call log
 * (window.__harness.calls); nothing here touches a real Home Assistant.
 *
 * Harness fixture: media_player.tv_android ON with app com.netflix.ninja
 * (androidtv-like — volume steps, no level); media_player.tv_cast PLAYING
 * "Stranger Things · S4 E7" on Netflix at 754/3120 s, volume 35% (cast-like —
 * seek + volume level); remote.tv_livingroom ON. Apps: Netflix (active),
 * YouTube, Spotify.
 */

import { test, expect, type Page } from "@playwright/test";

const CARD = "ru-tv-card";
const TV = "media_player.tv_android";
const CAST = "media_player.tv_cast";
const REMOTE = "remote.tv_livingroom";

async function openHarness(page: Page): Promise<void> {
  await page.goto("/dev/harness.html");
  await expect(page.locator(CARD)).toBeVisible();
}

function calls(page: Page) {
  return page.evaluate(() => window.__harness.calls);
}

test.beforeEach(async ({ page }) => {
  await openHarness(page);
});

test("renders title, summary, device state, now playing, apps and remote", async ({
  page,
}) => {
  await expect(page.locator(`${CARD} .title`)).toHaveText("Media");
  await expect(page.locator(`${CARD} .summary`)).toHaveText(
    "Playing · Netflix"
  );
  await expect(page.locator(`${CARD} .device-name`)).toHaveText(
    "Living Room TV"
  );
  await expect(page.locator(`${CARD} .device-status`)).toHaveText(
    "Playing · Netflix"
  );
  await expect(page.locator(`${CARD} .track-title`)).toHaveText(
    "Stranger Things · S4 E7"
  );
  await expect(page.locator(`${CARD} .track-app`)).toHaveText("Netflix");
  await expect(page.locator(`${CARD} .time`).nth(1)).toHaveText("52:00");
  await expect(page.locator(`${CARD} .t-play`)).toHaveText("❘❘");
  await expect(page.locator(`${CARD} .vol-value`)).toHaveText("35%");
  await expect(page.locator(`${CARD} .app`)).toHaveCount(3);
  await expect(page.locator(`${CARD} .app.active .app-name`)).toHaveText(
    "Netflix"
  );
  await expect(page.locator(`${CARD} .pad`)).toHaveCount(5);
  await expect(page.locator(`${CARD} .key`)).toHaveCount(3);
});

test("power toggle turns the TV off and on", async ({ page }) => {
  const power = page.locator(`${CARD} .device-row .toggle`);

  await power.click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      {
        domain: "media_player",
        service: "turn_off",
        data: { entity_id: TV },
      },
    ]);
  await expect(page.locator(`${CARD} .device-status`)).toHaveText("Off");
  await expect(page.locator(`${CARD} .summary`)).toHaveText("Off");
  await expect(page.locator(`${CARD} .controls`)).toHaveClass(/dimmed/);

  await power.click();
  await expect
    .poll(() => calls(page))
    .toContainEqual({
      domain: "media_player",
      service: "turn_on",
      data: { entity_id: TV },
    });
  await expect(page.locator(`${CARD} .device-status`)).toHaveText(
    "Playing · Netflix"
  );
});

test("transport buttons drive the cast media player", async ({ page }) => {
  await page.locator(`${CARD} .t-play`).click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      {
        domain: "media_player",
        service: "media_play_pause",
        data: { entity_id: CAST },
      },
    ]);
  await expect(page.locator(`${CARD} .t-play`)).toHaveText("▶");
  await expect(page.locator(`${CARD} .device-status`)).toHaveText(
    "Paused · Netflix"
  );
  await expect(page.locator(`${CARD} .summary`)).toHaveText("Paused");

  await page.locator(`${CARD} .t-btn`).nth(1).click();
  await expect
    .poll(() => calls(page))
    .toContainEqual({
      domain: "media_player",
      service: "media_next_track",
      data: { entity_id: CAST },
    });

  await page.locator(`${CARD} .t-btn`).nth(0).click();
  await expect
    .poll(() => calls(page))
    .toContainEqual({
      domain: "media_player",
      service: "media_previous_track",
      data: { entity_id: CAST },
    });
});

test("tapping the progress bar seeks proportionally", async ({ page }) => {
  const progress = page.locator(`${CARD} .progress`);
  const box = (await progress.boundingBox())!;
  await progress.click({ position: { x: box.width / 2, y: box.height / 2 } });

  const log = await calls(page);
  expect(log).toHaveLength(1);
  expect(log[0].domain).toBe("media_player");
  expect(log[0].service).toBe("media_seek");
  expect(log[0].data?.entity_id).toBe(CAST);
  // Mid-bar tap ≈ half of the 3120 s track; allow pointer/rounding slack.
  const position = log[0].data?.seek_position as number;
  expect(position).toBeGreaterThan(1450);
  expect(position).toBeLessThan(1670);
});

test("volume slider sets the level, label toggles mute", async ({ page }) => {
  const track = page.locator(`${CARD} .vol-track`);
  const box = (await track.boundingBox())!;
  await track.click({ position: { x: box.width * 0.6, y: box.height / 2 } });

  const log = await calls(page);
  expect(log[0].domain).toBe("media_player");
  expect(log[0].service).toBe("volume_set");
  expect(log[0].data?.entity_id).toBe(CAST);
  const level = log[0].data?.volume_level as number;
  expect(level).toBeGreaterThan(0.55);
  expect(level).toBeLessThan(0.65);
  await expect(page.locator(`${CARD} .vol-value`)).toHaveText(
    `${Math.round(level * 100)}%`
  );

  await page.locator(`${CARD} .vol-label`).click();
  await expect
    .poll(() => calls(page))
    .toContainEqual({
      domain: "media_player",
      service: "volume_mute",
      data: { entity_id: CAST, is_volume_muted: true },
    });
  await expect(page.locator(`${CARD} .vol-value`)).toHaveText("—");
  await expect(page.locator(`${CARD} .vol-label`)).toHaveText("Muted");
});

test("app chips launch via remote.turn_on with the app's activity", async ({
  page,
}) => {
  await page.locator(`${CARD} .app`, { hasText: "YouTube" }).click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      {
        domain: "remote",
        service: "turn_on",
        data: { entity_id: REMOTE, activity: "https://www.youtube.com" },
      },
    ]);
});

test("d-pad and keys send remote commands", async ({ page }) => {
  await page.locator(`${CARD} .pad.ok`).click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      {
        domain: "remote",
        service: "send_command",
        data: { entity_id: REMOTE, command: "DPAD_CENTER" },
      },
    ]);

  await page.locator(`${CARD} .pad`).first().click();
  await expect
    .poll(() => calls(page))
    .toContainEqual({
      domain: "remote",
      service: "send_command",
      data: { entity_id: REMOTE, command: "DPAD_UP" },
    });

  await page.locator(`${CARD} .key`, { hasText: "Back" }).click();
  await expect
    .poll(() => calls(page))
    .toContainEqual({
      domain: "remote",
      service: "send_command",
      data: { entity_id: REMOTE, command: "BACK" },
    });
});

test("unavailable TV renders grayed out with disabled controls", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.__harness.setMediaPlayer("media_player.tv_android", {
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
        .querySelector("ru-tv-card")!
        .setAttribute("style", "--ru-tv-bg: rgb(1, 2, 3)");
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
