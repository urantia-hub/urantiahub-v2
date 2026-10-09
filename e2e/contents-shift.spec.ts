import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const STANDIN = "http://localhost:4010";
const PLACE = JSON.stringify({ paperId: "1", sectionId: "2", label: "2. The Reality of God", at: 1_790_000_000_000 });

// The page as the server sent it, before its script runs: the test holds the script files, reads the
// place of the links to the parts, lets the script run, and reads the place again.
async function jumpBeforeAndAfter(page: Page, appears: string | null) {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/_next/static/**/*.js", async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/papers", { waitUntil: "commit" });
  const jump = page.locator(".toc .jump");
  await expect(jump).toBeVisible();
  const top = async () => Math.round((await jump.boundingBox())!.y);
  const before = await top();
  release();
  if (appears) await expect(page.locator(appears)).toBeVisible();
  else await expect(page.getByRole("button", { name: "Account and settings" })).toBeEnabled();
  // The account answered, and the page drew again.
  await expect(page.getByRole("button", { name: "Account and settings" })).toBeVisible();
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  return { before, after: await top() };
}

test.describe("the contents page does not move when its cards arrive", () => {
  test("for a new visitor: the invitation", async ({ page }) => {
    const { before, after } = await jumpBeforeAndAfter(page, ".toc .invite");
    expect(after).toBe(before);
  });

  test("for a visitor with a place: Continue and the invitation", async ({ page }) => {
    await page.addInitScript((place) => window.localStorage.setItem("hub:last-read", place), PLACE);
    const { before, after } = await jumpBeforeAndAfter(page, ".toc .continue");
    await expect(page.locator(".toc .invite")).toBeVisible();
    expect(after).toBe(before);
  });

  test("for a signed-in reader with a place: Continue only", async ({ page, context }) => {
    await context.addCookies([{ name: "e2e_reader", value: randomUUID(), url: STANDIN }]);
    await page.goto("/papers/paper-1-the-universal-father");
    await page.getByRole("button", { name: "Account and settings" }).click();
    await page.getByRole("dialog", { name: "Account and settings" }).getByRole("link", { name: /^Sign in/ }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/papers/"));
    await expect(page.getByRole("button", { name: "Account and settings" }).locator(".face")).toBeVisible();
    await page.evaluate((place) => window.localStorage.setItem("hub:last-read", place), PLACE);
    const { before, after } = await jumpBeforeAndAfter(page, ".toc .continue");
    await expect(page.locator(".toc .invite")).toHaveCount(0);
    expect(after).toBe(before);
  });

  test("a place that names no paper leaves no empty room", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("hub:last-read", JSON.stringify({ paperId: "900", sectionId: "1", label: null, at: 5 })));
    await page.goto("/papers");
    await expect(page.locator(".toc .invite")).toBeVisible();
    // The room is there before the script runs, and goes when the script finds no paper for the place.
    const gap = () => page.evaluate(() => document.querySelector(".toc .invite")!.getBoundingClientRect().top - document.querySelector(".toc .lead")!.getBoundingClientRect().bottom);
    await expect.poll(gap).toBeLessThan(40);
  });
});
