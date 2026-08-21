# hass-custom

Custom **frontend** resources for [Home Assistant](https://www.home-assistant.io/),
distributed through [HACS](https://hacs.xyz/) as a **Plugin (Dashboard)** repository.

It ships two things in a single bundle:

- **Custom icon sets** — icons Home Assistant does not include in its bundled
  [Material Design Icons](https://pictogrammers.com/library/mdi/), for example
  brand logos such as **Matter**, **Zigbee** and **Philips Hue**.
- **Custom Lovelace cards** — `ru-shutters-card`, a room-grouped shutter
  control card, `ru-lights-card`, a room-grouped light control card with
  scenes, `ru-purifier-card`, an air purifier control card with air
  quality readout, `ru-tv-card`, an Android TV media + remote card, and
  `ru-washer-card`, a Miele washing machine card.

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
  &nbsp;&nbsp;
  <img src="assets/youtube.svg" alt="ru:youtube icon" width="64" height="64">
  &nbsp;&nbsp;
  <img src="assets/spotify.svg" alt="ru:spotify icon" width="64" height="64">
  &nbsp;&nbsp;
  <img src="assets/plex.svg" alt="ru:plex icon" width="64" height="64">
  &nbsp;&nbsp;
  <img src="assets/twitch.svg" alt="ru:twitch icon" width="64" height="64">
  &nbsp;&nbsp;
  <img src="assets/playstation5.svg" alt="ru:playstation5 icon" width="64" height="64">
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
| `ru:youtube`        | YouTube logo        | play-button mark, tinted via `color`       |
| `ru:spotify`        | Spotify logo        | official Spotify brand mark                |
| `ru:plex`           | Plex logo           | chevron mark (background dropped)          |
| `ru:twitch`         | Twitch logo         | official Twitch brand mark                 |
| `ru:playstation5`   | PlayStation 5 logo  | PS5 wordmark                               |

### Adding an icon

See [DEVELOPMENT.md](DEVELOPMENT.md#adding-an-icon).

## Cards

Each card has its own documentation page with a full YAML example, every
config option, and behavior notes:

| Card                                            | What it is                                                                        |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| [`ru-shutters-card`](docs/ru-shutters-card.md)  | Room-grouped shutter control: global chips, position presets, drag-to-position drilldown |
| [`ru-lights-card`](docs/ru-lights-card.md)      | Room-grouped light control: dimming sliders, scenes panel, per-bulb drilldown     |
| [`ru-purifier-card`](docs/ru-purifier-card.md)  | Air purifier control with speed ticks, mode chips and a PM2.5/PM10 air quality panel |
| [`ru-tv-card`](docs/ru-tv-card.md)              | Android TV media + remote: now-playing, volume, app launcher, ring d-pad, keyboard |
| [`ru-washer-card`](docs/ru-washer-card.md)      | Miele washing machine: programme, live countdown, Start/Pause/Stop, programme presets |

Common to all cards:

- Configuration is YAML-only for now — cards appear in the card picker with a
  starter config, but have no visual editor.
- Every card follows Home Assistant's light/dark mode automatically, and every
  color is exposed as a `--ru-<card>-*` CSS custom property overridable by a
  theme or card-mod.
- Cards adapt to the width they are given (container queries), not to the
  browser window.

## Development

Project structure, build commands, the live-HA dev loop, and the release
process are documented in [DEVELOPMENT.md](DEVELOPMENT.md); the mock-hass
harness and Playwright test suite in [TEST.md](TEST.md).

## License

[MIT](LICENSE) © Michael Wiesendanger
