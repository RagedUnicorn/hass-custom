/**
 * Scripted stand-in for the HA frontend's `hass` object, for the dev harness
 * and Playwright tests. Simulates cover travel: service calls set a target and
 * `current_position` steps toward it over `travelMs`, with opening/closing
 * states while moving — mirroring how the card sees a real Shelly 2PM cover.
 * Lights and scenes apply instantly: light.turn_on/turn_off flip state and
 * brightness, scene.turn_on applies the scene's state map and stamps the
 * scene entity with a fresh activation timestamp (HA scene semantics).
 *
 * Cover semantics follow src/cards/ru-shutters-card/cover-state.ts:
 * positions 0 (closed) … 100 (open), SET_POSITION = feature bit 4.
 * Light semantics follow src/cards/ru-lights-card/light-state.ts:
 * `brightness` attribute 0…255, dimmability via supported_color_modes.
 */

import type { HassEntity, HomeAssistant } from "../src/types";

const FEATURE_OPEN = 1;
const FEATURE_CLOSE = 2;
const FEATURE_SET_POSITION = 4;
const FEATURE_STOP = 8;

const TICK_MS = 50;

export interface MockCoverSpec {
  entity: string;
  name: string;
  /** Initial position, 0…100. Default 100 (open). */
  position?: number;
  /** Expose current_position + SET_POSITION. Default true. */
  supportsPosition?: boolean;
  /** Render as an unavailable entity. Default true (available). */
  available?: boolean;
}

export interface MockLightSpec {
  entity: string;
  name: string;
  /** Initial on state. Default false. */
  on?: boolean;
  /** Initial brightness in percent, 0…100. Default 100. */
  brightness?: number;
  /** Dimmable (color modes beyond onoff). Default true. */
  supportsBrightness?: boolean;
  effectList?: string[];
  effect?: string;
  rgbColor?: number[];
  /** Render as an unavailable entity. Default true (available). */
  available?: boolean;
}

export interface MockSceneSpec {
  entity: string;
  name: string;
  /** Light states applied on scene.turn_on; missing entities are untouched. */
  apply: Record<string, { on: boolean; brightness?: number }>;
}

export interface ServiceCall {
  domain: string;
  service: string;
  data?: Record<string, unknown>;
}

interface CoverState {
  spec: MockCoverSpec;
  position: number;
  target: number;
  available: boolean;
}

interface LightState {
  spec: MockLightSpec;
  on: boolean;
  /** Percent, 0…100. */
  brightness: number;
  effect?: string;
  available: boolean;
}

interface SceneState {
  spec: MockSceneSpec;
  /** ISO timestamp of the last activation, or null when never activated. */
  lastActivated: string | null;
}

export class MockHass {
  /** Every callService invocation, in order — assert on this in tests. */
  readonly calls: ServiceCall[] = [];

  private covers = new Map<string, CoverState>();

  private lights = new Map<string, LightState>();

  private scenes = new Map<string, SceneState>();

  private darkMode = false;

  private travelMs = 600;

  private sceneStamp = 0;

  private listeners: Array<(hass: HomeAssistant) => void> = [];

  private snapshot: HomeAssistant;

  constructor(
    private specs: MockCoverSpec[],
    private lightSpecs: MockLightSpec[] = [],
    private sceneSpecs: MockSceneSpec[] = []
  ) {
    this.resetCovers();
    this.resetLights();
    this.snapshot = this.buildSnapshot();
    setInterval(() => this.tick(), TICK_MS);
  }

  get hass(): HomeAssistant {
    return this.snapshot;
  }

  /** Register a listener that receives a fresh hass on every change. */
  onChange(listener: (hass: HomeAssistant) => void): void {
    this.listeners.push(listener);
    listener(this.snapshot);
  }

  setDarkMode(dark: boolean): void {
    this.darkMode = dark;
    this.publish();
  }

  /** Jump a cover to a position instantly (no travel). */
  setPosition(entity: string, position: number): void {
    const cover = this.covers.get(entity);
    if (!cover) return;
    cover.position = position;
    cover.target = position;
    this.publish();
  }

  /** Full-travel duration; lower = faster tests, higher = observable motion. */
  setTravelMs(ms: number): void {
    this.travelMs = Math.max(TICK_MS, ms);
  }

  /** Set a light's state directly (no service call logged). */
  setLight(
    entity: string,
    patch: { on?: boolean; brightness?: number }
  ): void {
    const light = this.lights.get(entity);
    if (!light) return;
    if (patch.on !== undefined) light.on = patch.on;
    if (patch.brightness !== undefined) light.brightness = patch.brightness;
    this.publish();
  }

  reset(): void {
    this.calls.length = 0;
    this.resetCovers();
    this.resetLights();
    this.publish();
  }

  private resetLights(): void {
    this.lights.clear();
    for (const spec of this.lightSpecs) {
      this.lights.set(spec.entity, {
        spec,
        on: spec.on ?? false,
        brightness: spec.brightness ?? 100,
        effect: spec.effect,
        available: spec.available ?? true,
      });
    }
    this.scenes.clear();
    for (const spec of this.sceneSpecs) {
      this.scenes.set(spec.entity, { spec, lastActivated: null });
    }
  }

