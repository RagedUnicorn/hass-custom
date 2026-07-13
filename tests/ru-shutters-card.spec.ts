/**
 * ru-shutters-card tests, run against the mock-hass harness
 * (dev/harness.html). Service effects are asserted through the harness call
 * log (window.__harness.calls); nothing here touches a real Home Assistant.
 *
 * Harness fixture: Bedroom (1 cover), Dining room (1), Living room (medium at
 * 50% + small UNAVAILABLE), Office (two at 0% + small without SET_POSITION).
 */

import { test, expect, type Page } from "@playwright/test";

const CARD = "ru-shutters-card";

async function openHarness(page: Page): Promise<void> {
  await page.goto("/dev/harness.html");
  await expect(page.locator(CARD)).toBeVisible();
}

function calls(page: Page) {
  return page.evaluate(() => window.__harness.calls);
}

function room(page: Page, name: string) {
  return page.locator(`${CARD} .room`, {
    has: page.locator(".room-name", { hasText: name }),
  });
}

test.beforeEach(async ({ page }) => {
  await openHarness(page);
});

test("renders title, summary and all rooms", async ({ page }) => {
  await expect(page.locator(`${CARD} .title`)).toHaveText("Shutters");
  // 4 of 6 available covers count as open (100, 100, 50, and the
  // position-less office cover in state "open").
  await expect(page.locator(`${CARD} .summary`)).toHaveText("4 of 6 open");
  await expect(page.locator(`${CARD} .room`)).toHaveCount(4);
  await expect(room(page, "Bedroom").locator(".room-status")).toHaveText("Open");
  await expect(room(page, "Office").locator(".room-status")).toHaveText(
    "1 of 3 open"
  );
});

test("room buttons call the room's available covers only", async ({ page }) => {
  await room(page, "Office").locator(".room-buttons button").first().click();
  await expect
    .poll(() => calls(page))
    .toEqual([
      {
        domain: "cover",
        service: "open_cover",
        data: {
          entity_id: [
            "cover.office_big_left",
            "cover.office_big_right",
            "cover.office_small",
          ],
        },
      },
    ]);

  // Living room excludes its unavailable cover.
  await room(page, "Living room").locator(".room-buttons button").last().click();
  await expect
    .poll(() => calls(page))
    .toContainEqual({
      domain: "cover",
      service: "close_cover",
      data: { entity_id: ["cover.livingroom_medium"] },
    });
});

test("global chips target every available cover", async ({ page }) => {
  await page.locator(`${CARD} .chip`, { hasText: "All up" }).click();
  const [call] = await calls(page);
  expect(call.service).toBe("open_cover");
  expect(call.data?.entity_id).toEqual([
    "cover.bedroom_medium",
    "cover.diningroom_big",
    "cover.livingroom_medium",
    "cover.office_big_left",
    "cover.office_big_right",
    "cover.office_small",
  ]);
});

test("covers travel: status shows Moving… then settles", async ({ page }) => {
  await page.evaluate(() => window.__harness.setTravelMs(800));
  await page.locator(`${CARD} .chip`, { hasText: "All up" }).click();
  await expect(room(page, "Office").locator(".room-status")).toHaveText(
    "Moving…"
  );
  await expect(room(page, "Office").locator(".room-status")).toHaveText(
    "All open",
    { timeout: 3000 }
  );
  await expect(page.locator(`${CARD} .summary`)).toHaveText("All open");
});

test("stop freezes a moving cover", async ({ page }) => {
  await page.evaluate(() => window.__harness.setTravelMs(5000));
  await room(page, "Bedroom").locator(".room-buttons button").last().click(); // ▼
  await expect(room(page, "Bedroom").locator(".room-status")).toHaveText(
    "Moving…"
  );
  await room(page, "Bedroom").locator(".room-buttons button.stop").click();
  await expect(room(page, "Bedroom").locator(".room-status")).toHaveText(
    "Partly open"
  );
});

