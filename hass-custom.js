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

const VERSION = "0.3.0";

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
    // Philips Hue brand logo (source: philips-hue.svg, 24x24; svgrepo.com).
    // Referenced as `ru:philips-hue`.
    "philips-hue": {
      path: "M20.672 9.6c-2.043 0-3.505 1.386-3.682 3.416h-.664c-.247 0-.395.144-.395.384 0 .24.148.384.395.384h.661c.152 2.09 1.652 3.423 3.915 3.423.944 0 1.685-.144 2.332-.453.158-.075.337-.217.292-.471a.334.334 0 0 0-.15-.242c-.104-.065-.25-.072-.422-.02a7.93 7.93 0 0 0-.352.12c-.414.146-.771.273-1.599.273-1.75 0-2.908-1.023-2.952-2.605v-.025h5.444c.313 0 .492-.164.505-.463v-.058C23.994 9.865 21.452 9.6 20.672 9.6zm2.376 3.416h-5l.004-.035c.121-1.58 1.161-2.601 2.649-2.601 1.134 0 2.347.685 2.347 2.606zM9.542 10.221c0-.335-.195-.534-.52-.534s-.52.2-.52.534v2.795h1.04zm4.29 3.817c0 1.324-.948 2.361-2.16 2.361-1.433 0-2.13-.763-2.13-2.333v-.282h-1.04v.34c0 2.046.965 3.083 2.868 3.083 1.12 0 1.943-.486 2.443-1.445l.02-.036v.861c0 .334.193.534.519.534.325 0 .52-.2.52-.534v-2.803h-1.04zm.52-4.351c-.326 0-.52.2-.52.534v2.795h1.04v-2.795c0-.335-.195-.534-.52-.534zM3.645 9.6c-1.66 0-2.31 1.072-2.471 1.4l-.135.278V7.355c0-.347-.199-.562-.52-.562-.32 0-.519.215-.519.562v5.661h1.039v-.015c0-1.249.72-2.592 2.304-2.592 1.29 0 2.001.828 2.001 2.332v.275h1.04v-.246c0-2.044-.973-3.17-2.739-3.17zM0 16.558c0 .347.199.563.52.563.32 0 .519-.216.519-.563v-2.774H0zm5.344 0c0 .347.2.563.52.563s.52-.216.52-.563v-2.774h-1.04z",
    },
    // Shelly brand logo (source: shelly.svg, 24x24). Referenced as `ru:shelly`.
    shelly: {
      path: "m12 0c-6.627 0-12 5.373-12 12a12 12 0 0 0 0.033 0.88c1.07-0.443 2.495-0.679 4.322-0.679h5.762c-0.167 0.61-0.548 1.087-1.142 1.436-0.532 0.308-1.14 0.463-1.823 0.463h-0.927c-0.89 0-1.663 0.154-2.32 0.463-0.859 0.403-1.286 1-1.286 1.789 0 0.893 0.59 1.594 1.774 2.1a7.423 7.423 0 0 0 2.927 0.581c1.318 0 2.416-0.29 3.297-0.867 1.024-0.664 1.535-1.616 1.535-2.857 0-0.854-0.325-2.08-0.976-3.676-0.65-1.597-0.975-2.837-0.975-3.723 0-2.79 2.305-4.233 6.916-4.324 0.641-0.01 1.337-5e-3 1.916-4e-3 0.593 0 1.144 0.05 1.66 0.147a12 12 0 0 0-8.693-3.729zm4.758 5.691c-1.206 0-1.809 0.502-1.809 1.506 0 0.514 0.356 1.665 1.067 3.451 0.71 1.787 1.064 3.186 1.064 4.198 0 2.166-1.202 3.791-3.607 4.875-1.794 0.797-3.892 1.197-6.297 1.197-1.268 0-2.442-0.114-3.543-0.316a12 12 0 0 0 8.367 3.398c6.627 0 12-5.373 12-12a12 12 0 0 0-0.781-4.256 3.404 3.404 0 0 1-0.832 0.77h-4.371l1.425-2.828a299.94 299.94 0 0 0-2.683 5e-3z",
    },
    // Ubiquiti UniFi brand logo (source: ubiquiti-unifi.svg, 512x512 — needs
    // the viewBox override). Referenced as `ru:ubiquiti-unifi`.
    "ubiquiti-unifi": {
      path: "M494.2 0h-31.8v31.8h31.8zM383.1 222.4v-63.6h63.5v63.5h63.5c1.1 58.9-3.4 110.2-33.3 161.6-86.6 152.4-300.5 172.9-414 39.2C36.3 392.4 17.2 355 8.3 315c-4.5-21.7-6.5-49.2-6.5-72.5V4h127l.2 242c.6 31.3 6.3 63.5 25 88 53.9 73 167.9 66.3 212.1-13.1 15.9-26.6 17.3-68.7 17-98.5m15.8-174.8h47.6v47.6H510v63.5h-63.5V95.3h-47.6z",
      viewBox: "0 0 512 512",
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
