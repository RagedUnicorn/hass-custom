/**
 * Shared time helpers for the cards — pure functions, no DOM.
 */

/** "just now" / "12 min" / "3 h" / "2 d" since `iso`, or "" without a stamp. */
export function sinceText(iso: string | undefined, now: number): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const minutes = Math.floor(Math.max(0, now - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}
