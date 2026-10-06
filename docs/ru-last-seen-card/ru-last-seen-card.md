# `ru-last-seen-card`

Device health at a glance: each row shows when a device last reported and
turns yellow, then red, the longer it stays silent.

| Color  | Meaning                                         |
|--------|-------------------------------------------------|
| Green  | Seen within `warn_after_hours` (default 2 h)    |
| Yellow | Not seen for `warn_after_hours` or longer       |
| Red    | Not seen for `alert_after_hours` (default 24 h) or longer |
| Grey   | No usable timestamp (missing or unavailable)    |

Battery-powered Zigbee devices tend to die silently: their state entities
keep showing the last value forever, so a door sensor that dropped off the
network still reads "closed". The age of the last real message is the honest
health signal, and this card makes it visible.

```yaml
type: custom:ru-last-seen-card
title: Zigbee sensors
warn_after_hours: 2 # optional
alert_after_hours: 24 # optional
entities:
  - entity: sensor.front_door_last_seen
    name: Front Door
  - entity: sensor.back_door_last_seen
```

## Options

| Option              | Type   | Default      | Description                                      |
|---------------------|--------|--------------|--------------------------------------------------|
| `title`             | string | `Last seen`  | Card title                                       |
| `warn_after_hours`  | number | `2`          | Hours of silence before a row turns yellow       |
| `alert_after_hours` | number | `24`         | Hours of silence before a row turns red          |
| `entities`          | list   | **required** | One entry per device, see below                  |

Each entry:

| Option   | Type   | Default       | Description                                            |
|----------|--------|---------------|--------------------------------------------------------|
| `entity` | string | **required**  | Timestamp `sensor.*` whose state is an ISO time        |
| `name`   | string | friendly name | Name shown on the card                                 |

`warn_after_hours` must be lower than `alert_after_hours`.

## Zigbee2MQTT setup

Zigbee2MQTT only exposes a last-seen time once it is switched on:
**Settings → Advanced → Last seen → `ISO_8601`** (the `advanced.last_seen`
option). Every device then gets a `sensor.<device>_last_seen` entity, which
Home Assistant creates **disabled** — enable the ones you want on the card.

Use this rather than an entity's "last changed" or "last reported" time:
Zigbee2MQTT republishes every device's cached state when it restarts, which
refreshes those times even for a device that has been dead for days. The
`last_seen` value Zigbee2MQTT stores is the time of the last real radio
message and survives restarts.

## Behavior

- The ages keep counting between Home Assistant updates — the card
  re-renders every minute, so a silent device turns yellow and red on its own.
- Hover a row for the exact last-seen time; tap it for the more-info dialog.
- The header counts the rows that aren't green, colored by the worst one.
- Two rows sit side by side once the card is wide enough (about 520px).

## Theming

| Property                                             | Used for          |
|------------------------------------------------------|-------------------|
| `--ru-last-seen-fresh` / `--ru-last-seen-fresh-bg`     | Green rows        |
| `--ru-last-seen-stale` / `--ru-last-seen-stale-bg`     | Yellow rows       |
| `--ru-last-seen-dead` / `--ru-last-seen-dead-bg`       | Red rows          |
| `--ru-last-seen-unknown` / `--ru-last-seen-unknown-bg` | Grey rows         |
| `--ru-last-seen-bg`, `--ru-last-seen-panel-bg`         | Backgrounds       |
| `--ru-last-seen-text`, `--ru-last-seen-text-muted`     | Text              |
