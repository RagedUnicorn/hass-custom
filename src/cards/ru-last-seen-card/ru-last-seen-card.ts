/**
 * ru-last-seen-card — "is this device still talking?" at a glance. Each row
 * reads a timestamp sensor (e.g. Zigbee2MQTT's sensor.<device>_last_seen) and
 * colors it by age: green within warn_after_hours, yellow until
 * alert_after_hours, red beyond. Tapping a row opens its more-info dialog.
 *
 * Built for battery Zigbee devices that die silently: their state entities
 * keep showing the last value forever, so the age of the last real message
 * is the only honest health signal.
 *
 * Configuration is YAML-only — no visual editor.
 */

import { LitElement, html, nothing, type TemplateResult } from "lit";
import type { HomeAssistant, LastSeenCardConfig } from "../../types";
import { buildLastSeenView, type LastSeenRowView } from "./last-seen-state";
import { cardStyles } from "./styles";

const CARD_TYPE = "ru-last-seen-card";

const ICON: Record<LastSeenRowView["status"], string> = {
  fresh: "mdi:access-point-check",
  stale: "mdi:access-point-network-off",
  dead: "mdi:access-point-remove",
  unknown: "mdi:help-circle-outline",
};

export class RuLastSeenCard extends LitElement {
  static styles = cardStyles;

  static properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  hass?: HomeAssistant;

  private _config?: LastSeenCardConfig;

  /** Entities warned about once, so a typo does not spam the console. */
  private _warned = new Set<string>();

  /** Ages grow between HA updates; re-render so the colors follow. */
  private _clock?: ReturnType<typeof setInterval>;

  setConfig(config: LastSeenCardConfig): void {
    if (!Array.isArray(config?.entities) || config.entities.length === 0) {
      throw new Error(`${CARD_TYPE}: "entities" needs at least one entry`);
    }
    const entities = config.entities.map((row) => {
      const entity = row?.entity?.trim();
      if (!entity || !entity.startsWith("sensor.")) {
        throw new Error(
          `${CARD_TYPE}: every entry needs an "entity" that is a timestamp sensor.*`
        );
      }
      return { ...row, entity };
    });
    for (const key of ["warn_after_hours", "alert_after_hours"] as const) {
      const value = config[key];
      if (value !== undefined && !(typeof value === "number" && value > 0)) {
        throw new Error(`${CARD_TYPE}: "${key}" must be a positive number`);
      }
    }
    if (
      config.warn_after_hours !== undefined &&
      config.alert_after_hours !== undefined &&
      config.warn_after_hours >= config.alert_after_hours
    ) {
      throw new Error(
        `${CARD_TYPE}: "warn_after_hours" must be lower than "alert_after_hours"`
      );
    }

    this._config = { ...config, entities };
    this._warned.clear();
  }

  /** Sections views: fill the section — the card adapts to the width it is
   * given (container queries), so a partial default would only squeeze it. A
   * dashboard's own grid_options on the card still win. */
  getGridOptions(): { columns: "full" } {
    return { columns: "full" };
  }

  getCardSize(): number {
    return 1 + (this._config?.entities.length ?? 1);
  }

  static getStubConfig(hass?: HomeAssistant): Record<string, unknown> {
    const sensor = hass
      ? Object.keys(hass.states).find((entity) =>
          /^sensor\..*_last_seen$/.test(entity)
        )
      : undefined;
    return {
      title: "Last seen",
      entities: [{ entity: sensor ?? "sensor.my_device_last_seen" }],
    };
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._clock = setInterval(() => this.requestUpdate(), 60_000);
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
    const view = buildLastSeenView(this.hass, config, Date.now());
    for (const row of config.entities) this._warnMissing(row.entity);

    const summaryClass =
      view.worst === "stale" || view.worst === "dead" ? view.worst : "";

    return html`
      <div class="card">
        <div class="header">
          <div class="title">${config.title ?? "Last seen"}</div>
          <div class="summary ${summaryClass}">${view.summaryText}</div>
        </div>
        <div class="rows">${view.rows.map((row) => this._renderRow(row))}</div>
      </div>
    `;
  }

  private _renderRow(row: LastSeenRowView): TemplateResult {
    return html`
      <button
        class="row ${row.status}"
        data-entity=${row.entity}
        title=${row.exactText ? `Last seen ${row.exactText}` : ""}
        aria-label="${row.name}: ${row.statusText}"
        @click=${() => this._moreInfo(row.entity)}
      >
        <div class="icon-circle">
          <ha-icon .icon=${ICON[row.status]}></ha-icon>
        </div>
        <div class="row-text">
          <div class="row-name">${row.name}</div>
          <div class="row-status">${row.statusText}</div>
        </div>
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
      `${CARD_TYPE}: "${entity}" does not exist in Home Assistant — check the entity id (Zigbee2MQTT's *_last_seen sensors are disabled by default).`
    );
  }
}

if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, RuLastSeenCard);
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: "RU Last Seen Card",
    description:
      "Device health by last-seen age: green recently, yellow after a few hours, red after a day",
    documentationURL: "https://github.com/ragedunicorn/hass-custom",
  });
}
