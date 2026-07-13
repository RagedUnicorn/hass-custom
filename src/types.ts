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
