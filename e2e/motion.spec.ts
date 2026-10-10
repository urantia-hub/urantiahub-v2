import { expect, test } from "@playwright/test";
import { stubAudio, tap } from "./audio";

const PAPER_1 = "/papers/paper-1-the-universal-father";

test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

// The name of the move of an element. It stays in the style after the move ends, so a slow machine reads the same.
const move = (el: Element) => getComputedStyle(el).animationName;

test("a panel comes with a move, and goes with one before it leaves the page", async ({ page }) => {
  await page.goto(PAPER_1);
  await tap(page, "1:0.3");
  await page.getByRole("button", { name: "More" }).click();
  const panel = page.getByRole("dialog", { name: "More" });
  expect(await panel.evaluate(move)).not.toBe("none");
  // The page notes what the panel is while it goes: the time for that is short.
  await panel.evaluate((el) => {
    const seen = ((window as unknown as { seen: string[] }).seen = [] as string[]);
    new MutationObserver(() => el.hasAttribute("data-leaving") && seen.push(getComputedStyle(el).pointerEvents)).observe(el, { attributes: true });
  });
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  // It was on its way out first, still in the page, and it took no press.
  expect(await page.evaluate(() => (window as unknown as { seen: string[] }).seen)).toEqual(["none"]);
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
  expect(await page.locator(".dock .row.pick").evaluate(move)).toBe("fade-in");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Open the navigator/ }).click();
  expect(await page.getByRole("dialog", { name: "Navigator" }).evaluate(move)).not.toBe("none");
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
