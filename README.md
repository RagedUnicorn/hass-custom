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
[Vite](https://vite.dev/) into a single `hass-custom.js` bundle. Because HACS
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

## Icons

[docs/icons.md](docs/icons.md) covers referencing the icons in cards and on
entities, the full list of included icons, and how to make them available on
config pages outside dashboards (labels, areas, entity settings) via
`frontend: extra_module_url` — recommended if you use the icons anywhere but
a dashboard.

## Cards

[docs/cards.md](docs/cards.md) lists every card; each links to its own
documentation page with a full YAML example, every config option, and
behavior notes.

## Development

Project structure, build commands, the live-HA dev loop, and the release
process are documented in [DEVELOPMENT.md](DEVELOPMENT.md); the mock-hass
harness and Playwright test suite in [TEST.md](TEST.md).

## License

[MIT](LICENSE) © Michael Wiesendanger
