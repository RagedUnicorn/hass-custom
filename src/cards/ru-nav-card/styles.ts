import { css } from "lit";

/**
 * Every color is exposed as a --ru-nav-* custom property so a HA theme or
 * card-mod can override it. The card draws no background of its own — only
 * the pill — so it floats over whatever the footer sits on.
 */
export const cardStyles = css`
  :host {
    --ru-nav-bg: #ffffff;
    --ru-nav-item: #8a90a0;
    --ru-nav-active-bg: #3d5afe;
    --ru-nav-active-text: #ffffff;
    --ru-nav-shadow: 0 8px 28px rgba(35, 40, 54, 0.14);
    --ru-nav-font: -apple-system, "SF Pro Text", "Segoe UI", system-ui,
      sans-serif;

    display: flex;
    justify-content: center;

    /* Size-query container, per the repo convention: labels appear when the
       card is given room, not when the window is wide. */
    container: ru-nav / inline-size;
  }

  /* Dark palette — applied when HA is in dark mode (the card reflects
     hass.themes.darkMode as the [dark] host attribute). */
  :host([dark]) {
    --ru-nav-bg: #242529;
    --ru-nav-item: #8b8f9b;
    --ru-nav-active-bg: #7c90ff;
    --ru-nav-active-text: #1a1b1e;
    --ru-nav-shadow: 0 8px 28px rgba(0, 0, 0, 0.5);
  }

  * {
    box-sizing: border-box;
  }

  .dock {
    display: flex;
    gap: 4px;
    max-width: 100%;
    padding: 6px;
    border-radius: 999px;
    background: var(--ru-nav-bg);
    box-shadow: var(--ru-nav-shadow);
    font-family: var(--ru-nav-font);
  }

  .item {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
    height: 48px;
    padding: 0 11px;
    border: none;
    margin: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--ru-nav-item);
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    --mdc-icon-size: 22px;
  }

  .item.active {
    background: var(--ru-nav-active-bg);
    color: var(--ru-nav-active-text);
  }

  /* Compact: icons only, the active view keeps its label. */
  .label {
    display: none;
  }

  .item.active .label {
    display: inline;
  }

  /* Wide: every view gets its label. */
  @container ru-nav (min-width: 600px) {
    .item {
      padding: 0 14px;
    }

    .label {
      display: inline;
    }
  }
`;
