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

/** How long a queued app launch waits for the TV to report on. Past it the
 * launch is dropped, never sent late — a launch fired at a TV HA still
 * believes is off carries a POWER keypress (see _sendLaunch). Generous:
 * androidtv_remote can take a while to reconnect after a wake. */
const LAUNCH_PENDING_MS = 30000;

/** How long a queued launch additionally waits after the TV first reports
 * on. The TV acknowledges power over the remote protocol seconds before
 * Android can act on an app link — a launch sent at the moment of the
 * on-report (or paired with the wake itself) lands mid-boot and is dropped
 * (home-assistant/core#92671). */
const LAUNCH_SETTLE_MS = 4000;

/** How long a seeked position holds without HA confirming it. */
const SEEK_PENDING_MS = 10000;

/** Volume stepper hold-to-repeat: initial delay, then one step per interval. */
const HOLD_DELAY_MS = 400;
const HOLD_REPEAT_MS = 250;

/** Keyboard backspace repeat: slower than the volume steppers — 400 ms is
 * already crossed by a deliberate click, and a stray extra delete hurts more
 * than a stray volume step. Matches OS key-repeat feel. */
const KB_HOLD_DELAY_MS = 650;
const KB_HOLD_REPEAT_MS = 300;

const KEYBOARD_MODES = ["text", "keycode"] as const;

/** Default percent per −/+ nudge beside the volume slider. */
const DEFAULT_VOLUME_STEP = 5;

/** How long a nudged volume level holds without HA confirming it. */
const NUDGE_PENDING_MS = 2000;

