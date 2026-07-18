/**
 * Minimal Home Assistant frontend types — only what this repo's cards touch.
 * Kept in-house instead of depending on `custom-card-helpers`, which lags
 * behind HA releases.
 */

export interface HassEntity {
  entity_id: string;
  state: string;
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
  /** Chip icon: an image URL (e.g. /local/icons/netflix.svg) or an icon ref
   * (`mdi:youtube`, `ru:shelly`) rendered monochrome and tinted with `color`.
   * The chip falls back to a `color` dot without one. */
  icon?: string;
  /** Icon used instead of `icon` in dark mode — for image URLs whose logo
   * vanishes on a dark panel (icon refs tint automatically). */
  icon_dark?: string;
  /** Color of the header dot while the app is active, and of the chip's
   * fallback dot when no `icon` is set (any CSS color). */
  color?: string;
  /** What launches the app: an Android app link URL or package name, passed
   * as remote.turn_on's `activity` (falls back to media_player.play_media). */
  activity?: string;
  /** Matched against the TV's `app_id` attribute to highlight the chip. */
  app_id?: string;
  /** TV input to switch to instead of launching an app — passed to
   * media_player.select_source on `source_entity` (must match an entry in
   * that entity's source_list, e.g. "HDMI 3"). Wins over `activity`; the
   * chip highlights while it matches the entity's `source` attribute. */
  source?: string;
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
  /** media_player.* whose select_source the input chips target and whose
   * `source` attribute highlights them — e.g. the braviatv entity, which
   * exposes HDMI inputs; the androidtv_remote/cast entities don't. */
  source_entity?: string;
  /** Seek skip amounts in seconds, [back, forward]. Default [10, 30]. */
  skip_seconds?: [number, number];
  /** App launcher chips. */
  apps?: TvAppConfig[];
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
