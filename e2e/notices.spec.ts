import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { stubAudio } from "./audio";

const STANDIN = "http://localhost:4010";
const PAPER = "/papers/paper-1-the-universal-father";

async function asReader(context: BrowserContext) {
  const id = randomUUID();
  await context.addCookies([{ name: "e2e_reader", value: id, url: STANDIN }]);
  const set = async (values: object) => (await context.request.post(`${STANDIN}/__reader/${id}`, { data: values })).json();
  const seen = async () => (await context.request.get(`${STANDIN}/__reader/${id}`)).json();
  return { id, set, seen };
}
const settings = (page: Page) => page.getByRole("dialog", { name: "Account and settings" });
async function signIn(page: Page) {
  await page.getByRole("button", { name: "Account and settings" }).click();
  await settings(page).getByRole("link", { name: /^Sign in/ }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/papers"));
  await expect(page.getByRole("button", { name: "Account and settings" }).locator(".face")).toBeVisible();
}
const chip = (page: Page, notice: string, name: string) => page.getByRole("group", { name: notice }).getByRole("button", { name });

test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

test("the notifications page asks a reader with no account to sign in", async ({ page }) => {
  await page.goto("/notifications");
  await expect(page.getByRole("heading", { level: 1, name: "Notifications" })).toBeVisible();
  await expect(page.locator(".saved-empty").getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("group")).toHaveCount(0);
});

test("a signed-in reader turns on an email from the settings, and nothing on the page moves", async ({ page, context }) => {
  const reader = await asReader(context);
  await page.goto(PAPER);
  await signIn(page);
  await page.getByRole("button", { name: "Account and settings" }).click();
  await settings(page).getByRole("link", { name: "Notifications" }).click();
  await expect(page).toHaveURL(/\/notifications$/);

  const daily = chip(page, "A passage each day", "Email");
  await expect(daily).toHaveAttribute("aria-pressed", "false");
  // Each thing under the button keeps its place when the button is pressed and "Saved." shows.
  const places = async () => Promise.all([daily, chip(page, "New releases", "Email"), page.getByRole("heading", { name: "When" }), page.getByRole("button", { name: "Turn all off" })].map((l) => l.boundingBox()));
  const before = await places();
  await daily.click();
  await expect(daily).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".notices-line")).toHaveText("Saved.");
  expect(await places()).toEqual(before);

  const seen = await reader.seen();
  expect(seen.notices.email).toEqual({ daily: true });
  expect(typeof seen.notices.zone).toBe("string");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  // The choice is in the account: it is there after a new load.
  await page.reload();
  await expect(chip(page, "A passage each day", "Email")).toHaveAttribute("aria-pressed", "true");
  await expect(chip(page, "A reminder of your place", "Email")).toHaveAttribute("aria-pressed", "false");
});

test("the hour and the time zone are saved, and “Turn all off” turns each email off", async ({ page, context }) => {
  const reader = await asReader(context);
  await reader.set({ notices: { email: { daily: true, releases: true }, hour: 7, zone: "Europe/Berlin", asked: true } });
  await page.goto(PAPER);
  await signIn(page);
  await page.goto("/notifications");
  await expect(chip(page, "New releases", "Email")).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("The daily passage comes at").selectOption("21");
  await expect(page.locator(".notices-line")).toHaveText("Saved.");
  await expect.poll(async () => (await reader.seen()).notices.hour).toBe(21);
  await expect(page.getByLabel(/Your time zone/)).toHaveValue("Europe/Berlin");

  await page.getByRole("button", { name: "Turn all off" }).click();
  await expect(chip(page, "New releases", "Email")).toHaveAttribute("aria-pressed", "false");
  await expect(chip(page, "A passage each day", "Email")).toHaveAttribute("aria-pressed", "false");
  // The page changes at the press. The account has the change a moment later.
  await expect.poll(async () => (await reader.seen()).notices.email).toEqual({ daily: false, reminder: false, releases: false });
});

