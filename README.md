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
  quality readout, and `ru-tv-card`, an Android TV media + remote card.

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
</p>

The source is TypeScript + [Lit](https://lit.dev/), built with
[Vite](https://vite.dev/) into a single `dist/hass-custom.js`. Because HACS
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

### Make the icons available outside dashboards (recommended)

A Lovelace **resource** — which is what both installs above register — only loads
inside a **dashboard**. Config pages such as **Settings → Areas → Labels**,
**Areas**, or an entity's **Icon** field live outside Lovelace, so the `ru:` icon
set is often not registered there yet and `ru:matter` / `ru:zigbee` render
blank (they only resolve if you happened to open a dashboard first in the same
browser session).

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

## Icons

Reference an icon anywhere Home Assistant accepts one, as `<prefix>:<name>`:

```yaml
# In a card
type: entity
entity: sensor.hub
icon: ru:matter
```

Or set it as an entity's icon under **Settings → Devices & services → Entities →
(entity) → Settings → Icon** by typing `ru:zigbee`.

> Custom icons render everywhere `<ha-icon>` is used, but they do **not** appear
> in the icon-picker dropdown — you type the full `prefix:name` yourself.
>
> Setting the icon on a **label**, **area**, or **entity** happens on a config
> page *outside* Lovelace, so it only renders once the file is loaded globally —
> see [Make the icons available outside dashboards](#make-the-icons-available-outside-dashboards-recommended).

### Included icons

| Icon                | Source              | Notes                                      |
| ------------------- | ------------------- | ------------------------------------------ |
| `ru:matter`         | Matter logo         | rendered monochrome (theme `currentColor`) |
| `ru:zigbee`         | Zigbee logo         | official Zigbee brand mark                 |
| `ru:philips-hue`    | Philips Hue logo    | official Philips Hue wordmark              |
| `ru:shelly`         | Shelly logo         | official Shelly brand mark                 |
| `ru:ubiquiti-unifi` | Ubiquiti UniFi logo | official UniFi brand mark                  |

### Adding an icon

See [DEVELOPMENT.md](DEVELOPMENT.md#adding-an-icon).

## Cards

### `ru-shutters-card`

A shutters view card: summary header, global up/down/stop chips, a
two-column grid of room tiles
with status and controls, position presets, and a tap-to-open drilldown with
drag-to-position shutter targets per cover. The drilldown is a viewport-level
overlay — a bottom sheet on narrow screens, a centered dialog on wide ones
(closes on scrim tap, ✕, or Escape).

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

Behavior notes:

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
  [`src/cards/ru-shutters-card/styles.ts`](src/cards/ru-shutters-card/styles.ts))
  and can be overridden by a theme or card-mod.

Configuration is YAML-only for now — the card appears in the card picker with a
starter config, but has no visual editor.

### `ru-lights-card`

A lights view card: summary header, global on/off chips, a two-column grid of
room tiles with a glowing on-state dot and a drag-to-dim brightness slider, an
optional scenes panel, and a tap-to-open drilldown with per-bulb dimmer bars
and toggles. The drilldown is a viewport-level overlay — a bottom sheet on
narrow screens, a centered dialog on wide ones (closes on scrim tap, ✕, or
Escape).

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
scenes:                             # optional — panel hidden when omitted
  - entity: scene.relax
    gradient: "linear-gradient(90deg,#ff9a4d,#ff5a3d)"
  - entity: scene.focus
    name: Focus                     # optional, defaults to friendly_name
    gradient: "linear-gradient(90deg,#dff3ff,#8fd0ff)"
```

| Option   | Type   | Default      | Description                                                    |
| -------- | ------ | ------------ | -------------------------------------------------------------- |
| `title`  | string | `Lights`     | Card title                                                     |
| `rooms`  | list   | **required** | Rooms, each with `name` and `lights`                           |
| `scenes` | list   | —            | Scene entities, each `entity` + optional `name` and `gradient` |

Behavior notes:

- Tapping a room's dot toggles the whole room; tapping the row opens the
  drilldown. Dragging a slider or dimmer bar follows your finger and sends a
  single `light.turn_on` with `brightness_pct` on release (dragging to zero
  sends `light.turn_off`).
- Room status shows on-count and average brightness (`2 of 3 on · 80%`).
- Lights that expose an `effect_list` (light strips) get effect chips in the
  drilldown plus a preview bar tinted from the light's current color; the
  entity's active effect is highlighted.
- Scenes activate via `scene.turn_on`. The highlight ring marks the most
  recently activated configured scene (from HA's scene activation timestamps),
  so it can outlive manual light changes — HA has no true "active scene" state.
- Non-dimmable lights get a toggle but no dimmer bar; unavailable lights render
  grayed out and are excluded from room and global actions.
- The card follows Home Assistant's light/dark mode automatically with a
  built-in palette for each; every color is exposed as a
  `--ru-lights-*` CSS custom property (see
  [`src/cards/ru-lights-card/styles.ts`](src/cards/ru-lights-card/styles.ts))
  and can be overridden by a theme or card-mod.

Configuration is YAML-only for now — the card appears in the card picker with a
starter config, but has no visual editor.

### `ru-purifier-card`

A single-device air purifier card: summary header, a control panel with a
spinning-ring icon (spin speed follows fan speed), power toggle, tap-to-set
speed ticks, Auto / Manual / Night mode chips and an oscillation toggle, plus
an optional air quality panel with PM2.5/PM10 bars rated Good / Fair / Poor.

```yaml
type: custom:ru-purifier-card
title: Air
entity: fan.bedroom_dyson_purifier
name: Bedroom Purifier              # optional, defaults to friendly_name
night_mode_entity: switch.bedroom_dyson_purifier_night_mode  # optional
pm25_entity: sensor.bedroom_dyson_purifier_pm2_5             # optional
pm10_entity: sensor.bedroom_dyson_purifier_pm10              # optional
```

| Option              | Type   | Default        | Description                                            |
| ------------------- | ------ | -------------- | ------------------------------------------------------ |
| `title`             | string | `Air`          | Card title                                             |
| `entity`            | string | **required**   | The purifier's `fan.*` entity                          |
| `name`              | string | friendly name  | Device name shown on the card                          |
| `night_mode_entity` | string | —              | `switch.*` for the device's night mode → Night chip    |
| `pm25_entity`       | string | —              | PM2.5 `sensor.*` (µg/m³) → air quality panel           |
| `pm10_entity`       | string | —              | PM10 `sensor.*` (µg/m³) → air quality panel            |

Behavior notes:

- The speed ticks map onto the fan's `percentage` in `percentage_step` steps
  (capped at 10 ticks); tapping one sends `fan.set_percentage`, which switches
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
  [`src/cards/ru-purifier-card/styles.ts`](src/cards/ru-purifier-card/styles.ts))
  and can be overridden by a theme or card-mod.

Configuration is YAML-only for now — the card appears in the card picker with a
starter config, but has no visual editor.

### `ru-tv-card`

An Android TV card: a media panel with power toggle, now-playing title, a
drag-to-seek progress bar with skip back/forward buttons, transport buttons,
a volume slider (or +/− steppers) and app launcher chips, plus an optional
remote panel — a ring d-pad (rim = directions, center = OK, like a physical
remote) with Back / Home keys below and every press echoed in the panel
header.

Android TVs surface in HA as two media players — the Android TV Remote one
(power, foreground app, volume steps) and the Google Cast one (track title,
position, seek, volume level). The card spans both; every control is
feature-detected from `supported_features`, so a config with only `entity`
still renders a sensible card.

```yaml
type: custom:ru-tv-card
title: Media
entity: media_player.tv_livingroom          # androidtv_remote media player
name: Living Room TV                        # optional, defaults to friendly_name
media_entity: media_player.tv_livingroom_2  # optional, cast media player
remote_entity: remote.tv_livingroom         # optional, androidtv_remote remote
volume_entity: media_player.tv_bravia       # optional, e.g. braviatv → real volume slider
volume_mode: steppers                       # optional: auto (default) | slider | steppers
source_entity: media_player.tv_bravia       # optional, e.g. braviatv → input-switch chips
skip_seconds: [10, 30]                      # optional seek jumps, [back, forward]
apps: # optional launcher chips
  - name: Netflix
    icon: mdi:netflix # optional: mdi:/ru: icon ref or an image URL
    color: "#E50914" # tints the icon ref, header dot + chip fallback
    activity: com.netflix.ninja
    app_id: com.netflix.ninja
  - name: YouTube
    color: "#FF0000"
    activity: com.google.android.youtube.tv
    app_id: com.google.android.youtube.tv
  - name: Spotify
    color: "#1DB954"
    activity: com.spotify.tv.android
    app_id: com.spotify.tv.android
  - name: Plex
    color: "#E5A00D"
    activity: com.plexapp.android
    app_id: com.plexapp.android
  - name: Twitch
    color: "#9146FF"
    activity: tv.twitch.android.app
    app_id: tv.twitch.android.app
  - name: PlayStation
    icon: mdi:sony-playstation
    color: "#0070D1"
    source: "HDMI 3" # input chip: switches source_entity instead of launching an app
```

| Option          | Type   | Default       | Description                                                        |
| --------------- | ------ | ------------- | ------------------------------------------------------------------ |
| `title`         | string | `Media`       | Card title                                                         |
| `entity`        | string | **required**  | The TV's `media_player.*` entity (power, app, volume steps)        |
| `name`          | string | friendly name | Device name shown on the card                                      |
| `media_entity`  | string | —             | Cast-style `media_player.*` → now-playing, seek, transport         |
| `remote_entity` | string | —             | `remote.*` entity → remote panel + app launching                   |
| `volume_entity` | string | —             | `media_player.*` the volume row targets (e.g. braviatv)            |
| `volume_mode`   | string | `auto`        | Volume UI: `auto`, `slider` or `steppers` (see below)              |
| `volume_step`   | number | `5`           | Percent per −/+ press beside the volume slider (1–25)              |
| `source_entity` | string | —             | `media_player.*` the input chips target (e.g. braviatv)            |
| `skip_seconds`  | list   | `[10, 30]`    | Seek skip amounts in seconds, `[back, forward]`                    |
| `apps`          | list   | —             | Launcher chips, each `name` + optional `icon`/`icon_dark`/`color`/`activity`/`app_id`/`source` |

Behavior notes:

- The now-playing block (title, seek bar, transport) renders only when
  `media_entity` reports a track with a duration; the playback position ticks
  live between HA updates. Seek, play/pause and previous/next are each
  feature-detected and dropped when unsupported.
- Seeking: drag the bar for coarse scrubbing or use the skip buttons
  (`skip_seconds`) for precise jumps; quick repeated skips stack. After a
  seek the bar holds the target position until the TV confirms it — a cast
  device re-reports its position seconds later, and snapping back to the
  stale value in between would look like the seek failed.
- The volume row prefers a live slider (`VOLUME_SET`, from whichever entity
  supports it) and falls back to +/− steppers (`VOLUME_STEP`); the speaker
  button toggles mute (red slashed icon while muted). Set
  `volume_mode: steppers` when the slider only ever moves
  the volume one notch: Android 12+ restricts absolute volume-set for cast
  devices, so stepped key presses are all such TVs support. Steppers show
  the current level between the buttons and repeat while held.
- In slider mode, −/+ buttons appear beside the slider when the row is wide
  enough for them; each press moves the level by `volume_step` percent
  (default 5) and repeats while held.
- Sony Bravia (Android/Google TV): the native
  [Sony Bravia TV](https://www.home-assistant.io/integrations/braviatv/)
  integration talks to Sony's REST API, where absolute volume-set genuinely
  works. Enable IP control on the TV (Settings → Network → Home Network
  Setup → IP Control, PSK auth recommended), add the integration, and point
  `volume_entity` at its media player — the card gets a real slider and mute
  without `volume_mode: steppers`. Keep `media_entity` (cast) for the
  now-playing block: the Bravia API has no seek. A configured `volume_entity`
  is authoritative: while it's unavailable the volume row renders disabled
  instead of silently rerouting commands to the cast/androidtv entities
  (whose volume-set an Android 12+ TV ignores).
- Sound system attached (soundbar/AVR over HDMI ARC): the Bravia API can only
  set the TV-speaker target, which is mute/unused in that setup — the volume
  OSD moves but the audible volume doesn't. Point `volume_entity` at the sound
  system's own media player instead (e.g. a Sonos `media_player.*`) — that
  device's volume is the real one, and integrations like Sonos support
  absolute volume_set reliably.
- The power toggle reacts optimistically: a real TV takes seconds to turn
  on or off, so the knob flips immediately, pulses, and the status shows
  "Turning on…" / "Turning off…" until HA confirms (or ~20 s pass). Tapping
  again mid-flight reverses the command.
- Powering off also quits the app running on `media_entity` (cast) when one
  is active: an app left open — YouTube especially — keeps its cast session
  alive, and that session wakes an Android TV right back up moments after
  turn-off, over and over ("wake on cast").
- App chips launch via `remote.turn_on` with the app's `activity`, falling
  back to `media_player.play_media` when no `remote_entity` is configured.
  Prefer a deep link as the `activity` (`plex://`, `spotify://`,
  `twitch://home`, `https://www.youtube.com`, `https://www.netflix.com/title`
  — see the [community deep-link guide](https://community.home-assistant.io/t/android-tv-remote-app-links-deep-linking-guide/567921)).
  HA also accepts a plain package name (e.g. `com.plexapp.android`) since
  2024.6, but some TVs — Sony Google TVs among them — silently ignore it:
  the call wakes the TV yet no app opens. Test an `activity` with the TV
  *on* via Developer Tools → Actions before blaming the card. A chip
  highlights when its `app_id` matches the TV's foreground app (or its
  `name` matches the cast app name) — `app_id` stays the package name;
  find it by opening the app on the TV and reading the entity's `app_id`
  attribute in Developer Tools → States.
- A chip tapped on an off TV wakes it and opens the app: one immediate
  `remote.turn_on` call pairs androidtv_remote's POWER keypress with the
  launch (TVs that honor the pairing open the app straight from standby),
  and because many TVs drop an app link that arrives mid-wake, the same
  launch goes out again a few seconds after the TV reports on. While that
  runs the chip pulses and the status reads "Turning on… · YouTube". A chip
  tapped while the TV is already *waking* skips the immediate call and only
  queues — HA's "off" belief lags the real TV by seconds, and a
  `remote.turn_on` inside that window would land a second POWER on the
  already-waking TV and switch it straight back off. A queued launch is
  dropped (never sent late) if the TV hasn't reported on after ~30 s.
- A chip with a `source` switches TV input instead of launching an app:
  it calls `media_player.select_source` on `source_entity` (falling back to
  `entity`) — the way to put an HDMI device like a game console on the app
  row. The braviatv integration exposes the TV's inputs; find the exact
  string in Developer Tools → States → the braviatv entity's `source_list`
  (e.g. `HDMI 3`). The chip highlights while that input is the entity's
  current `source`. `source` wins when a chip also has an `activity`. CEC
  nicety: a PS5 with "Enable Turning On PS5 Through HDMI" on wakes up when
  the TV switches to its input.
- A chip's `icon` is either an icon ref (`mdi:youtube`, `ru:shelly`, or any
  installed icon set) rendered monochrome and tinted with the app's `color`,
  or an image URL (put files in HA's `www/` folder and reference them as
  `/local/...`; `icon_dark` swaps in a dark-mode variant for image logos
  that vanish on a dark panel — refs tint automatically). Without an `icon`
  the chip falls back to a small `color` dot.
- The remote panel sends `remote.send_command` key codes (`DPAD_*`, `BACK`,
  `HOME`) and only renders when `remote_entity` is configured. The ring
  d-pad is built for eyes-free use — big targets findable by feel — so each
  press briefly echoes as e.g. "▲ Up" in the panel header instead of relying
  on you watching the button.
- An unavailable TV renders grayed out with disabled controls; while the TV is
  off the media/remote sections dim.
- The card adapts to the width it is given. From about 640px it puts the remote
  panel beside the media panel instead of below it, and a card without a remote
  splits its playback controls and app chips into two columns. This follows the
  **card's own** width, not the browser window's — a card in a narrow dashboard
  column stays in the compact layout even on a wide screen, and the same card in
  a panel-view dashboard or on a wall tablet goes wide. Nothing to configure.
- On a very wide screen an uncapped card stretches the seek and volume bars
  across the whole width. Set `--ru-tv-max-width` (default `none`) to stop it
  and the card centers in its slot — e.g. `--ru-tv-max-width: 1100px` in a
  theme, or via card-mod. The cap also governs which layout is chosen, so
  capping below 640px returns the card to the compact layout. See
  [`examples/media-dashboard.yaml`](examples/media-dashboard.yaml) for a
  full-width dashboard built around this.
- The card follows Home Assistant's light/dark mode automatically with a
  built-in palette for each; every color is exposed as a
  `--ru-tv-*` CSS custom property (see
  [`src/cards/ru-tv-card/styles.ts`](src/cards/ru-tv-card/styles.ts))
  and can be overridden by a theme or card-mod.

Configuration is YAML-only for now — the card appears in the card picker with a
starter config, but has no visual editor.

### `ru-washer-card`

A Miele washing machine card: status, the running programme and its phase, a
live countdown with progress, Start / Pause / Stop, and one-tap programme
presets.

The Miele integration spreads one appliance across two dozen entities. This
card takes the status sensor as its anchor and treats everything else as
optional — each entity you leave out simply drops its row, so the card is
useful with `entity` alone and gains detail as you wire more in.

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

Behavior notes:

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
  [`src/cards/ru-washer-card/styles.ts`](src/cards/ru-washer-card/styles.ts))
  and can be overridden by a theme or card-mod.

Configuration is YAML-only for now — the card appears in the card picker with a
starter config, but has no visual editor.

## Development

Project structure, build commands, the live-HA dev loop, and the release
process are documented in [DEVELOPMENT.md](DEVELOPMENT.md).

## License

[MIT](LICENSE) © Michael Wiesendanger
