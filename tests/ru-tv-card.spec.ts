/**
 * ru-tv-card tests, run against the mock-hass harness (dev/harness.html).
 * Service effects are asserted through the harness call log
 * (window.__harness.calls); nothing here touches a real Home Assistant.
 *
 * Harness fixture: media_player.tv_android ON with app com.netflix.ninja
 * (androidtv-like — volume steps, level 35%); media_player.tv_cast PLAYING
 * "Stranger Things · S4 E7" on Netflix at 754/3120 s, volume 35% (cast-like —
 * seek + volume level); remote.tv_livingroom ON. Apps: Netflix (active),
 * YouTube, Spotify, Plex, Twitch.
 *
 * Three card instances share those entities: #card-tv (volume_mode auto →
 * slider on the cast entity), #card-tv-steppers (volume_mode steppers →
 * key-press steps on the androidtv entity) and #card-tv-bravia
 * (volume_entity + source_entity media_player.tv_bravia, a braviatv-like
 * player at 35% whose volume_set is absolute, on HDMI 1 of HDMI 1…4; adds
 * a PlayStation chip with source "HDMI 3"). Selectors stay scoped to one.
 */

import { test, expect, type Page } from "@playwright/test";

const CARD = "#card-tv ru-tv-card";
const STEPPERS = "#card-tv-steppers ru-tv-card";
const BRAVIA_CARD = "#card-tv-bravia ru-tv-card";
const TV = "media_player.tv_android";
const CAST = "media_player.tv_cast";
const BRAVIA = "media_player.tv_bravia";
const REMOTE = "remote.tv_livingroom";

/** Parse a rendered m:ss / h:mm:ss time label into seconds. */
function toSeconds(text: string): number {
  return text
    .split(":")
    .reduce((total, part) => total * 60 + Number(part), 0);
}

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
  await expect(page.locator(`${CARD} .t-skip`)).toHaveCount(2);
  await expect(page.locator(`${CARD} .app`)).toHaveCount(5);
  await expect(page.locator(`${CARD} .app.active .app-name`)).toHaveText(
    "Netflix"
  );
  // Netflix/YouTube/Plex carry icon images, Spotify an mdi: ref rendered
  // via ha-icon tinted with its color, Twitch none → color-dot fallback.
  await expect(page.locator(`${CARD} .app-icon`)).toHaveCount(3);
  await expect(page.locator(`${CARD} .app-glyph`)).toHaveCount(1);
  await expect(page.locator(`${CARD} .app-dot-sm`)).toHaveCount(1);
  const glyph = page.locator(`${CARD} .app-glyph`);
  expect(
    await glyph.evaluate((el) => (el as HTMLElement & { icon?: string }).icon)
  ).toBe("mdi:spotify");
  expect(
    await glyph.evaluate((el) => getComputedStyle(el).color)
  ).toBe("rgb(29, 185, 84)");
  // Ring d-pad: four rim quadrants around a center OK, Back/Home below.
  await expect(page.locator(`${CARD} .quad`)).toHaveCount(4);
  await expect(page.locator(`${CARD} .ok`)).toBeVisible();
  await expect(page.locator(`${CARD} .key`)).toHaveCount(2);
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

