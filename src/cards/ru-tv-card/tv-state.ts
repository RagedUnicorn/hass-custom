/**
 * Pure derivation of display state from the TV's media_player entities — no
 * DOM, no services. The card spans two entities because Android TVs surface
 * as two media players: the androidtv_remote one owns power/app/volume-step,
 * the cast one owns now-playing detail (title, position, seek, volume-set).
 * Everything is feature-detected from `supported_features`, so a config with
 * only the androidtv entity still renders a sensible card.
 */

import type { HassEntity, HomeAssistant, TvCardConfig } from "../../types";

// MediaPlayerEntityFeature bits (HA convention).
const FEATURE_PAUSE = 1;
const FEATURE_SEEK = 2;
const FEATURE_VOLUME_SET = 4;
const FEATURE_VOLUME_MUTE = 8;
const FEATURE_PREVIOUS_TRACK = 16;
const FEATURE_NEXT_TRACK = 32;
const FEATURE_VOLUME_STEP = 1024;
const FEATURE_PLAY = 16384;

export interface TvAppView {
  name: string;
  color: string;
  /** Chip icon: an image URL or an `mdi:*`/`ru:*` ref (dark-mode variant
   * already resolved), or null → color dot. */
  icon: string | null;
  activity: string | null;
  /** TV input the chip selects instead of launching an app, or null. */
  source: string | null;
  active: boolean;
}

export interface TvVolumeView {
  /** slider = VOLUME_SET with a live level; steppers = VOLUME_STEP only. */
  kind: "slider" | "steppers" | "none";
  /** Entity the volume/mute services target. */
  entity: string | null;
  /** Volume percent 0…100, or null when the entity reports no level. */
  pct: number | null;
  muted: boolean;
  supportsMute: boolean;
  /** False while a configured volume_entity is unavailable — the row
   * renders disabled instead of retargeting another entity. */
  available: boolean;
}

export interface TvMediaView {
  entity: string;
  /** A track with a duration is loaded — progress/transport render. */
  hasTrack: boolean;
  playing: boolean;
  title: string;
  appName: string;
  /** Live position in seconds (extrapolated while playing). */
  position: number;
  /** Track length in seconds. */
  duration: number;
  progressPct: number;
  posText: string;
  durText: string;
  supportsSeek: boolean;
  supportsPlayPause: boolean;
  supportsPrevNext: boolean;
}

export interface TvView {
  entity: string;
  name: string;
  available: boolean;
  on: boolean;
  statusText: string;
  summaryText: string;
  /** null when no media_entity is configured. */
  media: TvMediaView | null;
  volume: TvVolumeView;
  apps: TvAppView[];
  /** Dot color of the active app, or null when none matches. */
  activeColor: string | null;
  hasRemote: boolean;
}

const OFF_STATES = new Set(["off", "unavailable", "unknown"]);

function features(stateObj: HassEntity | undefined): number {
  return typeof stateObj?.attributes.supported_features === "number"
    ? stateObj.attributes.supported_features
    : 0;
}

function isAvailable(stateObj: HassEntity | undefined): boolean {
  return (
    !!stateObj &&
    stateObj.state !== "unavailable" &&
    stateObj.state !== "unknown"
  );
}

/** The TV counts as on in any available, non-off state (idle/playing/…). */
export function isTvOn(stateObj: HassEntity | undefined): boolean {
  return isAvailable(stateObj) && !OFF_STATES.has(stateObj!.state);
}

/** True when an app `icon` is an icon reference (`mdi:youtube`, `ru:shelly`)
 * rather than an image URL — refs have a set-prefix colon and no slashes,
 * while URLs (`/local/…`, `https://…`, `data:image/…`) always contain one. */
export function isIconRef(icon: string): boolean {
  return icon.includes(":") && !icon.includes("/");
}

/** m:ss below an hour, h:mm:ss above — mirrors the design mock. */
export function formatTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Position extrapolated to `nowMs` while playing (HA only re-reports it on
 * state changes), clamped to the track length. */
