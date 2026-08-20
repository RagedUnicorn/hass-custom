/**
 * ru-tv-card tests, run against the mock-hass harness (dev/harness.html).
 * Service effects are asserted through the harness call log
 * (window.__harness.calls); nothing here touches a real Home Assistant.
 *
 * Harness fixture: media_player.tv_android ON with app com.netflix.ninja
 * (androidtv-like — volume steps, level 35%); media_player.tv_cast PLAYING
 * "Stranger Things · S4 E7" on Netflix at 754/3120 s, volume 35% (cast-like —
 * seek + volume level); remote.tv_livingroom mirroring tv_android's power,
 * both powered the androidtv_remote way (turn_on/turn_off send a POWER key
 * only when the reported state disagrees, and the key toggles). Apps:
 * Netflix (active), YouTube, Spotify, Plex, Twitch.
 *
 * Five card instances share those entities: #card-tv (volume_mode auto →
 * slider on the cast entity), #card-tv-steppers (volume_mode steppers →
 * key-press steps on the androidtv entity), #card-tv-bravia
 * (volume_entity + source_entity media_player.tv_bravia, a braviatv-like
 * player at 35% whose volume_set is absolute, on HDMI 1 of HDMI 1…4; adds
 * a PlayStation chip with source "HDMI 3"), #card-tv-wide (identical
 * config to #card-tv, but in a 900px mount so its container query trips and
 * it renders the side-by-side layout) and #card-tv-narrow (identical config
 * again, in a 320px mount that keeps the controls row below the volume-nudge
 * reveal width). Selectors stay scoped to one.
 */

import { test, expect, type Page } from "@playwright/test";

const CARD = "#card-tv ru-tv-card";
const STEPPERS = "#card-tv-steppers ru-tv-card";
const BRAVIA_CARD = "#card-tv-bravia ru-tv-card";
const WIDE = "#card-tv-wide ru-tv-card";
const NARROW = "#card-tv-narrow ru-tv-card";
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

/** Just the app-launch calls — the ones that carry a POWER key on a TV HA
 * still believes is off. */
async function remoteTurnOns(page: Page) {
  return (await calls(page)).filter(
    (call) => call.domain === "remote" && call.service === "turn_on"
  );
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

test("power toggle turns the TV off and on, quitting the active cast session", async ({
  page,
}) => {
  const power = page.locator(`${CARD} .device-row .toggle`);

  // The cast entity has a live session (Netflix playing) — powering off must
  // quit it too, or the session wakes a real TV right back up (wake on cast).
  await power.click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      {
        domain: "media_player",
        service: "turn_off",
        data: { entity_id: CAST },
      },
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
  // The quit ended the cast session, so the TV comes back without a track.
  await expect(page.locator(`${CARD} .device-status`)).toHaveText(
    "On · Netflix"
  );
});

test("power off sends no cast quit when no app session is active", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.__harness.setMediaPlayer("media_player.tv_cast", { state: "off" })
  );
  await page.locator(`${CARD} .device-row .toggle`).click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      {
        domain: "media_player",
        service: "turn_off",
        data: { entity_id: TV },
      },
    ]);
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
  // The off click also quit the cast session, so no track resumes.
  await expect(status).toHaveText("On · Netflix");
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

test("an unavailable volume_entity disables the row instead of retargeting", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.__harness.setMediaPlayer("media_player.tv_bravia", {
      available: false,
    })
  );
  // The row stays in place but goes inert — silently rerouting volume_set to
  // the cast entity would send commands a real Android TV ignores.
  const row = page.locator(`${BRAVIA_CARD} .vol-row`);
  await expect(row).toHaveClass(/unavailable/);
  await expect(page.locator(`${BRAVIA_CARD} .vol-value`)).toHaveText("—");
  await expect(page.locator(`${BRAVIA_CARD} .vol-mute`)).toBeDisabled();

  // The −/+ nudges disable too (asserted on the element, not visibility —
  // in the 390px mobile project the row is too narrow to reveal them).
  await expect(page.locator(`${BRAVIA_CARD} .vol-nudge`).nth(0)).toBeDisabled();
  await expect(page.locator(`${BRAVIA_CARD} .vol-nudge`).nth(1)).toBeDisabled();

  const track = page.locator(`${BRAVIA_CARD} .vol-track`);
  await expect(track).toHaveClass(/disabled/);
  const box = (await track.boundingBox())!;
  await track.click({
    position: { x: box.width * 0.6, y: box.height / 2 },
    force: true,
  });
  await page.waitForTimeout(150);
  expect(await calls(page)).toEqual([]);

  // The entity coming back re-enables the row with its live level.
  await page.evaluate(() =>
    window.__harness.setMediaPlayer("media_player.tv_bravia", {
      available: true,
    })
  );
  await expect(row).not.toHaveClass(/unavailable/);
  await expect(page.locator(`${BRAVIA_CARD} .vol-value`)).toHaveText("35%");
  await expect(page.locator(`${BRAVIA_CARD} .vol-nudge`).nth(1)).toBeEnabled();
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

