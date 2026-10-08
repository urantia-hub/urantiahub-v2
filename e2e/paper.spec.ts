import { expect, test } from "@playwright/test";

const PAPER_1 = "/papers/paper-1-the-universal-father";

test("a paper renders with its sections and references", async ({ page }) => {
  await page.goto(PAPER_1);
  await expect(page.getByRole("heading", { level: 1, name: "The Universal Father" })).toBeVisible();
  await expect(page.getByText("Part I · Paper 1")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "1. The Father’s Name" })).toHaveAttribute("id", "1:1");
  await expect(page.locator('[id="1:0.1"]')).toContainText("THE Universal Father is the God of all creation");
});

test("a paragraph link scrolls to the paragraph and marks it", async ({ page }) => {
  await page.goto(`${PAPER_1}#1:2.1`);
  const paragraph = page.locator('[id="1:2.1"]');
  await expect(paragraph).toBeInViewport();
  await expect(paragraph).toHaveCSS("background-color", "rgb(243, 234, 210)");
});

// Review Focus 2: a messaging app encoded the fragment.
test("a percent-encoded fragment still marks the paragraph", async ({ page }) => {
  await page.goto(`${PAPER_1}#1%3A2.1`);
  await expect(page.locator('[id="1:2.1"]')).toBeInViewport();
  await expect(page.getByRole("status")).toHaveCount(0);
});

// Review Focus 5.
test("a reference to a paragraph that does not exist shows a notice at the top", async ({ page }) => {
  await page.goto(`${PAPER_1}#1:99.9`);
  await expect(page.getByRole("status")).toHaveText("Reference 1:99.9 is not in this paper.");
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
});

test("the reference is a link to its paragraph", async ({ page }) => {
  await page.goto(PAPER_1);
  await expect(page.getByRole("link", { name: "1:0.2", exact: true })).toHaveAttribute("href", "#1:0.2");
});

for (const [from, to] of [
  ["/papers/1", PAPER_1],
  ["/papers/paper-1", PAPER_1],
  ["/papers/paper-1-an-old-title", PAPER_1],
  ["/papers/0", "/papers/foreword"],
  // Review Focus 2: case changed, and a trailing slash added.
  ["/papers/Paper-1-The-Universal-Father", PAPER_1],
  [`${PAPER_1}/`, PAPER_1],
]) {
  test(`${from} redirects to the canonical URL and keeps the query`, async ({ page }) => {
    await page.goto(`${from}?utm_source=test&x=1`);
    await expect(page).toHaveURL(`${to}?utm_source=test&x=1`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}

test("the redirect is permanent", async ({ request }) => {
  const response = await request.get("/papers/1", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
});

test("the previous and next links move between papers", async ({ page }) => {
  await page.goto(PAPER_1);
  await page.locator(".pager").getByRole("link", { name: /Next/ }).click();
  await expect(page).toHaveURL("/papers/paper-2-the-nature-of-god");
  await page.locator(".pager").getByRole("link", { name: /Previous/ }).click();
  await expect(page).toHaveURL(PAPER_1);
});

test("a paper page has a share image", async ({ request }) => {
  const response = await request.get(`${PAPER_1}/opengraph-image`);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
});
