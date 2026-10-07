/**
 * ru-actions-card — big one-tap tiles for whole-home actions on a dashboard's
 * main view ("Shutters down", "All lights off"). Each tile shows a tinted
 * icon, the action's name and a live status line about what it targets
 * (`All 7 closed`, `4 lights on`), worked out from the action's target the
 * way HA resolves it — labels and areas included. A tap performs the action;
 * the tile pulses until Home Assistant answers.
 *
 * Configuration is YAML-only — no visual editor.
 */

import { LitElement, html, nothing, type TemplateResult } from "lit";
import type { ActionConfig, ActionsCardConfig, HomeAssistant } from "../../types";
import { resolveTargets, statusText, stopsWhenMoving } from "./action-state";
import { cardStyles } from "./styles";

const CARD_TYPE = "ru-actions-card";

const TONES = ["accent", "amber", "green", "red"];

/** `domain.service` — HA's own naming rule for both parts. */
const ACTION_PATTERN = /^[a-z0-9_]+\.[a-z0-9_]+$/;

export class RuActionsCard extends LitElement {
  static styles = cardStyles;

  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _pending: { state: true },
  };

  hass?: HomeAssistant;

  private _config?: ActionsCardConfig;

  /** Indexes of actions whose service call has not answered yet. */
  private _pending = new Set<number>();

  setConfig(config: ActionsCardConfig): void {
    if (!Array.isArray(config?.actions) || config.actions.length === 0) {
      throw new Error(`${CARD_TYPE}: "actions" needs at least one entry`);
    }
    for (const action of config.actions) {
      if (!action?.name?.trim() || !action.icon?.trim()) {
        throw new Error(`${CARD_TYPE}: every action needs a "name" and an "icon"`);
      }
      if (!ACTION_PATTERN.test(action.action ?? "")) {
        throw new Error(
          `${CARD_TYPE}: action "${action.name}" needs an "action" like cover.close_cover`
        );
      }
      if (action.tone && !TONES.includes(action.tone)) {
        throw new Error(
          `${CARD_TYPE}: action "${action.name}" has an unknown "tone" — use ${TONES.join(", ")}`
        );
      }
    }
    this._config = config;
    this._pending = new Set();
  }

  /** Sections views: fill the section — the tiles flow to the width they are
   * given, so a partial default would only squeeze them. A dashboard's own
   * grid_options on the card still win. */
  getGridOptions(): { columns: "full" } {
    return { columns: "full" };
  }

  getCardSize(): number {
    return 3;
  }

  static getStubConfig(): Record<string, unknown> {
    return {
      title: "Quick actions",
      actions: [
        {
          name: "All lights off",
          icon: "mdi:lightbulb-group-off-outline",
          tone: "amber",
          action: "light.turn_off",
          target: { entity_id: "all" },
        },
      ],
    };
  }

  protected willUpdate(): void {
    this.toggleAttribute("dark", this.hass?.themes?.darkMode ?? false);
  }

  render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const config = this._config;

    return html`
      <div class="card">
        ${config.title
          ? html`<div class="title">${config.title}</div>`
          : nothing}
        <div class="tiles">
          ${config.actions.map((action, index) =>
            this._renderTile(action, index)
          )}
        </div>
      </div>
    `;
  }

  private _renderTile(action: ActionConfig, index: number): TemplateResult {
    const domain = action.action.split(".")[0];
    const targets = resolveTargets(this.hass!, domain, action.target);
    // While its covers travel the tile turns into their stop button.
    const stops = this._stops(action, targets);
    const status = stops
      ? "Tap to stop"
      : (action.subtitle ?? statusText(this.hass!, domain, targets));
    const pending = this._pending.has(index);

    return html`
      <button
        class="tile ${action.tone ?? "accent"} ${pending ? "pending" : ""} ${stops
          ? "stopping"
          : ""}"
        data-action=${action.action}
        aria-label=${stops ? `Stop ${action.name}` : action.name}
        aria-busy=${pending ? "true" : "false"}
        @click=${() => this._run(action, index)}
      >
        <div class="icon-circle">
          <ha-icon .icon=${stops ? "mdi:stop" : action.icon}></ha-icon>
        </div>
        <div class="text">
          <div class="name">${action.name}</div>
          ${status ? html`<div class="status">${status}</div>` : nothing}
        </div>
      </button>
    `;
  }

  private _stops(action: ActionConfig, targets: string[]): boolean {
    return stopsWhenMoving(
      this.hass!,
      action.action,
      targets,
      action.stop_when_moving ?? true
    );
  }

  /** Target keys go into the service data, which HA accepts as the target.
   * A tile whose covers are travelling stops them instead (same target). */
  private async _run(action: ActionConfig, index: number): Promise<void> {
    if (!this.hass || this._pending.has(index)) return;
    const [domain, actionService] = action.action.split(".");
    let service = actionService;
    let data: Record<string, unknown> = { ...action.data, ...action.target };
    if (this._stops(action, resolveTargets(this.hass, domain, action.target))) {
      service = "stop_cover";
      data = { ...action.target };
    }
    this._pending = new Set(this._pending).add(index);
    try {
      await this.hass.callService(domain, service, data);
    } finally {
      const pending = new Set(this._pending);
      pending.delete(index);
      this._pending = pending;
    }
  }
}

if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, RuActionsCard);
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: "RU Actions Card",
    description:
      "Big one-tap tiles for whole-home actions, each with a live status line about what it targets",
    documentationURL: "https://github.com/ragedunicorn/hass-custom",
  });
}
