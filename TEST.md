# Testing

Cards are tested against a **mock-hass harness** — a page that mounts a card
with scripted cover entities and a simulated `callService` (covers travel over
time, stop works mid-travel). No real Home Assistant is involved, so tests
never move real covers.

## Harness

With `npm run dev` running, open `http://localhost:5173/dev/harness.html`.
Toolbar buttons toggle dark mode and reset state; `window.__harness` exposes
hooks (`calls`, `setDarkMode`, `setPosition`, `setTravelMs`, `reset`) for
scripted access.

## Test suite

[Playwright](https://playwright.dev/) specs in `tests/`, one spec per card.
One-time setup: `npx playwright install chromium`. Then:

```sh
npm test          # headless, desktop + mobile viewports
npm run test:ui   # interactive runner
```

The suite starts its own vite server on `:5199` (or reuses a running one)
and runs every spec in two viewport projects, because the drilldown renders
as a bottom sheet on narrow screens and a centered dialog on wide ones.

Card- *width* behavior is tested differently. `ru-tv-card`'s wide layout is
driven by a container query on the card itself, not by the viewport, so
`dev/harness.html` mounts a deliberately wide `#card-tv-wide` alongside the
400px-capped `#card-tv` and the spec pins its own viewport. The assertion is
that two identically configured cards at different widths lay out differently
on one page — which is exactly what a viewport media query could not produce.

## CI

The `Test` job in `validate.yml` runs the suite on every push; on failure the
Playwright HTML report is attached as an artifact.

## Adding a card means adding a spec

Extend `dev/harness.ts` to mount the new card against mock entities and write
`tests/<card-name>.spec.ts`.