test("power toggle shows a pending state while a slow TV reacts", async ({
  page,
}) => {
  await page.evaluate(() => window.__harness.setReactionMs(1500));
  const toggle = page.locator(`${CARD} .device-row .toggle`);
  const status = page.locator(`${CARD} .device-status`);

  await toggle.click();
  // Optimistic: knob at the target, pulsing, status says what's happening.
  await expect(status).toHaveText("Turning off…");
  await expect(page.locator(`${CARD} .summary`)).toHaveText("Turning off…");
  await expect(toggle).toHaveClass(/pending/);
  await expect(toggle).not.toHaveClass(/\bon\b/);

  // The TV reacts → pending clears, real state takes over.
  await expect(status).toHaveText("Off");
  await expect(toggle).not.toHaveClass(/pending/);

  await toggle.click();
  await expect(status).toHaveText("Turning on…");
  await expect(toggle).toHaveClass(/\bon\b/);
  await expect(status).toHaveText("Playing · Netflix");
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

test("skip buttons seek relative to the current position and stack", async ({
  page,
}) => {
  // Back 10 s from the live position (754 s + a moment of playback).
  await page.locator(`${CARD} .t-skip`).first().click();
  let log = await calls(page);
  expect(log[0].service).toBe("media_seek");
  expect(log[0].data?.entity_id).toBe(CAST);
  const back = log[0].data?.seek_position as number;
  expect(back).toBeGreaterThan(738);
  expect(back).toBeLessThan(752);

  // Forward 30 s bases on the just-seeked position, not the stale one.
  await page.locator(`${CARD} .t-skip`).nth(1).click();
  log = await calls(page);
  const forward = log[1].data?.seek_position as number;
  expect(forward).toBeGreaterThan(back + 28);
  expect(forward).toBeLessThan(back + 40);
});

test("seeked position holds while a slow TV catches up (no snap-back)", async ({
  page,
}) => {
  await page.evaluate(() => window.__harness.setReactionMs(1500));

  const progress = page.locator(`${CARD} .progress`);
  const box = (await progress.boundingBox())!;
  await progress.click({ position: { x: box.width / 2, y: box.height / 2 } });

  const log = await calls(page);
  const target = log[0].data?.seek_position as number;

  // Mid-lag the bar must show the seek target, not the stale position.
  const posTime = page.locator(`${CARD} .time`).first();
  expect(toSeconds(await posTime.textContent() ?? "")).toBeGreaterThan(
    target - 5
  );
  await page.waitForTimeout(700);
  expect(toSeconds(await posTime.textContent() ?? "")).toBeGreaterThan(
    target - 5
  );

  // After the TV reacts the reported position agrees, so nothing jumps.
  await page.waitForTimeout(1200);
  const settled = toSeconds((await posTime.textContent()) ?? "");
  expect(settled).toBeGreaterThan(target - 5);
  expect(settled).toBeLessThan(target + 10);
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

  await page.locator(`${CARD} .vol-mute`).click();
  await expect
    .poll(() => calls(page))
    .toContainEqual({
      domain: "media_player",
      service: "volume_mute",
      data: { entity_id: CAST, is_volume_muted: true },
    });
  await expect(page.locator(`${CARD} .vol-value`)).toHaveText("—");
  await expect(page.locator(`${CARD} .vol-mute`)).toHaveClass(/muted/);
});

test("volume_entity routes the slider to the braviatv player", async ({
  page,
}) => {
  const track = page.locator(`${BRAVIA_CARD} .vol-track`);
  await expect(page.locator(`${BRAVIA_CARD} .vol-value`)).toHaveText("35%");

  const box = (await track.boundingBox())!;
  await track.click({ position: { x: box.width * 0.6, y: box.height / 2 } });

  const log = await calls(page);
  expect(log[0].domain).toBe("media_player");
  expect(log[0].service).toBe("volume_set");
  expect(log[0].data?.entity_id).toBe(BRAVIA);
  const level = log[0].data?.volume_level as number;
  expect(level).toBeGreaterThan(0.55);
  expect(level).toBeLessThan(0.65);
  await expect(page.locator(`${BRAVIA_CARD} .vol-value`)).toHaveText(
    `${Math.round(level * 100)}%`
  );

  await page.locator(`${BRAVIA_CARD} .vol-mute`).click();
  await expect
    .poll(() => calls(page))
    .toContainEqual({
      domain: "media_player",
      service: "volume_mute",
      data: { entity_id: BRAVIA, is_volume_muted: true },
    });
});

test("an unavailable volume_entity falls back to the cast slider", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.__harness.setMediaPlayer("media_player.tv_bravia", {
      available: false,
    })
  );
  const track = page.locator(`${BRAVIA_CARD} .vol-track`);
  const box = (await track.boundingBox())!;
  await track.click({ position: { x: box.width * 0.6, y: box.height / 2 } });

  const log = await calls(page);
  expect(log[0].service).toBe("volume_set");
  expect(log[0].data?.entity_id).toBe(CAST);
});

