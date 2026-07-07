/**
 * hass-custom — RagedUnicorn custom frontend resources for Home Assistant.
 *
 * Distributed via HACS as a "Plugin (Dashboard)" repository. HACS registers
 * this file as a Lovelace resource; the top-level code below runs on load.
 *
 * Right now it registers custom icon sets, so you can use icons that are not
 * part of Material Design Icons (mdi). Reference them anywhere Home Assistant
 * accepts an icon (entity settings, cards, dashboards, YAML) as
 * `<prefix>:<name>`:
 *
 *     icon: ru:matter
 *     icon: ru:zigbee
 *
 * To add an icon:
 *   1. Grab the SVG `d` attribute (the path data) of a 24x24 icon.
 *   2. Add an entry under the desired set in ICON_SETS below.
 *   3. Bump VERSION and cut a new GitHub release so HACS offers the update.
 *
 * This file is intentionally build-free — plain JS, no bundler. Add more
 * frontend behavior (extra icon sets, custom cards, etc.) directly here.
 */

const VERSION = "0.1.0";

/**
 * Icon sets. Each top-level key becomes an icon *prefix* (e.g. `ru`); each
 * icon is then referenced as `<prefix>:<name>` (e.g. `ru:matter`).
 *
 * `viewBox` is optional and defaults to "0 0 24 24".
 */
const ICON_SETS = {
  ru: {
    // Matter brand logo (source: matter.svg, 24x24). Home Assistant renders
    // this monochrome — the original #44739e fill is dropped in favor of the
    // theme's currentColor, which is standard for <ha-icon>.
    matter: {
      path: "M7.939 7.248a6.4 6.4 0 0 0 2.908 1.335V2.894l1.158-.668 1.158.668v5.689a6.44 6.44 0 0 0 2.908-1.335l2.1 1.217a8.78 8.78 0 0 1-12.348 0ZM10.5 21.774a8.78 8.78 0 0 0-6.184-10.693v2.433a6.44 6.44 0 0 1 2.61 1.851L2 18.209v1.338l1.158.665 4.926-2.844a6.4 6.4 0 0 1 .3 3.185Zm9.194-10.693a8.78 8.78 0 0 0-6.174 10.693l2.108-1.217a6.4 6.4 0 0 1 .3-3.186l4.921 2.841L22 19.543v-1.334l-4.926-2.844a6.44 6.44 0 0 1 2.61-1.851Z",
    },
    // Zigbee brand logo (source: zigbee.svg, 24x24; svgrepo.com/svg/305631).
    // Referenced as `ru:zigbee`.
    zigbee: {
      path: "M11.988 0a11.85 11.85 0 00-8.617 3.696c7.02-.875 11.401-.583 13.289-.34 3.752.583 3.558 3.404 3.558 3.404L8.237 19.112c2.299.22 6.897.366 13.796-.631a11.86 11.86 0 001.912-6.469C23.945 5.374 18.595 0 11.988 0zm.232 4.31c-2.451-.014-5.772.146-9.963.723C.854 7.003.055 9.41.055 12.012.055 18.626 5.38 24 11.988 24c3.63 0 6.85-1.63 9.053-4.182-7.286.948-11.813.631-13.75.388-3.775-.56-3.557-3.404-3.557-3.404L15.691 4.474a38.635 38.635 0 00-3.471-.163Z",
    },
  },
};

// ---------------------------------------------------------------------------
// Registration — you normally don't need to touch anything below this line.
// Uses the documented custom-iconset API:
//   https://developers.home-assistant.io/blog/2020/05/09/custom-iconsets/
// ---------------------------------------------------------------------------

window.customIconsets = window.customIconsets || {};

for (const [setName, icons] of Object.entries(ICON_SETS)) {
  window.customIconsets[setName] = async (iconName) => {
    const icon = icons[iconName];
    if (!icon) {
      throw new Error(`[hass-custom] icon "${setName}:${iconName}" is not defined`);
    }
    return { path: icon.path, viewBox: icon.viewBox ?? "0 0 24 24" };
  };
}

console.info(
  `%c hass-custom %c v${VERSION} `,
  "color:white;background:#6f42c1;font-weight:700;border-radius:3px 0 0 3px;padding:2px 6px;",
  "color:#6f42c1;background:#efe7ff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 6px;",
  `— registered icon sets: ${Object.keys(ICON_SETS).map((s) => `${s}:*`).join(", ")}`
);
