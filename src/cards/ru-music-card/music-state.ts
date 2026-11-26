/**
 * Pure derivation of display state for ru-music-card — no DOM, no services.
 *
 * Two inputs: the Music Assistant media_player entities (speakers, now
 * playing, volume, grouping — all feature-detected from supported_features)
 * and the response data of the music_assistant.* actions (library, search,
 * queue), whose shapes are mirrored by the Ma* interfaces below.
 */

import { formatTime, livePosition } from "../../media";
import type {
  HassEntity,
  HomeAssistant,
  MusicCardConfig,
} from "../../types";

// MediaPlayerEntityFeature bits (HA convention).
const FEATURE_PAUSE = 1;
const FEATURE_SEEK = 2;
const FEATURE_VOLUME_SET = 4;
const FEATURE_VOLUME_MUTE = 8;
const FEATURE_PREVIOUS_TRACK = 16;
const FEATURE_NEXT_TRACK = 32;
const FEATURE_PLAY = 16384;
const FEATURE_REPEAT_SET = 262144;
const FEATURE_GROUPING = 524288;

export type RepeatMode = "off" | "all" | "one";

/** A library tab, named by the Music Assistant media type it lists. "track"
 * is the Liked tab — MA syncs Spotify's Liked Songs as library tracks. */
export type LibraryKind = "playlist" | "track" | "album" | "artist";

export const LIBRARY_KINDS: LibraryKind[] = [
  "playlist",
  "track",
  "album",
  "artist",
];

export const KIND_LABELS: Record<LibraryKind, string> = {
  playlist: "Playlists",
  track: "Liked",
  album: "Albums",
  artist: "Artists",
};

// --- Music Assistant response shapes -------------------------------------------

export interface MaMediaItem {
  media_type: string;
  uri: string;
  name: string;
  image?: string | null;
  artists?: MaMediaItem[];
  album?: MaMediaItem | null;
}

/** A node of HA's media_player/browse_media answer for a Music Assistant
 * player — a playlist or album (children: tracks) or an artist (children:
 * albums). Child titles read "Artist - Name" when the item has artists. */
export interface MaBrowseNode {
  title: string;
  media_class?: string;
  media_content_type?: string;
  media_content_id: string;
  can_expand?: boolean;
  thumbnail?: string | null;
  children?: MaBrowseNode[];
}

export interface MaQueueItem {
  queue_item_id: string;
  name: string;
  duration?: number | null;
  media_item?: MaMediaItem | null;
}

export interface MaQueueDetails {
  items: number;
  current_index: number | null;
  current_item: MaQueueItem | null;
  next_item: MaQueueItem | null;
  /** Only returned when the action supports and was asked for `limit`. */
  queue_items?: MaQueueItem[];
}

// --- views -------------------------------------------------------------------------

export interface PlayerRef {
  entity: string;
  name: string;
}

export interface SpeakerChipView extends PlayerRef {
  status: string;
  /** Highlighted: the selected speaker, or any member of its group. */
  active: boolean;
  playing: boolean;
}

export interface NowPlayingView {
  /** The entity transport/seek/repeat go to — the group leader if grouped. */
  entity: string;
  available: boolean;
  hasTrack: boolean;
  playing: boolean;
  title: string;
  artist: string;
  picture: string | null;
  /** Live position in seconds (extrapolated while playing). */
  position: number;
  /** Track length in seconds; 0 when unknown (e.g. a TV input). */
  duration: number;
  durText: string;
  supportsSeek: boolean;
  supportsPlayPause: boolean;
  supportsPrevNext: boolean;
  supportsRepeat: boolean;
  repeat: RepeatMode;
}

export interface VolumeRowView extends PlayerRef {
  /** 0…100, or null when the player reports no level. */
  pct: number | null;
  muted: boolean;
  supportsSet: boolean;
  supportsMute: boolean;
  available: boolean;
}

