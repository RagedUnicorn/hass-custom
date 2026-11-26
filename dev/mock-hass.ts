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
 * Fan semantics follow src/cards/ru-purifier-card/purifier-state.ts:
 * `percentage` 0…100 in `percentage_step` steps; fan.set_percentage clears
 * the preset (manual), fan.set_preset_mode re-enters it. Switches flip
 * on/off; sensors hold a numeric reading settable via setSensor.
 * Media player semantics follow src/cards/ru-tv-card/tv-state.ts: playback
 * position is reported with media_position_updated_at and extrapolated by
 * the card; volume_level is 0…1. Remotes only log their service calls.
 * Doors are door-class contact binary_sensors (on = open) that stamp
 * last_changed on every flip; people are person.* entities whose state is
 * home / not_home / a zone name — both settable directly via setDoor /
 * setPerson, as nothing in HA moves them by service call.
 * Timestamp sensors (e.g. Zigbee2MQTT *_last_seen) hold an ISO time as their
 * state, set relative to page load via ageMinutes or directly via
 * setTimestamp; null makes them unavailable.
 */

import type { HassEntity, HomeAssistant } from "../src/types";
import type { MockMusicAssistant } from "./mock-music";

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

export interface MockFanSpec {
  entity: string;
  name: string;
  /** Initial on state. Default false. */
  on?: boolean;
  /** Initial speed in percent, 0…100. Default 40. */
  percentage?: number;
  /** Percent per speed step. Default 10 (a 10-speed fan). */
  percentageStep?: number;
  presetModes?: string[];
  /** Initial preset, e.g. "Auto". Default none (manual). */
  presetMode?: string;
  /** Expose the `oscillating` attribute. Default true. */
  supportsOscillation?: boolean;
  oscillating?: boolean;
  /** Render as an unavailable entity. Default true (available). */
  available?: boolean;
}

export interface MockSwitchSpec {
  entity: string;
  name: string;
  /** Initial on state. Default false. */
  on?: boolean;
}

/** The Miele status enum, narrowed to what the card renders differently. */
export type MockWasherStatus =
  | "off"
  | "on"
  | "programmed"
  | "in_use"
  | "pause"
  | "program_ended";

/**
 * A Miele-style washing machine. One spec produces the whole entity family the
 * card consumes — sensor.<base>, sensor.<base>_program, switch.<base>_power,
 * button.<base>_start and so on — because that is exactly how the real
 * integration names them.
 */
export interface MockWasherSpec {
  /** Entity id stem, e.g. "washing_machine". */
  base: string;
  name: string;
  /** Miele device id, targeted by miele.set_program. */
  deviceId: string;
  /** Initial status. Default "in_use". */
  status?: MockWasherStatus;
  /** Programme enum value, e.g. "cottons". Default "cottons". */
  program?: string;
  /** Cycle length in minutes. Default 149. */
  totalMin?: number;
  /** Minutes already run. Default 37. */
  elapsedMin?: number;
  /** Spin speed in rpm. Default 1400. */
  spin?: number;
  /** Target temperature in °C. Default 40. */
  temperature?: number;
  doorOpen?: boolean;
  /** Miele's remote-start interlock. Default true (armed). */
  mobileStart?: boolean;
}

/** A door contact sensor: binary_sensor.* with device_class door. */
export interface MockDoorSpec {
  entity: string;
  name: string;
  /** Initial open state. Default false (closed). */
  open?: boolean;
}

/** A person.* entity — the presence source for ru-doors-card. */
export interface MockPersonSpec {
  entity: string;
  name: string;
  /** Initial state: "home", "not_home" or a zone name. Default "home". */
  state?: string;
}

/** A timestamp sensor whose state is an ISO time (e.g. *_last_seen). */
export interface MockTimestampSpec {
  entity: string;
  name: string;
  /** Initial age in minutes before page load. Omit for unavailable. */
  ageMinutes?: number;
}

export interface MockSensorSpec {
  entity: string;
  name: string;
  value: number;
  unit?: string;
}

