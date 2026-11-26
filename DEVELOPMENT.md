# Development

The source is TypeScript + [Lit](https://lit.dev/), built with
[Vite](https://vite.dev/) into a single `generated/dist/hass-custom.js`.

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
npm run build       # bundle to generated/dist/hass-custom.js
npm run dev         # vite dev server for the live-HA dev loop
```

## Testing

The mock-hass harness, the Playwright suite, and CI are documented in
[TEST.md](TEST.md).

## Dev loop against a real Home Assistant

`npm run dev` starts vite on `:5173`, reachable on all interfaces — it prints
the LAN URL to use. Vite serves the TypeScript directly, so there is no build
step in the loop.

> Opening `http://<your-pc>:5173/` in a browser shows a **404 — that is
> expected**: this is a library build with no `index.html`. The module lives at
> `/src/main.ts`; open that URL to sanity-check the server (it returns the
> transpiled source).

1. Install the release bundle as usual (HACS) — it is the only resource the
   dashboards need. Then, in the browser you develop with, open the developer
   console on the Home Assistant page and turn on the **dev switch**:

   ```js
   localStorage.setItem("hass-custom-dev", "http://<your-pc>:5173")
   ```

   (`localStorage.removeItem("hass-custom-dev")` turns it off again.)
2. Hard-refresh (Ctrl+Shift+R). On every load the release bundle checks that
   dev server first: while `npm run dev` runs it hands over to the dev
   server's `src/main.ts`, otherwise it registers its own bundled cards — so
   stopping the dev server never breaks the dashboard, a refresh just falls
   back to the release. Only browsers with the switch set ever try the dev
   server; tablets and phones always run the release.

   A badge in the bottom-right corner of switched browsers shows which build
   is active — **DEV** (served by `npm run dev`) or **RELEASE** (dev server not
   reachable) — with the version and commit, `+` marking uncommitted changes;
   click it to hide it until the next reload. The purple `hass-custom` banner
   in the console carries the same label and lists the registered icon sets
   and cards.
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
- The dev server must be reachable from the browser, not from Home Assistant:
  `http://<your-pc>:5173` has to answer `/src/main.ts` within 1.5 s or the
  release takes over.
- Older setups added `http://<your-pc>:5173/src/main.ts` as its own dashboard
  resource. Remove it once the switch is in use — with both, whichever bundle
  loads first defines the cards.

## Adding an icon

1. Get the SVG `d` (path data) of a 24×24 icon.
2. Add an entry under the relevant set in [`src/icons.ts`](src/icons.ts).
3. Release as described below.

## Adding a card

1. Create `src/cards/<element-name>/` (element prefix `ru-`, see the
   [naming note](README.md#hass-custom)).
2. Add a side-effect import in [`src/main.ts`](src/main.ts) and mention the
   card in its console banner.
3. Document the card in its own `docs/<element-name>/<element-name>.md` and link it from the
   [card list](docs/cards.md) in `docs/cards.md`.
4. Add a mock-harness mount and a Playwright spec — see [TEST.md](TEST.md).

## Cutting a release

1. Bump `version` in [`package.json`](package.json).
2. Commit, tag and publish a GitHub release.
3. The release workflow builds the bundle and attaches `generated/dist/hass-custom.js`;
   HACS then offers the update.
