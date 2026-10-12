import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { stubAudio } from "./audio";

const STANDIN = "http://localhost:4010";
const PAPER = "/papers/paper-1-the-universal-father";

async function asReader(context: BrowserContext) {
  const id = randomUUID();
  await context.addCookies([{ name: "e2e_reader", value: id, url: STANDIN }]);
  const set = async (values: object) => (await context.request.post(`${STANDIN}/__reader/${id}`, { data: values })).json();
  return { id, set };
}
const settings = (page: Page) => page.getByRole("dialog", { name: "Account and settings" });
async function signIn(page: Page) {
  await page.getByRole("button", { name: "Account and settings" }).click();
  await settings(page).getByRole("link", { name: /^Sign in/ }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/papers"));
  await expect(page.getByRole("button", { name: "Account and settings" }).locator(".face")).toBeVisible();
}
const noSideScroll = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

test("the footer leads to the resources, and the makers' own tools come first", async ({ page }) => {
  await page.goto("/about");
  await page.getByRole("contentinfo").getByRole("link", { name: "Resources" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Resources" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText("By the maker of UrantiaHub");
  const first = page.locator("a.res").first();
  await expect(first).toHaveAttribute("href", "https://docs.urantia.dev/assistants");
  await expect(first).toHaveAttribute("target", "_blank");
  await noSideScroll(page);
});

test("the footer leads to the releases, the newest first", async ({ page }) => {
  await page.goto("/about");
  await page.getByRole("contentinfo").getByRole("link", { name: "Releases" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Releases" })).toBeVisible();
  // The newest entry is first. The entry of the cutover stays in the list.
  await expect(page.locator(".rel time").first()).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);
  const dates = await page.locator(".rel time").evaluateAll((times) => times.map((time) => time.getAttribute("datetime") ?? ""));
  expect([...dates].sort().reverse()).toEqual(dates);
  await expect(page.getByRole("heading", { name: "The new UrantiaHub" })).toBeVisible();
  await noSideScroll(page);
});

test("the reader's page asks a reader with no account to sign in, and the old progress address opens it", async ({ page }) => {
  await page.goto("/progress");
  await expect(page).toHaveURL(/\/you$/);
  await expect(page.getByRole("heading", { level: 1, name: "Your page" })).toBeVisible();
  await expect(page.locator(".saved-empty").getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.locator(".progress-total")).toHaveCount(0);
});

test("a signed-in reader finds the progress on the reader's page: the share, the counts, and the way back to an open paper", async ({ page, context }) => {
  const reader = await asReader(context);
  await reader.set({
    saved: [{ ref: "1:0.3", createdAt: "2026-10-01T00:00:00.000Z" }],
    progress: [
      { paperId: "0", readCount: 172, totalParagraphs: 172 },
      { paperId: "1", readCount: 35, totalParagraphs: 70 },
    ],
  });
  await page.goto(PAPER);
  await signIn(page);
  await page.getByRole("button", { name: "Account and settings" }).click();
  await settings(page).getByRole("link", { name: /Ana Reader/ }).click();
  await expect(page).toHaveURL(/\/you$/);
  // What the reader saved, the newest first, with the way to all of it.
  await expect(page.locator(".you-saved")).toContainText("1:0.3");
  await expect(page.locator(".you-saved")).toContainText("Text of 1:0.3.");
  await expect(page.getByRole("link", { name: "See all 1" })).toHaveAttribute("href", "/saved");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page.locator(".progress-total")).toContainText("207 of 14,593 paragraphs");
  await expect(page.locator(".progress-total b")).toHaveText("1%");
  await expect(page.locator(".progress-facts")).toContainText("1paper finished");
  await expect(page.locator(".progress-facts")).toContainText("195not started");
  await expect(page.locator(".progress-part").first()).toContainText("100%");
  await noSideScroll(page);
  const row = page.getByRole("region", { name: "Continue" }).getByRole("link", { name: /The Universal Father/ });
  await expect(row).toContainText("Paper 1 · 50%");
  await row.click();
  await expect(page).toHaveURL(new RegExp(`${PAPER}(#.*)?$`));
});