export interface MusicView {
  speakers: SpeakerChipView[];
  selected: PlayerRef;
  /** The selected speaker plays in a group with another configured one. */
  grouped: boolean;
  /** Grouping is possible: two or more speakers that support it. */
  canGroup: boolean;
  /** Configured speakers in the selected speaker's group (incl. itself). */
  groupMembers: string[];
  now: NowPlayingView;
  /** One row for the selected speaker, one per member while grouped. */
  volumes: VolumeRowView[];
  summaryText: string;
  /** Where a play/queue action lands: "Living Room", "both rooms". */
  targetName: string;
}

export interface LibraryRowView {
  uri: string;
  mediaType: string;
  name: string;
  meta: string;
  image: string | null;
  /** Artists get a round thumbnail. */
  round: boolean;
  /** The item's artists ("" if none) — the drill header of an album. */
  artists: string;
}

/** Kinds a row tap opens instead of playing. */
export function isDrillable(mediaType: string): boolean {
  return mediaType === "playlist" || mediaType === "album" || mediaType === "artist";
}

export interface QueueRowView {
  id: string;
  name: string;
  meta: string;
  image: string | null;
  current: boolean;
  played: boolean;
}

export interface QueueView {
  rows: QueueRowView[];
  /** Queued tracks not listed (the action returned only a window). */
  more: number;
  /** Tracks after the current one. */
  upNext: number;
}

// --- helpers -----------------------------------------------------------------------

function features(stateObj: HassEntity | undefined): number {
  return typeof stateObj?.attributes.supported_features === "number"
    ? stateObj.attributes.supported_features
    : 0;
}

