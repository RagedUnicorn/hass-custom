/**
 * ru-music-card tests, run against the mock-hass harness (dev/harness.html)
 * with its Music Assistant simulation (dev/mock-music.ts). Service effects
 * are asserted through the harness call log (window.__harness.calls); the
 * library/search/queue reads land in window.__harness.musicReads;
 * nothing here touches a real Home Assistant.
 *
 * Harness fixture: media_player.sonos_livingroom_ma PLAYING a four-track
 * queue (Kingslayer → Animals → Just Pretend → Doomed) at 64 s of 219, volume
 * 38%; media_player.sonos_workshop_ma idle at 45%. Library: four playlists
 * (Discover Weekly, chill, workout, All Things Metalcore), three liked
 * songs, two albums, three artists. get_queue rejects `limit` by default,
 * like HA 2026.11 — the card then shows current + next + a "more" count.
 *
 * Two mounts share that state: #card-music (400px) and #card-music-wide
 * (900px, where the container query puts the library beside the player).
 */

import { test, expect, type Page } from "@playwright/test";

const CARD = "#card-music ru-music-card";
const WIDE = "#card-music-wide ru-music-card";
const LIVING = "media_player.sonos_livingroom_ma";
const WORKSHOP = "media_player.sonos_workshop_ma";

async function openHarness(page: Page): Promise<void> {
  await page.goto("/dev/harness.html");
  await expect(page.locator(`${CARD} .track-title`)).toHaveText("Kingslayer");
}

/** Calls that change something — the library/search/queue reads are noise
 * for most assertions. */
async function actions(page: Page) {
  const calls = await page.evaluate(() => window.__harness.calls);
  return calls.filter(
    (call) =>
      !(
        call.domain === "music_assistant" &&
        ["get_library", "search", "get_queue"].includes(call.service)
      )
  );
}

async function clearCalls(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__harness.calls.length = 0;
  });
}

test.beforeEach(async ({ page }) => {
  await openHarness(page);
});

test("renders speakers, now playing, volume and the playlists tab", async ({
  page,
}) => {
  await expect(page.locator(`${CARD} .title`)).toHaveText("Music");
  await expect(page.locator(`${CARD} .summary`)).toHaveText(
    "Playing · Living Room"
  );
  await expect(page.locator(`${CARD} .speaker-name`)).toHaveText([
    "Living Room",
    "Workshop",
  ]);
  await expect(page.locator(`${CARD} .speaker-status`)).toHaveText([
    "Playing",
    "Idle",
  ]);
  await expect(page.locator(`${CARD} .speaker.active .speaker-name`)).toHaveText(
    "Living Room"
  );
  await expect(page.locator(`${CARD} .track-artist`)).toHaveText(
    "Bring Me The Horizon · Post Human: Survival Horror"
  );
  // The cover comes through HA's same-origin proxy, not MA's http URL
  // (blocked as mixed content on an https dashboard).
  await expect(page.locator(`${CARD} .art.cover img`)).toHaveAttribute(
    "src",
    `/api/media_player_proxy/${LIVING}?token=mock`
  );
  await expect(page.locator(`${CARD} .time`).nth(1)).toHaveText("3:39");
  await expect(page.locator(`${CARD} .t-play`)).toHaveText("❘❘");
  await expect(page.locator(`${CARD} .vol-value`)).toHaveText("38%");
  await expect(page.locator(`${CARD} .tab.on`)).toHaveText("Playlists");
  await expect(page.locator(`${CARD} .row-name`)).toHaveText([
    "Discover Weekly",
    "chill",
    "workout",
    "All Things Metalcore",
  ]);
  // No shuffle — repeat sits right of the transport.
  await expect(page.locator(`${CARD} .t-btn`)).toHaveCount(3);
  await expect(page.locator(`${CARD} .t-btn.repeat`)).toBeVisible();

  const library = (await page.evaluate(() => window.__harness.musicReads)).find(
    (call) => call.service === "get_library"
  );
  // The config entry is looked up through config_entries/get.
  expect(library?.data).toMatchObject({
    config_entry_id: "mock-ma-entry",
    media_type: "playlist",
    order_by: "name",
  });
});

