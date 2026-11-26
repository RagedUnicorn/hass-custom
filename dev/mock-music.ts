/**
 * Music Assistant simulation for the harness: speakers as MA media players
 * plus the music_assistant.* actions ru-music-card reads (get_library,
 * search, get_queue — answered with response data shaped like HA's) and
 * play_media (with start_item), plus the media_player/browse_media
 * websocket command the card lists an opened playlist/album/artist with.
 * Plugs into MockHass via attachMusic(); MockHass routes these service calls
 * and the config_entries/get + browse_media websocket commands here.
 *
 * Playback model: every speaker owns a queue of track uris and an index; a
 * grouped member mirrors its leader (group_members[0]) and forwards
 * transport commands to it, the way Music Assistant syncs a Sonos group.
 */

import type { MaMediaItem } from "../src/cards/ru-music-card/music-state";
import type { HassEntity } from "../src/types";

/** The feature mask HA reports for a Sonos speaker under Music Assistant —
 * PAUSE|SEEK|VOLUME_SET|MUTE|PREV|NEXT|…|REPEAT_SET|GROUPING|…. */
export const MA_SPEAKER_FEATURES = 8322623;

export interface MockMaTrack {
  uri: string;
  name: string;
  artist: string;
  album: string;
  /** Seconds. */
  duration: number;
}

export interface MockMaPlayerSpec {
  entity: string;
  name: string;
  /** 0…1. Default 0.4. */
  volume?: number;
  /** Initial queue (track uris) — the first one starts playing. */
  queue?: string[];
  /** Initial position in seconds of the first track. */
  position?: number;
}

export interface MockMusicSpec {
  entryId: string;
  players: MockMaPlayerSpec[];
  tracks: MockMaTrack[];
  /** Library playlists, each with the track uris it plays. */
  playlists: Array<{ uri: string; name: string; tracks: string[] }>;
  albums: Array<{ uri: string; name: string; artist: string }>;
  artists: Array<{ uri: string; name: string }>;
  /** Liked songs (library tracks), newest first. */
  liked: string[];
  /** get_queue accepts `limit` and lists the queue's items (newer HA).
   * Default false — the action then rejects `limit` like HA 2026.11. */
  queueItems?: boolean;
}

interface PlayerState {
  spec: MockMaPlayerSpec;
  available: boolean;
  state: "idle" | "playing" | "paused";
  queue: string[];
  index: number;
  position: number;
  stamp: string;
  volume: number;
  muted: boolean;
  repeat: "off" | "all" | "one";
  /** [leader, ...members] while grouped, else empty. */
  group: string[];
}

export class MockMusicAssistant {
  private players = new Map<string, PlayerState>();

  private queueItems: boolean;

  private onChange: () => void = () => {};

  constructor(private spec: MockMusicSpec) {
    this.queueItems = spec.queueItems ?? false;
    this.reset();
    setInterval(() => this.tick(), 250);
  }

  /** Wired by MockHass.attachMusic — publishes a fresh snapshot. */
  bind(onChange: () => void): void {
    this.onChange = onChange;
  }

  reset(): void {
    this.reads?.splice(0);
    this.players.clear();
    this.queueItems = this.spec.queueItems ?? false;
    for (const spec of this.spec.players) {
      const queue = spec.queue ?? [];
      this.players.set(spec.entity, {
        spec,
        available: true,
        state: queue.length ? "playing" : "idle",
        queue: [...queue],
        index: 0,
        position: spec.position ?? 0,
        stamp: new Date().toISOString(),
        volume: spec.volume ?? 0.4,
        muted: false,
        repeat: "off",
        group: [],
      });
    }
  }

  /** Test hook: switch the get_queue `limit` support on/off. */
  setQueueItems(supported: boolean): void {
    this.queueItems = supported;
  }

  /** Test hook: patch a speaker directly. */
  setPlayer(
    entity: string,
    patch: { state?: "idle" | "playing" | "paused"; available?: boolean }
  ): void {
    const player = this.players.get(entity);
    if (!player) return;
    if (patch.state !== undefined) {
      this.freeze(player);
      player.state = patch.state;
    }
    if (patch.available !== undefined) player.available = patch.available;
    this.onChange();
  }

  owns(entity: string): boolean {
    return this.players.has(entity);
  }

  /** The read-only actions (and browse_media, as service "browse_media"),
   * logged in `reads` instead of the call log. */
  readonly reads: Array<{ service: string; data?: Record<string, unknown> }> = [];

  isRead(domain: string, service: string): boolean {
    return (
      domain === "music_assistant" &&
      (service === "get_library" || service === "search" || service === "get_queue")
    );
  }

