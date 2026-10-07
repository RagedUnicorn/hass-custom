# `ru-shutters-card`

A shutters view card: summary header, global up/down/stop chips, a
two-column grid of room tiles
with status and controls, position presets, and a tap-to-open drilldown with
drag-to-position shutter targets per cover. The drilldown is a viewport-level
overlay — a bottom sheet on narrow screens, a centered dialog on wide ones (closes on scrim tap, ✕, or Escape).

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
|----------------|--------|--------------|--------------------------------------------------------|
| `title`        | string | `Shutters`   | Card title                                             |
| `rooms`        | list   | **required** | Rooms, each with `name`, optional `icon`, and `covers` |
| `show_percent` | bool   | `false`      | Append the numeric position to status words            |
| `presets`      | list   | 4 built-ins  | Position presets, each `name` + `icon` + `position`    |
| `layout`       | string | `full`       | `compact` for a one-panel summary (see below)          |
| `navigation_path` | string | —         | Compact layout: the header opens this path, e.g. `/home-dashboard/climate` |

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

### Compact layout

`layout: compact` turns the card into a summary for a dashboard's main view:
the header with the open-count, then a small window per room at the average
position of its covers (`Open`, `Closed`, or the percentage). Tapping a window
opens that room's drilldown — always as an overlay, since the compact card
has no side pane. With a `navigation_path`, tapping the header opens that
path. The [compact design mock](../common/compact-cards.html) shows it.

```yaml
type: custom:ru-shutters-card
layout: compact
navigation_path: /home-dashboard/climate
rooms: # same rooms as the full card
  - name: Bedroom
    covers:
      - entity: cover.bedroom
```

## Behavior notes

- Given room (720px or more of its own width), the card splits in two: the
  room list on the left and the selected room's drilldown beside it as a
  pane, so nothing pops up. Tapping a room selects it; the first room is
  selected until then. From 1000px the room grid gets a third column. The
  [wide design mock](ru-shutters-card-wide.html) shows this layout.
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
