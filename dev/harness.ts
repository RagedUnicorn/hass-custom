/**
 * Dev/test harness: mounts the cards against a MockHass — no real Home
 * Assistant involved, so nothing physical ever moves. Served by vite at
 * /dev/harness.html; driven manually, via the Playwright suite in tests/,
 * or interactively through browser tooling.
 *
 * Test hooks live on window.__harness (see the Harness interface).
 */

import "../src/main";
import type { LovelaceCard } from "../src/types";
import { MockHass, type ServiceCall } from "./mock-hass";

// Outside HA <ha-icon> is undefined and renders empty; a small dot keeps the
// layout realistic without pulling in an icon library.
if (!customElements.get("ha-icon")) {
  customElements.define(
    "ha-icon",
    class extends HTMLElement {
      icon?: string;

      connectedCallback(): void {
        const root = this.attachShadow({ mode: "open" });
        root.innerHTML =
          "<div style='width:14px;height:14px;border-radius:50%;background:currentColor;opacity:.8'></div>";
      }
    }
  );
}

const mock = new MockHass(
  [
    { entity: "cover.bedroom_medium", name: "Window", position: 100 },
    { entity: "cover.diningroom_big", name: "Big window", position: 100 },
    { entity: "cover.livingroom_medium", name: "Medium", position: 50 },
    {
      entity: "cover.livingroom_small",
      name: "Small",
      available: false,
    },
    { entity: "cover.office_big_left", name: "Big left", position: 0 },
    { entity: "cover.office_big_right", name: "Big right", position: 0 },
    {
      entity: "cover.office_small",
      name: "Small",
      position: 100,
      supportsPosition: false,
    },
  ],
  [
    { entity: "light.kitchen_1", name: "Bulb 1", on: true, brightness: 80 },
    { entity: "light.kitchen_2", name: "Bulb 2", on: true, brightness: 80 },
    { entity: "light.kitchen_3", name: "Bulb 3", brightness: 60 },
    { entity: "light.bedroom_1", name: "Bulb 1", brightness: 50 },
    { entity: "light.bedroom_2", name: "Bulb 2", available: false },
    {
      entity: "light.livingroom_strip",
      name: "Strip",
      on: true,
      brightness: 65,
      effectList: ["Static", "Flow", "Pulse"],
      effect: "Flow",
      rgbColor: [255, 106, 61],
    },
    { entity: "light.office_1", name: "Bulb", on: true, brightness: 100 },
    {
      entity: "light.entry_1",
      name: "Bulb",
      on: false,
      supportsBrightness: false,
    },
  ],
  [
    {
      entity: "scene.relax",
      name: "Relax",
      apply: {
        "light.kitchen_1": { on: true, brightness: 35 },
        "light.kitchen_2": { on: true, brightness: 35 },
        "light.kitchen_3": { on: false },
        "light.livingroom_strip": { on: true, brightness: 30 },
        "light.office_1": { on: false },
      },
    },
    {
      entity: "scene.focus",
      name: "Focus",
      apply: {
        "light.kitchen_1": { on: true, brightness: 100 },
        "light.kitchen_2": { on: true, brightness: 100 },
        "light.kitchen_3": { on: true, brightness: 100 },
        "light.office_1": { on: true, brightness: 100 },
        "light.livingroom_strip": { on: false },
      },
    },
    {
      entity: "scene.movie",
      name: "Movie",
      apply: {
        "light.kitchen_1": { on: false },
        "light.kitchen_2": { on: false },
        "light.kitchen_3": { on: false },
        "light.office_1": { on: false },
        "light.livingroom_strip": { on: true, brightness: 40 },
      },
    },
    {
      entity: "scene.everything",
      name: "Everything",
      apply: {
        "light.kitchen_1": { on: true, brightness: 100 },
        "light.kitchen_2": { on: true, brightness: 100 },
        "light.kitchen_3": { on: true, brightness: 100 },
        "light.bedroom_1": { on: true, brightness: 100 },
        "light.office_1": { on: true, brightness: 100 },
        "light.entry_1": { on: true },
        "light.livingroom_strip": { on: true, brightness: 100 },
      },
    },
  ],
  [
    {
      entity: "fan.bedroom_dyson_purifier",
      name: "Bedroom Purifier",
      on: true,
      percentage: 40,
      percentageStep: 10,
      presetModes: ["Auto"],
      presetMode: "Auto",
      oscillating: true,
    },
  ],
  [{ entity: "switch.bedroom_purifier_night_mode", name: "Night mode" }],
  [
    { entity: "sensor.bedroom_purifier_pm_2_5", name: "PM 2.5", value: 8 },
    { entity: "sensor.bedroom_purifier_pm_10", name: "PM 10", value: 12 },
  ],
  [
    {
      // androidtv_remote-like: power/app/volume-step; reports a volume level
      // (the real integration does) but can only change it in key-press steps.
      // PAUSE|MUTE|PREV|NEXT|TURN_ON|TURN_OFF|PLAY_MEDIA|VOLUME_STEP|STOP|PLAY
      entity: "media_player.tv_android",
      name: "Living Room TV",
      state: "on",
      features: 22457,
      appId: "com.netflix.ninja",
      volume: 0.35,
    },
    {
      // cast-like: now-playing detail, seek, volume level.
      // PAUSE|SEEK|VOLUME_SET|MUTE|PREV|NEXT|TURN_ON|TURN_OFF|PLAY_MEDIA|STOP|PLAY
      entity: "media_player.tv_cast",
      name: "Living Room TV Cast",
      state: "playing",
      features: 21439,
      appName: "Netflix",
      title: "Stranger Things · S4 E7",
      duration: 3120,
      position: 754,
      volume: 0.35,
    },
    {
      // braviatv-like: absolute volume via Sony's REST API, HDMI input
      // selection, no track/seek.
      // PAUSE|VOLUME_SET|MUTE|PREV|NEXT|TURN_ON|TURN_OFF|SELECT_SOURCE|PLAY_MEDIA|VOLUME_STEP|STOP|PLAY
      entity: "media_player.tv_bravia",
      name: "Living Room TV Bravia",
      state: "on",
      features: 24509,
      volume: 0.35,
      sourceList: ["HDMI 1", "HDMI 2", "HDMI 3", "HDMI 4"],
      source: "HDMI 1",
    },
  ],
  [{ entity: "remote.tv_livingroom", name: "Living Room TV Remote" }]
);

