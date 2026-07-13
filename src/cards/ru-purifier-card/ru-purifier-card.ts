/**
 * ru-purifier-card — single-device air purifier card: summary header, a
 * control panel (spinning-ring icon, power toggle, speed ticks, Auto/Manual/
 * Night mode chips, oscillation toggle), and an optional air quality panel
 * with PM2.5/PM10 bars rated Good/Fair/Poor.
 *
 * Maps onto a fan.* entity (percentage / preset_mode / oscillating), an
 * optional switch.* for the device's night mode, and optional PM sensors.
 * The Auto chip binds to the fan's auto-like preset; Manual is "a percentage
 * is set" (HA fans leave their preset when one is). Night is the switch —
 * the card treats the three as exclusive, so picking Auto or Manual (or a
 * speed tick) also switches night mode off.
 *
 * YAML-only configuration; see README for the full schema.
 */

import { LitElement, html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { styleMap } from "lit/directives/style-map.js";

import type { HomeAssistant, PurifierCardConfig } from "../../types";
import {
  buildPurifierView,
  type PurifierMode,
  type PurifierView,
  type SensorView,
} from "./purifier-state";
import { cardStyles } from "./styles";

const CARD_TYPE = "ru-purifier-card";

export class RuPurifierCard extends LitElement {
  static styles = cardStyles;

  static properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  hass?: HomeAssistant;

  private _config?: PurifierCardConfig;

  setConfig(config: PurifierCardConfig): void {
    if (!config?.entity || !config.entity.startsWith("fan.")) {
      throw new Error(
        `${CARD_TYPE}: "entity" is required and must be a fan.* entity id`
      );
    }
    if (
      config.night_mode_entity &&
      !config.night_mode_entity.startsWith("switch.")
    ) {
      throw new Error(
        `${CARD_TYPE}: "night_mode_entity" must be a switch.* entity id`
      );
    }
    for (const key of ["pm25_entity", "pm10_entity"] as const) {
      if (config[key] && !config[key].startsWith("sensor.")) {
        throw new Error(`${CARD_TYPE}: "${key}" must be a sensor.* entity id`);
      }
    }
    this._config = config;
  }

  getCardSize(): number {
    return (
      4 + (this._config?.pm25_entity || this._config?.pm10_entity ? 2 : 0)
    );
  }

  static getStubConfig(hass?: HomeAssistant): Record<string, unknown> {
    const fan = hass
      ? Object.keys(hass.states).find((entity) => entity.startsWith("fan."))
      : undefined;
    return {
      title: "Air",
      entity: fan ?? "fan.example_purifier",
    };
  }

  // Reflect HA's dark mode as a host attribute so the dark palette is pure
  // CSS (:host([dark]) in styles.ts) and stays overridable per property.
  protected willUpdate(): void {
    this.toggleAttribute("dark", this.hass?.themes?.darkMode ?? false);
  }

  render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;

    const config = this._config;
    const view = buildPurifierView(this.hass, config);
    const showAq = view.pm25.configured || view.pm10.configured;

    return html`
      <div class="card">
        <div class="header">
          <div class="title">${config.title ?? "Air"}</div>
          <div class="summary">${view.summaryText}</div>
        </div>

        <div class="panel ${view.available ? "" : "unavailable"}">
          ${this._renderDeviceRow(view)}
          ${view.supportsSpeed ? this._renderSpeed(view) : nothing}
          ${this._renderModes(view)}
          ${view.supportsOscillation ? this._renderOscillation(view) : nothing}
        </div>

        ${showAq ? this._renderAirQuality(view) : nothing}
      </div>
    `;
  }

  private _renderDeviceRow(view: PurifierView): TemplateResult {
    return html`
      <div class="device-row">
        <div class="icon-circle ${view.on ? "" : "off"}">
          <div
            class="spinner ${view.on ? "" : "off"}"
            style=${styleMap(
              view.spinSeconds !== null
                ? { animationDuration: `${view.spinSeconds}s` }
                : {}
            )}
          ></div>
        </div>
        <div class="device-text">
          <div class="device-name">${view.name}</div>
          <div class="device-status ${view.on ? "on" : ""}">
            ${view.statusText}
          </div>
        </div>
        <button
          class="toggle ${view.on ? "on" : ""}"
          aria-label="Power"
          ?disabled=${!view.available}
          @click=${() => this._togglePower(view)}
        >
          <div class="knob"></div>
        </button>
      </div>
    `;
  }

  private _renderSpeed(view: PurifierView): TemplateResult {
    return html`
      <div class="speed ${view.on ? "" : "dimmed"}">
        <div class="speed-head">
          <div class="speed-title">Speed</div>
          <div class="speed-value ${view.on && view.mode === "auto" ? "auto" : ""}">
            ${view.speedLabel}
          </div>
        </div>
        <div class="ticks">
          ${Array.from(
            { length: view.tickCount },
            (_, i) => html`
              <button
                class="tick ${view.on && i < view.speed ? "on" : ""}"
                aria-label="Speed ${i + 1}"
                ?disabled=${!view.available}
                @click=${() => this._setTick(view, i)}
              ></button>
            `
          )}
        </div>
      </div>
    `;
  }

  private _renderModes(view: PurifierView): TemplateResult | typeof nothing {
    const modes: PurifierMode[] = [];
    if (view.autoPreset) modes.push("auto");
    modes.push("manual");
    if (view.hasNight) modes.push("night");
    // A lone Manual chip has nothing to switch to — drop the row entirely.
    if (modes.length === 1) return nothing;

    const names: Record<PurifierMode, string> = {
      auto: "Auto",
      manual: "Manual",
      night: "Night",
    };
    return html`
      <div class="modes">
        ${modes.map(
          (mode) => html`
            <button
              class="mode ${view.on && view.mode === mode ? "active" : ""}"
              ?disabled=${!view.available}
              @click=${() => this._setMode(view, mode)}
            >
              ${names[mode]}
            </button>
          `
        )}
      </div>
    `;
  }

  private _renderOscillation(view: PurifierView): TemplateResult {
    return html`
      <div class="osc-row">
        <div class="osc-label">Oscillation</div>
        <button
          class="toggle small ${view.on && view.oscillating ? "on" : ""}"
          aria-label="Oscillation"
          ?disabled=${!view.available}
          @click=${() => this._toggleOscillation(view)}
        >
          <div class="knob"></div>
        </button>
      </div>
    `;
  }

  private _renderAirQuality(view: PurifierView): TemplateResult {
    return html`
      <div class="panel aq-panel">
        <div class="aq-head">
          <div class="aq-title">Air quality</div>
          <div class="aq-word ${view.aq?.level ?? ""}">
            ${view.aq?.word ?? "—"}
          </div>
        </div>
        ${view.pm25.configured
          ? this._renderPmRow("PM 2.5", view.pm25, view)
          : nothing}
        ${view.pm10.configured
          ? this._renderPmRow("PM 10", view.pm10, view)
          : nothing}
      </div>
    `;
  }

  private _renderPmRow(
    label: string,
    sensor: SensorView,
    view: PurifierView
  ): TemplateResult {
    return html`
      <div class="aq-row">
        <div class="aq-name">${label}</div>
        <div class="aq-track">
          <div
            class="aq-fill ${view.aq?.level ?? ""}"
            style="width: ${sensor.fillPct}%"
          ></div>
        </div>
        <div class="aq-value">${sensor.text}</div>
      </div>
    `;
  }

  // --- service calls ----------------------------------------------------------

  private _fan(service: string, data?: Record<string, unknown>): void {
    void this.hass?.callService("fan", service, {
      entity_id: this._config!.entity,
      ...data,
    });
  }

  private _night(on: boolean): void {
    if (!this._config?.night_mode_entity) return;
    void this.hass?.callService("switch", on ? "turn_on" : "turn_off", {
      entity_id: this._config.night_mode_entity,
    });
  }

  private _togglePower(view: PurifierView): void {
    this._fan(view.on ? "turn_off" : "turn_on");
  }

  /** Tick tap = manual speed; setting a percentage leaves any auto preset. */
  private _setTick(view: PurifierView, index: number): void {
    if (view.nightOn) this._night(false);
    this._fan("set_percentage", {
      percentage: Math.round(((index + 1) / view.tickCount) * 100),
    });
  }

  private _setMode(view: PurifierView, mode: PurifierMode): void {
    switch (mode) {
      case "auto":
        if (view.nightOn) this._night(false);
        this._fan("set_preset_mode", { preset_mode: view.autoPreset });
        break;
      case "manual": {
        if (view.nightOn) this._night(false);
        // Re-assert the current speed (or the lowest tick) — HA fans switch
        // to manual when a percentage is set.
        const pct =
          view.percentage > 0
            ? view.percentage
            : Math.round(100 / view.tickCount);
        this._fan("set_percentage", { percentage: pct });
        break;
      }
      case "night":
        if (!view.on) this._fan("turn_on");
        this._night(true);
        break;
    }
  }

  private _toggleOscillation(view: PurifierView): void {
    if (!view.on) this._fan("turn_on");
    this._fan("oscillate", { oscillating: !view.oscillating });
  }
}

// Guarded so loading the bundle twice (Lovelace resource + extra_module_url)
// doesn't throw on re-registration.
if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, RuPurifierCard);
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: "RU Purifier Card",
    description:
      "Air purifier control with speed ticks, Auto/Manual/Night modes, oscillation and PM2.5/PM10 air quality",
    documentationURL: "https://github.com/ragedunicorn/hass-custom",
  });
}
