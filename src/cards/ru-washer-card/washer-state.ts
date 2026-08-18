/**
 * View model for ru-washer-card — pure derivation from hass state, no DOM and
 * no service calls, so it can be reasoned about (and tested) on its own.
 *
 * Modelled on the Miele integration's entity set. Deliberately tolerant: every
 * entity except the status sensor is optional, and a missing one drops its row
 * rather than breaking the card.
 */

import type { HassEntity, HomeAssistant, WasherCardConfig } from "../../types";

/** The machine's status, collapsed from the 19-value Miele enum. */
export type WasherStatus =
  | "off"
  | "offline"
  | "idle"
  | "programmed"
  | "running"
  | "paused"
  | "finished"
  | "problem";

/** Miele's raw enum → the handful of states the card actually renders
 * differently. Anything unlisted falls back to "idle". */
const STATUS_MAP: Record<string, WasherStatus> = {
  off: "off",
  not_connected: "offline",
  on: "idle",
  idle: "idle",
  programmed: "programmed",
  waiting_to_start: "programmed",
  in_use: "running",
  autocleaning: "running",
  pause: "paused",
  rinse_hold: "paused",
  program_ended: "finished",
  program_interrupted: "finished",
  failure: "problem",
  service: "problem",
};

const STATUS_NAMES: Record<WasherStatus, string> = {
  off: "Off",
  offline: "Not connected",
  idle: "On",
  programmed: "Ready to start",
  running: "In use",
  paused: "Paused",
  finished: "Programme ended",
  problem: "Fault",
};

/** A numeric readout (spin speed, temperature). Mirrors the purifier card's
 * SensorView so the two cards report missing entities the same way. */
export interface WasherSensorView {
  configured: boolean;
  value: number | null;
  /** "missing" means the configured entity does not exist — worth warning
   * about; "unavailable" is ordinary runtime state and stays quiet. */
  status: "ok" | "missing" | "unavailable";
  text: string;
}

export interface WasherPresetView {
  name: string;
  icon: string | null;
  programId: number;
  /** "600 rpm · 30 °C", or "" when the preset carries neither. */
  meta: string;
  active: boolean;
}

export interface WasherView {
  entity: string;
  name: string;
  available: boolean;
  status: WasherStatus;
  statusText: string;
  summaryText: string;
  /** Powered on in any sense — false only when off or disconnected. */
  on: boolean;
  running: boolean;
  hasPower: boolean;
  powerOn: boolean;
  /** A programme is selected — its name and phase render even before the
   * machine starts and after it has finished. */
  hasProgram: boolean;
  /** That programme is under way and has a duration — progress and the
   * countdown render. */
  hasCycle: boolean;
  programName: string;
  phaseName: string;
  progressPct: number;
  elapsedText: string;
  remainingText: string;
  /** "Finishes 14:35", or null when nothing is running. */
  finishText: string | null;
  doorConfigured: boolean;
  doorOpen: boolean;
  doorText: string;
  spin: WasherSensorView;
  temperature: WasherSensorView;
  hasControls: boolean;
  canStart: boolean;
  canPause: boolean;
  canStop: boolean;
  /** Set when a control is disabled for a reason worth explaining. */
  blockedReason: string | null;
  presets: WasherPresetView[];
}

/** "1h 50m" above the hour, "12m" below — a wash cycle runs for hours, so the
 * TV card's m:ss formatting is the wrong shape here. */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  return hours
    ? `${hours}h ${String(minutes % 60).padStart(2, "0")}m`
    : `${minutes}m`;
}

/** Wall-clock HH:MM, used for the "Finishes …" label. */
export function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

/** "quick_power_wash" → "Quick power wash". HA translates these enum values in
 * its own frontend; the card only has the raw value, so it humanises. */
