/**
 * hass-custom — RagedUnicorn custom frontend resources for Home Assistant.
 *
 * Distributed via HACS as a "Plugin (Dashboard)" repository. HACS registers
 * the built dist/hass-custom.js as a Lovelace resource; this entry point runs
 * on load and registers everything the bundle ships:
 *
 *   - custom icon sets (e.g. `ru:matter`, `ru:zigbee`) — see icons.ts
 *   - custom Lovelace cards (e.g. `custom:ru-shutters-card`) — see cards/
 */

import { iconSetNames, registerIconSets } from "./icons";
import "./cards/ru-shutters-card/ru-shutters-card";

registerIconSets();

console.info(
  `%c hass-custom %c v${__VERSION__} `,
  "color:white;background:#6f42c1;font-weight:700;border-radius:3px 0 0 3px;padding:2px 6px;",
  "color:#6f42c1;background:#efe7ff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 6px;",
  `— icon sets: ${iconSetNames()
    .map((s) => `${s}:*`)
    .join(", ")} — cards: ru-shutters-card`
);
