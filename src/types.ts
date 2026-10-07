/**
 * Minimal Home Assistant frontend types — only what this repo's cards touch.
 * Kept in-house instead of depending on `custom-card-helpers`, which lags
 * behind HA releases.
 */

export interface HassEntity {
  entity_id: string;
  state: string;
  /** ISO timestamp of the last state change. */
  last_changed?: string;
  attributes: {
    friendly_name?: string;
    current_position?: number;
    supported_features?: number;
    /** Light brightness, 0…255 (HA convention). */
    brightness?: number;
    supported_color_modes?: string[];
    effect_list?: string[];
    effect?: string;
    rgb_color?: number[];
    /** Fan speed, 0…100 percent (HA convention). */
    percentage?: number;
    /** Percent per speed step, e.g. 10 for a 10-speed fan. */
    percentage_step?: number;
    preset_modes?: string[];
    preset_mode?: string | null;
    oscillating?: boolean;
    unit_of_measurement?: string;
    /** Media player: package/id of the foreground app (androidtv_remote). */
    app_id?: string;
    /** Media player: human app name (cast). */
    app_name?: string;
    media_title?: string;
    /** Media length in seconds. */
    media_duration?: number;
    /** Playback position in seconds, valid at media_position_updated_at. */
    media_position?: number;
    /** ISO timestamp of the last media_position report. */
    media_position_updated_at?: string;
    /** Volume, 0…1 (HA convention). */
    volume_level?: number;
    is_volume_muted?: boolean;
    /** Media player: current input source (braviatv). */
    source?: string;
    /** Media player: selectable input sources (braviatv). */
    source_list?: string[];
    [key: string]: unknown;
  };
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  themes?: { darkMode?: boolean };
  /** The logged-in user; only `is_admin` is read. */
  user?: { is_admin?: boolean };
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>
  ): Promise<unknown>;
}

/** Implemented by every Lovelace card element. */
export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: unknown): void;
  getCardSize?(): number;
}

// --- ru-shutters-card config ------------------------------------------------

export interface CoverConfig {
  entity: string;
  name?: string;
}

export interface RoomConfig {
  name: string;
  icon?: string;
  covers: CoverConfig[];
}

export interface PresetConfig {
  name: string;
  icon: string;
  /** Target cover position, 0 (closed) … 100 (open). */
  position: number;
}

export interface ShuttersCardConfig {
  type: string;
  title?: string;
  show_percent?: boolean;
  rooms: RoomConfig[];
  presets?: PresetConfig[];
}

// --- ru-lights-card config ----------------------------------------------------

export interface LightConfig {
  entity: string;
  name?: string;
}

export interface LightRoomConfig {
  name: string;
  lights: LightConfig[];
}

export interface SceneConfig {
  entity: string;
  name?: string;
  /** CSS background for the scene swatch (any gradient/color). */
  gradient?: string;
}

export interface LightsCardConfig {
  type: string;
  title?: string;
  rooms: LightRoomConfig[];
  scenes?: SceneConfig[];
}

// --- ru-purifier-card config --------------------------------------------------

export interface PurifierCardConfig {
  type: string;
  title?: string;
  /** The purifier's fan.* entity. */
  entity: string;
  name?: string;
  /** switch.* toggling the device's night mode — enables the Night chip. */
  night_mode_entity?: string;
  /** PM2.5 sensor (µg/m³) — enables the air quality panel. */
  pm25_entity?: string;
  /** PM10 sensor (µg/m³) — enables the air quality panel. */
  pm10_entity?: string;
}

// --- ru-tv-card config ----------------------------------------------------------

