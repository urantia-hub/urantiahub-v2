import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { stubAudio, tap } from "./audio";

const STANDIN = "http://localhost:4010";
const PAPER = "/papers/paper-1-the-universal-father";

// Each test is one reader of its own on the stand-in.
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
const savedMark = (page: Page, ref: string) => page.locator(`[id="${ref}"] .mark-saved`);
const at = (ref: string) => ({ ref, createdAt: "2026-10-01T00:00:00.000Z" });

test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

test.describe("Save, for a reader with no account", () => {
  test("asks for a sign-in, keeps nothing, and returns to the paragraph with the row open", async ({ page, context }) => {
    const reader = await asReader(context);
    await page.goto(PAPER);
    await tap(page, "1:0.3");
    await page.getByRole("button", { name: "Save" }).click();
    const ask = page.getByRole("dialog", { name: "Sign in to save this" });
    await expect(ask).toContainText("Your saved paragraphs and notes stay with your account.");
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toContain("1:0.3");

    await ask.getByRole("link", { name: "Sign in" }).click();
    await page.waitForURL((url) => url.pathname === PAPER && url.hash === "#1:0.3");
    await expect(page.getByTestId("picked-ref")).toHaveText("1:0.3");
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
    // The sign-in saved nothing for the reader. The reader presses Save.
    expect((await reader.seen()).saved).toEqual([]);
  });

  test("Not now closes the question and keeps the paragraph marked", async ({ page, context }) => {
    await asReader(context);
    await page.goto(PAPER);
    await tap(page, "1:0.3");
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByRole("button", { name: "Not now" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByTestId("picked-ref")).toHaveText("1:0.3");
  });
});

test.describe("Save, for a signed-in reader", () => {
  test("saves the paragraph, shows the mark after a reload, and one more press removes it", async ({ page, context }) => {
    const reader = await asReader(context);
    await page.goto(PAPER);
    await signIn(page);
    await tap(page, "1:0.3");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
    await expect(savedMark(page, "1:0.3")).toBeVisible();
    await expect.poll(async () => (await reader.seen()).saved.map((b: { ref: string }) => b.ref)).toEqual(["1:0.3"]);

    await page.reload();
    await expect(savedMark(page, "1:0.3")).toBeVisible();
    await expect(page.locator(".mark-saved")).toHaveCount(1);
    await tap(page, "1:0.3");
    await page.getByRole("button", { name: "Saved" }).click();
    await expect(savedMark(page, "1:0.3")).toHaveCount(0);
    await expect.poll(async () => (await reader.seen()).saved).toEqual([]);
    // Nothing of it is in the browser's storage.
    expect(await page.evaluate(() => `${document.cookie} ${JSON.stringify({ ...localStorage })}`)).not.toContain("1:0.3");
  });

  test("the marks move no text when they arrive", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set({ saved: [at("1:0.1"), at("1:0.3"), at("1:1.2")] });
    await page.goto(PAPER);
    await signIn(page);
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/api/me/saved?paper=1", async (route) => {
      await held;
      await route.continue();
    });
    await page.reload();
    const tops = () => page.evaluate(() => ["1:0.1", "1:0.3", "1:1.2", "1:2.1"].map((ref) => Math.round(document.getElementById(ref)!.querySelector(":scope > span:last-child")!.getBoundingClientRect().top + window.scrollY)));
    await expect(page.getByRole("button", { name: "Account and settings" }).locator(".face")).toBeVisible();
    const before = await tops();
    release();
    await expect(page.locator(".mark-saved")).toHaveCount(3);
    expect(await tops()).toEqual(before);
  });

  test("the mark is as dark as the reference beside it", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set({ saved: [at("1:0.3")] });
    await page.goto(PAPER);
    await signIn(page);
    await expect(savedMark(page, "1:0.3")).toBeVisible();
    const colors = await page.evaluate(() => {
      const para = document.getElementById("1:0.3")!;
      return [getComputedStyle(para.querySelector(".mark-saved svg")!).color, getComputedStyle(para.querySelector(".ref")!).color];
    });
    expect(colors[0]).toBe(colors[1]);
  });

  test("a save that fails goes back and says so, and the reader stays signed in", async ({ page, context }) => {
    const reader = await asReader(context);
    await page.goto(PAPER);
    await signIn(page);
    await reader.set({ mode: "down" });
    await tap(page, "1:0.3");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("This did not save. Try again.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toHaveAttribute("aria-pressed", "false");
    await reader.set({ mode: "ok" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
  });

  test("the next person on the same browser sees none of the marks", async ({ page, context }) => {
    const first = await asReader(context);
    await first.set({ saved: [at("1:0.3")] });
    await page.goto(PAPER);
    await signIn(page);
    await expect(savedMark(page, "1:0.3")).toBeVisible();
    await page.getByRole("button", { name: "Account and settings" }).click();
    await settings(page).getByRole("button", { name: "Sign out" }).click();
    await expect(page.locator(".mark-saved")).toHaveCount(0);

    await asReader(context);
    await page.keyboard.press("Escape");
    await signIn(page);
    await tap(page, "1:0.3");
    await expect(page.getByRole("button", { name: "Save" })).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".mark-saved")).toHaveCount(0);
  });
});

test.describe("More", () => {
  test("holds the terms of the paragraph", async ({ page }) => {
    await page.goto(PAPER);
    await tap(page, "1:0.3");
    await page.getByRole("button", { name: "More" }).click();
    await expect(page.getByRole("dialog", { name: "More" }).getByRole("button", { name: "Copy the text" })).toBeVisible();
    await page.getByRole("button", { name: "Terms in this paragraph" }).click();
    await expect(page.getByRole("dialog", { name: "Terms in 1:0.3" })).toBeVisible();
  });
});
