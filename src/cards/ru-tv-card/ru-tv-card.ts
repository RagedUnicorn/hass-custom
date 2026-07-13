/**
 * ru-tv-card — Android TV card: a media panel (power toggle, now-playing
 * title with a drag-to-seek progress bar, transport buttons, volume and app
 * launcher chips) plus an optional remote panel (d-pad, Back/Home/Guide).
 *
 * Spans the two media_player entities an Android TV exposes: `entity`
 * (androidtv_remote — power, foreground app, volume steps) and the optional
 * `media_entity` (cast — track title/position, seek, volume level). The
 * optional `remote_entity` drives the remote panel and app launches.
 *
 * YAML-only configuration; see README for the full schema.
 */

import { LitElement, html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { styleMap } from "lit/directives/style-map.js";

import type { HomeAssistant, TvAppConfig, TvCardConfig } from "../../types";
import {
  buildTvView,
  formatTime,
  type TvMediaView,
  type TvView,
  type TvVolumeView,
} from "./tv-state";
import { cardStyles } from "./styles";

const CARD_TYPE = "ru-tv-card";

/** Androidtv_remote key names for the remote panel. */
const REMOTE_KEYS = { back: "BACK", home: "HOME", guide: "GUIDE" } as const;

export class RuTvCard extends LitElement {
  static styles = cardStyles;

  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _drag: { state: true },
  };

  hass?: HomeAssistant;

  private _config?: TvCardConfig;

  /** Live values (drag key → 0..100) of seek/volume drags in progress. */
  private _drag: Record<string, number> = {};

  /** Ticks the playback position while a track plays. */
  private _clock?: ReturnType<typeof setInterval>;

  setConfig(config: TvCardConfig): void {
    if (!config?.entity || !config.entity.startsWith("media_player.")) {
      throw new Error(
        `${CARD_TYPE}: "entity" is required and must be a media_player.* entity id`
      );
    }
    if (
      config.media_entity &&
      !config.media_entity.startsWith("media_player.")
    ) {
      throw new Error(
        `${CARD_TYPE}: "media_entity" must be a media_player.* entity id`
      );
    }
    if (config.remote_entity && !config.remote_entity.startsWith("remote.")) {
      throw new Error(
        `${CARD_TYPE}: "remote_entity" must be a remote.* entity id`
      );
    }
    for (const app of config.apps ?? []) {
      if (!app.name) {
        throw new Error(`${CARD_TYPE}: every app needs a "name"`);
      }
    }
    this._config = config;
    this._drag = {};
  }

  getCardSize(): number {
    return 5 + (this._config?.remote_entity ? 3 : 0);
  }

  static getStubConfig(hass?: HomeAssistant): Record<string, unknown> {
    const player = hass
      ? Object.keys(hass.states).find((entity) =>
          entity.startsWith("media_player.")
        )
      : undefined;
    return {
      title: "Media",
      entity: player ?? "media_player.example_tv",
    };
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._clock = setInterval(() => this.requestUpdate(), 1000);
  }

  disconnectedCallback(): void {
    clearInterval(this._clock);
    super.disconnectedCallback();
  }

  // Reflect HA's dark mode as a host attribute so the dark palette is pure
  // CSS (:host([dark]) in styles.ts) and stays overridable per property.
  protected willUpdate(): void {
    this.toggleAttribute("dark", this.hass?.themes?.darkMode ?? false);
  }

  render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;

    const config = this._config;
    const view = buildTvView(this.hass, config, Date.now());

    return html`
      <div class="card">
        <div class="header">
          <div class="title">${config.title ?? "Media"}</div>
          <div class="summary">${view.summaryText}</div>
        </div>

        <div class="panel ${view.available ? "" : "unavailable"}">
          ${this._renderDeviceRow(view)}
          ${view.media
            ? html`
                <div class="controls ${view.on ? "" : "dimmed"}">
                  ${this._renderNowPlaying(view.media)}
                  ${this._renderVolume(view)}
                </div>
              `
            : view.volume.kind !== "none"
              ? html`
                  <div class="controls ${view.on ? "" : "dimmed"}">
                    ${this._renderVolume(view)}
                  </div>
                `
              : nothing}
          ${view.apps.length ? this._renderApps(view) : nothing}
        </div>

        ${view.hasRemote ? this._renderRemote(view) : nothing}
      </div>
    `;
  }

  private _renderDeviceRow(view: TvView): TemplateResult {
    return html`
      <div class="device-row">
        <div class="icon-circle ${view.on ? "" : "off"}">
          <div
            class="app-dot"
            style=${styleMap(
              view.on && view.activeColor
                ? {
                    background: view.activeColor,
                    boxShadow: `0 0 10px ${view.activeColor}aa`,
                  }
                : view.on
                  ? { background: "var(--ru-tv-accent)" }
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

  private _renderNowPlaying(media: TvMediaView): TemplateResult | typeof nothing {
    if (!media.hasTrack) return nothing;

    const seekPct = this._drag["seek"];
    const fill = seekPct ?? media.progressPct;
    const posText =
      seekPct !== undefined
        ? formatTime((seekPct / 100) * media.duration)
        : media.posText;

    return html`
      <div class="track">
        <div class="track-title">${media.title}</div>
        ${media.appName
          ? html`<div class="track-app">${media.appName}</div>`
          : nothing}
      </div>
      ${media.supportsSeek
        ? html`
            <div
              class="progress"
              @pointerdown=${(e: PointerEvent) => this._dragStart(e, "seek")}
              @pointermove=${(e: PointerEvent) => this._dragMove(e, "seek")}
              @pointerup=${() => {
                const pct = this._dragEnd("seek");
                if (pct !== undefined) this._seek(media, pct);
              }}
              @pointercancel=${() => this._dragCancel("seek")}
            >
              <div class="progress-fill" style="width: ${fill}%"></div>
            </div>
          `
        : html`
            <div class="progress">
              <div class="progress-fill" style="width: ${fill}%"></div>
            </div>
          `}
      <div class="times">
        <div class="time">${posText}</div>
        <div class="time">${media.durText}</div>
      </div>
      ${media.supportsPlayPause || media.supportsPrevNext
        ? html`
            <div class="transport">
              ${media.supportsPrevNext
                ? html`
                    <button
                      class="t-btn"
                      aria-label="Previous"
                      @click=${() => this._media(media, "media_previous_track")}
                    >
                      ◀◀
                    </button>
                  `
                : nothing}
              ${media.supportsPlayPause
                ? html`
                    <button
                      class="t-play"
                      aria-label=${media.playing ? "Pause" : "Play"}
                      @click=${() => this._media(media, "media_play_pause")}
                    >
                      ${media.playing ? "❘❘" : "▶"}
                    </button>
                  `
                : nothing}
              ${media.supportsPrevNext
                ? html`
                    <button
                      class="t-btn"
                      aria-label="Next"
                      @click=${() => this._media(media, "media_next_track")}
                    >
                      ▶▶
                    </button>
                  `
                : nothing}
            </div>
          `
        : nothing}
    `;
  }

  private _renderVolume(view: TvView): TemplateResult | typeof nothing {
    const volume = view.volume;
    if (volume.kind === "none") return nothing;

    const label = html`
      <button
        class="vol-label ${volume.muted ? "muted" : ""}"
        ?disabled=${!volume.supportsMute}
        @click=${() => this._toggleMute(volume)}
      >
        ${volume.muted ? "Muted" : "Vol"}
      </button>
    `;

    if (volume.kind === "steppers") {
      return html`
        <div class="vol-row">
          ${label}
          <button
            class="vol-step"
            aria-label="Volume down"
            @click=${() => this._volumeStep(volume, "volume_down")}
          >
            −
          </button>
          <button
            class="vol-step"
            aria-label="Volume up"
            @click=${() => this._volumeStep(volume, "volume_up")}
          >
            +
          </button>
        </div>
      `;
    }

    const dragPct = this._drag["vol"];
    const fill = dragPct ?? volume.pct ?? 0;
    const valueText = volume.muted
      ? "—"
      : `${Math.round(dragPct ?? volume.pct ?? 0)}%`;

    return html`
      <div class="vol-row">
        ${label}
        <div
          class="vol-track"
          @pointerdown=${(e: PointerEvent) => this._dragStart(e, "vol")}
          @pointermove=${(e: PointerEvent) => this._dragMove(e, "vol")}
          @pointerup=${() => {
            const pct = this._dragEnd("vol");
            if (pct !== undefined) this._setVolume(volume, pct);
          }}
          @pointercancel=${() => this._dragCancel("vol")}
        >
          <div
            class="vol-fill ${volume.muted ? "muted" : ""}"
            style="width: ${fill}%"
          ></div>
        </div>
        <div class="vol-value">${valueText}</div>
      </div>
    `;
  }

  private _renderApps(view: TvView): TemplateResult {
    return html`
      <div class="apps">
        ${view.apps.map(
          (app, index) => html`
            <button
              class="app ${app.active ? "active" : ""}"
              ?disabled=${!view.available || !app.activity}
              @click=${() => this._launchApp(this._config!.apps![index])}
            >
              <div
                class="app-dot-sm"
                style=${styleMap({ background: app.color })}
              ></div>
              <div class="app-name">${app.name}</div>
            </button>
          `
        )}
      </div>
    `;
  }

  private _renderRemote(view: TvView): TemplateResult {
    const pad = (label: string, command: string) => html`
      <button
        class="pad"
        aria-label=${command}
        ?disabled=${!view.available}
        @click=${() => this._remoteCommand(command)}
      >
        ${label}
      </button>
    `;
    return html`
      <div class="panel ${view.on && view.available ? "" : "dimmed"}">
        <div class="remote-title">Remote</div>
        <div class="remote-body">
          <div class="dpad">
            <div></div>
            ${pad("▲", "DPAD_UP")}
            <div></div>
            ${pad("◀", "DPAD_LEFT")}
            <button
              class="pad ok"
              aria-label="DPAD_CENTER"
              ?disabled=${!view.available}
              @click=${() => this._remoteCommand("DPAD_CENTER")}
            >
              OK
            </button>
            ${pad("▶", "DPAD_RIGHT")}
            <div></div>
            ${pad("▼", "DPAD_DOWN")}
            <div></div>
          </div>
          <div class="keys">
            <button class="key" @click=${() => this._remoteCommand(REMOTE_KEYS.back)}>
              Back
            </button>
            <button class="key" @click=${() => this._remoteCommand(REMOTE_KEYS.home)}>
              Home
            </button>
            <button class="key" @click=${() => this._remoteCommand(REMOTE_KEYS.guide)}>
              Guide
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // --- drag (seek + volume) ---------------------------------------------------
  // The fill follows the pointer while dragging; the service call fires once
  // on release so the TV isn't flooded with seek/volume commands.

  private _dragStart(event: PointerEvent, key: string): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this._updateDrag(event, key);
  }

  private _dragMove(event: PointerEvent, key: string): void {
    if (this._drag[key] === undefined) return;
    this._updateDrag(event, key);
  }

  private _updateDrag(event: PointerEvent, key: string): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const fraction = (event.clientX - rect.left) / rect.width;
    const pct = Math.min(100, Math.max(0, fraction * 100));
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

  private _player(
    entity: string,
    service: string,
    data?: Record<string, unknown>
  ): void {
    void this.hass?.callService("media_player", service, {
      entity_id: entity,
      ...data,
    });
  }

  private _togglePower(view: TvView): void {
    this._player(view.entity, view.on ? "turn_off" : "turn_on");
  }

  private _media(media: TvMediaView, service: string): void {
    this._player(media.entity, service);
  }

  private _seek(media: TvMediaView, pct: number): void {
    this._player(media.entity, "media_seek", {
      seek_position: Math.round((pct / 100) * media.duration),
    });
  }

  private _setVolume(volume: TvVolumeView, pct: number): void {
    if (!volume.entity) return;
    this._player(volume.entity, "volume_set", {
      volume_level: Math.round(pct) / 100,
    });
    if (volume.muted) this._toggleMute(volume);
  }

  private _volumeStep(volume: TvVolumeView, service: string): void {
    if (!volume.entity) return;
    this._player(volume.entity, service);
  }

  private _toggleMute(volume: TvVolumeView): void {
    if (!volume.entity) return;
    this._player(volume.entity, "volume_mute", {
      is_volume_muted: !volume.muted,
    });
  }

  /** remote.turn_on's `activity` launches apps on androidtv_remote; without
   * a remote entity fall back to play_media on the main media player. */
  private _launchApp(app: TvAppConfig): void {
    if (!app.activity) return;
    if (this._config?.remote_entity) {
      void this.hass?.callService("remote", "turn_on", {
        entity_id: this._config.remote_entity,
        activity: app.activity,
      });
      return;
    }
    this._player(this._config!.entity, "play_media", {
      media_content_id: app.activity,
      media_content_type: "url",
    });
  }

  private _remoteCommand(command: string): void {
    if (!this._config?.remote_entity) return;
    void this.hass?.callService("remote", "send_command", {
      entity_id: this._config.remote_entity,
      command,
    });
  }
}

// Guarded so loading the bundle twice (Lovelace resource + extra_module_url)
// doesn't throw on re-registration.
if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, RuTvCard);
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: "RU TV Card",
    description:
      "Android TV media card with now-playing seek, transport, volume, app launcher and a d-pad remote",
    documentationURL: "https://github.com/ragedunicorn/hass-custom",
  });
}