const card = document.createElement("ru-shutters-card") as LovelaceCard;
card.setConfig({
  type: "custom:ru-shutters-card",
  title: "Shutters",
  rooms: [
    {
      name: "Bedroom",
      covers: [{ entity: "cover.bedroom_medium", name: "Window" }],
    },
    {
      name: "Dining room",
      covers: [{ entity: "cover.diningroom_big", name: "Big window" }],
    },
    {
      name: "Living room",
      covers: [
        { entity: "cover.livingroom_medium", name: "Medium" },
        { entity: "cover.livingroom_small", name: "Small" },
      ],
    },
    {
      name: "Office",
      icon: "mdi:desk",
      covers: [
        { entity: "cover.office_big_left", name: "Big left" },
        { entity: "cover.office_big_right", name: "Big right" },
        { entity: "cover.office_small", name: "Small" },
      ],
    },
  ],
});
const lightsCard = document.createElement("ru-lights-card") as LovelaceCard;
lightsCard.setConfig({
  type: "custom:ru-lights-card",
  title: "Lights",
  rooms: [
    {
      name: "Kitchen",
      lights: [
        { entity: "light.kitchen_1", name: "Bulb 1" },
        { entity: "light.kitchen_2", name: "Bulb 2" },
        { entity: "light.kitchen_3", name: "Bulb 3" },
      ],
    },
    {
      name: "Bedroom",
      lights: [
        { entity: "light.bedroom_1", name: "Bulb 1" },
        { entity: "light.bedroom_2", name: "Bulb 2" },
      ],
    },
    {
      name: "Living room",
      lights: [{ entity: "light.livingroom_strip", name: "Strip" }],
    },
    {
      name: "Office",
      lights: [{ entity: "light.office_1", name: "Bulb" }],
    },
    {
      name: "Entry",
      lights: [{ entity: "light.entry_1", name: "Bulb" }],
    },
  ],
  scenes: [
    {
      entity: "scene.relax",
      gradient: "linear-gradient(90deg,#ff9a4d,#ff5a3d)",
    },
    {
      entity: "scene.focus",
      gradient: "linear-gradient(90deg,#dff3ff,#8fd0ff)",
    },
    {
      entity: "scene.movie",
      gradient: "linear-gradient(90deg,#b03dff,#3d8bff)",
    },
    {
      entity: "scene.everything",
      gradient: "linear-gradient(90deg,#fff3d6,#ffd98a)",
    },
  ],
});

