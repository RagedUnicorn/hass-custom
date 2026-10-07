# `ru-actions-card`

Big one-tap tiles for whole-home actions on a dashboard's main view — "Shutters
down", "All lights off". Each tile shows a tinted icon, the action's name and a
live status line about what it targets (`All 7 closed`, `3 of 7 open`,
`4 lights on`). A tap performs the action; the tile pulses until Home Assistant
answers.

Tiles flow as many per row as fit at about 104px each: three on a phone, more
when the card is wide. The [design mock](ru-actions-card.html) sits beside this
page.

```yaml
type: custom:ru-actions-card
title: Quick actions
actions:
  - name: Shutters down
    icon: mdi:window-shutter
    action: cover.close_cover
    target:
      label_id: t_shutter
  - name: All lights off
    icon: mdi:lightbulb-group-off-outline
    tone: amber
    action: light.turn_off
    target:
      entity_id: all
```

## Options

| Option    | Type   | Default      | Description                        |
|-----------|--------|--------------|------------------------------------|
| `title`   | string | —            | Card title; no header when omitted |
| `actions` | list   | **required** | One entry per tile, see below      |

Each action:

| Option     | Type   | Default      | Description                                                               |
|------------|--------|--------------|---------------------------------------------------------------------------|
| `name`     | string | **required** | Tile label                                                                |
| `icon`     | string | **required** | Icon, e.g. `mdi:window-shutter`                                           |
| `action`   | string | **required** | Action to perform, `domain.service` — e.g. `cover.close_cover`            |
| `target`   | map    | —            | `entity_id`, `label_id` and/or `area_id`, as in an automation's `target:` |
| `data`     | map    | —            | Extra action data, e.g. `brightness_pct: 30`                              |
| `tone`     | string | `accent`     | Tile tint: `accent` (blue), `amber`, `green` or `red`                     |
| `subtitle` | string | derived      | Fixed status line instead of the derived one                              |

## Behavior

- The status line comes from the action's domain and target. Covers count the
  open ones (`All 7 closed`, `3 of 7 open`, `All 7 open`); lights count the lit
  ones (`4 lights on`, `All off`). Other domains show no status unless a
  `subtitle` is set. Unavailable entities are left out of the count, and so
  are groups (light/cover group helpers, Hue rooms) — their members are
  counted already. The action itself still targets them.
- Targets resolve the way Home Assistant does: `entity_id: all` is every entity
  of the action's domain; a `label_id` matches entities carrying the label and
  entities whose device carries it; an `area_id` matches entities in the area
  and entities without an area of their own whose device is in it.
- A tile ignores taps while its action is still running.
- The accent tone keeps the status line grey; the other tones tint it too.

## Theming

Every color is a CSS custom property, with a light and a dark default:

| Property                                                  | Used for          |
|-----------------------------------------------------------|-------------------|
| `--ru-actions-accent` / `--ru-actions-accent-bg`          | Default tone      |
| `--ru-actions-amber` / `--ru-actions-amber-bg`            | `tone: amber`     |
| `--ru-actions-green` / `--ru-actions-green-bg`            | `tone: green`     |
| `--ru-actions-red` / `--ru-actions-red-bg`                | `tone: red`       |
| `--ru-actions-bg`, `--ru-actions-panel-bg`                | Card and tiles    |
| `--ru-actions-text`, `--ru-actions-text-muted`            | Names, status     |