test("the Liked tab lists library tracks, newest likes first", async ({
  page,
}) => {
  await page.locator(`${CARD} .tab`, { hasText: "Liked" }).click();
  await expect(page.locator(`${CARD} .row-name`)).toHaveText([
    "Like Before",
    "Kingslayer",
    "Animals",
  ]);
  await expect(page.locator(`${CARD} .row-meta`).first()).toHaveText(
    "Bad Omens"
  );
  // The track playing right now is highlighted.
  await expect(page.locator(`${CARD} .row-name.now`)).toHaveText("Kingslayer");
  const calls = await page.evaluate(() => window.__harness.musicReads);
  expect(
    calls.find(
      (call) =>
        call.service === "get_library" && call.data?.media_type === "track"
    )?.data
  ).toMatchObject({ order_by: "timestamp_added_desc" });

  await page.locator(`${CARD} .tab`, { hasText: "Artists" }).click();
  await expect(page.locator(`${CARD} .art.round`)).toHaveCount(3);
});

test("a playlist opens; Play plays it, + adds it to the queue", async ({
  page,
}) => {
  await clearCalls(page);
  await page.locator(`${CARD} .row`, { hasText: "workout" }).click();
  // Opening reads the contents — it plays nothing.
  await expect(page.locator(`${CARD} .drill-title`)).toHaveText("workout");
  await expect(page.locator(`${CARD} .row-name`)).toHaveText([
    "Doomed",
    "Kingslayer",
  ]);
  expect(await actions(page)).toEqual([]);

  await page.locator(`${CARD} .drill-play`).click();
  await expect.poll(() => actions(page)).toEqual([
    {
      domain: "music_assistant",
      service: "play_media",
      data: {
        entity_id: LIVING,
        media_id: "playlist:workout",
        media_type: "playlist",
        enqueue: "replace",
      },
    },
  ]);
  await expect(page.locator(`${CARD} .feedback`)).toHaveText(
    "Playing on Living Room"
  );
  await expect(page.locator(`${CARD} .track-title`)).toHaveText("Doomed");

  await page.locator(`${CARD} .drill-back`).click();
  await expect(page.locator(`${CARD} .drill-head`)).toHaveCount(0);
  await clearCalls(page);
  await page
    .locator(`${CARD} .row`, { hasText: "chill" })
    .locator(".row-act")
    .click();
  await expect.poll(() => actions(page)).toEqual([
    {
      domain: "music_assistant",
      service: "play_media",
      data: {
        entity_id: LIVING,
        media_id: "playlist:chill",
        media_type: "playlist",
        enqueue: "add",
      },
    },
  ]);
  await expect(page.locator(`${CARD} .feedback`)).toHaveText(
    "Queued on Living Room"
  );
  // Still playing the same track; the queue re-read picks up the additions
  // (workout's 2 tracks + chill's 2 → 3 after the current one).
  await expect(page.locator(`${CARD} .track-title`)).toHaveText("Doomed");
  await expect(page.locator(`${CARD} .tab`).last()).toHaveText("Queue · 3");
});

test("search lists matches across types and plays them", async ({ page }) => {
  await page.locator(`${CARD} .search`).fill("bad omens");
  await expect(page.locator(`${CARD} .tab.on`)).toHaveCount(0);
  await expect(page.locator(`${CARD} .row-name`)).toHaveText([
    "Just Pretend",
    "Like Before",
    "Bad Omens",
  ]);
  await expect(page.locator(`${CARD} .row-meta`)).toHaveText([
    "Song · Bad Omens",
    "Song · Bad Omens",
    "Artist",
  ]);
  const search = (await page.evaluate(() => window.__harness.musicReads)).filter(
    (call) => call.service === "search"
  );
  // Debounced: one search for the whole typed query.
  expect(search).toHaveLength(1);
  expect(search[0].data).toMatchObject({
    config_entry_id: "mock-ma-entry",
    name: "bad omens",
    limit: 5,
  });

  await clearCalls(page);
  await page.locator(`${CARD} .row`, { hasText: "Like Before" }).click();
  await expect.poll(() => actions(page)).toEqual([
    {
      domain: "music_assistant",
      service: "play_media",
      data: {
        entity_id: LIVING,
        media_id: "track:like-before",
        media_type: "track",
        enqueue: "replace",
      },
    },
  ]);

  await page.locator(`${CARD} .search`).fill("zzz");
  await expect(page.locator(`${CARD} .empty`)).toHaveText("No matches for “zzz”");

  // Clearing the search returns to the tab.
  await page.locator(`${CARD} .search`).fill("");
  await expect(page.locator(`${CARD} .tab.on`)).toHaveText("Playlists");
});

