# `ru-header-card`

The title of a dashboard view: the view's name, a live date and time line
(`Wed 7 Oct · 19:42`), and a presence pill per person — a green dot while home,
grey with the zone's name, `Away` or `Unknown` otherwise. Tapping a pill opens
the person's more-info dialog. The [design mock](ru-header-card.html) sits
beside this page.

Put it in a full-width section at the top of a sections view. The pills sit
at the right edge on wide screens and wrap under the title when there is no
room. (A view's own `header` slot works too, but Home Assistant caps header
cards at 700px, which leaves the pills mid-page on a wide screen.)

```yaml
views:
  - title: Main
    path: main
    type: sections
    max_columns: 4
    sections:
      - type: grid
        column_span: 4
        cards:
          - type: custom:ru-header-card
            title: Home
            people:
              - person.me
```

## Options

| Option      | Type    | Default      | Description                                                 |
|-------------|---------|--------------|-------------------------------------------------------------|
| `title`     | string  | **required** | The view title                                              |
| `people`    | list    | —            | Presence pills: `person.*` / `device_tracker.*` ids, or objects with `entity` and `name` |
| `show_date` | boolean | `true`       | The live date and time line under the title                 |

A person's name defaults to the first word of its friendly name
(`Michael Wiesendanger` → `Michael`).

## Behavior

- The date line follows the user's profile: the language, the date order
  (`DMY`, `MDY`, `YMD`, else the language's own) and the clock (12 or 24
  hours, else the language's own). It refreshes every 30 seconds.
- `home` is the only state that counts as home. `not_home` reads `Away`, a
  zone reads as its name, and `unknown` / `unavailable` read `Unknown`.

## Theming

Every color is a CSS custom property, with a light and a dark default:

| Property                                         | Used for                 |
|--------------------------------------------------|--------------------------|
| `--ru-header-home`, `--ru-header-away`           | Presence dots            |
| `--ru-header-bg`, `--ru-header-pill-bg`          | Card and pill background |
| `--ru-header-text`, `--ru-header-text-muted`     | Title, date and states   |
