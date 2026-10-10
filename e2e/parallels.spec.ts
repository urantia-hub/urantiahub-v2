import { expect, test, type Page } from "@playwright/test";
import { stubAudio, tap } from "./audio";

const PAPER_1 = "/papers/paper-1-the-universal-father";
const sheet = (page: Page, ref: string) => page.getByRole("dialog", { name: `Parallels for ${ref}` });
async function openParallels(page: Page, ref: string) {
  await tap(page, ref);
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Parallels" }).click();
}

test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

test("Parallels lists the near passages of other works, the nearest first, with no weak one", async ({ page }) => {
  await page.goto(PAPER_1);
  await openParallels(page, "1:0.3");
  const list = sheet(page, "1:0.3");
  await expect(list.getByRole("button", { name: "Other works" })).toHaveAttribute("aria-pressed", "true");
  const scores = await list.locator(".parallel-score").evaluateAll((all) => all.map((el) => Number(el.textContent!.replace("%", ""))));
  expect(scores.length).toBeGreaterThan(3);
  expect(scores).toEqual([...scores].sort((a, b) => b - a));
  // The floor: no passage below 40 percent, so the weak ones of the record do not show.
  expect(Math.min(...scores)).toBeGreaterThanOrEqual(40);
  await expect(list.getByText("Diogenes Laertius")).toHaveCount(0);
  await expect(list.locator("li").first()).toContainText("Bhagavad Gita");
  await expect(list.locator("li").first()).toContainText("Besant, 1922");
  await expect(list).toContainText("A parallel is not a source.");
  // The paragraph stays marked while the list is open.
  await expect(page.locator('[id="1:0.3"]')).toHaveAttribute("data-picked", "");
});

test("each passage of another work opens its page in a new tab, and a passage of the Papers opens its paragraph", async ({ page }) => {
  await page.goto(PAPER_1);
  await openParallels(page, "1:0.3");
  const list = sheet(page, "1:0.3");
  await expect(list.locator("li").first()).toBeVisible();
  const links = await list.getByRole("link", { name: /^Open/ }).evaluateAll((all) => all.map((a) => [a.getAttribute("href")!, a.getAttribute("target"), a.getAttribute("rel")]));
  expect(links.length).toBeGreaterThan(3);
  for (const [href, target, rel] of links) {
    expect(href).toMatch(/^https:\/\/(ebible\.org|en\.wikisource\.org|www\.gutenberg\.org)\//);
    expect(target).toBe("_blank");
    expect(rel).toContain("noopener");
  }
  await list.getByRole("button", { name: "In the Papers" }).click();
  const first = list.locator("li").first();
  await expect(first.locator("b")).toHaveText("56:9.10");
  await expect(first).toContainText("Universal Unity");
  await expect(first.getByRole("link", { name: /^Open/ })).toHaveAttribute("href", "/papers/paper-56-universal-unity#56:9.10");
});

test("a paragraph with no near passage says so in each half", async ({ page }) => {
  await page.goto(PAPER_1);
  await openParallels(page, "1:0.2");
  await expect(sheet(page, "1:0.2")).toContainText("No near passage was found in other works.");
  await sheet(page, "1:0.2").getByRole("button", { name: "In the Papers" }).click();
  await expect(sheet(page, "1:0.2")).toContainText("No near passage was found in the Papers.");
});

test("Escape closes the parallels first, and the list follows the mark to another paragraph", async ({ page }, testInfo) => {
  await page.goto(PAPER_1);
  await openParallels(page, "1:0.3");
  await expect(sheet(page, "1:0.3")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('[id="1:0.3"]')).toHaveAttribute("data-picked", "");
  test.skip(testInfo.project.name === "phone", "on a phone the sheet covers the text");
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Parallels" }).click();
  await tap(page, "1:0.2");
  await expect(sheet(page, "1:0.2")).toBeVisible();
});

test("on a phone the list is a bottom sheet, and on a desktop a card in the right margin", async ({ page }, testInfo) => {
  await page.goto(PAPER_1);
  await openParallels(page, "1:0.3");
  const box = (await sheet(page, "1:0.3").boundingBox())!;
  const view = page.viewportSize()!;
  if (testInfo.project.name === "phone") expect(Math.round(box.y + box.height)).toBe(view.height);
  else expect(box.x).toBeGreaterThan(view.width / 2);
  expect(await sheet(page, "1:0.3").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test("the parallels address refuses what is not a paragraph reference", async ({ request }) => {
  for (const bad of ["x", "1:0", "197:0.1", "001:0.3", "1:0.3%2F..%2F2"]) expect((await request.get(`/api/parallels/${bad}`)).status()).toBe(400);
  expect((await request.get("/api/parallels/1:0.999")).status()).toBe(404);
  const ok = await request.get("/api/parallels/1:0.3");
  expect(ok.status()).toBe(200);
  const body = (await ok.json()) as { outside: unknown[]; papers: unknown[] };
  expect(body.outside.length).toBeGreaterThan(0);
  expect(body.papers.length).toBeGreaterThan(0);
});

test.describe("the row of a marked paragraph on a phone", () => {
  test("has four large tiles of equal width, no reference, and a Close that only a screen reader finds", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone", "the desktop row keeps the reference and the X");
    await page.goto(PAPER_1);
    await tap(page, "1:0.3");
    await expect(page.getByTestId("picked-ref")).toBeHidden();
    const tiles = await page.locator(".dock .tile").evaluateAll((all) => all.map((el) => el.getBoundingClientRect()).map((r) => [Math.round(r.width), Math.round(r.height)]));
    expect(tiles.length).toBeGreaterThanOrEqual(2);
    expect(new Set(tiles.map(([w]) => w)).size).toBe(1);
    // Large enough for a thumb.
    for (const [w, h] of tiles) {
      expect(w).toBeGreaterThanOrEqual(56);
      expect(h).toBeGreaterThanOrEqual(56);
    }
    const close = page.getByRole("button", { name: "Close", exact: true });
    await expect(close).toHaveCount(1);
    expect((await close.boundingBox())!.width).toBeLessThanOrEqual(2);
    // A tap on the paragraph closes the row.
    await tap(page, "1:0.3");
    await expect(page.getByTestId("reading-bar")).toHaveAttribute("data-job", "reading");
  });

  test("keeps the reference and the X on a desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a phone has the larger row");
    await page.goto(PAPER_1);
    await tap(page, "1:0.3");
    await expect(page.getByTestId("picked-ref")).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByTestId("reading-bar")).toHaveAttribute("data-job", "reading");
  });
});
