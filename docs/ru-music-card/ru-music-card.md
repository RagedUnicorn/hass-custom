# `ru-music-card`

A Music Assistant player card: one card for several speakers, with a speaker
switcher and a group toggle, now playing (cover, title, artist, drag-to-seek
progress bar, previous / play-pause / next and repeat), an absolute volume
slider with mute — one per room while speakers are grouped — and the music
library: Playlists, Liked songs, Albums and Artists tabs, a search field and
a Queue tab.

Tap a playlist, album or artist to open it: **▶ Play** in its header plays
all of it, a song plays the playlist or album from that song on, and an
artist lists its albums. A song (Liked or a search result) plays on tap,
replacing what is queued on the selected speaker. **+** on any row plays it
next, right after the current song; hold **+** (or Shift-click it) to add it
to the end of the queue instead. While speakers are grouped, everything
plays on the whole group.

Playback, volume and grouping go through the speakers' `media_player`
entities; the library, search and queue are read with the
`music_assistant.get_library`, `music_assistant.search` and
`music_assistant.get_queue` actions, an opened item's contents with Home
Assistant's media browser (`media_player/browse_media`), and rows play
through `music_assistant.play_media`. It needs the
[Music Assistant integration](https://www.home-assistant.io/integrations/music_assistant/)
with a music provider (e.g. Spotify) and the speakers added as players.

The design mocks this card implements sit beside this page —
[narrow](ru-music-card.html) and [wide](ru-music-card-wide.html) (render them
with `npm run dev` at
`http://localhost:5173/docs/ru-music-card/ru-music-card.html` — GitHub shows
only their source).

```yaml
type: custom:ru-music-card
title: Music                                  # optional, default "Music"
players:                                      # Music Assistant media players
  - entity: media_player.sonos_beam_livingroom_ma
    name: Living Room                         # optional, defaults to friendly_name
  - entity: media_player.sonos_roam_workshop_ma
    name: Workshop
# config_entry_id: 01J...                     # optional, see below
# library_limit: 100                          # optional, items per library tab
# search_limit: 5                             # optional, results per type
```

A player can also be given as a bare entity id:
`players: [media_player.kitchen_ma]`.

## Options

| Option            | Required | Default | Description                                                                                                   |
|-------------------|----------|---------|---------------------------------------------------------------------------------------------------------------|
| `players`         | yes      | —       | Music Assistant `media_player.*` entities, each an entity id or `{ entity, name }`. The first is selected initially. |
| `title`           | no       | `Music` | Card header title.                                                                                            |
| `config_entry_id` | no       | found   | The Music Assistant config entry the library and search read from. Left out, the card looks it up (the loaded Music Assistant entry); set it if that lookup is not allowed for the user (non-admin) or there are several entries. |
| `library_limit`   | no       | `100`   | Items listed per library tab, 1–500.                                                                          |
| `search_limit`    | no       | `5`     | Search results per media type (songs, playlists, albums, artists), 1–50.                                      |

## Behavior notes

- **Speakers.** Each chip shows the speaker's state (Playing, Paused, Idle,
  Off, Unavailable). The selected speaker — or, while grouped, every speaker
  in its group — is highlighted; the dot lights while a speaker plays.
- **Grouping.** The group button (shown when at least two players support
  grouping) joins every other configured speaker to the selected one
  (`media_player.join`), or ungroups them again (`media_player.unjoin`).
  While grouped, now playing and transport follow the group leader, each room
  keeps its own volume row, and plays target the whole group.
- **Liked** lists the library's tracks, most recently liked first — with
  Spotify those are your Liked Songs.
- **Search** runs a moment after you stop typing and lists songs, playlists,
  albums and artists from all of Music Assistant's providers; clearing it
  returns to the tab.
- **Opening a playlist, album or artist.** The header's **‹** steps back one
  level (artist → album → songs). Picking a tab or typing a search closes the
  opened item; opening a search result ends the search and lands on that
  item's tab. A song tap calls `play_media` for the playlist or album with
  `start_item` set to the song, so the rest of the list keeps playing after
  it. Home Assistant's media browser returns only the first page of a
  playlist, so a very long playlist is listed (and countable) only up to
  that page — **▶ Play** still plays all of it.
- **Queue** is read-only. On Home Assistant 2026.12 and later, whose
  `get_queue` lists the queue's items, it lists the selected speaker's
  queue from the current track on, 50 tracks at a time — **Show more**
  loads the next 50 (up to 500). Older releases only report the current
  and the next track, so the tab shows those two and how many more follow;
  the card detects which by itself. Home Assistant has no action to jump to
  or remove a queue item, so unlike the mock the rows have no tap or **×**
  action.
- **Repeat** cycles off → all → one (`media_player.repeat_set`); there is no
  shuffle control.
- **Artwork.** The now-playing cover loads through Home Assistant's own
  media player proxy (`entity_picture_local`), so it also shows on an
  `https://` dashboard. Library and queue thumbnails come straight from
  Music Assistant's `http://` image proxy, which the browser blocks on an
  `https://` dashboard; any image that fails to load falls back to the
  striped placeholder.
- **Wide layout.** From 640px of card width the library sits beside the
  player instead of below it, with a larger cover.
- In a sections view the card spans the full section width.
