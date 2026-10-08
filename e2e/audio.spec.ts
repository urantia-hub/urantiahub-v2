import { expect, test } from "@playwright/test";
import { para, round, stubAudio, tap } from "./audio";

const PAPER_1 = "/papers/paper-1-the-universal-father";
const YELLOW = "rgb(243, 234, 210)";
const GREEN = "rgb(228, 239, 227)";
const dock = (page: import("@playwright/test").Page) => page.getByTestId("reading-bar");

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
});

test("a tap marks a paragraph and shows its actions, and a second tap puts it back", async ({ page }) => {
  await stubAudio(page);
  await page.goto(PAPER_1);
  await tap(page, "1:0.2");
  await expect(para(page, "1:0.2")).toHaveCSS("background-color", YELLOW);
  await expect(dock(page)).toHaveAttribute("data-job", "paragraph");
  await expect(page.getByTestId("picked-ref")).toHaveText("1:0.2");
  await tap(page, "1:0.2");
  await expect(dock(page)).toHaveAttribute("data-job", "reading");
  await expect(para(page, "1:0.2")).not.toHaveAttribute("data-picked");
});

// Review Focus 4.
test("a selection of words marks nothing", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "a drag with the mouse is a desktop action");
  await stubAudio(page);
  await page.goto(PAPER_1);
  const box = (await para(page, "1:0.2").locator("span").first().boundingBox())!;
  await page.mouse.move(box.x + 10, box.y + 14);
  await page.mouse.down();
  await page.mouse.move(box.x + 260, box.y + 14, { steps: 6 });
  await page.mouse.up();
  expect((await page.evaluate(() => String(window.getSelection()))).length).toBeGreaterThan(3);
  await expect(page.locator("[data-picked]")).toHaveCount(0);
  await expect(dock(page)).toHaveAttribute("data-job", "reading");
});

test("a double-click that selects a word marks nothing", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "a double-click is a desktop action");
  await stubAudio(page);
  await page.goto(PAPER_1);
  await para(page, "1:0.2").locator("span").first().dblclick({ position: { x: 60, y: 12 } });
  expect((await page.evaluate(() => String(window.getSelection()))).trim().length).toBeGreaterThan(0);
  await expect(page.locator("[data-picked]")).toHaveCount(0);
  await expect(dock(page)).toHaveAttribute("data-job", "reading");
});

test("Share copies the paragraph link where the browser has no share sheet", async ({ page }) => {
  await stubAudio(page);
  await page.goto(PAPER_1);
  await page.evaluate(() => Object.defineProperty(navigator, "share", { value: undefined, configurable: true }));
  await tap(page, "1:0.2");
  await page.getByRole("button", { name: "Share" }).click();
  await expect(page.getByText("Link copied")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`http://localhost:3100${PAPER_1}#1:0.2`);
});

test("Share gives the share sheet the link and a title", async ({ page }) => {
  await stubAudio(page);
  await page.goto(PAPER_1);
  await page.evaluate(() => {
    (window as unknown as { shared: unknown }).shared = null;
    Object.defineProperty(navigator, "share", {
      value: async (data: unknown) => void ((window as unknown as { shared: unknown }).shared = data),
      configurable: true,
    });
  });
  await tap(page, "1:0.2");
  await page.getByRole("button", { name: "Share" }).click();
  expect(await page.evaluate(() => (window as unknown as { shared: unknown }).shared)).toEqual({
    title: "1:0.2 · Paper 1, The Universal Father",
    url: `http://localhost:3100${PAPER_1}#1:0.2`,
  });
});

test("the round button starts the voice at the first paragraph in view", async ({ page }) => {
  await stubAudio(page);
  await page.goto(PAPER_1);
  await expect(round(page)).toHaveAccessibleName("Listen");
  await round(page).click();
  await expect(para(page, "1:0.1")).toHaveCSS("background-color", GREEN);
  await expect(dock(page)).toHaveAttribute("data-job", "listening");
  await expect(page.getByTestId("voice-ref")).toHaveText("1:0.1");
  await expect(round(page)).toHaveAccessibleName("Pause");
});