const purifierCard = document.createElement(
  "ru-purifier-card"
) as LovelaceCard;
purifierCard.setConfig({
  type: "custom:ru-purifier-card",
  title: "Air",
  entity: "fan.bedroom_dyson_purifier",
  name: "Bedroom Purifier",
  night_mode_entity: "switch.bedroom_purifier_night_mode",
  pm25_entity: "sensor.bedroom_purifier_pm_2_5",
  pm10_entity: "sensor.bedroom_purifier_pm_10",
});

/** Stand-in app icon: a rounded square in the brand color with the app's
 * initial, as a data URI — keeps the harness free of network fetches. */
function appIcon(color: string, initial: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">` +
    `<rect width="24" height="24" rx="5" fill="${color}"/>` +
    `<text x="12" y="16.5" text-anchor="middle" font-family="sans-serif"` +
    ` font-size="13" font-weight="700" fill="#fff">${initial}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Spotify uses an mdi: icon ref (rendered via ha-icon, tinted with color)
// and Twitch stays icon-less — together they exercise all three chip looks:
// image URL, icon ref, and the color-dot fallback.
const TV_APPS = [
  {
    name: "Netflix",
    color: "#E50914",
    icon: appIcon("#E50914", "N"),
    activity: "com.netflix.ninja",
    app_id: "com.netflix.ninja",
  },
  {
    name: "YouTube",
    color: "#FF0000",
    icon: appIcon("#FF0000", "Y"),
    activity: "com.google.android.youtube.tv",
    app_id: "com.google.android.youtube.tv",
  },
  {
    name: "Spotify",
    color: "#1DB954",
    icon: "mdi:spotify",
    activity: "com.spotify.tv.android",
    app_id: "com.spotify.tv.android",
  },
  {
    name: "Plex",
    color: "#E5A00D",
    icon: appIcon("#E5A00D", "P"),
    icon_dark: appIcon("#F5C542", "P"),
    activity: "com.plexapp.android",
    app_id: "com.plexapp.android",
  },
  {
    name: "Twitch",
    color: "#9146FF",
    activity: "tv.twitch.android.app",
    app_id: "tv.twitch.android.app",
  },
];

const tvCard = document.createElement("ru-tv-card") as LovelaceCard;
tvCard.setConfig({
  type: "custom:ru-tv-card",
  title: "Media",
  entity: "media_player.tv_android",
  name: "Living Room TV",
  media_entity: "media_player.tv_cast",
  remote_entity: "remote.tv_livingroom",
  apps: TV_APPS,
});

// Same TV, volume forced to steppers — the Android-12+ setup where the cast
// entity claims VOLUME_SET but only ever moves one step per call.
const tvSteppersCard = document.createElement("ru-tv-card") as LovelaceCard;
tvSteppersCard.setConfig({
  type: "custom:ru-tv-card",
  title: "Media (steppers)",
  entity: "media_player.tv_android",
  name: "Living Room TV",
  media_entity: "media_player.tv_cast",
  volume_mode: "steppers",
  apps: TV_APPS,
});

// Same TV with the braviatv entity as volume_entity — the Sony Bravia setup
// where absolute volume_set works through the native REST integration — and
// as source_entity, with a PlayStation chip switching to its HDMI input.
const tvBraviaCard = document.createElement("ru-tv-card") as LovelaceCard;
tvBraviaCard.setConfig({
  type: "custom:ru-tv-card",
  title: "Media (bravia volume)",
  entity: "media_player.tv_android",
  name: "Living Room TV",
  media_entity: "media_player.tv_cast",
  volume_entity: "media_player.tv_bravia",
  source_entity: "media_player.tv_bravia",
  apps: [
    ...TV_APPS,
    {
      name: "PlayStation",
      color: "#0070D1",
      icon: "mdi:sony-playstation",
      source: "HDMI 3",
    },
  ],
});

mock.onChange((hass) => {
  card.hass = hass;
  lightsCard.hass = hass;
  purifierCard.hass = hass;
  tvCard.hass = hass;
  tvSteppersCard.hass = hass;
  tvBraviaCard.hass = hass;
});

document.getElementById("card")!.appendChild(card);
document.getElementById("card-lights")!.appendChild(lightsCard);
document.getElementById("card-purifier")!.appendChild(purifierCard);
document.getElementById("card-tv")!.appendChild(tvCard);
document.getElementById("card-tv-steppers")!.appendChild(tvSteppersCard);
document.getElementById("card-tv-bravia")!.appendChild(tvBraviaCard);

// --- page chrome --------------------------------------------------------------

function applyPageTheme(dark: boolean): void {
  document.body.style.background = dark ? "#0d0e10" : "#e3e5ea";
}
applyPageTheme(false);

document.getElementById("toggle-dark")!.addEventListener("click", () => {
  const dark = !(mock.hass.themes?.darkMode ?? false);
  mock.setDarkMode(dark);
  applyPageTheme(dark);
});

document.getElementById("reset")!.addEventListener("click", () => mock.reset());

// --- test hooks -----------------------------------------------------------------

export interface Harness {
  calls: ServiceCall[];
  setDarkMode(dark: boolean): void;
  setPosition(entity: string, position: number): void;
  setLight(entity: string, patch: { on?: boolean; brightness?: number }): void;
  setFan(
    entity: string,
    patch: {
      on?: boolean;
      percentage?: number;
      presetMode?: string | null;
      oscillating?: boolean;
      available?: boolean;
    }
  ): void;
  setSwitch(entity: string, on: boolean): void;
  setSensor(entity: string, value: number): void;
  setMediaPlayer(
    entity: string,
    patch: {
      state?: "off" | "on" | "idle" | "playing" | "paused";
      position?: number;
      volume?: number | null;
      muted?: boolean;
      available?: boolean;
    }
  ): void;
  setTravelMs(ms: number): void;
  setReactionMs(ms: number): void;
  reset(): void;
}

declare global {
  interface Window {
    __harness: Harness;
  }
}

window.__harness = {
  calls: mock.calls,
  setDarkMode: (dark) => {
    mock.setDarkMode(dark);
    applyPageTheme(dark);
  },
  setPosition: (entity, position) => mock.setPosition(entity, position),
  setLight: (entity, patch) => mock.setLight(entity, patch),
  setFan: (entity, patch) => mock.setFan(entity, patch),
  setSwitch: (entity, on) => mock.setSwitch(entity, on),
  setSensor: (entity, value) => mock.setSensor(entity, value),
  setMediaPlayer: (entity, patch) => mock.setMediaPlayer(entity, patch),
  setTravelMs: (ms) => mock.setTravelMs(ms),
  setReactionMs: (ms) => mock.setReactionMs(ms),
  reset: () => mock.reset(),
};