export function livePosition(
  stateObj: HassEntity,
  playing: boolean,
  nowMs: number
): number {
  const position = stateObj.attributes.media_position ?? 0;
  const duration = stateObj.attributes.media_duration ?? 0;
  const updatedAt = stateObj.attributes.media_position_updated_at;
  const elapsed =
    playing && updatedAt ? (nowMs - Date.parse(updatedAt)) / 1000 : 0;
  return Math.min(duration, Math.max(0, position + Math.max(0, elapsed)));
}

function buildMediaView(
  hass: HomeAssistant,
  entity: string,
  nowMs: number
): TvMediaView {
  const stateObj = hass.states[entity];
  const supported = features(stateObj);
  const playing = stateObj?.state === "playing";
  const duration = stateObj?.attributes.media_duration ?? 0;
  const title = stateObj?.attributes.media_title ?? "";
  const hasTrack = isAvailable(stateObj) && duration > 0 && title !== "";
  const position = stateObj && hasTrack
    ? livePosition(stateObj, playing, nowMs)
    : 0;

  return {
    entity,
    hasTrack,
    playing,
    title,
    appName: stateObj?.attributes.app_name ?? "",
    position,
    duration,
    progressPct: duration > 0 ? (position / duration) * 100 : 0,
    posText: formatTime(position),
    durText: formatTime(duration),
    supportsSeek: (supported & FEATURE_SEEK) !== 0,
    supportsPlayPause:
      (supported & (FEATURE_PAUSE | FEATURE_PLAY)) !== 0,
    supportsPrevNext:
      (supported & (FEATURE_PREVIOUS_TRACK | FEATURE_NEXT_TRACK)) !== 0,
  };
}

/** Prefer a live volume slider (VOLUME_SET) from either entity, then step
 * buttons; mute rides whatever entity was picked. `volume_mode: steppers`
 * skips the slider — needed on Android 12+ TVs whose cast entity claims
 * VOLUME_SET but only ever moves one step per call — and `slider` skips the
 * stepper fallback. The % readout reads volume_level from any candidate, so
 * steppers driving the androidtv entity still show the cast entity's level.
 *
 * An explicit `volume_entity` is authoritative: it exists because it's the
 * only entity whose services really move the room's audio (e.g. a Sonos
 * soundbar on ARC, or braviatv's absolute REST volume). While it's
 * unavailable the row renders disabled rather than silently retargeting the
 * cast/androidtv entity — an Android 12+ cast entity ignores absolute
 * volume_set until an external app changes the volume once, so a silent
 * fallback reads as "the card's volume is broken". */
function buildVolumeView(
  primary: HassEntity | undefined,
  media: HassEntity | undefined,
  volume: HassEntity | undefined,
  volumeEntityId: string | undefined,
  mode: "auto" | "slider" | "steppers"
): TvVolumeView {
  if (volumeEntityId) {
    const available = isAvailable(volume);
    const supported = features(volume);
    const kind: TvVolumeView["kind"] =
      mode === "steppers" ||
      (mode === "auto" &&
        available &&
        (supported & FEATURE_VOLUME_SET) === 0 &&
        (supported & FEATURE_VOLUME_STEP) !== 0)
        ? "steppers"
        : "slider";
    const level = available
      ? [volume, media, primary].find(
          (stateObj) => typeof stateObj?.attributes.volume_level === "number"
        )?.attributes.volume_level
      : undefined;
    return {
      kind,
      entity: volumeEntityId,
      pct: typeof level === "number" ? Math.round(level * 100) : null,
      muted: volume?.attributes.is_volume_muted === true,
      supportsMute: available && (supported & FEATURE_VOLUME_MUTE) !== 0,
      available,
    };
  }

  const candidates = [media, primary].filter(
    (stateObj): stateObj is HassEntity => !!stateObj
  );
  const bySet =
    mode === "steppers"
      ? undefined
      : candidates.find(
          (stateObj) => (features(stateObj) & FEATURE_VOLUME_SET) !== 0
        );
  const byStep =
    mode === "slider"
      ? undefined
      : candidates.find(
          (stateObj) => (features(stateObj) & FEATURE_VOLUME_STEP) !== 0
        );
  const picked = bySet ?? byStep;
  if (!picked) {
    return {
      kind: "none",
      entity: null,
      pct: null,
      muted: false,
      supportsMute: false,
      available: false,
    };
  }
  const withLevel = [picked, ...candidates].find(
    (stateObj) => typeof stateObj.attributes.volume_level === "number"
  );
  const level = withLevel?.attributes.volume_level;
  return {
    kind: bySet ? "slider" : "steppers",
    entity: picked.entity_id,
    pct: typeof level === "number" ? Math.round(level * 100) : null,
    muted: picked.attributes.is_volume_muted === true,
    supportsMute: (features(picked) & FEATURE_VOLUME_MUTE) !== 0,
    available: true,
  };
}

