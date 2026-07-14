/**
 * ru-tv-card — Android TV card: a media panel (power toggle, now-playing
 * title with a drag-to-seek progress bar, skip + transport buttons, volume
 * and app launcher chips) plus an optional remote panel (ring d-pad with
 * press feedback in its header, Back/Home icon keys).
 *
 * Spans the two media_player entities an Android TV exposes: `entity`
 * (androidtv_remote — power, foreground app, volume steps) and the optional
 * `media_entity` (cast — track title/position, seek, volume level). The
 * optional `remote_entity` drives the remote panel and app launches.
 *
 * A real TV reacts to power and seek commands seconds after the service
 * call, so both render optimistically: the toggle pulses in its target state
 * ("Turning on…") and the progress bar holds the seeked position until HA
 * confirms or a timeout passes.
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
  isIconRef,
  isTvOn,
  type TvMediaView,
  type TvView,
  type TvVolumeView,
} from "./tv-state";
import { cardStyles } from "./styles";

const CARD_TYPE = "ru-tv-card";

/** How long a remote press echoes in the panel header ("▲ Up"). */
const PAD_FEEDBACK_MS = 900;

const VOLUME_MODES = ["auto", "slider", "steppers"] as const;

/** Seek skip amounts in seconds, [back, forward]. */
const DEFAULT_SKIP: [number, number] = [10, 30];

/** How long the optimistic power state may outlive its service call. */
const POWER_PENDING_MS = 20000;

/** How long a seeked position holds without HA confirming it. */
const SEEK_PENDING_MS = 10000;

/** Volume stepper hold-to-repeat: initial delay, then one step per interval. */
const HOLD_DELAY_MS = 400;
const HOLD_REPEAT_MS = 250;

