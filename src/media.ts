/**
 * Media-player helpers shared by the media cards (ru-tv-card, ru-music-card):
 * time formatting and the extrapolated playback position.
 */

import type { HassEntity } from "./types";

/** m:ss below an hour, h:mm:ss above — mirrors the design mocks. */
export function formatTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Position extrapolated to `nowMs` while playing (HA only re-reports it on
 * state changes), clamped to the track length. */
export function livePosition(
  stateObj: HassEntity,
  playing: boolean,
  nowMs: number
): number {
  const position = stateObj.attributes.media_position ?? 0;
  const duration = stateObj.attributes.media_duration ?? 0;
  const updatedAt = stateObj.attributes.media_position_updated_at;
  const elapsed =
    playing && updatedAt ? (nowMs - Date.parse(updatedAt)) / 1000 : 0;
  return Math.min(duration, Math.max(0, position + Math.max(0, elapsed)));
}
