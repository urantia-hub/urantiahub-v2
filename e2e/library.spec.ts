import { expect, test } from "@playwright/test";
import { stubAudio } from "./audio";

// The Library is unlinked (LIBRARY_LINKS), so each test goes to it by its address.
test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

test("a reader opens a work from the Library, reads a page, and sees the parallels of a passage", async ({ page }) => {
  await page.goto("/texts");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.getByRole("link", { name: /The Dhammapada/ }).click();
  await page.waitForURL("/texts/dhammapada/1");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("The Twin-Verses");

  await page.getByRole("link", { name: "Next: On Earnestness" }).click();
  await page.waitForURL("/texts/dhammapada/2");
  await page.locator('p.para[data-ref="Dhp 21"] .text').click();
  const sheet = page.getByRole("dialog", { name: "Parallels for Dhammapada 21" });
  await expect(sheet).toBeVisible();
  // "In the Papers" comes first on a work page. No other work is recorded, so it is the one half.
  await expect(sheet.locator(".parallel-list li").first()).toContainText("131:3.7");
  await expect(sheet.getByRole("link", { name: "Study these parallels" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);

  await page.getByRole("link", { name: "Next: Thought" }).click();
  await page.waitForURL("/texts/dhammapada/3");
});

test("an address of a passage goes to its page and marks it", async ({ page }) => {
  await page.goto("/texts/quran/at/Quran%201.3");
  await page.waitForURL("/texts/quran/1#Quran_1.3");
  await page.goto("/texts/dhammapada/at/Dhp%2022-23");
  await page.waitForURL("/texts/dhammapada/2#Dhp_22");
  await expect(page.getByRole("dialog", { name: /^Parallels for/ })).toBeVisible();
});

test("the chapters of a work open from the dock and from the list icon of the header", async ({ page }) => {
  await page.goto("/texts/dhammapada/2");
  await page.getByRole("button", { name: /Open the chapters/ }).click();
  const chapters = page.getByRole("dialog", { name: "Chapters" });
  await expect(chapters.getByRole("link", { name: /On Earnestness/ })).toHaveAttribute("aria-current", "page");
  await chapters.getByRole("link", { name: /Thought/ }).click();
  await page.waitForURL("/texts/dhammapada/3");
  await page.locator(".site-header .contents-link").click();
  await expect(page.getByRole("dialog", { name: "Chapters" })).toBeVisible();
  await expect(page).toHaveURL("/texts/dhammapada/3");
});
