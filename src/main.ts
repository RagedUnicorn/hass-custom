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

import { iconSetNames, registerIconSets } from "./icons";
import "./cards/ru-shutters-card/ru-shutters-card";
import "./cards/ru-lights-card/ru-lights-card";
import "./cards/ru-purifier-card/ru-purifier-card";
import "./cards/ru-tv-card/ru-tv-card";
import "./cards/ru-washer-card/ru-washer-card";

registerIconSets();

// Guarded: in a release build Vite replaces __VERSION__ statically, but the
// dev loop loads this module straight off the dev server into Home Assistant,
// where Vite 7 only provides define values via /@vite/env — a module the HA
// page never imports. Without the guard the banner throws ReferenceError.
const version = typeof __VERSION__ === "undefined" ? "dev" : __VERSION__;

console.info(
  `%c hass-custom %c v${version} `,
  "color:white;background:#6f42c1;font-weight:700;border-radius:3px 0 0 3px;padding:2px 6px;",
  "color:#6f42c1;background:#efe7ff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 6px;",
  `— icon sets: ${iconSetNames()
    .map((s) => `${s}:*`)
    .join(", ")} — cards: ru-shutters-card, ru-lights-card, ru-purifier-card, ru-tv-card, ru-washer-card`
);
