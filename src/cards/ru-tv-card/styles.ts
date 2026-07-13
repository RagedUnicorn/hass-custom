import { css } from "lit";

/**
 * Every color is exposed as a --ru-tv-* custom property so a HA theme or
 * card-mod can override it; the defaults ARE the intended look (option 1a of
 * the TV Card mock, dark palette = option 1b).
 */
export const cardStyles = css`
  :host {
    --ru-tv-bg: #f5f6fa;
    --ru-tv-panel-bg: #ffffff;
    --ru-tv-text: #3b3b3b;
    --ru-tv-text-muted: #9aa0ae;
    --ru-tv-label: #8a90a0;
    --ru-tv-accent: #3d5afe;
    --ru-tv-accent-bg: rgba(61, 90, 254, 0.15);
    --ru-tv-accent-contrast: #ffffff;
    --ru-tv-off: #707686;
    --ru-tv-off-bg: rgba(112, 118, 134, 0.15);
    --ru-tv-track: #f1f2f6;
    --ru-tv-toggle-on: #3d5afe;
    --ru-tv-toggle-off: #e3e5ec;
    --ru-tv-volume-gradient: linear-gradient(90deg, #7c90ff, #3d5afe);
    --ru-tv-mute: #f54436;
    --ru-tv-panel-radius: 20px;
    --ru-tv-font: -apple-system, "SF Pro Text", "Segoe UI", system-ui,
      sans-serif;

    display: block;
  }

  /* Dark palette — applied when HA is in dark mode (the card reflects
     hass.themes.darkMode as the [dark] host attribute). */
  :host([dark]) {
    --ru-tv-bg: #1a1b1e;
    --ru-tv-panel-bg: #242529;
    --ru-tv-text: #e8e9ed;
    --ru-tv-text-muted: #8b8f9b;
    --ru-tv-label: #8b8f9b;
    --ru-tv-accent: #7c90ff;
    --ru-tv-accent-bg: rgba(61, 90, 254, 0.28);
    --ru-tv-accent-contrast: #1a1b1e;
    --ru-tv-off: #9aa0ae;
    --ru-tv-off-bg: rgba(255, 255, 255, 0.08);
    --ru-tv-track: rgba(255, 255, 255, 0.07);
    --ru-tv-toggle-off: rgba(255, 255, 255, 0.14);
    --ru-tv-mute: #ff6b5e;
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
    background: var(--ru-tv-bg);
    border-radius: var(--ha-card-border-radius, 12px);
    padding: 20px 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-family: var(--ru-tv-font);
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
    color: var(--ru-tv-text);
  }

  .summary {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--ru-tv-text-muted);
  }

  /* --- panels -------------------------------------------------------------- */

  .panel {
    background: var(--ru-tv-panel-bg);
    border-radius: var(--ru-tv-panel-radius);
    padding: 16px 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .unavailable {
    opacity: 0.5;
  }

  /* Sections that only make sense while the TV is on dim with it. */
  .dimmed {
    opacity: 0.4;
    pointer-events: none;
  }

  /* --- device row (app-dot icon, name/status, power toggle) ----------------- */

  .device-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icon-circle {
    width: 42px;
    height: 42px;
    border-radius: 21px;
    background: var(--ru-tv-accent-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }

  .icon-circle.off {
    background: var(--ru-tv-off-bg);
  }

  /* The dot takes the active app's color inline; off falls back to gray. */
  .app-dot {
    width: 16px;
    height: 16px;
    border-radius: 8px;
    background: var(--ru-tv-off);
  }

  .device-text {
    flex: 1;
    min-width: 0;
  }

  .device-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--ru-tv-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .device-status {
    font-size: 11.5px;
    font-weight: 500;
    color: var(--ru-tv-text-muted);
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .device-status.on {
    color: var(--ru-tv-accent);
  }

  .toggle {
    width: 44px;
    height: 26px;
    border-radius: 13px;
    background: var(--ru-tv-toggle-off);
    position: relative;
    transition: background 0.2s;
    flex: none;
  }

  .toggle.on {
    background: var(--ru-tv-toggle-on);
  }

  .toggle .knob {
    position: absolute;
    top: 3px;
    left: 0;
    width: 20px;
    height: 20px;
    border-radius: 10px;
    background: #fff;
    transform: translateX(3px);
    transition: transform 0.2s;
  }

  .toggle.on .knob {
    transform: translateX(21px);
  }

  /* --- now playing ----------------------------------------------------------- */

  .controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .track {
    min-width: 0;
  }

  .track-title {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--ru-tv-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .track-app {
    font-size: 11px;
    font-weight: 500;
    color: var(--ru-tv-text-muted);
    margin-top: 1px;
  }

  .progress {
    position: relative;
    height: 8px;
    border-radius: 4px;
    background: var(--ru-tv-track);
    overflow: hidden;
    cursor: ew-resize;
    touch-action: none;
  }

  .progress-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    background: var(--ru-tv-accent);
    border-radius: 4px;
  }

  .times {
    display: flex;
    justify-content: space-between;
  }

  .time {
    font-size: 10.5px;
    font-weight: 500;
    color: var(--ru-tv-text-muted);
  }

  /* --- transport --------------------------------------------------------------- */

  .transport {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }

  .t-btn {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: var(--ru-tv-track);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ru-tv-label);
    font-size: 10px;
  }

  .t-btn:active {
    background: var(--ru-tv-accent);
    color: var(--ru-tv-accent-contrast);
  }

  .t-play {
    width: 52px;
    height: 52px;
    border-radius: 17px;
    background: var(--ru-tv-accent-bg);
    color: var(--ru-tv-accent);
    font-size: 15px;
  }

  .t-play:active {
    background: var(--ru-tv-accent);
    color: var(--ru-tv-accent-contrast);
  }

  /* --- volume ---------------------------------------------------------------------- */

  .vol-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 2px;
  }

  .vol-label {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ru-tv-label);
    width: 34px;
    flex: none;
    text-align: left;
  }

  .vol-label.muted {
    color: var(--ru-tv-mute);
  }

  .vol-track {
    position: relative;
    flex: 1;
    height: 26px;
    border-radius: 9px;
    background: var(--ru-tv-track);
    overflow: hidden;
    cursor: ew-resize;
    touch-action: none;
  }

  .vol-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    background: var(--ru-tv-volume-gradient);
  }

  .vol-fill.muted {
    opacity: 0.3;
  }

  .vol-value {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ru-tv-text);
    width: 32px;
    flex: none;
    text-align: right;
  }

  .vol-step {
    width: 42px;
    height: 26px;
    border-radius: 9px;
    background: var(--ru-tv-track);
    color: var(--ru-tv-label);
    font-size: 13px;
    font-weight: 700;
    flex: none;
  }

  .vol-step:active {
    background: var(--ru-tv-accent);
    color: var(--ru-tv-accent-contrast);
  }

  /* --- app chips ---------------------------------------------------------------------- */

  .apps {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .app {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: 9px;
    background: var(--ru-tv-track);
  }

  .app.active {
    background: var(--ru-tv-accent-bg);
  }

  .app-dot-sm {
    width: 8px;
    height: 8px;
    border-radius: 4px;
  }

  .app-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--ru-tv-label);
  }

  .app.active .app-name {
    color: var(--ru-tv-accent);
  }

  /* --- remote panel --------------------------------------------------------------------- */

  .remote-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--ru-tv-text);
  }

  .remote-body {
    display: flex;
    gap: 14px;
    align-items: center;
    justify-content: center;
  }

  .dpad {
    display: grid;
    grid-template-columns: repeat(3, 48px);
    grid-template-rows: repeat(3, 48px);
    gap: 4px;
  }

  .pad {
    border-radius: 12px;
    background: var(--ru-tv-track);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ru-tv-label);
    font-size: 11px;
  }

  .pad:active {
    background: var(--ru-tv-accent);
    color: var(--ru-tv-accent-contrast);
  }

  .pad.ok {
    border-radius: 24px;
    background: var(--ru-tv-accent-bg);
    color: var(--ru-tv-accent);
    font-weight: 700;
  }

  .pad.ok:active {
    background: var(--ru-tv-accent);
    color: var(--ru-tv-accent-contrast);
  }

  .keys {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .key {
    padding: 10px 18px;
    border-radius: 12px;
    background: var(--ru-tv-track);
    font-size: 12px;
    font-weight: 600;
    color: var(--ru-tv-label);
    text-align: center;
  }

  .key:active {
    background: var(--ru-tv-accent);
    color: var(--ru-tv-accent-contrast);
  }
`;
