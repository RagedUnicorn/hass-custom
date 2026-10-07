/**
 * ru-header-card — the title of a dashboard view, made for a sections view's
 * `header` slot: the view's name, a live date and time line, and a presence
 * pill per person (green while home; the zone's name, Away or Unknown
 * otherwise). Tapping a pill opens the person's more-info dialog.
 *
 * Configuration is YAML-only — no visual editor.
 */

import { LitElement, html, nothing, type TemplateResult } from "lit";
import type {
  HeaderCardConfig,
  HeaderPersonConfig,
  HomeAssistant,
} from "../../types";
import { buildPresence, formatDateLine, type PresenceView } from "./header-state";
import { cardStyles } from "./styles";

const CARD_TYPE = "ru-header-card";

export class RuHeaderCard extends LitElement {
  static styles = cardStyles;

  static properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  hass?: HomeAssistant;

  private _config?: HeaderCardConfig;

  private _people: HeaderPersonConfig[] = [];

  /** Re-renders the clock between HA updates. */
  private _clock?: ReturnType<typeof setInterval>;

  setConfig(config: HeaderCardConfig): void {
    if (!config?.title?.trim()) {
      throw new Error(`${CARD_TYPE}: "title" is required`);
    }
    this._people = (config.people ?? []).map((person) => {
      const entry = typeof person === "string" ? { entity: person } : person;
      const entity = entry?.entity?.trim();
      if (
        !entity ||
        !(entity.startsWith("person.") || entity.startsWith("device_tracker."))
      ) {
        throw new Error(
          `${CARD_TYPE}: every person must be a person.* or device_tracker.* entity`
        );
      }
      return { ...entry, entity };
    });
    this._config = config;
  }

  /** Sections views: fill the header — the card lays out to the width it is
   * given. A dashboard's own grid_options on the card still win. */
  getGridOptions(): { columns: "full" } {
    return { columns: "full" };
  }

  getCardSize(): number {
    return 1;
  }

  static getStubConfig(hass?: HomeAssistant): Record<string, unknown> {
    const person = hass
      ? Object.keys(hass.states).find((entity) => entity.startsWith("person."))
      : undefined;
    return { title: "Home", people: person ? [person] : [] };
  }

  connectedCallback(): void {
    super.connectedCallback();
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
    const people = this._people.map((person) =>
      buildPresence(this.hass!, person)
    );

    return html`
      <div class="card">
        <div class="heading">
          <div class="title">${config.title}</div>
          ${config.show_date === false
            ? nothing
            : html`<div class="date">
                ${formatDateLine(new Date(), this.hass.locale, navigator.language)}
              </div>`}
        </div>
        ${people.length
          ? html`<div class="people">
              ${people.map((person) => this._renderPerson(person))}
            </div>`
          : nothing}
      </div>
    `;
  }

  private _renderPerson(person: PresenceView): TemplateResult {
    return html`
      <button
        class="pill ${person.home ? "home" : "away"}"
        data-entity=${person.entity}
        aria-label="${person.name}: ${person.text}"
        @click=${() => this._moreInfo(person.entity)}
      >
        <span class="dot"></span>
        <span class="name">${person.name}</span>
        <span class="state">${person.text}</span>
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
}

if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, RuHeaderCard);
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: "RU Header Card",
    description:
      "Dashboard view title with a live date and time line and presence pills, for a sections view header",
    documentationURL: "https://github.com/ragedunicorn/hass-custom",
  });
}
