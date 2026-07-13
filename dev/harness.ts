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
  ]
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

mock.onChange((hass) => {
  card.hass = hass;
  lightsCard.hass = hass;
});

document.getElementById("card")!.appendChild(card);
document.getElementById("card-lights")!.appendChild(lightsCard);

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
  setTravelMs(ms: number): void;
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
  setTravelMs: (ms) => mock.setTravelMs(ms),
  reset: () => mock.reset(),
};
