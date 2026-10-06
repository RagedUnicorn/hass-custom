import { css } from "lit";

/**
 * Every color is exposed as a --ru-last-seen-* custom property so a HA theme
 * or card-mod can override it. Same green / yellow / red / grey family as
 * ru-doors-card, so the two read alike on a dashboard.
 */
export const cardStyles = css`
  :host {
    --ru-last-seen-bg: #f5f6fa;
    --ru-last-seen-panel-bg: #ffffff;
    --ru-last-seen-text: #3b3b3b;
    --ru-last-seen-text-muted: #9aa0ae;
    --ru-last-seen-fresh: #1f9d5c;
    --ru-last-seen-fresh-bg: rgba(52, 199, 123, 0.14);
    --ru-last-seen-stale: #b27400;
    --ru-last-seen-stale-bg: rgba(245, 165, 36, 0.18);
    --ru-last-seen-dead: #e0362a;
    --ru-last-seen-dead-bg: rgba(245, 68, 54, 0.16);
    --ru-last-seen-unknown: #707686;
    --ru-last-seen-unknown-bg: rgba(112, 118, 134, 0.15);
    --ru-last-seen-panel-radius: 20px;
    --ru-last-seen-font: -apple-system, "SF Pro Text", "Segoe UI", system-ui,
      sans-serif;

    display: block;

    /* Size-query container, per the repo convention: the card reacts to the
       width it is given, not the viewport. */
    container: ru-last-seen / inline-size;
  }

  /* Dark palette — applied when HA is in dark mode (the card reflects
     hass.themes.darkMode as the [dark] host attribute). */
  :host([dark]) {
    --ru-last-seen-bg: #1a1b1e;
    --ru-last-seen-panel-bg: #242529;
    --ru-last-seen-text: #e8e9ed;
    --ru-last-seen-text-muted: #8b8f9b;
    --ru-last-seen-fresh: #4fd18f;
    --ru-last-seen-fresh-bg: rgba(52, 199, 123, 0.2);
    --ru-last-seen-stale: #f5a524;
    --ru-last-seen-stale-bg: rgba(245, 165, 36, 0.2);
    --ru-last-seen-dead: #ff6b5e;
    --ru-last-seen-dead-bg: rgba(245, 68, 54, 0.24);
    --ru-last-seen-unknown: #9aa0ae;
    --ru-last-seen-unknown-bg: rgba(255, 255, 255, 0.08);
  }

  * {
    box-sizing: border-box;
  }

  .card {
    background: var(--ru-last-seen-bg);
    border-radius: var(--ha-card-border-radius, 12px);
    padding: 20px 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-family: var(--ru-last-seen-font);
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
    color: var(--ru-last-seen-text);
  }

  .summary {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--ru-last-seen-text-muted);
  }

  .summary.stale {
    color: var(--ru-last-seen-stale);
  }

  .summary.dead {
    color: var(--ru-last-seen-dead);
  }

  /* One column by default; two side by side once the card is wide enough. */
  .rows {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  @container ru-last-seen (min-width: 520px) {
    .rows {
      grid-template-columns: 1fr 1fr;
    }
  }

  .row {
    /* Each status sets these two; everything below reads them. */
    --row-color: var(--ru-last-seen-unknown);
    --row-bg: var(--ru-last-seen-unknown-bg);

    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 14px;
    border: none;
    margin: 0;
    border-radius: var(--ru-last-seen-panel-radius);
    background: var(--ru-last-seen-panel-bg);
    box-shadow: inset 4px 0 0 var(--row-color);
    font-family: inherit;
    text-align: start;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .row.fresh {
    --row-color: var(--ru-last-seen-fresh);
    --row-bg: var(--ru-last-seen-fresh-bg);
  }

  .row.stale {
    --row-color: var(--ru-last-seen-stale);
    --row-bg: var(--ru-last-seen-stale-bg);
  }

  .row.dead {
    --row-color: var(--ru-last-seen-dead);
    --row-bg: var(--ru-last-seen-dead-bg);
  }

  .icon-circle {
    flex: none;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--row-bg);
    color: var(--row-color);
    --mdc-icon-size: 22px;
  }

  .row-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .row-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--ru-last-seen-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-status {
    font-size: 13px;
    font-weight: 600;
    color: var(--row-color);
  }
`;
