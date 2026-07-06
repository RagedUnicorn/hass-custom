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
    // Zigbee2MQTT brand logo (source: zigbee2mqtt.svg, 24x24). Referenced as
    // `ru:zigbee`; rename the key to `zigbee2mqtt` if you prefer the exact name.
    zigbee: {
      path: "M7.044 0L.038 7.03v9.94L7.044 24h9.91l7.008-7.03V7.03L16.954 0Zm4.525 1.904c.02.001.04.011.047.03l.467.96a.8.8 0 0 1 .242 0l.467-.958a.05.05 0 0 1 .047-.032l.838-.031c.028 0 .053.02.054.049a.05.05 0 0 1-.05.053l-.805.03l-.28.968c.356.164.604.543.604.986c0 .155-.03.304-.086.437q.03.022.053.045s.098.144.184.338c1.641.462 5.698 1.05 5.238 2.32c-.517 1.428-3.34.991-3.813.604c-.64-.525-1.184-1.019-1.529-1.414a3 3 0 0 1-.064.148a5.3 5.3 0 0 1-1.97.034a2 2 0 0 1-.089-.184c-.343.4-.898.905-1.555 1.443c-.472.387-3.295.824-3.812-.603c-.467-1.288 3.709-1.873 5.305-2.338c.084-.204.181-.35.181-.35a.3.3 0 0 1 .05-.044a1.1 1.1 0 0 1-.085-.436c0-.443.249-.822.604-.986l-.278-.967l-.806-.031a.05.05 0 0 1-.051-.053a.05.05 0 0 1 .054-.049zm1.63 4.92c.082.173.168.385.243.623c-.743.207-1.766.164-2.472-.037c.068-.21.144-.398.218-.556a5.7 5.7 0 0 0 2.01-.03zm-2.321.908c.768.219 1.84.265 2.668.038c.047.203.082.418.098.636c-.82.3-2.113.237-2.872-.04c.018-.218.057-.432.106-.634m-.106 1.057c.812.26 2.023.314 2.887.043a2.5 2.5 0 0 1-.12.686c-.676.236-1.88.218-2.66-.053q-.098-.332-.107-.676m.264 1.139c.727.182 1.613.193 2.266.05a2.1 2.1 0 0 1-.676.67a.75.75 0 0 1-.887 0c-.549-.347-.703-.751-.703-.72m2.858 2.136c.14-.002.162.077.164.16l.064 3.712c.002.089-.024.161-.158.164l-.65.011c-.121.002-.163-.058-.165-.158l-.064-3.713c-.002-.12.059-.162.158-.164zm-2.565.045c.14-.002.163.077.164.16l.067 3.711c.002.115-.052.163-.16.165l-.649.011c-.128.002-.164-.064-.166-.158l-.064-3.713c-.002-.114.05-.162.16-.164zm.633 6.057c.133.033.471.124.582.432a1 1 0 0 1 .055.34v1.35q0 .153-.037.284c-.095.342-.425.47-.768.516v.223c0 .1-.045.146-.147.146h-.625c-.126 0-.146-.068-.146-.146v-.223q-.471-.07-.637-.283a.82.82 0 0 1-.164-.518v-1.35a1 1 0 0 1 .055-.34c.11-.307.45-.398.584-.431q.247-.061.625-.062c.378-.001.459.021.623.062m-4.492 0c.068 0 .129.017.187.121l.365.662c.036.063.053.07.075.07h.035c.022 0 .039-.006.074-.07l.361-.662c.05-.089.098-.121.188-.121h.658c.078 0 .147.02.147.146v2.633c0 .101-.046.147-.147.147h-.627c-.101 0-.146-.046-.146-.147v-1.431l-.239.443a.22.22 0 0 1-.216.13h-.163a.22.22 0 0 1-.214-.13l-.24-.443v1.431c0 .101-.046.147-.147.147h-.606c-.1 0-.146-.046-.146-.147v-2.633c0-.126.068-.146.146-.146zm7.75 0c.078 0 .146.02.146.146v.49c0 .127-.068.147-.146.147h-.598v1.996c0 .078-.02.147-.146.147h-.659c-.1 0-.146-.046-.146-.147V18.95h-.598c-.102 0-.144-.038-.144-.146v-.49c0-.109.043-.147.144-.147h2.147zm2.666 0c.078 0 .146.02.146.146v.49c0 .127-.068.147-.146.147h-.598v1.996c0 .078-.02.147-.146.147h-.659c-.1 0-.146-.046-.146-.147V18.95h-.598c-.102 0-.144-.038-.144-.146v-.49c0-.109.043-.147.144-.147h2.147zm-6.828.79a.17.17 0 0 0-.06.132v1.11q0 .08.06.136c.083.075.479.075.562 0a.18.18 0 0 0 .06-.137v-1.11a.17.17 0 0 0-.06-.132c-.083-.075-.48-.075-.562 0z",
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