test("the queue tab shows current, next and the rest as a count", async ({
  page,
}) => {
  await page.locator(`${CARD} .tab`, { hasText: "Queue" }).click();
  await expect(page.locator(`${CARD} .lib-title`)).toHaveText(
    "Queue · Living Room"
  );
  await expect(page.locator(`${CARD} .row-name`)).toHaveText([
    "Kingslayer",
    "Animals",
  ]);
  await expect(page.locator(`${CARD} .row-meta`).first()).toHaveText(
    "Bring Me The Horizon · Now playing"
  );
  await expect(page.locator(`${CARD} .row-name.now`)).toHaveText("Kingslayer");
  await expect(page.locator(`${CARD} .more`)).toHaveText(
    "+ 2 more in the queue"
  );
  // Read-only: no add buttons, rows aren't actionable.
  await expect(page.locator(`${CARD} .row-act`)).toHaveCount(0);

  // Next track moves the queue along.
  await page.locator(`${CARD} [aria-label="Next"]`).click();
  await expect(page.locator(`${CARD} .row-name.now`)).toHaveText("Animals");
  await expect(page.locator(`${CARD} .more`)).toHaveText(
    "+ 1 more in the queue"
  );
});

test("with get_queue item support the whole queue is listed", async ({
  page,
}) => {
  // A fresh card instance: the first get_queue answer decides whether the
  // card asks for items, and the harness card already learned "no".
  await page.evaluate(() => {
    window.__harness.setQueueItems(true);
    const old = document.querySelector("#card-music ru-music-card") as
      | (HTMLElement & { hass: unknown })
      | null;
    const fresh = document.createElement("ru-music-card") as HTMLElement & {
      setConfig(config: unknown): void;
      hass: unknown;
    };
    fresh.setConfig({
      type: "custom:ru-music-card",
      players: [
        { entity: "media_player.sonos_livingroom_ma", name: "Living Room" },
        { entity: "media_player.sonos_workshop_ma", name: "Workshop" },
      ],
    });
    fresh.hass = old!.hass;
    fresh.id = "fresh-music";
    document.getElementById("card-music")!.appendChild(fresh);
  });
  const fresh = "#fresh-music";
  await page.locator(`${fresh} .tab`, { hasText: "Queue" }).click();
  await expect(page.locator(`${fresh} .row-name`)).toHaveText([
    "Kingslayer",
    "Animals",
    "Just Pretend",
    "Doomed",
  ]);
  await expect(page.locator(`${fresh} .more`)).toHaveCount(0);
  const queueCalls = (await page.evaluate(() => window.__harness.musicReads)).filter(
    (call) =>
      call.service === "get_queue" && call.data?.entity_id === LIVING
  );
  expect(queueCalls.some((call) => call.data?.limit === 50)).toBe(true);
  await page.evaluate(() => window.__harness.setQueueItems(false));
});

test("switching speakers retargets now playing, queue and play", async ({
  page,
}) => {
  await page.locator(`${CARD} .speaker`, { hasText: "Workshop" }).click();
  await expect(page.locator(`${CARD} .speaker.active .speaker-name`)).toHaveText(
    "Workshop"
  );
  await expect(page.locator(`${CARD} .track-title`)).toHaveText(
    "Nothing playing"
  );
  await expect(page.locator(`${CARD} .vol-value`)).toHaveText("45%");
  await page.locator(`${CARD} .tab`, { hasText: "Queue" }).click();
  await expect(page.locator(`${CARD} .empty`)).toHaveText(
    "Nothing queued on Workshop"
  );

  await page.locator(`${CARD} .tab`, { hasText: "Liked" }).click();
  await clearCalls(page);
  await page.locator(`${CARD} .row`, { hasText: "Animals" }).click();
  await expect.poll(() => actions(page)).toEqual([
    {
      domain: "music_assistant",
      service: "play_media",
      data: {
        entity_id: WORKSHOP,
        media_id: "track:animals",
        media_type: "track",
        enqueue: "replace",
      },
    },
  ]);
  await expect(page.locator(`${CARD} .track-title`)).toHaveText("Animals");
  await expect(page.locator(`${CARD} .summary`)).toHaveText(
    "Playing · Living Room, Workshop"
  );
});