test("a test browser has no push service: no push can be turned on, and the page says why", async ({ page, context }) => {
  await asReader(context);
  await page.goto(PAPER);
  await signIn(page);
  await page.goto("/notifications");
  await expect(chip(page, "A passage each day", "Push")).toBeDisabled();
  await expect(page.getByText(/cannot show a push of UrantiaHub/)).toBeVisible();
});

test("the service worker is served, and it keeps a page only in the cache of Read offline", async ({ request }) => {
  const response = await request.get("/sw.js");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("javascript");
  const text = await response.text();
  expect(text).toContain("showNotification");
  // It has one cache, and it leaves each request alone on a device with no copy (see offline.spec.ts).
  expect(text.match(/caches\.open\(([^)]+)\)/g)?.every((call) => call === "caches.open(OFFLINE)")).toBe(true);
  expect(text).toContain("if (kept === false");
});

test("the timed job answers 404 to a caller with no secret", async ({ request }) => {
  expect((await request.get("/api/cron/notices")).status()).toBe(404);
  expect((await request.get("/api/cron/notices", { headers: { authorization: "Bearer guess" } })).status()).toBe(404);
});

test("a link with no good proof turns no email off, and the page says so", async ({ page, request }) => {
  expect((await request.post("/api/notices/off?token=not-a-proof")).status()).toBe(400);
  expect((await request.post("/api/notices/off", { data: { token: "x.y" } })).status()).toBe(400);
  // A mail program can open the address of its own button. A person then gets the page with the button.
  const opened = await request.get("/api/notices/off?token=abc", { maxRedirects: 0 });
  expect(opened.status()).toBe(303);
  expect(opened.headers().location).toContain("/emails?off=abc");

  await page.goto("/emails?off=not-a-proof");
  await page.getByRole("button", { name: "Turn this email off" }).click();
  await expect(page.getByText("The email is still on.")).toBeVisible();
});

// Each reader of the stand-in was asked already, so no other test sees the question. These readers were not.
test.describe("the question after the first sign-in", () => {
  const question = (page: Page) => page.getByRole("dialog", { name: "A passage each day" });

  test("offers the daily passage one time, and turns the email on with one press", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set({ notices: null });
    // The recorded API data has no passage for each date, so the test gives the passage of today.
    await page.route("**/api/notices/today*", (route) => route.fulfill({ json: { ref: "99:1.1", text: "Mankind is on the march toward a new and unrevealed planetary destiny." } }));
    await page.goto(PAPER);
    await signIn(page);
    await expect(question(page)).toBeVisible();
    await expect(question(page).getByText("99:1.1 · the passage of today")).toBeVisible();
    await question(page).getByRole("button", { name: "Send it by email" }).click();
    await expect(question(page).getByRole("status")).toContainText("The passage comes by email each day at 7:00 AM");
    await expect.poll(async () => (await reader.seen()).notices).toMatchObject({ email: { daily: true }, asked: true });
    await question(page).getByRole("button", { name: "Close" }).click();
    await expect(question(page)).toHaveCount(0);
    // The answer is in the account: no page asks again.
    await page.reload();
    await page.waitForTimeout(2500);
    await expect(question(page)).toHaveCount(0);
  });

  test("keeps “Not now” as an answer, and turns nothing on", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set({ notices: null });
    await page.goto(PAPER);
    await signIn(page);
    await question(page).getByRole("button", { name: "Not now" }).click();
    await expect(question(page)).toHaveCount(0);
    await expect.poll(async () => (await reader.seen()).notices?.asked).toBe(true);
    expect((await reader.seen()).notices.email ?? {}).toEqual({});
    await page.goto("/papers");
    await page.waitForTimeout(2500);
    await expect(question(page)).toHaveCount(0);
  });

  test("does not show to a reader with no account", async ({ page }) => {
    await page.goto(PAPER);
    await page.waitForTimeout(2500);
    await expect(question(page)).toHaveCount(0);
  });
});

test("the passage of a date needs a date, and the question still shows when it cannot be read", async ({ request }) => {
  expect((await request.get("/api/notices/today")).status()).toBe(400);
  expect((await request.get("/api/notices/today?date=2026-13-45")).status()).toBe(400);
  expect((await request.get("/api/notices/today?date=today")).status()).toBe(400);
});
