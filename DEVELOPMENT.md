# Development

The source is TypeScript + [Lit](https://lit.dev/), built with
[Vite](https://vite.dev/) into a single `dist/hass-custom.js`.

## Project structure

```text
src/
├── main.ts                    # entry point — registers everything
├── icons.ts                   # custom icon sets (ru:*)
├── types.ts                   # minimal HA frontend types + config schemas
└── cards/
    └── ru-shutters-card/      # one folder per card
```

## Commands

```sh
npm install
npm run typecheck   # tsc --noEmit
npm run build       # bundle to dist/hass-custom.js
npm run dev         # vite dev server for the live-HA dev loop
```

## Testing

Cards are tested against a **mock-hass harness** — a page that mounts a card
with scripted cover entities and a simulated `callService` (covers travel over
time, stop works mid-travel). No real Home Assistant is involved, so tests
never move real covers.

- **Harness:** with `npm run dev` running, open
  `http://localhost:5173/dev/harness.html`. Toolbar buttons toggle dark mode
  and reset state; `window.__harness` exposes hooks (`calls`, `setDarkMode`,
  `setPosition`, `setTravelMs`, `reset`) for scripted access.
- **Test suite:** [Playwright](https://playwright.dev/) specs in `tests/`,
  one spec per card. One-time setup: `npx playwright install chromium`. Then:

  ```sh
  npm test          # headless, desktop + mobile viewports
  npm run test:ui   # interactive runner
  ```

  The suite starts its own vite server on `:5199` (or reuses a running one)
  and runs every spec in two viewport projects, because the drilldown renders
  as a bottom sheet on narrow screens and a centered dialog on wide ones.
- **CI:** the `Test` job in `validate.yml` runs the suite on every push; on
  failure the Playwright HTML report is attached as an artifact.

**Adding a card means adding a spec**: extend `dev/harness.ts` to mount the
new card against mock entities and write `tests/<card-name>.spec.ts`.

## Dev loop against a real Home Assistant

`npm run dev` starts vite on `:5173`, reachable on all interfaces — it prints
the LAN URL to use. Vite serves the TypeScript directly, so there is no build
step in the loop.

> Opening `http://<your-pc>:5173/` in a browser shows a **404 — that is
> expected**: this is a library build with no `index.html`. The module lives at
> `/src/main.ts`; open that URL to sanity-check the server (it returns the
> transpiled source).

1. In Home Assistant: **Settings → Dashboards → ⋮ → Resources → Add resource**
   (the Resources entry only appears with **Advanced mode** enabled in your
   user profile).
   - URL: `http://<your-pc>:5173/src/main.ts`
   - Type: **JavaScript Module**
2. Hard-refresh the browser (Ctrl+Shift+R). The purple `hass-custom` banner in
   the browser console confirms the dev bundle loaded and lists the registered
   icon sets and cards.
3. Add a card to a (development) dashboard via the manual card editor, e.g.:

   ```yaml
   type: custom:ru-shutters-card
   title: Shutters
   rooms:
     - name: Office
       covers:
         - entity: cover.example_office
           name: Window
   ```

4. Edit source, save, refresh the dashboard page — vite recompiles on the fly;
   there is no HMR into Home Assistant, a plain refresh is enough.

Notes:

- If Home Assistant is accessed over **HTTPS**, the browser blocks the plain
  `http://…:5173` module as mixed content — the dev loop needs HA on `http://`.
- The dev resource can coexist with an installed release of the bundle —
  element registration is guarded, so nothing throws (expect two console
  banners). But **whichever bundle loads first defines the card**: if the
  installed release already ships the card you are working on, remove or
  disable that resource while developing, or your changes may silently not
  apply.
- Remove the resource when done so dashboards don't try to load a dead dev
  server later.

## Adding an icon

1. Get the SVG `d` (path data) of a 24×24 icon.
2. Add an entry under the relevant set in [`src/icons.ts`](src/icons.ts).
3. Release as described below.

## Adding a card

1. Create `src/cards/<element-name>/` (element prefix `ru-`, see the
   [naming note](README.md#hass-custom)).
2. Add a side-effect import in [`src/main.ts`](src/main.ts) and mention the
   card in its console banner.
3. Document the card in the [README](README.md#cards).

## Cutting a release

1. Bump `version` in [`package.json`](package.json).
2. Commit, tag and publish a GitHub release.
3. The release workflow builds the bundle and attaches `dist/hass-custom.js`;
   HACS then offers the update.
