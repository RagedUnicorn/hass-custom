import { css } from "lit";

/**
 * Every color is exposed as a --ru-actions-* custom property so a HA theme or
 * card-mod can override it. The tones reuse the family's palette: the blue
 * accent of the shutter/TV cards, the lights card's amber, and the
 * doors card's green and red.
 */
export const cardStyles = css`
  :host {
    --ru-actions-bg: #f5f6fa;
    --ru-actions-panel-bg: #ffffff;
    --ru-actions-text: #3b3b3b;
    --ru-actions-text-muted: #9aa0ae;
    --ru-actions-accent: #3d5afe;
    --ru-actions-accent-bg: rgba(61, 90, 254, 0.15);
    --ru-actions-amber: #b26a00;
    --ru-actions-amber-bg: rgba(255, 167, 35, 0.18);
    --ru-actions-green: #1f9d5c;
    --ru-actions-green-bg: rgba(52, 199, 123, 0.14);
    --ru-actions-red: #e0362a;
    --ru-actions-red-bg: rgba(245, 68, 54, 0.16);
    --ru-actions-panel-radius: 20px;
    --ru-actions-font: -apple-system, "SF Pro Text", "Segoe UI", system-ui,
      sans-serif;

    display: block;
  }

  /* Dark palette — applied when HA is in dark mode (the card reflects
     hass.themes.darkMode as the [dark] host attribute). */
  :host([dark]) {
    --ru-actions-bg: #1a1b1e;
    --ru-actions-panel-bg: #242529;
    --ru-actions-text: #e8e9ed;
    --ru-actions-text-muted: #8b8f9b;
    --ru-actions-accent: #7c90ff;
    --ru-actions-accent-bg: rgba(61, 90, 254, 0.28);
    --ru-actions-amber: #ffc65c;
    --ru-actions-amber-bg: rgba(255, 167, 35, 0.22);
    --ru-actions-green: #4fd18f;
    --ru-actions-green-bg: rgba(52, 199, 123, 0.2);
    --ru-actions-red: #ff6b5e;
    --ru-actions-red-bg: rgba(245, 68, 54, 0.24);
  }

  * {
    box-sizing: border-box;
  }

  .card {
    background: var(--ru-actions-bg);
    border-radius: var(--ha-card-border-radius, 12px);
    padding: 16px 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-family: var(--ru-actions-font);
  }

  .title {
    padding: 0 4px;
    font-size: 17px;
    font-weight: 700;
    color: var(--ru-actions-text);
  }

  /* As many tiles per row as fit at ~104px each: three on a phone, more
     when the section is wide. */
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
    gap: 10px;
  }

  .tile {
    /* Each tone sets these two; everything below reads them. */
    --tone: var(--ru-actions-accent);
    --tone-bg: var(--ru-actions-accent-bg);

    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
    min-height: 112px;
    padding: 14px 12px;
    border: none;
    margin: 0;
    border-radius: var(--ru-actions-panel-radius);
    background: var(--ru-actions-panel-bg);
    font-family: inherit;
    text-align: start;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.1s;
  }

  .tile:active {
    transform: scale(0.98);
  }

  .tile.amber {
    --tone: var(--ru-actions-amber);
    --tone-bg: var(--ru-actions-amber-bg);
  }

  .tile.green {
    --tone: var(--ru-actions-green);
    --tone-bg: var(--ru-actions-green-bg);
  }

  .tile.red {
    --tone: var(--ru-actions-red);
    --tone-bg: var(--ru-actions-red-bg);
  }

  /* Covers travelling: the tile is their stop button now, in the shutter
     card's stop red. */
  .tile.stopping {
    --tone: var(--ru-actions-red);
    --tone-bg: var(--ru-actions-red-bg);
  }

  .tile.pending {
    animation: pulse 1s ease-in-out infinite alternate;
  }

  @keyframes pulse {
    from {
      opacity: 1;
    }
    to {
      opacity: 0.45;
    }
  }

  .icon-circle {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--tone-bg);
    color: var(--tone);
    --mdc-icon-size: 24px;
  }

  .name {
    font-size: 15px;
    font-weight: 700;
    line-height: 1.2;
    color: var(--ru-actions-text);
  }

  .status {
    margin-top: 3px;
    font-size: 11.5px;
    font-weight: 500;
    color: var(--ru-actions-text-muted);
  }

  /* The accent stays quiet; a status color tints the status line too. */
  .tile:not(.accent) .status {
    color: var(--tone);
  }
`;
