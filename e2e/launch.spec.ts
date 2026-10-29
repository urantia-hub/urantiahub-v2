import { expect, test, type Page } from "@playwright/test";

const PLACE = JSON.stringify({ paperId: "1", sectionId: "2", label: "2. The Reality of God", at: 1_790_000_000_000 });
const PAPER = "/papers/paper-1-the-universal-father";

// The page runs as the app on the home screen: the display-mode query matches.
async function asApp(page: Page) {
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => (query === "(display-mode: standalone)" ? ({ ...real(query), matches: true } as MediaQueryList) : real(query));
  });
}

test.describe("the app opens at the reader's place", () => {
  test("a launch from the home screen goes to the section that the reader left", async ({ page }) => {
    await asApp(page);
    await page.addInitScript((place) => window.localStorage.setItem("hub:last-read", place), PLACE);
    await page.goto("/");
    await expect(page).toHaveURL(`${PAPER}#1:2`);
  });

  test("a Spanish reader's launch moves to /es first, then to the Spanish paper", async ({ page }) => {
    await asApp(page);
    await page.addInitScript((place) => {
      window.localStorage.setItem("hub:last-read", place);
      window.localStorage.setItem("hub:lang", "es");
    }, PLACE);
    await page.goto("/");
    await expect(page).toHaveURL("/es/documentos/documento-1-el-padre-universal#1:2");
  });

  test("Home in the app, and a reload of the home page, keep the home page", async ({ page }) => {
    await asApp(page);
    await page.addInitScript((place) => window.localStorage.setItem("hub:last-read", place), PLACE);
    await page.goto("/");
    await expect(page).toHaveURL(`${PAPER}#1:2`);
    await page.locator("header .brand").click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("link", { name: "Continue reading" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name: "Continue reading" })).toBeVisible();
    await expect(page).toHaveURL("/");
  });

  test("with no place in this browser, the home page stays", async ({ page }) => {
    await asApp(page);
    await page.goto("/");
    await expect(page.locator(".home-continue")).toBeAttached();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL("/");
  });

  test("in a browser tab, the home page stays", async ({ page }) => {
    await page.addInitScript((place) => window.localStorage.setItem("hub:last-read", place), PLACE);
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Continue reading" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL("/");
  });
});
