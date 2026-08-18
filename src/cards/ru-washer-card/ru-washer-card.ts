/**
 * ru-washer-card — a Miele washing machine card: status, programme and phase,
 * a live countdown with progress, Start/Pause/Stop, and programme presets.
 *
 * Implements option 1a of the Washer Card mock.
 *
 * Two limits of the Miele cloud API are baked into this design rather than
 * worked around:
 *   - Spin speed and temperature are READ-ONLY. miele.set_program takes a
 *     programme id and nothing else, so a preset's `spin`/`temperature` are
 *     labels describing what that programme will run at.
 *   - There is no sound/mute control of any kind.
 * Remote start additionally requires Mobile Start to be armed on the machine
 * itself; the card explains that rather than silently greying Start out.
 *
 * Configuration is YAML-only — no visual editor.
 */

import { LitElement, html, nothing, type TemplateResult } from "lit";
import type {
  HomeAssistant,
  WasherCardConfig,
  WasherPresetConfig,
} from "../../types";
import {
  buildWasherView,
  type WasherPresetView,
  type WasherSensorView,
  type WasherView,
} from "./washer-state";
import { cardStyles } from "./styles";

const CARD_TYPE = "ru-washer-card";

export class RuWasherCard extends LitElement {
  static styles = cardStyles;

  static properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  hass?: HomeAssistant;

  private _config?: WasherCardConfig;

  /** Entities warned about once, so a typo does not spam the console. */
  private _warned = new Set<string>();

  /** Ticks the countdown between HA updates. */
  private _clock?: ReturnType<typeof setInterval>;

  setConfig(config: WasherCardConfig): void {
    if (!config?.entity || !config.entity.startsWith("sensor.")) {
      throw new Error(
        `${CARD_TYPE}: "entity" is required and must be the machine's sensor.* status entity`
      );
    }

    const trimmed: WasherCardConfig = { ...config };

    const domains: Array<[keyof WasherCardConfig, string]> = [
      ["power_entity", "switch."],
      ["start_entity", "button."],
      ["pause_entity", "button."],
      ["stop_entity", "button."],
      ["program_entity", "sensor."],
      ["phase_entity", "sensor."],
      ["remaining_entity", "sensor."],
      ["elapsed_entity", "sensor."],
      ["finish_entity", "sensor."],
      ["door_entity", "binary_sensor."],
      ["mobile_start_entity", "binary_sensor."],
      ["spin_speed_entity", "sensor."],
      ["temperature_entity", "sensor."],
    ];
    for (const [key, prefix] of domains) {
      const entity = (trimmed[key] as string | undefined)?.trim();
      if (entity && !entity.startsWith(prefix)) {
        throw new Error(
          `${CARD_TYPE}: "${key}" must be a ${prefix}* entity id`
        );
      }
      (trimmed as unknown as Record<string, unknown>)[key] = entity;
    }

    for (const preset of config.presets ?? []) {
      if (!preset.name) {
        throw new Error(`${CARD_TYPE}: every preset needs a "name"`);
      }
      if (typeof preset.program_id !== "number") {
        throw new Error(
          `${CARD_TYPE}: preset "${preset.name}" needs a numeric "program_id" — call miele.get_programs to find the ids your machine offers`
        );
      }
    }
    if (config.presets?.length && !config.device_id) {
      throw new Error(
        `${CARD_TYPE}: "device_id" is required when "presets" are configured — miele.set_program targets a device, not an entity`
      );
    }

    this._config = trimmed;
    this._warned.clear();
  }

  getCardSize(): number {
    return 4 + (this._config?.presets?.length ? 2 : 0);
  }

  static getStubConfig(hass?: HomeAssistant): Record<string, unknown> {
    const sensor = hass
      ? Object.keys(hass.states).find((entity) =>
          /^sensor\.[a-z0-9_]*wash/.test(entity)
        )
      : undefined;
    return {
      title: "Laundry",
      entity: sensor ?? "sensor.washing_machine",
    };
  }

  connectedCallback(): void {
    super.connectedCallback();
    // The finish timestamp only re-renders if something asks it to; HA reports
    // the machine every poll, not every second.
    this._clock = setInterval(() => this.requestUpdate(), 1000);
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
    const view = buildWasherView(this.hass, config, Date.now());

    this._warnMissing("spin_speed_entity", config.spin_speed_entity, view.spin);
    this._warnMissing(
      "temperature_entity",
      config.temperature_entity,
      view.temperature
    );

    return html`
      <div class="card">
        <div class="header">
          <div class="title">${config.title ?? "Laundry"}</div>
          <div class="summary">${view.summaryText}</div>
        </div>

        <div class="panel ${view.available ? "" : "unavailable"}">
          ${this._renderDeviceRow(view)}
          ${view.hasProgram || view.hasCycle
            ? this._renderCycle(view)
            : nothing}
          ${view.hasControls ? this._renderControls(view) : nothing}
          ${view.blockedReason
            ? html`<div class="blocked">${view.blockedReason}</div>`
            : nothing}
        </div>

        ${view.presets.length ? this._renderPresets(view) : nothing}
      </div>
    `;
  }

