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

const mock = new MockHass([
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
]);

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
mock.onChange((hass) => {
  card.hass = hass;
});

const container = document.getElementById("card")!;
container.appendChild(card);

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
  setTravelMs: (ms) => mock.setTravelMs(ms),
  reset: () => mock.reset(),
};
