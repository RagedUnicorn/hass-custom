/**
 * ru-lights-card — lights view card: summary header, global on/off chips,
 * per-room tiles with a drag-to-dim brightness slider, a scenes panel, and a
 * drilldown overlay (bottom sheet on phones, centered dialog on wide screens)
 * with per-bulb dimmer bars, toggles, and light-strip effect chips.
 *
 * YAML-only configuration; see README for the full schema.
 */

import { LitElement, html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { styleMap } from "lit/directives/style-map.js";

import type {
  HomeAssistant,
  LightsCardConfig,
  SceneConfig,
} from "../../types";
import {
  activeScene,
  buildRoomView,
  sceneName,
  summaryText,
  type LightView,
  type RoomView,
} from "./light-state";
import { cardStyles } from "./styles";

const CARD_TYPE = "ru-lights-card";

export class RuLightsCard extends LitElement {
  static styles = cardStyles;

  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _detailRoom: { state: true },
    _drag: { state: true },
  };

  hass?: HomeAssistant;

  private _config?: LightsCardConfig;

  /** Index into config.rooms of the open drilldown, or null when closed. */
  private _detailRoom: number | null = null;

  /** Live values (drag key → 0..100) of dims in progress. */
  private _drag: Record<string, number> = {};

  setConfig(config: LightsCardConfig): void {
    if (!config || !Array.isArray(config.rooms) || config.rooms.length === 0) {
      throw new Error(
        `${CARD_TYPE}: "rooms" is required and must be a non-empty list`
      );
    }
    for (const room of config.rooms) {
      if (!room.name) {
        throw new Error(`${CARD_TYPE}: every room needs a "name"`);
      }
      if (!Array.isArray(room.lights) || room.lights.length === 0) {
        throw new Error(
          `${CARD_TYPE}: room "${room.name}" needs a non-empty "lights" list`
        );
      }
      for (const light of room.lights) {
        if (!light.entity || !light.entity.startsWith("light.")) {
          throw new Error(
            `${CARD_TYPE}: room "${room.name}" has an invalid light entity ` +
              `"${light.entity ?? ""}" — expected a light.* entity id`
          );
        }
      }
    }
    for (const scene of config.scenes ?? []) {
      if (!scene.entity || !scene.entity.startsWith("scene.")) {
        throw new Error(
          `${CARD_TYPE}: invalid scene entity "${scene.entity ?? ""}" — ` +
            `expected a scene.* entity id`
        );
      }
    }
    this._config = config;
    this._detailRoom = null;
    this._drag = {};
  }

  getCardSize(): number {
    return (
      3 +
      Math.ceil((this._config?.rooms.length ?? 0) / 2) * 2 +
      (this._config?.scenes?.length ? 2 : 0)
    );
  }

  static getStubConfig(hass?: HomeAssistant): Record<string, unknown> {
    const lights = hass
      ? Object.keys(hass.states)
          .filter((entity) => entity.startsWith("light."))
          .slice(0, 2)
      : [];
    return {
      title: "Lights",
      rooms: [
        {
          name: "Living room",
          lights: (lights.length ? lights : ["light.example"]).map(
            (entity) => ({ entity })
          ),
        },
      ],
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
    const rooms = config.rooms.map((room) => buildRoomView(this.hass!, room));
    const detail =
      this._detailRoom !== null ? rooms[this._detailRoom] : undefined;

    return html`
      <div class="card">
        <div class="header">
          <div class="title">${config.title ?? "Lights"}</div>
          <div class="summary">${summaryText(rooms)}</div>
        </div>

        <div class="chips">
          <button class="chip" @click=${() => this._allOn(rooms)}>
            <span class="chip-dot on"></span>All on
          </button>
          <button class="chip" @click=${() => this._allOff(rooms)}>
            <span class="chip-dot"></span>All off
          </button>
        </div>

        <div class="rooms">
          ${rooms.map((room, index) => this._renderRoom(room, index))}
        </div>

        ${config.scenes?.length
          ? html`
              <div class="panel">
                <div class="panel-title">Scenes</div>
                <div class="scene-grid">
                  ${config.scenes.map((scene) => this._renderScene(scene))}
                </div>
              </div>
            `
          : nothing}
        ${detail ? this._renderDetail(detail) : nothing}
      </div>
    `;
  }

  private _renderRoom(room: RoomView, index: number): TemplateResult {
    const unavailable = room.active.length === 0;
    const key = `room:${index}`;
    const fill =
      this._drag[key] ?? (room.anyOn ? room.avgBrightness || 100 : 0);

    return html`
      <div class="room ${unavailable ? "unavailable" : ""}">
        <div class="room-row" @click=${() => (this._detailRoom = index)}>
          <button
            class="dot-circle ${room.anyOn ? "" : "off"}"
            ?disabled=${unavailable}
            @click=${(e: Event) => {
              e.stopPropagation();
              this._toggleRoom(room);
            }}
          >
            <div class="dot"></div>
          </button>
          <div class="room-text">
            <div class="room-name">${room.config.name}</div>
            <div class="room-status ${room.anyOn ? "on" : ""}">
              ${room.statusText}
            </div>
          </div>
          <div class="chevron">›</div>
        </div>
        <div
          class="slider"
          @pointerdown=${(e: PointerEvent) =>
            unavailable || this._dragStart(e, key, true)}
          @pointermove=${(e: PointerEvent) => this._dragMove(e, key, true)}
          @pointerup=${() => {
            const pct = this._dragEnd(key);
            if (pct !== undefined) this._setRoom(room, pct);
          }}
          @pointercancel=${() => this._dragCancel(key)}
        >
          <div class="slider-fill" style="width: ${fill}%"></div>
        </div>
      </div>
    `;
  }

  private _renderScene(scene: SceneConfig): TemplateResult {
    const active = activeScene(this.hass!, this._config!.scenes!);
    return html`
      <button
        class="scene ${active === scene.entity ? "active" : ""}"
        @click=${() => this._applyScene(scene)}
      >
        <div
          class="scene-swatch"
          style=${styleMap(scene.gradient ? { background: scene.gradient } : {})}
        ></div>
        <div class="scene-name">${sceneName(this.hass!, scene)}</div>
      </button>
    `;
  }

  private _renderDetail(room: RoomView): TemplateResult {
    const unavailable = room.active.length === 0;
    return html`
      <div class="scrim" @click=${this._closeDetail}>
        <div class="sheet" @click=${(e: Event) => e.stopPropagation()}>
          <div class="sheet-header">
            <div class="dot-circle large ${room.anyOn ? "" : "off"}">
              <div class="dot"></div>
            </div>
            <div class="sheet-title">
              <div class="sheet-name">${room.config.name}</div>
              <div class="room-status ${room.anyOn ? "on" : ""}">
                ${room.statusText}
              </div>
            </div>
            <button class="close" @click=${this._closeDetail}>✕</button>
          </div>

          <div class="sheet-body">
            <div class="panel bulbs">
              ${room.lights.map((light) => this._renderBulb(light))}
            </div>
            ${room.lights
              .filter((light) => light.effectList.length > 0)
              .map((light) => this._renderEffects(light))}
          </div>

          <div class="sheet-actions">
            <button
              ?disabled=${unavailable}
              @click=${() => this._callLights(room, "turn_on")}
            >
              <span class="chip-dot on"></span>All on
            </button>
            <button
              ?disabled=${unavailable}
              @click=${() => this._callLights(room, "turn_off")}
            >
              <span class="chip-dot"></span>All off
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderBulb(light: LightView): TemplateResult {
    const dragging = this._drag[light.entity] !== undefined;
    const fill =
      this._drag[light.entity] ??
      (light.on ? (light.brightnessPct ?? 100) : 0);
    const status = dragging
      ? `${Math.round(fill)}%`
      : !light.available
        ? "Unavailable"
        : light.on
          ? light.brightnessPct !== null
            ? `${light.brightnessPct}%`
            : "On"
          : "Off";

    return html`
      <div class="bulb ${light.available ? "" : "unavailable"}">
        ${light.supportsBrightness
          ? html`
              <div
                class="bar"
                @pointerdown=${(e: PointerEvent) =>
                  light.available && this._dragStart(e, light.entity, false)}
                @pointermove=${(e: PointerEvent) =>
                  this._dragMove(e, light.entity, false)}
                @pointerup=${() => {
                  const pct = this._dragEnd(light.entity);
                  if (pct !== undefined) this._setLight(light, pct);
                }}
                @pointercancel=${() => this._dragCancel(light.entity)}
              >
                <div class="bar-fill" style="height: ${fill}%"></div>
              </div>
            `
          : nothing}
        <div class="bulb-name">${light.name}</div>
        <div class="bulb-status ${light.on ? "on" : ""}">${status}</div>
        <button
          class="toggle ${light.on ? "on" : ""}"
          ?disabled=${!light.available}
          @click=${() => this._toggleLight(light)}
        >
          <div class="knob"></div>
        </button>
      </div>
    `;
  }

  private _renderEffects(light: LightView): TemplateResult {
    const preview = light.rgbColor
      ? `rgb(${light.rgbColor.slice(0, 3).join(",")})`
      : undefined;
    return html`
      <div class="panel effects">
        <div
          class="effect-preview ${light.on ? "" : "off"}"
          style=${styleMap(
            light.on && preview ? { background: preview } : {}
          )}
        ></div>
        <div class="effect-chips">
          ${light.effectList.map(
            (effect) => html`
              <button
                class="effect ${light.currentEffect === effect ? "active" : ""}"
                @click=${() => this._setEffect(light, effect)}
              >
                ${effect}
              </button>
            `
          )}
        </div>
      </div>
    `;
  }

  private _closeDetail = (): void => {
    this._detailRoom = null;
    this._drag = {};
  };

  private _onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this._detailRoom !== null) {
      this._closeDetail();
    }
  };

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("keydown", this._onKeyDown);
  }

  disconnectedCallback(): void {
    window.removeEventListener("keydown", this._onKeyDown);
    super.disconnectedCallback();
  }

  // --- drag-to-dim -------------------------------------------------------------
  // The fill follows the pointer while dragging; the service call fires once
  // on release so the lights aren't flooded with brightness commands.

  private _dragStart(
    event: PointerEvent,
    key: string,
    horizontal: boolean
  ): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this._updateDrag(event, key, horizontal);
  }

  private _dragMove(
    event: PointerEvent,
    key: string,
    horizontal: boolean
  ): void {
    if (this._drag[key] === undefined) return;
    this._updateDrag(event, key, horizontal);
  }

  private _updateDrag(
    event: PointerEvent,
    key: string,
    horizontal: boolean
  ): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const fraction = horizontal
      ? (event.clientX - rect.left) / rect.width
      : (rect.bottom - event.clientY) / rect.height;
    const pct = Math.min(100, Math.max(0, Math.round(fraction * 100)));
    this._drag = { ...this._drag, [key]: pct };
  }

  /** Clears the drag and returns its final value, or undefined if none ran. */
  private _dragEnd(key: string): number | undefined {
    const pct = this._drag[key];
    if (pct === undefined) return undefined;
    this._dragCancel(key);
    return pct;
  }

  private _dragCancel(key: string): void {
    const { [key]: _dropped, ...rest } = this._drag;
    this._drag = rest;
  }

  // --- service calls ----------------------------------------------------------

  private _call(service: string, entities: string[], data?: Record<string, unknown>): void {
    if (!entities.length) return;
    void this.hass?.callService("light", service, {
      entity_id: entities,
      ...data,
    });
  }

  private _toggleLight(light: LightView): void {
    this._call(light.on ? "turn_off" : "turn_on", [light.entity]);
  }

  private _setLight(light: LightView, pct: number): void {
    if (pct === 0) this._call("turn_off", [light.entity]);
    else this._call("turn_on", [light.entity], { brightness_pct: pct });
  }

  private _toggleRoom(room: RoomView): void {
    this._callLights(room, room.anyOn ? "turn_off" : "turn_on");
  }

  private _callLights(room: RoomView, service: string): void {
    this._call(
      service,
      room.active.map((light) => light.entity)
    );
  }

  /** Room slider release: dim the dimmable lights, switch the rest on/off. */
  private _setRoom(room: RoomView, pct: number): void {
    if (pct === 0) {
      this._callLights(room, "turn_off");
      return;
    }
    const dimmable = room.active.filter((light) => light.supportsBrightness);
    const onOff = room.active.filter((light) => !light.supportsBrightness);
    this._call(
      "turn_on",
      dimmable.map((light) => light.entity),
      { brightness_pct: pct }
    );
    this._call(
      "turn_on",
      onOff.map((light) => light.entity)
    );
  }

  private _allOn(rooms: RoomView[]): void {
    this._call(
      "turn_on",
      rooms.flatMap((room) => room.active.map((light) => light.entity))
    );
  }

  private _allOff(rooms: RoomView[]): void {
    this._call(
      "turn_off",
      rooms.flatMap((room) => room.active.map((light) => light.entity))
    );
  }

  private _setEffect(light: LightView, effect: string): void {
    this._call("turn_on", [light.entity], { effect });
  }

  private _applyScene(scene: SceneConfig): void {
    void this.hass?.callService("scene", "turn_on", {
      entity_id: scene.entity,
    });
  }
}

// Guarded so loading the bundle twice (Lovelace resource + extra_module_url)
// doesn't throw on re-registration.
if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, RuLightsCard);
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: "RU Lights Card",
    description:
      "Room-grouped light control with scenes, drag-to-dim sliders and a per-bulb drilldown",
    documentationURL: "https://github.com/ragedunicorn/hass-custom",
  });
}