  private _renderDeviceRow(view: WasherView): TemplateResult {
    const done = view.status === "finished";
    return html`
      <div class="device-row">
        <div class="icon-circle ${view.on ? "" : "off"}">
          <div class="state-dot ${done ? "done" : ""}"></div>
        </div>
        <div class="device-text">
          <div class="device-name">${view.name}</div>
          <div class="device-status ${done ? "done" : view.on ? "on" : ""}">
            ${view.available ? view.statusText : "Unavailable"}
          </div>
        </div>
        ${view.hasPower
          ? html`
              <button
                class="toggle ${view.powerOn ? "on" : ""}"
                role="switch"
                aria-checked=${view.powerOn ? "true" : "false"}
                aria-label="Power"
                ?disabled=${!view.available}
                @click=${() => this._togglePower(view)}
              >
                <div class="knob"></div>
              </button>
            `
          : nothing}
      </div>
    `;
  }

  private _renderCycle(view: WasherView): TemplateResult {
    const done = view.status === "finished";
    // The progress block needs a running cycle; the programme name and phase
    // are worth showing as soon as one is selected, and after it ends.
    const showProgress = view.hasCycle || done;
    return html`
      <div class="cycle">
        <div class="program">
          <div class="program-name">${view.programName}</div>
          <div class="program-phase">${view.phaseName}</div>
        </div>

        ${showProgress
          ? html`
              <div class="progress">
                <div
                  class="progress-fill ${done ? "done" : ""}"
                  style="width: ${done ? 100 : view.progressPct}%"
                ></div>
              </div>
              <div class="times">
                <div class="time">${view.elapsedText}</div>
                <div class="time remaining">${view.remainingText}</div>
              </div>
            `
          : nothing}
        ${showProgress && (view.finishText || view.doorConfigured)
          ? html`
              <div class="meta">
                <div class="meta-item">${view.finishText ?? ""}</div>
                ${view.doorConfigured
                  ? html`<div class="meta-item ${view.doorOpen ? "warn" : ""}">
                      ${view.doorText}
                    </div>`
                  : nothing}
              </div>
            `
          : nothing}
        ${view.spin.status === "ok" || view.temperature.status === "ok"
          ? html`
              <div class="chips">
                ${view.spin.status === "ok"
                  ? html`<div class="chip">${view.spin.text}</div>`
                  : nothing}
                ${view.temperature.status === "ok"
                  ? html`<div class="chip">${view.temperature.text}</div>`
                  : nothing}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderControls(view: WasherView): TemplateResult {
    const config = this._config!;
    return html`
      <div class="controls">
        ${config.start_entity
          ? html`
              <button
                class="control primary start"
                ?disabled=${!view.canStart}
                @click=${() => this._press(config.start_entity)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 4 L20 12 L7 20 Z" />
                </svg>
                Start
              </button>
            `
          : nothing}
        ${config.pause_entity
          ? html`
              <button
                class="control pause"
                ?disabled=${!view.canPause}
                @click=${() => this._press(config.pause_entity)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4 H10 V20 H6 Z M14 4 H18 V20 H14 Z" />
                </svg>
                Pause
              </button>
            `
          : nothing}
        ${config.stop_entity
          ? html`
              <button
                class="control danger stop"
                ?disabled=${!view.canStop}
                @click=${() => this._press(config.stop_entity)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6 H18 V18 H6 Z" />
                </svg>
                Stop
              </button>
            `
          : nothing}
      </div>
    `;
  }

  private _renderPresets(view: WasherView): TemplateResult {
    return html`
      <div class="panel">
        <div class="panel-title">Programmes</div>
        <div class="preset-grid">
          ${view.presets.map((preset) => this._renderPreset(preset, view))}
        </div>
      </div>
    `;
  }

  private _renderPreset(
    preset: WasherPresetView,
    view: WasherView
  ): TemplateResult {
    return html`
      <button
        class="preset ${preset.active ? "active" : ""}"
        ?disabled=${!view.available}
        @click=${() => this._setProgram(preset.programId)}
      >
        <div class="preset-head">
          ${preset.icon
            ? html`<ha-icon .icon=${preset.icon}></ha-icon>`
            : nothing}
          <div class="preset-name">${preset.name}</div>
        </div>
        ${preset.meta
          ? html`<div class="preset-meta">${preset.meta}</div>`
          : nothing}
      </button>
    `;
  }

  // --- services ---------------------------------------------------------------

  private _togglePower(view: WasherView): void {
    if (!this._config?.power_entity) return;
    void this.hass?.callService(
      "switch",
      view.powerOn ? "turn_off" : "turn_on",
      { entity_id: this._config.power_entity }
    );
  }

  private _press(entity: string | undefined): void {
    if (!entity) return;
    void this.hass?.callService("button", "press", { entity_id: entity });
  }

  /** miele.set_program targets a device, not an entity — hence device_id. */
  private _setProgram(programId: number): void {
    const deviceId = this._config?.device_id;
    if (!deviceId) return;
    void this.hass?.callService("miele", "set_program", {
      device_id: deviceId,
      program_id: programId,
    });
  }

  // --- diagnostics ------------------------------------------------------------

  private _warnMissing(
    key: keyof WasherCardConfig,
    entity: string | undefined,
    sensor: WasherSensorView
  ): void {
    if (sensor.status !== "missing" || !entity || this._warned.has(entity)) {
      return;
    }
    this._warned.add(entity);
    console.warn(
      `${CARD_TYPE}: "${key}" is set to "${entity}", which does not exist in Home Assistant — the readout will be hidden. Check the entity id.`
    );
  }
}

if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, RuWasherCard);
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: "RU Washer Card",
    description:
      "Miele washing machine: status, live countdown, start/pause/stop and programme presets",
    documentationURL: "https://github.com/ragedunicorn/hass-custom",
  });
}

export type { WasherPresetConfig };
