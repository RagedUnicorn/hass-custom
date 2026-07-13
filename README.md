# hass-custom

Custom **frontend** resources for [Home Assistant](https://www.home-assistant.io/),
distributed through [HACS](https://hacs.xyz/) as a **Plugin (Dashboard)** repository.

It ships two things in a single bundle:

- **Custom icon sets** — icons Home Assistant does not include in its bundled
  [Material Design Icons](https://pictogrammers.com/library/mdi/), for example
  brand logos such as **Matter**, **Zigbee** and **Philips Hue**.
- **Custom Lovelace cards** — `ru-shutters-card`, a room-grouped shutter
  control card, and `ru-lights-card`, a room-grouped light control card with
  scenes.

Everything ships under the `ru` namespace (**R**aged**U**nicorn): icon sets as
`ru:*`, card elements as `ru-*`. All Lovelace cards share one global custom
element registry across every installed plugin, so the prefix keeps generic
names like `shutters-card` from colliding with someone else's card.

<p>
  <img src="assets/matter.svg" alt="ru:matter icon" width="64" height="64">
  &nbsp;&nbsp;
  <img src="assets/zigbee.svg" alt="ru:zigbee icon" width="64" height="64">
  &nbsp;&nbsp;
  <img src="assets/philips-hue.svg" alt="ru:philips-hue icon" width="64" height="64">
  &nbsp;&nbsp;
  <img src="assets/shelly.svg" alt="ru:shelly icon" width="64" height="64">
  &nbsp;&nbsp;
  <img src="assets/ubiquiti-unifi.svg" alt="ru:ubiquiti-unifi icon" width="64" height="64">
</p>

The source is TypeScript + [Lit](https://lit.dev/), built with
[Vite](https://vite.dev/) into a single `dist/hass-custom.js`. Because HACS
treats a repository as a single category, everything here is frontend
JavaScript — themes, integrations, templates and python_scripts are *separate*
HACS categories and need their own repositories.

## Install

### Via HACS (custom repository)

1. HACS → **⋮** → **Custom repositories**.
2. Repository: `ragedunicorn/hass-custom` (adjust to your GitHub path).
3. Category: **Dashboard**.
4. Install, then reload the frontend (Ctrl/Cmd + Shift + R).

HACS downloads the `hass-custom.js` release asset and adds it as a Lovelace
resource automatically.

### Manual

1. Download `hass-custom.js` from the latest
   [release](../../releases) (or build it yourself, see
   [DEVELOPMENT.md](DEVELOPMENT.md)) and copy it to `config/www/hass-custom.js`.
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

To load the bundle on **every** frontend page, register it as a global
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

## Icons

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

### Included icons

| Icon                | Source              | Notes                                      |
| ------------------- | ------------------- | ------------------------------------------ |
| `ru:matter`         | Matter logo         | rendered monochrome (theme `currentColor`) |
| `ru:zigbee`         | Zigbee logo         | official Zigbee brand mark                 |
| `ru:philips-hue`    | Philips Hue logo    | official Philips Hue wordmark              |
| `ru:shelly`         | Shelly logo         | official Shelly brand mark                 |
| `ru:ubiquiti-unifi` | Ubiquiti UniFi logo | official UniFi brand mark                  |

### Adding an icon

See [DEVELOPMENT.md](DEVELOPMENT.md#adding-an-icon).

## Cards

### `ru-shutters-card`

A shutters view card: summary header, global up/down/stop chips, a
two-column grid of room tiles
with status and controls, position presets, and a tap-to-open drilldown with
drag-to-position shutter targets per cover. The drilldown is a viewport-level
overlay — a bottom sheet on narrow screens, a centered dialog on wide ones
(closes on scrim tap, ✕, or Escape).

```yaml
type: custom:ru-shutters-card
title: Shutters
rooms:
  - name: Bedroom
    covers:
      - entity: cover.shelly_2pm_shutter_bedroom_medium
        name: Window
  - name: Office
    icon: mdi:desk            # optional, defaults to mdi:window-shutter
    covers:
      - entity: cover.shelly_2pm_shutter_office_big_left
        name: Big left
      - entity: cover.shelly_2pm_shutter_office_big_right
        name: Big right
```

| Option         | Type   | Default      | Description                                            |
| -------------- | ------ | ------------ | ------------------------------------------------------ |
| `title`        | string | `Shutters`   | Card title                                             |
| `rooms`        | list   | **required** | Rooms, each with `name`, optional `icon`, and `covers` |
| `show_percent` | bool   | `false`      | Append the numeric position to status words            |
| `presets`      | list   | 4 built-ins  | Position presets, each `name` + `icon` + `position`    |

The default presets are Morning (100), Half (50), Privacy (20) and Night (0).
Override the whole list to change them:

```yaml
presets:
  - name: Morning
    icon: mdi:weather-sunny
    position: 100
  - name: Movie
    icon: mdi:movie-open
    position: 10
```

Behavior notes:

- Positions read as words (Open / Closed / Partly open / Opening… / Closing…);
  numbers only appear with `show_percent: true`.
- Dragging a shutter target in the drilldown follows your finger and sends a
  single `cover.set_cover_position` on release.
- A preset highlights when every position-reporting cover sits within ±2% of
  its position.
- Unavailable covers render grayed out and are excluded from room actions;
  covers without position support get up/stop/down buttons but no drag target.
- The card follows Home Assistant's light/dark mode automatically with a
  built-in palette for each; every color is exposed as a
  `--ru-shutters-*` CSS custom property (see
  [`src/cards/ru-shutters-card/styles.ts`](src/cards/ru-shutters-card/styles.ts))
  and can be overridden by a theme or card-mod.

Configuration is YAML-only for now — the card appears in the card picker with a
starter config, but has no visual editor.

### `ru-lights-card`

A lights view card: summary header, global on/off chips, a two-column grid of
room tiles with a glowing on-state dot and a drag-to-dim brightness slider, an
optional scenes panel, and a tap-to-open drilldown with per-bulb dimmer bars
and toggles. The drilldown is a viewport-level overlay — a bottom sheet on
narrow screens, a centered dialog on wide ones (closes on scrim tap, ✕, or
Escape).

```yaml
type: custom:ru-lights-card
title: Lights
rooms:
  - name: Kitchen
    lights:
      - entity: light.hue_bulb_kitchen_1
        name: Bulb 1
      - entity: light.hue_bulb_kitchen_2
        name: Bulb 2
  - name: Living room
    lights:
      - entity: light.hue_lightstrip_livingroom
        name: Strip
scenes:                             # optional — panel hidden when omitted
  - entity: scene.relax
    gradient: "linear-gradient(90deg,#ff9a4d,#ff5a3d)"
  - entity: scene.focus
    name: Focus                     # optional, defaults to friendly_name
    gradient: "linear-gradient(90deg,#dff3ff,#8fd0ff)"
```

| Option   | Type   | Default      | Description                                                    |
| -------- | ------ | ------------ | -------------------------------------------------------------- |
| `title`  | string | `Lights`     | Card title                                                     |
| `rooms`  | list   | **required** | Rooms, each with `name` and `lights`                           |
| `scenes` | list   | —            | Scene entities, each `entity` + optional `name` and `gradient` |

Behavior notes:

- Tapping a room's dot toggles the whole room; tapping the row opens the
  drilldown. Dragging a slider or dimmer bar follows your finger and sends a
  single `light.turn_on` with `brightness_pct` on release (dragging to zero
  sends `light.turn_off`).
- Room status shows on-count and average brightness (`2 of 3 on · 80%`).
- Lights that expose an `effect_list` (light strips) get effect chips in the
  drilldown plus a preview bar tinted from the light's current color; the
  entity's active effect is highlighted.
- Scenes activate via `scene.turn_on`. The highlight ring marks the most
  recently activated configured scene (from HA's scene activation timestamps),
  so it can outlive manual light changes — HA has no true "active scene" state.
- Non-dimmable lights get a toggle but no dimmer bar; unavailable lights render
  grayed out and are excluded from room and global actions.
- The card follows Home Assistant's light/dark mode automatically with a
  built-in palette for each; every color is exposed as a
  `--ru-lights-*` CSS custom property (see
  [`src/cards/ru-lights-card/styles.ts`](src/cards/ru-lights-card/styles.ts))
  and can be overridden by a theme or card-mod.

Configuration is YAML-only for now — the card appears in the card picker with a
starter config, but has no visual editor.

## Development

Project structure, build commands, the live-HA dev loop, and the release
process are documented in [DEVELOPMENT.md](DEVELOPMENT.md).

## License

[MIT](LICENSE) © Michael Wiesendanger
