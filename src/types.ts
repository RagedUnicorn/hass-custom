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
