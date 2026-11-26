/**
 * hass-custom — RagedUnicorn custom frontend resources for Home Assistant.
 *
 * Distributed via HACS as a "Plugin (Dashboard)" repository. HACS registers
 * the built generated/dist/hass-custom.js as a Lovelace resource; this entry point runs
 * on load and registers everything the bundle ships:
 *
 *   - custom icon sets (e.g. `ru:matter`, `ru:zigbee`) — see icons.ts
 *   - custom Lovelace cards (e.g. `custom:ru-shutters-card`) — see cards/
 */

import buildInfo from "virtual:build-info";

import { iconSetNames, registerIconSets } from "./icons";
import "./cards/ru-shutters-card/ru-shutters-card";
import "./cards/ru-lights-card/ru-lights-card";
import "./cards/ru-purifier-card/ru-purifier-card";
import "./cards/ru-tv-card/ru-tv-card";
import "./cards/ru-washer-card/ru-washer-card";
import "./cards/ru-doors-card/ru-doors-card";
import "./cards/ru-last-seen-card/ru-last-seen-card";
import "./cards/ru-nav-card/ru-nav-card";
import "./cards/ru-actions-card/ru-actions-card";
import "./cards/ru-header-card/ru-header-card";
import "./cards/ru-music-card/ru-music-card";

registerIconSets();

/** "v0.5.1 · 1a2b3c4" — with "+" for uncommitted changes and a "dev"
 * marker when served by the dev server. Shown in the console banner and the
 * dev badge (see entry.ts). */
export function buildLabel(info: typeof buildInfo = buildInfo): string {
  return `v${info.version} · ${info.commit}${info.dirty ? "+" : ""}${
    info.dev ? " · dev" : ""
  }`;
}

export { buildInfo };

console.info(
  `%c hass-custom %c ${buildLabel()} `,
  "color:white;background:#6f42c1;font-weight:700;border-radius:3px 0 0 3px;padding:2px 6px;",
  "color:#6f42c1;background:#efe7ff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 6px;",
  `— icon sets: ${iconSetNames()
    .map((s) => `${s}:*`)
    .join(", ")} — cards: ru-shutters-card, ru-lights-card, ru-purifier-card, ru-tv-card, ru-washer-card, ru-doors-card, ru-last-seen-card, ru-nav-card, ru-actions-card, ru-header-card, ru-music-card`
);