  read(service: string, data: Record<string, unknown> = {}): Promise<unknown> {
    this.reads.push({ service, data });
    return this.action(service, data);
  }

  // --- entities ------------------------------------------------------------------

  entities(): Record<string, HassEntity> {
    const states: Record<string, HassEntity> = {};
    for (const player of this.players.values()) {
      states[player.spec.entity] = this.buildEntity(player);
    }
    return states;
  }

  private buildEntity(player: PlayerState): HassEntity {
    const entity = player.spec.entity;
    if (!player.available) {
      return {
        entity_id: entity,
        state: "unavailable",
        attributes: { friendly_name: player.spec.name },
      };
    }
    const source = this.leader(player);
    const track = this.trackAt(source);
    return {
      entity_id: entity,
      state: source.state,
      attributes: {
        friendly_name: player.spec.name,
        supported_features: MA_SPEAKER_FEATURES,
        mass_player_type: "player",
        device_class: "speaker",
        volume_level: player.volume,
        is_volume_muted: player.muted,
        repeat: source.repeat,
        shuffle: false,
        group_members: [...player.group],
        ...(track
          ? {
              media_content_id: track.uri,
              media_title: track.name,
              media_artist: track.artist,
              media_album_name: track.album,
              // MA: an http image proxy URL, plus HA's same-origin proxy.
              entity_picture: `http://ma.invalid:8095/imageproxy/${track.uri}`,
              entity_picture_local: `/api/media_player_proxy/${entity}?token=mock`,
              media_duration: track.duration,
              media_position: source.position,
              media_position_updated_at: source.stamp,
            }
          : {}),
      },
    };
  }

  // --- service calls ---------------------------------------------------------------

  /** media_player.* on an MA speaker, or any music_assistant.* action. */
  call(
    domain: string,
    service: string,
    data: Record<string, unknown> = {}
  ): Promise<unknown> {
    if (domain === "music_assistant") return this.action(service, data);
    const player = this.players.get(String(data.entity_id));
    if (!player || !player.available) return Promise.resolve();
    this.mediaService(player, service, data);
    this.onChange();
    return Promise.resolve();
  }

  callWS(message: Record<string, unknown>): Promise<unknown> {
    if (
      message.type === "config_entries/get" &&
      message.domain === "music_assistant"
    ) {
      return Promise.resolve([
        {
          entry_id: this.spec.entryId,
          domain: "music_assistant",
          title: "Music Assistant",
          state: "loaded",
        },
      ]);
    }
    if (message.type === "media_player/browse_media") {
      this.reads.push({ service: "browse_media", data: { ...message } });
      return this.browse(message);
    }
    return Promise.reject(new Error(`Unknown command ${String(message.type)}`));
  }

  /** HA's browse answer for an MA player: a playlist/album lists its
   * tracks, an artist its albums; child titles read "Artist - Name". */
  private browse(message: Record<string, unknown>): Promise<unknown> {
    const player = this.players.get(String(message.entity_id));
    if (!player || !player.available) {
      return Promise.reject(new Error("Entity not found"));
    }
    const uri = String(message.media_content_id);
    const trackNode = (track: MockMaTrack) => ({
      title: `${track.artist} - ${track.name}`,
      media_class: "track",
      media_content_type: "track",
      media_content_id: track.uri,
      can_play: true,
      can_expand: false,
      thumbnail: null,
    });
    const node = (
      title: string,
      mediaClass: string,
      children: unknown[]
    ) => ({
      title,
      media_class: mediaClass,
      media_content_type: mediaClass,
      media_content_id: uri,
      can_play: true,
      can_expand: true,
      thumbnail: null,
      children,
    });
    const tracksOf = (uris: string[]) =>
      uris
        .map((u) => this.track(u))
        .filter((t): t is MockMaTrack => !!t)
        .map(trackNode);
    const playlist = this.spec.playlists.find((p) => p.uri === uri);
    if (playlist) {
      return Promise.resolve(node(playlist.name, "playlist", tracksOf(playlist.tracks)));
    }
    const album = this.spec.albums.find((a) => a.uri === uri);
    if (album) {
      return Promise.resolve(
        node(`${album.artist} - ${album.name}`, "album", tracksOf(this.resolve(uri)))
      );
    }
    const artist = this.spec.artists.find((a) => a.uri === uri);
    if (artist) {
      const albums = this.spec.albums
        .filter((a) => a.artist === artist.name)
        .map((a) => ({
          title: `${a.artist} - ${a.name}`,
          media_class: "album",
          media_content_type: "album",
          media_content_id: a.uri,
          can_play: true,
          can_expand: true,
          thumbnail: null,
        }));
      return Promise.resolve(node(artist.name, "artist", albums));
    }
    return Promise.reject(new Error("Media not found"));
  }

