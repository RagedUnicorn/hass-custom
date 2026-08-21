# `ru-shutters-card`

A shutters view card: summary header, global up/down/stop chips, a
two-column grid of room tiles
with status and controls, position presets, and a tap-to-open drilldown with
drag-to-position shutter targets per cover. The drilldown is a viewport-level
overlay — a bottom sheet on narrow screens, a centered dialog on wide ones
(closes on scrim tap, ✕, or Escape).

The [design mock](ru-shutters-card.html) this card implements sits beside this
page (render it with `npm run dev` at
`http://localhost:5173/docs/ru-shutters-card/ru-shutters-card.html` — GitHub
shows only its source), and
[`examples/shutters-dashboard.yaml`](../../examples/shutters-dashboard.yaml)
is a ready-to-paste dashboard.

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

## Options

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

## Behavior notes

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
  [`src/cards/ru-shutters-card/styles.ts`](../src/cards/ru-shutters-card/styles.ts))
  and can be overridden by a theme or card-mod.

Configuration is YAML-only for now — the card appears in the card picker with a
starter config, but has no visual editor.
