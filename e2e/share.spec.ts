import { expect, test, type Page } from "@playwright/test";
import { para, stubAudio, tap } from "./audio";

const PAPER_1 = "/papers/paper-1-the-universal-father";
const sheet = (page: Page, ref: string) => page.getByRole("dialog", { name: `Share ${ref}` });
async function openShare(page: Page, ref: string) {
  await page.goto(PAPER_1);
  await tap(page, ref);
  await page.getByRole("button", { name: "Share" }).click();
  await expect(sheet(page, ref)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await stubAudio(page);
});

test("Share opens a sheet, and a copy gives the short link of the paragraph", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openShare(page, "1:0.2");
  await expect(page.getByTestId("share-url")).toHaveText("localhost:3100/s/1.0.2");
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByText("Link copied")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("http://localhost:3100/s/1.0.2");
  // The sheet goes, and the paragraph keeps its mark.
  await expect(sheet(page, "1:0.2")).toHaveCount(0);
  await expect(para(page, "1:0.2")).toHaveAttribute("data-picked", "");
});

test("the link names the sentences that the reader chose, and the card shows them", async ({ page }) => {
  await openShare(page, "1:0.3");
  const box = sheet(page, "1:0.3");
  await box.getByRole("button", { name: /^The will creatures of universe upon universe/ }).click();
  await expect(page.getByTestId("share-url")).toHaveText("localhost:3100/s/1.0.3/2");
  await expect(box.locator(".share-og q")).toHaveText(/^The will creatures of universe upon universe .* attaining God the Father\.$/);
  await box.getByRole("button", { name: "Whole paragraph" }).click();
  await expect(page.getByTestId("share-url")).toHaveText("localhost:3100/s/1.0.3");
});

test("a phone offers the share sheet of the device, and a computer offers the copy only", async ({ page }, testInfo) => {
  await page.goto(PAPER_1);
  await page.evaluate(() => {
    (window as unknown as { shared: unknown }).shared = null;
    Object.defineProperty(navigator, "share", {
      value: async (data: unknown) => void ((window as unknown as { shared: unknown }).shared = data),
      configurable: true,
    });
  });
  await tap(page, "1:0.2");
  await page.getByRole("button", { name: "Share" }).click();
  if (testInfo.project.name === "desktop") {
    await expect(sheet(page, "1:0.2").getByRole("button", { name: "Copy link" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Share link" })).toHaveCount(0);
    return;
  }
  await page.getByRole("button", { name: "Share link" }).click();
  expect(await page.evaluate(() => (window as unknown as { shared: unknown }).shared)).toEqual({ title: "1:0.2 · The Universal Father", url: "http://localhost:3100/s/1.0.2" });
});

test("the actions stay in view on a short screen", async ({ page }) => {
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 540 });
  await openShare(page, "1:0.3");
  await expect(page.getByRole("button", { name: "Copy link" })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("button", { name: "Make an image of these words" })).toBeInViewport({ ratio: 1 });
});

test("the image maker starts with the sentences of the share sheet", async ({ page }) => {
  await openShare(page, "1:0.3");
  await sheet(page, "1:0.3").getByRole("button", { name: /^The will creatures of universe upon universe/ }).click();
  await page.getByRole("button", { name: "Make an image of these words" }).click();
  const maker = page.getByRole("dialog", { name: "Image of 1:0.3" });
  await expect(maker.getByRole("img")).toHaveAccessibleName(/^Image with the text: The will creatures of universe upon universe/);
});

test("the page of a link gives a chat app the shared words, and stays out of each search engine", async ({ request }) => {
  const answer = await request.get("/s/1.0.3/1");
  expect(answer.status()).toBe(200);
  const html = await answer.text();
  expect(html).toContain('<meta property="og:title" content="1:0.3 · The Universal Father"/>');
  expect(html).toMatch(/<meta property="og:description" content="“The enlightened worlds all recognize and worship the Universal Father[^"]*”"\/>/);
  expect(html).toContain('<meta property="og:url" content="http://localhost:3100/s/1.0.3/1"/>');
  expect(html).toContain('<meta name="robots" content="noindex, follow"/>');
  const image = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
  expect(image).toContain("/s/1.0.3/1/opengraph-image");
  const picture = await request.get(image!);
  expect(picture.status()).toBe(200);
  expect(picture.headers()["content-type"]).toBe("image/png");
});

test("a link in another form goes to its one address, and a paragraph that is not in the Papers has no page", async ({ request }) => {
  const go = async (path: string) => {
    const answer = await request.get(path, { maxRedirects: 0 });
    // The server can give the same address two times in one answer.
    return [answer.status(), (answer.headers().location ?? "").split(", ")[0]];
  };
  expect(await go("/s/1:0.3/1")).toEqual([307, "/s/1.0.3/1"]);
  expect(await go("/s/1.0.3/99")).toEqual([307, "/s/1.0.3"]);
  expect(await go("/s/1.0.3/2.1")).toEqual([307, "/s/1.0.3"]);
  expect((await go("/s/1.99.1"))[0]).toBe(404);
  expect((await go("/s/hello"))[0]).toBe(404);
});

test("a reader who opens a link to some sentences lands on them, with a soft mark and no marked paragraph", async ({ page }) => {
  await page.goto("/s/1.0.3/2");
  await page.waitForURL(`${PAPER_1}?s=2#1:0.3`);
  await expect.poll(() => page.evaluate(() => CSS.highlights.has("shared"))).toBe(true);
  await expect(page.locator("[data-picked]")).toHaveCount(0);
  // The first chosen sentence is in the upper half of the screen, below the header.
  const top = await page.evaluate(() => {
    const [range] = [...CSS.highlights.get("shared")!] as Range[];
    return range.getBoundingClientRect().top / window.innerHeight;
  });
  expect(top).toBeGreaterThan(0.08);
  expect(top).toBeLessThan(0.5);
  expect(await page.evaluate(() => String([...CSS.highlights.get("shared")!][0]))).toMatch(/^The will creatures of universe upon universe .* attaining God the Father\.$/);
  // The mark goes when the reader goes on.
  await tap(page, "1:0.3");
  expect(await page.evaluate(() => CSS.highlights.has("shared"))).toBe(false);
  await expect(para(page, "1:0.3")).toHaveAttribute("data-picked", "");
});

test("a link to a whole paragraph opens it marked, as a paragraph link does", async ({ page }) => {
  await page.goto("/s/1.0.3");
  await page.waitForURL(`${PAPER_1}#1:0.3`);
  await expect(para(page, "1:0.3")).toHaveAttribute("data-picked", "");
});

test("with no JavaScript the page of a link shows the words and a link to the paper", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/s/1.0.3/1");
  await expect(page.locator("blockquote")).toHaveText(/^The enlightened worlds all recognize/);
  await expect(page.getByRole("link", { name: "Read it in the paper" })).toHaveAttribute("href", `${PAPER_1}?s=1#1:0.3`);
  await context.close();
});
