/**
 * Pure derivation of display state from the purifier's fan entity, its
 * optional night-mode switch, and optional PM sensors — no DOM, no services.
 * Fan speed follows HA's fan convention: the `percentage` attribute is 0…100
 * in steps of `percentage_step`; the card works in ticks (1…tickCount).
 */

import type { HomeAssistant, PurifierCardConfig } from "../../types";

export type PurifierMode = "auto" | "manual" | "night";

const MODE_NAMES: Record<PurifierMode, string> = {
  auto: "Auto",
  manual: "Manual",
  night: "Night",
};

/** At most this many speed ticks, even for fans with tiny percentage steps. */
const MAX_TICKS = 10;

/** Bar scale — the PM value (µg/m³) at which a bar renders full. */
const PM25_BAR_FULL = 40;
const PM10_BAR_FULL = 55;

export interface AirQuality {
  word: "Good" | "Fair" | "Poor";
  level: "good" | "fair" | "poor";
}

export interface SensorView {
  configured: boolean;
  /** Numeric reading, or null when missing/unavailable/non-numeric. */
  value: number | null;
  text: string;
  /** Bar width, 0…100. */
  fillPct: number;
}

export interface PurifierView {
  entity: string;
  name: string;
  available: boolean;
  on: boolean;
  /** Meaningful while on; chips render inactive when off. */
  mode: PurifierMode;
  /** Preset name backing the Auto chip, or null when the fan has none. */
  autoPreset: string | null;
  hasNight: boolean;
  nightOn: boolean;
  /** Fan reports a percentage (SET_SPEED) — speed section renders. */
  supportsSpeed: boolean;
  /** Fan reports an `oscillating` attribute — oscillation row renders. */
  supportsOscillation: boolean;
  oscillating: boolean;
  tickCount: number;
  /** Filled ticks, 0…tickCount. */
  speed: number;
  /** Raw fan percentage, 0…100. */
  percentage: number;
  statusText: string;
  summaryText: string;
  speedLabel: string;
  /** Seconds per icon revolution, or null when not spinning. */
  spinSeconds: number | null;
  /** Overall rating, or null when no sensor delivers a reading. */
  aq: AirQuality | null;
  pm25: SensorView;
  pm10: SensorView;
}

export function aqFromPm25(pm25: number): AirQuality {
  if (pm25 <= 12) return { word: "Good", level: "good" };
  if (pm25 <= 35) return { word: "Fair", level: "fair" };
  return { word: "Poor", level: "poor" };
}

export function aqFromPm10(pm10: number): AirQuality {
  if (pm10 <= 20) return { word: "Good", level: "good" };
  if (pm10 <= 50) return { word: "Fair", level: "fair" };
  return { word: "Poor", level: "poor" };
}

function readSensor(
  hass: HomeAssistant,
  entity: string | undefined,
  barFull: number
): SensorView {
  if (!entity) {
    return { configured: false, value: null, text: "", fillPct: 0 };
  }
  const stateObj = hass.states[entity];
  const value = Number(stateObj?.state);
  if (!stateObj || !Number.isFinite(value)) {
    return { configured: true, value: null, text: "—", fillPct: 0 };
  }
  const rounded = Math.round(value);
  const unit = stateObj.attributes.unit_of_measurement ?? "µg/m³";
  return {
    configured: true,
    value,
    text: `${rounded} ${unit}`,
    fillPct: Math.min(100, Math.max(0, (rounded / barFull) * 100)),
  };
}

export function buildPurifierView(
  hass: HomeAssistant,
  config: PurifierCardConfig
): PurifierView {
  const stateObj = hass.states[config.entity];
  const name =
    config.name ?? stateObj?.attributes.friendly_name ?? config.entity;
  const available =
    !!stateObj &&
    stateObj.state !== "unavailable" &&
    stateObj.state !== "unknown";
  const on = available && stateObj.state === "on";

  const pm25 = readSensor(hass, config.pm25_entity, PM25_BAR_FULL);
  const pm10 = readSensor(hass, config.pm10_entity, PM10_BAR_FULL);
  const aq =
    pm25.value !== null
      ? aqFromPm25(pm25.value)
      : pm10.value !== null
        ? aqFromPm10(pm10.value)
        : null;

  const attrs = available ? stateObj.attributes : {};
  const supportsSpeed = typeof attrs.percentage === "number";
  const percentage = supportsSpeed ? (attrs.percentage as number) : 0;
  const step =
    typeof attrs.percentage_step === "number" && attrs.percentage_step > 0
      ? attrs.percentage_step
      : 100 / MAX_TICKS;
  const tickCount = Math.min(MAX_TICKS, Math.max(1, Math.round(100 / step)));
  const speed = Math.min(
    tickCount,
    Math.max(0, Math.round((percentage / 100) * tickCount))
  );

  const autoPreset =
    attrs.preset_modes?.find((mode) => /auto/i.test(mode)) ?? null;
  const nightState = config.night_mode_entity
    ? hass.states[config.night_mode_entity]?.state
    : undefined;
  const nightOn = nightState === "on";

  const mode: PurifierMode = nightOn
    ? "night"
    : autoPreset !== null &&
        typeof attrs.preset_mode === "string" &&
        attrs.preset_mode.toLowerCase() === autoPreset.toLowerCase()
      ? "auto"
      : "manual";

  const supportsOscillation = typeof attrs.oscillating === "boolean";
  const oscillating = attrs.oscillating === true;

  const modeName = MODE_NAMES[mode];
  const statusText = !available
    ? "Unavailable"
    : !on
      ? "Off"
      : modeName +
        (supportsSpeed ? ` · speed ${speed}` : "") +
        (oscillating ? " · oscillating" : "");
  const summaryBase = !available ? "Unavailable" : on ? modeName : "Off";
  const summaryText = aq ? `${summaryBase} · ${aq.word}` : summaryBase;

  return {
    entity: config.entity,
    name,
    available,
    on,
    mode,
    autoPreset,
    hasNight: !!config.night_mode_entity,
    nightOn,
    supportsSpeed,
    supportsOscillation,
    oscillating,
    tickCount,
    speed,
    percentage,
    statusText,
    summaryText,
    speedLabel:
      mode === "auto" ? `Auto · ${speed}` : `${speed} of ${tickCount}`,
    spinSeconds: on
      ? mode === "night"
        ? 6
        : Math.max(0.8, 4 - speed * 0.3)
      : null,
    aq,
    pm25,
    pm10,
  };
}
