/**
 * Pure derivation of display state from light and scene entities — no DOM,
 * no services. Brightness follows HA's light convention: the `brightness`
 * attribute is 0…255; the card works in percent (0…100).
 */

import type {
  HomeAssistant,
  LightConfig,
  LightRoomConfig,
  SceneConfig,
} from "../../types";

export interface LightView {
  entity: string;
  name: string;
  available: boolean;
  on: boolean;
  /** Entity is dimmable (color modes beyond plain onoff). */
  supportsBrightness: boolean;
  /** 0…100 while on, or null when off / not dimmable / unreported. */
  brightnessPct: number | null;
  effectList: string[];
  currentEffect: string | null;
  /** [r, g, b] when the light reports a color, else null. */
  rgbColor: number[] | null;
}

export interface RoomView {
  config: LightRoomConfig;
  lights: LightView[];
  /** Only the available lights — service calls and summaries use these. */
  active: LightView[];
  anyOn: boolean;
  onCount: number;
  /** Mean brightness of the lights that are on, 0 when none are. */
  avgBrightness: number;
  statusText: string;
}

export function buildLightView(
  hass: HomeAssistant,
  config: LightConfig
): LightView {
  const stateObj = hass.states[config.entity];
  const name =
    config.name ?? stateObj?.attributes.friendly_name ?? config.entity;

  if (
    !stateObj ||
    stateObj.state === "unavailable" ||
    stateObj.state === "unknown"
  ) {
    return {
      entity: config.entity,
      name,
      available: false,
      on: false,
      supportsBrightness: false,
      brightnessPct: null,
      effectList: [],
      currentEffect: null,
      rgbColor: null,
    };
  }

  const on = stateObj.state === "on";
  const colorModes = stateObj.attributes.supported_color_modes;
  const supportsBrightness = Array.isArray(colorModes)
    ? colorModes.some((mode) => mode !== "onoff")
    : typeof stateObj.attributes.brightness === "number";
  const rawBrightness = stateObj.attributes.brightness;
  const brightnessPct =
    on && supportsBrightness && typeof rawBrightness === "number"
      ? Math.min(100, Math.max(0, Math.round((rawBrightness / 255) * 100)))
      : null;
  const rawColor = stateObj.attributes.rgb_color;

  return {
    entity: config.entity,
    name,
    available: true,
    on,
    supportsBrightness,
    brightnessPct,
    effectList: stateObj.attributes.effect_list ?? [],
    currentEffect: on ? (stateObj.attributes.effect ?? null) : null,
    rgbColor: Array.isArray(rawColor) && rawColor.length >= 3 ? rawColor : null,
  };
}

export function buildRoomView(
  hass: HomeAssistant,
  config: LightRoomConfig
): RoomView {
  const lights = config.lights.map((light) => buildLightView(hass, light));
  const active = lights.filter((light) => light.available);
  const onLights = active.filter((light) => light.on);
  const withPct = onLights.filter((light) => light.brightnessPct !== null);
  const avgBrightness = withPct.length
    ? Math.round(
        withPct.reduce((sum, light) => sum + light.brightnessPct!, 0) /
          withPct.length
      )
    : 0;

  let statusText: string;
  if (active.length === 0) statusText = "Unavailable";
  else if (onLights.length === 0) statusText = "Off";
  else {
    const pct = withPct.length ? ` · ${avgBrightness}%` : "";
    statusText =
      active.length > 1
        ? `${onLights.length} of ${active.length} on${pct}`
        : `On${pct}`;
  }

  return {
    config,
    lights,
    active,
    anyOn: onLights.length > 0,
    onCount: onLights.length,
    avgBrightness,
    statusText,
  };
}

export function summaryText(rooms: RoomView[]): string {
  const lights = rooms.flatMap((room) => room.active);
  if (lights.length === 0) return "Unavailable";
  const onCount = lights.filter((light) => light.on).length;
  if (onCount === 0) return "All off";
  return `${onCount} of ${lights.length} light${lights.length > 1 ? "s" : ""} on`;
}

/**
 * The most recently activated configured scene. HA has no true "active scene"
 * concept — a scene entity's state is the timestamp of its last activation —
 * so the highlight is recency-based and can outlive manual light changes.
 */
export function activeScene(
  hass: HomeAssistant,
  scenes: SceneConfig[]
): string | null {
  let latest: string | null = null;
  let latestTime = -Infinity;
  for (const scene of scenes) {
    const time = Date.parse(hass.states[scene.entity]?.state ?? "");
    if (!Number.isNaN(time) && time > latestTime) {
      latestTime = time;
      latest = scene.entity;
    }
  }
  return latest;
}

/** Scene display name: config override, then friendly_name, then entity id. */
export function sceneName(hass: HomeAssistant, scene: SceneConfig): string {
  return (
    scene.name ??
    hass.states[scene.entity]?.attributes.friendly_name ??
    scene.entity
  );
}
