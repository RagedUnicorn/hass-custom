/**
 * Release entry point — what HACS's hass-custom.js runs first.
 *
 * Dev switch: when this browser has a dev server configured and it answers,
 * the release hands over to it (the dev server's src/main.ts registers
 * everything); otherwise it registers its own bundled cards and icons. So
 * the dashboard keeps one resource — the release — and simply follows
 * `npm run dev` on the browser that opted in:
 *
 *   localStorage.setItem("hass-custom-dev", "http://<your-pc>:5173")  // on
 *   localStorage.removeItem("hass-custom-dev")                         // off
 *
 * then refresh. Other browsers (tablets, phones) never see the dev server.
 * See DEVELOPMENT.md → "Dev loop against a real Home Assistant".
 */

import { showBuildBadge } from "./dev-badge";

const DEV_KEY = "hass-custom-dev";

/** How long the dev server gets to answer before the release takes over —
 * a stopped server is refused at once; this covers a sleeping PC. */
const PROBE_TIMEOUT_MS = 1500;

/** The configured dev server origin, or null. Storage can throw (private
 * windows, blocked site data) — that just means no dev switch. */
function devServer(): string | null {
  let value: string | null = null;
  try {
    value = window.localStorage.getItem(DEV_KEY);
  } catch {
    return null;
  }
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : null;
  } catch {
    console.warn(`hass-custom: ignoring ${DEV_KEY}="${value}" — not a URL`);
    return null;
  }
}

/** True when the dev server serves the entry module. Fails fast when it is
 * stopped, and on an https dashboard (an http dev server is mixed content). */
async function devServerUp(origin: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(`${origin}/src/main.ts`, {
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

interface MainModule {
  buildLabel?: () => string;
}

async function load(): Promise<void> {
  const origin = devServer();
  let fallback = "";
  if (origin && (await devServerUp(origin))) {
    try {
      const dev = (await import(
        /* @vite-ignore */ `${origin}/src/main.ts`
      )) as MainModule;
      console.info(`hass-custom: using the dev server at ${origin}`);
      showBuildBadge(
        "dev",
        dev.buildLabel?.() ?? "dev",
        `Dev server ${origin}`
      );
      return;
    } catch (error) {
      console.warn(
        `hass-custom: dev server at ${origin} failed to load, using the release`,
        error
      );
      fallback = "dev server failed to load";
    }
  } else if (origin) {
    console.info(
      `hass-custom: dev server at ${origin} not reachable, using the release`
    );
    fallback = "dev server not reachable";
  }
  const release = await import("./main");
  // Only browsers that opted into the dev switch see which build is active.
  if (origin) {
    showBuildBadge(
      "release",
      release.buildLabel(),
      `Release bundle — ${fallback} (${origin})`
    );
  }
}

void load();
