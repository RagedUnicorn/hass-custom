import { css } from "lit";

/**
 * Every color is exposed as a --ru-washer-* custom property so a HA theme or
 * card-mod can override it; the defaults ARE the intended look (option 1a of
 * the Washer Card mock, dark palette = option 1b).
 */
export const cardStyles = css`
  :host {
    --ru-washer-bg: #f5f6fa;
    --ru-washer-panel-bg: #ffffff;
    --ru-washer-text: #3b3b3b;
    --ru-washer-text-muted: #9aa0ae;
    --ru-washer-label: #8a90a0;
    --ru-washer-accent: #3d5afe;
    --ru-washer-accent-bg: rgba(61, 90, 254, 0.15);
    --ru-washer-accent-contrast: #ffffff;
    --ru-washer-off: #707686;
    --ru-washer-off-bg: rgba(112, 118, 134, 0.15);
    --ru-washer-track: #f1f2f6;
    --ru-washer-toggle-on: #3d5afe;
    --ru-washer-toggle-off: #e3e5ec;
    --ru-washer-done: #34c77b;
    --ru-washer-warn: #b27400;
    --ru-washer-warn-bg: rgba(245, 165, 36, 0.16);
    --ru-washer-stop: #f54436;
    --ru-washer-panel-radius: 20px;
    --ru-washer-font: -apple-system, "SF Pro Text", "Segoe UI", system-ui,
      sans-serif;

    display: block;

    /* Size-query container, per the repo convention: a card must react to the
       width it is given, not the viewport. No wide layout is defined yet, but
       declaring the container here means adding one is purely a CSS change. */
    container: ru-washer / inline-size;
    max-width: var(--ru-washer-max-width, none);
    margin-inline: auto;
  }

  /* Dark palette — applied when HA is in dark mode (the card reflects
     hass.themes.darkMode as the [dark] host attribute). */
  :host([dark]) {
    --ru-washer-bg: #1a1b1e;
    --ru-washer-panel-bg: #242529;
    --ru-washer-text: #e8e9ed;
    --ru-washer-text-muted: #8b8f9b;
    --ru-washer-label: #8b8f9b;
    --ru-washer-accent: #7c90ff;
    --ru-washer-accent-bg: rgba(61, 90, 254, 0.28);
    --ru-washer-accent-contrast: #1a1b1e;
    --ru-washer-off: #9aa0ae;
    --ru-washer-off-bg: rgba(255, 255, 255, 0.08);
    --ru-washer-track: rgba(255, 255, 255, 0.07);
    --ru-washer-toggle-off: rgba(255, 255, 255, 0.14);
    --ru-washer-warn: #f5a524;
    --ru-washer-stop: #ff6b5e;
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
    opacity: 0.45;
    cursor: default;
  }

  .card {
    position: relative;
    overflow: hidden;
    background: var(--ru-washer-bg);
    border-radius: var(--ha-card-border-radius, 12px);
    padding: 20px 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-family: var(--ru-washer-font);
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
    color: var(--ru-washer-text);
  }

  .summary {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--ru-washer-text-muted);
  }

  /* --- panels ------------------------------------------------------------ */

  .panel {
    background: var(--ru-washer-panel-bg);
    border-radius: var(--ru-washer-panel-radius);
    padding: 16px 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .unavailable {
    opacity: 0.5;
  }

  .panel-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--ru-washer-text);
  }

  /* --- device row -------------------------------------------------------- */

  .device-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icon-circle {
    width: 42px;
    height: 42px;
    border-radius: 21px;
    background: var(--ru-washer-accent-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }

  .icon-circle.off {
    background: var(--ru-washer-off-bg);
  }

  .state-dot {
    width: 16px;
    height: 16px;
    border-radius: 8px;
    background: var(--ru-washer-accent);
  }

  .icon-circle.off .state-dot {
    background: var(--ru-washer-off);
  }

  .state-dot.done {
    background: var(--ru-washer-done);
  }

  .device-text {
    flex: 1;
    min-width: 0;
  }

  .device-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--ru-washer-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .device-status {
    font-size: 11.5px;
    font-weight: 500;
    color: var(--ru-washer-text-muted);
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .device-status.on {
    color: var(--ru-washer-accent);
  }

  .device-status.done {
    color: var(--ru-washer-done);
  }

  .toggle {
    width: 44px;
    height: 26px;
    border-radius: 13px;
    background: var(--ru-washer-toggle-off);
    position: relative;
    transition: background 0.2s;
    flex: none;
  }

  .toggle.on {
    background: var(--ru-washer-toggle-on);
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

  /* --- cycle (programme, progress, readouts) ----------------------------- */

  .cycle {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .program {
    min-width: 0;
  }

  .program-name {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--ru-washer-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .program-phase {
    font-size: 11px;
    font-weight: 500;
    color: var(--ru-washer-text-muted);
    margin-top: 1px;
  }

  .progress {
    position: relative;
    height: 8px;
    border-radius: 4px;
    background: var(--ru-washer-track);
    overflow: hidden;
  }

  /* No width transition — the fill moves every second. */
  .progress-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    background: var(--ru-washer-accent);
    border-radius: 4px;
  }

  .progress-fill.done {
    background: var(--ru-washer-done);
  }

  .times {
    display: flex;
    justify-content: space-between;
  }

  .time {
    font-size: 10.5px;
    font-weight: 500;
    color: var(--ru-washer-text-muted);
  }

  .time.remaining {
    font-weight: 600;
    color: var(--ru-washer-accent);
  }

  .meta {
    display: flex;
    justify-content: space-between;
    margin-top: 2px;
  }

  .meta-item {
    font-size: 11px;
    font-weight: 500;
    color: var(--ru-washer-label);
  }

  .meta-item.warn {
    color: var(--ru-washer-warn);
  }

  .chips {
    display: flex;
    gap: 6px;
  }

  .chip {
    padding: 4px 9px;
    border-radius: 8px;
    background: var(--ru-washer-track);
    font-size: 10.5px;
    font-weight: 600;
    color: var(--ru-washer-label);
  }

  /* --- controls ---------------------------------------------------------- */

  .controls {
    display: flex;
    gap: 8px;
  }

  .control {
    flex: 1;
    height: 42px;
    border-radius: 14px;
    background: var(--ru-washer-track);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: var(--ru-washer-label);
    font-size: 12.5px;
    font-weight: 600;
  }

  .control.primary:not(:disabled) {
    background: var(--ru-washer-accent-bg);
    color: var(--ru-washer-accent);
  }

  .control:not(:disabled):active {
    background: var(--ru-washer-accent);
    color: var(--ru-washer-accent-contrast);
  }

  .control.danger:not(:disabled):active {
    background: var(--ru-washer-stop);
    color: #fff;
  }

  .control svg {
    width: 13px;
    height: 13px;
  }

  .blocked {
    font-size: 10.5px;
    font-weight: 500;
    color: var(--ru-washer-warn);
    background: var(--ru-washer-warn-bg);
    border-radius: 9px;
    padding: 7px 9px;
  }

  /* --- programme presets -------------------------------------------------- */

  .preset-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .preset {
    padding: 10px 11px;
    border-radius: 14px;
    background: var(--ru-washer-track);
    border: 2px solid transparent;
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
  }

  .preset.active {
    background: var(--ru-washer-accent-bg);
    border-color: var(--ru-washer-accent);
  }

  .preset-head {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .preset-head ha-icon {
    --mdc-icon-size: 16px;
    color: var(--ru-washer-label);
    flex: none;
  }

  .preset.active .preset-head ha-icon {
    color: var(--ru-washer-accent);
  }

  .preset-name {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--ru-washer-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .preset.active .preset-name {
    color: var(--ru-washer-accent);
  }

  .preset-meta {
    font-size: 10.5px;
    font-weight: 500;
    color: var(--ru-washer-text-muted);
  }
`;
