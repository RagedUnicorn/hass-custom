import { css } from "lit";

/**
 * Every color is exposed as a --ru-shutters-* custom property so a HA theme
 * or card-mod can override it; the defaults ARE the intended look.
 */
export const cardStyles = css`
  :host {
    --ru-shutters-bg: #f5f6fa;
    --ru-shutters-panel-bg: #ffffff;
    --ru-shutters-text: #3b3b3b;
    --ru-shutters-text-muted: #9aa0ae;
    --ru-shutters-accent: #3d5afe;
    --ru-shutters-accent-bg: rgba(61, 90, 254, 0.15);
    --ru-shutters-inactive: #707686;
    --ru-shutters-inactive-bg: rgba(112, 118, 134, 0.15);
    --ru-shutters-stop: #f54436;
    --ru-shutters-button-bg: #f1f2f6;
    --ru-shutters-button-color: #8a90a0;
    --ru-shutters-chevron: #c3c8d4;
    --ru-shutters-scrim: rgba(35, 40, 54, 0.4);
    --ru-shutters-window-top: #edf2f7;
    --ru-shutters-window-bottom: #e4eaf1;
    --ru-shutters-slat-a: #c6cddb;
    --ru-shutters-slat-b: #b7bfcf;
    --ru-shutters-panel-radius: 20px;
    --ru-shutters-room-radius: 16px;
    --ru-shutters-font: -apple-system, "SF Pro Text", "Segoe UI", system-ui,
      sans-serif;

    display: block;
  }

  /* Dark palette — applied when HA is in dark mode (the card reflects
     hass.themes.darkMode as the [dark] host attribute). */
  :host([dark]) {
    --ru-shutters-bg: #1a1b1e;
    --ru-shutters-panel-bg: #242529;
    --ru-shutters-text: #e8e9ed;
    --ru-shutters-text-muted: #8b8f9b;
    --ru-shutters-accent: #7c90ff;
    --ru-shutters-accent-bg: rgba(61, 90, 254, 0.28);
    --ru-shutters-inactive: #9aa0ae;
    --ru-shutters-inactive-bg: rgba(255, 255, 255, 0.08);
    --ru-shutters-stop: #ff6b5e;
    --ru-shutters-button-bg: rgba(255, 255, 255, 0.07);
    --ru-shutters-button-color: #8b8f9b;
    --ru-shutters-chevron: #4a4e59;
    --ru-shutters-scrim: rgba(0, 0, 0, 0.55);
    --ru-shutters-window-top: #2a3a63;
    --ru-shutters-window-bottom: #1b2540;
    --ru-shutters-slat-a: #4a4f5c;
    --ru-shutters-slat-b: #3f4450;
  }

  * {
    box-sizing: border-box;
  }

  button {
    border: none;
    margin: 0;
    font-family: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .card {
    position: relative;
    overflow: hidden;
    background: var(--ru-shutters-bg);
    border-radius: var(--ha-card-border-radius, 12px);
    padding: 20px 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-family: var(--ru-shutters-font);
  }

  /* --- header ------------------------------------------------------------ */

  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 0 4px;
  }

  .title {
    font-size: 22px;
    font-weight: 700;
    color: var(--ru-shutters-text);
  }

  .summary {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--ru-shutters-text-muted);
  }

  /* --- global chips ------------------------------------------------------ */

  .chips {
    display: flex;
    gap: 8px;
    padding: 0 2px;
  }

  .chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 13px;
    border-radius: 999px;
    background: var(--ru-shutters-panel-bg);
    font-size: 12px;
    font-weight: 600;
    color: var(--ru-shutters-text);
  }

  .glyph-up,
  .glyph-down {
    color: var(--ru-shutters-accent);
    font-size: 10px;
  }

  .glyph-stop {
    color: var(--ru-shutters-stop);
    font-size: 9px;
  }

  .dim {
    opacity: 0.35;
  }

  /* --- rooms (2-column grid of compact tiles) ------------------------------ */

  .rooms {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .room {
    background: var(--ru-shutters-panel-bg);
    border-radius: var(--ru-shutters-room-radius);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .room-row {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    min-width: 0;
  }

  .icon-circle {
    width: 42px;
    height: 42px;
    border-radius: 21px;
    background: var(--ru-shutters-accent-bg);
    color: var(--ru-shutters-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    --mdc-icon-size: 22px;
  }

  .icon-circle.small {
    width: 30px;
    height: 30px;
    border-radius: 15px;
    --mdc-icon-size: 16px;
  }

  .icon-circle.closed {
    background: var(--ru-shutters-inactive-bg);
    color: var(--ru-shutters-inactive);
  }

  .room-text {
    flex: 1;
    min-width: 0;
  }

  .room-name {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--ru-shutters-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .room-status {
    font-size: 10.5px;
    font-weight: 500;
    color: var(--ru-shutters-text-muted);
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .room-status.moving {
    color: var(--ru-shutters-accent);
  }

  .chevron {
    color: var(--ru-shutters-chevron);
    font-size: 15px;
    font-weight: 600;
    flex: none;
  }

  .room-buttons {
    display: flex;
    gap: 5px;
  }

  .room-buttons button {
    flex: 1;
    height: 28px;
    border-radius: 9px;
    background: var(--ru-shutters-button-bg);
    color: var(--ru-shutters-button-color);
    font-size: 9.5px;
  }

  .room-buttons button.stop {
    font-size: 8.5px;
  }

  button:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .unavailable {
    opacity: 0.5;
  }

  /* --- presets ------------------------------------------------------------ */

  .panel {
    background: var(--ru-shutters-panel-bg);
    border-radius: var(--ru-shutters-panel-radius);
    padding: 16px 14px;
  }

  .panel-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--ru-shutters-text);
    margin-bottom: 12px;
  }

  .preset-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .preset {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    padding: 10px 4px;
    border-radius: 14px;
    border: 2px solid transparent;
    background: none;
  }

  .preset.active {
    border-color: var(--ru-shutters-accent);
  }

  .preset-icon {
    width: 38px;
    height: 38px;
    border-radius: 19px;
    background: var(--ru-shutters-accent-bg);
    color: var(--ru-shutters-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    --mdc-icon-size: 20px;
  }

  .preset-name {
    font-size: 11px;
    font-weight: 600;
    color: var(--ru-shutters-text);
  }

  /* --- drilldown sheet ----------------------------------------------------- */

  /* Viewport-level bottom sheet: fixed positioning escapes the card, so the
     drilldown gets the full screen height even when the card itself is short. */
  .scrim {
    position: fixed;
    inset: 0;
    background: var(--ru-shutters-scrim);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 12;
  }

  .sheet {
    background: var(--ru-shutters-bg);
    border-radius: 24px 24px 0 0;
    padding: 18px 16px 22px;
    width: 100%;
    max-width: 480px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* A bottom-anchored sheet is a phone pattern; on wide screens center it as
     a floating dialog instead. */
  @media (min-width: 600px) {
    .scrim {
      align-items: center;
      padding: 24px;
    }

    .sheet {
      border-radius: 24px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
    }
  }

  /* Taller than the viewport allows? The targets panel scrolls internally so
     the header and actions stay reachable. */
  .targets {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  .sheet-header,
  .sheet-actions {
    flex: none;
  }

  .sheet-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .sheet-title {
    flex: 1;
    min-width: 0;
  }

  .sheet-name {
    font-size: 16px;
    font-weight: 700;
    color: var(--ru-shutters-text);
  }

  .sheet-title .room-status {
    font-size: 12px;
    margin-top: 2px;
  }

  .close {
    width: 34px;
    height: 34px;
    border-radius: 17px;
    background: var(--ru-shutters-panel-bg);
    color: var(--ru-shutters-button-color);
    font-size: 13px;
  }

  .targets {
    display: flex;
    justify-content: center;
    gap: 22px;
    flex-wrap: wrap;
    padding: 16px;
  }

  .target {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .window {
    position: relative;
    width: 64px;
    height: 170px;
    border-radius: 16px;
    background: linear-gradient(
      180deg,
      var(--ru-shutters-window-top),
      var(--ru-shutters-window-bottom)
    );
    overflow: hidden;
    cursor: ns-resize;
    touch-action: none;
  }

  .slats {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: repeating-linear-gradient(
      180deg,
      var(--ru-shutters-slat-a) 0px,
      var(--ru-shutters-slat-a) 7px,
      var(--ru-shutters-slat-b) 7px,
      var(--ru-shutters-slat-b) 10px
    );
    border-bottom: 3px solid var(--ru-shutters-accent);
  }

  .target-name {
    font-size: 12px;
    font-weight: 700;
    color: var(--ru-shutters-text);
  }

  .target-status {
    font-size: 11px;
    font-weight: 500;
    color: var(--ru-shutters-text-muted);
  }

  .target-status.moving {
    color: var(--ru-shutters-accent);
  }

  .target-buttons {
    display: flex;
    gap: 6px;
  }

  .target-buttons button {
    width: 34px;
    height: 30px;
    border-radius: 10px;
    background: var(--ru-shutters-button-bg);
    color: var(--ru-shutters-button-color);
    font-size: 10px;
  }

  .target-buttons button.stop {
    font-size: 9px;
  }

  .sheet-actions {
    display: flex;
    gap: 8px;
  }

  .sheet-actions button {
    flex: 1;
    height: 42px;
    border-radius: 14px;
    background: var(--ru-shutters-panel-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ru-shutters-text);
  }
`;
