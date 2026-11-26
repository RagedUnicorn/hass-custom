/**
 * ru-music-card — Music Assistant player card: a speaker switcher with a
 * group toggle, now playing (cover, seek, transport, repeat), absolute
 * volume per speaker, and the music library — playlists, liked songs,
 * albums, artists — with search and a read-only queue view.
 *
 * Playback, volume and grouping go through the speakers' media_player
 * entities; the library, search and queue are read through the
 * music_assistant.get_library / search / get_queue actions (response data),
 * and a tapped row plays through music_assistant.play_media.
 *
 * YAML-only configuration; see docs/ru-music-card/ru-music-card.md.
 */

import { LitElement, html, nothing } from "lit";
import type { TemplateResult } from "lit";

import { formatTime } from "../../media";
import type {
  HomeAssistant,
  MusicCardConfig,
  MusicPlayerConfig,
} from "../../types";
import {
  KIND_LABELS,
  LIBRARY_KINDS,
  REPEAT_NEXT,
  buildMusicView,
  buildQueueView,
  libraryRow,
  searchRows,
  type LibraryKind,
  type LibraryRowView,
  type MaMediaItem,
  type MaQueueDetails,
  type MusicView,
  type NowPlayingView,
  type QueueRowView,
  type VolumeRowView,
} from "./music-state";
import { cardStyles } from "./styles";

const CARD_TYPE = "ru-music-card";

type Tab = LibraryKind | "queue";

const DEFAULT_LIBRARY_LIMIT = 100;
const DEFAULT_SEARCH_LIMIT = 5;

/** Queue items asked for where the get_queue action supports `limit`. */
const QUEUE_LIMIT = 50;

/** Pause after the last keystroke before a search goes out. */
const SEARCH_DEBOUNCE_MS = 350;

/** How long the panel-header feedback ("Playing on Workshop") stays. */
const FEEDBACK_MS = 1800;

/** How long a seeked position holds without HA confirming it. */
const SEEK_PENDING_MS = 10000;

/** Re-read the queue this long after enqueueing — "add" changes nothing in
 * the player's state, so no state change would trigger the refresh. */
const QUEUE_REFRESH_MS = 1000;

/** Library tab order — "track" is the Liked tab, newest likes first. */
const ORDER_BY: Record<LibraryKind, string> = {
  playlist: "name",
  track: "timestamp_added_desc",
  album: "name",
  artist: "name",
};

type Load<T> =
  | { status: "loading" }
  | { status: "ready"; value: T }
  | { status: "error"; message: string };

interface QueueState {
  entity: string;
  /** Player state the read belongs to; a changed key triggers a re-read. */
  key: string;
  load: Load<MaQueueDetails | null>;
}