test("the group button joins and unjoins the speakers", async ({ page }) => {
  await clearCalls(page);
  await page.locator(`${CARD} .group`).click();
  await expect.poll(() => actions(page)).toEqual([
    {
      domain: "media_player",
      service: "join",
      data: { entity_id: LIVING, group_members: [WORKSHOP] },
    },
  ]);
  await expect(page.locator(`${CARD} .group`)).toHaveClass(/on/);
  await expect(page.locator(`${CARD} .summary`)).toHaveText(
    "Playing · both rooms"
  );
  await expect(page.locator(`${CARD} .speaker.active`)).toHaveCount(2);
  await expect(page.locator(`${CARD} .speaker-status`)).toHaveText([
    "Grouped · Playing",
    "Grouped · Playing",
  ]);
  // One volume row per room, labeled.
  await expect(page.locator(`${CARD} .vol-name`)).toHaveText([
    "Living Room",
    "Workshop",
  ]);

  // Selecting the member still controls the group through its leader.
  await page.locator(`${CARD} .speaker`, { hasText: "Workshop" }).click();
  await clearCalls(page);
  await page.locator(`${CARD} .row`, { hasText: "chill" }).click();
  await page.locator(`${CARD} .drill-play`).click();
  await expect.poll(() => actions(page)).toEqual([
    {
      domain: "music_assistant",
      service: "play_media",
      data: {
        entity_id: LIVING,
        media_id: "playlist:chill",
        media_type: "playlist",
        enqueue: "replace",
      },
    },
  ]);
  await expect(page.locator(`${CARD} .feedback`)).toHaveText(
    "Playing on both rooms"
  );

  await clearCalls(page);
  await page.locator(`${CARD} .group`).click();
  await expect.poll(() => actions(page)).toEqual([
    {
      domain: "media_player",
      service: "unjoin",
      data: { entity_id: WORKSHOP },
    },
  ]);
  await expect(page.locator(`${CARD} .group`)).not.toHaveClass(/on/);
  await expect(page.locator(`${CARD} .vol-name`)).toHaveCount(0);
});

