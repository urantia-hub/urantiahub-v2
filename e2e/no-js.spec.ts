import { expect, test } from "@playwright/test";

// Review Focus 4: the site must work for a reader with no JavaScript.
test.use({ javaScriptEnabled: false });

test("a paper is readable and its pager works", async ({ page }) => {
  await page.goto("/papers/paper-1-the-universal-father");
  await expect(page.locator('[id="1:0.1"]')).toContainText("THE Universal Father");
  await page.locator(".pager").getByRole("link", { name: /Next/ }).click();
  await expect(page).toHaveURL("/papers/paper-2-the-nature-of-god");
});

test("the home page shows the first passage of the list", async ({ page }) => {
  await page.goto("/");
  const visible = page.locator(".passage:visible");
  await expect(visible).toHaveCount(1);
  await expect(visible.locator(".cite")).toContainText("99:1.1");
});

test("a paragraph link still marks its paragraph", async ({ page }) => {
  await page.goto("/papers/paper-1-the-universal-father#1:2.1");
  await expect(page.locator('[id="1:2.1"]')).toHaveCSS("background-color", "rgb(243, 234, 210)");
});

test("the page is light", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(251, 248, 242)");
});

test("the reference still works as a link", async ({ page }) => {
  await page.goto("/papers/paper-1-the-universal-father");
  await page.getByRole("link", { name: "1:0.2", exact: true }).click();
  await expect(page).toHaveURL("/papers/paper-1-the-universal-father#1:0.2");
  await expect(page.locator('[id="1:0.2"]')).toHaveCSS("background-color", "rgb(243, 234, 210)");
});

test("no Listen button shows, because it cannot work", async ({ page }) => {
  await page.goto("/papers/paper-1-the-universal-father");
  await expect(page.getByTestId("reading-bar")).toBeVisible();
  await expect(page.getByTestId("round-button")).toBeHidden();
});

// Results arrive as a stream, and a stream needs JavaScript to show. The form and a reference still work.
test("the search form works: a reference goes to the paper at that paragraph", async ({ page }) => {
  await page.goto("/search");
  await page.getByRole("searchbox", { name: "Search the Papers" }).fill("99:1.1");
  await page.getByRole("searchbox", { name: "Search the Papers" }).press("Enter");
  await expect(page).toHaveURL("/papers/paper-99-the-social-problems-of-religion#99:1.1");
});

test("a search for words says that results need JavaScript", async ({ page }) => {
  await page.goto("/search?q=thought+adjuster");
  // The text is inside a noscript element, which a text query does not look into.
  await expect(page.locator(".search noscript p")).toBeVisible();
  await expect(page.locator(".search noscript p")).toHaveText(/^Search results need JavaScript\./);
  await expect(page.getByRole("searchbox", { name: "Search the Papers" })).toBeVisible();
});
