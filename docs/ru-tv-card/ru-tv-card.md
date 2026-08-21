# `ru-tv-card`

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

The design mocks this card implements sit beside this page —
[compact](ru-tv-card.html) and [wide](ru-tv-card-wide.html) (render them with
`npm run dev` at `http://localhost:5173/docs/ru-tv-card/ru-tv-card.html` —
GitHub shows only their source), and
[`examples/media-dashboard.yaml`](../../examples/media-dashboard.yaml) is a
ready-to-paste dashboard.

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
apps: # optional app launcher (chips; larger tiles when the card is wide)
  - name: Netflix
    icon: mdi:netflix # optional: mdi:/ru: icon ref or an image URL
    color: "#E50914" # tints the icon ref, header dot + chip fallback
    activity: com.netflix.ninja
    app_id: com.netflix.ninja
  - name: YouTube
    icon: ru:youtube
    color: "#FF0000"
    activity: com.google.android.youtube.tv
    app_id: com.google.android.youtube.tv
  - name: Spotify
    icon: ru:spotify
    color: "#1DB954"
    activity: com.spotify.tv.android
    app_id: com.spotify.tv.android
  - name: Plex
    icon: ru:plex
    color: "#E5A00D"
    activity: com.plexapp.android
    app_id: com.plexapp.android
  - name: Twitch
    icon: ru:twitch
    color: "#9146FF"
    activity: tv.twitch.android.app
    app_id: tv.twitch.android.app
  - name: PlayStation
    icon: ru:playstation5
    color: "#0070D1"
    source: "HDMI 3" # input chip: switches source_entity instead of launching an app
```

## Options

| Option          | Type   | Default       | Description                                                        |
| --------------- | ------ | ------------- | ------------------------------------------------------------------ |
| `title`         | string | `Media`       | Card title                                                         |
| `entity`        | string | **required**  | The TV's `media_player.*` entity (power, app, volume steps)        |
| `name`          | string | friendly name | Device name shown on the card                                      |
| `media_entity`  | string | —             | Cast-style `media_player.*` → now-playing, seek, transport         |
| `remote_entity` | string | —             | `remote.*` entity → remote panel + app launching                   |
| `keyboard`      | bool   | `false`       | On-screen QWERTY (wide layout only; needs `remote_entity`)         |
| `keyboard_mode` | string | `text`        | How keys type: `text` (IME channel) or `keycode` (raw key events)  |
| `volume_entity` | string | —             | `media_player.*` the volume row targets (e.g. braviatv)            |
| `volume_mode`   | string | `auto`        | Volume UI: `auto`, `slider` or `steppers` (see below)              |
| `volume_step`   | number | `5`           | Percent per −/+ press beside the volume slider (1–25)              |
| `source_entity` | string | —             | `media_player.*` the input chips target (e.g. braviatv)            |
| `skip_seconds`  | list   | `[10, 30]`    | Seek skip amounts in seconds, `[back, forward]`                    |
| `apps`          | list   | —             | Launcher chips, each `name` + optional `icon`/`icon_dark`/`color`/`activity`/`app_id`/`source` |

## Behavior notes

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
  the chip falls back to a small `color` dot — and the wide layout's larger
  tile shows the app's initial on a `color` square instead.
- The remote panel sends `remote.send_command` key codes (`DPAD_*`, `BACK`,
  `HOME`) and only renders when `remote_entity` is configured. The ring
  d-pad is built for eyes-free use — big targets findable by feel — so each
  press briefly echoes as e.g. "▲ Up" in the panel header instead of relying
  on you watching the button.
- `keyboard: true` adds an on-screen QWERTY below the panels — digits,
  letters, space, backspace (repeats while held) and enter, typing into
  whatever input field is focused on the TV. `keyboard_mode` picks how
  printable keys travel, because Android TVs accept exactly one of two
  channels depending on the integration's **Enable IME** setting and the
  TV's own keyboard app:
  - `text` (default): `remote.send_command` with `text:<char>` — the
    integration's IME channel. Needs Enable IME on (integration →
    Configure). Quirk: Android TVs don't take concurrent virtual and
    on-screen keyboard input, so **dismiss the TV's own on-screen keyboard
    first** (press Back once — the text field keeps focus); while that
    keyboard overlay is open, injected text goes nowhere without any HA
    error.
  - `keycode`: raw `KEYCODE_*` key events — the fallback when the IME has
    to stay off. With IME *on*, TVs swallow letter key events (digits
    sneak through as channel keys), which is how a half-working keyboard
    usually announces a mode mismatch.
  Backspace and enter go as `KEYCODE_DEL`/`KEYCODE_ENTER` in both modes.
  Needs `remote_entity`; wide layout only — a phone-width column has no
  room for forty keys. Tip: `remote.send_command` with
  `command: "text:stranger things"` types a whole string at once — handy
  in scripts.
- An unavailable TV renders grayed out with disabled controls; while the TV is
  off the media/remote sections dim.
- The card adapts to the width it is given. From about 640px it puts the remote
  panel beside the media panel instead of below it, and a card without a remote
  splits its playback controls and app chips into two columns. The app launcher
  also grows from small chips into a grid of larger tiles — icon above the
  label — sized to however many columns fit. This follows the
  **card's own** width, not the browser window's — a card in a narrow dashboard
  column stays in the compact layout even on a wide screen, and the same card in
  a panel-view dashboard or on a wall tablet goes wide. Nothing to configure.
- On a very wide screen an uncapped card stretches the seek and volume bars
  across the whole width. Set `--ru-tv-max-width` (default `none`) to stop it
  and the card centers in its slot — e.g. `--ru-tv-max-width: 1100px` in a
  theme, or via card-mod. The cap also governs which layout is chosen, so
  capping below 640px returns the card to the compact layout. See
  [`examples/media-dashboard.yaml`](../examples/media-dashboard.yaml) for a
  full-width dashboard built around this.
- The card follows Home Assistant's light/dark mode automatically with a
  built-in palette for each; every color is exposed as a
  `--ru-tv-*` CSS custom property (see
  [`src/cards/ru-tv-card/styles.ts`](../src/cards/ru-tv-card/styles.ts))
  and can be overridden by a theme or card-mod.

Configuration is YAML-only for now — the card appears in the card picker with a
starter config, but has no visual editor.
