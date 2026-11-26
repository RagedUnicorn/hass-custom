/**
 * Corner badge naming the hass-custom build a page runs — shown only in
 * browsers that opted into the dev switch (see entry.ts), so a developer can
 * tell at a glance whether the dashboard follows `npm run dev` or the
 * installed release. Other browsers never render it.
 *
 * Plain DOM on document.body (outside HA's shadow roots, above everything);
 * a click hides it until the next page load.
 */

export type BadgeMode = "dev" | "release";

const BADGE_ID = "hass-custom-build-badge";

export function showBuildBadge(
  mode: BadgeMode,
  label: string,
  detail: string
): void {
  const mount = () => {
    document.getElementById(BADGE_ID)?.remove();
    const badge = document.createElement("div");
    badge.id = BADGE_ID;
    badge.title = `${detail} — click to hide until the next reload`;
    badge.setAttribute("role", "status");
    const accent = mode === "dev" ? "#e8590c" : "#6f42c1";
    Object.assign(badge.style, {
      position: "fixed",
      right: "12px",
      bottom: "12px",
      zIndex: "2147483647",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 9px 4px 4px",
      borderRadius: "999px",
      background: "rgba(20, 20, 24, 0.82)",
      color: "#fff",
      font: "600 11px/1.2 system-ui, -apple-system, 'Segoe UI', sans-serif",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
      cursor: "pointer",
      userSelect: "none",
    } satisfies Partial<CSSStyleDeclaration>);
    const tag = document.createElement("span");
    tag.textContent = mode === "dev" ? "DEV" : "RELEASE";
    Object.assign(tag.style, {
      background: accent,
      borderRadius: "999px",
      padding: "2px 7px",
      letterSpacing: "0.04em",
    } satisfies Partial<CSSStyleDeclaration>);
    const text = document.createElement("span");
    text.textContent = `hass-custom ${label}`;
    badge.append(tag, text);
    badge.addEventListener("click", () => badge.remove());
    document.body.appendChild(badge);
  };
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });
}
