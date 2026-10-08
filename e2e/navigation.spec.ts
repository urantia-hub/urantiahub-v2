import { expect, test } from "@playwright/test";
import { openNavigator } from "./audio";

const PAPER_1 = "/papers/paper-1-the-universal-father";

test("the reading bar names the section and leaves on a scroll down", async ({ page }) => {
  await page.goto(PAPER_1);
  const bar = page.getByTestId("reading-bar");
  const label = page.getByTestId("reading-bar-label");
  await expect(label).toHaveText("The Universal Father");
  await expect(bar).not.toHaveClass(/away/);

  await page.evaluate(() => document.getElementById("1:2")!.scrollIntoView());
  await page.mouse.wheel(0, 200);
  await expect(label).toHaveText("2. The Reality of God");
  await expect(bar).toHaveClass(/away/);

  await page.mouse.wheel(0, -120);
  await expect(bar).not.toHaveClass(/away/);
});

test("the navigator goes to a section and does not leave the paper", async ({ page }) => {
  await page.goto(PAPER_1);
  await openNavigator(page);
  const navigator = page.getByRole("dialog", { name: "Navigator" });
  await expect(navigator).toBeVisible();
  await navigator.getByRole("button", { name: "4. The Mystery of God" }).click();
  await expect(navigator).toBeHidden();
  await expect(page).toHaveURL(`${PAPER_1}#1:4`);
  await expect(page.locator('[id="1:4"]')).toBeInViewport();
});

test("the navigator goes to a typed reference and the paragraph is marked", async ({ page }) => {
  await page.goto(PAPER_1);
  await openNavigator(page);
  await page.getByLabel("Go to a reference").fill("99:1.1");
  await page.getByLabel("Go to a reference").press("Enter");
  await expect(page).toHaveURL("/papers/paper-99-the-social-problems-of-religion#99:1.1");
  const paragraph = page.locator('[id="99:1.1"]');
  await expect(paragraph).toBeInViewport();
  await expect(paragraph).toContainText("Mechanical inventions and the dissemination of knowledge");
  await expect(paragraph).toHaveCSS("background-color", "rgb(243, 234, 210)");
});

test("the navigator rejects input that is not a reference", async ({ page }) => {
  await page.goto(PAPER_1);
  await openNavigator(page);
  await page.getByLabel("Go to a reference").fill("hello");
  await page.getByLabel("Go to a reference").press("Enter");
  // Next.js has its own hidden alert element, so the query stays inside the navigator.
  await expect(page.getByRole("dialog", { name: "Navigator" }).getByRole("alert")).toHaveText(
    "Use a form such as 99, 99:1, or 99:1.1.",
  );
  await expect(page).toHaveURL(PAPER_1);
});

test("All papers opens the contents page, and Continue returns to the section the reader left", async ({ page }) => {
  await page.goto(`${PAPER_1}#1:2`);
  await expect(page.getByTestId("reading-bar-label")).toHaveText("2. The Reality of God");
  await openNavigator(page);
  const navigator = page.getByRole("dialog", { name: "Navigator" });
  await expect(navigator.getByRole("heading", { name: "The Universal Father" })).toBeVisible();
  await navigator.getByRole("button", { name: "All papers" }).click();
  await expect(page).toHaveURL("/papers");
  const card = page.getByRole("link", { name: /Continue/ });
  await expect(card).toContainText("Paper 1 · 2. The Reality of God");
  await card.click();
  await expect(page).toHaveURL(`${PAPER_1}#1:2`);
  await expect(page.locator('[id="1:2"]')).toBeInViewport();
});

test("the neighbor cards show full titles and open the paper", async ({ page }) => {
  await page.goto(PAPER_1);
  await openNavigator(page);
  const navigator = page.getByRole("dialog", { name: "Navigator" });
  await navigator.getByRole("button", { name: "Next paper: Paper 2, The Nature of God" }).click();
  await expect(page).toHaveURL("/papers/paper-2-the-nature-of-god");
});

test("the navigator has round corners at the bottom on a desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "the sheet is a centered card on a desktop only");
  await page.goto(PAPER_1);
  await openNavigator(page);
  const navigator = page.getByRole("dialog", { name: "Navigator" });
  await expect(navigator).toHaveCSS("border-bottom-left-radius", "20px");
  await expect(navigator).toHaveCSS("overflow-y", "hidden");
});

test("Escape and the back control close the navigator and keep the paper", async ({ page }) => {
  await page.goto(PAPER_1);
  const navigator = page.getByRole("dialog", { name: "Navigator" });

  await openNavigator(page);
  await expect(navigator).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(navigator).toBeHidden();
  await expect(page).toHaveURL(PAPER_1);

  await openNavigator(page);
  await expect(navigator).toBeVisible();
  await page.goBack();
  await expect(navigator).toBeHidden();
  await expect(page).toHaveURL(PAPER_1);
});
