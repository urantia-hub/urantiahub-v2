import { expect, test } from "@playwright/test";
import { stubAudio, tap } from "./audio";

const PAPER_1 = "/papers/paper-1-the-universal-father";

test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

test("a panel comes with a move, and goes with one before it leaves the page", async ({ page }) => {
  await page.goto(PAPER_1);
  await tap(page, "1:0.3");
  await page.getByRole("button", { name: "More" }).click();
  const panel = page.getByRole("dialog", { name: "More" });
  expect(await panel.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  // The panel is on its way out: it is still in the page, and it takes no press.
  await expect(panel).toHaveAttribute("data-leaving", "");
  expect(await panel.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  await expect(panel).toHaveCount(0);
  // The row of the paragraph stays, with the focus on the button that opened the panel.
  await expect(page.getByRole("button", { name: "More" })).toBeFocused();
});

test("a reader who asked for less motion gets none: the panel goes at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(PAPER_1);
  await tap(page, "1:0.3");
  await page.getByRole("button", { name: "More" }).click();
  const panel = page.getByRole("dialog", { name: "More" });
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  expect(await panel.count()).toBe(0);
});

test("the row of a marked paragraph and the navigator come with a move", async ({ page }) => {
  await page.goto(PAPER_1);
  await tap(page, "1:0.3");
  expect(await page.locator(".dock .row.pick").evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Open the navigator/ }).click();
  expect(await page.getByRole("dialog", { name: "Navigator" }).evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
});
