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
