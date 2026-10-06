/**
 * Pure state logic for ru-doors-card: one contact sensor plus one presence
 * entity in, a status and display texts out. No DOM, no Lit — testable on its
 * own and shared by the card's render.
 */

import { sinceText } from "../../time";
import type { DoorsCardConfig, HomeAssistant } from "../../types";

/**
 * closed    — contact reads off                  → green
 * open-home — contact on, presence reads `home`   → yellow
 * open-away — contact on, presence anything else  → red
 * unknown   — contact unavailable/unknown/missing → grey
 */
export type DoorStatus = "closed" | "open-home" | "open-away" | "unknown";

/**
 * Presence decides only between yellow and red. Anything but an explicit
 * `home` counts as away — a zone name, not_home, and also an unknown or
 * missing presence entity: when the card can't tell, it shows the alarming
 * color rather than the reassuring one.
 */
export function doorStatus(
  contactState: string | undefined,
  presenceState: string | undefined
): DoorStatus {
  if (contactState === "off") return "closed";
  if (contactState !== "on") return "unknown";
  return presenceState === "home" ? "open-home" : "open-away";
}

const STATUS_TEXT: Record<DoorStatus, string> = {
  closed: "Closed",
  "open-home": "Open",
  "open-away": "Open, you're away",
  unknown: "Unavailable",
};

export interface DoorView {
  entity: string;
  name: string;
  icon: string;
  status: DoorStatus;
  statusText: string;
  sinceText: string;
}

export interface DoorsView {
  doors: DoorView[];
  openCount: number;
  away: boolean;
  summaryText: string;
}

export function buildDoorsView(
  hass: HomeAssistant,
  config: DoorsCardConfig,
  now: number
): DoorsView {
  const presence = hass.states[config.presence_entity]?.state;
  const doors = config.doors.map((door): DoorView => {
    const entity = hass.states[door.entity];
    const status = doorStatus(entity?.state, presence);
    const open = status === "open-home" || status === "open-away";
    return {
      entity: door.entity,
      name: door.name ?? entity?.attributes.friendly_name ?? door.entity,
      icon: door.icon ?? (open ? "mdi:door-open" : "mdi:door-closed"),
      status,
      statusText: STATUS_TEXT[status],
      sinceText: status === "unknown" ? "" : sinceText(entity?.last_changed, now),
    };
  });

  const openCount = doors.filter(
    (door) => door.status === "open-home" || door.status === "open-away"
  ).length;
  const unknownCount = doors.filter((door) => door.status === "unknown").length;

  let summaryText: string;
  if (openCount > 0) {
    summaryText = openCount === 1 ? "1 open" : `${openCount} open`;
  } else if (unknownCount > 0) {
    summaryText = `${unknownCount} unavailable`;
  } else {
    summaryText = doors.length === 1 ? "Closed" : "All closed";
  }

  return { doors, openCount, away: presence !== "home", summaryText };
}