test.describe("volume nudges (−/+ beside the slider)", () => {
  // Pinned so both Playwright projects run these identically — the reveal is
  // driven by the controls row's own width (nested container query), so the
  // viewport only has to be wide enough for each mount to get its max-width.
  test.use({ viewport: { width: 1100, height: 1000 } });

  function volumeSets(page: Page) {
    return calls(page).then((log) =>
      log.filter((call) => call.service === "volume_set")
    );
  }

  test("appear when the row has room, stay hidden when it doesn't", async ({
    page,
  }) => {
    await openHarness(page);
    // Identical configs on the same page at the same viewport — visibility
    // can only come from each mount's own width.
    const wide = page.locator(`${WIDE} .vol-nudge`);
    await expect(wide).toHaveCount(2);
    await expect(wide.nth(0)).toBeVisible();
    await expect(wide.nth(1)).toBeVisible();

    const narrow = page.locator(`${NARROW} .vol-nudge`);
    await expect(narrow).toHaveCount(2);
    await expect(narrow.nth(0)).toBeHidden();
    await expect(narrow.nth(1)).toBeHidden();
  });

  test("presses volume_set the level ± volume_step and compound", async ({
    page,
  }) => {
    await openHarness(page);
    const nudges = page.locator(`${WIDE} .vol-nudge`);

    // Cast fixture is at 35%, default step 5 → up lands on exactly 40%.
    await nudges.nth(1).click();
    await expect
      .poll(() => volumeSets(page))
      .toEqual([
        {
          domain: "media_player",
          service: "volume_set",
          data: { entity_id: CAST, volume_level: 0.4 },
        },
      ]);
    await expect(page.locator(`${WIDE} .vol-value`)).toHaveText("40%");

    // Down bases on the pending 40 → back to 35.
    await nudges.nth(0).click();
    await expect
      .poll(() => volumeSets(page))
      .toContainEqual({
        domain: "media_player",
        service: "volume_set",
        data: { entity_id: CAST, volume_level: 0.35 },
      });
    await expect(page.locator(`${WIDE} .vol-value`)).toHaveText("35%");
  });

  test("holding a nudge repeats and each step compounds on the last", async ({
    page,
  }) => {
    await openHarness(page);
    const up = page.locator(`${WIDE} .vol-nudge`).nth(1);
    await up.hover();
    const box = (await up.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    // Immediate step, then repeats after the 400 ms delay every 250 ms.
    await page.waitForTimeout(1200);
    await page.mouse.up();

    const sets = await volumeSets(page);
    expect(sets.length).toBeGreaterThanOrEqual(3);
    // Each tick moves +5% from the previous optimistic value, not from the
    // (potentially stale) reported level: 0.40, 0.45, 0.50, …
    sets.forEach((call, i) => {
      expect(call.data?.volume_level).toBeCloseTo(0.35 + 0.05 * (i + 1), 5);
    });
    // The trailing click of the press must not add an extra step.
    await page.waitForTimeout(300);
    expect((await volumeSets(page)).length).toBe(sets.length);
  });
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

test("an app chip tapped while the TV wakes waits instead of powering it off", async ({
  page,
}) => {
  // The bug this guards: remote.turn_on carries a POWER key whenever HA still
  // believes the TV is off, and that belief lags the real TV by seconds — so a
  // chip tapped right after power-on used to land a second POWER and kill it.
  await page.evaluate(() => window.__harness.setReactionMs(1500));
  const power = page.locator(`${CARD} .device-row .toggle`);
  const status = page.locator(`${CARD} .device-status`);
  const chip = page.locator(`${CARD} .app`, { hasText: "YouTube" });

  await power.click();
  await expect(status).toHaveText("Off");
  await power.click();
  await expect(status).toHaveText("Turning on…");

  await chip.click();
  // Nothing goes out yet — this is the press that used to kill the TV.
  expect(await remoteTurnOns(page)).toEqual([]);
  // Queued meanwhile: the chip pulses and the status names what's coming.
  await expect(chip).toHaveClass(/pending/);
  await expect(status).toHaveText("Turning on… · YouTube");

  // The TV finishes waking and *stays* on — a second POWER would drop it.
  await expect(status).toHaveText("On · Netflix");
  // The launch waits out the settle (the TV acks power seconds before
  // Android can handle an app link), then goes out exactly once.
  expect(await remoteTurnOns(page)).toEqual([]);
  await expect(chip).toHaveClass(/pending/);
  await expect
    .poll(() => remoteTurnOns(page), { timeout: 8000 })
    .toEqual([
      {
        domain: "remote",
        service: "turn_on",
        data: { entity_id: REMOTE, activity: "com.google.android.youtube.tv" },
      },
    ]);
  await expect(chip).not.toHaveClass(/pending/);
});

test("an app chip on an off TV wakes atomically, then re-launches once settled", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.__harness.setReactionMs(600);
    window.__harness.setMediaPlayer("media_player.tv_android", {
      state: "off",
    });
  });
  const status = page.locator(`${CARD} .device-status`);
  const chip = page.locator(`${CARD} .app`, { hasText: "Plex" });
  await expect(status).toHaveText("Off");

  await chip.click();
  const launchCall = {
    domain: "remote",
    service: "turn_on",
    data: { entity_id: REMOTE, activity: "com.plexapp.android" },
  };
  // First call is immediate and atomic — androidtv_remote pairs its POWER
  // key with the launch, so a TV that honors the pairing opens the app
  // straight from standby, no media_player.turn_on involved.
  await expect.poll(() => calls(page)).toEqual([launchCall]);
  // Meanwhile the chip pulses and the status names what's coming.
  await expect(chip).toHaveClass(/pending/);
  await expect(status).toHaveText("Turning on… · Plex");

  // The POWER prefix lands and the TV comes on…
  await expect(status).toHaveText("Playing · Netflix");
  // …and once it has settled the launch goes out once more, for the TVs
  // that drop an app link arriving mid-wake. On, so no POWER this time.
  await expect
    .poll(() => calls(page), { timeout: 8000 })
    .toEqual([launchCall, launchCall]);
  await expect(chip).not.toHaveClass(/pending/);
  await expect(status).toHaveText("Playing · Netflix");
});

