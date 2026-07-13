/**
 * Pure derivation of display state from cover entities — no DOM, no services.
 * Positions follow HA's cover convention: 0 = closed, 100 = open.
 */

import type {
  CoverConfig,
  HomeAssistant,
  PresetConfig,
  RoomConfig,
} from "../../types";

/** CoverEntityFeature.SET_POSITION */
const SUPPORT_SET_POSITION = 4;

/** Tolerance (in %) when deciding whether covers sit at a preset position. */
const PRESET_TOLERANCE = 2;

export interface CoverView {
  entity: string;
  name: string;
  available: boolean;
  /** Entity supports cover.set_cover_position and reports a position. */
  supportsPosition: boolean;
  /** 0 (closed) … 100 (open), or null when the entity reports no position. */
  position: number | null;
  moving: boolean;
  statusWord: string;
}

export interface RoomView {
  config: RoomConfig;
  covers: CoverView[];
  /** Only the available covers — service calls and summaries use these. */
  active: CoverView[];
  anyMoving: boolean;
  allClosed: boolean;
  statusText: string;
}

export function buildCoverView(
  hass: HomeAssistant,
  config: CoverConfig
): CoverView {
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
      supportsPosition: false,
      position: null,
      moving: false,
      statusWord: "Unavailable",
    };
  }

  const features = Number(stateObj.attributes.supported_features ?? 0);
  const rawPosition = stateObj.attributes.current_position;
  const position =
    typeof rawPosition === "number"
      ? Math.min(100, Math.max(0, rawPosition))
      : null;
  const opening = stateObj.state === "opening";
  const closing = stateObj.state === "closing";

  let statusWord: string;
  if (opening) statusWord = "Opening…";
  else if (closing) statusWord = "Closing…";
  else if (position !== null) {
    statusWord =
      position >= 99 ? "Open" : position <= 1 ? "Closed" : "Partly open";
  } else {
    statusWord = stateObj.state === "closed" ? "Closed" : "Open";
  }

  return {
    entity: config.entity,
    name,
    available: true,
    supportsPosition:
      (features & SUPPORT_SET_POSITION) !== 0 && position !== null,
    position,
    moving: opening || closing,
    statusWord,
  };
}

function isOpen(cover: CoverView): boolean {
  return cover.position !== null
    ? cover.position > 1
    : cover.statusWord === "Open";
}

function isClosed(cover: CoverView): boolean {
  return cover.position !== null
    ? cover.position <= 1
    : cover.statusWord === "Closed";
}

export function buildRoomView(
  hass: HomeAssistant,
  config: RoomConfig
): RoomView {
  const covers = config.covers.map((cover) => buildCoverView(hass, cover));
  const active = covers.filter((cover) => cover.available);
  const anyMoving = active.some((cover) => cover.moving);
  const allOpen =
    active.length > 0 &&
    active.every((cover) =>
      cover.position !== null ? cover.position >= 99 : cover.statusWord === "Open"
    );
  const allClosed = active.length > 0 && active.every(isClosed);
  const openCount = active.filter(isOpen).length;

  let statusText: string;
  if (active.length === 0) statusText = "Unavailable";
  else if (anyMoving) statusText = "Moving…";
  else if (allOpen) statusText = active.length > 1 ? "All open" : "Open";
  else if (allClosed) statusText = active.length > 1 ? "All closed" : "Closed";
  else if (active.length > 1)
    statusText = `${openCount} of ${active.length} open`;
  else statusText = "Partly open";

  return { config, covers, active, anyMoving, allClosed, statusText };
}

export function summaryText(rooms: RoomView[]): string {
  const covers = rooms.flatMap((room) => room.active);
  if (covers.length === 0) return "Unavailable";
  const movingCount = covers.filter((cover) => cover.moving).length;
  if (movingCount > 0) return `${movingCount} moving…`;
  const openCount = covers.filter(isOpen).length;
  if (openCount === covers.length) return "All open";
  if (openCount === 0) return "All closed";
  return `${openCount} of ${covers.length} open`;
}

/**
 * A preset counts as active when nothing moves and every available,
 * position-reporting cover sits within tolerance of the preset position.
 * Computed live from entity state — nothing to get stale.
 */
export function presetActive(
  preset: PresetConfig,
  rooms: RoomView[]
): boolean {
  const covers = rooms.flatMap((room) => room.active);
  const positional = covers.filter((cover) => cover.position !== null);
  return (
    positional.length > 0 &&
    covers.every((cover) => !cover.moving) &&
    positional.every(
      (cover) => Math.abs(cover.position! - preset.position) <= PRESET_TOLERANCE
    )
  );
}
