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

test("on a phone the controls keep their height when the reader marks a paragraph", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "the tiles are larger on a phone only");
  await page.goto(PAPER_1);
  const pill = page.locator(".dock .pill");
  const before = (await pill.boundingBox())!;
  await tap(page, "1:0.3");
  await expect(page.locator(".dock .row.pick")).toBeVisible();
  const after = (await pill.boundingBox())!;
  expect(after.height).toBe(before.height);
  expect(after.y).toBe(before.y);
});

test("More has the action that a reader uses most at its end, near the thumb", async ({ page }) => {
  await page.goto(PAPER_1);
  await tap(page, "1:0.3");
  await page.getByRole("button", { name: "More" }).click();
  await expect(page.getByRole("dialog", { name: "More" }).getByRole("button")).toHaveText(["Make an image", "Terms in this paragraph", "Parallels", "Copy the text"]);
});