export function humanise(raw: string): string {
  const text = raw.replace(/_/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function isAvailable(stateObj: HassEntity | undefined): boolean {
  return (
    !!stateObj &&
    stateObj.state !== "unavailable" &&
    stateObj.state !== "unknown"
  );
}

/** Read an optional numeric sensor into a WasherSensorView. */
function readSensor(
  hass: HomeAssistant,
  entity: string | undefined,
  unit: string
): WasherSensorView {
  if (!entity) {
    return { configured: false, value: null, status: "ok", text: "—" };
  }
  const stateObj = hass.states[entity];
  if (!stateObj) {
    return { configured: true, value: null, status: "missing", text: "—" };
  }
  const value = Number(stateObj.state);
  if (!isAvailable(stateObj) || !Number.isFinite(value)) {
    return { configured: true, value: null, status: "unavailable", text: "—" };
  }
  const suffix = stateObj.attributes.unit_of_measurement ?? unit;
  return {
    configured: true,
    value,
    status: "ok",
    text: `${Math.round(value)} ${suffix}`.trim(),
  };
}

/** Numeric state of an optional sensor, or null when absent/unavailable. */
function readNumber(
  hass: HomeAssistant,
  entity: string | undefined
): number | null {
  if (!entity) return null;
  const stateObj = hass.states[entity];
  if (!isAvailable(stateObj)) return null;
  const value = Number(stateObj!.state);
  return Number.isFinite(value) ? value : null;
}

/** Enum state of an optional sensor, or null. Miele reports "no_program" and
 * "not_running" as real values — those are treated as absent. */
function readEnum(
  hass: HomeAssistant,
  entity: string | undefined
): string | null {
  if (!entity) return null;
  const stateObj = hass.states[entity];
  if (!isAvailable(stateObj)) return null;
  const value = stateObj!.state;
  return value === "no_program" || value === "not_running" ? null : value;
}

function isOn(hass: HomeAssistant, entity: string | undefined): boolean {
  if (!entity) return false;
  return hass.states[entity]?.state === "on";
}

export function buildWasherView(
  hass: HomeAssistant,
  config: WasherCardConfig,
  nowMs: number
): WasherView {
  const stateObj = hass.states[config.entity];
  const name =
    config.name ?? stateObj?.attributes.friendly_name ?? config.entity;
  const available = isAvailable(stateObj);
  const status: WasherStatus = available
    ? (STATUS_MAP[stateObj!.state] ?? "idle")
    : "offline";

  const on = available && status !== "off" && status !== "offline";
  const running = status === "running";
  const finished = status === "finished";

  // Remaining time: the finish timestamp ticks every second, the minutes
  // sensor only moves when HA polls Miele. Prefer the timestamp and fall back.
  const finishObj = config.finish_entity
    ? hass.states[config.finish_entity]
    : undefined;
  const finishMs =
    isAvailable(finishObj) && finishObj
      ? Date.parse(finishObj.state)
      : Number.NaN;
  const hasFinish = Number.isFinite(finishMs);
  const remainingFromClock = hasFinish ? (finishMs - nowMs) / 60000 : null;
  const remainingFromSensor = readNumber(hass, config.remaining_entity);
  const remainingMin =
    remainingFromClock !== null
      ? Math.max(0, remainingFromClock)
      : remainingFromSensor;
  const elapsedMin = readNumber(hass, config.elapsed_entity);

  const total =
    elapsedMin !== null && remainingMin !== null ? elapsedMin + remainingMin : 0;
  const hasCycle = on && total > 0 && (running || status === "paused");
  const progressPct =
    total > 0 ? Math.min(100, Math.max(0, (elapsedMin! / total) * 100)) : 0;

  const programRaw = readEnum(hass, config.program_entity);
  const phaseRaw = readEnum(hass, config.phase_entity);

  const statusText = STATUS_NAMES[status];
  const programName = programRaw ? humanise(programRaw) : "No programme";
  const phaseName = finished
    ? "Finished"
    : phaseRaw
      ? humanise(phaseRaw)
      : statusText;

  const summaryText = !available
    ? "Unavailable"
    : programRaw && on
      ? `${statusText} · ${humanise(programRaw)}`
      : statusText;

  const doorConfigured = !!config.door_entity && !!hass.states[config.door_entity];
  const doorOpen = isOn(hass, config.door_entity);

  // Miele refuses a remote start unless Mobile Start is armed on the machine.
  const mobileConfigured =
    !!config.mobile_start_entity && !!hass.states[config.mobile_start_entity];
  const mobileArmed = isOn(hass, config.mobile_start_entity);

  const hasStart = !!config.start_entity && !!hass.states[config.start_entity];
  const hasPause = !!config.pause_entity && !!hass.states[config.pause_entity];
  const hasStop = !!config.stop_entity && !!hass.states[config.stop_entity];

  const startable = on && (status === "programmed" || status === "paused");
  const canStart =
    hasStart && available && startable && (!mobileConfigured || mobileArmed);
  const canPause = hasPause && available && running;
  const canStop = hasStop && available && (running || status === "paused");

  const blockedReason =
    hasStart && startable && mobileConfigured && !mobileArmed
      ? "Mobile Start is not armed — press Start on the machine to allow a remote start."
      : doorConfigured && doorOpen && startable
        ? "The door is open."
        : null;

  const presets: WasherPresetView[] = (config.presets ?? []).map((preset) => {
    const parts: string[] = [];
    if (preset.spin !== undefined) parts.push(`${preset.spin} rpm`);
    if (preset.temperature !== undefined) parts.push(`${preset.temperature} °C`);
    return {
      name: preset.name,
      icon: preset.icon ?? null,
      programId: preset.program_id,
      meta: parts.join(" · "),
      // Matching needs the enum value: the sensor reports names while
      // set_program takes ids, so a preset without `program` never lights up.
      active: !!preset.program && preset.program === programRaw,
    };
  });

  return {
    entity: config.entity,
    name,
    available,
    status,
    statusText,
    summaryText,
    on,
    running,
    hasPower: !!config.power_entity && !!hass.states[config.power_entity],
    powerOn: isOn(hass, config.power_entity),
    hasProgram: on && !!programRaw,
    hasCycle,
    programName: on ? programName : "No programme",
    phaseName,
    progressPct,
    elapsedText:
      hasCycle && elapsedMin !== null
        ? `${formatDuration(elapsedMin)} elapsed`
        : "—",
    remainingText: finished
      ? "Done"
      : hasCycle && remainingMin !== null
        ? `${formatDuration(remainingMin)} left`
        : "—",
    finishText:
      hasCycle && hasFinish && !finished
        ? `Finishes ${formatClock(new Date(finishMs))}`
        : null,
    doorConfigured,
    doorOpen,
    doorText: doorOpen ? "Door open" : "Door closed",
    spin: readSensor(hass, config.spin_speed_entity, "rpm"),
    temperature: readSensor(hass, config.temperature_entity, "°C"),
    hasControls: hasStart || hasPause || hasStop,
    canStart,
    canPause,
    canStop,
    blockedReason,
    presets,
  };
}
