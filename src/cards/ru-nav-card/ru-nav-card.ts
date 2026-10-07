/**
 * ru-nav-card — a floating pill of dashboard views, for kiosk-mode dashboards
 * where Home Assistant's own view tabs are hidden.
 *
 * Meant for a sections view's sticky `footer`, which keeps it at the bottom of
 * the screen; the card itself only draws the pill. Narrow it shows icons only
 * (the active view keeps its label), wide every view shows icon and label —
 * decided by the card's own width, like every card in this repo.
 *
 * The highlighted entry is the route whose path matches the current location,
 * so the same config can sit in every view's footer.
 *
 * Configuration is YAML-only — no visual editor.
 */

import { LitElement, html, nothing, type TemplateResult } from "lit";
import { navigate, normalizePath } from "../../navigate";
import type { HomeAssistant, NavCardConfig, NavRouteConfig } from "../../types";
import { cardStyles } from "./styles";

const CARD_TYPE = "ru-nav-card";

/** A route is active on its own path and on anything below it (subviews). */
export function isActive(route: string, location: string): boolean {
  const target = normalizePath(route);
  const current = normalizePath(location);
  return current === target || current.startsWith(`${target}/`);
}

export class RuNavCard extends LitElement {
  static styles = cardStyles;

  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _location: { state: true },
  };

  hass?: HomeAssistant;

  private _config?: NavCardConfig;

  private _location = window.location.pathname;

  /** HA announces its own navigations on window; the browser's back/forward
   * comes through popstate. Either way only the highlight has to follow. */
  private readonly _onLocationChanged = (): void => {
    this._location = window.location.pathname;
  };

  setConfig(config: NavCardConfig): void {
    if (!Array.isArray(config?.routes) || config.routes.length === 0) {
      throw new Error(`${CARD_TYPE}: "routes" needs at least one entry`);
    }
    const routes = config.routes.map((route) => {
      const path = route?.path?.trim();
      if (!path || !path.startsWith("/")) {
        throw new Error(
          `${CARD_TYPE}: every route needs a "path" starting with "/", e.g. /home-dashboard/lights`
        );
      }
      if (!route.name?.trim() || !route.icon?.trim()) {
        throw new Error(`${CARD_TYPE}: every route needs a "name" and an "icon"`);
      }
      return { ...route, path };
    });
    this._config = { ...config, routes };
  }

  /** Sections views: fill the section — the card adapts to the width it is
   * given (container queries), so a partial default would only squeeze it. A
   * dashboard's own grid_options on the card still win. */
  getGridOptions(): { columns: "full" } {
    return { columns: "full" };
  }

  getCardSize(): number {
    return 1;
  }

  static getStubConfig(): Record<string, unknown> {
    return {
      routes: [
        { path: "/lovelace/0", name: "Home", icon: "mdi:home-variant-outline" },
        { path: "/lovelace/1", name: "Lights", icon: "mdi:lightbulb-group-outline" },
      ],
    };
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._location = window.location.pathname;
    window.addEventListener("location-changed", this._onLocationChanged);
    window.addEventListener("popstate", this._onLocationChanged);
  }

  disconnectedCallback(): void {
    window.removeEventListener("location-changed", this._onLocationChanged);
    window.removeEventListener("popstate", this._onLocationChanged);
    super.disconnectedCallback();
  }

  protected willUpdate(): void {
    this.toggleAttribute("dark", this.hass?.themes?.darkMode ?? false);
  }

  render(): TemplateResult | typeof nothing {
    if (!this._config) return nothing;

    const admin = this.hass?.user?.is_admin ?? false;
    const routes = this._config.routes.filter(
      (route) => !route.admin_only || admin
    );

    return html`
      <nav class="dock">
        ${routes.map((route) => this._renderRoute(route))}
      </nav>
    `;
  }

  private _renderRoute(route: NavRouteConfig): TemplateResult {
    const active = isActive(route.path, this._location);
    return html`
      <button
        class="item ${active ? "active" : ""}"
        data-path=${route.path}
        aria-label=${route.name}
        aria-current=${active ? "page" : "false"}
        @click=${() => navigate(route.path)}
      >
        <ha-icon .icon=${route.icon}></ha-icon>
        <span class="label">${route.name}</span>
      </button>
    `;
  }
}

if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, RuNavCard);
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: "RU Nav Card",
    description:
      "Floating dock of dashboard views for kiosk-mode dashboards, made for a sections view's sticky footer",
    documentationURL: "https://github.com/ragedunicorn/hass-custom",
  });
}
