# `ru-doors-card`

Door contact sensors at a glance, colored by state **and** presence:

| Color  | Meaning                                  |
|--------|------------------------------------------|
| Green  | Closed                                   |
| Yellow | Open, and you're home                    |
| Red    | Open, and you're away                    |
| Grey   | The sensor is unavailable or unknown     |

Each door shows its name, its status and how long ago it last changed. Tap a
door to open its more-info dialog, history included.

```yaml
type: custom:ru-doors-card
title: Doors
presence_entity: person.me # required — decides yellow vs. red
doors:
  - entity: binary_sensor.workshop_door
  - entity: binary_sensor.workshop_safe_door
    name: Safe
    icon: mdi:safe
```

## Options

| Option            | Type   | Default      | Description                                                  |
|-------------------|--------|--------------|--------------------------------------------------------------|
| `title`           | string | `Doors`      | Card title                                                   |
| `presence_entity` | string | **required** | `person.*` or `device_tracker.*` deciding whether you're home |
| `doors`           | list   | **required** | One entry per door, see below                                |

Each door:

| Option   | Type   | Default                            | Description                                 |
|----------|--------|------------------------------------|---------------------------------------------|
| `entity` | string | **required**                       | `binary_sensor.*` contact sensor (on = open) |
| `name`   | string | friendly name                      | Name shown on the card                      |
| `icon`   | string | `mdi:door-closed` / `mdi:door-open` | Icon; the default follows the door's state  |

## Behavior

- **Home means exactly `home`.** Any other presence state counts as away: a
  zone name such as `Work`, `not_home`, and also `unknown` or a missing
  presence entity. When the card can't tell where you are, an open door shows
  red rather than yellow.
- Presence only matters for open doors — a closed door is green either way.
- The header summarises the doors: `1 open` / `2 open` (yellow or red to
  match), `All closed`, or how many are unavailable.
- The card only displays. Getting a notification when a door opens while
  you're away is an automation's job, so it works with no dashboard open.
- Two doors sit side by side once the card is wide enough (about 520px);
  narrower, they stack.

## Theming

Every color is a CSS custom property, with a light and a dark default:

| Property                                        | Used for                 |
|-------------------------------------------------|--------------------------|
| `--ru-doors-closed` / `--ru-doors-closed-bg`     | Closed: text / icon tint |
| `--ru-doors-open-home` / `--ru-doors-open-home-bg` | Open while home          |
| `--ru-doors-open-away` / `--ru-doors-open-away-bg` | Open while away          |
| `--ru-doors-unknown` / `--ru-doors-unknown-bg`   | Unavailable              |
| `--ru-doors-bg`, `--ru-doors-panel-bg`           | Card and door backgrounds |
| `--ru-doors-text`, `--ru-doors-text-muted`       | Names, since texts       |
