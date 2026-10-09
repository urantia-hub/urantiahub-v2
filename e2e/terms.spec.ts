import { expect, test, type Page } from "@playwright/test";
import { stubAudio, tap } from "./audio";

const PAPER_1 = "/papers/paper-1-the-universal-father";
const sheet = (page: Page, ref: string) => page.getByRole("dialog", { name: `Terms in ${ref}` });
async function openTerms(page: Page) {
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Terms in this paragraph" }).click();
}

test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

test("Terms lists the names and the ideas of a paragraph, and an entry opens with no wait", async ({ page }) => {
  const asked: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/terms/")) asked.push(request.url());
  });
  await page.goto(PAPER_1);
  await tap(page, "1:0.3");
  await openTerms(page);
  const terms = sheet(page, "1:0.3");
  await expect(terms).toBeVisible();
  const names = terms.getByRole("list", { name: "Names" });
  await expect(names.getByRole("button", { name: /Universal Father/ })).toBeVisible();
  await expect(names.getByRole("button", { name: /Urantia/ })).toBeVisible();
  await expect(terms.getByRole("list", { name: "Ideas" }).getByRole("button").first()).toBeVisible();
  // The names are above the ideas.
  const [a, b] = await Promise.all([names.boundingBox(), terms.getByRole("list", { name: "Ideas" }).boundingBox()]);
  expect(a!.y).toBeLessThan(b!.y);

  await names.getByRole("button", { name: /Universal Father/ }).click();
  await expect(terms.getByRole("heading", { name: "Universal Father" })).toBeVisible();
  await expect(terms.locator(".term-text")).not.toBeEmpty();
  expect(asked).toHaveLength(1);

  await terms.getByRole("link", { name: /Each place in the Papers/ }).click();
  await expect(page).toHaveURL("/search?q=Universal%20Father");
});

test("the text of a paper has no glossary mark, and the page holds no term data", async ({ page, request }) => {
  await page.goto(PAPER_1);
  await expect(page.locator(".paper .term, .paper [data-term]")).toHaveCount(0);
  const html = await (await request.get(PAPER_1)).text();
  expect(html).not.toContain("First Person of Deity");
});

test("the paragraph stays marked while the terms are open, and Escape closes the terms first", async ({ page }) => {
  await page.goto(PAPER_1);
  await tap(page, "1:0.3");
  await openTerms(page);
  await expect(sheet(page, "1:0.3")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet(page, "1:0.3")).toBeHidden();
  await expect(page.locator('[id="1:0.3"]')).toHaveAttribute("data-picked");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-picked]")).toHaveCount(0);
});

// Review Focus 5.
test("a failed load shows a message, and Try again works", async ({ page }) => {
  let fail = true;
  await page.route("**/api/terms/**", (route) => (fail ? route.fulfill({ status: 502, body: "{}" }) : route.continue()));
  await page.goto(PAPER_1);
  await tap(page, "1:0.3");
  await openTerms(page);
  await expect(sheet(page, "1:0.3")).toContainText("The terms did not load.");
  fail = false;
  await sheet(page, "1:0.3").getByRole("button", { name: "Try again" }).click();
  await expect(sheet(page, "1:0.3").getByRole("list", { name: "Names" })).toBeVisible();
});

test("the sheet shows grey rows at once while the list loads", async ({ page }) => {
  await page.route("**/api/terms/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });
  await page.goto(PAPER_1);
  await tap(page, "1:0.3");
  await openTerms(page);
  await expect(sheet(page, "1:0.3").getByRole("status", { name: "Loading the terms" })).toBeVisible({ timeout: 500 });
  await expect(sheet(page, "1:0.3").getByRole("list", { name: "Names" })).toBeVisible();
});

// Review Focus 2.
test("the terms address refuses what is not a paragraph reference", async ({ request }) => {
  for (const [path, status] of [
    ["/api/terms/abc", 400],
    ["/api/terms/1%3A0", 400],
    ["/api/terms/197%3A0.1", 400],
    ["/api/terms/1%3A0.999", 404],
  ] as const) {
    expect((await request.get(path)).status(), path).toBe(status);
  }
  const good = await request.get("/api/terms/1%3A0.3");
  expect(good.status()).toBe(200);
  expect(good.headers()["cache-control"]).toContain("s-maxage=86400");
});

test("on a phone the terms are a bottom sheet, and on a desktop a card in the right margin", async ({ page }, testInfo) => {
  await page.goto(PAPER_1);
  await tap(page, "1:0.3");
  await openTerms(page);
  const box = (await sheet(page, "1:0.3").boundingBox())!;
  const view = page.viewportSize()!;
  if (testInfo.project.name === "phone") {
    expect(Math.abs(box.y + box.height - view.height)).toBeLessThanOrEqual(1);
    expect(box.width).toBe(view.width);
  } else {
    const text = (await page.locator(".paper").boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(text.x + text.width - 40);
  }
});