  private resetCovers(): void {
    this.covers.clear();
    for (const spec of this.specs) {
      this.covers.set(spec.entity, {
        spec,
        position: spec.position ?? 100,
        target: spec.position ?? 100,
        available: spec.available ?? true,
      });
    }
  }

  private tick(): void {
    const step = (100 / this.travelMs) * TICK_MS;
    let changed = false;
    for (const cover of this.covers.values()) {
      const delta = cover.target - cover.position;
      if (Math.abs(delta) < 0.01) continue;
      cover.position =
        Math.abs(delta) <= step
          ? cover.target
          : cover.position + Math.sign(delta) * step;
      changed = true;
    }
    if (changed) this.publish();
  }

  private callService = (
    domain: string,
    service: string,
    data?: Record<string, unknown>
  ): Promise<unknown> => {
    this.calls.push({ domain, service, data });
    const raw = data?.entity_id;
    const entities = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
    if (domain === "light") {
      for (const entity of entities) {
        const light = this.lights.get(entity);
        if (!light || !light.available) continue;
        switch (service) {
          case "turn_on":
            light.on = true;
            if (
              typeof data?.brightness_pct === "number" &&
              light.spec.supportsBrightness !== false
            ) {
              light.brightness = data.brightness_pct;
            }
            if (typeof data?.effect === "string") {
              light.effect = data.effect;
            }
            break;
          case "turn_off":
            light.on = false;
            break;
        }
      }
      this.publish();
    }
    if (domain === "scene" && service === "turn_on") {
      for (const entity of entities) {
        const scene = this.scenes.get(entity);
        if (!scene) continue;
        // Strictly monotonic so back-to-back activations still order correctly.
        this.sceneStamp = Math.max(this.sceneStamp + 1, Date.now());
        scene.lastActivated = new Date(this.sceneStamp).toISOString();
        for (const [target, state] of Object.entries(scene.spec.apply)) {
          const light = this.lights.get(target);
          if (!light || !light.available) continue;
          light.on = state.on;
          if (state.brightness !== undefined) light.brightness = state.brightness;
        }
      }
      this.publish();
    }
    if (domain === "cover") {
      for (const entity of entities) {
        const cover = this.covers.get(entity);
        if (!cover || !cover.available) continue;
        switch (service) {
          case "open_cover":
            cover.target = 100;
            break;
          case "close_cover":
            cover.target = 0;
            break;
          case "stop_cover":
            cover.target = cover.position;
            break;
          case "set_cover_position":
            if (cover.spec.supportsPosition !== false) {
              cover.target = Number(data?.position ?? cover.position);
            }
            break;
        }
      }
      this.publish();
    }
    return Promise.resolve();
  };

  private buildSnapshot(): HomeAssistant {
    const states: Record<string, HassEntity> = {};
    for (const cover of this.covers.values()) {
      states[cover.spec.entity] = this.buildEntity(cover);
    }
    for (const light of this.lights.values()) {
      states[light.spec.entity] = this.buildLightEntity(light);
    }
    for (const scene of this.scenes.values()) {
      states[scene.spec.entity] = {
        entity_id: scene.spec.entity,
        state: scene.lastActivated ?? "unknown",
        attributes: { friendly_name: scene.spec.name },
      };
    }
    return {
      states,
      themes: { darkMode: this.darkMode },
      callService: this.callService,
    };
  }

  private buildLightEntity(light: LightState): HassEntity {
    if (!light.available) {
      return {
        entity_id: light.spec.entity,
        state: "unavailable",
        attributes: { friendly_name: light.spec.name },
      };
    }
    const dimmable = light.spec.supportsBrightness !== false;
    return {
      entity_id: light.spec.entity,
      state: light.on ? "on" : "off",
      attributes: {
        friendly_name: light.spec.name,
        supported_color_modes: dimmable
          ? [light.spec.rgbColor ? "rgb" : "brightness"]
          : ["onoff"],
        // HA only reports these attributes while the light is on.
        ...(light.on && dimmable
          ? { brightness: Math.round((light.brightness / 100) * 255) }
          : {}),
        ...(light.spec.effectList ? { effect_list: light.spec.effectList } : {}),
        ...(light.on && light.effect ? { effect: light.effect } : {}),
        ...(light.on && light.spec.rgbColor
          ? { rgb_color: light.spec.rgbColor }
          : {}),
      },
    };
  }

  private buildEntity(cover: CoverState): HassEntity {
    const supportsPosition = cover.spec.supportsPosition !== false;
    if (!cover.available) {
      return {
        entity_id: cover.spec.entity,
        state: "unavailable",
        attributes: { friendly_name: cover.spec.name },
      };
    }
    const moving = Math.abs(cover.target - cover.position) >= 0.01;
    const state = moving
      ? cover.target > cover.position
        ? "opening"
        : "closing"
      : cover.position <= 0.5
        ? "closed"
        : "open";
    return {
      entity_id: cover.spec.entity,
      state,
      attributes: {
        friendly_name: cover.spec.name,
        supported_features:
          FEATURE_OPEN |
          FEATURE_CLOSE |
          FEATURE_STOP |
          (supportsPosition ? FEATURE_SET_POSITION : 0),
        ...(supportsPosition
          ? { current_position: Math.round(cover.position) }
          : {}),
      },
    };
  }

  private publish(): void {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener(this.snapshot);
  }
}
