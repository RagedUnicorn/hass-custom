/**
 * Pure state logic for ru-last-seen-card: a "last seen" timestamp in, a
 * freshness status and display texts out. No DOM, no Lit.
 */

import { sinceText } from "../../time";
import type { HomeAssistant, LastSeenCardConfig } from "../../types";

/**
 * fresh   — seen within warn_after_hours                → green
 * stale   — seen within alert_after_hours, not warn     → yellow
 * dead    — not seen for alert_after_hours or longer    → red
 * unknown — no usable timestamp (missing / unavailable) → grey
 */
export type Freshness = "fresh" | "stale" | "dead" | "unknown";

export const DEFAULT_WARN_AFTER_HOURS = 2;
export const DEFAULT_ALERT_AFTER_HOURS = 24;

const HOUR_MS = 3_600_000;

export function freshness(
  lastSeenIso: string | undefined,
  now: number,
  warnAfterHours: number,
  alertAfterHours: number
): Freshness {
  if (!lastSeenIso) return "unknown";
  const then = Date.parse(lastSeenIso);
  if (Number.isNaN(then)) return "unknown";
  const ageMs = Math.max(0, now - then);
  if (ageMs >= alertAfterHours * HOUR_MS) return "dead";
  if (ageMs >= warnAfterHours * HOUR_MS) return "stale";
  return "fresh";
}

export interface LastSeenRowView {
  entity: string;
  name: string;
  status: Freshness;
  statusText: string;
  /** Exact local time for the hover title, or "" when unknown. */
  exactText: string;
}

export interface LastSeenView {
  rows: LastSeenRowView[];
  summaryText: string;
  /** The worst status across rows — colors the summary. */
  worst: Freshness;
}

const SEVERITY: Record<Freshness, number> = {
  fresh: 0,
  unknown: 1,
  stale: 2,
  dead: 3,
};

function statusText(status: Freshness, since: string): string {
  switch (status) {
    case "fresh":
      return since === "just now" ? "Seen just now" : `Seen ${since} ago`;
    case "stale":
    case "dead":
      return `Not seen for ${since}`;
    default:
      return "No last-seen time";
  }
}

export function buildLastSeenView(
  hass: HomeAssistant,
  config: LastSeenCardConfig,
  now: number
): LastSeenView {
  const warn = config.warn_after_hours ?? DEFAULT_WARN_AFTER_HOURS;
  const alert = config.alert_after_hours ?? DEFAULT_ALERT_AFTER_HOURS;

  const rows = config.entities.map((row): LastSeenRowView => {
    const entity = hass.states[row.entity];
    const iso = entity?.state;
    const status = freshness(iso, now, warn, alert);
    const parsed = status === "unknown" ? NaN : Date.parse(iso!);
    return {
      entity: row.entity,
      name: row.name ?? entity?.attributes.friendly_name ?? row.entity,
      status,
      statusText: statusText(status, sinceText(iso, now)),
      exactText: Number.isNaN(parsed) ? "" : new Date(parsed).toLocaleString(),
    };
  });

  const worst = rows.reduce<Freshness>(
    (acc, row) => (SEVERITY[row.status] > SEVERITY[acc] ? row.status : acc),
    "fresh"
  );
  const notFresh = rows.filter((row) => row.status !== "fresh").length;
  const summaryText =
    rows.length === 0
      ? ""
      : notFresh === 0
        ? "All reporting"
        : `${notFresh} of ${rows.length} not reporting`;

  return { rows, summaryText, worst };
}
