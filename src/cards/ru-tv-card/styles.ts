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

    /* Size-query container for the wide layout at the end of this file. The
       layout follows the width the card actually gets — a panel view, a wide
       section, a tablet dashboard — and NOT the viewport, so a phone-width
       card in a wide browser window stays stacked. (A @media query inside a
       shadow root would key off the window and get exactly that case wrong.)

       inline-size containment means the host takes its width from its parent
       and never from its contents, which is how Lovelace mounts every card.
       Block size stays content-driven, so getCardSize() is unaffected. */
    container: ru-tv / inline-size;

    /* Optional cap on how wide the card may get. The default "none" keeps the
       fill-the-parent behavior; set it to e.g. 1100px for a panel-view
       dashboard, where an uncapped card would otherwise stretch the seek and
       volume bars across the whole screen.

       It has to sit on :host, not .card. :host IS the query container, so
       capping here also caps what the container query measures — the layout
       and the real width stay in agreement. Capping .card instead would let
       the query see the uncapped width and choose the wide layout for a card
       that is no longer wide enough for it.

       Deliberately NOT declared as a "--ru-tv-max-width: none" line among the
       palette variables above: an own-element declaration would shadow the
       inherited value, and then only inline styles and card-mod could set it.
       Reading it through a var() fallback instead lets an HA theme set it on
       :root and have it inherit down.

       margin-inline centers the card once it is narrower than its slot, and
       is a no-op while the cap is "none". */
    max-width: var(--ru-tv-max-width, none);
    margin-inline: auto;
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
    /* Nested size container for the volume nudge reveal below: the −/+
       buttons key off the row's own width, not the card's — the wide
       layout narrows the media column, so the :host query (ru-tv) is the
       wrong proxy. Safe: .controls never sizes from its contents (it's a
       stretched flex child or a minmax(0, 1fr) grid item in every layout). */
    container: ru-tv-controls / inline-size;
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

  .vol-step,
  .vol-nudge {
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

  .vol-step:active,
  .vol-nudge:active {
    background: var(--ru-tv-accent);
    color: var(--ru-tv-accent-contrast);
  }

  /* −/+ beside the slider, only when the row has room. Fixed content is
     190px (34 mute + 2×42 nudges + 32 value + 4×10 gaps), so 330px keeps
     the slider ≥140px. The reveal must follow the hide in source order —
     a container query adds no specificity (same gotcha as the wide
     layout below). */
  .vol-nudge {
    display: none;
  }

  @container ru-tv-controls (min-width: 330px) {
    .vol-nudge {
      display: inline-block;
    }
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

  /* Tapped while the TV was still waking — the launch is queued until it
     reports on, so the chip pulses like the power knob does. */
  .app.pending {
    animation: ru-tv-knob-pulse 1s ease-in-out infinite;
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
  .app-glyph.dim,
  .app-dot-sm.dim {
    opacity: 0.5;
  }

  /* Fallback for apps configured without an icon. Compact renders a plain
     8px dot: the app's initial is in the DOM all along but collapsed to
     font-size 0, so the wide layout below can reveal it as a letter puck
     without re-rendering (a container query cannot change the DOM — same
     pattern as .vol-nudge). */
  .app-dot-sm {
    width: 8px;
    height: 8px;
    border-radius: 4px;
    font-size: 0;
    color: transparent;
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

  /* --- keyboard panel ------------------------------------------------------ */

  /* Hidden at compact width regardless of config — a phone column has no
     room for 40 keys. The wide layout below reveals it as a full-width
     third grid row. */
  .panel.keyboard {
    display: none;
    gap: 6px;
  }

  .kb-row {
    display: flex;
    justify-content: center;
    gap: 6px;
  }

  .kb-key {
    flex: 1;
    max-width: 52px;
    height: 40px;
    border-radius: 10px;
    background: var(--ru-tv-track);
    color: var(--ru-tv-label);
    font-size: 14px;
    font-weight: 600;
    touch-action: none;
    user-select: none;
  }

  .kb-key.stretch {
    flex: 1.6;
    max-width: 84px;
  }

  .kb-key.space {
    flex: 7;
    max-width: 380px;
    font-size: 12px;
  }

  .kb-key:active {
    background: var(--ru-tv-accent);
    color: var(--ru-tv-accent-contrast);
  }

  /* --- wide (tablet) layout ----------------------------------------------- */

  /* Where 640px comes from, measured against the rules above:
       remote column floor = 230 (.ring) + 28 (.panel padding)     = 258
       media  column floor = 260 (.transport row) + 28             = 288
       plus 32 (.card padding) + 14 (gap)                          = 592
     640 leaves ~48px of slack and gives the media column ~336px — about the
     width of the phone card. Browsers without @container support simply keep
     the stacked layout.

     Note every override below needs the extra class (.card.has-remote, not
     .card): a container query contributes NO specificity of its own, so a bare
     .card rule would tie with the "display: flex" rule above and lose on
     source order. */
  @container ru-tv (min-width: 640px) {
    .card.has-remote {
      display: grid;
      /* minmax(0, 1fr), not 1fr: a bare 1fr floors at min-content, which for
         the media panel includes the 260px transport row — enough to push the
         grid past the card, where .card's overflow:hidden would clip it.
         "auto" on the remote column sizes it to the ring so it never squeezes.
         The existing 14px gap carries over as both row and column gap. */
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        "header header"
        "media  remote";
      /* align-items stays at the default "stretch" on purpose: two
         equal-height panel backgrounds read as one deliberate row, where
         "start" would leave a ragged bottom edge between them. */
    }

    .card.has-remote > .header {
      grid-area: header;
    }

    .card.has-remote > .panel.media {
      grid-area: media;
    }

    .card.has-remote > .panel.remote {
      grid-area: remote;
    }

    /* Keyboard: a full-width third row. Scoped to .has-keyboard so cards
       without it keep the two-row grid — an empty third template row would
       still cost a 14px trailing gap. */
    .card.has-remote.has-keyboard {
      grid-template-areas:
        "header   header"
        "media    remote"
        "keyboard keyboard";
    }

    .card.has-remote.has-keyboard > .panel.keyboard {
      grid-area: keyboard;
      display: flex;
    }

    /* No remote panel: a lone media panel would stretch the seek and volume
       bars across the full width. Split it instead — device row across the
       top, playback controls beside the app chips. Only when both halves are
       actually there. */
    .card:not(.has-remote) .panel.media:has(.controls):has(.apps) {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      grid-template-areas:
        "device   device"
        "controls apps";
      align-items: start;
    }

    .card:not(.has-remote)
      .panel.media:has(.controls):has(.apps)
      > .device-row {
      grid-area: device;
    }

    .card:not(.has-remote) .panel.media:has(.controls):has(.apps) > .controls {
      grid-area: controls;
    }

    .card:not(.has-remote) .panel.media:has(.controls):has(.apps) > .apps {
      grid-area: apps;
      /* Pack the chips top-down against the controls column instead of
         spreading them down the full row height. */
      align-content: flex-start;
    }

    /* --- app tiles ---------------------------------------------------------
       At wide the chips grow into a grid of column tiles (the compact mock's
       "tiles" variant). Same DOM as the chips — a container query can't add
       elements — so the chip markup is restyled and the icon-less fallback
       dot reveals the app initial it has carried (invisibly) all along.
       The .card prefix supplies the specificity the note above demands; one
       rule set covers both wide branches. */
    .card .apps {
      display: grid;
      /* gap: 6px carries over from the base .apps rule. */
      grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    }

    .card .app {
      flex-direction: column;
      gap: 8px;
      padding: 12px 4px;
      border-radius: 14px;
    }

    .card .app-icon,
    .card .app-glyph {
      width: 34px;
      height: 34px;
    }

    .card .app-icon {
      border-radius: 8px;
    }

    .card .app-glyph {
      --mdc-icon-size: 34px;
    }

    /* Letter puck: the fallback dot at icon footprint, showing the app's
       initial in white on the app color (matches the harness placeholder
       icons); the shadow keeps it readable on light brand colors. */
    .card .app-dot-sm {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
    }

    .card .app-name {
      font-size: 11px;
    }
  }
`;
