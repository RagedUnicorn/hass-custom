/**
 * ru-doors-card — door contact sensors colored by state and presence: green
 * while closed, yellow while open and someone is home, red while open and
 * nobody is. Tapping a door opens its more-info dialog (history included).
 *
 * The card only displays — alerting on an open door while away belongs in an
 * automation, which keeps working with no dashboard open.
 *
 * Configuration is YAML-only — no visual editor.
 */

import { LitElement, html, nothing, type TemplateResult } from "lit";
import type { DoorsCardConfig, HomeAssistant } from "../../types";
import { buildDoorsView, type DoorView } from "./door-state";
import { cardStyles } from "./styles";

const CARD_TYPE = "ru-doors-card";

export class RuDoorsCard extends LitElement {
  static styles = cardStyles;

  static properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  hass?: HomeAssistant;

  private _config?: DoorsCardConfig;

  /** Entities warned about once, so a typo does not spam the console. */
  private _warned = new Set<string>();

  /** Re-renders the "since" texts between HA updates. */
  private _clock?: ReturnType<typeof setInterval>;

  setConfig(config: DoorsCardConfig): void {
    const presence = config?.presence_entity?.trim();
    if (
      !presence ||
      !(presence.startsWith("person.") || presence.startsWith("device_tracker."))
    ) {
      throw new Error(
        `${CARD_TYPE}: "presence_entity" is required and must be a person.* or device_tracker.* entity`
      );
    }
    if (!Array.isArray(config.doors) || config.doors.length === 0) {
      throw new Error(`${CARD_TYPE}: "doors" needs at least one entry`);
    }
    const doors = config.doors.map((door) => {
      const entity = door?.entity?.trim();
      if (!entity || !entity.startsWith("binary_sensor.")) {
        throw new Error(
          `${CARD_TYPE}: every door needs an "entity" that is a binary_sensor.* contact sensor`
        );
      }
      return { ...door, entity };
    });

    this._config = { ...config, presence_entity: presence, doors };
    this._warned.clear();
  }

  /** Sections views: fill the section — the card adapts to the width it is
   * given (container queries), so a partial default would only squeeze it. A
   * dashboard's own grid_options on the card still win. */
  getGridOptions(): { columns: "full" } {
    return { columns: "full" };
  }

  getCardSize(): number {
    return 1 + (this._config?.doors.length ?? 1);
  }

  static getStubConfig(hass?: HomeAssistant): Record<string, unknown> {
    const states = hass ? Object.values(hass.states) : [];
    const door = states.find(
      (entity) =>
        entity.entity_id.startsWith("binary_sensor.") &&
        entity.attributes.device_class === "door"
    );
    const person = states.find((entity) =>
      entity.entity_id.startsWith("person.")
    );
    return {
      title: "Doors",
      presence_entity: person?.entity_id ?? "person.me",
      doors: [{ entity: door?.entity_id ?? "binary_sensor.front_door" }],
    };
  }

  connectedCallback(): void {
    super.connectedCallback();
    // "12 min" only advances if something asks for a render; HA reports a
    // door when it flips, not every minute.
    this._clock = setInterval(() => this.requestUpdate(), 30_000);
  }

  disconnectedCallback(): void {
    clearInterval(this._clock);
    super.disconnectedCallback();
  }

  protected willUpdate(): void {
    this.toggleAttribute("dark", this.hass?.themes?.darkMode ?? false);
  }

  render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;

    const config = this._config;
    const view = buildDoorsView(this.hass, config, Date.now());

    this._warnMissing(config.presence_entity);
    for (const door of config.doors) this._warnMissing(door.entity);

    const summaryClass =
      view.openCount === 0 ? "" : view.away ? "open-away" : "open-home";

    return html`
      <div class="card">
        <div class="header">
          <div class="title">${config.title ?? "Doors"}</div>
          <div class="summary ${summaryClass}">${view.summaryText}</div>
        </div>
        <div class="doors">
          ${view.doors.map((door) => this._renderDoor(door))}
        </div>
      </div>
    `;
  }

  private _renderDoor(door: DoorView): TemplateResult {
    return html`
      <button
        class="door ${door.status}"
        data-entity=${door.entity}
        aria-label="${door.name}: ${door.statusText}"
        @click=${() => this._moreInfo(door.entity)}
      >
        <div class="icon-circle">
          <ha-icon .icon=${door.icon}></ha-icon>
        </div>
        <div class="door-text">
          <div class="door-name">${door.name}</div>
          <div class="door-status">${door.statusText}</div>
        </div>
        ${door.sinceText
          ? html`<div class="door-since">${door.sinceText}</div>`
          : nothing}
      </button>
    `;
  }

  /** The HA frontend opens its more-info dialog on this event. */
  private _moreInfo(entityId: string): void {
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: { entityId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _warnMissing(entity: string): void {
    if (!this.hass || this.hass.states[entity] || this._warned.has(entity)) {
      return;
    }
    this._warned.add(entity);
    console.warn(
      `${CARD_TYPE}: "${entity}" does not exist in Home Assistant — check the entity id.`
    );
  }
}

if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, RuDoorsCard);
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: "RU Doors Card",
    description:
      "Door contact sensors colored by state and presence: green closed, yellow open while home, red open while away",
    documentationURL: "https://github.com/ragedunicorn/hass-custom",
  });
}