export interface MockMediaPlayerSpec {
  entity: string;
  name: string;
  /** Initial state. Default "off". */
  state?: "off" | "on" | "idle" | "playing" | "paused";
  /** Raw supported_features bitmask, mirroring HA. */
  features: number;
  appId?: string;
  appName?: string;
  title?: string;
  /** Track length in seconds. */
  duration?: number;
  /** Initial position in seconds. */
  position?: number;
  /** Volume, 0…1. Omit for players without a volume level (androidtv). */
  volume?: number;
  muted?: boolean;
  /** Selectable input sources (braviatv); implies the current `source`. */
  sourceList?: string[];
  /** Initial input source. */
  source?: string;
  /** Render as an unavailable entity. Default true (available). */
  available?: boolean;
  /** Power the androidtv_remote way: turn_on/turn_off send a POWER key only
   * when the *reported* state disagrees with the intent, and the key toggles
   * the TV whatever the report said. With a reaction lag that makes two
   * presses inside the lag window cancel out — the real race the card's
   * launch queue exists for. Default false (absolute on/off). */
  powerKey?: boolean;
}

export interface MockRemoteSpec {
  entity: string;
  name: string;
  /** Initial on state. Default true. */
  on?: boolean;
  /** media_player this remote shares a device with (androidtv_remote exposes
   * both). Its state then mirrors that player's — and remote.turn_on sends
   * the same POWER key media_player.turn_on does. */
  player?: string;
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

interface FanState {
  spec: MockFanSpec;
  on: boolean;
  /** Percent, 0…100. */
  percentage: number;
  /** Active preset, or null when manual. */
  presetMode: string | null;
  oscillating: boolean;
  available: boolean;
}

interface SwitchState {
  spec: MockSwitchSpec;
  on: boolean;
}

interface MediaPlayerState {
  spec: MockMediaPlayerSpec;
  state: "off" | "on" | "idle" | "playing" | "paused";
  /** Position in seconds, valid at positionStamp. */
  position: number;
  /** ISO timestamp backing media_position_updated_at. */
  positionStamp: string;
  volume: number | null;
  muted: boolean;
  /** Current input source, or null for players without inputs. */
  source: string | null;
  available: boolean;
}

interface RemoteState {
  spec: MockRemoteSpec;
  on: boolean;
}

interface SensorState {
  spec: MockSensorSpec;
  value: number;
}

interface WasherState {
  spec: MockWasherSpec;
  status: MockWasherStatus;
  program: string;
  elapsed: number;
  total: number;
  doorOpen: boolean;
  mobileStart: boolean;
  available: boolean;
}

interface DoorState {
  spec: MockDoorSpec;
  open: boolean;
  available: boolean;
  /** ISO timestamp of the last open/close flip. */
  lastChanged: string;
}

interface TimestampState {
  spec: MockTimestampSpec;
  /** ISO time, or null for unavailable. */
  iso: string | null;
}

interface PersonState {
  spec: MockPersonSpec;
  state: string;
}

export class MockHass {
  /** Every callService invocation, in order — assert on this in tests. */
  readonly calls: ServiceCall[] = [];

  private covers = new Map<string, CoverState>();

  private lights = new Map<string, LightState>();

  private scenes = new Map<string, SceneState>();

  private fans = new Map<string, FanState>();

  private switches = new Map<string, SwitchState>();

  private sensors = new Map<string, SensorState>();

  private mediaPlayers = new Map<string, MediaPlayerState>();

  private remotes = new Map<string, RemoteState>();

  private washers = new Map<string, WasherState>();

  private doors = new Map<string, DoorState>();

  private people = new Map<string, PersonState>();

  private timestamps = new Map<string, TimestampState>();

  /** Music Assistant speakers + actions (see mock-music.ts), if attached. */
  private music?: MockMusicAssistant;

  private darkMode = false;

  /** hass.user.is_admin — gates admin_only nav routes. */
  private admin = true;

  private registryEntities: HomeAssistant["entities"];

  private registryDevices: HomeAssistant["devices"];

  private travelMs = 600;

