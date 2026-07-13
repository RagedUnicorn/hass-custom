import { css } from "lit";

/**
 * Every color is exposed as a --ru-purifier-* custom property so a HA theme
 * or card-mod can override it; the defaults ARE the intended look.
 */
export const cardStyles = css`
  :host {
    --ru-purifier-bg: #f5f6fa;
    --ru-purifier-panel-bg: #ffffff;
    --ru-purifier-text: #3b3b3b;
    --ru-purifier-text-muted: #9aa0ae;
    --ru-purifier-label: #8a90a0;
    --ru-purifier-accent: #3d5afe;
    --ru-purifier-accent-bg: rgba(61, 90, 254, 0.15);
    --ru-purifier-off: #707686;
    --ru-purifier-off-bg: rgba(112, 118, 134, 0.15);
    --ru-purifier-track: #f1f2f6;
    --ru-purifier-toggle-on: #3d5afe;
    --ru-purifier-toggle-off: #e3e5ec;
    --ru-purifier-aq-good: #3d5afe;
    --ru-purifier-aq-fair: #e8930c;
    --ru-purifier-aq-poor: #f54436;
    --ru-purifier-panel-radius: 20px;
    --ru-purifier-font: -apple-system, "SF Pro Text", "Segoe UI", system-ui,
      sans-serif;

    display: block;
  }

  /* Dark palette — applied when HA is in dark mode (the card reflects
     hass.themes.darkMode as the [dark] host attribute). */
  :host([dark]) {
    --ru-purifier-bg: #1a1b1e;
    --ru-purifier-panel-bg: #242529;
    --ru-purifier-text: #e8e9ed;
    --ru-purifier-text-muted: #8b8f9b;
    --ru-purifier-label: #8b8f9b;
    --ru-purifier-accent: #7c90ff;
    --ru-purifier-accent-bg: rgba(61, 90, 254, 0.28);
    --ru-purifier-off: #9aa0ae;
    --ru-purifier-off-bg: rgba(255, 255, 255, 0.08);
    --ru-purifier-track: rgba(255, 255, 255, 0.07);
    --ru-purifier-toggle-off: rgba(255, 255, 255, 0.14);
    --ru-purifier-aq-good: #7c90ff;
    --ru-purifier-aq-fair: #ffc65c;
    --ru-purifier-aq-poor: #ff6b5e;
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
    background: var(--ru-purifier-bg);
    border-radius: var(--ha-card-border-radius, 12px);
    padding: 20px 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-family: var(--ru-purifier-font);
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
    color: var(--ru-purifier-text);
  }

  .summary {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--ru-purifier-text-muted);
  }

  /* --- panels -------------------------------------------------------------- */

  .panel {
    background: var(--ru-purifier-panel-bg);
    border-radius: var(--ru-purifier-panel-radius);
    padding: 16px 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .unavailable {
    opacity: 0.5;
  }

  /* --- device row (spinning-ring icon, name/status, power toggle) ----------- */

  .device-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icon-circle {
    width: 42px;
    height: 42px;
    border-radius: 21px;
    background: var(--ru-purifier-accent-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }

  .icon-circle.off {
    background: var(--ru-purifier-off-bg);
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Open-arc ring; spin duration is set inline from the fan speed. */
  .spinner {
    width: 18px;
    height: 18px;
    border-radius: 9px;
    border: 3.5px solid var(--ru-purifier-accent);
    border-top-color: transparent;
    animation: spin 2s linear infinite;
  }

  .spinner.off {
    border-color: var(--ru-purifier-off);
    border-top-color: transparent;
    animation: none;
  }

  .device-text {
    flex: 1;
    min-width: 0;
  }

  .device-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--ru-purifier-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .device-status {
    font-size: 11.5px;
    font-weight: 500;
    color: var(--ru-purifier-text-muted);
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .device-status.on {
    color: var(--ru-purifier-accent);
  }

  /* --- toggles (large power, small oscillation) ------------------------------ */

  .toggle {
    width: 44px;
    height: 26px;
    border-radius: 13px;
    background: var(--ru-purifier-toggle-off);
    position: relative;
    transition: background 0.2s;
    flex: none;
  }

  .toggle.on {
    background: var(--ru-purifier-toggle-on);
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

  .toggle.small {
    width: 36px;
    height: 22px;
    border-radius: 11px;
  }

  .toggle.small .knob {
    width: 16px;
    height: 16px;
    border-radius: 8px;
  }

  .toggle.small.on .knob {
    transform: translateX(17px);
  }

  /* --- speed ticks ------------------------------------------------------------ */

  .speed {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .speed.dimmed {
    opacity: 0.4;
  }

  .speed-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .speed-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--ru-purifier-label);
  }

  .speed-value {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ru-purifier-label);
  }

  .speed-value.auto {
    color: var(--ru-purifier-accent);
  }

  .ticks {
    display: flex;
    gap: 3px;
  }

  .tick {
    flex: 1;
    height: 26px;
    border-radius: 5px;
    background: var(--ru-purifier-track);
  }

  .tick.on {
    background: var(--ru-purifier-accent);
  }

  /* --- mode chips --------------------------------------------------------------- */

  .modes {
    display: flex;
    gap: 6px;
  }

  .mode {
    padding: 7px 14px;
    border-radius: 9px;
    background: var(--ru-purifier-track);
    color: var(--ru-purifier-label);
    font-size: 12px;
    font-weight: 600;
  }

  .mode.active {
    background: var(--ru-purifier-accent-bg);
    color: var(--ru-purifier-accent);
  }

  /* --- oscillation row ------------------------------------------------------------ */

  .osc-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 2px;
  }

  .osc-label {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ru-purifier-text);
  }

  /* --- air quality panel ------------------------------------------------------------ */

  .aq-panel {
    gap: 12px;
  }

  .aq-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .aq-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--ru-purifier-text);
  }

  .aq-word {
    font-size: 12px;
    font-weight: 700;
    color: var(--ru-purifier-text-muted);
  }

  .aq-word.good,
  .aq-fill.good {
    color: var(--ru-purifier-aq-good);
  }

  .aq-word.fair,
  .aq-fill.fair {
    color: var(--ru-purifier-aq-fair);
  }

  .aq-word.poor,
  .aq-fill.poor {
    color: var(--ru-purifier-aq-poor);
  }

  .aq-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .aq-name {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ru-purifier-label);
    width: 52px;
    flex: none;
  }

  .aq-track {
    flex: 1;
    height: 8px;
    border-radius: 4px;
    background: var(--ru-purifier-track);
    overflow: hidden;
  }

  /* The fill paints with currentColor so the good/fair/poor classes color it. */
  .aq-fill {
    height: 100%;
    border-radius: 4px;
    background: currentColor;
    transition: width 0.6s;
  }

  .aq-value {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ru-purifier-text);
    width: 64px;
    flex: none;
    text-align: right;
  }
`;