test("the round button starts the voice at the marked paragraph", async ({ page }) => {
  await stubAudio(page);
  await page.goto(PAPER_1);
  await tap(page, "1:0.3");
  await round(page).click();
  await expect(page.getByTestId("voice-ref")).toHaveText("1:0.3");
  await expect(para(page, "1:0.3")).toHaveCSS("background-color", GREEN);
});

// Review Focus 3.
test("a reader who arrives by a paragraph link starts the voice at that paragraph", async ({ page }) => {
  await stubAudio(page);
  await page.goto(`${PAPER_1}#1:2.1`);
  await expect(para(page, "1:2.1")).toHaveCSS("background-color", YELLOW);
  await expect(round(page)).toHaveAccessibleName("Listen from 1:2.1");
  await round(page).click();
  await expect(page.getByTestId("voice-ref")).toHaveText("1:2.1");
});

test("the mark and the page follow the voice to the next paragraph", async ({ page }) => {
  await stubAudio(page, { short: true });
  await page.goto(PAPER_1);
  await tap(page, "1:0.5");
  await round(page).click();
  await expect(page.getByTestId("voice-ref")).toHaveText("1:0.6");
  await expect(para(page, "1:0.6")).toHaveCSS("background-color", GREEN);
  await expect(para(page, "1:0.6")).toBeInViewport();
  await expect(para(page, "1:0.5")).not.toHaveAttribute("data-voice");
  await expect(page.locator(".dock .fill.voice")).toBeVisible();
});

test("pause removes the green mark, and play resumes at the same paragraph", async ({ page }) => {
  await stubAudio(page);
  await page.goto(PAPER_1);
  await tap(page, "1:0.3");
  await round(page).click();
  await expect(para(page, "1:0.3")).toHaveCSS("background-color", GREEN);
  await round(page).click();
  await expect(page.locator("[data-voice]")).toHaveCount(0);
  await expect(dock(page)).toHaveAttribute("data-job", "reading");
  await round(page).click();
  await expect(page.getByTestId("voice-ref")).toHaveText("1:0.3");
  await expect(para(page, "1:0.3")).toHaveCSS("background-color", GREEN);
});

test("while the voice plays, a tap on another paragraph turns the round button to play, and one press moves the voice", async ({ page }) => {
  await stubAudio(page);
  await page.goto(PAPER_1);
  await round(page).click();
  await expect(page.getByTestId("voice-ref")).toHaveText("1:0.1");
  await tap(page, "1:0.2");
  await expect(dock(page)).toHaveAttribute("data-job", "paragraph");
  await expect(round(page)).toHaveAccessibleName("Listen from 1:0.2");
  await expect(para(page, "1:0.1")).toHaveCSS("background-color", GREEN);
  await round(page).click();
  await expect(page.getByTestId("voice-ref")).toHaveText("1:0.2");
});

test("while the voice plays, a tap on the paragraph that plays shows the player again", async ({ page }) => {
  await stubAudio(page);
  await page.goto(PAPER_1);
  await round(page).click();
  await expect(page.getByTestId("voice-ref")).toHaveText("1:0.1");
  await tap(page, "1:0.2");
  await tap(page, "1:0.1");
  await expect(dock(page)).toHaveAttribute("data-job", "listening");
  await expect(page.locator("[data-picked]")).toHaveCount(0);
});

test("a scroll by the reader stops the follow, and Back to the voice returns", async ({ page }) => {
  await stubAudio(page);
  await page.goto(PAPER_1);
  await round(page).click();
  await expect(page.getByTestId("voice-ref")).toHaveText("1:0.1");
  await page.waitForTimeout(1100);
  await page.mouse.wheel(0, 4000);
  const back = page.getByRole("button", { name: "Back to the voice" });
  await expect(back).toBeVisible();
  await back.click();
  await expect(para(page, "1:0.1")).toBeInViewport();
  await expect(back).toBeHidden();
});

