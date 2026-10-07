/**
 * Pure derivation for ru-actions-card — no DOM, no services: which entities
 * an action targets, and the status line its tile shows about them.
 */

import type { ActionTarget, HomeAssistant } from "../../types";

function asList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * The entities of `domain` an action's target reaches, resolved the way HA
 * does it: explicit ids (`all` = every entity of the domain), labels on the
 * entity or on its device, and areas on the entity or — when the entity has
 * none of its own — on its device.
 */
export function resolveTargets(
  hass: HomeAssistant,
  domain: string,
  target: ActionTarget | undefined
): string[] {
  const inDomain = (entity: string) => entity.startsWith(`${domain}.`);
  const found = new Set<string>();

  for (const entity of asList(target?.entity_id)) {
    if (entity === "all") {
      Object.keys(hass.states).filter(inDomain).forEach((e) => found.add(e));
    } else {
      found.add(entity);
    }
  }

  const labels = asList(target?.label_id);
  const areas = asList(target?.area_id);
  if (labels.length || areas.length) {
    for (const entry of Object.values(hass.entities ?? {})) {
      const device = entry.device_id
        ? hass.devices?.[entry.device_id]
        : undefined;
      const entityLabels = [...(entry.labels ?? []), ...(device?.labels ?? [])];
      const area = entry.area_id ?? device?.area_id ?? null;
      if (
        labels.some((label) => entityLabels.includes(label)) ||
        (area !== null && areas.includes(area))
      ) {
        found.add(entry.entity_id);
      }
    }
  }

  return [...found].filter((entity) => inDomain(entity) && hass.states[entity]);
}

function available(hass: HomeAssistant, entity: string): boolean {
  const state = hass.states[entity]?.state;
  return state !== undefined && state !== "unavailable" && state !== "unknown";
}

/** A group (light/cover group helper, Hue room) lists its members in an
 * entity_id attribute — counting it would count its members twice. */
function isGroup(hass: HomeAssistant, entity: string): boolean {
  return Array.isArray(hass.states[entity]?.attributes.entity_id);
}

/**
 * What the tile says about its targets: covers count open ones, lights count
 * lit ones; any other domain says nothing (configure a `subtitle` instead).
 * Groups are left out of the count — their members are counted already.
 */
export function statusText(
  hass: HomeAssistant,
  domain: string,
  entities: string[]
): string {
  if (domain !== "cover" && domain !== "light") return "";
  const devices = entities.filter((entity) => !isGroup(hass, entity));
  const live = devices.filter((entity) => available(hass, entity));
  if (live.length === 0) return devices.length ? "Unavailable" : "";

  if (domain === "cover") {
    const open = live.filter(
      (entity) => hass.states[entity].state !== "closed"
    ).length;
    if (open === 0) return `All ${live.length} closed`;
    if (open === live.length) return `All ${live.length} open`;
    return `${open} of ${live.length} open`;
  }

  const on = live.filter((entity) => hass.states[entity].state === "on").length;
  if (on === 0) return "All off";
  return `${on} light${on === 1 ? "" : "s"} on`;
}
