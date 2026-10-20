import { randomUUID } from "node:crypto";
import { expect, test, type Page, type Route } from "@playwright/test";

const STANDIN = "http://localhost:4010";
const day = (offset: number) => new Date(Date.now() - 4 * 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10);

test.use({ timezoneId: "UTC" });

// A reader with a streak, two marks, and three saved paragraphs, signed in on this browser.
async function reader(page: Page) {
  const id = randomUUID();
  await page.context().addCookies([{ name: "e2e_reader", value: id, url: STANDIN }]);
  await page.context().request.post(`${STANDIN}/__reader/${id}`, {
    data: {
      streak: { on: true, asked: true, goal: 1, goals: [{ from: day(-30), goal: 1 }], hour: 21, zone: "UTC", since: day(-30), longest: 4, marks: { search: "2026-10-16T10:00:00.000Z" }, at: 1 },
      sectionDays: [1, 2, 3].map((n) => ({ day: day(-n), paperId: "2", sectionId: String(n), how: "read" })),
    },
  });
  await page.goto("/papers/paper-1-the-universal-father");
  await page.getByRole("button", { name: "Account and settings" }).click();
  await page.getByRole("dialog", { name: "Account and settings" }).getByRole("link", { name: /^Sign in/ }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/papers"));
}

// Holds each request that matches until `release`.
async function hold(page: Page, pattern: RegExp) {
  const held: Route[] = [];
  let on = true;
  await page.route(pattern, (route) => (on ? held.push(route) : route.continue()));
  return async () => {
    on = false;
    for (const route of held.splice(0)) await route.continue().catch(() => {});
  };
}

const top = (page: Page, name: string) => page.getByRole("heading", { name, exact: true }).evaluate((el) => el.getBoundingClientRect().top + window.scrollY);

test.describe("the shell of /you", () => {
  test("a signed-in reader never sees the invitation or a stand-in name", async ({ page }) => {
    await reader(page);
    const session = await hold(page, /\/api\/auth\/session/);
    await page.goto("/you");
    await expect(page.locator(".you-shell").first()).toBeVisible();
    await expect(page.getByText("Your progress and what you saved")).toBeHidden();
    await expect(page.getByText("Your account")).toHaveCount(0);
    await session();
    await expect(page.getByRole("heading", { name: "Ana Reader" })).toBeVisible();
  });

  test("each card keeps its room while its data loads", async ({ page, isMobile }) => {
    await reader(page);
    const data = await hold(page, /\/api\/me\//);
    await page.goto("/you");
    await expect(page.getByRole("heading", { name: "Ana Reader" })).toBeVisible();
    for (const label of ["Loading your streak", "Loading your progress", "Loading what you saved"]) await expect(page.getByRole("status", { name: label }).first()).toBeVisible();
    // The parts of the book are known before the data.
    await expect(page.getByText("Part IV").first()).toBeVisible();
    const lead = () => page.locator(".progress-lead").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    // The title of the next section can wrap to a second line: that height depends on the data.
    const next = () => page.locator(".streak-next").first().evaluate((el) => el.getBoundingClientRect().height);
    const leadBefore = (await lead()) - (await next());
    const before = isMobile ? null : await top(page, "Saved");
    await data();
    await expect(page.locator(".streak-big")).toBeVisible();
    await expect(page.locator(".you-shell")).toHaveCount(0);
    // The streak card (and on a phone the marks card) above the progress has its room from the start.
    expect(Math.abs((await lead()) - (await next()) - leadBefore)).toBeLessThan(4);
    // On a computer, the marks card above Saved has its room from the start.
    // The marks card is in the right column there, so the title of the streak card does not move it.
    if (before !== null) expect(Math.abs((await top(page, "Saved")) - before)).toBeLessThan(4);
  });

  test("a streak that fails to load leaves no shell", async ({ page }) => {
    await reader(page);
    await page.route(/\/api\/me\/streak/, (route) => route.fulfill({ status: 500, body: "{}" }));
    await page.goto("/you");
    await expect(page.locator(".progress-total")).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading your streak" })).toHaveCount(0);
  });
});
