import { css } from "lit";

/**
 * Every color is exposed as a --ru-music-* custom property so a HA theme or
 * card-mod can override it; the defaults ARE the intended look (option 1a of
 * the Music Card mock, dark palette = option 1b).
 */
export const cardStyles = css`
  :host {
    --ru-music-bg: #f5f6fa;
    --ru-music-panel-bg: #ffffff;
    --ru-music-text: #3b3b3b;
    --ru-music-text-muted: #9aa0ae;
    --ru-music-label: #8a90a0;
    --ru-music-accent: #3d5afe;
    --ru-music-accent-bg: rgba(61, 90, 254, 0.15);
    --ru-music-accent-contrast: #ffffff;
    --ru-music-control-bg: #f1f2f6;
    --ru-music-row-hover: #f5f6fa;
    --ru-music-dot: #c3c8d4;
    --ru-music-dot-glow: rgba(61, 90, 254, 0.6);
    --ru-music-art: repeating-linear-gradient(
      135deg,
      #e9ebf1 0 6px,
      #f1f2f6 6px 12px
    );
    --ru-music-art-glyph: #c3c8d4;
    --ru-music-volume-gradient: linear-gradient(90deg, #7c90ff, #3d5afe);
    --ru-music-mute: #f54436;
    --ru-music-panel-radius: 20px;
    --ru-music-font: -apple-system, "SF Pro Text", "Segoe UI", system-ui,
      sans-serif;

    display: block;
    /* The wide layout follows the width the card is given, not the viewport
       — see ru-tv-card's styles for the full reasoning. */
    container: ru-music / inline-size;
    max-width: var(--ru-music-max-width, none);
    margin-inline: auto;
  }

  :host([dark]) {
    --ru-music-bg: #1a1b1e;
    --ru-music-panel-bg: #242529;
    --ru-music-text: #e8e9ed;
    --ru-music-text-muted: #8b8f9b;
    --ru-music-label: #8b8f9b;
    --ru-music-accent: #7c90ff;
    --ru-music-accent-bg: rgba(61, 90, 254, 0.28);
    --ru-music-accent-contrast: #1a1b1e;
    --ru-music-control-bg: rgba(255, 255, 255, 0.07);
    --ru-music-row-hover: rgba(255, 255, 255, 0.04);
    --ru-music-dot: #4a4e59;
    --ru-music-dot-glow: rgba(124, 144, 255, 0.6);
    --ru-music-art: repeating-linear-gradient(
      135deg,
      #2c2d32 0 6px,
      #303136 6px 12px
    );
    --ru-music-art-glyph: #4a4e59;
    --ru-music-mute: #ff6b5e;
  }

  * {
    box-sizing: border-box;
  }

  button {
    border: none;
    margin: 0;
    padding: 0;
    font-family: inherit;
    cursor: pointer;
    background: none;
    -webkit-tap-highlight-color: transparent;
  }

  button:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .card {
    position: relative;
    overflow: hidden;
    background: var(--ru-music-bg);
    border-radius: var(--ha-card-border-radius, 12px);
    padding: 20px 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-family: var(--ru-music-font);
  }

  /* --- header ------------------------------------------------------------ */

  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 0 4px;
  }

  .title {
    font-size: 22px;
    font-weight: 700;
    color: var(--ru-music-text);
  }

  .summary {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--ru-music-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* --- panels ------------------------------------------------------------- */

  .cols {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .panel {
    background: var(--ru-music-panel-bg);
    border-radius: var(--ru-music-panel-radius);
    padding: 16px 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }

  /* --- speakers ----------------------------------------------------------- */

  .speakers {
    display: flex;
    gap: 6px;
    align-items: stretch;
  }

  .speaker {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 9px 11px;
    border-radius: 14px;
    background: var(--ru-music-control-bg);
    color: var(--ru-music-label);
    text-align: left;
  }

  .speaker.active {
    background: var(--ru-music-accent-bg);
    color: var(--ru-music-accent);
  }

  .speaker-text {
    min-width: 0;
  }

  .speaker-name {
    font-size: 12.5px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .speaker-status {
    font-size: 10.5px;
    font-weight: 500;
    opacity: 0.8;
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 4px;
    flex: none;
    background: var(--ru-music-dot);
  }

  .dot.on {
    background: var(--ru-music-accent);
    box-shadow: 0 0 8px var(--ru-music-dot-glow);
  }

  .group {
    width: 46px;
    flex: none;
    border-radius: 14px;
    background: var(--ru-music-control-bg);
    color: var(--ru-music-label);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .group.on {
    background: var(--ru-music-accent-bg);
    color: var(--ru-music-accent);
  }

  .group svg {
    width: 20px;
    height: 20px;
  }

  /* --- now playing -------------------------------------------------------- */

  .now {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .now.dimmed .track,
  .now.dimmed .progress,
  .now.dimmed .times {
    opacity: 0.4;
  }

  .track {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .track-text {
    min-width: 0;
    flex: 1;
  }

  .track-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--ru-music-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .track-artist {
    font-size: 11.5px;
    font-weight: 500;
    color: var(--ru-music-text-muted);
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .art {
    position: relative;
    flex: none;
    overflow: hidden;
    background: var(--ru-music-art);
    color: var(--ru-music-art-glyph);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .art img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .art .note {
    width: 40%;
    height: 40%;
  }

  .art.cover {
    width: 56px;
    height: 56px;
    border-radius: 12px;
  }

  .art.thumb {
    width: 40px;
    height: 40px;
    border-radius: 8px;
  }

  .art.thumb.round {
    border-radius: 20px;
  }

  .progress {
    position: relative;
    height: 8px;
    border-radius: 4px;
    margin-top: 4px;
    background: var(--ru-music-control-bg);
    overflow: hidden;
    touch-action: none;
  }

  .progress.seekable {
    cursor: ew-resize;
  }

  .progress-fill {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: 4px;
    background: var(--ru-music-accent);
  }

  .times {
    display: flex;
    justify-content: space-between;
  }

  .time {
    font-size: 10.5px;
    font-weight: 500;
    color: var(--ru-music-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .transport {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }

  .t-spacer {
    width: 42px;
    height: 42px;
    flex: none;
  }

  .t-btn,
  .t-play {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--ru-music-control-bg);
    color: var(--ru-music-label);
  }

  .t-btn {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    font-size: 10px;
  }

  .t-btn.repeat {
    font-size: 15px;
    font-weight: 700;
    gap: 1px;
  }

  .t-btn.repeat.on {
    background: var(--ru-music-accent-bg);
    color: var(--ru-music-accent);
  }

  .badge {
    font-size: 9px;
  }

  .t-play {
    width: 52px;
    height: 52px;
    border-radius: 17px;
    font-size: 15px;
    background: var(--ru-music-accent-bg);
    color: var(--ru-music-accent);
  }

  .show-more:active {
    opacity: 0.6;
  }

  .t-btn:not(:disabled):active,
  .t-play:not(:disabled):active,
  .speaker:active,
  .group:not(:disabled):active,
  .tab:active,
  .row-act:active,
  .drill-back:active,
  .drill-play:active {
    background: var(--ru-music-accent);
    color: var(--ru-music-accent-contrast);
  }

  /* --- volume ------------------------------------------------------------- */

  .volumes {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .vol-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .vol-row.unavailable {
    opacity: 0.4;
  }

  .vol-mute {
    width: 34px;
    height: 26px;
    border-radius: 9px;
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ru-music-label);
  }

  .vol-mute.muted {
    color: var(--ru-music-mute);
  }

  .vol-mute svg {
    width: 18px;
    height: 18px;
  }

  .vol-name {
    width: 72px;
    flex: none;
    font-size: 11px;
    font-weight: 600;
    color: var(--ru-music-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .vol-track {
    position: relative;
    flex: 1;
    height: 26px;
    border-radius: 9px;
    overflow: hidden;
    background: var(--ru-music-control-bg);
    cursor: ew-resize;
    touch-action: none;
  }

  .vol-track.disabled {
    cursor: default;
  }

  .vol-fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: var(--ru-music-volume-gradient);
  }

  .vol-fill.muted {
    opacity: 0.3;
  }

  .vol-value {
    width: 40px;
    flex: none;
    text-align: center;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ru-music-text);
    font-variant-numeric: tabular-nums;
  }

  /* --- library ------------------------------------------------------------ */

  .lib-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .lib-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--ru-music-text);
    white-space: nowrap;
  }

  .feedback {
    min-height: 16px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ru-music-accent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .search {
    height: 36px;
    width: 100%;
    border: 0;
    border-radius: 11px;
    padding: 0 12px;
    background: var(--ru-music-control-bg);
    color: var(--ru-music-text);
    font: inherit;
    font-size: 12.5px;
    outline: none;
  }

  .search::placeholder {
    color: var(--ru-music-text-muted);
  }

  .tabs {
    display: flex;
    gap: 5px;
  }

  .tab {
    flex: 1 1 auto;
    padding: 7px 8px;
    border-radius: 9px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    background: var(--ru-music-control-bg);
    color: var(--ru-music-label);
  }

  .tab.on {
    background: var(--ru-music-accent-bg);
    color: var(--ru-music-accent);
  }

  /* An opened playlist/album/artist: back, name + count, play all. */
  .drill-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .drill-back,
  .drill-play {
    height: 30px;
    flex: none;
    border-radius: 10px;
    font-weight: 700;
  }

  .drill-back {
    width: 30px;
    font-size: 17px;
    background: var(--ru-music-control-bg);
    color: var(--ru-music-label);
  }

  .drill-play {
    padding: 0 12px;
    font-size: 12px;
    background: var(--ru-music-accent-bg);
    color: var(--ru-music-accent);
  }

  .drill-text {
    flex: 1;
    min-width: 0;
  }

  .drill-title,
  .drill-meta {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .drill-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--ru-music-text);
  }

  .drill-meta {
    font-size: 11px;
    font-weight: 500;
    margin-top: 1px;
    color: var(--ru-music-text-muted);
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 262px;
    overflow-y: auto;
    margin: 0 -6px;
    scrollbar-width: thin;
    scrollbar-color: var(--ru-music-control-bg) transparent;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px;
    border-radius: 12px;
    cursor: pointer;
    outline: none;
  }

  .row:hover,
  .row:focus-visible {
    background: var(--ru-music-row-hover);
  }

  .row.static {
    cursor: default;
  }

  .row.static:hover {
    background: none;
  }

  .row.played {
    opacity: 0.45;
  }

  .row-text {
    flex: 1;
    min-width: 0;
  }

  .row-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--ru-music-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row-name.now {
    color: var(--ru-music-accent);
  }

  .row-meta {
    font-size: 11px;
    font-weight: 500;
    margin-top: 1px;
    color: var(--ru-music-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row-act {
    width: 30px;
    height: 30px;
    flex: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 700;
    background: var(--ru-music-control-bg);
    color: var(--ru-music-label);
    /* Held to add to the end: no text selection or callout on touch. */
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    touch-action: manipulation;
  }

  .empty,
  .more {
    padding: 22px 0;
    text-align: center;
    font-size: 12px;
    font-weight: 500;
    color: var(--ru-music-text-muted);
  }

  .more {
    padding: 10px 0 4px;
  }

  .show-more {
    display: block;
    width: 100%;
    color: var(--ru-music-accent);
  }

  /* --- wide layout -------------------------------------------------------- */

  /* Two columns once the card gets 640px — the same breakpoint as
     ru-tv-card: each column then gets ~290px, enough for the 5-button
     transport row (262px) and the five library tabs. The library sits beside
     the player, so browsing never pushes the controls off-screen. */
  @container ru-music (min-width: 640px) {
    .card .cols {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: start;
    }

    .card .now {
      gap: 10px;
    }

    .card .track {
      gap: 14px;
    }

    .card .art.cover {
      width: 104px;
      height: 104px;
      border-radius: 16px;
    }

    .card .track-title {
      font-size: 16px;
    }

    .card .track-artist {
      font-size: 12px;
      margin-top: 3px;
    }

    .card .list {
      max-height: 330px;
    }
  }
`;
