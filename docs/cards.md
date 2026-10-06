# Using the cards

Each card has its own documentation page with a full YAML example, every config option, and behavior notes:

| Card                                                       | What it is                                                                               |
|------------------------------------------------------------|------------------------------------------------------------------------------------------|
| [`ru-shutters-card`](ru-shutters-card/ru-shutters-card.md) | Room-grouped shutter control: global chips, position presets, drag-to-position drilldown |
| [`ru-lights-card`](ru-lights-card/ru-lights-card.md)       | Room-grouped light control: dimming sliders, scenes panel, per-bulb drilldown            |
| [`ru-purifier-card`](ru-purifier-card/ru-purifier-card.md) | Air purifier control with speed ticks, mode chips and a PM2.5/PM10 air quality panel     |
| [`ru-tv-card`](ru-tv-card/ru-tv-card.md)                   | Android TV media + remote: now-playing, volume, app launcher, ring d-pad, keyboard       |
| [`ru-washer-card`](ru-washer-card/ru-washer-card.md)       | Miele washing machine: programme, live countdown, Start/Pause/Stop, programme presets    |
| [`ru-doors-card`](ru-doors-card/ru-doors-card.md)          | Door contact sensors colored by state and presence: green, yellow (home), red (away)     |
| [`ru-last-seen-card`](ru-last-seen-card/ru-last-seen-card.md) | Device health by last-seen age: green recently, yellow after hours, red after a day   |

Common to all cards:

- Configuration is YAML-only for now — cards appear in the card picker with a starter config, but have no visual editor.
- Every card follows Home Assistant's light/dark mode automatically, and every color is exposed as a `--ru-<card>-*` CSS
  custom property overridable by a theme or card-mod.
- Cards adapt to the width they are given (container queries), not to the browser window.
