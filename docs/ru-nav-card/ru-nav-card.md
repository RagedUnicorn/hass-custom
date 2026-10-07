# `ru-nav-card`

A floating dock of dashboard views — a pill of icons that switches between the
views of a dashboard. Made for kiosk-mode dashboards, where Home Assistant's
own view tabs are hidden and the dashboard has to bring its own navigation.

Narrow, it shows icons only and the active view keeps its label; once the card
is about 600px wide every view shows its label too. The highlighted entry is
the route whose path matches the page you're on, so the same config can sit on
every view.

Put it in a sections view's **footer** (Home Assistant 2026.3 or later), which
keeps it at the bottom of the screen while you scroll:

```yaml
views:
  - title: Main
    path: main
    type: sections
    sections: []
    footer:
      max_width: 640 # room for every label on wide screens
      card:
        type: custom:ru-nav-card
        routes:
          - path: /home-dashboard/main
            name: Main
            icon: mdi:home-variant-outline
          - path: /home-dashboard/lights
            name: Lights
            icon: mdi:lightbulb-group-outline
          - path: /config/dashboard
            name: Settings
            icon: mdi:cog-outline
            admin_only: true
```

## Options

| Option   | Type | Default      | Description                    |
|----------|------|--------------|--------------------------------|
| `routes` | list | **required** | One entry per view, see below  |

Each route:

| Option       | Type    | Default      | Description                                                |
|--------------|---------|--------------|------------------------------------------------------------|
| `path`       | string  | **required** | Path to open, starting with `/` — e.g. `/home-dashboard/lights` |
| `name`       | string  | **required** | Label                                                      |
| `icon`       | string  | **required** | Icon, e.g. `mdi:lightbulb-group-outline`                   |
| `admin_only` | boolean | `false`      | Only shown to admin users                                  |

## Behavior

- A route is active on its own path and on anything below it, so a subview
  such as `/home-dashboard/media/remote` keeps `Media` highlighted.
- Tapping the view you're already on does nothing.
- `admin_only` is meant for a way back into the settings on a kiosk-mode
  dashboard; other users never see the entry.
- The card draws no background of its own, only the pill, so it floats over
  the view. Repeat the footer on every view that should show the dock.
- The footer's `max_width` defaults to 600px, just at the label width — set
  it a little higher (e.g. `640`) to get the labels on wide screens.

## Theming

Every color is a CSS custom property, with a light and a dark default:

| Property                                          | Used for                     |
|---------------------------------------------------|------------------------------|
| `--ru-nav-bg`, `--ru-nav-shadow`                  | The pill                     |
| `--ru-nav-item`                                   | Icons and labels of inactive views |
| `--ru-nav-active-bg` / `--ru-nav-active-text`     | The active view              |
