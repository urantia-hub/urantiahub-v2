import { expect, test, type Page } from "@playwright/test";
import { still, stubAudio, tap } from "./audio";

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
  await expect(list.locator("li").first()).toBeVisible();
  const scores = await list.locator(".parallel-score").evaluateAll((all) => all.map((el) => Number.parseInt(el.textContent!, 10)));
  expect(scores.length).toBeGreaterThan(3);
  expect(scores).toEqual([...scores].sort((a, b) => b - a));
  // The floor: no passage below 40 percent, so the weak ones of the record do not show.
  expect(Math.min(...scores)).toBeGreaterThanOrEqual(40);
  await expect(list.getByText("Diogenes Laertius")).toHaveCount(0);
  await expect(list.locator("li").first()).toContainText("Bhagavad Gita");
  await expect(list.locator("li").first()).toContainText("Besant, 1922");
  // The number says what it is on a press.
  const number = list.locator(".parallel-score button").first();
  await expect(list.locator(".score-tip").first()).toBeHidden();
  await number.click();
  await expect(list.locator(".score-tip").first()).toBeVisible();
  await expect(list.locator(".score-tip").first()).toHaveText("How near in meaning this passage is to the paragraph. A computer measures it.");
  await number.click();
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

// A link to the same page with another "#" must still move the mark and take the list away.
test("Open on a passage of the same paper goes to that paragraph, marks it, and closes the list", async ({ page }) => {
  await page.goto(PAPER_1);
  await openParallels(page, "1:0.3");
  const list = sheet(page, "1:0.3");
  await list.getByRole("button", { name: "In the Papers" }).click();
  await list.locator("li", { has: page.locator("b", { hasText: /^1:0\.1$/ }) }).getByRole("link", { name: /^Open/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('[id="1:0.1"]')).toHaveAttribute("data-picked", "");
  await expect(page.locator('[id="1:0.3"]')).not.toHaveAttribute("data-picked");
  await expect(page.locator('[id="1:0.1"]')).toBeInViewport();
  expect(new URL(page.url()).hash).toBe("#1:0.1");
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
  await expect(sheet(page, "1:0.3")).toBeVisible();
  await still(page);
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

  test("shows the Close button to a reader who reaches it with the keyboard", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone", "the desktop row shows the X at each moment");
    await page.goto(PAPER_1);
    await tap(page, "1:0.3");
    const close = page.getByRole("button", { name: "Close", exact: true });
    await page.getByRole("button", { name: "More" }).focus();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    const box = (await close.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(40);
    expect(box.height).toBeGreaterThanOrEqual(40);
    await page.keyboard.press("Enter");
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

test.describe("a sheet over the text", () => {
  test("fades at its end while more is below, and not at the end of the list", async ({ page }) => {
    await page.goto(PAPER_1);
    await openParallels(page, "1:0.3");
    const list = sheet(page, "1:0.3");
    await expect(list.locator("li").first()).toBeVisible();
    await expect(list).toHaveAttribute("data-more", "");
    await list.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect(list).not.toHaveAttribute("data-more");
  });

  test("on a phone it darkens the text behind it, holds the page still, and a tap outside closes it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone", "on a desktop the list is a card beside the text");
    await page.goto(PAPER_1);
    await openParallels(page, "1:0.3");
    await expect(sheet(page, "1:0.3").locator("li").first()).toBeVisible();
    const scrim = page.locator(".terms-scrim");
    await expect(scrim).toBeVisible();
    const dark = () => page.evaluate(() => getComputedStyle(document.body, "::after").opacity);
    await expect.poll(dark).toBe("1");
    // The page behind the sheet does not scroll.
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).toBe("hidden");
    await scrim.click({ position: { x: 20, y: 80 } });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect.poll(dark).toBe("0");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).not.toBe("hidden");
    // The terms have the same.
    await page.getByRole("button", { name: "More" }).click();
    await page.getByRole("button", { name: "Terms in this paragraph" }).click();
    await expect(page.locator(".terms-scrim")).toBeVisible();
    await expect.poll(dark).toBe("1");
  });

  test("on a desktop the text stays free behind the card", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a phone has the scrim");
    await page.goto(PAPER_1);
    await openParallels(page, "1:0.3");
    await expect(sheet(page, "1:0.3")).toBeVisible();
    await expect(page.locator(".terms-scrim")).toBeHidden();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).not.toBe("hidden");
  });

  test("keeps the source of a passage on one line in a narrow window", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone", "a narrow window");
    await page.setViewportSize({ width: 330, height: 700 });
    await page.goto(PAPER_1);
    await openParallels(page, "1:0.3");
    await expect(sheet(page, "1:0.3").locator("li").first()).toBeVisible();
    const heights = await sheet(page, "1:0.3").locator(".parallel-where").evaluateAll((all) => all.map((el) => el.getBoundingClientRect().height));
    expect(Math.max(...heights)).toBeLessThanOrEqual(22);
  });
});

test.describe("the study page", () => {
  // The sheet that the reader came from stopped the scroll of the page. The study page must scroll.
  test("scrolls after the reader comes from the list", async ({ page }) => {
    await page.goto(PAPER_1);
    await openParallels(page, "1:0.3");
    await sheet(page, "1:0.3").getByRole("link", { name: "Study these parallels" }).click();
    await page.waitForURL((url) => url.pathname === "/parallels");
    await expect(page.locator(".study-page .parallel-list li").first()).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).not.toBe("hidden");
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test("opens from the list, shows the whole paragraph beside all its parallels, and filters them", async ({ page }) => {
    await page.goto(PAPER_1);
    await openParallels(page, "1:0.3");
    await sheet(page, "1:0.3").getByRole("link", { name: "Study these parallels" }).click();
    await page.waitForURL((url) => url.pathname === "/parallels" && url.searchParams.get("ref") === "1:0.3");
    await expect(page.getByRole("heading", { name: "Parallels for 1:0.3" })).toBeVisible();
    await expect(page.locator(".study-quote")).toContainText("The enlightened worlds all recognize");
    const items = page.locator(".study-page .parallel-list li");
    const scores = () => items.locator(".parallel-score").evaluateAll((all) => all.map((el) => Number.parseInt(el.textContent!, 10)));
    // One list of the Papers and of other works, the nearest first.
    const first = await scores();
    expect(first).toEqual([...first].sort((a, b) => b - a));
    expect(first[0]).toBeGreaterThanOrEqual(70);
    expect(Math.min(...first)).toBeGreaterThanOrEqual(40);
    // The works are one menu, in the order of the alphabet.
    const menu = page.locator(".study-works");
    await expect(menu.locator("summary")).toHaveText("All works");
    await menu.locator("summary").click();
    const names = await menu.locator("label").allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    await menu.getByLabel("The Urantia Papers").uncheck();
    expect(Math.max(...(await scores()))).toBeLessThan(60);
    await expect(menu.locator("summary")).toHaveText(`${names.length - 1} works`);
    await page.locator(".study-strength input").fill("45");
    expect(Math.min(...(await scores()))).toBeGreaterThanOrEqual(45);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await page.locator(".study-back a").click();
    await page.waitForURL((url) => url.pathname === PAPER_1 && url.hash === "#1:0.3");
  });

  test("says what to do for an address with no paragraph", async ({ page }) => {
    await page.goto("/parallels?ref=<b>x");
    await expect(page.getByRole("link", { name: "Browse all papers" })).toBeVisible();
    await expect(page.locator(".study-page")).not.toContainText("<b>");
  });
});

