# `ru-lights-card`

A lights view card: summary header, global on/off chips, a two-column grid of
room tiles with a glowing on-state dot and a drag-to-dim brightness slider, an
optional scenes panel, and a tap-to-open drilldown with per-bulb dimmer bars
and toggles. The drilldown is a viewport-level overlay — a bottom sheet on
narrow screens, a centered dialog on wide ones (closes on scrim tap, ✕, or
Escape).

The [design mock](ru-lights-card.html) this card implements sits beside this
page (render it with `npm run dev` at
`http://localhost:5173/docs/ru-lights-card/ru-lights-card.html` — GitHub shows
only its source), and
[`examples/lights-dashboard.yaml`](../../examples/lights-dashboard.yaml) is a
ready-to-paste dashboard.

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
scenes: # optional — panel hidden when omitted
  - entity: scene.relax
    gradient: "linear-gradient(90deg,#ff9a4d,#ff5a3d)"
  - entity: scene.focus
    name: Focus                     # optional, defaults to friendly_name
    gradient: "linear-gradient(90deg,#dff3ff,#8fd0ff)"
```

## Options

| Option   | Type   | Default      | Description                                                    |
|----------|--------|--------------|----------------------------------------------------------------|
| `title`  | string | `Lights`     | Card title                                                     |
| `rooms`  | list   | **required** | Rooms, each with `name` and `lights`                           |
| `scenes` | list   | —            | Scene entities, each `entity` + optional `name` and `gradient` |
| `layout` | string | `full`       | `compact` for a one-panel summary (see below)                  |
| `navigation_path` | string | — | Compact layout: the header opens this path, e.g. `/home-dashboard/lights` |

### Compact layout

`layout: compact` turns the card into a summary for a dashboard's main view:
the header with the on-count, then one chip per room — amber with its average
brightness while lit, grey when off. Tapping a chip toggles the room. With a
`navigation_path`, tapping the header opens that path (typically the view
holding the full card). The [compact design mock](../common/compact-cards.html)
shows it.

```yaml
type: custom:ru-lights-card
layout: compact
navigation_path: /home-dashboard/lights
rooms: # same rooms as the full card
  - name: Kitchen
    lights:
      - entity: light.kitchen_1
```

## Behavior notes

- Given room (720px or more of its own width), the card splits in two: the
  room list on the left and the selected room's drilldown beside it as a
  pane, so nothing pops up. Tapping a room selects it; the first room is
  selected until then. From 1000px the room grid gets a third column. The
  [wide design mock](ru-lights-card-wide.html) shows this layout.
- Tapping a room's dot toggles the whole room; tapping the row opens the
  drilldown. Dragging a slider or dimmer bar follows your finger and sends a
  single `light.turn_on` with `brightness_pct` on release (dragging to zero
  sends `light.turn_off`).
- Room status shows on-count and average brightness (`2 of 3 on · 80%`).
- A room whose lights expose an `effect_list` (light strips, Hue bulbs) gets
  one effects panel in the drilldown: every effect any of them offers, once,
  plus a preview bar tinted from the first lit light's color. A chip sets the
  effect on every light in the room that offers it; it is highlighted while
  every lit light offering it runs it.
- Scenes activate via `scene.turn_on`. The highlight ring marks the most
  recently activated configured scene (from HA's scene activation timestamps),
  so it can outlive manual light changes — HA has no true "active scene" state.
- Non-dimmable lights get a toggle but no dimmer bar; unavailable lights render
  grayed out and are excluded from room and global actions.
- The card follows Home Assistant's light/dark mode automatically with a
  built-in palette for each; every color is exposed as a
  `--ru-lights-*` CSS custom property (see
  [`src/cards/ru-lights-card/styles.ts`](../src/cards/ru-lights-card/styles.ts))
  and can be overridden by a theme or card-mod.

Configuration is YAML-only for now — the card appears in the card picker with a
starter config, but has no visual editor.
