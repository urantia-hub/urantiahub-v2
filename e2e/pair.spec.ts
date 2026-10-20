import { expect, test } from "@playwright/test";
import { stubAudio } from "./audio";

// 1:0.3 and Dhp 21, and a long passage of the Shu King, all from the recorded API answers.
const PAIR = "/s/1.0.3/dhammapada/21";

test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

test("a pair link shows both quotes and stays on its page", async ({ page }) => {
  await page.goto(PAIR);
  const sides = page.locator(".pair-side");
  await expect(sides).toHaveCount(2);
  await expect(sides.nth(0).locator(".eyebrow")).toHaveText("The Urantia Papers");
  await expect(sides.nth(0)).toContainText("1:0.3 · The Universal Father");
  await expect(sides.nth(1).locator(".eyebrow")).toHaveText("The Dhammapada");
  await expect(sides.nth(1).locator(".pair-kind")).toHaveText("Buddhist scripture");
  await expect(sides.nth(1).locator("blockquote")).toHaveText(/^“Earnestness is the path of immortality/);
  await expect(page.locator(".pair-and")).toHaveText("and");
  await page.waitForTimeout(2000);
  expect(new URL(page.url()).pathname).toBe(PAIR);
});

test("a press on the Papers quote opens the paragraph with the soft mark", async ({ page }) => {
  await page.goto("/s/1.0.3/2/dhammapada/21");
  await page.locator(".pair-side").nth(0).locator(".pair-quote").click();
  await page.waitForURL("/papers/paper-1-the-universal-father?s=2#1:0.3");
  await expect.poll(() => page.evaluate(() => CSS.highlights.has("shared"))).toBe(true);
});

test("a press on the world text quote opens the passage marked", async ({ page }) => {
  await page.goto(PAIR);
  await page.locator(".pair-side").nth(1).locator(".pair-quote").click();
  await page.waitForURL(/\/texts\/dhammapada\/2.*#Dhp_21$/);
  await expect(page.locator("#Dhp_21")).toHaveAttribute("data-picked", "");
});

test("an unknown passage or work is a 404, and a second form goes to the one form", async ({ request }) => {
  expect((await request.get("/s/1.0.3/dhammapada/999")).status()).toBe(404);
  expect((await request.get("/s/1.0.3/no-such-work/1")).status()).toBe(404);
  expect((await request.get("/s/1.0.3/dhammapada")).status()).toBe(404);
  const answer = await request.get("/s/1:0.3/9/dhammapada/21", { maxRedirects: 0 });
  expect([answer.status(), (answer.headers().location ?? "").split(", ")[0]]).toEqual([307, PAIR]);
});

test("a long passage shows 7 lines and Show all", async ({ page }) => {
  await page.goto("/s/1.0.3/shu-king/1.1.12");
  const side = page.locator(".pair-side").nth(1);
  const quote = side.locator("blockquote");
  const short = (await quote.boundingBox())!.height;
  await side.getByRole("button", { name: "Show all" }).click();
  await expect(side.getByRole("button", { name: "Show all" })).toHaveCount(0);
  expect((await quote.boundingBox())!.height).toBeGreaterThan(short);
});

test("the sides are one column on a phone and two columns from 768 px", async ({ page }) => {
  for (const [width, columns] of [[390, false], [1280, true]] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(PAIR);
    const [a, b] = await Promise.all([0, 1].map((i) => page.locator(".pair-side").nth(i).boundingBox()));
    expect(Math.abs(a!.y - b!.y) < 2).toBe(columns);
    // The quotes start on one line: the empty kind line of the Papers side keeps its height.
    if (columns) {
      const [qa, qb] = await Promise.all([0, 1].map((i) => page.locator(".pair-side blockquote").nth(i).boundingBox()));
      expect(Math.abs(qa!.y - qb!.y)).toBeLessThan(2);
    }
  }
});

test("Share opens the sheet, and a press changes the card, the page, and the address", async ({ page }) => {
  await page.goto(PAIR);
  await page.getByRole("button", { name: "Share" }).click();
  const sheet = page.getByRole("dialog", { name: "Share these two passages" });
  await expect(sheet.getByText("Whole passage", { exact: true })).toHaveCount(2);
  await sheet.getByRole("button", { name: /^Those who are in earnest do not die/ }).click();
  await expect(page.getByTestId("share-url")).toHaveText("localhost:3100/s/1.0.3/dhammapada/21/2");
  await expect(sheet.locator(".pair-og-side q").nth(1)).toHaveText("“Those who are in earnest do not die, those who are thoughtless are as if dead already.”");
  await expect(page.locator(".pair-side blockquote").nth(1)).toHaveText("“Those who are in earnest do not die, those who are thoughtless are as if dead already.”");
  await expect.poll(() => new URL(page.url()).pathname).toBe("/s/1.0.3/dhammapada/21/2");
  await expect(sheet.getByText("1 of 2")).toBeVisible();
});

test("Copy link puts the pair address in the clipboard", async ({ page, context }, info) => {
  test.skip(info.project.name !== "desktop", "a phone offers the share sheet of the device");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/s/1.0.3/dhammapada/21/1");
  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByText("Link copied")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("http://localhost:3100/s/1.0.3/dhammapada/21/1");
});

test("a link with a world text code opens the passage with the soft mark on those units", async ({ page }) => {
  await page.goto("/s/1.0.3/dhammapada/21/2");
  await page.locator(".pair-side").nth(1).locator(".pair-quote").click();
  await page.waitForURL("/texts/dhammapada/2?s=2#Dhp_21");
  await expect.poll(() => page.evaluate(() => CSS.highlights.has("shared"))).toBe(true);
  expect(await page.evaluate(() => [...CSS.highlights.get("shared")!].map(String))).toEqual(["Those who are in earnest do not die, those who are thoughtless are as if dead already."]);
  await expect(page.locator("#Dhp_21")).not.toHaveAttribute("data-picked", "");
});

test("a range marks its units across its passages", async ({ page }) => {
  // Dhp 21-23 joined: sentence 3 is all of Dhp 22.
  await page.goto("/texts/dhammapada/at/Dhp%2021-23?s=3");
  await page.waitForURL("/texts/dhammapada/2?s=3&n=3#Dhp_21");
  await expect.poll(() => page.evaluate(() => CSS.highlights.has("shared"))).toBe(true);
  expect(await page.evaluate(() => [...CSS.highlights.get("shared")!].map(String))).toEqual([expect.stringMatching(/^Those who are advanced in earnestness.*\(the elect\)\.$/)]);
});