export class RuTvCard extends LitElement {
  static styles = cardStyles;

  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _drag: { state: true },
    _pendingPower: { state: true },
    _pendingLaunch: { state: true },
    _pendingSeek: { state: true },
    _padFeedback: { state: true },
    _nudge: { state: true },
  };

  hass?: HomeAssistant;

  private _config?: TvCardConfig;

  /** Live values (drag key → 0..100) of seek/volume drags in progress. */
  private _drag: Record<string, number> = {};

  /** Optimistic power target while turn_on/turn_off is in flight. */
  private _pendingPower?: { target: boolean; at: number };

  /** App chip whose launch rides a power-on: the chip pulses and the status
   * names the app until the launch goes out, LAUNCH_SETTLE_MS after the TV
   * first reports on (`onAt`, stamped by _flushPendingLaunch). The atomic
   * wake+launch path queues here too — its settled send doubles as the
   * retry for TVs that drop a launch arriving mid-wake. */
  private _pendingLaunch?: { app: TvAppConfig; at: number; onAt?: number };

  /** Last remote press, echoed in the panel header ("▲ Up") — the tapped
   * quadrant itself gives no lasting visual confirmation. */
  private _padFeedback = "";

  private _fbTimer?: ReturnType<typeof setTimeout>;

  /** Optimistic playback position (seconds) while a media_seek is in flight;
   * `stamp` is media_position_updated_at when the seek was issued — a changed
   * stamp means HA re-reported the position and the hold can end. */
  private _pendingSeek?: { seconds: number; at: number; stamp?: string };

  /** Optimistic volume percent while −/+ nudge volume_sets are in flight —
   * HA won't round-trip between hold-repeat ticks, so each tick compounds
   * on this instead of re-reading the stale reported level. */
  private _nudge?: { pct: number; at: number };

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
      config.source_entity &&
      !config.source_entity.startsWith("media_player.")
    ) {
      throw new Error(
        `${CARD_TYPE}: "source_entity" must be a media_player.* entity id`
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
    if (config.keyboard !== undefined && typeof config.keyboard !== "boolean") {
      throw new Error(`${CARD_TYPE}: "keyboard" must be true or false`);
    }
    if (config.keyboard && !config.remote_entity) {
      throw new Error(
        `${CARD_TYPE}: "keyboard" needs "remote_entity" — keys are sent through remote.send_command`
      );
    }
    if (
      config.keyboard_mode !== undefined &&
      !KEYBOARD_MODES.includes(config.keyboard_mode)
    ) {
      throw new Error(
        `${CARD_TYPE}: "keyboard_mode" must be one of ${KEYBOARD_MODES.join(", ")}`
      );
    }
    if (config.volume_step !== undefined) {
      const step = config.volume_step;
      if (
        typeof step !== "number" ||
        !Number.isFinite(step) ||
        step < 1 ||
        step > 25
      ) {
        throw new Error(
          `${CARD_TYPE}: "volume_step" must be a number from 1 to 25`
        );
      }
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
    this._pendingLaunch = undefined;
    this._pendingSeek = undefined;
    this._nudge = undefined;
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
    const nowMs = Date.now();
    this._prunePending(nowMs);
    this._flushPendingLaunch(nowMs);
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
    if (this._nudge && nowMs - this._nudge.at > NUDGE_PENDING_MS) {
      this._nudge = undefined;
    }
  }

  /** Sends a queued launch once the TV has been on for LAUNCH_SETTLE_MS, or
   * drops it if the TV never got there. Runs on every update, and the 1 s
   * clock guarantees a tick even when no state arrives — so the send lands
   * at most one tick past the settle. */
  private _flushPendingLaunch(nowMs: number): void {
    const launch = this._pendingLaunch;
    if (!launch) return;
    if (!this._launchTargetOn()) {
      if (nowMs - launch.at > LAUNCH_PENDING_MS) {
        this._pendingLaunch = undefined;
      }
      return;
    }
    if (launch.onAt === undefined) {
      this._pendingLaunch = { ...launch, onAt: nowMs };
    } else if (nowMs - launch.onAt >= LAUNCH_SETTLE_MS) {
      this._pendingLaunch = undefined;
      this._sendLaunch(launch.app);
    }
  }

  /** The on-state the launch services themselves consult: an androidtv_remote
   * remote entity's own state *is* the `is_on` that remote.turn_on checks
   * before sending a POWER key. Falls back to the primary entity when no
   * remote is configured. */
  private _launchTargetOn(): boolean {
    const entity = this._config?.remote_entity ?? this._config?.entity;
    return !!entity && isTvOn(this.hass?.states[entity]);
  }

  render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;

    const config = this._config;
    const view = buildTvView(
      this.hass,
      config,
      Date.now(),
      this._pendingPower?.target ?? null,
      this._pendingLaunch?.app.name ?? null
    );

    const showKeyboard = view.hasRemote && !!config.keyboard;
    return html`
      <div
        class="card ${view.hasRemote ? "has-remote" : ""} ${showKeyboard
          ? "has-keyboard"
          : ""}"
      >
        <div class="header">
          <div class="title">${config.title ?? "Media"}</div>
          <div class="summary">${view.summaryText}</div>
        </div>

        <div class="panel media ${view.available ? "" : "unavailable"}">
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
        ${showKeyboard ? this._renderKeyboard(view) : nothing}
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
        ?disabled=${!volume.supportsMute || !volume.available}
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
          ?disabled=${!volume.available}
          @pointerdown=${() =>
            this._stepPress(() => this._volumeStep(volume, service))}
          @pointerup=${() => this._holdStop()}
          @pointerleave=${() => this._stepLeave()}
          @pointercancel=${() => this._stepLeave()}
          @click=${() =>
            this._stepClick(() => this._volumeStep(volume, service))}
        >
          ${glyph}
        </button>
      `;
      return html`
        <div class="vol-row steppers ${volume.available ? "" : "unavailable"}">
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
    // Pending nudge value (pruned after NUDGE_PENDING_MS in willUpdate) —
    // keeps the fill and readout moving during a −/+ hold.
    const nudgePct = this._nudge?.pct;
    const fill = dragPct ?? nudgePct ?? volume.pct ?? 0;
    const valueText =
      volume.muted ||
      (dragPct === undefined && nudgePct === undefined && volume.pct === null)
        ? "—"
        : `${Math.round(fill)}%`;

    // −/+ beside the slider — always rendered, revealed by the
    // ru-tv-controls container query when the row has room (styles.ts).
    const nudge = (glyph: string, dir: 1 | -1, ariaLabel: string) => html`
      <button
        class="vol-nudge"
        aria-label=${ariaLabel}
        ?disabled=${!volume.available}
        @pointerdown=${() =>
          this._stepPress(() => this._nudgeVolume(volume, dir))}
        @pointerup=${() => this._holdStop()}
        @pointerleave=${() => this._stepLeave()}
        @pointercancel=${() => this._stepLeave()}
        @click=${() => this._stepClick(() => this._nudgeVolume(volume, dir))}
      >
        ${glyph}
      </button>
    `;

    return html`
      <div class="vol-row ${volume.available ? "" : "unavailable"}">
        ${label} ${nudge("−", -1, "Volume down")}
        <div
          class="vol-track ${volume.available ? "" : "disabled"}"
          @pointerdown=${(e: PointerEvent) => this._dragStart(e, "vol")}
          @pointermove=${(e: PointerEvent) => this._dragMove(e, "vol")}
          @pointerup=${() => {
            const pct = this._dragEnd("vol");
            if (pct !== undefined) {
              // The drag's absolute level supersedes any pending nudge.
              this._nudge = undefined;
              this._setVolume(volume, pct);
            }
          }}
          @pointercancel=${() => this._dragCancel("vol")}
        >
          <div
            class="vol-fill ${volume.muted ? "muted" : ""}"
            style="width: ${fill}%"
          ></div>
        </div>
        ${nudge("+", 1, "Volume up")}
        <div class="vol-value">${valueText}</div>
      </div>
    `;
  }

  private _renderApps(view: TvView): TemplateResult {
    // Config objects, not view rows: the queue holds the very object the
    // chip's click handler passes on.
    const configApps = this._config!.apps!;
    const queued = this._pendingLaunch?.app;
    return html`
      <div class="apps">
        ${view.apps.map(
          (app, index) => html`
            <button
              class="app ${app.active ? "active" : ""} ${configApps[index] ===
              queued
                ? "pending"
                : ""}"
              ?disabled=${!view.available || (!app.activity && !app.source)}
              @click=${() => this._launchApp(configApps[index])}
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
                      class="app-dot-sm ${view.on ? "" : "dim"}"
                      style=${styleMap({ background: app.color })}
                    >
                      ${app.name.charAt(0).toUpperCase()}
                    </div>
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
      <div class="panel remote ${view.on && view.available ? "" : "dimmed"}">
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

  /** On-screen QWERTY (config `keyboard`): printable keys go through
   * remote.send_command as `text:<char>` — androidtv_remote's IME text
   * channel, the documented way to type — because TVs swallow letter
   * KEYCODE_* key events while the integration's IME is active (digits
   * sneak through as channel keys, which misleads). Enter and backspace
   * stay key codes; there is no text: equivalent for them. Only rendered
   * with a remote_entity, only revealed by the wide layout (styles.ts) —
   * a phone column has no room for 40 keys. Backspace repeats while held
   * via the volume-stepper machinery; the TV screen itself is the typing
   * feedback. */
  private _renderKeyboard(view: TvView): TemplateResult {
    const key = (
      label: string | TemplateResult,
      command: string,
      ariaLabel: string,
      cls = ""
    ) => html`
      <button
        class="kb-key ${cls}"
        aria-label=${ariaLabel}
        ?disabled=${!view.available}
        @click=${() => this._remoteCommand(command)}
      >
        ${label}
      </button>
    `;
    const textMode = (this._config?.keyboard_mode ?? "text") === "text";
    const char = (c: string) =>
      key(c, textMode ? `text:${c}` : `KEYCODE_${c.toUpperCase()}`, c);
    const backspace = html`
      <button
        class="kb-key stretch"
        aria-label="Backspace"
        ?disabled=${!view.available}
        @pointerdown=${() =>
          this._stepPress(
            () => this._remoteCommand("KEYCODE_DEL"),
            KB_HOLD_DELAY_MS,
            KB_HOLD_REPEAT_MS
          )}
        @pointerup=${() => this._holdStop()}
        @pointerleave=${() => this._stepLeave()}
        @pointercancel=${() => this._stepLeave()}
        @click=${() =>
          this._stepClick(() => this._remoteCommand("KEYCODE_DEL"))}
      >
        ⌫
      </button>
    `;
    return html`
      <div class="panel keyboard ${view.on && view.available ? "" : "dimmed"}">
        <div class="kb-row">${[..."1234567890"].map(char)}</div>
        <div class="kb-row">${[..."qwertyuiop"].map(char)}</div>
        <div class="kb-row">${[..."asdfghjkl"].map(char)}</div>
        <div class="kb-row">${[..."zxcvbnm"].map(char)} ${backspace}</div>
        <div class="kb-row">
          ${key("space", textMode ? "text: " : "KEYCODE_SPACE", "Space", "space")}
          ${key("⏎", "KEYCODE_ENTER", "Enter", "stretch")}
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
    // Powering off abandons any queued launch — the TV is on its way down.
    if (!target) this._pendingLaunch = undefined;
    // Powering off also quits the app on the cast entity: a live cast
    // session (e.g. YouTube left open) wakes an Android TV right back up
    // moments after turn_off, endlessly ("wake on cast").
    const mediaEntity = this._config?.media_entity;
    if (
      !target &&
      mediaEntity &&
      mediaEntity !== view.entity &&
      isTvOn(this.hass?.states[mediaEntity])
    ) {
      this._player(mediaEntity, "turn_off");
    }
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
    if (!volume.entity || !volume.available) return;
    this._player(volume.entity, "volume_set", {
      volume_level: Math.round(pct) / 100,
    });
    if (volume.muted) this._toggleMute(volume);
  }

  private _volumeStep(volume: TvVolumeView, service: string): void {
    if (!volume.entity || !volume.available) return;
    this._player(volume.entity, service);
  }

  /** One −/+ press beside the slider: an absolute volume_set at the current
   * level ± volume_step. Bases on the pending nudge value so hold-repeat
   * ticks and quick taps compound instead of re-reading the stale level. */
  private _nudgeVolume(volume: TvVolumeView, dir: 1 | -1): void {
    if (!volume.entity || !volume.available) return;
    const step = this._config?.volume_step ?? DEFAULT_VOLUME_STEP;
    const now = Date.now();
    const base =
      this._nudge && now - this._nudge.at < NUDGE_PENDING_MS
        ? this._nudge.pct
        : (volume.pct ?? 0);
    const next = Math.min(100, Math.max(0, base + dir * step));
    this._nudge = { pct: next, at: now };
    this._setVolume(volume, next);
  }

  // --- volume stepper hold-to-repeat -------------------------------------------
  // Press fires one step immediately, holding repeats it; the trailing click
  // a pointer press always produces is swallowed via _stepPointerFired so
  // @click only acts on keyboard activation (Enter/Space).

  private _stepPress(
    step: () => void,
    delayMs = HOLD_DELAY_MS,
    repeatMs = HOLD_REPEAT_MS
  ): void {
    this._stepPointerFired = true;
    step();
    this._holdStop();
    this._holdDelay = setTimeout(() => {
      this._holdRepeat = setInterval(step, repeatMs);
    }, delayMs);
  }

  private _stepClick(step: () => void): void {
    if (this._stepPointerFired) {
      this._stepPointerFired = false;
      return;
    }
    step();
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
    if (!volume.entity || !volume.available) return;
    this._player(volume.entity, "volume_mute", {
      is_volume_muted: !volume.muted,
    });
  }

  /** Launches an app, keyed on what HA believes about the TV. Confirmed on:
   * the launch goes out directly. Confirmed off (the remote entity itself
   * reports `off`): a remote.turn_on goes out right away — its POWER prefix
   * wakes the TV, and a TV that honors the paired launch opens the app
   * straight from standby — and the launch *also* queues, because many TVs
   * drop a launch arriving mid-wake (home-assistant/core#92671) and need
   * the settled re-send. Waking (a turn-on in flight): HA's "off" is stale
   * and remote.turn_on would land a *second* POWER switching the TV back
   * off, so the launch only queues. Chips with no atomic wake (a `source`
   * chip, the play_media fallback, a disconnected remote) queue behind a
   * media_player.turn_on instead. */
  private _launchApp(app: TvAppConfig): void {
    const nowMs = Date.now();
    const wakeInFlight = this._pendingPower?.target === true;
    if (this._launchTargetOn() && !wakeInFlight) {
      this._sendLaunch(app);
      return;
    }
    const remoteEntity = this._config?.remote_entity;
    if (
      !wakeInFlight &&
      app.activity &&
      !app.source &&
      remoteEntity &&
      this.hass?.states[remoteEntity]?.state === "off"
    ) {
      this._pendingPower = { target: true, at: nowMs };
      this._pendingLaunch = { app, at: nowMs };
      this._sendLaunch(app);
      return;
    }
    this._pendingLaunch = { app, at: nowMs };
    // Tapping a chip on an off TV means "put this on" — wake it, unless a
    // turn-on is already in flight. A turn-off in flight reverses, matching
    // the power toggle's own "clicking while pending reverses" rule.
    if (!wakeInFlight && !isTvOn(this.hass?.states[this._config!.entity])) {
      this._pendingPower = { target: true, at: nowMs };
      this._player(this._config!.entity, "turn_on");
    }
  }

  /** A `source` chip switches TV input via select_source (braviatv exposes
   * HDMI inputs); otherwise remote.turn_on's `activity` launches apps on
   * androidtv_remote, falling back to play_media on the main media player.
   * Called with the TV confirmed on, or — remote branch only — confirmed
   * off, where remote.turn_on's POWER prefix wakes it; see _launchApp. */
  private _sendLaunch(app: TvAppConfig): void {
    if (app.source) {
      this._player(
        this._config?.source_entity ?? this._config!.entity,
        "select_source",
        { source: app.source }
      );
      return;
    }
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
