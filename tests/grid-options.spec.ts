/**
 * Every ru-* card asks a sections view for the full width of its section.
 * Without getGridOptions HA gives a custom card 12 grid columns, which in a
 * section spanning several view columns (12 × span grid) leaves it a narrow
 * strip — so the cards' own wide layouts never trip.
 */

import { test, expect } from "@playwright/test";

const CARDS = [
  "ru-shutters-card",
  "ru-lights-card",
  "ru-purifier-card",
  "ru-tv-card",
  "ru-washer-card",
  "ru-doors-card",
  "ru-last-seen-card",
  "ru-nav-card",
];

test("every card fills its section by default", async ({ page }) => {
  await page.goto("/dev/harness.html");
  for (const tag of CARDS) {
    const options = await page
      .locator(tag)
      .first()
      .evaluate(
        (el) =>
          (el as HTMLElement & { getGridOptions(): unknown }).getGridOptions()
      );
    expect(options, tag).toEqual({ columns: "full" });
  }
});
