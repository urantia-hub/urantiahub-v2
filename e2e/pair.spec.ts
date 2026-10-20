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
