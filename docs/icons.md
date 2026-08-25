# Using the icons

Reference an icon anywhere Home Assistant accepts one, as `<prefix>:<name>`:

```yaml
# In a card
type: entity
entity: sensor.hub
icon: ru:matter
```

Or set it as an entity's icon under **Settings → Devices & services → Entities → (entity) → Settings → Icon** by typing `ru:zigbee`.

> Custom icons render everywhere `<ha-icon>` is used, but they do **not** appear
> in the icon-picker dropdown — you type the full `prefix:name` yourself.
>
> Setting the icon on a **label**, **area**, or **entity** happens on a config
> page *outside* Lovelace, so it only renders once the file is loaded globally —
> see [Make the icons available outside dashboards](#make-the-icons-available-outside-dashboards-recommended).

## Make the icons available outside dashboards (recommended)

A Lovelace **resource** — which is what both installs in the
[README](../README.md#install) register — only loads inside a **dashboard**.
Config pages such as **Settings → Areas → Labels**, **Areas**, or an entity's **Icon** field live outside Lovelace, so the `ru:` icon set is often not
registered there yet and `ru:matter` / `ru:zigbee` render blank (they only
resolve if you happened to open a dashboard first in the same browser session).

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

## Included icons

| Icon                | Source              | Notes                                      |
|---------------------|---------------------|--------------------------------------------|
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

## Adding an icon

See [DEVELOPMENT.md](../DEVELOPMENT.md#adding-an-icon).
