import { expect, test, type Page } from "@playwright/test";
import { stubAudio } from "./audio";

const PAPER_1 = "/papers/paper-1-the-universal-father";
const REAL = /\/papers\/(foreword|paper-(1|2|99)-[a-z-]+)$/;
const settings = (page: Page) => page.getByRole("dialog", { name: "Account and settings" });
const offline = (page: Page) => settings(page).getByRole("switch", { name: /Read offline/ });

// The test data has four papers. Each other paper gets a small page, so a download can end.
// `stopAt`: the network fails for each paper from that number on.
async function standIn(page: Page, stopAt = 999) {
  await page.route(/\/papers\/paper-\d+-[a-z0-9-]+$/, (route) => {
    const url = new URL(route.request().url());
    const n = Number(/paper-(\d+)-/.exec(url.pathname)![1]);
    if (route.request().resourceType() !== "fetch") return route.fallback();
    if (n >= stopAt) return route.abort();
    if (REAL.test(url.pathname)) return route.fallback();
    return route.fulfill({ contentType: "text/html", body: `<!doctype html><title>Paper ${n}</title><p>Paper ${n}, a page of the test</p>` });
  });
}
async function turnOn(page: Page) {
  await page.goto(PAPER_1);
  await page.getByRole("button", { name: "Account and settings" }).click();
  await offline(page).click();
}

test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

test("Read offline keeps each paper, and the papers open with no connection", async ({ page, context }) => {
  await standIn(page);
  await turnOn(page);
  await expect(offline(page)).toHaveAttribute("aria-checked", "true");
  await expect(settings(page).getByText("197 papers kept")).toBeVisible({ timeout: 60_000 });
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
  await expect(settings(page).getByText(/^\d+ of 197 papers$/)).toBeVisible();
  // The download stopped at the first paper with no answer.
  await expect.poll(async () => Number(/^(\d+) of/.exec((await settings(page).locator(".offline-row small").textContent()) ?? "")?.[1] ?? 0)).toBeGreaterThan(50);
  const have = Number(/^(\d+) of/.exec((await settings(page).locator(".offline-row small").textContent())!)![1]);
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
  await expect(settings(page).getByText("197 papers kept")).toBeVisible({ timeout: 60_000 });
  await offline(page).click();
  await expect(offline(page)).toHaveAttribute("aria-checked", "false");
  await expect(settings(page).getByText("All 197 papers, about 5 MB")).toBeVisible();
  expect(await page.evaluate(() => caches.has("offline-v1"))).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem("offline"))).toBeNull();
});

test("the settings have the pages first and this device last, and the text size only on a paper", async ({ page }) => {
  await page.goto(PAPER_1);
  await page.getByRole("button", { name: "Account and settings" }).click();
  const names = await settings(page).locator(".account-row > span:not(.face), .settings-group h2, .device-row > span").evaluateAll((els) => els.map((el) => el.firstChild?.textContent?.trim()));
  expect(names).toEqual(["Sign in", "This device", "Theme", "Text size", "Read offline"]);
  await page.goto("/papers");
  await page.getByRole("button", { name: "Account and settings" }).click();
  await expect(settings(page).getByText("Theme")).toBeVisible();
  await expect(settings(page).getByText("Text size")).toBeHidden();
});
