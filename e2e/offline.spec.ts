import { expect, test, type Page } from "@playwright/test";
import { stubAudio } from "./audio";

const PAPER_1 = "/papers/paper-1-the-universal-father";
const PAPER_1_ES = "/es/documentos/documento-1-el-padre-universal";
const REAL = /\/papers\/(foreword|paper-(1|2|99)-[a-z-]+)$/;
const REAL_ES = /\/es\/documentos\/(prologo|documento-(1|2|99|134)-[a-z-]+)$/;
const settings = (page: Page) => page.getByRole("dialog", { name: "Account and settings" });
// With Spanish on, "Read offline" is in the language sheet: one switch for each language.
const sheet = (page: Page) => page.locator(".lang-sheet");
const offline = (page: Page, name: RegExp = /^English/) => sheet(page).getByRole("switch", { name });
const line = (page: Page, name = "English") => sheet(page).locator(".device-row", { hasText: name }).locator("small");

// The test data has four papers. Each other paper gets a small page, so a download can end.
// `stopAt`: the network fails for each paper from that number on.
async function standIn(page: Page, stopAt = 999) {
  await page.route(/\/(papers\/paper|es\/documentos\/documento)-\d+-[a-z0-9-]+$/, (route) => {
    const url = new URL(route.request().url());
    const n = Number(/(?:paper|documento)-(\d+)-/.exec(url.pathname)![1]);
    if (route.request().resourceType() !== "fetch") return route.fallback();
    if (n >= stopAt) return route.abort();
    if (REAL.test(url.pathname) || REAL_ES.test(url.pathname)) return route.fallback();
    return route.fulfill({ contentType: "text/html", body: `<!doctype html><title>Paper ${n}</title><p>Paper ${n}, a page of the test</p>` });
  });
}
async function turnOn(page: Page, at = PAPER_1, name: RegExp = /^English/) {
  await page.goto(at);
  await page.locator(".lang-pill").click();
  await offline(page, name).click();
}

test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

test("Read offline keeps each paper, and the papers open with no connection", async ({ page, context }) => {
  await standIn(page);
  await turnOn(page);
  await expect(offline(page)).toHaveAttribute("aria-checked", "true");
  await expect(sheet(page).getByText("Downloaded · 197 papers")).toBeVisible({ timeout: 60_000 });
  await page.keyboard.press("Escape");

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "The Universal Father" })).toBeVisible();
  const strip = page.locator(".offline-strip");
  await expect(strip).toHaveText(/No connection\. All 197 papers are on this device\./);
  // The page works: a press on a paragraph marks it.
  await page.locator('[id="1:0.3"] .text').click({ position: { x: 40, y: 12 } });
  await expect(page.locator('[id="1:0.3"]')).toHaveAttribute("data-picked", "");
  await strip.getByRole("button", { name: "Close" }).click();
  await expect(strip).toHaveCount(0);

  // The contents, and from there another paper.
  await page.goto("/papers");
  await page.getByRole("link", { name: /The Nature of God/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "The Nature of God" })).toBeVisible();
  // A page that the device does not keep says so.
  await page.goto("/about");
  await expect(page.getByText("This page is not on this device.")).toBeVisible();
  await context.setOffline(false);
});

test("a download that did not finish says how far it is, and a paper that is not kept says so", async ({ page, context }) => {
  await standIn(page, 100);
  await turnOn(page);
  await expect(sheet(page).getByText(/^\d+ of 197 papers$/)).toBeVisible();
  // The download stopped at the first paper with no answer.
  await expect.poll(async () => Number(/^(\d+) of/.exec((await line(page).textContent()) ?? "")?.[1] ?? 0)).toBeGreaterThan(50);
  const have = Number(/^(\d+) of/.exec((await line(page).textContent())!)![1]);
  expect(have).toBeLessThan(110);
  await page.keyboard.press("Escape");

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".offline-strip")).toHaveText(/No connection\. \d+ of the 197 papers are on this device\. The rest download when you go online\./);
  await page.goto("/papers/paper-150-the-third-preaching-tour");
  await expect(page.getByRole("heading", { name: "No connection" })).toBeVisible();
  await expect(page.getByText("This paper is not on this device.")).toBeVisible();
  await context.setOffline(false);
});

test("the switch off removes the papers from the device", async ({ page }) => {
  await standIn(page);
  await turnOn(page);
  await expect(sheet(page).getByText("Downloaded · 197 papers")).toBeVisible({ timeout: 60_000 });
  await offline(page).click();
  await expect(offline(page)).toHaveAttribute("aria-checked", "false");
  await expect(line(page)).toHaveText("Download the 197 papers to read them offline");
  expect(await page.evaluate(() => caches.has("offline-v1"))).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem("offline"))).toBeNull();
});

test("the settings have the pages first and this device last, and the text size only on a paper", async ({ page }) => {
  await page.goto(PAPER_1);
  await page.getByRole("button", { name: "Account and settings" }).click();
  const names = await settings(page).locator(".account-row > span:not(.face), .settings-group h2, .device-row > span").evaluateAll((els) => els.map((el) => el.firstChild?.textContent?.trim()));
  expect(names).toEqual(["Sign in", "This device", "Theme", "Text size"]);
  await page.goto("/papers");
  await page.getByRole("button", { name: "Account and settings" }).click();
  await expect(settings(page).getByText("Theme")).toBeVisible();
  await expect(settings(page).getByText("Text size")).toBeHidden();
});

test("each language keeps its own papers, and the switch off of one leaves the other", async ({ page, context }) => {
  await standIn(page);
  await turnOn(page, PAPER_1_ES, /^Español/);
  await expect(sheet(page).getByText("Descargado · 197 documentos")).toBeVisible({ timeout: 60_000 });
  await offline(page).click();
  await expect(line(page)).toHaveText("Descargado · 197 documentos", { timeout: 60_000 });

  // The Spanish switch off: the English papers stay, the Spanish ones go.
  await offline(page, /^Español/).click();
  await expect(offline(page, /^Español/)).toHaveAttribute("aria-checked", "false");
  const kept = () =>
    page.evaluate(async () => {
      const cache = await caches.open("offline-v1");
      const paths = (await cache.keys()).map((request) => new URL(request.url).pathname);
      return { en: paths.filter((path) => path.startsWith("/papers/")).length, es: paths.filter((path) => path.startsWith("/es/")).length };
    });
  await expect.poll(kept).toEqual({ en: 197, es: 0 });
  expect(await page.evaluate(() => localStorage.getItem("offline-es"))).toBeNull();
  await page.keyboard.press("Escape");

  // With no connection, the English page says that all its papers are kept.
  await context.setOffline(true);
  await page.goto(PAPER_1);
  await expect(page.locator(".offline-strip")).toHaveText(/No connection\. All 197 papers are on this device\./);
  await context.setOffline(false);
});