function isAvailable(stateObj: HassEntity | undefined): boolean {
  return (
    !!stateObj &&
    stateObj.state !== "unavailable" &&
    stateObj.state !== "unknown"
  );
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** The card's speakers, in config order, with their display names. */
export function playerRefs(
  hass: HomeAssistant,
  config: MusicCardConfig
): PlayerRef[] {
  return config.players.map((player) => {
    const entity = typeof player === "string" ? player : player.entity;
    const name =
      (typeof player === "string" ? undefined : player.name) ??
      hass.states[entity]?.attributes.friendly_name ??
      entity;
    return { entity, name };
  });
}

/** Configured speakers grouped with `entity` (itself first), from its
 * group_members attribute. A lone speaker yields just itself. */
export function groupOf(
  hass: HomeAssistant,
  entity: string,
  configured: string[]
): string[] {
  const members = hass.states[entity]?.attributes.group_members;
  if (!Array.isArray(members) || !members.includes(entity)) return [entity];
  const inGroup = members.filter(
    (member): member is string =>
      typeof member === "string" && configured.includes(member)
  );
  return [entity, ...inGroup.filter((member) => member !== entity)];
}

/** The player that owns a group's playback: the first entry of
 * group_members, when HA reports one. */
function leaderOf(hass: HomeAssistant, entity: string): string {
  const members = hass.states[entity]?.attributes.group_members;
  const first = Array.isArray(members) ? members[0] : undefined;
  return typeof first === "string" && first !== entity && hass.states[first]
    ? first
    : entity;
}

function statusOf(stateObj: HassEntity | undefined): string {
  if (!isAvailable(stateObj)) return "Unavailable";
  switch (stateObj!.state) {
    case "playing":
      return "Playing";
    case "paused":
      return "Paused";
    case "off":
      return "Off";
    default:
      return "Idle";
  }
}

function repeatOf(stateObj: HassEntity | undefined): RepeatMode {
  const repeat = stateObj?.attributes.repeat;
  return repeat === "all" || repeat === "one" ? repeat : "off";
}

function roomsName(count: number): string {
  return count === 2 ? "both rooms" : "all rooms";
}

function buildNowPlaying(entity: string, stateObj: HassEntity | undefined, nowMs: number): NowPlayingView {
  const supported = features(stateObj);
  const available = isAvailable(stateObj);
  const playing = stateObj?.state === "playing";
  const title = available ? str(stateObj!.attributes.media_title) : "";
  const duration = available ? (stateObj!.attributes.media_duration ?? 0) : 0;
  const artist = [
    str(stateObj?.attributes.media_artist),
    str(stateObj?.attributes.media_album_name),
  ]
    .filter(Boolean)
    .join(" · ");
  // Prefer HA's own proxy of the cover (entity_picture_local, a same-origin
  // /api/media_player_proxy/… path): Music Assistant's entity_picture is an
  // http:// image proxy URL the browser blocks on an https dashboard.
  const picture =
    str(stateObj?.attributes.entity_picture_local) ||
    str(stateObj?.attributes.entity_picture);
  return {
    entity,
    available,
    hasTrack: title !== "",
    playing,
    title,
    artist,
    picture: available && picture ? picture : null,
    position:
      stateObj && duration > 0 ? livePosition(stateObj, playing, nowMs) : 0,
    duration,
    durText: formatTime(duration),
    supportsSeek: (supported & FEATURE_SEEK) !== 0,
    supportsPlayPause: (supported & (FEATURE_PAUSE | FEATURE_PLAY)) !== 0,
    supportsPrevNext:
      (supported & (FEATURE_PREVIOUS_TRACK | FEATURE_NEXT_TRACK)) !== 0,
    supportsRepeat: (supported & FEATURE_REPEAT_SET) !== 0,
    repeat: repeatOf(stateObj),
  };
}

export function buildMusicView(
  hass: HomeAssistant,
  config: MusicCardConfig,
  selectedIndex: number,
  nowMs: number
): MusicView {
  const players = playerRefs(hass, config);
  const configured = players.map((player) => player.entity);
  const selected = players[Math.min(selectedIndex, players.length - 1)];
  const groupMembers = groupOf(hass, selected.entity, configured);
  const grouped = groupMembers.length > 1;
  const leader = grouped ? leaderOf(hass, selected.entity) : selected.entity;

  const speakers: SpeakerChipView[] = players.map((player) => {
    const stateObj = hass.states[player.entity];
    const status = statusOf(stateObj);
    const inGroup = groupOf(hass, player.entity, configured).length > 1;
    return {
      ...player,
      status: inGroup && isAvailable(stateObj) ? `Grouped · ${status}` : status,
      active: groupMembers.includes(player.entity),
      playing: stateObj?.state === "playing",
    };
  });

  const volumes: VolumeRowView[] = groupMembers.map((entity) => {
    const stateObj = hass.states[entity];
    const level = stateObj?.attributes.volume_level;
    const supported = features(stateObj);
    return {
      entity,
      name: players.find((player) => player.entity === entity)!.name,
      pct: typeof level === "number" ? Math.round(level * 100) : null,
      muted: stateObj?.attributes.is_volume_muted === true,
      supportsSet: (supported & FEATURE_VOLUME_SET) !== 0,
      supportsMute: (supported & FEATURE_VOLUME_MUTE) !== 0,
      available: isAvailable(stateObj),
    };
  });

  const now = buildNowPlaying(leader, hass.states[leader], nowMs);
  const playingNames = speakers
    .filter((speaker) => speaker.playing)
    .map((speaker) => speaker.name);
  const summaryText = grouped
    ? now.playing
      ? `Playing · ${roomsName(groupMembers.length)}`
      : "Grouped"
    : playingNames.length
      ? `Playing · ${playingNames.join(", ")}`
      : "Idle";

  const groupable = players.filter(
    (player) => (features(hass.states[player.entity]) & FEATURE_GROUPING) !== 0
  );

  return {
    speakers,
    selected,
    grouped,
    canGroup:
      groupable.length > 1 &&
      groupable.some((player) => player.entity === selected.entity),
    groupMembers,
    now,
    volumes,
    summaryText,
    targetName: grouped ? roomsName(groupMembers.length) : selected.name,
  };
}

// --- library / search / queue rows ---------------------------------------------

function artistsOf(item: MaMediaItem | null | undefined): string {
  return (item?.artists ?? []).map((artist) => artist.name).join(", ");
}

const SEARCH_KIND_LABELS: Record<string, string> = {
  track: "Song",
  album: "Album",
  playlist: "Playlist",
  artist: "Artist",
};

/** A library or search result row. `withKind` prefixes the media type —
 * search mixes every type in one list, a library tab lists only one. */
export function libraryRow(item: MaMediaItem, withKind = false): LibraryRowView {
  const artists = artistsOf(item);
  const base =
    item.media_type === "playlist"
      ? "Playlist"
      : item.media_type === "artist"
        ? "Artist"
        : artists;
  const kind = SEARCH_KIND_LABELS[item.media_type] ?? item.media_type;
  const meta =
    withKind && item.media_type !== "playlist" && item.media_type !== "artist"
      ? [kind, artists].filter(Boolean).join(" · ")
      : base;
  return {
    uri: item.uri,
    mediaType: item.media_type,
    name: item.name,
    meta,
    image: item.image ?? null,
    round: item.media_type === "artist",
    artists,
  };
}

/** Search results as one list: songs first (the likeliest intent), then
 * playlists, albums and artists. Radio/podcasts/audiobooks are left out. */
export function searchRows(response: Record<string, unknown>): LibraryRowView[] {
  const order = ["tracks", "playlists", "albums", "artists"];
  return order.flatMap((key) => {
    const items = response[key];
    return Array.isArray(items)
      ? (items as MaMediaItem[]).map((item) => libraryRow(item, true))
      : [];
  });
}

/** "Artist - Name" → ["Artist", "Name"]; a title without the separator is
 * all name. Only the first " - " splits: song titles keep theirs
 * ("Doomed - Live"), artist names rarely have one. */
function splitTitle(title: string): [string, string] {
  const at = title.indexOf(" - ");
  return at > 0 ? [title.slice(0, at), title.slice(at + 3)] : ["", title];
}

/** The children of a browsed playlist/album (songs) or artist (albums). */
export function drillRows(node: MaBrowseNode): LibraryRowView[] {
  return (node.children ?? []).map((child) => {
    const mediaType = child.media_content_type || child.media_class || "track";
    const [artists, name] = splitTitle(child.title);
    return {
      uri: child.media_content_id,
      mediaType,
      name,
      meta: mediaType === "album" ? "Album" : artists,
      image: child.thumbnail ?? null,
      round: false,
      artists,
    };
  });
}

/** The drill header's second line: "Playlist · 12 songs",
 * "Album · Architects · 11 songs", "Artist · 3 albums". */
export function drillMeta(parent: LibraryRowView, rows: LibraryRowView[] | null): string {
  const kind = SEARCH_KIND_LABELS[parent.mediaType] ?? parent.mediaType;
  const parts = [kind];
  if (parent.mediaType === "album" && parent.artists) parts.push(parent.artists);
  if (rows) {
    const noun = parent.mediaType === "artist" ? "album" : "song";
    parts.push(`${rows.length} ${noun}${rows.length === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}

function queueRow(
  item: MaQueueItem,
  current: boolean,
  played: boolean,
  playing: boolean
): QueueRowView {
  const media = item.media_item ?? null;
  const artists = artistsOf(media);
  const status = current ? (playing ? "Now playing" : "Paused") : "";
  return {
    id: item.queue_item_id,
    name: media?.name ?? item.name,
    meta: [artists, status].filter(Boolean).join(" · "),
    image: media?.image ?? null,
    current,
    played,
  };
}

/** The queue as rows. With queue_items (newer HA) the full window is
 * listed; otherwise only the current and next item are known, and the rest
 * becomes a "+N more" count. */
export function buildQueueView(
  queue: MaQueueDetails,
  playing: boolean
): QueueView {
  const index = queue.current_index ?? 0;
  const upNext = Math.max(0, queue.items - index - 1);
  if (queue.queue_items) {
    const rows = queue.queue_items.map((item, i) =>
      queueRow(item, i === queue.current_index, i < index, playing)
    );
    return { rows, more: Math.max(0, queue.items - rows.length), upNext };
  }
  const rows: QueueRowView[] = [];
  if (queue.current_item) {
    rows.push(queueRow(queue.current_item, true, false, playing));
  }
  if (queue.next_item) {
    rows.push(queueRow(queue.next_item, false, false, playing));
  }
  const shown = rows.length;
  return {
    rows,
    more: Math.max(0, queue.items - index - shown),
    upNext,
  };
}

export const REPEAT_NEXT: Record<RepeatMode, RepeatMode> = {
  off: "all",
  all: "one",
  one: "off",
};