test.describe("drilldown", () => {
  test("opens on room tap and closes via ✕, scrim and Escape", async ({
    page,
  }) => {
    const sheet = page.locator(`${CARD} .sheet`);

    await room(page, "Office").locator(".room-row").click();
    await expect(sheet).toBeVisible();
    await expect(page.locator(`${CARD} .sheet-name`)).toHaveText("Office");
    await page.locator(`${CARD} .close`).click();
    await expect(sheet).toBeHidden();

    await room(page, "Office").locator(".room-row").click();
    await expect(sheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    await room(page, "Office").locator(".room-row").click();
    await expect(sheet).toBeVisible();
    await page.locator(`${CARD} .scrim`).click({ position: { x: 5, y: 5 } });
    await expect(sheet).toBeHidden();
  });

  test("bottom sheet on narrow viewports, centered dialog on wide", async ({
    page,
  }, testInfo) => {
    await room(page, "Office").locator(".room-row").click();
    const sheet = page.locator(`${CARD} .sheet`);
    await expect(sheet).toBeVisible();
    const box = (await sheet.boundingBox())!;
    const viewport = page.viewportSize()!;
    const gapBelow = viewport.height - (box.y + box.height);
    if (testInfo.project.name.startsWith("mobile")) {
      expect(gapBelow).toBeLessThan(2); // flush with the bottom
    } else {
      expect(gapBelow).toBeGreaterThan(20); // floating, not docked
      expect(box.y).toBeGreaterThan(20);
    }
  });

  test("dragging a shutter target sends one set_cover_position on release", async ({
    page,
  }) => {
    await room(page, "Office").locator(".room-row").click();
    const window_ = page.locator(`${CARD} .target .window`).first();
    const box = (await window_.boundingBox())!;

    // Drag from the middle to 25% from the bottom → position ≈ 25.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.75, {
      steps: 5,
    });
    await page.mouse.up();

    const log = await calls(page);
    const positionCalls = log.filter(
      (call) => call.service === "set_cover_position"
    );
    expect(positionCalls).toHaveLength(1);
    expect(positionCalls[0].data?.entity_id).toBe("cover.office_big_left");
    expect(Number(positionCalls[0].data?.position)).toBeGreaterThanOrEqual(20);
    expect(Number(positionCalls[0].data?.position)).toBeLessThanOrEqual(30);
  });

  test("cover without position support gets buttons but no drag target", async ({
    page,
  }) => {
    await room(page, "Office").locator(".room-row").click();
    const targets = page.locator(`${CARD} .target`);
    await expect(targets).toHaveCount(3);
    const positionless = targets.nth(2); // office_small
    await expect(positionless.locator(".window")).toHaveCount(0);
    await expect(positionless.locator(".target-buttons button")).toHaveCount(3);
  });

  test("unavailable cover renders grayed out with disabled buttons", async ({
    page,
  }) => {
    await room(page, "Living room").locator(".room-row").click();
    const unavailable = page.locator(`${CARD} .target.unavailable`);
    await expect(unavailable).toHaveCount(1);
    await expect(unavailable.locator(".target-status")).toHaveText(
      "Unavailable"
    );
    await expect(
      unavailable.locator(".target-buttons button").first()
    ).toBeDisabled();
  });
});

test.describe("presets", () => {
  test("preset targets position-supporting covers and highlights when reached", async ({
    page,
  }) => {
    await page.evaluate(() => window.__harness.setTravelMs(200));
    const night = page.locator(`${CARD} .preset`, { hasText: "Night" });
    await night.click();

    const [call] = await calls(page);
    expect(call.service).toBe("set_cover_position");
    // Excludes the unavailable cover AND the position-less office cover.
    expect(call.data?.entity_id).toEqual([
      "cover.bedroom_medium",
      "cover.diningroom_big",
      "cover.livingroom_medium",
      "cover.office_big_left",
      "cover.office_big_right",
    ]);
    expect(call.data?.position).toBe(0);

    await expect(night).toHaveClass(/active/, { timeout: 3000 });
  });
});

test.describe("dark mode", () => {
  test("follows hass.themes.darkMode and keeps explicit overrides", async ({
    page,
  }) => {
    const card = page.locator(CARD);
    const cardSurface = page.locator(`${CARD} .card`);
    const lightBg = await cardSurface.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );

    await page.evaluate(() => window.__harness.setDarkMode(true));
    await expect(card).toHaveAttribute("dark", "");
    const darkBg = await cardSurface.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    expect(darkBg).not.toBe(lightBg);

    // An explicit per-property override must win over both palettes.
    await page.evaluate(() => {
      document
        .querySelector("ru-shutters-card")!
        .setAttribute("style", "--ru-shutters-bg: rgb(1, 2, 3)");
    });
    await expect
      .poll(() =>
        cardSurface.evaluate((el) => getComputedStyle(el).backgroundColor)
      )
      .toBe("rgb(1, 2, 3)");

    await page.evaluate(() => window.__harness.setDarkMode(false));
    await expect(card).not.toHaveAttribute("dark");
  });
});