test("transport, repeat, seek and volume call the player", async ({ page }) => {
  await clearCalls(page);
  await page.locator(`${CARD} .t-play`).click();
  await expect(page.locator(`${CARD} .t-play`)).toHaveText("▶");
  await page.locator(`${CARD} [aria-label="Next"]`).click();
  await expect(page.locator(`${CARD} .track-title`)).toHaveText("Animals");

  await page.locator(`${CARD} .t-btn.repeat`).click();
  await expect(page.locator(`${CARD} .t-btn.repeat`)).toHaveClass(/on/);
  await page.locator(`${CARD} .t-btn.repeat`).click();
  await expect(page.locator(`${CARD} .t-btn.repeat .badge`)).toHaveText("1");

  // Seek to the middle of the track (244 s → 122 s).
  const progress = page.locator(`${CARD} .progress`);
  const box = (await progress.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  // Volume to ~80%, then mute.
  const vol = page.locator(`${CARD} .vol-track`);
  const vbox = (await vol.boundingBox())!;
  await page.mouse.click(vbox.x + vbox.width * 0.8, vbox.y + vbox.height / 2);
  await expect(page.locator(`${CARD} .vol-value`)).toHaveText(/^\s*(79|80|81)%\s*$/);
  await page.locator(`${CARD} .vol-mute`).click();
  await expect(page.locator(`${CARD} .vol-value`)).toHaveText("—");

  const calls = await actions(page);
  const summary = calls.map((call) => `${call.service}`);
  expect(summary).toEqual([
    "media_play_pause",
    "media_next_track",
    "repeat_set",
    "repeat_set",
    "media_seek",
    "volume_set",
    "volume_mute",
  ]);
  expect(calls[2].data).toMatchObject({ entity_id: LIVING, repeat: "all" });
  expect(calls[3].data).toMatchObject({ repeat: "one" });
  expect(Number(calls[4].data?.seek_position)).toBeGreaterThanOrEqual(118);
  expect(Number(calls[4].data?.seek_position)).toBeLessThanOrEqual(126);
  expect(calls[6].data).toEqual({ entity_id: LIVING, is_volume_muted: true });
});

test("an unavailable speaker disables its controls", async ({ page }) => {
  await page.evaluate(() =>
    window.__harness.setMusicPlayer("media_player.sonos_livingroom_ma", {
      available: false,
    })
  );
  await expect(page.locator(`${CARD} .speaker-status`).first()).toHaveText(
    "Unavailable"
  );
  await expect(page.locator(`${CARD} .track-title`)).toHaveText("Unavailable");
  await expect(page.locator(`${CARD} .t-play`)).toBeDisabled();
  await expect(page.locator(`${CARD} .vol-mute`)).toBeDisabled();
});

test("dark mode flips the palette", async ({ page }) => {
  const card = page.locator(CARD);
  const surface = page.locator(`${CARD} .card`);
  const light = await surface.evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.evaluate(() => window.__harness.setDarkMode(true));
  await expect(card).toHaveAttribute("dark", "");
  const dark = await surface.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(dark).toBe("rgb(26, 27, 30)");
  expect(light).toBe("rgb(245, 246, 250)");
});

test("a song in a playlist plays the playlist from that song", async ({
  page,
}) => {
  await page.locator(`${CARD} .row`, { hasText: "All Things Metalcore" }).click();
  await expect(page.locator(`${CARD} .drill-meta`)).toHaveText(
    "Playlist · 3 songs"
  );
  await expect(page.locator(`${CARD} .row-name`)).toHaveText([
    "Kingslayer",
    "Animals",
    "Doomed",
  ]);
  await expect(page.locator(`${CARD} .row-meta`)).toHaveText([
    "Bring Me The Horizon",
    "Architects",
    "Bring Me The Horizon",
  ]);
  // The now-playing song is highlighted in the list.
  await expect(page.locator(`${CARD} .row-name.now`)).toHaveText("Kingslayer");
  const browse = (await page.evaluate(() => window.__harness.musicReads)).filter(
    (read) => read.service === "browse_media"
  );
  expect(browse.map((read) => read.data)).toEqual([
    {
      type: "media_player/browse_media",
      entity_id: LIVING,
      media_content_id: "playlist:metalcore",
      media_content_type: "playlist",
    },
  ]);

  await clearCalls(page);
  await page.locator(`${CARD} .row`, { hasText: "Animals" }).click();
  await expect.poll(() => actions(page)).toEqual([
    {
      domain: "music_assistant",
      service: "play_media",
      data: {
        entity_id: LIVING,
        media_id: "playlist:metalcore",
        media_type: "playlist",
        enqueue: "replace",
        start_item: "track:animals",
      },
    },
  ]);
  await expect(page.locator(`${CARD} .track-title`)).toHaveText("Animals");
  // The playlist's remaining song is up next.
  await expect(page.locator(`${CARD} .tab`).last()).toHaveText("Queue · 1");

  // + on a song adds just that song.
  await clearCalls(page);
  await page
    .locator(`${CARD} .row`, { hasText: "Doomed" })
    .locator(".row-act")
    .click();
  await expect.poll(() => actions(page)).toEqual([
    {
      domain: "music_assistant",
      service: "play_media",
      data: {
        entity_id: LIVING,
        media_id: "track:doomed",
        media_type: "track",
        enqueue: "add",
      },
    },
  ]);
  await expect(page.locator(`${CARD} .tab`).last()).toHaveText("Queue · 2");
});

test("an artist opens its albums, an album its songs, back steps out", async ({
  page,
}) => {
  await page.locator(`${CARD} .tab`, { hasText: "Artists" }).click();
  await page.locator(`${CARD} .row`, { hasText: "Bring Me The Horizon" }).click();
  await expect(page.locator(`${CARD} .drill-title`)).toHaveText(
    "Bring Me The Horizon"
  );
  await expect(page.locator(`${CARD} .drill-meta`)).toHaveText("Artist · 1 album");
  await expect(page.locator(`${CARD} .row-name`)).toHaveText([
    "Post Human: Survival Horror",
  ]);
  await expect(page.locator(`${CARD} .row-meta`)).toHaveText(["Album"]);

  await page.locator(`${CARD} .row`, { hasText: "Post Human" }).click();
  await expect(page.locator(`${CARD} .drill-title`)).toHaveText(
    "Post Human: Survival Horror"
  );
  await expect(page.locator(`${CARD} .drill-meta`)).toHaveText(
    "Album · Bring Me The Horizon · 1 song"
  );
  await clearCalls(page);
  await page.locator(`${CARD} .row`, { hasText: "Kingslayer" }).click();
  await expect.poll(() => actions(page)).toEqual([
    {
      domain: "music_assistant",
      service: "play_media",
      data: {
        entity_id: LIVING,
        media_id: "album:post-human",
        media_type: "album",
        enqueue: "replace",
        start_item: "track:kingslayer",
      },
    },
  ]);

  await page.locator(`${CARD} .drill-back`).click();
  await expect(page.locator(`${CARD} .drill-title`)).toHaveText(
    "Bring Me The Horizon"
  );
  await page.locator(`${CARD} .drill-back`).click();
  await expect(page.locator(`${CARD} .drill-head`)).toHaveCount(0);
  await expect(page.locator(`${CARD} .tab.on`)).toHaveText("Artists");
  await expect(page.locator(`${CARD} .row-name`)).toHaveCount(3);
});

test("search results open too; a tab or a new search leaves the drill", async ({
  page,
}) => {
  await page.locator(`${CARD} .search`).fill("metalcore");
  await page.locator(`${CARD} .row`, { hasText: "All Things Metalcore" }).click();
  // The search ends and the item opens on its own tab.
  await expect(page.locator(`${CARD} .search`)).toHaveValue("");
  await expect(page.locator(`${CARD} .tab.on`)).toHaveText("Playlists");
  await expect(page.locator(`${CARD} .drill-title`)).toHaveText(
    "All Things Metalcore"
  );

  await page.locator(`${CARD} .tab`, { hasText: "Albums" }).click();
  await expect(page.locator(`${CARD} .drill-head`)).toHaveCount(0);
  await page.locator(`${CARD} .tab`, { hasText: "Playlists" }).click();
  await expect(page.locator(`${CARD} .drill-head`)).toHaveCount(0);
  await expect(page.locator(`${CARD} .row-name`)).toHaveCount(4);

  await page.locator(`${CARD} .row`, { hasText: "chill" }).click();
  await expect(page.locator(`${CARD} .drill-title`)).toHaveText("chill");
  await page.locator(`${CARD} .search`).fill("animals");
  await expect(page.locator(`${CARD} .drill-head`)).toHaveCount(0);
  await page.locator(`${CARD} .search`).fill("");
  await expect(page.locator(`${CARD} .drill-head`)).toHaveCount(0);
  await expect(page.locator(`${CARD} .row-name`)).toHaveCount(4);
});

test("the drill header sits in the library column of the wide mount", async ({
  page,
}) => {
  await page.locator(`${WIDE} .row`, { hasText: "workout" }).click();
  const head = page.locator(`${WIDE} .panel.library .drill-head`);
  await expect(head.locator(".drill-title")).toHaveText("workout");
  const box = (await head.boundingBox())!;
  const list = (await page.locator(`${WIDE} .list`).boundingBox())!;
  expect(list.y).toBeGreaterThan(box.y + box.height - 1);
  // Mounts keep their own drill state.
  await expect(page.locator(`${CARD} .drill-head`)).toHaveCount(0);
});

test("the wide mount puts the library beside the player", async ({
  page,
}, testInfo) => {
  const player = page.locator(`${WIDE} .panel.player`);
  const library = page.locator(`${WIDE} .panel.library`);
  const p = (await player.boundingBox())!;
  const l = (await library.boundingBox())!;
  const narrowPlayer = (await page.locator(`${CARD} .panel.player`).boundingBox())!;
  const narrowLibrary = (await page.locator(`${CARD} .panel.library`).boundingBox())!;
  // The narrow mount always stacks.
  expect(narrowLibrary.y).toBeGreaterThan(narrowPlayer.y + narrowPlayer.height - 1);
  if (testInfo.project.name === "desktop-chromium") {
    expect(l.x).toBeGreaterThan(p.x + p.width - 1);
    expect(Math.abs(l.y - p.y)).toBeLessThan(2);
    await expect(page.locator(`${WIDE} .art.cover`)).toHaveCSS("width", "104px");
  } else {
    // 390px viewport: the "wide" mount is only phone-wide — stacked.
    expect(l.y).toBeGreaterThan(p.y + p.height - 1);
  }
});

test("rejects configs without Music Assistant players", async ({ page }) => {
  const errors = await page.evaluate(() => {
    const card = document.createElement("ru-music-card") as HTMLElement & {
      setConfig(config: unknown): void;
    };
    const attempt = (config: unknown) => {
      try {
        card.setConfig(config);
        return "ok";
      } catch (error) {
        return (error as Error).message;
      }
    };
    return [
      attempt({ type: "custom:ru-music-card" }),
      attempt({ type: "custom:ru-music-card", players: ["light.kitchen"] }),
      attempt({
        type: "custom:ru-music-card",
        players: ["media_player.a"],
        library_limit: 0,
      }),
      attempt({ type: "custom:ru-music-card", players: ["media_player.a"] }),
    ];
  });
  expect(errors[0]).toContain('"players" is required');
  expect(errors[1]).toContain("media_player.*");
  expect(errors[2]).toContain('"library_limit"');
  expect(errors[3]).toBe("ok");
});
