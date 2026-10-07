import { css } from "lit";

/**
 * Every color is exposed as a --ru-header-* custom property so a HA theme or
 * card-mod can override it. The presence green is the doors card's "closed"
 * green, so "home" reads the same everywhere on a dashboard.
 */
export const cardStyles = css`
  :host {
    --ru-header-bg: #f5f6fa;
    --ru-header-pill-bg: #ffffff;
    --ru-header-text: #3b3b3b;
    --ru-header-text-muted: #9aa0ae;
    --ru-header-home: #1f9d5c;
    --ru-header-away: #9aa0ae;
    --ru-header-font: -apple-system, "SF Pro Text", "Segoe UI", system-ui,
      sans-serif;

    display: block;
  }

  /* Dark palette — applied when HA is in dark mode (the card reflects
     hass.themes.darkMode as the [dark] host attribute). */
  :host([dark]) {
    --ru-header-bg: #1a1b1e;
    --ru-header-pill-bg: #242529;
    --ru-header-text: #e8e9ed;
    --ru-header-text-muted: #8b8f9b;
    --ru-header-home: #4fd18f;
    --ru-header-away: #8b8f9b;
  }

  * {
    box-sizing: border-box;
  }

  /* Title left, pills right; the pills wrap under the title when the two
     don't fit side by side. */
  .card {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px;
    border-radius: var(--ha-card-border-radius, 12px);
    background: var(--ru-header-bg);
    font-family: var(--ru-header-font);
  }

  .title {
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--ru-header-text);
  }

  .date {
    margin-top: 2px;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--ru-header-text-muted);
  }

  .people {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .pill {
    display: flex;
    align-items: center;
    gap: 7px;
    height: 32px;
    padding: 0 12px;
    border: none;
    margin: 0;
    border-radius: 999px;
    background: var(--ru-header-pill-bg);
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ru-header-text);
    white-space: nowrap;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ru-header-away);
  }

  .pill.home .dot {
    background: var(--ru-header-home);
  }

  .state {
    font-weight: 500;
    color: var(--ru-header-text-muted);
  }
`;