  private mediaService(
    player: PlayerState,
    service: string,
    data: Record<string, unknown>
  ): void {
    // Volume and grouping are per speaker; transport goes to the leader.
    switch (service) {
      case "volume_set":
        player.volume = Number(data.volume_level ?? player.volume);
        return;
      case "volume_mute":
        player.muted = data.is_volume_muted === true;
        return;
      case "join":
        this.join(player, (data.group_members as string[]) ?? []);
        return;
      case "unjoin":
        this.unjoin(player);
        return;
    }
    const leader = this.leader(player);
    switch (service) {
      case "media_play_pause":
        this.freeze(leader);
        if (leader.queue.length) {
          leader.state = leader.state === "playing" ? "paused" : "playing";
        }
        break;
      case "media_next_track":
        this.advance(leader, false);
        break;
      case "media_previous_track":
        this.freeze(leader);
        if (leader.position <= 3) leader.index = Math.max(0, leader.index - 1);
        leader.position = 0;
        leader.stamp = new Date().toISOString();
        break;
      case "media_seek":
        leader.position = Number(data.seek_position ?? leader.position);
        leader.stamp = new Date().toISOString();
        break;
      case "repeat_set":
        if (data.repeat === "off" || data.repeat === "all" || data.repeat === "one") {
          leader.repeat = data.repeat;
        }
        break;
    }
  }

  private action(
    service: string,
    data: Record<string, unknown>
  ): Promise<unknown> {
    const answer = (response: unknown) =>
      Promise.resolve({ context: { id: "mock" }, response });
    const fail = (message: string) => Promise.reject(new Error(message));

    if (service === "get_library" || service === "search") {
      if (data.config_entry_id !== this.spec.entryId) {
        return fail("Config entry not found");
      }
    }
    switch (service) {
      case "get_library": {
        const kind = String(data.media_type);
        const limit = Number(data.limit ?? 25);
        const items = this.libraryItems(kind).slice(0, limit);
        return answer({
          items,
          limit,
          offset: 0,
          order_by: String(data.order_by ?? "name"),
          media_type: kind,
        });
      }
      case "search": {
        const query = String(data.name ?? "").toLowerCase();
        const limit = Number(data.limit ?? 5);
        const match = (items: MaMediaItem[]) =>
          items
            .filter((item) =>
              [item.name, ...(item.artists ?? []).map((a) => a.name)]
                .join(" ")
                .toLowerCase()
                .includes(query)
            )
            .slice(0, limit);
        return answer({
          artists: match(this.libraryItems("artist")),
          albums: match(this.libraryItems("album")),
          tracks: match(this.spec.tracks.map((t) => this.trackItem(t))),
          playlists: match(this.libraryItems("playlist")),
          radio: [],
          audiobooks: [],
          podcasts: [],
        });
      }
      case "get_queue": {
        if ("limit" in data && !this.queueItems) {
          return fail("extra keys not allowed @ data['limit']");
        }
        const player = this.players.get(String(data.entity_id));
        if (!player || !player.available) return fail("Entity not found");
        const leader = this.leader(player);
        if (!leader.queue.length) return fail("No active queue found");
        const item = (index: number) => {
          const track = this.track(leader.queue[index]);
          return track
            ? {
                queue_item_id: `q${index}`,
                name: `${track.artist} - ${track.name}`,
                duration: track.duration,
                media_item: this.trackItem(track),
              }
            : null;
        };
        return answer({
          queue_id: leader.spec.entity,
          active: true,
          name: `${leader.spec.name} queue`,
          items: leader.queue.length,
          shuffle_enabled: false,
          repeat_mode: leader.repeat,
          current_index: leader.index,
          elapsed_time: Math.round(this.livePosition(leader)),
          current_item: item(leader.index),
          next_item:
            leader.index + 1 < leader.queue.length
              ? item(leader.index + 1)
              : null,
          ...("limit" in data
            ? {
                queue_items: leader.queue
                  .slice(0, Number(data.limit))
                  .map((_, i) => item(i)),
              }
            : {}),
        });
      }
      case "play_media": {
        const player = this.players.get(String(data.entity_id));
        if (!player || !player.available) return fail("Entity not found");
        const leader = this.leader(player);
        const tracks = this.resolve(String(data.media_id));
        if (!tracks.length) return fail("Media not found");
        this.freeze(leader);
        const enqueue = String(data.enqueue ?? "play");
        if (enqueue === "add" && leader.queue.length) {
          leader.queue.push(...tracks);
        } else if (enqueue === "next" && leader.queue.length) {
          leader.queue.splice(leader.index + 1, 0, ...tracks);
        } else {
          // start_item: play the list from that track on (MA keeps the
          // whole list queued, so the earlier tracks count as played).
          const start = tracks.indexOf(String(data.start_item ?? ""));
          leader.queue = [...tracks];
          leader.index = Math.max(0, start);
          leader.position = 0;
          leader.state = "playing";
          leader.stamp = new Date().toISOString();
        }
        this.onChange();
        return Promise.resolve();
      }
    }
    return Promise.resolve();
  }

