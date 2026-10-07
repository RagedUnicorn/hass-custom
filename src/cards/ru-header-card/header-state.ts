/**
 * Pure derivation for ru-header-card — no DOM, no services: the presence
 * pills and the date/time line.
 */

import type { HeaderPersonConfig, HomeAssistant } from "../../types";

export interface PresenceView {
  entity: string;
  name: string;
  home: boolean;
  /** "Home", "Away", a zone's name, or "Unknown". */
  text: string;
}

export function buildPresence(
  hass: HomeAssistant,
  person: HeaderPersonConfig
): PresenceView {
  const stateObj = hass.states[person.entity];
  const friendly = stateObj?.attributes.friendly_name ?? person.entity;
  const name = person.name ?? friendly.split(" ")[0];
  const state = stateObj?.state;

  if (state === "home") return { entity: person.entity, name, home: true, text: "Home" };
  if (state === "not_home") return { entity: person.entity, name, home: false, text: "Away" };
  if (!state || state === "unknown" || state === "unavailable") {
    return { entity: person.entity, name, home: false, text: "Unknown" };
  }
  // Any other state is the name of the zone the person is in.
  return { entity: person.entity, name, home: false, text: state };
}

/**
 * "Tue 7 Oct · 19:42", following the user's HA profile: the language, the
 * date order (DMY / MDY / YMD, else the language's own) and the clock
 * (12 / 24, else the language's own).
 */
export function formatDateLine(
  now: Date,
  locale: HomeAssistant["locale"],
  fallbackLanguage: string
): string {
  const language =
    locale?.date_format === "system" || !locale?.language
      ? fallbackLanguage
      : locale.language;

  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(language, options).format(now);
  const weekday = part({ weekday: "short" });
  const day = part({ day: "numeric" });
  const month = part({ month: "short" });

  let date: string;
  switch (locale?.date_format) {
    case "DMY":
      date = `${weekday} ${day} ${month}`;
      break;
    case "MDY":
    case "YMD":
      date = `${weekday} ${month} ${day}`;
      break;
    default:
      date = new Intl.DateTimeFormat(language, {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(now);
  }

  const hourCycle =
    locale?.time_format === "24"
      ? "h23"
      : locale?.time_format === "12"
        ? "h12"
        : undefined;
  const time = new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    minute: "2-digit",
    ...(hourCycle ? { hourCycle } : {}),
  }).format(now);

  return `${date} · ${time}`;
}