export function buildTvView(
  hass: HomeAssistant,
  config: TvCardConfig,
  nowMs: number,
  /** Optimistic power target while a turn_on/off is in flight, else null —
   * overrides the status/summary text with "Turning on…"/"Turning off…". */
  pendingPower: boolean | null = null
): TvView {
  const stateObj = hass.states[config.entity];
  const mediaObj = config.media_entity
    ? hass.states[config.media_entity]
    : undefined;
  const available = isAvailable(stateObj);
  const on = isTvOn(stateObj);

  const media = config.media_entity
    ? buildMediaView(hass, config.media_entity, nowMs)
    : null;

  // Active app: the androidtv app_id is a package name, the cast app_id an
  // opaque cast id — match config app_id against both, and the config name
  // against the cast's human app_name as a fallback.
  const appIds = new Set(
    [stateObj?.attributes.app_id, mediaObj?.attributes.app_id].filter(
      (id): id is string => typeof id === "string"
    )
  );
  const mediaAppName = mediaObj?.attributes.app_name?.toLowerCase() ?? "";
  const sourceObj = config.source_entity
    ? hass.states[config.source_entity]
    : undefined;
  const currentSource =
    (sourceObj ?? stateObj)?.attributes.source?.toLowerCase() ?? "";
  const darkMode = hass.themes?.darkMode ?? false;
  const apps: TvAppView[] = (config.apps ?? []).map((app) => ({
    name: app.name,
    color: app.color ?? "#8a90a0",
    icon: (darkMode ? (app.icon_dark ?? app.icon) : app.icon) ?? null,
    activity: app.activity ?? null,
    source: app.source ?? null,
    active:
      on &&
      ((app.app_id !== undefined && appIds.has(app.app_id)) ||
        (mediaAppName !== "" && app.name.toLowerCase() === mediaAppName) ||
        (app.source !== undefined &&
          currentSource !== "" &&
          app.source.toLowerCase() === currentSource)),
  }));
  const activeColor = apps.find((app) => app.active)?.color ?? null;

  const appName =
    media?.appName || apps.find((app) => app.active)?.name || "";
  const playState = media?.hasTrack
    ? media.playing
      ? "Playing"
      : "Paused"
    : null;
  const pending = available && pendingPower !== null && pendingPower !== on;
  const pendingText = pendingPower ? "Turning on…" : "Turning off…";
  const statusText = !available
    ? "Unavailable"
    : pending
      ? pendingText
      : !on
        ? "Off"
        : playState
          ? `${playState}${appName ? ` · ${appName}` : ""}`
          : appName
            ? `On · ${appName}`
            : "On";
  const summaryText = !available
    ? "Unavailable"
    : pending
      ? pendingText
      : !on
        ? "Off"
        : playState === "Playing"
          ? `Playing${appName ? ` · ${appName}` : ""}`
          : (playState ?? "On");

  return {
    entity: config.entity,
    name: config.name ?? stateObj?.attributes.friendly_name ?? config.entity,
    available,
    on,
    statusText,
    summaryText,
    media,
    volume: buildVolumeView(
      stateObj,
      mediaObj,
      config.volume_entity ? hass.states[config.volume_entity] : undefined,
      config.volume_entity,
      config.volume_mode ?? "auto"
    ),
    apps,
    activeColor,
    hasRemote: !!config.remote_entity,
  };
}