export interface TvAppConfig {
  name: string;
  /** Chip/tile icon: an image URL (e.g. /local/icons/netflix.svg) or an icon
   * ref (`mdi:youtube`, `ru:shelly`) rendered monochrome and tinted with
   * `color`. Without one the compact chip falls back to a `color` dot and the
   * wide layout's tile to the app's initial on a `color` square. */
  icon?: string;
  /** Icon used instead of `icon` in dark mode — for image URLs whose logo
   * vanishes on a dark panel (icon refs tint automatically). */
  icon_dark?: string;
  /** Color of the header dot while the app is active, and of the chip/tile
   * fallback (dot or lettered square) when no `icon` is set (any CSS color). */
  color?: string;
  /** What launches the app: an Android app link URL or package name, passed
   * as remote.turn_on's `activity` (falls back to media_player.play_media). */
  activity?: string;
  /** Matched against the TV's `app_id` attribute to highlight the chip/tile. */
  app_id?: string;
  /** TV input to switch to instead of launching an app — passed to
   * media_player.select_source on `source_entity` (must match an entry in
   * that entity's source_list, e.g. "HDMI 3"). Wins over `activity`; the
   * chip highlights while it matches the entity's `source` attribute. */
  source?: string;
  /** App to launch through `source_entity` instead of the remote — its title
   * as the braviatv integration lists it (Media → the TV → Apps, e.g.
   * "Jellyfin"), passed to media_player.play_media with media_content_type
   * `app`. For TVs that ignore remote.turn_on's package-name launch. Wins
   * over `activity`; `source` wins over it. */
  source_app?: string;
}

export interface TvCardConfig {
  type: string;
  title?: string;
  /** The TV's media_player.* entity (androidtv_remote) — power, app, volume. */
  entity: string;
  name?: string;
  /** Cast-style media_player.* with now-playing detail — enables the track
   * title, seek bar and transport controls. */
  media_entity?: string;
  /** remote.* entity (androidtv_remote) — enables the remote panel. */
  remote_entity?: string;
  /** media_player.* whose volume services the volume row targets — e.g. the
   * braviatv entity (absolute REST volume_set) or a Sonos soundbar on ARC.
   * Authoritative: while it's unavailable the volume row renders disabled
   * instead of falling back to the cast/androidtv entities. */
  volume_entity?: string;
  /** Volume UI: auto picks slider when VOLUME_SET exists (legacy behavior);
   * steppers forces +/− key-press buttons — the right choice for Android 12+
   * TVs where absolute volume_set only moves one step. */
  volume_mode?: "auto" | "slider" | "steppers";
  /** Percent moved per −/+ press beside the volume slider (slider mode only;
   * the buttons appear when the row is wide enough). 1–25, default 5. */
  volume_step?: number;
  /** media_player.* whose select_source the input chips target and whose
   * `source` attribute highlights them — e.g. the braviatv entity, which
   * exposes HDMI inputs; the androidtv_remote/cast entities don't. */
  source_entity?: string;
  /** On-screen QWERTY keyboard panel typing into whatever input field is
   * focused on the TV, via remote.send_command. Requires `remote_entity`;
   * only shown when the card is wide enough (the ≥640px layout). Default
   * false. */
  keyboard?: boolean;
  /** How printable keys reach the TV: "text" (default) sends `text:<char>`
   * through the integration's IME channel — needs Enable IME on and a TV
   * keyboard that tolerates it (Gboard does); "keycode" sends raw KEYCODE_*
   * key events — the fallback when the IME conflicts with the TV's own
   * keyboard and has to stay off. Backspace/enter are key codes either way. */
  keyboard_mode?: "text" | "keycode";
  /** Seek skip amounts in seconds, [back, forward]. Default [10, 30]. */
  skip_seconds?: [number, number];
  /** App launcher chips. */
  apps?: TvAppConfig[];
}

// --- ru-washer-card config ---------------------------------------------------

export interface WasherPresetConfig {
  name: string;
  /** mdi:* icon ref rendered via <ha-icon>. */
  icon?: string;
  /** Numeric Miele programme id passed to miele.set_program. Discover the
   * ids your machine actually offers by calling miele.get_programs — they
   * differ per model, and only a subset of the programme sensor's enum is
   * remotely selectable. */
  program_id: number;
  /** The programme sensor's enum value for this programme (e.g. "delicates").
   * Used ONLY to highlight the chip while that programme is selected — the
   * sensor reports names while set_program takes ids, so the two cannot be
   * matched without it. Omit and the chip simply never highlights. */
  program?: string;
  /** Spin speed this programme runs at, in rpm. Display label only — the
   * Miele API exposes no way to set it. */
  spin?: number;
  /** Temperature this programme runs at, in °C. Display label only. */
  temperature?: number;
}

