import { expect, test, type Page } from "@playwright/test";
import { still, stubAudio, tap } from "./audio";

const PAPER_1 = "/papers/paper-1-the-universal-father";
const maker = (page: Page, ref: string) => page.getByRole("dialog", { name: `Image of ${ref}` });
async function openImage(page: Page, ref: string) {
  await tap(page, ref);
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Make an image" }).click();
  await expect(maker(page, ref).getByRole("button", { name: "Save the image" })).toBeEnabled();
}
// The color of one point of the image, and a short mark of all of it.
const pixel = (page: Page, x: number, y: number) => page.evaluate(([x, y]) => [...document.querySelector("canvas")!.getContext("2d")!.getImageData(x, y, 1, 1).data].slice(0, 3).join(","), [x, y]);
const print = (page: Page) => page.evaluate(() => document.querySelector("canvas")!.toDataURL().length);
const inked = (page: Page) =>
  page.evaluate(() => {
    const data = document.querySelector("canvas")!.getContext("2d")!.getImageData(96, 232, 888, 900).data;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] < 120) n += 1;
    return n;
  });

test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

test("Image makes a 4 by 5 image of the paragraph, with its reference and the name of the site", async ({ page }) => {
  await page.goto(PAPER_1);
  await openImage(page, "1:0.3");
  const size = await page.evaluate(() => [document.querySelector("canvas")!.width, document.querySelector("canvas")!.height]);
  expect(size).toEqual([1080, 1350]);
  expect(await pixel(page, 5, 5)).toBe("251,248,242");
  // The text is drawn: many dark points in the text area.
  expect(await inked(page)).toBeGreaterThan(5000);
  await expect(maker(page, "1:0.3").getByRole("img")).toHaveAccessibleName(/^Image with the text: The enlightened worlds/);
  // The paragraph stays marked behind the maker.
  await expect(page.locator('[id="1:0.3"]')).toHaveAttribute("data-picked", "");
});

test("the reader chooses the look and the sentences", async ({ page }) => {
  await page.goto(PAPER_1);
  await openImage(page, "1:0.3");
  const m = maker(page, "1:0.3");
  await m.getByRole("button", { name: "Night" }).click();
  await expect.poll(() => pixel(page, 5, 5)).toBe("23,21,15");
  await expect(m.getByRole("button", { name: "Night" })).toHaveAttribute("aria-pressed", "true");
  const before = await print(page);
  const first = m.locator(".image-sentences button").first();
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await first.click();
  await expect(first).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => print(page)).not.toBe(before);
  // The image starts at the second sentence, with no mark for the part before it.
  await expect(m.getByRole("img")).toHaveAccessibleName(/^Image with the text: (?!…|The enlightened)/);
});

test("too much text, or none, cannot be saved, and the maker says why", async ({ page }) => {
  await page.goto(PAPER_1);
  await openImage(page, "1:0.3");
  const m = maker(page, "1:0.3");
  const all = m.locator(".image-sentences button");
  // The maker starts with as many sentences as fit. This paragraph is longer than one image.
  expect(await all.evaluateAll((els) => els.filter((el) => el.getAttribute("aria-pressed") === "false").length)).toBeGreaterThan(0);
  await all.evaluateAll((els) => els.forEach((el) => el.getAttribute("aria-pressed") === "false" && (el as HTMLElement).click()));
  await expect(m.getByText("This is too much text for one image. Take a sentence off.")).toBeVisible();
  await expect(m.getByRole("button", { name: "Save the image" })).toBeDisabled();
  await all.evaluateAll((els) => els.forEach((el) => el.getAttribute("aria-pressed") === "true" && (el as HTMLElement).click()));
  await expect(m.getByText("Choose a sentence.")).toBeVisible();
  await expect(m.getByRole("button", { name: "Save the image" })).toBeDisabled();
});

test("Save the image gives a PNG file with the reference in its name", async ({ page }) => {
  await page.goto(PAPER_1);
  await openImage(page, "1:0.3");
  const [download] = await Promise.all([page.waitForEvent("download"), maker(page, "1:0.3").getByRole("button", { name: "Save the image" }).click()]);
  expect(download.suggestedFilename()).toBe("urantia-papers-1-0-3.png");
  await expect(maker(page, "1:0.3").getByText("Image saved")).toBeVisible();
});

test("Escape closes the maker first, and the maker fits the window", async ({ page }) => {
  await page.goto(PAPER_1);
  await openImage(page, "1:0.3");
  await still(page);
  const box = (await maker(page, "1:0.3").boundingBox())!;
  const view = page.viewportSize()!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(view.height + 1);
  expect(await maker(page, "1:0.3").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('[id="1:0.3"]')).toHaveAttribute("data-picked", "");
});

test("the buttons of the maker stay in their place while its content scrolls, and the page behind is darker", async ({ page }) => {
  await page.goto(PAPER_1);
  await openImage(page, "1:0.3");
  const m = maker(page, "1:0.3");
  const save = m.getByRole("button", { name: "Save the image" });
  const body = m.locator(".panel-body");
  await still(page);
  const before = (await save.boundingBox())!;
  await body.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  expect(await body.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  expect((await save.boundingBox())!.y).toBe(before.y);
  // The maker itself does not scroll: only its content does.
  expect(await m.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  // On each width the page behind the maker is darker.
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body, "::after").opacity)).toBe("1");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body, "::after").opacity)).toBe("0");
});