test("volume_mode steppers steps the androidtv entity and shows the level", async ({
  page,
}) => {
  const steps = page.locator(`${STEPPERS} .vol-step`);
  await expect(steps).toHaveCount(2);
  await expect(page.locator(`${STEPPERS} .vol-value`)).toHaveText("35%");

  await steps.nth(1).click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      { domain: "media_player", service: "volume_up", data: { entity_id: TV } },
    ]);
  await expect(page.locator(`${STEPPERS} .vol-value`)).toHaveText("40%");

  await steps.nth(0).click();
  await expect
    .poll(() => calls(page))
    .toContainEqual({
      domain: "media_player",
      service: "volume_down",
      data: { entity_id: TV },
    });
  await expect(page.locator(`${STEPPERS} .vol-value`)).toHaveText("35%");
});

test("holding a volume stepper repeats the step", async ({ page }) => {
  const up = page.locator(`${STEPPERS} .vol-step`).nth(1);
  // hover() scrolls the below-the-fold steppers card into view — raw mouse
  // coordinates from boundingBox() would land outside the viewport.
  await up.hover();
  const box = (await up.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // Immediate step, then repeats after the 400 ms delay every 250 ms.
  await page.waitForTimeout(1200);
  await page.mouse.up();

  const log = await calls(page);
  const ups = log.filter((call) => call.service === "volume_up");
  expect(ups.length).toBeGreaterThanOrEqual(3);
  // The trailing click of the press must not add an extra step.
  await page.waitForTimeout(300);
  expect(
    (await calls(page)).filter((call) => call.service === "volume_up").length
  ).toBe(ups.length);
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
        data: {
          entity_id: REMOTE,
          activity: "com.google.android.youtube.tv",
        },
      },
    ]);
});

test("a source chip switches the TV input via select_source and highlights", async ({
  page,
}) => {
  const chip = page.locator(`${BRAVIA_CARD} .app`, {
    hasText: "PlayStation",
  });
  // A source-only chip (no activity) must still be clickable.
  await chip.scrollIntoViewIfNeeded();
  await expect(chip).toBeEnabled();
  await expect(chip).not.toHaveClass(/active/);

  await chip.click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      {
        domain: "media_player",
        service: "select_source",
        data: { entity_id: BRAVIA, source: "HDMI 3" },
      },
    ]);
  // The mock flips the bravia entity's source attribute → chip highlights.
  await expect(chip).toHaveClass(/active/);
});

test("ring d-pad and keys send remote commands and echo the press", async ({
  page,
}) => {
  await page.locator(`${CARD} .ok`).click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      {
        domain: "remote",
        service: "send_command",
        data: { entity_id: REMOTE, command: "DPAD_CENTER" },
      },
    ]);
  // Every press echoes in the panel header, then fades after ~900 ms.
  await expect(page.locator(`${CARD} .pad-feedback`)).toHaveText("● OK");
  await expect(page.locator(`${CARD} .pad-feedback`)).toHaveText("", {
    timeout: 2000,
  });

  // The up quadrant is a clipped pie slice — click near the ring's top edge,
  // inside the slice, since the element's box covers the whole ring. Raw
  // mouse coordinates need the ring scrolled into view first.
  await page.locator(`${CARD} .ring`).scrollIntoViewIfNeeded();
  const ring = (await page.locator(`${CARD} .ring`).boundingBox())!;
  await page.mouse.click(ring.x + ring.width / 2, ring.y + 12);
  await expect
    .poll(() => calls(page))
    .toContainEqual({
      domain: "remote",
      service: "send_command",
      data: { entity_id: REMOTE, command: "DPAD_UP" },
    });
  await expect(page.locator(`${CARD} .pad-feedback`)).toHaveText("▲ Up");

  await page.locator(`${CARD} .key[aria-label="Back"]`).click();
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
