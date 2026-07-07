# hass-custom

Custom **frontend** resources for [Home Assistant](https://www.home-assistant.io/),
distributed through [HACS](https://hacs.xyz/) as a **Plugin (Dashboard)** repository.

Right now it ships **custom icon sets** so you can use icons that Home Assistant
does not include in its bundled [Material Design Icons](https://pictogrammers.com/library/mdi/)
— for example brand logos such as **Matter**, **Zigbee** and **Philips Hue**.

<p>
  <img src="assets/matter.svg" alt="ru:matter icon" width="64" height="64">
  &nbsp;&nbsp;
  <img src="assets/zigbee.svg" alt="ru:zigbee icon" width="64" height="64">
  &nbsp;&nbsp;
  <img src="assets/philips-hue.svg" alt="ru:philips-hue icon" width="64" height="64">
</p>

Because HACS treats a repository as a single category, everything here is
frontend JavaScript. Additional frontend customizations (more icon sets, custom
Lovelace cards, small UI tweaks) can be added to the same
[`hass-custom.js`](hass-custom.js). Themes, integrations, templates and
python_scripts are *separate* HACS categories and need their own repositories.

## Install

### Via HACS (custom repository)

1. HACS → **⋮** → **Custom repositories**.
2. Repository: `ragedunicorn/hass-custom` (adjust to your GitHub path).
3. Category: **Dashboard**.
4. Install, then reload the frontend (Ctrl/Cmd + Shift + R).

HACS adds `hass-custom.js` as a Lovelace resource automatically.

### Manual

1. Copy `hass-custom.js` to `config/www/hass-custom.js`.
2. **Settings → Dashboards → ⋮ → Resources → Add resource**
   - URL: `/local/hass-custom.js`
   - Type: **JavaScript Module**
3. Reload the frontend.

### Make the icons available outside dashboards (recommended)

A Lovelace **resource** — which is what both installs above register — only loads
inside a **dashboard**. Config pages such as **Settings → Areas → Labels**,
**Areas**, or an entity's **Icon** field live outside Lovelace, so the `ru:` icon
set is often not registered there yet and `ru:matter` / `ru:zigbee` render
blank (they only resolve if you happened to open a dashboard first in the same
browser session).

To load the icons on **every** frontend page, register the file as a global
module in `configuration.yaml` instead of (or in addition to) the Lovelace
resource:

```yaml
frontend:
  extra_module_url:
    # HACS install — served from /hacsfiles/<repo>/<filename>
    - /hacsfiles/hass-custom/hass-custom.js
    # Manual install instead? use: /local/hass-custom.js
```

Restart Home Assistant and hard-refresh the browser (Ctrl/Cmd + Shift + R).
The custom icons now resolve in labels, areas, entity settings — everywhere
`<ha-icon>` is used.

## Usage

Reference an icon anywhere Home Assistant accepts one, as `<prefix>:<name>`:

```yaml
# In a card
type: entity
entity: sensor.hub
icon: ru:matter
```

Or set it as an entity's icon under **Settings → Devices & services → Entities →
(entity) → Settings → Icon** by typing `ru:zigbee`.

> Custom icons render everywhere `<ha-icon>` is used, but they do **not** appear
> in the icon-picker dropdown — you type the full `prefix:name` yourself.
>
> Setting the icon on a **label**, **area**, or **entity** happens on a config
> page *outside* Lovelace, so it only renders once the file is loaded globally —
> see [Make the icons available outside dashboards](#make-the-icons-available-outside-dashboards-recommended).

## Adding an icon

1. Get the SVG `d` (path data) of a 24×24 icon.
2. Add an entry under the relevant set in [`hass-custom.js`](hass-custom.js):

   ```js
   const ICON_SETS = {
     ru: {
       matter: { path: "…" },
       zigbee: { path: "…" },
       thread: { path: "…" }, // new icon → ru:thread
     },
   };
   ```
3. Bump `VERSION`, commit, and cut a new GitHub release so HACS offers the update.

## Included icons

| Icon             | Source           | Notes                                      |
| ---------------- | ---------------- | ------------------------------------------ |
| `ru:matter`      | Matter logo      | rendered monochrome (theme `currentColor`) |
| `ru:zigbee`      | Zigbee logo      | official Zigbee brand mark                 |
| `ru:philips-hue` | Philips Hue logo | official Philips Hue wordmark              |

## License

[MIT](LICENSE) © Michael Wiesendanger
