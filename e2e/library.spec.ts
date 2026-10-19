import { expect, test } from "@playwright/test";
import { stubAudio } from "./audio";

// Each test goes to World texts by its address.
test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

test("a reader opens a work from the Library, reads a page, and sees the parallels of a passage", async ({ page }) => {
  await page.goto("/texts");
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

test("a reader opens the Bible, reads a chapter, sees the other works near a verse, and goes to another chapter", async ({ page }) => {
  await page.goto("/texts");
  await page.getByRole("link", { name: /The Bible \(World English Bible\)/ }).click();
  await page.waitForURL("/texts/bible/genesis-1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Genesis 1");

  await page.goto("/texts/bible/john-3");
  await expect(page.locator(".paper-head .eyebrow")).toHaveText("The Bible · New Testament");
  await expect(page.locator(".work-meta")).toContainText("World English Bible · 36 verses");
  await page.locator('p.para[data-ref="John 3:16"] .text').click();
  const sheet = page.getByRole("dialog", { name: /^Parallels for John 3/ });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Other works" }).click();
  await expect(sheet.locator(".parallel-list li").first()).toContainText("Helaman 8:14-15");
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);

  await page.getByRole("button", { name: /Open the books/ }).click();
  const books = page.getByRole("dialog", { name: "The books of the Bible" });
  await books.getByRole("button", { name: "John 21 chapters" }).click();
  await books.getByRole("link", { name: "4", exact: true }).click();
  await page.waitForURL("/texts/bible/john-4");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("John 4");
});

test("the old addresses of the Library and the address of a verse land on their page", async ({ page }) => {
  await page.goto("/library/dhammapada/2");
  await expect(page).toHaveURL("/texts/dhammapada/2");
  await page.goto("/texts/bible/at/John%203:16");
  await page.waitForURL("/texts/bible/john-3#John_3%3A16");
  await expect(page.getByRole("dialog", { name: /^Parallels for John 3/ })).toBeVisible();
});

test("a work in books opens its books from the dock, and a book as the numbers of its pages", async ({ page }) => {
  await page.goto("/texts/rig-veda/10-129");
  await page.getByRole("button", { name: /Open the books/ }).click();
  const books = page.getByRole("dialog", { name: "Books" });
  await expect(books.getByRole("button", { name: /^Book 10 / })).toHaveAttribute("aria-current", "true");
  await books.getByRole("button", { name: /^Book 10 / }).click();
  await expect(books.getByRole("link", { name: "129", exact: true })).toHaveAttribute("aria-current", "page");
  await books.getByRole("link", { name: "1", exact: true }).click();
  await page.waitForURL("/texts/rig-veda/10-1");
});

test("the contents page links to World texts", async ({ page }) => {
  await page.goto("/papers");
  await page.getByRole("link", { name: "Browse world texts" }).click();
  await page.waitForURL("/texts");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("World texts");
});

test("a work whose pages have no title lists them as a grid of numbers", async ({ page }) => {
  await page.goto("/texts/quran/1");
  await page.getByRole("button", { name: /Open the chapters/ }).click();
  const chapters = page.getByRole("dialog", { name: "Chapters" });
  await expect(chapters.locator(".chapter-grid a")).toHaveCount(114);
  await expect(chapters.locator(".chapter-grid a[aria-current]")).toHaveText("1");
  await chapters.locator(".chapter-grid a", { hasText: /^112$/ }).click();
  await page.waitForURL("/texts/quran/112");
});
