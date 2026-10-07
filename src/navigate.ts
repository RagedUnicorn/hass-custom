/**
 * In-app navigation the way Home Assistant's own navigate() does it: push the
 * path, then announce it with location-changed so the frontend router (and
 * every card listening, like ru-nav-card) follows. No-op on the current path.
 */

/** "/a/b/" and "/a/b" are the same view. */
export function normalizePath(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

export function navigate(path: string): void {
  if (normalizePath(path) === normalizePath(window.location.pathname)) return;
  window.history.pushState(null, "", path);
  window.dispatchEvent(
    new CustomEvent("location-changed", { detail: { replace: false } })
  );
}
