# hass-custom

Custom **frontend** resources for [Home Assistant](https://www.home-assistant.io/),
distributed through [HACS](https://hacs.xyz/) as a **Plugin (Dashboard)** repository.

Right now it ships **custom icon sets** so you can use icons that Home Assistant
does not include in its bundled [Material Design Icons](https://pictogrammers.com/library/mdi/)
— for example brand logos such as **Matter** and **Zigbee**.

<p>
  <img src="assets/matter.svg" alt="ru:matter icon" width="64" height="64">
  &nbsp;&nbsp;
  <img src="assets/zigbee2mqtt.svg" alt="ru:zigbee2mqtt icon" width="64" height="64">
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

## Usage

Reference an icon anywhere Home Assistant accepts one, as `<prefix>:<name>`:

```yaml
# In a card
type: entity
entity: sensor.hub
icon: ru:matter
```

Or set it as an entity's icon under **Settings → Devices & services → Entities →
(entity) → Settings → Icon** by typing `ru:zigbee2mqtt`.

> Custom icons render everywhere `<ha-icon>` is used, but they do **not** appear
> in the icon-picker dropdown — you type the full `prefix:name` yourself.

## Adding an icon

1. Get the SVG `d` (path data) of a 24×24 icon.
2. Add an entry under the relevant set in [`hass-custom.js`](hass-custom.js):

   ```js
   const ICON_SETS = {
     ru: {
       matter: { path: "…" },
       zigbee2mqtt: { path: "…" },
       thread: { path: "…" }, // new icon → ru:thread
     },
   };
   ```
3. Bump `VERSION`, commit, and cut a new GitHub release so HACS offers the update.

## Included icons

| Icon             | Source           | Notes                                      |
| ---------------- | ---------------- | ------------------------------------------ |
| `ru:matter`      | Matter logo      | rendered monochrome (theme `currentColor`) |
| `ru:zigbee2mqtt` | Zigbee2MQTT logo | brand mark of the zigbee2mqtt project      |

## License

[MIT](LICENSE) © Michael Wiesendanger
