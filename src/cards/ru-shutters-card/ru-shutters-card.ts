/**
 * ru-shutters-card — shutters view card: summary header, global up/down/stop
 * chips, per-room cards, position presets, and a drilldown overlay (bottom
 * sheet on phones, centered dialog on wide screens) with draggable
 * per-shutter position targets.
 *
 * YAML-only configuration; see README for the full schema.
 */

import { LitElement, html, nothing } from "lit";
import type { TemplateResult } from "lit";

import type {
  HomeAssistant,
  PresetConfig,
  ShuttersCardConfig,
} from "../../types";
import {
  buildRoomView,
  presetActive,
  summaryText,
  type CoverView,
  type RoomView,
} from "./cover-state";
import { cardStyles } from "./styles";

const CARD_TYPE = "ru-shutters-card";

const DEFAULT_PRESETS: PresetConfig[] = [
  { name: "Morning", icon: "mdi:weather-sunny", position: 100 },
  { name: "Half", icon: "mdi:circle-half-full", position: 50 },
  { name: "Privacy", icon: "mdi:eye-off-outline", position: 20 },
  { name: "Night", icon: "mdi:weather-night", position: 0 },
];

export class RuShuttersCard extends LitElement {
  static styles = cardStyles;

  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _detailRoom: { state: true },
    _drag: { state: true },
  };

  hass?: HomeAssistant;

  private _config?: ShuttersCardConfig;

  /** Index into config.rooms of the open drilldown, or null when closed. */
  private _detailRoom: number | null = null;

  /** Live positions (entity → 0..100) of drags in progress. */
  private _drag: Record<string, number> = {};

  setConfig(config: ShuttersCardConfig): void {
    if (!config || !Array.isArray(config.rooms) || config.rooms.length === 0) {
      throw new Error(
        `${CARD_TYPE}: "rooms" is required and must be a non-empty list`
      );
    }
    for (const room of config.rooms) {
      if (!room.name) {
        throw new Error(`${CARD_TYPE}: every room needs a "name"`);
      }
      if (!Array.isArray(room.covers) || room.covers.length === 0) {
        throw new Error(
          `${CARD_TYPE}: room "${room.name}" needs a non-empty "covers" list`
        );
      }
      for (const cover of room.covers) {
        if (!cover.entity || !cover.entity.startsWith("cover.")) {
          throw new Error(
            `${CARD_TYPE}: room "${room.name}" has an invalid cover entity ` +
              `"${cover.entity ?? ""}" — expected a cover.* entity id`
          );
        }
      }
    }
    for (const preset of config.presets ?? []) {
      if (
        !preset.name ||
        typeof preset.position !== "number" ||
        preset.position < 0 ||
        preset.position > 100
      ) {
        throw new Error(
          `${CARD_TYPE}: every preset needs a "name" and a "position" between 0 and 100`
        );
      }
    }
    this._config = config;
    this._detailRoom = null;
    this._drag = {};
  }

  getCardSize(): number {
    return 3 + 2 * (this._config?.rooms.length ?? 0);
  }

  static getStubConfig(hass?: HomeAssistant): Record<string, unknown> {
    const covers = hass
      ? Object.keys(hass.states)
          .filter((entity) => entity.startsWith("cover."))
          .slice(0, 2)
      : [];
    return {
      title: "Shutters",
      rooms: [
        {
          name: "Living room",
          covers: (covers.length ? covers : ["cover.example"]).map(
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
    const presets = config.presets ?? DEFAULT_PRESETS;
    const anyMoving = rooms.some((room) => room.anyMoving);
    const detail =
      this._detailRoom !== null ? rooms[this._detailRoom] : undefined;

    return html`
      <div class="card">
        <div class="header">
          <div class="title">${config.title ?? "Shutters"}</div>
          <div class="summary">${summaryText(rooms)}</div>
        </div>

        <div class="chips">
          <button class="chip" @click=${() => this._callAll(rooms, "open_cover")}>
            <span class="glyph-up">▲</span>All up
          </button>
          <button class="chip" @click=${() => this._callAll(rooms, "close_cover")}>
            <span class="glyph-down">▼</span>All down
          </button>
          <button
            class="chip ${anyMoving ? "" : "dim"}"
            @click=${() => this._stopAll(rooms)}
          >
            <span class="glyph-stop">■</span>Stop
          </button>
        </div>

        <div class="rooms">
          ${rooms.map((room, index) => this._renderRoom(room, index))}
        </div>

        <div class="panel">
          <div class="panel-title">Presets</div>
          <div class="preset-grid">
            ${presets.map((preset) => this._renderPreset(preset, rooms))}
          </div>
        </div>

        ${detail ? this._renderDetail(detail) : nothing}
      </div>
    `;
  }

  private _renderRoom(room: RoomView, index: number): TemplateResult {
    const unavailable = room.active.length === 0;
    return html`
      <div class="room ${unavailable ? "unavailable" : ""}">
        <div class="room-row" @click=${() => (this._detailRoom = index)}>
          <div class="icon-circle small ${room.allClosed || unavailable ? "closed" : ""}">
            <ha-icon
              .icon=${room.config.icon ?? "mdi:window-shutter"}
            ></ha-icon>
          </div>
          <div class="room-text">
            <div class="room-name">${room.config.name}</div>
            <div class="room-status ${room.anyMoving ? "moving" : ""}">
              ${room.statusText}
            </div>
          </div>
          <div class="chevron">›</div>
        </div>
        <div class="room-buttons">
          <button
            ?disabled=${unavailable}
            @click=${() => this._callRoom(room, "open_cover")}
          >
            ▲
          </button>
          <button
            class="stop ${room.anyMoving ? "" : "dim"}"
            ?disabled=${unavailable}
            @click=${() => this._callRoom(room, "stop_cover")}
          >
            ■
          </button>
          <button
            ?disabled=${unavailable}
            @click=${() => this._callRoom(room, "close_cover")}
          >
            ▼
          </button>
        </div>
      </div>
    `;
  }

  private _renderPreset(
    preset: PresetConfig,
    rooms: RoomView[]
  ): TemplateResult {
    return html`
      <button
        class="preset ${presetActive(preset, rooms) ? "active" : ""}"
        @click=${() => this._setAll(rooms, preset.position)}
      >
        <div class="preset-icon"><ha-icon .icon=${preset.icon}></ha-icon></div>
        <div class="preset-name">${preset.name}</div>
      </button>
    `;
  }

  private _renderDetail(room: RoomView): TemplateResult {
    const unavailable = room.active.length === 0;
    return html`
      <div class="scrim" @click=${this._closeDetail}>
        <div class="sheet" @click=${(e: Event) => e.stopPropagation()}>
          <div class="sheet-header">
            <div class="icon-circle ${room.allClosed || unavailable ? "closed" : ""}">
              <ha-icon
                .icon=${room.config.icon ?? "mdi:window-shutter"}
              ></ha-icon>
            </div>
            <div class="sheet-title">
              <div class="sheet-name">${room.config.name}</div>
              <div class="room-status ${room.anyMoving ? "moving" : ""}">
                ${room.statusText}
              </div>
            </div>
            <button class="close" @click=${this._closeDetail}>✕</button>
          </div>

          <div class="panel targets">
            ${room.covers.map((cover) => this._renderTarget(cover))}
          </div>

          <div class="sheet-actions">
            <button
              ?disabled=${unavailable}
              @click=${() => this._callRoom(room, "open_cover")}
            >
              <span class="glyph-up">▲</span>All up
            </button>
            <button
              class=${room.anyMoving ? "" : "dim"}
              ?disabled=${unavailable}
              @click=${() => this._callRoom(room, "stop_cover")}
            >
              <span class="glyph-stop">■</span>Stop
            </button>
            <button
              ?disabled=${unavailable}
              @click=${() => this._callRoom(room, "close_cover")}
            >
              <span class="glyph-down">▼</span>All down
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderTarget(cover: CoverView): TemplateResult {
    const dragging = this._drag[cover.entity] !== undefined;
    const shownPosition =
      this._drag[cover.entity] ??
      cover.position ??
      (cover.statusWord === "Open" ? 100 : 0);
    const showPercent =
      (this._config?.show_percent ?? false) && cover.position !== null;
    const status = dragging
      ? `${Math.round(shownPosition)}%`
      : showPercent
        ? `${cover.statusWord} · ${Math.round(cover.position!)}%`
        : cover.statusWord;

    return html`
      <div class="target ${cover.available ? "" : "unavailable"}">
        ${cover.supportsPosition
          ? html`
              <div
                class="window"
                @pointerdown=${(e: PointerEvent) => this._dragStart(e, cover)}
                @pointermove=${(e: PointerEvent) =>
                  this._dragMove(e, cover.entity)}
                @pointerup=${(e: PointerEvent) =>
                  this._dragEnd(e, cover.entity)}
                @pointercancel=${() => this._dragCancel(cover.entity)}
              >
                <div
                  class="slats"
                  style="height: ${100 - shownPosition}%"
                ></div>
              </div>
            `
          : nothing}
        <div class="target-name">${cover.name}</div>
        <div class="target-status ${cover.moving ? "moving" : ""}">
          ${status}
        </div>
        <div class="target-buttons">
          <button
            ?disabled=${!cover.available}
            @click=${() => this._callCovers([cover.entity], "open_cover")}
          >
            ▲
          </button>
          <button
            class="stop ${cover.moving ? "" : "dim"}"
            ?disabled=${!cover.available}
            @click=${() => this._callCovers([cover.entity], "stop_cover")}
          >
            ■
          </button>
          <button
            ?disabled=${!cover.available}
            @click=${() => this._callCovers([cover.entity], "close_cover")}
          >
            ▼
          </button>
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

  // --- drag-to-position ------------------------------------------------------
  // The slats follow the pointer while dragging; the service call fires once
  // on release so the cover isn't flooded with position commands.

  private _dragStart(event: PointerEvent, cover: CoverView): void {
    if (!cover.available || !cover.supportsPosition) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this._updateDrag(event, cover.entity);
  }

  private _dragMove(event: PointerEvent, entity: string): void {
    if (this._drag[entity] === undefined) return;
    this._updateDrag(event, entity);
  }

  private _updateDrag(event: PointerEvent, entity: string): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const position = Math.min(
      100,
      Math.max(0, Math.round(((rect.bottom - event.clientY) / rect.height) * 100))
    );
    this._drag = { ...this._drag, [entity]: position };
  }

  private _dragEnd(event: PointerEvent, entity: string): void {
    const position = this._drag[entity];
    if (position === undefined) return;
    this._dragCancel(entity);
    void this.hass?.callService("cover", "set_cover_position", {
      entity_id: entity,
      position,
    });
  }

  private _dragCancel(entity: string): void {
    const { [entity]: _dropped, ...rest } = this._drag;
    this._drag = rest;
  }

  // --- service calls ----------------------------------------------------------

  private _callCovers(entities: string[], service: string): void {
    if (!entities.length) return;
    void this.hass?.callService("cover", service, { entity_id: entities });
  }

  private _callRoom(room: RoomView, service: string): void {
    this._callCovers(
      room.active.map((cover) => cover.entity),
      service
    );
  }

  private _setAll(rooms: RoomView[], position: number): void {
    const entities = rooms
      .flatMap((room) => room.active)
      .filter((cover) => cover.supportsPosition)
      .map((cover) => cover.entity);
    if (!entities.length) return;
    void this.hass?.callService("cover", "set_cover_position", {
      entity_id: entities,
      position,
    });
  }

  private _callAll(rooms: RoomView[], service: string): void {
    this._callCovers(
      rooms.flatMap((room) => room.active.map((cover) => cover.entity)),
      service
    );
  }

  private _stopAll(rooms: RoomView[]): void {
    this._callAll(rooms, "stop_cover");
  }
}

// Guarded so loading the bundle twice (Lovelace resource + extra_module_url)
// doesn't throw on re-registration.
if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, RuShuttersCard);
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: "RU Shutters Card",
    description:
      "Room-grouped shutter control with presets and a drag-to-position drilldown",
    documentationURL: "https://github.com/ragedunicorn/hass-custom",
  });
}