export interface WasherCardConfig {
  type: string;
  title?: string;
  /** The appliance's main status sensor (the enum one, e.g.
   * sensor.washing_machine). */
  entity: string;
  name?: string;
  /** Miele device id — required for `presets`, since miele.set_program
   * targets a device rather than an entity. Settings → Devices → the machine;
   * the id is the last path segment of the URL. */
  device_id?: string;
  /** switch.* → power toggle. */
  power_entity?: string;
  /** button.* → Start control. Created disabled by the Miele integration;
   * enable it in the entity registry first. */
  start_entity?: string;
  /** button.* → Pause control. */
  pause_entity?: string;
  /** button.* → Stop control. */
  stop_entity?: string;
  /** sensor.* reporting the selected programme → programme line. */
  program_entity?: string;
  /** sensor.* reporting the programme phase → phase line. */
  phase_entity?: string;
  /** sensor.* remaining minutes → countdown + progress. */
  remaining_entity?: string;
  /** sensor.* elapsed minutes → progress. */
  elapsed_entity?: string;
  /** timestamp sensor.* → a per-second countdown instead of whole minutes,
   * and the "Finishes HH:MM" label. */
  finish_entity?: string;
  /** binary_sensor.* (device_class door) → door indicator. */
  door_entity?: string;
  /** binary_sensor.* → explains a refused remote start. Miele blocks it
   * unless Mobile Start is armed on the machine itself. */
  mobile_start_entity?: string;
  /** sensor.* spin speed in rpm → readout chip. */
  spin_speed_entity?: string;
  /** sensor.* target temperature in °C → readout chip. */
  temperature_entity?: string;
  /** Programme chips. Needs `device_id`. */
  presets?: WasherPresetConfig[];
}

// --- ru-doors-card config ----------------------------------------------------

export interface DoorConfig {
  /** binary_sensor.* contact (on = open). */
  entity: string;
  /** Defaults to the entity's friendly_name. */
  name?: string;
  /** mdi:* icon ref rendered via <ha-icon>. Defaults to mdi:door-closed /
   * mdi:door-open by state. */
  icon?: string;
}

export interface DoorsCardConfig {
  type: string;
  title?: string;
  /** person.* (or device_tracker.*) deciding "home": an open door is yellow
   * while it reads `home`, red otherwise — a zone name, not_home or unknown
   * all count as away. */
  presence_entity: string;
  doors: DoorConfig[];
}

// --- ru-last-seen-card config ------------------------------------------------

export interface LastSeenEntityConfig {
  /** Timestamp sensor.* whose state is an ISO time — e.g. Zigbee2MQTT's
   * sensor.<device>_last_seen (needs advanced.last_seen: ISO_8601). */
  entity: string;
  /** Defaults to the entity's friendly_name. */
  name?: string;
}

export interface LastSeenCardConfig {
  type: string;
  title?: string;
  /** Hours since last seen before a row turns yellow. Default 2. */
  warn_after_hours?: number;
  /** Hours since last seen before a row turns red. Default 24. */
  alert_after_hours?: number;
  entities: LastSeenEntityConfig[];
}

// --- ru-nav-card config -------------------------------------------------------

export interface NavRouteConfig {
  /** App path to open, e.g. /home-dashboard/lights. Also decides which entry
   * is highlighted: the one whose path matches the current location. */
  path: string;
  name: string;
  icon: string;
  /** Only shown to admin users — e.g. a way back into the settings on a
   * kiosk-mode dashboard. */
  admin_only?: boolean;
}

export interface NavCardConfig {
  type: string;
  routes: NavRouteConfig[];
}

// --- globals the HA frontend looks at ----------------------------------------

export interface CustomIconsetResult {
  path: string;
  viewBox?: string;
}

export interface CustomCardEntry {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
  documentationURL?: string;
}

declare global {
  interface Window {
    customIconsets?: Record<
      string,
      (iconName: string) => Promise<CustomIconsetResult>
    >;
    customCards?: CustomCardEntry[];
  }
}