function errorText(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

export class RuMusicCard extends LitElement {
  static styles = cardStyles;

  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _sel: { state: true },
    _tab: { state: true },
    _query: { state: true },
    _lib: { state: true },
    _search: { state: true },
    _queue: { state: true },
    _feedback: { state: true },
    _drag: { state: true },
    _pendingSeek: { state: true },
  };

  hass?: HomeAssistant;

  private _config?: MusicCardConfig;

  /** Index of the selected speaker in config.players. */
  private _sel = 0;

  private _tab: Tab = "playlist";

  private _query = "";

  private _lib: Partial<Record<LibraryKind, Load<LibraryRowView[]>>> = {};

  private _search?: { query: string; load: Load<LibraryRowView[]> };

  private _queue?: QueueState;

  /** Whether get_queue takes `limit` (and lists the queue's items). Unknown
   * until the first answer; older HA releases reject the field. */
  private _queueItemsSupported?: boolean;

  private _queueToken = 0;

  private _feedback = "";

  /** Live values (drag key → 0..100) of seek/volume drags in progress. */
  private _drag: Record<string, number> = {};

  private _pendingSeek?: { seconds: number; at: number; stamp?: string };

  private _entryId?: Promise<string>;

  /** The view of the last render — event handlers act on what was shown. */
  private _view?: MusicView;

  private _clock?: ReturnType<typeof setInterval>;

  private _fbTimer?: ReturnType<typeof setTimeout>;

  private _searchTimer?: ReturnType<typeof setTimeout>;

  setConfig(config: MusicCardConfig): void {
    if (!Array.isArray(config?.players) || config.players.length === 0) {
      throw new Error(
        `${CARD_TYPE}: "players" is required — a list of Music Assistant media_player.* entities`
      );
    }
    for (const player of config.players) {
      const entity =
        typeof player === "string"
          ? player
          : (player as MusicPlayerConfig | undefined)?.entity;
      if (typeof entity !== "string" || !entity.startsWith("media_player.")) {
        throw new Error(
          `${CARD_TYPE}: every player must be a media_player.* entity id`
        );
      }
    }
    const checkRange = (key: "library_limit" | "search_limit", max: number) => {
      const value = config[key];
      if (
        value !== undefined &&
        (typeof value !== "number" ||
          !Number.isInteger(value) ||
          value < 1 ||
          value > max)
      ) {
        throw new Error(
          `${CARD_TYPE}: "${key}" must be a whole number from 1 to ${max}`
        );
      }
    };
    checkRange("library_limit", 500);
    checkRange("search_limit", 50);
    if (
      config.config_entry_id !== undefined &&
      typeof config.config_entry_id !== "string"
    ) {
      throw new Error(`${CARD_TYPE}: "config_entry_id" must be a string`);
    }
    this._config = config;
    this._sel = 0;
    this._tab = "playlist";
    this._query = "";
    this._lib = {};
    this._search = undefined;
    this._queue = undefined;
    this._drag = {};
    this._pendingSeek = undefined;
    this._entryId = undefined;
  }

  /** Sections views: fill the section — the card adapts to the width it is
   * given (container queries). A dashboard's own grid_options still win. */
  getGridOptions(): { columns: "full" } {
    return { columns: "full" };
  }

  getCardSize(): number {
    return 10;
  }

  static getStubConfig(hass?: HomeAssistant): Record<string, unknown> {
    const players = hass
      ? Object.keys(hass.states).filter(
          (entity) =>
            entity.startsWith("media_player.") &&
            hass.states[entity].attributes.mass_player_type !== undefined
        )
      : [];
    return {
      title: "Music",
      players: players.length ? players : ["media_player.example_speaker"],
    };
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._clock = setInterval(() => this.requestUpdate(), 1000);
  }

  disconnectedCallback(): void {
    clearInterval(this._clock);
    clearTimeout(this._fbTimer);
    clearTimeout(this._searchTimer);
    super.disconnectedCallback();
  }

  protected willUpdate(): void {
    this.toggleAttribute("dark", this.hass?.themes?.darkMode ?? false);
    this._prunePendingSeek();
  }

  protected updated(): void {
    if (!this._config || !this.hass || !this._view) return;
    if (this._tab !== "queue" && !this._lib[this._tab]) {
      void this._loadLibrary(this._tab);
    }
    const entity = this._view.now.entity;
    const key = this._queueKey(entity);
    if (this._queue?.entity !== entity || this._queue.key !== key) {
      void this._loadQueue(entity, key);
    }
  }

  private _prunePendingSeek(): void {
    const seek = this._pendingSeek;
    if (!seek || !this.hass || !this._view) return;
    const stamp =
      this.hass.states[this._view.now.entity]?.attributes
        .media_position_updated_at;
    if (stamp !== seek.stamp || Date.now() - seek.at > SEEK_PENDING_MS) {
      this._pendingSeek = undefined;
    }
  }

  /** What the queue read depends on — a new track, a new state, a new
   * player all mean a stale queue. */
  private _queueKey(entity: string): string {
    const stateObj = this.hass?.states[entity];
    return [
      stateObj?.state,
      stateObj?.attributes.media_title,
      stateObj?.attributes.media_content_id,
    ].join("|");
  }

  render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const view = buildMusicView(this.hass, this._config, this._sel, Date.now());
    this._view = view;
    return html`
      <div class="card">
        <div class="header">
          <div class="title">${this._config.title ?? "Music"}</div>
          <div class="summary">${view.summaryText}</div>
        </div>
        <div class="cols">
          <div class="panel player">
            ${this._renderSpeakers(view)} ${this._renderNowPlaying(view.now)}
            ${this._renderVolumes(view)}
          </div>
          ${this._renderLibrary(view)}
        </div>
      </div>
    `;
  }

  // --- player panel ------------------------------------------------------------

  private _renderSpeakers(view: MusicView): TemplateResult {
    return html`
      <div class="speakers">
        ${view.speakers.map(
          (speaker, index) => html`
            <button
              class="speaker ${speaker.active ? "active" : ""}"
              aria-pressed=${index === this._sel ? "true" : "false"}
              @click=${() => this._select(index)}
            >
              <div class="dot ${speaker.playing ? "on" : ""}"></div>
              <div class="speaker-text">
                <div class="speaker-name">${speaker.name}</div>
                <div class="speaker-status">${speaker.status}</div>
              </div>
            </button>
          `
        )}
        ${view.canGroup
          ? html`
              <button
                class="group ${view.grouped ? "on" : ""}"
                aria-label=${view.grouped ? "Ungroup" : "Group speakers"}
                title=${view.grouped ? "Ungroup" : "Group speakers"}
                ?disabled=${!view.now.available}
                @click=${() => this._toggleGroup(view)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                >
                  <circle cx="9" cy="12" r="5" />
                  <circle cx="15" cy="12" r="5" />
                </svg>
              </button>
            `
          : nothing}
      </div>
    `;
  }

  private _renderNowPlaying(now: NowPlayingView): TemplateResult {
    const has = now.hasTrack;
    const position = this._displayPosition(now);
    const seekPct = this._drag["seek"];
    const pct =
      seekPct ?? (now.duration > 0 ? (position / now.duration) * 100 : 0);
    const posText = formatTime(
      seekPct !== undefined ? (seekPct / 100) * now.duration : position
    );
    const seekable = has && now.supportsSeek && now.duration > 0;
    const disabled = !now.available;
    return html`
      <div class="now ${has && now.available ? "" : "dimmed"}">
        <div class="track">
          ${this._art(now.picture, "cover")}
          <div class="track-text">
            <div class="track-title">
              ${has ? now.title : now.available ? "Nothing playing" : "Unavailable"}
            </div>
            <div class="track-artist">
              ${has ? now.artist : "Pick something from the library"}
            </div>
          </div>
        </div>
        <div
          class="progress ${seekable ? "seekable" : ""}"
          @pointerdown=${(e: PointerEvent) =>
            seekable && this._dragStart(e, "seek")}
          @pointermove=${(e: PointerEvent) => this._dragMove(e, "seek")}
          @pointerup=${() => {
            const end = this._dragEnd("seek");
            if (end !== undefined) this._seekTo(now, (end / 100) * now.duration);
          }}
          @pointercancel=${() => this._dragCancel("seek")}
        >
          <div class="progress-fill" style="width: ${has ? pct : 0}%"></div>
        </div>
        <div class="times">
          <div class="time">${has && now.duration > 0 ? posText : "0:00"}</div>
          <div class="time">${has && now.duration > 0 ? now.durText : "0:00"}</div>
        </div>
        <div class="transport">
          <div class="t-spacer"></div>
          <button
            class="t-btn"
            aria-label="Previous"
            ?disabled=${disabled || !now.supportsPrevNext}
            @click=${() => this._player(now.entity, "media_previous_track")}
          >
            ◀◀
          </button>
          <button
            class="t-play"
            aria-label=${now.playing ? "Pause" : "Play"}
            ?disabled=${disabled || !now.supportsPlayPause}
            @click=${() => this._player(now.entity, "media_play_pause")}
          >
            ${now.playing ? "❘❘" : "▶"}
          </button>
          <button
            class="t-btn"
            aria-label="Next"
            ?disabled=${disabled || !now.supportsPrevNext}
            @click=${() => this._player(now.entity, "media_next_track")}
          >
            ▶▶
          </button>
          ${now.supportsRepeat
            ? html`
                <button
                  class="t-btn repeat ${now.repeat !== "off" ? "on" : ""}"
                  aria-label="Repeat: ${now.repeat}"
                  title="Repeat: ${now.repeat}"
                  ?disabled=${disabled}
                  @click=${() => this._cycleRepeat(now)}
                >
                  ↻${now.repeat === "one"
                    ? html`<span class="badge">1</span>`
                    : nothing}
                </button>
              `
            : html`<div class="t-spacer"></div>`}
        </div>
      </div>
    `;
  }

  /** Playback position for display: the optimistic seek target while one is
   * in flight (advancing in real time if playing), else the live position. */
  private _displayPosition(now: NowPlayingView): number {
    const seek = this._pendingSeek;
    if (seek === undefined) return now.position;
    const advance = now.playing ? (Date.now() - seek.at) / 1000 : 0;
    return Math.min(now.duration, seek.seconds + advance);
  }

  private _renderVolumes(view: MusicView): TemplateResult {
    return html`
      <div class="volumes">
        ${view.volumes.map((volume) => this._renderVolume(volume, view.grouped))}
      </div>
    `;
  }

  private _renderVolume(
    volume: VolumeRowView,
    showName: boolean
  ): TemplateResult {
    const key = `vol:${volume.entity}`;
    const dragPct = this._drag[key];
    const fill = dragPct ?? volume.pct ?? 0;
    const settable = volume.available && volume.supportsSet;
    return html`
      <div class="vol-row ${volume.available ? "" : "unavailable"}">
        <button
          class="vol-mute ${volume.muted ? "muted" : ""}"
          aria-label=${volume.muted
            ? `Unmute ${volume.name}`
            : `Mute ${volume.name}`}
          ?disabled=${!volume.available || !volume.supportsMute}
          @click=${() => this._toggleMute(volume)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M11 5 L6 9 H3 V15 H6 L11 19 Z" />
            ${volume.muted
              ? html`
                  <line x1="16" y1="9" x2="22" y2="15" />
                  <line x1="22" y1="9" x2="16" y2="15" />
                `
              : html`
                  <path d="M15 9 a4 4 0 0 1 0 6" />
                  <path d="M17.5 6.5 a7.5 7.5 0 0 1 0 11" />
                `}
          </svg>
        </button>
        ${showName
          ? html`<div class="vol-name">${volume.name}</div>`
          : nothing}
        <div
          class="vol-track ${settable ? "" : "disabled"}"
          aria-label="Volume ${volume.name}"
          @pointerdown=${(e: PointerEvent) =>
            settable && this._dragStart(e, key)}
          @pointermove=${(e: PointerEvent) => this._dragMove(e, key)}
          @pointerup=${() => {
            const end = this._dragEnd(key);
            if (end !== undefined) this._setVolume(volume, end);
          }}
          @pointercancel=${() => this._dragCancel(key)}
        >
          <div
            class="vol-fill ${volume.muted ? "muted" : ""}"
            style="width: ${fill}%"
          ></div>
        </div>
        <div class="vol-value">
          ${volume.muted || (dragPct === undefined && volume.pct === null)
            ? "—"
            : `${Math.round(fill)}%`}
        </div>
      </div>
    `;
  }

  // --- library panel -----------------------------------------------------------

  private _renderLibrary(view: MusicView): TemplateResult {
    const searching = this._query.trim() !== "";
    const onQueue = !searching && this._tab === "queue";
    const queue = this._queueView(view);
    const upNext = queue?.upNext ?? 0;
    return html`
      <div class="panel library">
        <div class="lib-head">
          <div class="lib-title">
            ${onQueue ? `Queue · ${view.targetName}` : "Library"}
          </div>
          <div class="feedback">${this._feedback}</div>
        </div>
        <input
          class="search"
          type="search"
          placeholder="Search music"
          aria-label="Search music"
          .value=${this._query}
          @input=${(e: Event) =>
            this._onQuery((e.target as HTMLInputElement).value)}
        />
        <div class="tabs" role="tablist">
          ${LIBRARY_KINDS.map((kind) =>
            this._renderTab(kind, KIND_LABELS[kind], searching)
          )}
          ${this._renderTab(
            "queue",
            upNext ? `Queue · ${upNext}` : "Queue",
            searching
          )}
        </div>
        <div class="list">
          ${searching
            ? this._renderSearch()
            : onQueue
              ? this._renderQueue(view, queue)
              : this._renderLibraryTab(this._tab as LibraryKind)}
        </div>
      </div>
    `;
  }

  private _renderTab(tab: Tab, label: string, searching: boolean): TemplateResult {
    const active = !searching && this._tab === tab;
    return html`
      <button
        class="tab ${active ? "on" : ""}"
        role="tab"
        aria-selected=${active ? "true" : "false"}
        @click=${() => {
          this._tab = tab;
          this._query = "";
          this._search = undefined;
        }}
      >
        ${label}
      </button>
    `;
  }

  private _renderLibraryTab(kind: LibraryKind): TemplateResult {
    const load = this._lib[kind];
    if (!load || load.status === "loading") {
      return this._empty("Loading…");
    }
    if (load.status === "error") return this._empty(load.message);
    if (!load.value.length) return this._empty("Nothing here yet");
    return html`${load.value.map((row) => this._renderRow(row))}`;
  }

  private _renderSearch(): TemplateResult {
    const search = this._search;
    if (!search || search.load.status === "loading") {
      return this._empty("Searching…");
    }
    if (search.load.status === "error") return this._empty(search.load.message);
    if (!search.load.value.length) {
      return this._empty(`No matches for “${search.query}”`);
    }
    return html`${search.load.value.map((row) => this._renderRow(row))}`;
  }

  private _renderRow(row: LibraryRowView): TemplateResult {
    const nowTitle = this._view?.now.hasTrack ? this._view.now.title : "";
    return html`
      <div
        class="row"
        role="button"
        tabindex="0"
        @click=${() => this._play(row, "replace")}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this._play(row, "replace");
          }
        }}
      >
        ${this._art(row.image, row.round ? "thumb round" : "thumb")}
        <div class="row-text">
          <div class="row-name ${row.name === nowTitle ? "now" : ""}">
            ${row.name}
          </div>
          <div class="row-meta">${row.meta}</div>
        </div>
        <button
          class="row-act"
          aria-label="Add ${row.name} to queue"
          title="Add to queue"
          @click=${(e: Event) => {
            e.stopPropagation();
            this._play(row, "add");
          }}
        >
          +
        </button>
      </div>
    `;
  }

  private _queueView(view: MusicView) {
    const queue = this._queue;
    if (!queue || queue.entity !== view.now.entity) return undefined;
    if (queue.load.status !== "ready" || !queue.load.value) return undefined;
    return buildQueueView(queue.load.value, view.now.playing);
  }

  private _renderQueue(
    view: MusicView,
    queueView: ReturnType<RuMusicCard["_queueView"]>
  ): TemplateResult {
    const queue = this._queue;
    if (!queue || queue.entity !== view.now.entity || queue.load.status === "loading") {
      return this._empty("Loading queue…");
    }
    if (!queueView || !queueView.rows.length) {
      return this._empty(`Nothing queued on ${view.targetName}`);
    }
    return html`
      ${queueView.rows.map((row) => this._renderQueueRow(row))}
      ${queueView.more
        ? html`<div class="more">+ ${queueView.more} more in the queue</div>`
        : nothing}
    `;
  }

  private _renderQueueRow(row: QueueRowView): TemplateResult {
    return html`
      <div class="row static ${row.played ? "played" : ""}">
        ${this._art(row.image, "thumb")}
        <div class="row-text">
          <div class="row-name ${row.current ? "now" : ""}">${row.name}</div>
          <div class="row-meta">${row.meta}</div>
        </div>
      </div>
    `;
  }

  private _empty(text: string): TemplateResult {
    return html`<div class="empty">${text}</div>`;
  }

  /** Artwork with a striped placeholder behind it — the placeholder shows
   * when there is no image or it fails to load (e.g. an http image proxy on
   * an https dashboard). */
  private _art(image: string | null, cls: string): TemplateResult {
    return html`
      <div class="art ${cls}">
        <svg class="note" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
        </svg>
        ${image
          ? html`<img
              src=${image}
              alt=""
              loading="lazy"
              @error=${(e: Event) => {
                (e.target as HTMLElement).hidden = true;
              }}
            />`
          : nothing}
      </div>
    `;
  }

  // --- drag (seek + volume) ----------------------------------------------------

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
    this._drag = {
      ...this._drag,
      [key]: Math.min(100, Math.max(0, fraction * 100)),
    };
  }

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

  // --- actions -----------------------------------------------------------------

  private _select(index: number): void {
    if (index === this._sel) return;
    this._sel = index;
    this._pendingSeek = undefined;
  }

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

  private _seekTo(now: NowPlayingView, seconds: number): void {
    const clamped = Math.min(now.duration, Math.max(0, seconds));
    this._pendingSeek = {
      seconds: clamped,
      at: Date.now(),
      stamp:
        this.hass?.states[now.entity]?.attributes.media_position_updated_at,
    };
    this._player(now.entity, "media_seek", {
      seek_position: Math.round(clamped),
    });
  }

  private _cycleRepeat(now: NowPlayingView): void {
    const next = REPEAT_NEXT[now.repeat];
    this._player(now.entity, "repeat_set", { repeat: next });
    this._flash(
      { off: "Repeat off", all: "Repeat queue", one: "Repeat track" }[next]
    );
  }

  private _setVolume(volume: VolumeRowView, pct: number): void {
    if (!volume.available || !volume.supportsSet) return;
    this._player(volume.entity, "volume_set", {
      volume_level: Math.round(pct) / 100,
    });
    if (volume.muted && volume.supportsMute) {
      this._player(volume.entity, "volume_mute", { is_volume_muted: false });
    }
  }

  private _toggleMute(volume: VolumeRowView): void {
    this._player(volume.entity, "volume_mute", {
      is_volume_muted: !volume.muted,
    });
  }

  /** Grouped: every other member leaves the leader's group. Alone: the
   * selected speaker pulls in every other groupable speaker of the card. */
  private _toggleGroup(view: MusicView): void {
    if (view.grouped) {
      for (const member of view.groupMembers) {
        if (member !== view.now.entity) this._player(member, "unjoin");
      }
      this._flash("Ungrouped");
      return;
    }
    const others = view.speakers
      .map((speaker) => speaker.entity)
      .filter((entity) => entity !== view.selected.entity);
    this._player(view.selected.entity, "join", { group_members: others });
    this._flash(others.length === 1 ? "Grouped both rooms" : "Grouped all rooms");
  }

  /** Plays a library/search row on the selected speaker (its group leader
   * while grouped): "replace" swaps the queue, "add" appends to it. */
  private _play(row: LibraryRowView, enqueue: "replace" | "add"): void {
    const view = this._view;
    if (!view || !this.hass) return;
    void this.hass
      .callService("music_assistant", "play_media", {
        entity_id: view.now.entity,
        media_id: row.uri,
        media_type: row.mediaType,
        enqueue,
      })
      .catch(() => this._flash("Couldn't play that"));
    this._flash(
      `${enqueue === "add" ? "Queued" : "Playing"} on ${view.targetName}`
    );
    if (enqueue === "add") {
      setTimeout(() => {
        if (this._queue) this._queue = { ...this._queue, key: "" };
      }, QUEUE_REFRESH_MS);
    }
  }

  private _flash(text: string): void {
    clearTimeout(this._fbTimer);
    this._feedback = text;
    this._fbTimer = setTimeout(() => {
      this._feedback = "";
    }, FEEDBACK_MS);
  }

  // --- Music Assistant queries -------------------------------------------------

  /** A music_assistant action's response data. */
  private async _ask<T>(service: string, data: Record<string, unknown>): Promise<T> {
    const result = (await this.hass!.callService(
      "music_assistant",
      service,
      data,
      undefined,
      false,
      true
    )) as { response?: T } | undefined;
    if (!result?.response) throw new Error("Music Assistant sent no answer");
    return result.response;
  }

  /** The configured entry, or the one loaded Music Assistant entry. */
  private _configEntryId(): Promise<string> {
    if (this._config?.config_entry_id) {
      return Promise.resolve(this._config.config_entry_id);
    }
    if (!this._entryId) {
      const hass = this.hass;
      this._entryId = (async () => {
        if (!hass?.callWS) {
          throw new Error('Set "config_entry_id" in the card config');
        }
        const entries = await hass.callWS<
          Array<{ entry_id: string; state?: string }>
        >({ type: "config_entries/get", domain: "music_assistant" });
        const entry =
          entries.find((e) => e.state === "loaded") ?? entries[0];
        if (!entry) throw new Error("Music Assistant is not set up");
        return entry.entry_id;
      })();
      // A failed lookup is retried on the next load instead of sticking.
      this._entryId.catch(() => {
        this._entryId = undefined;
      });
    }
    return this._entryId;
  }

  private async _loadLibrary(kind: LibraryKind): Promise<void> {
    this._lib = { ...this._lib, [kind]: { status: "loading" } };
    try {
      const response = await this._ask<{ items?: MaMediaItem[] }>(
        "get_library",
        {
          config_entry_id: await this._configEntryId(),
          media_type: kind,
          limit: this._config?.library_limit ?? DEFAULT_LIBRARY_LIMIT,
          order_by: ORDER_BY[kind],
        }
      );
      this._lib = {
        ...this._lib,
        [kind]: {
          status: "ready",
          value: (response.items ?? []).map((item) => libraryRow(item)),
        },
      };
    } catch (error) {
      this._lib = {
        ...this._lib,
        [kind]: { status: "error", message: errorText(error) },
      };
    }
  }

  private _onQuery(value: string): void {
    this._query = value;
    clearTimeout(this._searchTimer);
    const query = value.trim();
    if (!query) {
      this._search = undefined;
      return;
    }
    this._search = { query, load: { status: "loading" } };
    this._searchTimer = setTimeout(
      () => void this._runSearch(query),
      SEARCH_DEBOUNCE_MS
    );
  }

  private async _runSearch(query: string): Promise<void> {
    let load: Load<LibraryRowView[]>;
    try {
      const response = await this._ask<Record<string, unknown>>("search", {
        config_entry_id: await this._configEntryId(),
        name: query,
        limit: this._config?.search_limit ?? DEFAULT_SEARCH_LIMIT,
      });
      load = { status: "ready", value: searchRows(response) };
    } catch (error) {
      load = { status: "error", message: errorText(error) };
    }
    // Drop answers to a query the user has since typed past.
    if (this._query.trim() === query) this._search = { query, load };
  }

  /** Reads the player's queue. Asks for its items first (`limit`); an HA
   * release without that field rejects the call, and the plain read then
   * gives at least the current and next item. No active queue → null. */
  private async _loadQueue(entity: string, key: string): Promise<void> {
    const token = ++this._queueToken;
    const keep =
      this._queue?.entity === entity ? this._queue.load : undefined;
    this._queue = { entity, key, load: keep ?? { status: "loading" } };
    let details: MaQueueDetails | null = null;
    try {
      if (this._queueItemsSupported !== false) {
        try {
          details = await this._ask<MaQueueDetails>("get_queue", {
            entity_id: entity,
            limit: QUEUE_LIMIT,
          });
          this._queueItemsSupported = true;
        } catch (error) {
          if (this._queueItemsSupported === true) throw error;
          details = await this._ask<MaQueueDetails>("get_queue", {
            entity_id: entity,
          });
          this._queueItemsSupported = false;
        }
      } else {
        details = await this._ask<MaQueueDetails>("get_queue", {
          entity_id: entity,
        });
      }
    } catch {
      details = null;
    }
    if (token !== this._queueToken) return;
    this._queue = { entity, key, load: { status: "ready", value: details } };
  }
}

// Guarded so loading the bundle twice (Lovelace resource + extra_module_url)
// doesn't throw on re-registration.
if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, RuMusicCard);
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: "RU Music Card",
    description:
      "Music Assistant card: speaker switcher with grouping, now playing, volume, and the music library with search and queue",
    documentationURL: "https://github.com/ragedunicorn/hass-custom",
  });
}
