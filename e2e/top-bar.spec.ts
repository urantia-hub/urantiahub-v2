import { expect, test } from "@playwright/test";

const PAPER_1 = "/papers/paper-1-the-universal-father";

// The problem this solves: a reader in the middle of a paper wants to search, and must not lose their place.
test("the top bar leaves on a scroll down and returns on a small scroll up, with search and settings", async ({ page }) => {
  await page.goto(PAPER_1);
  const header = page.getByRole("banner");
  await expect(page.getByTestId("reading-bar")).toBeVisible();
  await page.mouse.move(200, 300);
  await page.mouse.wheel(0, 2400);
  await expect(header).not.toBeInViewport();
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, -80);
  await expect(header).toBeInViewport();
  await expect(header.getByRole("link", { name: "Search" })).toBeInViewport();
  await expect(header.getByRole("button", { name: "Account and settings" })).toBeInViewport();
  // The reader keeps their place.
  expect(before - (await page.evaluate(() => window.scrollY))).toBeLessThan(200);
  // The bar shows the mark and the name, and no paper title.
  await expect(header).toContainText("UrantiaHub");
  await expect(header).not.toContainText("The Universal Father");
});

test("the top bar does not cover the text at the top of a paper", async ({ page }) => {
  await page.goto(PAPER_1);
  const header = (await page.getByRole("banner").boundingBox())!;
  const title = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
  expect(title.y).toBeGreaterThan(header.y + header.height);
});

test("the reader settings change the text size, and the choice stays after a reload", async ({ page }) => {
  await page.goto(PAPER_1);
  const para = page.locator('[id="1:0.1"]');
  const size = () => para.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  const start = await size();
  await page.getByRole("banner").getByRole("button", { name: "Account and settings" }).click();
  const panel = page.getByRole("dialog", { name: "Account and settings" });
  await panel.getByRole("button", { name: "Larger text" }).click();
  await panel.getByRole("button", { name: "Larger text" }).click();
  await expect(panel.getByRole("button", { name: "Larger text" })).toBeDisabled();
  const large = await size();
  expect(large / start).toBeCloseTo(1.22, 1);
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await page.reload();
  expect(await size()).toBeCloseTo(large, 0);
  // The size is for the text of a paper. The contents page keeps its design size.
  await page.goto("/papers");
  await expect(page.locator("body")).toHaveCSS("font-size", /^1[89]px$/);
});

test("the settings panel stays in view while it is open, and closes on a press outside it", async ({ page }) => {
  await page.goto(PAPER_1);
  await page.mouse.move(200, 300);
  await page.mouse.wheel(0, 1500);
  await page.mouse.wheel(0, -80);
  await page.getByRole("banner").getByRole("button", { name: "Account and settings" }).click();
  const panel = page.getByRole("dialog", { name: "Account and settings" });
  await expect(panel).toBeInViewport();
  await page.locator(".settings-scrim").click({ position: { x: 20, y: 200 } });
  await expect(panel).toBeHidden();
});
