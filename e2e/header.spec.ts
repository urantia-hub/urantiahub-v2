import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { still } from "./audio";

const STANDIN = "http://localhost:4010";
const PAIR = "/s/1.0.3/dhammapada/21?from=paper";
// The longest way back of a work with more than one page.
const LONGEST_BACK = "/texts/book-of-the-dead/1";
const PAGES = [
  "/",
  "/papers",
  "/papers/paper-1-the-universal-father",
  "/saved",
  "/you",
  "/texts",
  "/texts/dhammapada",
  LONGEST_BACK,
  "/texts/dhammapada/1",
  "/texts/how-it-works",
  "/about",
  PAIR,
  "/es",
  "/es/documentos",
  "/es/documentos/documento-1-el-padre-universal",
  "/es/guardados",
];

async function asReader(context: BrowserContext) {
  await context.addCookies([{ name: "e2e_reader", value: randomUUID(), url: STANDIN }]);
}
async function signIn(page: Page) {
  await page.goto("/papers");
  await page.getByRole("button", { name: "Account and settings" }).click();
  await page.getByRole("dialog", { name: "Account and settings" }).getByRole("link", { name: /^Sign in/ }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/papers"));
  await expect(page.locator(".settings-button .face")).toBeVisible();
}

// The left edge of each control of the header, by its name.
async function places(page: Page) {
  await still(page);
  return page.locator(".site-header nav [data-slot]").evaluateAll((els) => els.map((el) => `${el.getAttribute("data-slot")}@${Math.round(el.getBoundingClientRect().left)}`));
}

// One header on every page: the four controls keep their places, so none moves (Kelson, 2026-10-24).
for (const signed of ["out", "in"] as const) {
  test(`the four controls keep their places on each page, signed ${signed}`, async ({ page, context }) => {
    if (signed === "in") {
      await asReader(context);
      await signIn(page);
    }
    let first: string[] | null = null;
    for (const path of PAGES) {
      await page.goto(path);
      if (signed === "in") await expect(page.locator(".settings-button .face")).toBeVisible();
      const now = await places(page);
      expect(now.map((place) => place.split("@")[0]), path).toEqual(["search", "contents", "lang", "account"]);
      first ??= now;
      expect(now, path).toEqual(first);
    }
  });
}

test("no two items of the header overlap, and each is in the screen", async ({ page, context }) => {
  await asReader(context);
  await signIn(page);
  for (const path of PAGES) {
    await page.goto(path);
    await still(page);
    const boxes = await page.locator(".site-header :is(.brand, .hdr-back, nav [data-slot])").evaluateAll((els) =>
      els.map((el) => {
        const box = el.getBoundingClientRect();
        return { name: el.className, left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      }),
    );
    const width = page.viewportSize()!.width;
    for (const box of boxes) expect(box.right, `${path} ${box.name}`).toBeLessThanOrEqual(width);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        const apart = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
        expect(apart, `${path}: ${a.name} and ${b.name}`).toBe(true);
      }
  }
});

test("the name shows on the home page only, also after a move by links", async ({ page }) => {
  // A name for a screen reader only is a box of 1 px, which Playwright counts as visible: measure it.
  const shown = async () => (await page.locator(".site-header .brand-name").boundingBox())!.width > 20;
  await page.goto("/");
  await expect.poll(shown).toBe(true);
  await page.locator(".home").getByRole("link", { name: "Read the Papers" }).click();
  await expect(page).toHaveURL("/papers");
  await expect.poll(shown).toBe(false);
  await page.getByRole("link", { name: /The Universal Father/ }).first().click();
  await expect(page).toHaveURL(/\/papers\/paper-1-the-universal-father/);
  await expect.poll(shown).toBe(false);
  await page.locator(".site-header .brand").click();
  await expect(page).toHaveURL("/");
  await expect.poll(shown).toBe(true);
});

test("the contents icon is the current page on the contents page only", async ({ page }) => {
  const contents = page.locator(".site-header .contents-link");
  await page.goto("/papers");
  await expect(contents).toHaveAttribute("aria-current", "page");
  await page.goto("/papers/paper-1-the-universal-father");
  await expect(contents).not.toHaveAttribute("aria-current");
  await page.goto("/es/documentos");
  await expect(contents).toHaveAttribute("aria-current", "page");
});

test("the pair page has the header with its way back", async ({ page }) => {
  await page.goto(PAIR);
  await expect(page.locator(".site-header .header-start .hdr-back")).toBeVisible();
  await expect(page.locator(".site-header nav [data-slot]")).toHaveCount(4);
  // Spanish has no pair page: the pill goes to the Spanish home.
  await page.getByRole("button", { name: "Language: English" }).click();
  await page.getByRole("dialog", { name: "Language" }).getByRole("radio", { name: /^Español/ }).click();
  await expect(page).toHaveURL(/\/es(\/documentos)?$/);
  await expect(page.getByText("Página no encontrada")).toHaveCount(0);
});

test.describe("on a phone of 390 px", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the longest way back is cut with an ellipsis, and no item overlaps", async ({ page, context }) => {
    await asReader(context);
    await signIn(page);
    await page.goto(LONGEST_BACK);
    await still(page);
    const label = page.locator(".site-header .hdr-back span");
    expect(await label.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    const boxes = await page.locator(".site-header :is(.brand, .hdr-back, nav [data-slot])").evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect()).map(({ left, right }) => ({ left, right })),
    );
    for (const box of boxes) expect(box.right).toBeLessThanOrEqual(390);
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i - 1].right);
  });
});
