import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { HOME_PASSAGES } from "../src/content/passages";

const recorded = HOME_PASSAGES.map((ref) => {
  const file = `e2e/fixtures/paragraphs_${ref.replace(":", "_")}.json`;
  return JSON.parse(readFileSync(file, "utf8")).data.text as string;
});

test("the home page shows one passage, and it is exact API text", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "The Urantia Papers" })).toBeVisible();
  const visible = page.locator(".passage:visible blockquote");
  await expect(visible).toHaveCount(1);
  expect(recorded).toContain(await visible.innerText());
});

test("the home page holds all six passages, and each index can show", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".passage")).toHaveCount(6);
  for (let i = 0; i < 6; i++) {
    await page.evaluate((n) => (document.querySelector<HTMLElement>(".stage")!.dataset.pick = String(n)), i);
    await expect(page.locator(".passage:visible blockquote")).toHaveText(recorded[i]);
  }
});

test("the home button goes to the contents, which lists 197 papers", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Read the Papers" }).click();
  await expect(page).toHaveURL("/papers");
  await expect(page.locator(".contents .papers a")).toHaveCount(197);
});

test("About and Privacy render", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
});

test("an unknown address answers 404 with a way back", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("link", { name: "All papers" })).toBeVisible();
  expect((await page.goto("/papers/paper-197-nothing"))?.status()).toBe(404);
});

test("the dark theme uses the dark tokens", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/papers/paper-1-the-universal-father");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(23, 21, 15)");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(251, 248, 242)");
});

test("every route carries the security headers, the root included", async ({ request }) => {
  for (const path of ["/", "/papers", "/papers/paper-1-the-universal-father", "/about"]) {
    const headers = (await request.get(path)).headers();
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
  }
});

test("search engines are blocked while the index setting is off", async ({ page, request }) => {
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");
  await page.goto("/papers/paper-1-the-universal-father");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://localhost:3100/papers/paper-1-the-universal-father",
  );
});

test("the refresh endpoint needs the secret", async ({ request }) => {
  const denied = await request.post("/api/revalidate", { data: { tags: ["paper:1"] } });
  expect(denied.status()).toBe(401);
  const ok = await request.post("/api/revalidate", {
    data: { tags: ["paper:1"] },
    headers: { authorization: "Bearer e2e-secret" },
  });
  expect(ok.status()).toBe(200);
});