  /** Simulated TV reaction lag for power/seek; 0 = instant. */
  private reactionMs = 0;

  private sceneStamp = 0;

  private listeners: Array<(hass: HomeAssistant) => void> = [];

  private snapshot: HomeAssistant;

  constructor(
    private specs: MockCoverSpec[],
    private lightSpecs: MockLightSpec[] = [],
    private sceneSpecs: MockSceneSpec[] = [],
    private fanSpecs: MockFanSpec[] = [],
    private switchSpecs: MockSwitchSpec[] = [],
    private sensorSpecs: MockSensorSpec[] = [],
    private mediaPlayerSpecs: MockMediaPlayerSpec[] = [],
    private remoteSpecs: MockRemoteSpec[] = [],
    private washerSpecs: MockWasherSpec[] = [],
    private doorSpecs: MockDoorSpec[] = [],
    private personSpecs: MockPersonSpec[] = [],
    private timestampSpecs: MockTimestampSpec[] = []
  ) {
    this.resetCovers();
    this.resetLights();
    this.resetFans();
    this.resetMedia();
    this.resetWashers();
    this.resetDoors();
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

  setAdmin(admin: boolean): void {
    this.admin = admin;
    this.publish();
  }

  /** hass.entities / hass.devices — the registry slices cards resolve
   * label and area targets against. Static fixture data, set once. */
  setRegistry(
    entities: HomeAssistant["entities"],
    devices: HomeAssistant["devices"]
  ): void {
    this.registryEntities = entities;
    this.registryDevices = devices;
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

  /** Delay before media_player turn_on/turn_off/media_seek take effect —
   * simulates a slow-reacting TV so optimistic card states are observable. */
  setReactionMs(ms: number): void {
    this.reactionMs = Math.max(0, ms);
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

  /** Set a fan's state directly (no service call logged). */
  setFan(
    entity: string,
    patch: {
      on?: boolean;
      percentage?: number;
      presetMode?: string | null;
      oscillating?: boolean;
      available?: boolean;
    }
  ): void {
    const fan = this.fans.get(entity);
    if (!fan) return;
    if (patch.on !== undefined) fan.on = patch.on;
    if (patch.percentage !== undefined) fan.percentage = patch.percentage;
    if (patch.presetMode !== undefined) fan.presetMode = patch.presetMode;
    if (patch.oscillating !== undefined) fan.oscillating = patch.oscillating;
    if (patch.available !== undefined) fan.available = patch.available;
    this.publish();
  }

  /** Set a switch directly (no service call logged). */
  setSwitch(entity: string, on: boolean): void {
    const sw = this.switches.get(entity);
    if (!sw) return;
    sw.on = on;
    this.publish();
  }

  /** Set a sensor reading directly. */
  setSensor(entity: string, value: number): void {
    const sensor = this.sensors.get(entity);
    if (!sensor) return;
    sensor.value = value;
    this.publish();
  }

  /** Set a media player's state directly (no service call logged). */
  setMediaPlayer(
    entity: string,
    patch: {
      state?: "off" | "on" | "idle" | "playing" | "paused";
      position?: number;
      volume?: number | null;
      muted?: boolean;
      available?: boolean;
    }
  ): void {
    const player = this.mediaPlayers.get(entity);
    if (!player) return;
    if (patch.state !== undefined) player.state = patch.state;
    if (patch.position !== undefined) {
      player.position = patch.position;
      player.positionStamp = new Date().toISOString();
    }
    if (patch.volume !== undefined) player.volume = patch.volume;
    if (patch.muted !== undefined) player.muted = patch.muted;
    if (patch.available !== undefined) player.available = patch.available;
    this.publish();
  }

  /** Adds Music Assistant: its speakers join hass.states, its media_player
   * and music_assistant.* calls are routed to it. */
  attachMusic(music: MockMusicAssistant): void {
    this.music = music;
    music.bind(() => this.publish());
    this.publish();
  }

  reset(): void {
    this.calls.length = 0;
    this.music?.reset();
    this.reactionMs = 0;
    this.admin = true;
    this.resetCovers();
    this.resetLights();
    this.resetFans();
    this.resetMedia();
    this.resetWashers();
    this.resetDoors();
    this.publish();
  }

  private resetWashers(): void {
    this.washers.clear();
    for (const spec of this.washerSpecs) {
      this.washers.set(spec.base, {
        spec,
        status: spec.status ?? "in_use",
        program: spec.program ?? "cottons",
        elapsed: spec.elapsedMin ?? 37,
        total: spec.totalMin ?? 149,
        doorOpen: spec.doorOpen ?? false,
        mobileStart: spec.mobileStart ?? true,
        available: true,
      });
    }
  }

  private resetDoors(): void {
    // A fixed stamp, not "now": relative "since" texts stay deterministic.
    const stamp = new Date(Date.now() - 12 * 60_000).toISOString();
    this.doors.clear();
    for (const spec of this.doorSpecs) {
      this.doors.set(spec.entity, {
        spec,
        open: spec.open ?? false,
        available: true,
        lastChanged: stamp,
      });
    }
    this.people.clear();
    for (const spec of this.personSpecs) {
      this.people.set(spec.entity, { spec, state: spec.state ?? "home" });
    }
    this.timestamps.clear();
    for (const spec of this.timestampSpecs) {
      this.timestamps.set(spec.entity, {
        spec,
        iso:
          spec.ageMinutes === undefined
            ? null
            : new Date(Date.now() - spec.ageMinutes * 60_000).toISOString(),
      });
    }
  }

  /** Set a timestamp sensor to an ISO time, or null for unavailable. */
  setTimestamp(entity: string, iso: string | null): void {
    const ts = this.timestamps.get(entity);
    if (!ts) return;
    ts.iso = iso;
    this.publish();
  }

  /** Open/close a door (stamps last_changed) or drop it unavailable. */
  setDoor(entity: string, patch: { open?: boolean; available?: boolean }): void {
    const door = this.doors.get(entity);
    if (!door) return;
    if (patch.open !== undefined && patch.open !== door.open) {
      door.open = patch.open;
      door.lastChanged = new Date().toISOString();
    }
    if (patch.available !== undefined) door.available = patch.available;
    this.publish();
  }

  /** Move a person: "home", "not_home", a zone name, or "unknown". */
  setPerson(entity: string, state: string): void {
    const person = this.people.get(entity);
    if (!person) return;
    person.state = state;
    this.publish();
  }

  /** Directly set washer state without logging a service call. */
  setWasher(
    base: string,
    patch: {
      status?: MockWasherStatus;
      program?: string;
      elapsedMin?: number;
      totalMin?: number;
      doorOpen?: boolean;
      mobileStart?: boolean;
      available?: boolean;
    }
  ): void {
    const washer = this.washers.get(base);
    if (!washer) return;
    if (patch.status !== undefined) washer.status = patch.status;
    if (patch.program !== undefined) washer.program = patch.program;
    if (patch.elapsedMin !== undefined) washer.elapsed = patch.elapsedMin;
    if (patch.totalMin !== undefined) washer.total = patch.totalMin;
    if (patch.doorOpen !== undefined) washer.doorOpen = patch.doorOpen;
    if (patch.mobileStart !== undefined) washer.mobileStart = patch.mobileStart;
    if (patch.available !== undefined) washer.available = patch.available;
    this.publish();
  }

  /** Find the washer owning one of its derived entity ids. */
  private washerByEntity(entity: string): WasherState | undefined {
    for (const washer of this.washers.values()) {
      const base = washer.spec.base;
      if (
        entity === `sensor.${base}` ||
        entity.startsWith(`sensor.${base}_`) ||
        entity.startsWith(`switch.${base}_`) ||
        entity.startsWith(`button.${base}_`) ||
        entity.startsWith(`binary_sensor.${base}_`)
      ) {
        return washer;
      }
    }
    return undefined;
  }

  private resetMedia(): void {
    this.mediaPlayers.clear();
    for (const spec of this.mediaPlayerSpecs) {
      this.mediaPlayers.set(spec.entity, {
        spec,
        state: spec.state ?? "off",
        position: spec.position ?? 0,
        positionStamp: new Date().toISOString(),
        volume: spec.volume ?? null,
        muted: spec.muted ?? false,
        source: spec.source ?? null,
        available: spec.available ?? true,
      });
    }
    this.remotes.clear();
    for (const spec of this.remoteSpecs) {
      this.remotes.set(spec.entity, { spec, on: spec.on ?? true });
    }
  }

  private resetFans(): void {
    this.fans.clear();
    for (const spec of this.fanSpecs) {
      this.fans.set(spec.entity, {
        spec,
        on: spec.on ?? false,
        percentage: spec.percentage ?? 40,
        presetMode: spec.presetMode ?? null,
        oscillating: spec.oscillating ?? false,
        available: spec.available ?? true,
      });
    }
    this.switches.clear();
    for (const spec of this.switchSpecs) {
      this.switches.set(spec.entity, { spec, on: spec.on ?? false });
    }
    this.sensors.clear();
    for (const spec of this.sensorSpecs) {
      this.sensors.set(spec.entity, { spec, value: spec.value });
    }
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
    // Music Assistant's read-only actions (library, search, queue) go to
    // their own log: ru-music-card issues them on its own schedule, and the
    // other cards' specs expect `calls` to hold only what they triggered.
    if (this.music?.isRead(domain, service)) {
      return this.music.read(service, data);
    }
    this.calls.push({ domain, service, data });
    if (
      this.music &&
      (domain === "music_assistant" ||
        (domain === "media_player" && this.music.owns(String(data?.entity_id))))
    ) {
      return this.music.call(domain, service, data);
    }
    const raw = data?.entity_id;
    const entities = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
    if (domain === "button" && service === "press") {
      for (const entity of entities) {
        const washer = this.washerByEntity(entity);
        if (!washer || !washer.available) continue;
        // Miele will not remote-start unless Mobile Start is armed.
        if (entity.endsWith("_start")) {
          if (!washer.mobileStart) continue;
          if (washer.status === "programmed" || washer.status === "pause") {
            washer.status = "in_use";
          }
        } else if (entity.endsWith("_pause")) {
          if (washer.status === "in_use") washer.status = "pause";
        } else if (entity.endsWith("_stop")) {
          if (washer.status === "in_use" || washer.status === "pause") {
            washer.status = "programmed";
            washer.elapsed = 0;
          }
        }
      }
      this.publish();
      return Promise.resolve();
    }
    if (domain === "miele" && service === "set_program") {
      const deviceId = data?.device_id;
      for (const washer of this.washers.values()) {
        if (washer.spec.deviceId !== deviceId || !washer.available) continue;
        // The real API takes an id; the mock only needs to prove the call is
        // routed, so it records it and arms the machine.
        washer.status = "programmed";
        washer.elapsed = 0;
      }
      this.publish();
      return Promise.resolve();
    }
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
    if (domain === "fan") {
      for (const entity of entities) {
        const fan = this.fans.get(entity);
        if (!fan || !fan.available) continue;
        switch (service) {
          case "turn_on":
            fan.on = true;
            break;
          case "turn_off":
            fan.on = false;
            break;
          case "set_percentage": {
            const pct = Number(data?.percentage ?? fan.percentage);
            fan.percentage = pct;
            fan.presetMode = null; // a set percentage means manual
            fan.on = pct > 0;
            break;
          }
          case "set_preset_mode":
            fan.presetMode = String(data?.preset_mode ?? "");
            fan.on = true;
            break;
          case "oscillate":
            fan.oscillating = data?.oscillating === true;
            break;
        }
      }
      this.publish();
    }
    if (domain === "switch") {
      for (const entity of entities) {
        // A washer's power switch is derived from its base, not a MockSwitch.
        const washer = entity.endsWith("_power")
          ? this.washerByEntity(entity)
          : undefined;
        if (washer && washer.available) {
          const turnOn =
            service === "turn_on" ||
            (service === "toggle" && washer.status === "off");
          washer.status = turnOn ? "programmed" : "off";
          washer.elapsed = 0;
          continue;
        }
        const sw = this.switches.get(entity);
        if (!sw) continue;
        switch (service) {
          case "turn_on":
            sw.on = true;
            break;
          case "turn_off":
            sw.on = false;
            break;
          case "toggle":
            sw.on = !sw.on;
            break;
        }
      }
      this.publish();
    }
    if (domain === "media_player") {
      for (const entity of entities) {
        const player = this.mediaPlayers.get(entity);
        if (!player || !player.available) continue;
        if (
          player.spec.powerKey &&
          (service === "turn_on" || service === "turn_off")
        ) {
          this.sendPowerKey(player, service === "turn_on");
          continue;
        }
        // Power and seek honor the simulated TV reaction lag — a real
        // Android TV takes seconds to act on them while volume/transport
        // feel instant. Lets tests observe the card's optimistic states.
        const lagged =
          this.reactionMs > 0 &&
          (service === "turn_on" ||
            service === "turn_off" ||
            service === "media_seek");
        if (lagged) {
          setTimeout(() => {
            this.applyMediaService(player, service, data);
            this.publish();
          }, this.reactionMs);
        } else {
          this.applyMediaService(player, service, data);
        }
      }
      this.publish();
    }
    if (domain === "remote") {
      // send_command only logs — key effects happen on a real TV. turn_on is
      // the exception: HA's androidtv_remote prefixes it with a POWER key
      // whenever it believes the device is off, activity or not.
      for (const entity of entities) {
        const player = this.remotes.get(entity)?.spec.player;
        const linked = player ? this.mediaPlayers.get(player) : undefined;
        if (service === "turn_on" && linked?.available) {
          this.sendPowerKey(linked, true);
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

  /** Models HA's POWER-key power handling: nothing is sent when the reported
   * state already matches the intent, and what *is* sent is a toggle landing
   * one reaction lag later. Two presses inside one lag window therefore leave
   * the TV off — turn it on, launch an app too early, and it dies. */
  private sendPowerKey(player: MediaPlayerState, on: boolean): void {
    if (player.state !== "off" === on) return;
    const flip = () => {
      player.state = player.state === "off" ? "on" : "off";
      this.publish();
    };
    if (this.reactionMs > 0) setTimeout(flip, this.reactionMs);
    else flip();
  }

  private applyMediaService(
    player: MediaPlayerState,
    service: string,
    data?: Record<string, unknown>
  ): void {
    const stamp = () => {
      player.positionStamp = new Date().toISOString();
    };
    switch (service) {
      case "turn_on":
        if (player.state === "off") player.state = "on";
        break;
      case "turn_off":
        player.state = "off";
        break;
      case "media_play_pause":
        if (player.state === "playing") {
          // Freeze the extrapolated position the way HA does on pause.
          player.position = Math.min(
            player.spec.duration ?? 0,
            player.position +
              (Date.now() - Date.parse(player.positionStamp)) / 1000
          );
          player.state = "paused";
        } else {
          player.state = "playing";
        }
        stamp();
        break;
      case "media_previous_track":
      case "media_next_track":
        player.position = 0;
        player.state = "playing";
        stamp();
        break;
      case "media_seek":
        player.position = Number(data?.seek_position ?? player.position);
        stamp();
        break;
      case "volume_set":
        player.volume = Number(data?.volume_level ?? player.volume ?? 0);
        break;
      case "volume_up":
        player.volume = Math.min(1, (player.volume ?? 0) + 0.05);
        break;
      case "volume_down":
        player.volume = Math.max(0, (player.volume ?? 0) - 0.05);
        break;
      case "volume_mute":
        player.muted = data?.is_volume_muted === true;
        break;
      case "select_source":
        if (typeof data?.source === "string") player.source = data.source;
        break;
    }
  }

  /**
   * The whole entity family the Miele integration exposes for one appliance.
   * Models which values HA reports in which state: a machine that is off or
   * merely programmed has no elapsed/remaining/finish readings at all.
   */
  private buildWasherEntities(
    washer: WasherState
  ): Record<string, HassEntity> {
    const base = washer.spec.base;
    const name = washer.spec.name;
    const states: Record<string, HassEntity> = {};

    // A real machine reports the spin/temperature of whatever programme is
    // selected, so the mock derives them rather than reporting one fixed pair.
    const perProgram: Record<string, { spin: number; temp: number }> = {
      cottons: { spin: 1400, temp: 40 },
      delicates: { spin: 600, temp: 30 },
      woollens: { spin: 1200, temp: 30 },
      quick_power_wash: { spin: 1200, temp: 40 },
      shirts: { spin: 600, temp: 40 },
    };
    const tuned = perProgram[washer.program];
    const spin = tuned?.spin ?? washer.spec.spin ?? 1400;
    const temperature = tuned?.temp ?? washer.spec.temperature ?? 40;

    const put = (
      entity: string,
      state: string,
      attributes: Record<string, unknown> = {}
    ): void => {
      states[entity] = {
        entity_id: entity,
        state: washer.available ? state : "unavailable",
        attributes: { friendly_name: name, ...attributes },
      };
    };

    const running = washer.status === "in_use" || washer.status === "pause";
    const on = washer.status !== "off";
    const remaining = Math.max(0, washer.total - washer.elapsed);
    const phase = !running
      ? "not_running"
      : washer.elapsed / washer.total < 0.08
        ? "pre_wash"
        : washer.elapsed / washer.total < 0.55
          ? "main_wash"
          : washer.elapsed / washer.total < 0.8
            ? "rinse"
            : "spin";

    put(`sensor.${base}`, washer.status);
    put(`sensor.${base}_program`, on ? washer.program : "no_program");
    put(`sensor.${base}_program_phase`, phase);
    put(
      `sensor.${base}_remaining_time`,
      running ? String(Math.round(remaining)) : "unknown",
      { device_class: "duration", unit_of_measurement: "min" }
    );
    put(
      `sensor.${base}_elapsed_time`,
      running ? String(Math.round(washer.elapsed)) : "unknown",
      { device_class: "duration", unit_of_measurement: "min" }
    );
    put(
      `sensor.${base}_finish`,
      running
        ? new Date(Date.now() + remaining * 60000).toISOString()
        : "unknown",
      { device_class: "timestamp" }
    );
    put(`sensor.${base}_spin_speed`, on ? String(spin) : "unknown", {
      unit_of_measurement: "rpm",
    });
    put(
      `sensor.${base}_target_temperature`,
      on ? String(temperature) : "unknown",
      { device_class: "temperature", unit_of_measurement: "°C" }
    );
    put(`switch.${base}_power`, on ? "on" : "off");
    put(`binary_sensor.${base}_door`, washer.doorOpen ? "on" : "off", {
      device_class: "door",
    });
    put(
      `binary_sensor.${base}_mobile_start`,
      washer.mobileStart ? "on" : "off"
    );
    // Buttons have no meaningful state; HA reports the last press timestamp.
    for (const action of ["start", "pause", "stop"]) {
      put(`button.${base}_${action}`, "unknown", { device_class: "restart" });
    }

    return states;
  }

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
    for (const fan of this.fans.values()) {
      states[fan.spec.entity] = this.buildFanEntity(fan);
    }
    for (const sw of this.switches.values()) {
      states[sw.spec.entity] = {
        entity_id: sw.spec.entity,
        state: sw.on ? "on" : "off",
        attributes: { friendly_name: sw.spec.name },
      };
    }
    for (const player of this.mediaPlayers.values()) {
      states[player.spec.entity] = this.buildMediaPlayerEntity(player);
    }
    for (const washer of this.washers.values()) {
      Object.assign(states, this.buildWasherEntities(washer));
    }
    for (const door of this.doors.values()) {
      states[door.spec.entity] = {
        entity_id: door.spec.entity,
        state: door.available ? (door.open ? "on" : "off") : "unavailable",
        last_changed: door.lastChanged,
        attributes: { friendly_name: door.spec.name, device_class: "door" },
      };
    }
    for (const ts of this.timestamps.values()) {
      states[ts.spec.entity] = {
        entity_id: ts.spec.entity,
        state: ts.iso ?? "unavailable",
        attributes: { friendly_name: ts.spec.name, device_class: "timestamp" },
      };
    }
    for (const person of this.people.values()) {
      states[person.spec.entity] = {
        entity_id: person.spec.entity,
        state: person.state,
        attributes: { friendly_name: person.spec.name },
      };
    }
    for (const remote of this.remotes.values()) {
      // A linked remote reports its player's power — androidtv_remote backs
      // both entities with one cached is_on, lag included.
      const linked = remote.spec.player
        ? this.mediaPlayers.get(remote.spec.player)
        : undefined;
      states[remote.spec.entity] = {
        entity_id: remote.spec.entity,
        state: linked
          ? !linked.available
            ? "unavailable"
            : linked.state === "off"
              ? "off"
              : "on"
          : remote.on
            ? "on"
            : "off",
        attributes: { friendly_name: remote.spec.name },
      };
    }
    for (const sensor of this.sensors.values()) {
      states[sensor.spec.entity] = {
        entity_id: sensor.spec.entity,
        state: String(sensor.value),
        attributes: {
          friendly_name: sensor.spec.name,
          unit_of_measurement: sensor.spec.unit ?? "µg/m³",
        },
      };
    }
    if (this.music) Object.assign(states, this.music.entities());
    return {
      states,
      themes: { darkMode: this.darkMode },
      user: { is_admin: this.admin },
      // A fixed profile so date/time lines render the same on any machine.
      locale: { language: "en", date_format: "DMY", time_format: "24" },
      entities: this.registryEntities,
      devices: this.registryDevices,
      callService: this.callService,
      ...(this.music
        ? {
            callWS: <T>(message: Record<string, unknown>) =>
              this.music!.callWS(message) as Promise<T>,
          }
        : {}),
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

  private buildFanEntity(fan: FanState): HassEntity {
    if (!fan.available) {
      return {
        entity_id: fan.spec.entity,
        state: "unavailable",
        attributes: { friendly_name: fan.spec.name },
      };
    }
    return {
      entity_id: fan.spec.entity,
      state: fan.on ? "on" : "off",
      attributes: {
        friendly_name: fan.spec.name,
        // HA reports percentage 0 and no preset while the fan is off.
        percentage: fan.on ? fan.percentage : 0,
        percentage_step: fan.spec.percentageStep ?? 10,
        ...(fan.spec.presetModes
          ? {
              preset_modes: fan.spec.presetModes,
              preset_mode: fan.on ? fan.presetMode : null,
            }
          : {}),
        ...(fan.spec.supportsOscillation !== false
          ? { oscillating: fan.oscillating }
          : {}),
      },
    };
  }

  private buildMediaPlayerEntity(player: MediaPlayerState): HassEntity {
    if (!player.available) {
      return {
        entity_id: player.spec.entity,
        state: "unavailable",
        attributes: { friendly_name: player.spec.name },
      };
    }
    const off = player.state === "off";
    return {
      entity_id: player.spec.entity,
      state: player.state,
      attributes: {
        friendly_name: player.spec.name,
        supported_features: player.spec.features,
        // HA drops app/media/volume attributes while the player is off.
        ...(off
          ? {}
          : {
              ...(player.spec.appId ? { app_id: player.spec.appId } : {}),
              ...(player.spec.appName
                ? { app_name: player.spec.appName }
                : {}),
              ...(player.spec.title && player.spec.duration
                ? {
                    media_title: player.spec.title,
                    media_duration: player.spec.duration,
                    media_position: player.position,
                    media_position_updated_at: player.positionStamp,
                  }
                : {}),
              ...(player.volume !== null
                ? {
                    volume_level: player.volume,
                    is_volume_muted: player.muted,
                  }
                : {}),
              ...(player.spec.sourceList
                ? {
                    source_list: player.spec.sourceList,
                    ...(player.source ? { source: player.source } : {}),
                  }
                : {}),
            }),
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