  // --- library -----------------------------------------------------------------------

  private track(uri: string | undefined): MockMaTrack | undefined {
    return this.spec.tracks.find((track) => track.uri === uri);
  }

  private trackItem(track: MockMaTrack): MaMediaItem {
    return {
      media_type: "track",
      uri: track.uri,
      name: track.name,
      image: null,
      artists: [
        { media_type: "artist", uri: `artist:${track.artist}`, name: track.artist },
      ],
      album: { media_type: "album", uri: `album:${track.album}`, name: track.album },
    };
  }

  private libraryItems(kind: string): MaMediaItem[] {
    switch (kind) {
      case "playlist":
        return this.spec.playlists.map((p) => ({
          media_type: "playlist",
          uri: p.uri,
          name: p.name,
          image: null,
        }));
      case "track":
        return this.spec.liked
          .map((uri) => this.track(uri))
          .filter((t): t is MockMaTrack => !!t)
          .map((t) => this.trackItem(t));
      case "album":
        return this.spec.albums.map((a) => ({
          media_type: "album",
          uri: a.uri,
          name: a.name,
          image: null,
          artists: [{ media_type: "artist", uri: `artist:${a.artist}`, name: a.artist }],
        }));
      case "artist":
        return this.spec.artists.map((a) => ({
          media_type: "artist",
          uri: a.uri,
          name: a.name,
          image: null,
        }));
    }
    return [];
  }

  /** The track uris a media uri plays. */
  private resolve(uri: string): string[] {
    if (this.track(uri)) return [uri];
    const playlist = this.spec.playlists.find((p) => p.uri === uri);
    if (playlist) return [...playlist.tracks];
    const album = this.spec.albums.find((a) => a.uri === uri);
    if (album) {
      return this.spec.tracks.filter((t) => t.album === album.name).map((t) => t.uri);
    }
    const artist = this.spec.artists.find((a) => a.uri === uri);
    if (artist) {
      return this.spec.tracks.filter((t) => t.artist === artist.name).map((t) => t.uri);
    }
    return [];
  }

  // --- playback ----------------------------------------------------------------------

  private leader(player: PlayerState): PlayerState {
    const first = player.group[0];
    return (first && this.players.get(first)) || player;
  }

  private trackAt(player: PlayerState): MockMaTrack | undefined {
    return this.track(player.queue[player.index]);
  }

  private livePosition(player: PlayerState): number {
    const elapsed =
      player.state === "playing" ? (Date.now() - Date.parse(player.stamp)) / 1000 : 0;
    return player.position + elapsed;
  }

  /** Folds the elapsed play time into position and restamps. */
  private freeze(player: PlayerState): void {
    player.position = this.livePosition(player);
    player.stamp = new Date().toISOString();
  }

  private advance(player: PlayerState, auto: boolean): void {
    player.position = 0;
    player.stamp = new Date().toISOString();
    if (auto && player.repeat === "one") return;
    if (player.index + 1 < player.queue.length) {
      player.index += 1;
      player.state = "playing";
    } else if (player.repeat === "all" && player.queue.length) {
      player.index = 0;
      player.state = "playing";
    } else {
      player.state = "idle";
      player.queue = [];
      player.index = 0;
    }
  }

  private tick(): void {
    let changed = false;
    for (const player of this.players.values()) {
      const track = this.trackAt(player);
      if (player.state === "playing" && track && this.livePosition(player) >= track.duration) {
        this.advance(player, true);
        changed = true;
      }
    }
    if (changed) this.onChange();
  }

  private join(leader: PlayerState, members: string[]): void {
    const joined = members.filter(
      (entity) => entity !== leader.spec.entity && this.players.get(entity)?.available
    );
    if (!joined.length) return;
    const group = [leader.spec.entity, ...joined];
    for (const entity of group) this.players.get(entity)!.group = group;
  }

  private unjoin(player: PlayerState): void {
    const group = player.group;
    if (!group.length) return;
    const rest = group.filter((entity) => entity !== player.spec.entity);
    player.group = [];
    // The leaving speaker keeps its own (empty) queue; a leader that leaves
    // hands nothing over — the mock only ever unjoins members.
    for (const entity of rest) {
      this.players.get(entity)!.group = rest.length > 1 ? rest : [];
    }
  }
}
