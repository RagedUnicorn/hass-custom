import { css } from "lit";

/**
 * Every color is exposed as a --ru-doors-* custom property so a HA theme or
 * card-mod can override it. The three status colors are the card's whole
 * point: green closed, yellow open while home, red open while away. They
 * follow the washer card's palette (done / warn / stop) so the cards read as
 * one family on a dashboard.
 */
export const cardStyles = css`
  :host {
    --ru-doors-bg: #f5f6fa;
    --ru-doors-panel-bg: #ffffff;
    --ru-doors-text: #3b3b3b;
    --ru-doors-text-muted: #9aa0ae;
    --ru-doors-closed: #1f9d5c;
    --ru-doors-closed-bg: rgba(52, 199, 123, 0.14);
    --ru-doors-open-home: #b27400;
    --ru-doors-open-home-bg: rgba(245, 165, 36, 0.18);
    --ru-doors-open-away: #e0362a;
    --ru-doors-open-away-bg: rgba(245, 68, 54, 0.16);
    --ru-doors-unknown: #707686;
    --ru-doors-unknown-bg: rgba(112, 118, 134, 0.15);
    --ru-doors-panel-radius: 20px;
    --ru-doors-font: -apple-system, "SF Pro Text", "Segoe UI", system-ui,
      sans-serif;

    display: block;

    /* Size-query container, per the repo convention: the card reacts to the
       width it is given, not the viewport. */
    container: ru-doors / inline-size;
  }

  /* Dark palette — applied when HA is in dark mode (the card reflects
     hass.themes.darkMode as the [dark] host attribute). */
  :host([dark]) {
    --ru-doors-bg: #1a1b1e;
    --ru-doors-panel-bg: #242529;
    --ru-doors-text: #e8e9ed;
    --ru-doors-text-muted: #8b8f9b;
    --ru-doors-closed: #4fd18f;
    --ru-doors-closed-bg: rgba(52, 199, 123, 0.2);
    --ru-doors-open-home: #f5a524;
    --ru-doors-open-home-bg: rgba(245, 165, 36, 0.2);
    --ru-doors-open-away: #ff6b5e;
    --ru-doors-open-away-bg: rgba(245, 68, 54, 0.24);
    --ru-doors-unknown: #9aa0ae;
    --ru-doors-unknown-bg: rgba(255, 255, 255, 0.08);
  }

  * {
    box-sizing: border-box;
  }

  .card {
    background: var(--ru-doors-bg);
    border-radius: var(--ha-card-border-radius, 12px);
    padding: 20px 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-family: var(--ru-doors-font);
  }

  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 0 4px;
  }

  .title {
    font-size: 22px;
    font-weight: 700;
    color: var(--ru-doors-text);
  }

  .summary {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--ru-doors-text-muted);
  }

  .summary.open-home {
    color: var(--ru-doors-open-home);
  }

  .summary.open-away {
    color: var(--ru-doors-open-away);
  }

  /* One column by default; two side by side once the card is wide enough. */
  .doors {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  @container ru-doors (min-width: 520px) {
    .doors {
      grid-template-columns: 1fr 1fr;
    }
  }

  .door {
    /* Each status sets these two; everything below reads them. */
    --door-color: var(--ru-doors-unknown);
    --door-bg: var(--ru-doors-unknown-bg);

    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 14px;
    border: none;
    margin: 0;
    border-radius: var(--ru-doors-panel-radius);
    background: var(--ru-doors-panel-bg);
    box-shadow: inset 4px 0 0 var(--door-color);
    font-family: inherit;
    text-align: start;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .door.closed {
    --door-color: var(--ru-doors-closed);
    --door-bg: var(--ru-doors-closed-bg);
  }

  .door.open-home {
    --door-color: var(--ru-doors-open-home);
    --door-bg: var(--ru-doors-open-home-bg);
  }

  .door.open-away {
    --door-color: var(--ru-doors-open-away);
    --door-bg: var(--ru-doors-open-away-bg);
  }

  .icon-circle {
    flex: none;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--door-bg);
    color: var(--door-color);
    --mdc-icon-size: 22px;
  }

  .door-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .door-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--ru-doors-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .door-status {
    font-size: 13px;
    font-weight: 600;
    color: var(--door-color);
  }

  .door-since {
    flex: none;
    font-size: 12px;
    font-weight: 500;
    color: var(--ru-doors-text-muted);
  }
`;
