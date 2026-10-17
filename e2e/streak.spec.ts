import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { round, stubAudio } from "./audio";

const STANDIN = "http://localhost:4010";
const PAPER = "/papers/paper-1-the-universal-father";

async function asReader(context: BrowserContext) {
  const id = randomUUID();
  await context.addCookies([{ name: "e2e_reader", value: id, url: STANDIN }]);
  const set = async (values: object) => (await context.request.post(`${STANDIN}/__reader/${id}`, { data: values })).json();
  const seen = async () => (await context.request.get(`${STANDIN}/__reader/${id}`)).json();
  return { id, set, seen };
}

async function signIn(page: Page) {
  await page.getByRole("button", { name: "Account and settings" }).click();
  await page.getByRole("dialog", { name: "Account and settings" }).getByRole("link", { name: /^Sign in/ }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/papers"));
  await expect.poll(async () => (await page.request.get("/api/auth/session")).ok()).toBe(true);
}

// The six opening paragraphs of Paper 1, each in the reading zone for longer than its time.
async function readOpening(page: Page) {
  for (let n = 1; n <= 6; n++) {
    await page.locator(`[id="1:0.${n}"]`).evaluate((el) => el.scrollIntoView({ block: "center" }));
    // The observer reports the paragraph in real time; the jump of the clock comes after that.
    await page.waitForTimeout(300);
    await page.clock.fastForward(9000);
  }
}

const day = (offset: number) => {
  const date = new Date(Date.now() - 4 * 3_600_000);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

test.use({ timezoneId: "UTC" });

test.describe("the streak", () => {
  test("asks one time after a first finished section, and sends that section after the yes", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set({ streak: null });
    await page.clock.install();
    await page.goto(PAPER);
    await signIn(page);
    await page.keyboard.press("Escape");
    await readOpening(page);
    const question = page.getByRole("dialog", { name: "Keep a streak" });
    await expect(question).toBeVisible();
    await expect(question.getByRole("heading", { name: "Keep a streak?" })).toBeVisible();
    expect((await reader.seen()).sectionDays).toEqual([]);
    await question.getByRole("radio", { name: "2 sections a day" }).click();
    await question.getByRole("button", { name: "Yes, keep a streak" }).click();
    await expect(question).toBeHidden();
    await expect.poll(async () => (await reader.seen()).sectionDays).toEqual([expect.objectContaining({ paperId: "1", sectionId: "0", how: "read" })]);
    expect((await reader.seen()).streak).toMatchObject({ on: true, asked: true, goal: 2, zone: "UTC" });
    // The first section earns the first mark, and its moment plays.
    await page.clock.fastForward(2000);
    const moment = page.getByRole("dialog", { name: "A new mark: First section" });
    await expect(moment).toBeVisible();
    await moment.getByRole("button", { name: "Continue" }).click();
    await expect(moment).toBeHidden();
    expect(Object.keys((await reader.seen()).streak.marks)).toEqual(["first-section"]);
  });

  test("a no is kept, and nothing goes to the account", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set({ streak: null });
    await page.clock.install();
    await page.goto(PAPER);
    await signIn(page);
    await page.keyboard.press("Escape");
    await readOpening(page);
    await page.getByRole("dialog", { name: "Keep a streak" }).getByRole("button", { name: "No thanks" }).click();
    await expect.poll(async () => (await reader.seen()).streak).toMatchObject({ asked: true });
    expect((await reader.seen()).streak.on).not.toBe(true);
    expect((await reader.seen()).sectionDays).toEqual([]);
  });

  test("shows the streak, the next section by its title, and the whole book on /you", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set({
      streak: { on: true, asked: true, goal: 1, goals: [{ from: day(-30), goal: 1 }], hour: 21, zone: "UTC", since: day(-30), longest: 0, marks: {}, at: 1 },
      sectionDays: [
        { day: day(-3), paperId: "2", sectionId: "1", how: "read" },
        { day: day(-2), paperId: "2", sectionId: "2", how: "heard" },
        { day: day(-1), paperId: "2", sectionId: "3", how: "read" },
      ],
    });
    await page.goto(PAPER);
    await signIn(page);
    await page.goto("/you");
    await expect(page.locator(".streak-big").first()).toHaveText("3day streak");
    await expect(page.getByText("The Divine Mercy")).toBeVisible();
    await expect(page.getByText("The Nature of God · about 5 min")).toBeVisible();
    await expect(page.getByRole("link", { name: "Listen" })).toHaveAttribute("href", "/papers/paper-2-the-nature-of-god?listen=1#2:4");
    await expect(page.getByText("of 1,626 sections")).toBeVisible();
    await expect(page.getByText("1 grace day ready")).toBeVisible();
    await expect(page.locator(".streak-week li")).toHaveCount(7);
    await expect(page.locator(".streak-week li").last()).toHaveAttribute("data-today", "");
    await expect(page.locator(".streak-book")).toHaveText("The whole book · 3 of 1,626 sections");
  });

  test("shows the earned marks and the nearest ones, and all 30 behind See all", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set({
      streak: { on: true, asked: true, goal: 1, goals: [{ from: day(-30), goal: 1 }], hour: 21, zone: "UTC", since: day(-30), longest: 0, marks: { search: "2026-10-16T10:00:00.000Z" }, at: 1 },
      sectionDays: [{ day: day(-1), paperId: "2", sectionId: "3", how: "read" }],
    });
    await page.goto(PAPER);
    await signIn(page);
    await page.goto("/you");
    const card = page.locator(".marks-card:visible");
    await expect(card.locator(".marks-head")).toHaveText("Marks2 of 30");
    await expect(card.locator(".marks-got li")).toHaveText(["First section", "Search"]);
    await expect(card.locator(".marks-next li")).toHaveCount(3);
    await expect(card.locator(".marks-tier").first()).toBeHidden();
    await card.getByRole("button", { name: "See all 30 marks" }).click();
    await expect(card.locator(".marks-tier")).toHaveCount(4);
    await expect(card.locator(".marks-tier").first()).toBeVisible();
    await card.getByRole("button", { name: "Show less" }).click();
    await expect(card.locator(".marks-tier").first()).toBeHidden();
  });

  test("Listen on the card opens the section with the voice", async ({ page, context }) => {
    const reader = await asReader(context);
    await reader.set({
      streak: { on: true, asked: true, goal: 1, goals: [{ from: day(-30), goal: 1 }], hour: 21, zone: "UTC", since: day(-30), longest: 0, marks: {}, at: 1 },
      sectionDays: [{ day: day(-1), paperId: "2", sectionId: "3", how: "read" }],
    });
    await stubAudio(page);
    await page.goto(PAPER);
    await signIn(page);
    await page.goto("/you");
    await page.getByRole("link", { name: "Listen" }).click();
    await page.waitForURL((url) => url.pathname === "/papers/paper-2-the-nature-of-god" && url.hash === "#2:4");
    await expect.poll(() => page.evaluate(() => window.location.search)).toBe("");
    await expect(round(page)).toHaveAccessibleName("Pause");
  });
});