test("powering off abandons a queued launch", async ({ page }) => {
  await page.evaluate(() => {
    window.__harness.setReactionMs(1500);
    window.__harness.setMediaPlayer("media_player.tv_android", {
      state: "off",
    });
  });
  const power = page.locator(`${CARD} .device-row .toggle`);
  const chip = page.locator(`${CARD} .app`, { hasText: "Twitch" });

  // Wake the TV, queue a launch behind it, then change your mind.
  await power.click();
  await chip.click();
  await expect(chip).toHaveClass(/pending/);
  await power.click();
  await expect(chip).not.toHaveClass(/pending/);

  // Well past the reaction lag the launch must still never have gone out.
  await page.waitForTimeout(2500);
  expect(await remoteTurnOns(page)).toEqual([]);
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

test.describe("wide layout", () => {
  // Pinned so both Playwright projects run these identically — the layout is
  // driven by the card's own width, so the viewport only has to be wide enough
  // for the 900px mount to get its 900px.
  test.use({ viewport: { width: 1100, height: 1000 } });

  /** Geometry of a card's two panels, in page coordinates. */
  async function panels(page: Page, card: string) {
    const media = await page.locator(`${card} .panel.media`).boundingBox();
    const remote = await page.locator(`${card} .panel.remote`).boundingBox();
    if (!media || !remote) throw new Error(`${card}: panels not rendered`);
    return { media, remote };
  }

  test("remote sits beside the media panel when the card is wide, below it when narrow", async ({
    page,
  }) => {
    await openHarness(page);

    // Both instances have identical configs and are on the same page at the
    // same viewport — so any layout difference can only come from their own
    // width. This is what a viewport media query could not do.
    const wide = await panels(page, WIDE);
    expect(wide.remote.x).toBeGreaterThanOrEqual(wide.media.x + wide.media.width);
    expect(Math.abs(wide.remote.y - wide.media.y)).toBeLessThan(2);

    const narrow = await panels(page, CARD);
    expect(narrow.remote.y).toBeGreaterThanOrEqual(
      narrow.media.y + narrow.media.height
    );
    expect(Math.abs(narrow.remote.x - narrow.media.x)).toBeLessThan(2);
  });

  test("re-stacks when the card is squeezed below the breakpoint", async ({
    page,
  }) => {
    await openHarness(page);
    // Cheap "did the container rule match at all" signal; the geometry below
    // is the assertion that actually matters.
    expect(
      await page
        .locator(`${WIDE} .card`)
        .evaluate((el) => getComputedStyle(el).display)
    ).toBe("grid");

    // The mount is width:100%/max-width:900px, so a narrow window shrinks the
    // card itself past the 640px breakpoint.
    await page.setViewportSize({ width: 500, height: 1000 });
    await expect
      .poll(async () => {
        const { media, remote } = await panels(page, WIDE);
        return remote.y >= media.y + media.height;
      })
      .toBe(true);

    await page.setViewportSize({ width: 1100, height: 1000 });
    await expect
      .poll(async () => {
        const { media, remote } = await panels(page, WIDE);
        return remote.x >= media.x + media.width;
      })
      .toBe(true);
  });

  test("--ru-tv-max-width caps the card and the layout follows the cap", async ({
    page,
  }) => {
    await openHarness(page);
    const card = page.locator(WIDE);
    expect((await card.boundingBox())!.width).toBeGreaterThan(880);

    // Capping below the breakpoint must re-stack: the cap is on :host, which
    // is the query container, so it changes what the query measures too. A cap
    // applied to .card instead would leave the card in the wide layout at a
    // width that can no longer hold it.
    await card.evaluate((el) =>
      el.setAttribute("style", "--ru-tv-max-width: 500px")
    );
    await expect.poll(async () => (await card.boundingBox())!.width).toBe(500);
    const capped = await panels(page, WIDE);
    expect(capped.remote.y).toBeGreaterThanOrEqual(
      capped.media.y + capped.media.height
    );

    // Above the breakpoint it stays wide, just narrower than its slot — and
    // centered, since margin-inline: auto takes effect once the cap bites.
    await card.evaluate((el) =>
      el.setAttribute("style", "--ru-tv-max-width: 700px")
    );
    await expect.poll(async () => (await card.boundingBox())!.width).toBe(700);
    const wide = await panels(page, WIDE);
    expect(wide.remote.x).toBeGreaterThanOrEqual(wide.media.x + wide.media.width);

    const slot = (await page.locator("#card-tv-wide").boundingBox())!;
    const box = (await card.boundingBox())!;
    const leftGap = box.x - slot.x;
    const rightGap = slot.x + slot.width - (box.x + box.width);
    expect(Math.abs(leftGap - rightGap)).toBeLessThan(2);
  });

  test("d-pad hit targets survive the grid re-arrangement", async ({ page }) => {
    await openHarness(page);

    await page.locator(`${WIDE} .ok`).click();
    await expect
      .poll(() => calls(page))
      .toContainEqual({
        domain: "remote",
        service: "send_command",
        data: { entity_id: REMOTE, command: "DPAD_CENTER" },
      });

    // Same pie-slice caveat as the compact test: the up quadrant's box covers
    // the whole ring, so click near its top edge by raw coordinates. This is
    // the assertion that matters here — the ring moved into a grid column and
    // its clip-path geometry has to still line up with where it renders.
    await page.locator(`${WIDE} .ring`).scrollIntoViewIfNeeded();
    const ring = (await page.locator(`${WIDE} .ring`).boundingBox())!;
    await page.mouse.click(ring.x + ring.width / 2, ring.y + 12);
    await expect
      .poll(() => calls(page))
      .toContainEqual({
        domain: "remote",
        service: "send_command",
        data: { entity_id: REMOTE, command: "DPAD_UP" },
      });
  });

  test("app launcher is a tile grid at wide, chips compact — on the same page", async ({
    page,
  }) => {
    await openHarness(page);
    const style = (selector: string, prop: string) =>
      page
        .locator(selector)
        .first()
        .evaluate(
          (el, p) => getComputedStyle(el).getPropertyValue(p),
          prop
        );

    expect(await style(`${WIDE} .apps`, "display")).toBe("grid");
    expect(await style(`${WIDE} .app`, "flex-direction")).toBe("column");
    expect(await style(`${WIDE} .app-icon`, "width")).toBe("34px");
    expect(await style(`${WIDE} .app-glyph`, "width")).toBe("34px");

    // The compact mount proves the trigger is the card's own width.
    expect(await style(`${CARD} .apps`, "display")).toBe("flex");
    expect(await style(`${CARD} .app-icon`, "width")).toBe("16px");
  });

  test("icon-less app shows a letter puck at wide, an unlettered dot compact", async ({
    page,
  }) => {
    await openHarness(page);

    // Twitch is the only fixture app without an icon.
    const puck = page.locator(`${WIDE} .app-dot-sm`);
    await expect(puck).toHaveText("T");
    const puckStyle = await puck.evaluate((el) => {
      const s = getComputedStyle(el);
      return { width: s.width, fontSize: s.fontSize, bg: s.backgroundColor };
    });
    expect(puckStyle).toEqual({
      width: "34px",
      fontSize: "15px",
      bg: "rgb(145, 70, 255)",
    });

    // Compact must be visually unchanged: 8px dot, letter collapsed.
    const dotStyle = await page
      .locator(`${CARD} .app-dot-sm`)
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return { width: s.width, fontSize: s.fontSize };
      });
    expect(dotStyle).toEqual({ width: "8px", fontSize: "0px" });
  });

  test("tile hit targets survive the grid re-arrangement", async ({ page }) => {
    await openHarness(page);
    await page.locator(`${WIDE} .app`, { hasText: "Twitch" }).click();
    await expect
      .poll(() => remoteTurnOns(page))
      .toContainEqual({
        domain: "remote",
        service: "turn_on",
        data: { entity_id: REMOTE, activity: "tv.twitch.android.app" },
      });
  });

  test("keyboard shows below the panels at wide, stays hidden compact, and types key codes", async ({
    page,
  }) => {
    await openHarness(page);
    const kb = page.locator(`${WIDE} .panel.keyboard`);
    await expect(kb).toBeVisible();
    // Same keyboard: true config on the compact mount — width alone hides it.
    await expect(page.locator(`${CARD} .panel.keyboard`)).toBeHidden();

    // Full-width third grid row: below both panels, spanning the card.
    const kbBox = (await kb.boundingBox())!;
    const media = (await page.locator(`${WIDE} .panel.media`).boundingBox())!;
    const remote = (await page.locator(`${WIDE} .panel.remote`).boundingBox())!;
    expect(kbBox.y).toBeGreaterThanOrEqual(media.y + media.height);
    expect(kbBox.y).toBeGreaterThanOrEqual(remote.y + remote.height);
    expect(kbBox.width).toBeGreaterThan(media.width + remote.width);

    // Printable keys type through the IME text channel — TVs swallow letter
    // KEYCODE_* events while the integration's IME is active.
    await kb.locator('.kb-key[aria-label="a"]').click();
    await expect
      .poll(() => calls(page))
      .toContainEqual({
        domain: "remote",
        service: "send_command",
        data: { entity_id: REMOTE, command: "text:a" },
      });

    await kb.locator('.kb-key[aria-label="Space"]').click();
    await expect
      .poll(() => calls(page))
      .toContainEqual({
        domain: "remote",
        service: "send_command",
        data: { entity_id: REMOTE, command: "text: " },
      });

    await kb.locator('.kb-key[aria-label="Enter"]').click();
    await expect
      .poll(() => calls(page))
      .toContainEqual({
        domain: "remote",
        service: "send_command",
        data: { entity_id: REMOTE, command: "KEYCODE_ENTER" },
      });
  });

  test("holding backspace repeats the delete", async ({ page }) => {
    await openHarness(page);
    const backspace = page.locator(`${WIDE} .kb-key[aria-label="Backspace"]`);
    await backspace.hover();
    const box = (await backspace.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    // Immediate delete, then repeats after the 650 ms delay every 300 ms —
    // slower than the volume steppers so a deliberate click stays one delete.
    await page.waitForTimeout(1600);
    await page.mouse.up();

    const deletes = (await calls(page)).filter(
      (call) => call.data?.command === "KEYCODE_DEL"
    );
    expect(deletes.length).toBeGreaterThanOrEqual(3);
    // The trailing click of the press must not add an extra delete.
    await page.waitForTimeout(300);
    expect(
      (await calls(page)).filter((call) => call.data?.command === "KEYCODE_DEL")
        .length
    ).toBe(deletes.length);
  });
});
