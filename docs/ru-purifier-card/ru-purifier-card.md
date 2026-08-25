# `ru-purifier-card`

A single-device air purifier card: summary header, a control panel with a
spinning-ring icon (spin speed follows fan speed), power toggle, tap-to-set
speed ticks, Auto / Manual / Night mode chips and an oscillation toggle, plus
an optional air quality panel with PM2.5/PM10 bars rated Good / Fair / Poor.

The [design mock](ru-purifier-card.html) this card implements sits beside this
page (render it with `npm run dev` at
`http://localhost:5173/docs/ru-purifier-card/ru-purifier-card.html` — GitHub
shows only its source), and
[`examples/purifier-dashboard.yaml`](../../examples/purifier-dashboard.yaml)
is a ready-to-paste dashboard.

```yaml
type: custom:ru-purifier-card
title: Air
entity: fan.bedroom_dyson_purifier
name: Bedroom Purifier              # optional, defaults to friendly_name
night_mode_entity: switch.bedroom_dyson_purifier_night_mode  # optional
pm25_entity: sensor.bedroom_dyson_purifier_pm2_5             # optional
pm10_entity: sensor.bedroom_dyson_purifier_pm10              # optional
```

## Options

| Option              | Type   | Default       | Description                                         |
|---------------------|--------|---------------|-----------------------------------------------------|
| `title`             | string | `Air`         | Card title                                          |
| `entity`            | string | **required**  | The purifier's `fan.*` entity                       |
| `name`              | string | friendly name | Device name shown on the card                       |
| `night_mode_entity` | string | —             | `switch.*` for the device's night mode → Night chip |
| `pm25_entity`       | string | —             | PM2.5 `sensor.*` (µg/m³) → air quality panel        |
| `pm10_entity`       | string | —             | PM10 `sensor.*` (µg/m³) → air quality panel         |

## Behavior notes

- The speed ticks map onto the fan's `percentage` in `percentage_step` steps (capped at 10 ticks); tapping one sends `fan.set_percentage`, which switches
  the fan to manual. The speed section only renders for fans that report a
  percentage, the oscillation row only for fans that report `oscillating`.
- The Auto chip binds to the fan's auto-like preset (`fan.set_preset_mode`)
  and only renders when the fan has one; Night binds to `night_mode_entity`
  and only renders when configured. The card treats the modes as exclusive:
  picking Auto or Manual (or tapping a speed tick) also switches night mode
  off.
- The air quality rating uses the PM2.5 reading (Good ≤ 12, Fair ≤ 35,
  Poor above — µg/m³), falling back to PM10 (Good ≤ 20, Fair ≤ 50) when no
  PM2.5 sensor is configured. The panel is hidden when neither sensor is set.
- An unavailable fan renders grayed out with disabled controls. A PM sensor
  with no usable reading shows `—` with an empty bar — either because the
  sensor is `unavailable`/`unknown` (normal when the device stops publishing
  particulates), or because the configured entity id doesn't exist. The latter
  is a config error, so the card reports it once in the browser console naming
  the offending id; copy the exact id from Developer Tools → States.
- The card follows Home Assistant's light/dark mode automatically with a
  built-in palette for each; every color is exposed as a
  `--ru-purifier-*` CSS custom property (see
  [`src/cards/ru-purifier-card/styles.ts`](../src/cards/ru-purifier-card/styles.ts))
  and can be overridden by a theme or card-mod.

Configuration is YAML-only for now — the card appears in the card picker with a
starter config, but has no visual editor.
