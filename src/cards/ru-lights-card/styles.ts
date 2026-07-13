import { css } from "lit";

/**
 * Every color is exposed as a --ru-lights-* custom property so a HA theme
 * or card-mod can override it; the defaults ARE the intended look.
 */
export const cardStyles = css`
  :host {
    --ru-lights-bg: #f5f6fa;
    --ru-lights-panel-bg: #ffffff;
    --ru-lights-text: #3b3b3b;
    --ru-lights-text-muted: #9aa0ae;
    --ru-lights-accent: #ffa723;
    --ru-lights-accent-bg: rgba(255, 167, 35, 0.18);
    --ru-lights-glow: rgba(255, 167, 35, 0.8);
    --ru-lights-on-status: #e8930c;
    --ru-lights-off: #707686;
    --ru-lights-off-bg: rgba(112, 118, 134, 0.15);
    --ru-lights-track: #f1f2f6;
    --ru-lights-fill-start: #ffd37a;
    --ru-lights-fill-end: #ffa723;
    --ru-lights-toggle-on: #ffa723;
    --ru-lights-toggle-off: #e3e5ec;
    --ru-lights-chip-dot-off: #c3c8d4;
    --ru-lights-effect-active-bg: rgba(255, 167, 35, 0.18);
    --ru-lights-effect-active-color: #b26a00;
    --ru-lights-button-color: #8a90a0;
    --ru-lights-chevron: #c3c8d4;
    --ru-lights-scrim: rgba(35, 40, 54, 0.4);
    --ru-lights-panel-radius: 20px;
    --ru-lights-room-radius: 16px;
    --ru-lights-font: -apple-system, "SF Pro Text", "Segoe UI", system-ui,
      sans-serif;

    display: block;
  }

  /* Dark palette — applied when HA is in dark mode (the card reflects
     hass.themes.darkMode as the [dark] host attribute). */
  :host([dark]) {
    --ru-lights-bg: #1a1b1e;
    --ru-lights-panel-bg: #242529;
    --ru-lights-text: #e8e9ed;
    --ru-lights-text-muted: #8b8f9b;
    --ru-lights-accent: #ffc65c;
    --ru-lights-accent-bg: rgba(255, 167, 35, 0.22);
    --ru-lights-glow: rgba(255, 198, 92, 0.8);
    --ru-lights-on-status: #ffc65c;
    --ru-lights-off: #9aa0ae;
    --ru-lights-off-bg: rgba(255, 255, 255, 0.08);
    --ru-lights-track: rgba(255, 255, 255, 0.07);
    --ru-lights-toggle-off: rgba(255, 255, 255, 0.14);
    --ru-lights-chip-dot-off: #4a4e59;
    --ru-lights-effect-active-bg: rgba(255, 167, 35, 0.25);
    --ru-lights-effect-active-color: #ffc65c;
    --ru-lights-button-color: #8b8f9b;
    --ru-lights-chevron: #4a4e59;
    --ru-lights-scrim: rgba(0, 0, 0, 0.55);
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
    background: var(--ru-lights-bg);
    border-radius: var(--ha-card-border-radius, 12px);
    padding: 20px 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-family: var(--ru-lights-font);
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
    color: var(--ru-lights-text);
  }

  .summary {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--ru-lights-text-muted);
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
    background: var(--ru-lights-panel-bg);
    font-size: 12px;
    font-weight: 600;
    color: var(--ru-lights-text);
  }

  .chip-dot {
    width: 8px;
    height: 8px;
    border-radius: 4px;
    background: var(--ru-lights-chip-dot-off);
  }

  .chip-dot.on {
    background: var(--ru-lights-accent);
  }

  /* --- rooms (2-column grid of compact tiles) ------------------------------ */

  .rooms {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .room {
    background: var(--ru-lights-panel-bg);
    border-radius: var(--ru-lights-room-radius);
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

  /* Glowing-dot "icon": amber and lit while anything is on, gray when off. */
  .dot-circle {
    width: 30px;
    height: 30px;
    border-radius: 15px;
    background: var(--ru-lights-accent-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }

  .dot-circle .dot {
    width: 12px;
    height: 12px;
    border-radius: 6px;
    background: var(--ru-lights-accent);
    box-shadow: 0 0 8px var(--ru-lights-glow);
  }

  .dot-circle.large {
    width: 42px;
    height: 42px;
    border-radius: 21px;
  }

  .dot-circle.large .dot {
    width: 16px;
    height: 16px;
    border-radius: 8px;
    box-shadow: 0 0 10px var(--ru-lights-glow);
  }

  .dot-circle.off {
    background: var(--ru-lights-off-bg);
  }

  .dot-circle.off .dot {
    background: var(--ru-lights-off);
    box-shadow: none;
  }

  .room-text {
    flex: 1;
    min-width: 0;
  }

  .room-name {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--ru-lights-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .room-status {
    font-size: 10.5px;
    font-weight: 500;
    color: var(--ru-lights-text-muted);
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .room-status.on {
    color: var(--ru-lights-on-status);
  }

  .chevron {
    color: var(--ru-lights-chevron);
    font-size: 15px;
    font-weight: 600;
    flex: none;
  }

  /* --- brightness sliders (horizontal, drag anywhere) ---------------------- */

  .slider {
    position: relative;
    height: 26px;
    border-radius: 9px;
    background: var(--ru-lights-track);
    overflow: hidden;
    cursor: ew-resize;
    touch-action: none;
  }

  .slider-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    background: linear-gradient(
      90deg,
      var(--ru-lights-fill-start),
      var(--ru-lights-fill-end)
    );
  }

  .unavailable {
    opacity: 0.5;
  }

  /* --- scenes ------------------------------------------------------------- */

  .panel {
    background: var(--ru-lights-panel-bg);
    border-radius: var(--ru-lights-panel-radius);
    padding: 16px 14px;
  }

  .panel-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--ru-lights-text);
    margin-bottom: 12px;
  }

  .scene-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .scene {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    padding: 10px 4px;
    border-radius: 14px;
    border: 2px solid transparent;
  }

  .scene.active {
    border-color: var(--ru-lights-accent);
  }

  .scene-swatch {
    width: 38px;
    height: 38px;
    border-radius: 19px;
    background: var(--ru-lights-accent-bg);
  }

  .scene-name {
    font-size: 11px;
    font-weight: 600;
    color: var(--ru-lights-text);
  }

  /* --- drilldown sheet ----------------------------------------------------- */

  /* Viewport-level bottom sheet: fixed positioning escapes the card, so the
     drilldown gets the full screen height even when the card itself is short. */
  .scrim {
    position: fixed;
    inset: 0;
    background: var(--ru-lights-scrim);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 12;
  }

  .sheet {
    background: var(--ru-lights-bg);
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

  .sheet-header {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: none;
  }

  .sheet-title {
    flex: 1;
    min-width: 0;
  }

  .sheet-name {
    font-size: 16px;
    font-weight: 700;
    color: var(--ru-lights-text);
  }

  .sheet-title .room-status {
    font-size: 12px;
    margin-top: 2px;
  }

  .close {
    width: 34px;
    height: 34px;
    border-radius: 17px;
    background: var(--ru-lights-panel-bg);
    color: var(--ru-lights-button-color);
    font-size: 13px;
  }

  /* Taller than the viewport allows? The sheet body scrolls internally so
     the header and actions stay reachable. */
  .sheet-body {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* --- per-bulb dimmers ------------------------------------------------------ */

  .bulbs {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 16px 8px;
  }

  .bulb {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .bar {
    position: relative;
    width: 56px;
    height: 150px;
    border-radius: 14px;
    background: var(--ru-lights-track);
    overflow: hidden;
    cursor: ns-resize;
    touch-action: none;
  }

  .bar-fill {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(
      180deg,
      var(--ru-lights-fill-start),
      var(--ru-lights-fill-end)
    );
  }

  .bulb-name {
    font-size: 12px;
    font-weight: 700;
    color: var(--ru-lights-text);
  }

  .bulb-status {
    font-size: 11px;
    font-weight: 500;
    color: var(--ru-lights-text-muted);
  }

  .bulb-status.on {
    color: var(--ru-lights-on-status);
  }

  .toggle {
    width: 36px;
    height: 22px;
    border-radius: 11px;
    background: var(--ru-lights-toggle-off);
    position: relative;
    transition: background 0.2s;
  }

  .toggle.on {
    background: var(--ru-lights-toggle-on);
  }

  .toggle .knob {
    position: absolute;
    top: 3px;
    left: 0;
    width: 16px;
    height: 16px;
    border-radius: 8px;
    background: #fff;
    transform: translateX(3px);
    transition: transform 0.2s;
  }

  .toggle.on .knob {
    transform: translateX(17px);
  }

  /* --- effects (lights exposing effect_list) --------------------------------- */

  .effects {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
  }

  .effect-preview {
    height: 34px;
    border-radius: 12px;
    background: linear-gradient(
      90deg,
      var(--ru-lights-fill-start),
      var(--ru-lights-fill-end)
    );
  }

  .effect-preview.off {
    background: var(--ru-lights-track);
  }

  .effect-chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .effect {
    padding: 7px 14px;
    border-radius: 9px;
    background: var(--ru-lights-track);
    color: var(--ru-lights-button-color);
    font-size: 12px;
    font-weight: 600;
  }

  .effect.active {
    background: var(--ru-lights-effect-active-bg);
    color: var(--ru-lights-effect-active-color);
  }

  /* --- sheet actions ---------------------------------------------------------- */

  .sheet-actions {
    display: flex;
    gap: 8px;
    flex: none;
  }

  .sheet-actions button {
    flex: 1;
    height: 42px;
    border-radius: 14px;
    background: var(--ru-lights-panel-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ru-lights-text);
  }
`;