export class RuTvCard extends LitElement {
  static styles = cardStyles;

  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _drag: { state: true },
    _pendingPower: { state: true },
    _pendingSeek: { state: true },
    _padFeedback: { state: true },
  };

  hass?: HomeAssistant;

  private _config?: TvCardConfig;

  /** Live values (drag key → 0..100) of seek/volume drags in progress. */
  private _drag: Record<string, number> = {};

  /** Optimistic power target while turn_on/turn_off is in flight. */
  private _pendingPower?: { target: boolean; at: number };

  /** Last remote press, echoed in the panel header ("▲ Up") — the tapped
   * quadrant itself gives no lasting visual confirmation. */
  private _padFeedback = "";

  private _fbTimer?: ReturnType<typeof setTimeout>;

  /** Optimistic playback position (seconds) while a media_seek is in flight;
   * `stamp` is media_position_updated_at when the seek was issued — a changed
   * stamp means HA re-reported the position and the hold can end. */
  private _pendingSeek?: { seconds: number; at: number; stamp?: string };

  /** Ticks the playback position while a track plays. */
  private _clock?: ReturnType<typeof setInterval>;

  /** Hold-to-repeat timers of a pressed volume stepper. */
  private _holdDelay?: ReturnType<typeof setTimeout>;

  private _holdRepeat?: ReturnType<typeof setInterval>;

  /** True when a pointer press already fired the step — swallows the
   * trailing click so only keyboard activation goes through @click. */
  private _stepPointerFired = false;

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
    if (
      config.volume_entity &&
      !config.volume_entity.startsWith("media_player.")
    ) {
      throw new Error(
        `${CARD_TYPE}: "volume_entity" must be a media_player.* entity id`
      );
    }
    if (
      config.volume_mode !== undefined &&
      !VOLUME_MODES.includes(config.volume_mode)
    ) {
      throw new Error(
        `${CARD_TYPE}: "volume_mode" must be one of ${VOLUME_MODES.join(", ")}`
      );
    }
    if (config.skip_seconds !== undefined) {
      const skip = config.skip_seconds;
      if (
        !Array.isArray(skip) ||
        skip.length !== 2 ||
        skip.some((s) => typeof s !== "number" || !Number.isFinite(s) || s <= 0)
      ) {
        throw new Error(
          `${CARD_TYPE}: "skip_seconds" must be two positive numbers, [back, forward]`
        );
      }
    }
    for (const app of config.apps ?? []) {
      if (!app.name) {
        throw new Error(`${CARD_TYPE}: every app needs a "name"`);
      }
    }
    this._config = config;
    this._drag = {};
    this._pendingPower = undefined;
    this._pendingSeek = undefined;
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
    clearTimeout(this._fbTimer);
    this._holdStop();
    super.disconnectedCallback();
  }

  // Reflect HA's dark mode as a host attribute so the dark palette is pure
  // CSS (:host([dark]) in styles.ts) and stays overridable per property.
  protected willUpdate(): void {
    this.toggleAttribute("dark", this.hass?.themes?.darkMode ?? false);
    this._prunePending(Date.now());
  }

  /** Ends optimistic power/seek holds once HA confirms them (or they take
   * so long that showing live state again beats showing a stale promise). */
  private _prunePending(nowMs: number): void {
    if (!this._config || !this.hass) return;
    const power = this._pendingPower;
    if (power) {
      const on = isTvOn(this.hass.states[this._config.entity]);
      if (on === power.target || nowMs - power.at > POWER_PENDING_MS) {
        this._pendingPower = undefined;
      }
    }
    const seek = this._pendingSeek;
    if (seek && this._config.media_entity) {
      const stamp =
        this.hass.states[this._config.media_entity]?.attributes
          .media_position_updated_at;
      if (stamp !== seek.stamp || nowMs - seek.at > SEEK_PENDING_MS) {
        this._pendingSeek = undefined;
      }
    }
  }

  render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;

    const config = this._config;
    const view = buildTvView(
      this.hass,
      config,
      Date.now(),
      this._pendingPower?.target ?? null
    );

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
    // The toggle sits in its target position while a turn_on/off is in
    // flight (the TV takes seconds to react) and pulses until HA confirms.
    const pending = view.available ? this._pendingPower : undefined;
    const knobOn = pending?.target ?? view.on;
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
          class="toggle ${knobOn ? "on" : ""} ${pending ? "pending" : ""}"
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

    const position = this._displayPosition(media, Date.now());
    const positionPct =
      media.duration > 0 ? (position / media.duration) * 100 : 0;
    const seekPct = this._drag["seek"];
    const fill = seekPct ?? positionPct;
    const posText = formatTime(
      seekPct !== undefined ? (seekPct / 100) * media.duration : position
    );
    const [skipBack, skipForward] = this._config?.skip_seconds ?? DEFAULT_SKIP;

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
              class="progress seekable"
              @pointerdown=${(e: PointerEvent) => this._dragStart(e, "seek")}
              @pointermove=${(e: PointerEvent) => this._dragMove(e, "seek")}
              @pointerup=${() => {
                const pct = this._dragEnd("seek");
                if (pct !== undefined) {
                  this._seekTo(media, (pct / 100) * media.duration);
                }
              }}
              @pointercancel=${() => this._dragCancel("seek")}
            >
              <div class="progress-fill" style="width: ${fill}%"></div>
              <div class="progress-thumb" style="left: ${fill}%"></div>
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
      ${media.supportsPlayPause || media.supportsPrevNext || media.supportsSeek
        ? html`
            <div class="transport">
              ${media.supportsSeek
                ? html`
                    <button
                      class="t-skip"
                      aria-label="Skip back ${skipBack} seconds"
                      @click=${() => this._skip(media, -skipBack)}
                    >
                      ↺${skipBack}
                    </button>
                  `
                : nothing}
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
              ${media.supportsSeek
                ? html`
                    <button
                      class="t-skip"
                      aria-label="Skip forward ${skipForward} seconds"
                      @click=${() => this._skip(media, skipForward)}
                    >
                      ${skipForward}↻
                    </button>
                  `
                : nothing}
            </div>
          `
        : nothing}
    `;
  }

  /** Playback position for display: the optimistic seek target while one is
   * in flight (advancing in real time if playing), else the live position. */
  private _displayPosition(media: TvMediaView, nowMs: number): number {
    const seek = this._pendingSeek;
    if (seek === undefined) return media.position;
    const advance = media.playing ? (nowMs - seek.at) / 1000 : 0;
    return Math.min(media.duration, seek.seconds + advance);
  }

  private _renderVolume(view: TvView): TemplateResult | typeof nothing {
    const volume = view.volume;
    if (volume.kind === "none") return nothing;

    // Speaker body + waves; muted swaps the waves for an X and goes red.
    const label = html`
      <button
        class="vol-mute ${volume.muted ? "muted" : ""}"
        aria-label=${volume.muted ? "Unmute" : "Mute"}
        ?disabled=${!volume.supportsMute}
        @click=${() => this._toggleMute(volume)}
      >
        ${volume.muted
          ? html`
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M11 5 L6 9 H3 V15 H6 L11 19 Z" />
                <line x1="16" y1="9" x2="22" y2="15" />
                <line x1="22" y1="9" x2="16" y2="15" />
              </svg>
            `
          : html`
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M11 5 L6 9 H3 V15 H6 L11 19 Z" />
                <path d="M15 9 a4 4 0 0 1 0 6" />
                <path d="M17.5 6.5 a7.5 7.5 0 0 1 0 11" />
              </svg>
            `}
      </button>
    `;

    if (volume.kind === "steppers") {
      const stepper = (glyph: string, service: string, ariaLabel: string) => html`
        <button
          class="vol-step"
          aria-label=${ariaLabel}
          @pointerdown=${() => this._stepPress(volume, service)}
          @pointerup=${() => this._holdStop()}
          @pointerleave=${() => this._stepLeave()}
          @pointercancel=${() => this._stepLeave()}
          @click=${() => this._stepClick(volume, service)}
        >
          ${glyph}
        </button>
      `;
      return html`
        <div class="vol-row steppers">
          ${label} ${stepper("−", "volume_down", "Volume down")}
          ${volume.pct !== null
            ? html`
                <div class="vol-value mid">
                  ${volume.muted ? "—" : `${volume.pct}%`}
                </div>
              `
            : nothing}
          ${stepper("+", "volume_up", "Volume up")}
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
              ${app.icon
                ? isIconRef(app.icon)
                  ? html`
                      <ha-icon
                        class="app-glyph ${view.on ? "" : "dim"}"
                        .icon=${app.icon}
                        style=${styleMap({ color: app.color })}
                      ></ha-icon>
                    `
                  : html`
                      <div
                        class="app-icon ${view.on ? "" : "dim"}"
                        style=${styleMap({
                          backgroundImage: `url('${app.icon}')`,
                        })}
                      ></div>
                    `
                : html`
                    <div
                      class="app-dot-sm"
                      style=${styleMap({ background: app.color })}
                    ></div>
                  `}
              <div class="app-name">${app.name}</div>
            </button>
          `
        )}
      </div>
    `;
  }

  /** Ring d-pad (one big circle, rim = directions, center = OK — findable by
   * feel) with Back/Home icon keys below; every press echoes in the header. */
  private _renderRemote(view: TvView): TemplateResult {
    const quad = (glyph: string, label: string) => html`
      <button
        class="quad ${label.toLowerCase()}"
        aria-label=${label}
        ?disabled=${!view.available}
        @click=${() =>
          this._padPress(`DPAD_${label.toUpperCase()}`, glyph, label)}
      >
        ${glyph}
      </button>
    `;
    return html`
      <div class="panel ${view.on && view.available ? "" : "dimmed"}">
        <div class="remote-head">
          <div class="remote-title">Remote</div>
          <div class="pad-feedback">${this._padFeedback}</div>
        </div>
        <div class="ring-wrap">
          <div class="ring">
            ${quad("▲", "Up")} ${quad("▼", "Down")} ${quad("◀", "Left")}
            ${quad("▶", "Right")}
            <button
              class="ok"
              aria-label="OK"
              ?disabled=${!view.available}
              @click=${() => this._padPress("DPAD_CENTER", "●", "OK")}
            >
              OK
            </button>
          </div>
        </div>
        <div class="keys">
          <button
            class="key"
            aria-label="Back"
            ?disabled=${!view.available}
            @click=${() => this._padPress("BACK", "‹", "Back")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M15 5 L8 12 L15 19" />
            </svg>
          </button>
          <button
            class="key"
            aria-label="Home"
            ?disabled=${!view.available}
            @click=${() => this._padPress("HOME", "⌂", "Home")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 11 L12 3 L21 11" />
              <path d="M5 10 V20 H19 V10" />
            </svg>
          </button>
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

  /** Clicking while a toggle is already pending reverses the target, so a
   * mis-tap can be corrected without waiting out the TV's reaction time. */
  private _togglePower(view: TvView): void {
    const target = !(this._pendingPower?.target ?? view.on);
    this._pendingPower = { target, at: Date.now() };
    this._player(view.entity, target ? "turn_on" : "turn_off");
  }

  private _media(media: TvMediaView, service: string): void {
    this._player(media.entity, service);
  }

  /** Seeks to an absolute position and holds it optimistically — the cast
   * entity re-reports its position seconds later, and rendering the stale
   * value in between looks like the seek failed. */
  private _seekTo(media: TvMediaView, seconds: number): void {
    const clamped = Math.min(media.duration, Math.max(0, seconds));
    this._pendingSeek = {
      seconds: clamped,
      at: Date.now(),
      stamp:
        this.hass?.states[media.entity]?.attributes
          .media_position_updated_at,
    };
    this._player(media.entity, "media_seek", {
      seek_position: Math.round(clamped),
    });
  }

  private _skip(media: TvMediaView, deltaSeconds: number): void {
    // Base on the displayed (possibly still pending) position so quick
    // repeated skips stack instead of resetting to the stale HA position.
    const base = this._displayPosition(media, Date.now());
    this._seekTo(media, base + deltaSeconds);
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

  // --- volume stepper hold-to-repeat -------------------------------------------
  // Press fires one step immediately, holding repeats it; the trailing click
  // a pointer press always produces is swallowed via _stepPointerFired so
  // @click only acts on keyboard activation (Enter/Space).

  private _stepPress(volume: TvVolumeView, service: string): void {
    this._stepPointerFired = true;
    this._volumeStep(volume, service);
    this._holdStop();
    this._holdDelay = setTimeout(() => {
      this._holdRepeat = setInterval(
        () => this._volumeStep(volume, service),
        HOLD_REPEAT_MS
      );
    }, HOLD_DELAY_MS);
  }

  private _stepClick(volume: TvVolumeView, service: string): void {
    if (this._stepPointerFired) {
      this._stepPointerFired = false;
      return;
    }
    this._volumeStep(volume, service);
  }

  /** Pointer left the button — no click will follow, so also drop the flag. */
  private _stepLeave(): void {
    this._holdStop();
    this._stepPointerFired = false;
  }

  private _holdStop(): void {
    clearTimeout(this._holdDelay);
    clearInterval(this._holdRepeat);
    this._holdDelay = undefined;
    this._holdRepeat = undefined;
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

  /** Sends a remote key and echoes it in the panel header for a moment. */
  private _padPress(command: string, glyph: string, label: string): void {
    this._remoteCommand(command);
    clearTimeout(this._fbTimer);
    this._padFeedback = `${glyph} ${label}`;
    this._fbTimer = setTimeout(() => {
      this._padFeedback = "";
    }, PAD_FEEDBACK_MS);
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
