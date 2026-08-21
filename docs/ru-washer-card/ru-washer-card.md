# `ru-washer-card`

A Miele washing machine card: status, the running programme and its phase, a
live countdown with progress, Start / Pause / Stop, and one-tap programme
presets.

The Miele integration spreads one appliance across two dozen entities. This
card takes the status sensor as its anchor and treats everything else as
optional — each entity you leave out simply drops its row, so the card is
useful with `entity` alone and gains detail as you wire more in.

[`examples/washer-dashboard.yaml`](../../examples/washer-dashboard.yaml) is a
ready-to-paste dashboard for this card.

```yaml
type: custom:ru-washer-card
title: Laundry
entity: sensor.washing_machine # required — the enum status sensor
name: Washing machine
device_id: 1a2b3c… # required for presets (miele.set_program targets a device)
power_entity: switch.washing_machine_power
start_entity: button.washing_machine_start # enable it first, see below
pause_entity: button.washing_machine_pause
stop_entity: button.washing_machine_stop
program_entity: sensor.washing_machine_program
phase_entity: sensor.washing_machine_program_phase
remaining_entity: sensor.washing_machine_remaining_time
elapsed_entity: sensor.washing_machine_elapsed_time
finish_entity: sensor.washing_machine_finish
door_entity: binary_sensor.washing_machine_door
mobile_start_entity: binary_sensor.washing_machine_mobile_start
spin_speed_entity: sensor.washing_machine_spin_speed
temperature_entity: sensor.washing_machine_target_temperature
presets:
  - name: Underwear
    icon: mdi:tshirt-crew
    program_id: 4 # from miele.get_programs
    program: delicates # optional — highlights the chip while it runs
    spin: 600 # label only — not settable
    temperature: 30 # label only — not settable
```

## Options

| Option                | Type   | Default      | Description                                                       |
| --------------------- | ------ | ------------ | ----------------------------------------------------------------- |
| `title`               | string | `Laundry`    | Card title                                                        |
| `entity`              | string | **required** | The appliance's enum status `sensor.*`                            |
| `name`                | string | friendly name | Device name shown on the card                                    |
| `device_id`           | string | —            | Miele device id — required when `presets` are set                 |
| `power_entity`        | string | —            | `switch.*` → power toggle                                         |
| `start_entity`        | string | —            | `button.*` → Start control                                        |
| `pause_entity`        | string | —            | `button.*` → Pause control                                        |
| `stop_entity`         | string | —            | `button.*` → Stop control                                         |
| `program_entity`      | string | —            | `sensor.*` → programme name                                       |
| `phase_entity`        | string | —            | `sensor.*` → programme phase                                      |
| `remaining_entity`    | string | —            | `sensor.*` minutes → countdown fallback                           |
| `elapsed_entity`      | string | —            | `sensor.*` minutes → progress                                     |
| `finish_entity`       | string | —            | timestamp `sensor.*` → per-second countdown + "Finishes HH:MM"    |
| `door_entity`         | string | —            | `binary_sensor.*` → door indicator                                |
| `mobile_start_entity` | string | —            | `binary_sensor.*` → explains a refused remote start               |
| `spin_speed_entity`   | string | —            | `sensor.*` rpm → readout chip                                     |
| `temperature_entity`  | string | —            | `sensor.*` °C → readout chip                                      |
| `presets`             | list   | —            | Programme chips: `name` + `program_id`, optional `icon`/`program`/`spin`/`temperature` |

## Behavior notes

- **Start / Pause / Stop are disabled by the Miele integration.** The button
  entities exist but are created `disabled_by: integration`, so they will not
  appear until you enable them in Settings → Devices & services → Entities.
  Until then the control row is simply not rendered.
- **Remote start also needs Mobile Start armed on the machine itself.** Miele
  blocks it otherwise. Wire `mobile_start_entity` and the card explains why
  Start is greyed out instead of looking broken. An open door is called out the
  same way.
- **Spin speed and temperature cannot be set — only read.** The whole `miele`
  service domain is `set_program`, `set_program_oven` and `get_programs`, and
  only the oven one takes a temperature. A preset selects a *programme*; the
  machine then applies that programme's own spin and temperature. The `spin`
  and `temperature` keys on a preset are therefore labels, not settings.
- **There is no way to mute the machine.** The Miele cloud API exposes no
  acoustic settings, so no card can offer it.
- Preset `program_id`s are numeric and differ per model. Call
  `miele.get_programs` (Developer tools → Actions) with your machine **powered
  on** to list the ones it actually offers — typically far fewer than the
  programme sensor's enum, which covers every Miele model.
- Because `set_program` takes an id while the programme sensor reports a name,
  a preset can only highlight itself if you also give it `program` (the sensor's
  enum value). Omit it and the chip just never lights up.
- The countdown prefers `finish_entity`, an absolute timestamp, so it ticks
  every second; without it the card falls back to the whole-minute
  `remaining_entity`.
- The card follows Home Assistant's light/dark mode automatically with a
  built-in palette for each; every color is exposed as a `--ru-washer-*` CSS
  custom property (see
  [`src/cards/ru-washer-card/styles.ts`](../src/cards/ru-washer-card/styles.ts))
  and can be overridden by a theme or card-mod.

Configuration is YAML-only for now — the card appears in the card picker with a
starter config, but has no visual editor.
