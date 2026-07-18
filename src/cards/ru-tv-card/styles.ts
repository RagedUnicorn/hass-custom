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
    --ru-tv-mute-bg: rgba(245, 68, 54, 0.12);
    --ru-tv-ok-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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
    --ru-tv-mute-bg: rgba(255, 107, 94, 0.16);
    --ru-tv-ok-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
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

  /* A turn_on/off is in flight — the knob sits at its target and pulses
     until HA confirms the new state (real TVs react seconds later). */
  .toggle.pending .knob {
    animation: ru-tv-knob-pulse 1s ease-in-out infinite;
  }

  @keyframes ru-tv-knob-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.45;
    }
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
  }

  /* Seekable bars show a grab thumb (so overflow stays visible) and extend
     their pointer hit area well past the 8px visual height. */
  .progress.seekable {
    overflow: visible;
    cursor: ew-resize;
    touch-action: none;
  }

  .progress.seekable::before {
    content: "";
    position: absolute;
    inset: -10px 0;
  }

  .progress-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    background: var(--ru-tv-accent);
    border-radius: 4px;
  }

  .progress-thumb {
    position: absolute;
    top: 50%;
    width: 14px;
    height: 14px;
    border-radius: 7px;
    background: #fff;
    border: 2px solid var(--ru-tv-accent);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
    transform: translate(-50%, -50%);
    pointer-events: none;
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

  /* Skip back/forward — transport-button look with a readable seconds label. */
  .t-skip {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: var(--ru-tv-track);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ru-tv-label);
    font-size: 11px;
    font-weight: 600;
  }

  .t-skip:active {
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

  .vol-mute {
    width: 34px;
    height: 26px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ru-tv-label);
    flex: none;
  }

  .vol-mute svg {
    width: 18px;
    height: 18px;
  }

  .vol-mute:active {
    color: var(--ru-tv-accent);
  }

  .vol-mute.muted {
    color: var(--ru-tv-mute);
    background: var(--ru-tv-mute-bg);
  }

  /* A configured volume_entity that's currently unavailable — the row stays
     in place but nothing in it reacts (no silent retarget to another entity). */
  .vol-row.unavailable {
    opacity: 0.45;
  }

  .vol-track.disabled {
    pointer-events: none;
    cursor: default;
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
    touch-action: none;
    user-select: none;
  }

  /* Stepper layout: − and + stretch across the row with the % in between. */
  .vol-row.steppers .vol-step {
    flex: 1;
  }

  .vol-value.mid {
    width: 44px;
    text-align: center;
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
    gap: 7px;
    padding: 7px 12px;
    border-radius: 9px;
    background: var(--ru-tv-track);
  }

  .app.active {
    background: var(--ru-tv-accent-bg);
  }

  .app-icon {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
  }

  /* mdi:/ru: icon refs render through ha-icon, tinted the app's color. */
  .app-glyph {
    --mdc-icon-size: 16px;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .app-icon.dim,
  .app-glyph.dim {
    opacity: 0.5;
  }

  /* Fallback for apps configured without an icon. */
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

  .remote-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .remote-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--ru-tv-text);
  }

  /* Echo of the last press ("▲ Up") — the min-height keeps the panel from
     jumping while the echo is empty. */
  .pad-feedback {
    font-size: 12px;
    font-weight: 600;
    color: var(--ru-tv-accent);
    min-height: 16px;
  }

  .ring-wrap {
    display: flex;
    justify-content: center;
  }

  /* Ring d-pad: one big circle like a physical remote — the rim quadrants
     are the directions (clip-path pie slices), the center circle is OK. */
  .ring {
    position: relative;
    width: 230px;
    height: 230px;
    border-radius: 50%;
    background: var(--ru-tv-track);
    overflow: hidden;
  }

  .quad {
    position: absolute;
    inset: 0;
    display: flex;
    color: var(--ru-tv-label);
    font-size: 13px;
  }

  .quad.up {
    clip-path: polygon(50% 50%, 0 0, 100% 0);
    align-items: flex-start;
    justify-content: center;
    padding-top: 18px;
  }

  .quad.down {
    clip-path: polygon(50% 50%, 0 100%, 100% 100%);
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 18px;
  }

  .quad.left {
    clip-path: polygon(50% 50%, 0 0, 0 100%);
    align-items: center;
    justify-content: flex-start;
    padding-left: 18px;
  }

  .quad.right {
    clip-path: polygon(50% 50%, 100% 0, 100% 100%);
    align-items: center;
    justify-content: flex-end;
    padding-right: 18px;
  }

  .quad:active {
    background: var(--ru-tv-accent);
    color: var(--ru-tv-accent-contrast);
  }

  .ok {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 92px;
    height: 92px;
    border-radius: 46px;
    background: var(--ru-tv-panel-bg);
    box-shadow: var(--ru-tv-ok-shadow);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ru-tv-accent);
    font-size: 14px;
    font-weight: 700;
  }

  .ok:active {
    background: var(--ru-tv-accent);
    color: var(--ru-tv-accent-contrast);
  }

  .keys {
    display: flex;
    justify-content: center;
    gap: 10px;
  }

  .key {
    width: 104px;
    height: 52px;
    border-radius: 16px;
    background: var(--ru-tv-track);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ru-tv-label);
  }

  .key svg {
    width: 22px;
    height: 22px;
  }

  .key:active {
    background: var(--ru-tv-accent);
    color: var(--ru-tv-accent-contrast);
  }
`;
