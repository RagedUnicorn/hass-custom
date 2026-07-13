/**
 * Scripted stand-in for the HA frontend's `hass` object, for the dev harness
 * and Playwright tests. Simulates cover travel: service calls set a target and
 * `current_position` steps toward it over `travelMs`, with opening/closing
 * states while moving — mirroring how the card sees a real Shelly 2PM cover.
 *
 * Cover semantics follow src/cards/ru-shutters-card/cover-state.ts:
 * positions 0 (closed) … 100 (open), SET_POSITION = feature bit 4.
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

export class MockHass {
  /** Every callService invocation, in order — assert on this in tests. */
  readonly calls: ServiceCall[] = [];

  private covers = new Map<string, CoverState>();

  private darkMode = false;

  private travelMs = 600;

  private listeners: Array<(hass: HomeAssistant) => void> = [];

  private snapshot: HomeAssistant;

  constructor(private specs: MockCoverSpec[]) {
    this.resetCovers();
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

  reset(): void {
    this.calls.length = 0;
    this.resetCovers();
    this.publish();
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
    if (domain === "cover") {
      const raw = data?.entity_id;
      const entities = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
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
    return {
      states,
      themes: { darkMode: this.darkMode },
      callService: this.callService,
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