// Review Focus 5.
test("a file that does not load shows a message, and the retry works when the file is back", async ({ page }) => {
  const audio = await stubAudio(page, { failOn: "nova-1:1.0.2" });
  await page.goto(PAPER_1);
  await tap(page, "1:0.2");
  await round(page).click();
  await expect(page.getByText("The audio did not load")).toBeVisible();
  await expect(page.locator("[data-voice]")).toHaveCount(0);
  audio.failOn = null;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByTestId("voice-ref")).toHaveText("1:0.2");
  await expect(para(page, "1:0.2")).toHaveCSS("background-color", GREEN);
});

test("the paper arrows show at the top of a paper only", async ({ page }) => {
  await stubAudio(page);
  await page.goto(PAPER_1);
  const next = page.getByRole("link", { name: /^Next:/ }).first();
  await expect(next).toBeVisible();
  await page.mouse.wheel(0, 900);
  await page.mouse.wheel(0, -200);
  await expect(dock(page)).toHaveClass(/deep/);
  await expect(dock(page).locator(".arrow").first()).toBeHidden();
});

test("on a desktop, the dock is centered, Space toggles the voice, and Escape removes the mark", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "keyboard and centering are desktop rules");
  await stubAudio(page);
  await page.goto(PAPER_1);
  const box = (await dock(page).boundingBox())!;
  expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThanOrEqual(2);
  expect(box.width).toBeLessThanOrEqual(461);

  await page.keyboard.press("Space");
  await expect(dock(page)).toHaveAttribute("data-job", "listening");
  await page.keyboard.press("Space");
  await expect(dock(page)).toHaveAttribute("data-job", "reading");

  await tap(page, "1:0.2");
  await expect(para(page, "1:0.2")).toHaveAttribute("data-picked");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-picked]")).toHaveCount(0);
});

test("the audio comes from the CDN, and the security policy permits it", async ({ page }) => {
  const audio = await stubAudio(page);
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(PAPER_1);
  await round(page).click();
  await expect(page.getByTestId("voice-ref")).toHaveText("1:0.1");
  await expect(para(page, "1:0.1")).toHaveCSS("background-color", GREEN);
  await expect.poll(() => audio.requested.some((url) => decodeURIComponent(url).includes("/nova/tts-1-hd-nova-1:1.0.1.mp3"))).toBe(true);
  expect(errors.filter((text) => /Content Security Policy/i.test(text))).toEqual([]);
});

// Found by Kelson on the live site: the two lines stood at the top and the bottom of the pill.
test("the two lines in the pill stand close together, in the middle", async ({ page }) => {
  await stubAudio(page);
  await page.goto(PAPER_1);
  const pill = (await dock(page).locator(".pill").boundingBox())!;
  const small = (await dock(page).locator(".where small").boundingBox())!;
  const label = (await page.getByTestId("reading-bar-label").boundingBox())!;
  expect(label.y - (small.y + small.height)).toBeLessThanOrEqual(7);
  const middle = (small.y + label.y + label.height) / 2;
  expect(Math.abs(middle - (pill.y + pill.height / 2))).toBeLessThanOrEqual(3);
});

test("a long section name cuts off inside the pill", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "the pill is narrow on a phone");
  await stubAudio(page);
  await page.goto(`${PAPER_1}#1:7.1`);
  // The page marks the paragraph from the address after it starts. Escape before that does nothing.
  await expect(page.getByTestId("picked-ref")).toHaveText("1:7.1");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("reading-bar-label")).toHaveText(/^7\. Spiritual Value/);
  const pill = (await dock(page).locator(".pill").boundingBox())!;
  const label = (await page.getByTestId("reading-bar-label").boundingBox())!;
  expect(label.x).toBeGreaterThanOrEqual(pill.x + 30);
  expect(label.x + label.width).toBeLessThanOrEqual(pill.x + pill.width - 30);
});
